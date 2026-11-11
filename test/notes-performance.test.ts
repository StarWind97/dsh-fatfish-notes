import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm,writeFile,readFile,stat,utimes} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {NoteRepository} from '../src/notes/repository.js'
import {NotesController} from '../src/client/notes-controller.js'
import {NotesWorkspace} from '../src/client/workspace.js'
import {createNoteRevision,materializeNote} from '../src/notes/revisions.js'
import type {WorkspaceState} from '../src/contracts/workspace.js'
import type {Api} from '../src/client/api.js'
import type {NoteContent} from '../src/contracts/notes.js'

const content:NoteContent={title:'性能验证',body:'## 正文\n\n原文',summary:'',tags:[],notebookId:null,status:'active',sourceId:null,assetIds:[]}
async function fixture(t:{after(fn:()=>Promise<void>):void}){const dir=await mkdtemp(join(tmpdir(),'fatfish-perf-'));t.after(()=>rm(dir,{recursive:true,force:true}));return {dir,repo:new NoteRepository(dir)}}

test('warm list, notebooks and detail reuse validated history without rereading it',async t=>{
 const {repo}=await fixture(t);let note=await repo.save({expectedHeads:[],content})
 for(let i=0;i<6;i++)note=await repo.save({noteId:note.noteId,expectedHeads:note.heads,content:{...content,body:`revision ${i}`}})
 await repo.get(note.noteId)
 const read=repo.files.read.bind(repo.files),paths:string[]=[];repo.files.read=async(...args)=>{paths.push(args[0]);return read(...args)}
 await repo.list();await repo.listNotebooks();const result=await repo.get(note.noteId)
 assert.equal(result.current.body,'revision 5');assert.deepEqual(paths,[`documents/${note.noteId}.md`])
 // Consumers may edit their returned objects; a later read must stay correct.
 result.current.body='caller mutation';result.heads.length=0
 assert.equal((await repo.get(note.noteId)).current.body,'revision 5')
})

test('warm cache observes another repository writer, failed writes and external same-size edits',async t=>{
 const {dir,repo}=await fixture(t);const first=await repo.save({expectedHeads:[],content});await repo.list()
 const second=new NoteRepository(dir),updated=await second.save({noteId:first.noteId,expectedHeads:first.heads,content:{...content,title:'另一窗口'}})
 assert.equal((await repo.get(first.noteId)).current.title,'另一窗口')
 const path=join(dir,'notes','revisions',first.noteId,`${updated.current.revision}.json`),bytes=await readFile(path),info=await stat(path)
 await writeFile(path,Buffer.from(bytes.toString().replace('另一窗口','另一窗另')));await utimes(path,info.atime,info.mtime)
 await assert.rejects(repo.get(first.noteId),{code:'note_corrupt'})
 await writeFile(path,bytes);assert.equal((await repo.get(first.noteId)).current.title,'另一窗口')
 let fail=false;const faulty=new NoteRepository(dir,{beforeWrite:()=>{if(fail)throw Error('disk failure')}})
 await faulty.list();fail=true
 await assert.rejects(faulty.save({noteId:first.noteId,expectedHeads:updated.heads,content:{...content,title:'不得留下缓存'}}))
 assert.equal((await faulty.get(first.noteId)).current.title,'另一窗口')
})

test('warm cache revalidates changed image bytes and switches roots',async t=>{
 const {repo,dir}=await fixture(t),other=await fixture(t)
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')
 const asset=await repo.putAsset(png,'image/png'),note=await repo.save({expectedHeads:[],content:{...content,assetIds:[asset.id],body:`![图](../assets/${asset.id})`}})
 await repo.get(note.noteId);await writeFile(join(dir,'notes','assets',asset.id),Buffer.alloc(png.length))
 await assert.rejects(repo.get(note.noteId),{code:'note_corrupt'})
 await other.repo.save({expectedHeads:[],content:{...content,title:'另一库'}});repo.useDirectory(other.dir)
 assert.equal((await repo.list()).items[0]?.title,'另一库')
})

test('associations only revalidate changed revisions and still detect a changed dependency',async t=>{
 const {repo,dir}=await fixture(t)
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')
 const asset=await repo.putAsset(png,'image/png')
 let first=await repo.save({expectedHeads:[],content:{...content,assetIds:[asset.id],body:`![图](../assets/${asset.id})`}})
 for(let i=0;i<8;i++)await repo.save({expectedHeads:[],content:{...content,title:`其他笔记 ${i}`}})
 await repo.list()
 const read=repo.files.read.bind(repo.files),paths:string[]=[];repo.files.read=async(...args)=>{paths.push(args[0]);return read(...args)}
 first=await repo.associate(first.noteId,first.heads,'session',true);paths.length=0
 await repo.list()
 assert.deepEqual(paths.filter(p=>p.startsWith('revisions/')),[`revisions/${first.noteId}/${first.current.revision}.json`])
 await writeFile(join(dir,'notes','assets',asset.id),Buffer.alloc(png.length))
 await assert.rejects(repo.get(first.noteId),{code:'note_corrupt'})
})

