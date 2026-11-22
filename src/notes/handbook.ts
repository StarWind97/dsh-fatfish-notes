import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { NoteFiles, missing } from './files.js'
import { NoteRepository } from './repository.js'
import type { NoteObjects } from './types.js'
import { canonical, digest, fail } from './validation.js'
import { createNotebookRevision, createNoteRevision, materializeNote } from './revisions.js'
import { DEFAULT_NOTEBOOK_ID, DEFAULT_NOTEBOOK_TIME, DEFAULT_NOTEBOOK_TITLE } from './notebooks.js'
import { validateAsset } from './assets.js'
import type { SyncResource } from './sync-resources.js'
import type { Language } from '../domain/localization.js'

export interface InitialNotes { objects: NoteObjects; files: Map<string, Buffer> }
export type InitialNotesProvider = (local: NoteObjects, remote: NoteObjects, language?: Language) => Promise<InitialNotes | undefined>
const handbookContentVersion = 5
const chapters = [
  ['welcome','v4/01-welcome.md','01 开始使用','创建、查找与整理，让常用内容随手可得。'],
  ['materials','v5/02-materials.md','02 资料与交付','添加图片和文件，转存会话，选择合适的导出形式。'],
  ['deliver','v4/03-deliver.md','03 保存与注意事项','分清草稿、正式保存和同步，按自己的习惯阅读。'],
] as const
const englishChapters = [
  ['welcome','en/v5/01-welcome.md','01 Getting started','Create, find and organize notes you want to return to.'],
  ['materials','en/v5/02-materials.md','02 Materials and exports','Add images and files, save conversations, and choose an export format.'],
  ['deliver','en/v5/03-deliver.md','03 Saving and reading','Understand local drafts, saved notes and sync, and set up your reading space.'],
] as const
const editions = {
  zh: {
    title:'用户手册', versions:[handbookContentVersion,4,3,2,1], chapters,
    attachments:[['checklist','checklist.md','项目交付清单.md'],['width','width-check.csv','阅读区宽度检查.csv']],
  },
  en: {
    title:'User handbook', versions:[handbookContentVersion], chapters:englishChapters,
    attachments:[['checklist','en/v5/checklist.md','Project handoff checklist.md'],['width','en/v5/width-check.csv','Reading width check.csv']],
  },
} as const
const legacyKeys=['welcome','write','materials','capture','find','deliver']
const root = new URL('../../assets/handbook/', import.meta.url)
const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
/** Stable identities are independent of titles, installation date and device. */
export function handbookId(generation:number,key:string,version=handbookContentVersion,language:Language='zh'):string {
  const root=language==='zh'?'fatfish-user-handbook':'fatfish-user-handbook/en'
  let value=BigInt('0x'+digest(`${root}/${version}/${generation}/${key}`).slice(0,32)),result=''
  for(let at=0;at<26;at++){result=alphabet[Number(value&31n)]+result;value>>=5n}
  return result
}
export function pristineNotes(objects:NoteObjects):boolean {
  const seed=createNotebookRevision({version:1,notebookId:DEFAULT_NOTEBOOK_ID,title:DEFAULT_NOTEBOOK_TITLE,status:'active',parents:[],recordedAt:DEFAULT_NOTEBOOK_TIME,defaultSelectedAt:DEFAULT_NOTEBOOK_TIME})
  return !objects.revisions.length&&!objects.deleted?.length&&!objects.organization?.length&&objects.notebooks.every(book=>book.revision===seed.revision)
}
export async function handbookBundle(generation=0,title?:string,language:Language='zh'):Promise<InitialNotes> {
  const edition=editions[language],id=(key:string)=>handbookId(generation,key,handbookContentVersion,language)
  const files=new Map<string,Buffer>()
  const photo=await readFile(new URL('desk.png',root)),asset=validateAsset(photo,'image/png')
  files.set(`notes/assets/${asset.id}`,photo)
  const attachments=await Promise.all(edition.attachments.map(async([key,path,name])=>{const bytes=await readFile(new URL(path,root)),id=digest(bytes);files.set(`notes/attachments/${id}.bin`,bytes);return {key,id,name,bytes:bytes.length}}))
  const notebookId=id('book')
  // Homepage sorts first, while all installations produce exactly the same roots.
  const time=(index:number)=>new Date(Date.UTC(2026,10,15,0,0,6-index)+generation*86400000).toISOString()
  const objects:NoteObjects={version:1,notebooks:[createNotebookRevision({version:1,notebookId,title:title??edition.title,status:'active',parents:[],recordedAt:time(0)})],revisions:[]}
  for(const [index,[key,path,title,summary]] of edition.chapters.entries()){
    const body=(await readFile(new URL(path,root),'utf8'))
      .replace(/handbook-note:([a-z]+)/g,(_,key:string)=>{if(!edition.chapters.some(row=>row[0]===key))fail('note_parent');return `fatfish-note:${id(key)}`})
      .replace(/handbook-asset:desk/g,`../assets/${asset.id}`)
      .replace(/handbook-file:([a-z]+)/g,(_,key:string)=>{const file=attachments.find(a=>a.key===key);if(!file)fail('note_asset');return `../attachments/${file.id}.bin`})
    const used=key==='materials'?attachments.map(({key:_key,...file})=>file):[]
    objects.revisions.push(createNoteRevision({version:1,noteId:id(key),parents:[],recordedAt:time(index),title,summary,body,tags:[edition.title],notebookId,status:'active',sourceId:null,assetIds:body.includes(asset.id)?[asset.id]:[],...(used.length?{attachments:used,supplements:{assetIds:[],attachmentIds:[attachments[1]!.id]}}:{})}))
  }
  return {objects,files}
}
export const initialHandbook:InitialNotesProvider=async(local,remote,language)=>pristineNotes(local)&&pristineNotes(remote)?handbookBundle(0,undefined,language):undefined

