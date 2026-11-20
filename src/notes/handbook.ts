import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { NoteFiles, missing } from './files.js'
import { NoteRepository } from './repository.js'
import type { NoteObjects } from './types.js'
import { canonical, digest, fail } from './validation.js'
import { createNotebookRevision, createNoteRevision, materializeNote } from './revisions.js'
import { DEFAULT_NOTEBOOK_ID, DEFAULT_NOTEBOOK_TIME } from './notebooks.js'
import { validateAsset } from './assets.js'
import type { SyncResource } from './sync-resources.js'

export interface InitialNotes { objects: NoteObjects; files: Map<string, Buffer> }
export type InitialNotesProvider = (local: NoteObjects, remote: NoteObjects) => Promise<InitialNotes | undefined>
const handbookContentVersion = 4
const chapters = [
  ['welcome','v4/01-welcome.md','01 开始使用','创建、查找与整理，让常用内容随手可得。'],
  ['materials','v2/02-materials.md','02 资料与交付','添加图片和文件，转存会话，选择合适的导出形式。'],
  ['deliver','v4/03-deliver.md','03 保存与注意事项','分清草稿、正式保存和同步，按自己的习惯阅读。'],
] as const
const legacyKeys=['welcome','write','materials','capture','find','deliver']
const root = new URL('../../assets/handbook/', import.meta.url)
const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
/** Stable identities are independent of titles, installation date and device. */
export function handbookId(generation: number, key: string,version=handbookContentVersion): string {
  let value=BigInt('0x'+digest(`fatfish-user-handbook/${version}/${generation}/${key}`).slice(0,32)),result=''
  for(let at=0;at<26;at++){result=alphabet[Number(value&31n)]+result;value>>=5n}
  return result
}
export function pristineNotes(objects:NoteObjects):boolean {
  const seed=createNotebookRevision({version:1,notebookId:DEFAULT_NOTEBOOK_ID,title:'默认笔记本',status:'active',parents:[],recordedAt:DEFAULT_NOTEBOOK_TIME,defaultSelectedAt:DEFAULT_NOTEBOOK_TIME})
  return !objects.revisions.length&&!objects.deleted?.length&&!objects.organization?.length&&objects.notebooks.every(book=>book.revision===seed.revision)
}
export async function handbookBundle(generation=0,title='用户手册'):Promise<InitialNotes> {
  const files=new Map<string,Buffer>()
  const photo=await readFile(new URL('desk.png',root)),asset=validateAsset(photo,'image/png')
  files.set(`notes/assets/${asset.id}`,photo)
  const attachments=await Promise.all([
    ['checklist','checklist.md','项目交付清单.md'],['width','width-check.csv','阅读区宽度检查.csv'],
  ].map(async([key,path,name])=>{const bytes=await readFile(new URL(path!,root)),id=digest(bytes);files.set(`notes/attachments/${id}.bin`,bytes);return {key:key!,id,name:name!,bytes:bytes.length}}))
  const notebookId=handbookId(generation,'book')
  // Homepage sorts first, while all installations produce exactly the same roots.
  const time=(index:number)=>new Date(Date.UTC(2026,10,15,0,0,6-index)+generation*86400000).toISOString()
  const objects:NoteObjects={version:1,notebooks:[createNotebookRevision({version:1,notebookId,title,status:'active',parents:[],recordedAt:time(0)})],revisions:[]}
  for(const [index,[key,path,title,summary]] of chapters.entries()){
    const body=(await readFile(new URL(path,root),'utf8'))
      .replace(/handbook-note:([a-z]+)/g,(_,key:string)=>{if(!chapters.some(row=>row[0]===key))fail('note_parent');return `fatfish-note:${handbookId(generation,key)}`})
      .replace(/handbook-asset:desk/g,`../assets/${asset.id}`)
      .replace(/handbook-file:([a-z]+)/g,(_,key:string)=>{const file=attachments.find(a=>a.key===key);if(!file)fail('note_asset');return `../attachments/${file.id}.bin`})
    const used=key==='materials'?attachments.map(({key:_key,...file})=>file):[]
    objects.revisions.push(createNoteRevision({version:1,noteId:handbookId(generation,key),parents:[],recordedAt:time(index),title,summary,body,tags:['用户手册'],notebookId,status:'active',sourceId:null,assetIds:body.includes(asset.id)?[asset.id]:[],...(used.length?{attachments:used,supplements:{assetIds:[],attachmentIds:[attachments[1]!.id]}}:{})}))
  }
  return {objects,files}
}
export const initialHandbook:InitialNotesProvider=async(local,remote)=>pristineNotes(local)&&pristineNotes(remote)?handbookBundle():undefined