test('unchanged sync import reuses validated objects; new remote revisions invalidate the view',async t=>{
 const {repo}=await fixture(t),other=await fixture(t)
 const first=await repo.save({expectedHeads:[],content}),objects=await repo.exportObjects()
 const read=repo.files.read.bind(repo.files),paths:string[]=[];repo.files.read=async(...args)=>{paths.push(args[0]);return read(...args)}
 await repo.importObjects(objects)
 assert.ok(!paths.some(path=>path.startsWith('revisions/')||path.startsWith('notebooks/')))
 await other.repo.importObjects(objects)
 await other.repo.save({noteId:first.noteId,expectedHeads:first.heads,content:{...content,body:'远端新正文'}})
 await repo.importObjects(await other.repo.exportObjects());assert.equal((await repo.get(first.noteId)).current.body,'远端新正文')
 await repo.batch([{noteId:first.noteId,expectedHeads:(await repo.get(first.noteId)).heads}],'trash')
 await repo.get(first.noteId)
 await repo.batch([{noteId:first.noteId,expectedHeads:(await repo.get(first.noteId)).heads}],'purge')
 assert.equal((await repo.list({status:'all'})).items.length,0)
})

test('filter switches reuse notebook counts and render list independently of slow counts',async()=>{
 let finishBooks:((v:unknown)=>void)|undefined,bookCalls=0
 const call:Api=async(path)=>{
  if(path==='/notes/notebooks'){bookCalls++;return await new Promise<unknown>(r=>{finishBooks=r}) as never}
  return {ok:true,items:[],cursor:null} as never
 }
 const c=new NotesController(call);const loading=c.refresh();await new Promise(r=>setTimeout(r,0))
 assert.equal(c.getSnapshot().loadingList,false,'list must not wait for notebook counts')
 finishBooks!({ok:true,notebooks:[]});await loading
 await c.filter({query:'one'});await c.filter({query:'two'});assert.equal(bookCalls,1)
 let renders=0;c.subscribe(()=>renders++);c.pauseInput(false);c.pauseInput(false);assert.equal(renders,0)
 c.dispose()
})

test('obsolete list and note reads are aborted and cannot overwrite newer selection',async()=>{
 const pending:Array<{path:string;signal:AbortSignal|undefined;resolve:(v:unknown)=>void}>=[]
 const call:Api=async(path,_body,signal)=>{
  if(path==='/notes/notebooks')return {ok:true,notebooks:[]} as never
  if(path==='/notes/jobs')return {ok:true,jobs:[],cursor:null} as never
  return await new Promise<unknown>(resolve=>pending.push({path,signal,resolve})) as never
 }
 const c=new NotesController(call),a='01K00000000000000000000000',b='01K00000000000000000000001'
 const one=c.filter({query:'old'}),two=c.filter({query:'new'})
 assert.equal(pending[0]?.signal?.aborted,true)
 pending[1]!.resolve({ok:true,items:[],cursor:null});await two
 pending[0]!.resolve({ok:true,items:[],cursor:'stale'});await one;assert.equal(c.getSnapshot().cursor,null)
 const old=c.open(a);await new Promise(r=>setTimeout(r,0));const next=c.open(b);await new Promise(r=>setTimeout(r,0))
 assert.equal(pending[2]?.signal?.aborted,true)
 const note=(id:string)=>materializeNote([createNoteRevision({...content,version:1,noteId:id,parents:[],recordedAt:'2026-11-10T00:00:00.000Z'})],id)
 pending[3]!.resolve({ok:true,note:note(b)});await next;pending[2]!.resolve({ok:true,note:note(a)});await old
 assert.equal(c.getSnapshot().noteId,b);c.dispose()
})

test('window poll skips duplicate initial refresh but does not lose a change while list is loading',async()=>{
 const server:WorkspaceState={ok:true,serviceEpoch:'one',repositoryId:1,changeSeq:4,available:true,owner:null,owned:null,handoff:null,command:null,theme:null}
 let loading=false,refreshes=0
 const workspace=new NotesWorkspace('standalone',async()=>({...server}) as never)
 workspace.bind({pauseInput:()=>{},getSnapshot:()=>({noteId:null,loadingList:loading}),refresh:async()=>{refreshes++}} as unknown as NotesController)
 await workspace.ready();await workspace.poll();assert.equal(refreshes,0)
 server.changeSeq++;loading=true;await workspace.poll();assert.equal(refreshes,0)
 loading=false;await workspace.poll();assert.equal(refreshes,1);await workspace.poll();assert.equal(refreshes,1);workspace.dispose()
})
