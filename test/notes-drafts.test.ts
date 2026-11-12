import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm,readFile,readdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {NoteRepository} from '../src/notes/repository.js'
import {DraftFiles} from '../src/notes/drafts.js'
import {ulid} from '../src/domain/id.js'
import {noteContent,NotesController} from '../src/client/notes-controller.js'
import type {Api} from '../src/client/api.js'
import type {NoteContent,NoteDraftRequest} from '../src/contracts/notes.js'
import {bindLibraryLifecycle} from '../src/client/library-lifecycle.js'

const content:NoteContent={title:'草稿验收',body:'原正文',summary:'',tags:[],notebookId:null,status:'active',sourceId:null,assetIds:[]}
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')
test('temporary focus and visibility changes checkpoint without ending the edit; page exit finishes',()=>{
  const priorWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),priorDocument=Object.getOwnPropertyDescriptor(globalThis,'document')
  const window=new EventTarget(),document=Object.assign(new EventTarget(),{visibilityState:'hidden'});let checkpoints=0,finished=0
  Object.defineProperty(globalThis,'window',{configurable:true,value:window});Object.defineProperty(globalThis,'document',{configurable:true,value:document})
  const unbind=bindLibraryLifecycle({flush:async()=>{checkpoints++;return true},leave:async()=>{finished++;return true},needsExitWarning:false} as unknown as NotesController)
  try{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'));assert.equal(checkpoints,2);assert.equal(finished,0);window.dispatchEvent(new Event('pagehide'));assert.equal(finished,1)}
  finally{unbind();if(priorWindow)Object.defineProperty(globalThis,'window',priorWindow);else Reflect.deleteProperty(globalThis,'window');if(priorDocument)Object.defineProperty(globalThis,'document',priorDocument);else Reflect.deleteProperty(globalThis,'document')}
})
async function fixture(t:{after(fn:()=>Promise<void>):void}){
  const dir=await mkdtemp(join(tmpdir(),'fatfish-draft-'));t.after(()=>rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100}))
  const repo=new NoteRepository(dir),note=await repo.save({expectedHeads:[],content}),editId=ulid()
  const request={noteId:note.noteId,expectedHeads:note.heads,content:noteContent(note)}
  return {dir,repo,note,editId,request}
}
test('five local checkpoints keep formal revision, document and sync generation unchanged; finish once',async t=>{
  const {dir,repo,note,editId,request}=await fixture(t),generation=repo.generation,path=join(dir,'notes/documents',note.noteId+'.md'),before=await readFile(path,'utf8')
  for(let sequence=1;sequence<=5;sequence++)await repo.draft({action:'save',editId,sequence,request:{...request,content:{...request.content,body:'第 '+sequence+' 次修改'}}})
  assert.equal(repo.generation,generation);assert.equal((await repo.get(note.noteId)).current.body,'原正文');assert.equal(await readFile(path,'utf8'),before)
  const input={action:'finish' as const,editId,sequence:5,request:{...request,content:{...request.content,body:'第 5 次修改'}}}
  const done=await repo.draft(input);assert.equal(done.note?.current.body,'第 5 次修改')
  assert.equal((await readdir(join(dir,'notes/revisions',note.noteId))).length,2)
  assert.deepEqual((await repo.draft(input)).note?.heads,done.note?.heads)
  assert.equal((await readdir(join(dir,'notes/revisions',note.noteId))).length,2)
  const unchanged=await repo.draft({action:'finish',editId:ulid(),sequence:0,request:{noteId:note.noteId,expectedHeads:done.note!.heads,content:noteContent(done.note!)}})
  assert.deepEqual(unchanged.note?.heads,done.note?.heads)
})
test('discard removes only the draft; late checkpoint and browser recovery cannot resurrect it',async t=>{
  const {repo,note,editId,request}=await fixture(t),input={action:'save' as const,editId,sequence:1,request:{...request,content:{...request.content,body:'取消的内容'}}}
  await repo.draft(input);await repo.draft({action:'discard',editId,noteId:note.noteId})
  assert.equal((await repo.draft({...input,sequence:99})).state,'discarded')
  assert.equal((await repo.draft({...input,action:'finish'})).note,null)
  assert.deepEqual((await repo.get(note.noteId)).heads,note.heads)
  const newId=ulid(),newEdit=ulid();await repo.draft({...input,editId:newEdit,request:{...input.request,noteId:newId,expectedHeads:[]}})
  await repo.draft({action:'discard',editId:newEdit,noteId:newId});assert.equal((await repo.list()).items.length,1)
})
test('restart completes disk drafts, retries safely and incorporates a newer browser checkpoint',async t=>{
  const {dir,repo,note,editId,request}=await fixture(t),input={action:'save' as const,editId,sequence:1,request:{...request,content:{...request.content,body:'磁盘草稿'}}}
  await repo.draft(input);const restarted=new NoteRepository(dir)
  assert.deepEqual((await restarted.recoverDrafts()).recovered,[note.noteId]);assert.equal((await restarted.get(note.noteId)).current.body,'磁盘草稿')
  assert.deepEqual((await restarted.recoverDrafts()).recovered,[])
  const latest=await restarted.draft({...input,action:'finish',sequence:2,request:{...input.request,content:{...input.request.content,body:'浏览器最后一个字'}}})
  assert.equal(latest.note?.current.body,'浏览器最后一个字');assert.equal(latest.note?.current.parents[0],(await restarted.history(note.noteId)).items[1]?.revision)
})
test('lost completion receipt after revision write produces no duplicate revision',async t=>{
  const {dir,repo,note,editId,request}=await fixture(t),input={action:'save' as const,editId,sequence:1,request:{...request,content:{...request.content,body:'写入后退出'}}}
  await repo.draft(input);const files=new DraftFiles(join(dir,'local-drafts')),record=(await files.read(editId))!
  await repo.save(input.request);await files.write(record)
  const resumed=new NoteRepository(dir);await resumed.recoverDrafts();assert.equal((await resumed.history(note.noteId)).items.length,2)
})
test('draft media stays local, survives purge of another note, and cleanup retains shared blobs',async t=>{
  const {dir,repo,note,editId,request}=await fixture(t)
  await repo.draft({action:'save',editId,sequence:0,request})
  const picture=await repo.putAsset(png,'image/png',undefined,note.noteId),file=await repo.putAttachment(Buffer.from('草稿附件'),'附件.pdf',undefined,note.noteId)
  const shared=await repo.putAttachment(Buffer.from('共用文件'),'共用.txt',undefined,note.noteId)
  const other=await repo.save({expectedHeads:[],content:{...content,attachments:[shared],assetIds:[picture.id]}})
  const trashed=await repo.trash(other.noteId,other.heads);await repo.batch([{noteId:other.noteId,expectedHeads:trashed.heads}],'purge')
  assert.deepEqual(await repo.getAsset(picture.id),png)
  const kept=await repo.save({expectedHeads:[],content:{...content,attachments:[shared]}})
  const snapshot=await repo.exportObjects();assert.ok(!snapshot.revisions.some(r=>r.assetIds.includes(picture.id)));assert.ok(!snapshot.revisions.some(r=>r.attachments?.some(a=>a.id===file.id)))
  await repo.draft({action:'discard',editId,noteId:note.noteId})
  await assert.rejects(()=>repo.getAsset(picture.id));await assert.rejects(()=>repo.getAttachment(file.id))
  assert.equal((await repo.getAttachment(shared.id)).toString(),'共用文件');assert.ok(await repo.get(kept.noteId))
  assert.ok((await new DraftFiles(join(dir,'local-drafts')).read(editId))?.files.length===0)
})
test('draft completion preserves a concurrent remote version as a separate note',async t=>{
  const {repo,note,editId,request}=await fixture(t),input={action:'save' as const,editId,sequence:1,request:{...request,content:{...request.content,body:'本机草稿'}}}
  await repo.draft(input);await repo.save({...request,content:{...request.content,body:'远端修改'}})
  await repo.draft({...input,action:'finish'});const items=(await repo.list()).items
  assert.equal(items.length,2);assert.deepEqual(new Set(await Promise.all(items.map(async item=>(await repo.get(item.noteId)).current.body))),new Set(['本机草稿','远端修改']))
  assert.ok(note)
})
test('client checkpoints preserve cancellation and browser journal until completion',async t=>{
  const {repo,note}=await fixture(t),data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v)},removeItem:(k:string)=>{data.delete(k)}}
  const call:Api=async(path,input)=>{
    if(path==='/notes/draft')return await repo.draft(input as NoteDraftRequest) as never
    if(path==='/notes/get')return {ok:true,note:await repo.get((input as {noteId:string}).noteId)} as never
    if(path==='/notes')return {ok:true,...await repo.list()} as never
    if(path==='/notes/notebooks')return {ok:true,notebooks:await repo.listNotebooks()} as never
    if(path==='/notes/jobs')return {ok:true,jobs:[],cursor:null} as never
    if(path==='/notes/draft-recovery')return {ok:true,recovered:[],failed:[]} as never
    throw Error(path)
  }
  const c=new NotesController(call,{storage,repository:()=>123,autosaveMs:100000});t.after(async()=>c.dispose())
  await c.open(note.noteId);await c.beginEdit();c.update({body:'本机草稿',title:'保留尾空格 '});await c.flush()
  assert.equal(c.getSnapshot().draft?.title,'保留尾空格 ');assert.equal(c.editChanged,true);assert.ok(data.size);assert.equal((await repo.get(note.noteId)).current.body,'原正文')
  assert.equal(await c.cancelEdits(),true);assert.equal([...data.keys()].filter(k=>k.startsWith('fatfish-notes-recovery:')).length,0);assert.equal((await repo.get(note.noteId)).current.body,'原正文')
  await c.beginEdit();c.update({body:'完成的草稿'});await c.flush();assert.equal(await c.saveEdits(),true);assert.equal([...data.keys()].filter(k=>k.startsWith('fatfish-notes-recovery:')).length,0);assert.equal((await repo.history(note.noteId)).items.length,2)
  await c.beginEdit();c.update({body:'崩溃前最后输入'});c.dispose()
  const recovered=new NotesController(call,{storage,repository:()=>123});try{await recovered.initialize(note.noteId);assert.equal(recovered.getSnapshot().editing,false);assert.equal(recovered.getSnapshot().draft?.body,'崩溃前最后输入')}finally{recovered.dispose()}
  const failedCall:Api=async(path,input)=>path==='/notes/draft-recovery'?{ok:true,recovered:[],failed:[note.noteId]} as never:call(path,input)
  const warning=new NotesController(failedCall,{storage,repository:()=>123});try{await warning.initialize(note.noteId);assert.equal(warning.getSnapshot().noteId,note.noteId);assert.equal(warning.getSnapshot().error,'note_recovery_failed')}finally{warning.dispose()}
})