function generations(objects:NoteObjects,version=handbookContentVersion):number[]{
  const books=new Set(objects.notebooks.map(b=>b.notebookId)),found:number[]=[]
  // Generations are contiguous; notebook revisions survive notebook removal and note purge.
  for(let n=0;books.has(handbookId(n,'book',version));n++)found.push(n)
  return found
}
export function existingHandbook(objects:NoteObjects):string|null {
  const rows=new Map<string,typeof objects.revisions>()
  for(const row of objects.revisions){const list=rows.get(row.noteId)??[];list.push(row);rows.set(row.noteId,list)}
  for(const version of [handbookContentVersion,3,2,1])for(const n of generations(objects,version).reverse())for(const key of version===1?legacyKeys:chapters.map(row=>row[0])){
    const id=handbookId(n,key,version),revisions=rows.get(id)
    if(!objects.deleted?.includes(id)&&revisions&&materializeNote(revisions,id).current.status==='active')return id
  }
  return null
}
const pending=new Map<string,Promise<unknown>>()
/** Only invoked by an explicit help action; no scan is added to ordinary reading. */
export async function openHandbook(repository:NoteRepository,add:boolean,signal?:AbortSignal):Promise<{noteId:string|null;created:boolean}> {
  const files=repository.files,key=files.root
  const result=(pending.get(key)??Promise.resolve()).catch(()=>{}).then(async()=>{
    const guard=()=>{signal?.throwIfAborted();if(repository.files!==files)fail('transfer_expired');repository.editGuard([])}
    guard()
    const journal=new NoteFiles(join(key,'../handbook-import'))
    type Journal={objects:NoteObjects;files:Array<[string,string]>}
    const install=async(value:Journal)=>{
      guard()
      const resources:SyncResource[]=value.files.map(([path,encoded])=>{const bytes=Buffer.from(encoded,'base64');return {path:path.replace(/^notes\//,''),bytes:bytes.length,read:async()=>bytes}})
      await repository.installSyncResources(resources,value.objects,signal)
      guard();await journal.remove('manifest.json')
    }
    const saved=await journal.read('manifest.json',16*1024*1024).catch(error=>{if(missing(error))return null;throw error})
    if(saved)await install(JSON.parse(saved.toString('utf8')) as Journal)
    guard()
    const objects=await repository.exportObjects(signal),existing=existingHandbook(objects)
    if(existing||!add)return {noteId:existing,created:false}
    const generation=generations(objects).length
    const titles=new Set(objects.notebooks.filter(b=>b.status==='active').map(b=>b.title))
    let title='用户手册',suffix=2;while(titles.has(title))title=`用户手册（${suffix++}）`
    const bundle=await handbookBundle(generation,title)
    guard()
    const value:Journal={objects:bundle.objects,files:[...bundle.files].map(([path,bytes])=>[path,bytes.toString('base64')])}
    await journal.write('manifest.json',canonical(value),false)
    await install(value)
    return {noteId:handbookId(generation,'welcome'),created:true}
  })
  pending.set(key,result)
  try{return await result}finally{if(pending.get(key)===result)pending.delete(key)}
}