function generations(objects:NoteObjects,version:number,language:Language):number[]{
  const books=new Set(objects.notebooks.map(b=>b.notebookId)),found:number[]=[]
  // Generations are contiguous; notebook revisions survive notebook removal and note purge.
  for(let n=0;books.has(handbookId(n,'book',version,language));n++)found.push(n)
  return found
}
export function existingHandbook(objects:NoteObjects,language:Language='zh'):string|null {
  const rows=new Map<string,typeof objects.revisions>()
  for(const row of objects.revisions){const list=rows.get(row.noteId)??[];list.push(row);rows.set(row.noteId,list)}
  const edition=editions[language]
  for(const version of edition.versions)for(const n of generations(objects,version,language).reverse())for(const key of version===1?legacyKeys:edition.chapters.map(row=>row[0])){
    const id=handbookId(n,key,version,language),revisions=rows.get(id)
    if(!objects.deleted?.includes(id)&&revisions&&materializeNote(revisions,id).current.status==='active')return id
  }
  return null
}
const pending=new Map<string,Promise<unknown>>()
/** Only invoked by an explicit help action; no scan is added to ordinary reading. */
export async function openHandbook(repository:NoteRepository,add:boolean,signal?:AbortSignal,language:Language='zh'):Promise<{noteId:string|null;created:boolean}> {
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
    const objects=await repository.exportObjects(signal),existing=existingHandbook(objects,language)
    if(existing||!add)return {noteId:existing,created:false}
    const generation=generations(objects,handbookContentVersion,language).length
    const titles=new Set(objects.notebooks.filter(b=>b.status==='active').map(b=>b.title))
    const base=editions[language].title
    let title:string=base,suffix=2
    while(titles.has(title))title=language==='zh'?`${base}（${suffix++}）`:`${base} (${suffix++})`
    const bundle=await handbookBundle(generation,title,language)
    guard()
    const value:Journal={objects:bundle.objects,files:[...bundle.files].map(([path,bytes])=>[path,bytes.toString('base64')])}
    await journal.write('manifest.json',canonical(value),false)
    await install(value)
    return {noteId:handbookId(generation,'welcome',handbookContentVersion,language),created:true}
  })
  pending.set(key,result)
  try{return await result}finally{if(pending.get(key)===result)pending.delete(key)}
}
