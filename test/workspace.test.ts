import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createServer} from 'node:http'
import {EditCoordinator,EDIT_LEASE_MS,windowRequest} from '../src/host/edit-coordinator.js'
import {createBoundApplication as createApplication} from './fixtures/bound-app.js'
import {createHttpHandler} from '../src/host/routes.js'
import {NotesController,noteContent} from '../src/client/notes-controller.js'
import {NoteRecovery} from '../src/client/note-recovery.js'
import type {Api} from '../src/client/api.js'
import type {WindowIdentity} from '../src/contracts/workspace.js'
const a='01K00000000000000000000000',b='01K00000000000000000000001'
const content={title:'窗口验证',body:'正文',summary:'',tags:[],status:'active' as const,notebookId:null,sourceId:null,assetIds:[]}
function actors(c:EditCoordinator){return ['embedded','standalone'].map(surface=>{const windowId=randomUUID();c.register(windowId,surface as 'embedded'|'standalone');return {windowId,serviceEpoch:c.epoch} as WindowIdentity}) as [WindowIdentity,WindowIdentity]}

test('edit leases permit different notes, hand off atomically, reject expired writes and cancel without stealing',()=>{
  let time=0;const c=new EditCoordinator(()=>1,()=>0,()=>time),[one,two]=actors(c)
  one.leaseId=c.acquire(one,a).owned!.leaseId
  assert.throws(()=>c.acquire(two,a),{code:'note_edit_busy'})
  two.leaseId=c.acquire(two,b).owned!.leaseId;c.check([b],two)
  assert.throws(()=>c.check([a],two),{code:'note_edit_busy'})
  c.release(two,b);delete two.leaseId
  const cancelled=c.handoff(two,a).handoff!;c.cancel(two,cancelled.id)
  assert.equal(c.state(one).owned?.noteId,a)
  c.handoff(two,a);c.release(one,a)
  two.leaseId=c.state(two).owned!.leaseId
  assert.throws(()=>c.check([a],one),{code:'note_edit_busy'})
  c.check([a],two)
  time+=EDIT_LEASE_MS+1
  assert.throws(()=>c.check([a],two),{code:'note_edit_lost'})
  assert.equal(c.state(two).owned,null)
  c.beginLocationChange();assert.throws(()=>c.acquire(one,a),{code:'notebook_busy'});c.endLocationChange(true)
  assert.throws(()=>c.check([a],two),{code:'window_expired'})
})

test('repository queue guards late saves, background adoption, attachments and the whole batch before any write',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'notes-window-')),app=await createApplication({dir})
  try{
    const repo=app.notes.repository
    const book=await repo.saveNotebook({title:'交接分类',expectedHeads:[]})
    const first=await repo.save({noteId:a,expectedHeads:[],content:{...content,notebookId:book.notebookId}}),second=await repo.save({noteId:b,expectedHeads:[],content})
    const [one,two]=actors(app.workspace)
    one.leaseId=await repo.coordinate(()=>app.workspace.acquire(one,a).owned!.leaseId)
    await assert.rejects(repo.save({noteId:a,expectedHeads:first.heads,content}),{code:'note_edit_busy'})
    await assert.rejects(windowRequest.run(two,()=>repo.batch([{noteId:b,expectedHeads:second.heads},{noteId:a,expectedHeads:first.heads}],'trash')),{code:'note_edit_busy'})
    assert.equal((await repo.get(b)).current.status,'active')
    await assert.rejects(windowRequest.run(two,()=>repo.deleteNotebook(book.notebookId,book.heads,undefined,{removal:'trash',expectedNoteCount:1})),{code:'note_edit_busy',affectedCount:1})
    assert.equal((await repo.get(a)).effectiveNotebookId,book.notebookId)
    assert.throws(()=>app.workspace.beginLocationChange(),{code:'note_edit_busy'})
    await assert.rejects(windowRequest.run(two,()=>repo.putAttachment(Buffer.from('pdf'),'file.pdf',undefined,a)),{code:'note_edit_busy'})
    const jobRevision=first.current
    await assert.rejects(repo.adoptRevision(jobRevision,async()=>{}),{code:'note_edit_busy'})
    let release!:()=>void
    const barrier=new Promise<void>(resolve=>release=resolve)
    const queued=repo.coordinate(()=>barrier)
    const handoff=repo.coordinate(()=>{app.workspace.handoff(two,a);app.workspace.release(one,a)})
    const late=windowRequest.run(one,()=>repo.save({noteId:a,expectedHeads:first.heads,content:{...content,body:'迟到写入'}}))
    const denied=assert.rejects(late,{code:'note_edit_busy'})
    release();await queued;await handoff;await denied
    assert.equal((await repo.get(a)).current.body,'正文')
  }finally{await app.close();await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100})}
})

test('managed HTTP mutations require a registered current window; fences and repository identity remain enforced',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'notes-window-http-')),app=await createApplication({dir});app.requireWindowIdentity=true
  let origin='';const handler=createHttpHandler({app,getOrigin:()=>origin}),server=createServer((req,res)=>void handler(req,res))
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`
  const post=(path:string,body:unknown,headers:Record<string,string>={})=>fetch(origin+'/dsh-fatfish-notes'+path,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)})
  try{
    const recovery=await fetch(origin+'/dsh-fatfish-notes/notes/draft-recovery');assert.equal(recovery.status,200);assert.deepEqual(await recovery.json(),{ok:true,recovered:[],failed:[]})
    const payload={noteId:a,expectedHeads:[],content}
    assert.equal((await post('/notes/save',payload)).status,409)
    const windowId=randomUUID(),registration=await post('/workspace/register',{windowId,surface:'embedded'})
    const state=await registration.json() as {serviceEpoch:string}
    const headers={'x-notebook-window':windowId,'x-notebook-epoch':state.serviceEpoch}
    const lease=await(await post('/workspace/action',{action:'acquire',noteId:a},headers)).json() as {owned:{leaseId:string}}
    const writeHeaders={...headers,'x-notebook-lease':lease.owned.leaseId}
    assert.equal((await post('/notes/save',payload,{...writeHeaders,origin:'https://bad.example'})).status,403)
    assert.equal((await post('/notes/save',payload,{...writeHeaders,'x-notebook-repository':'999999'})).status,409)
    assert.equal((await post('/notes/save',payload,writeHeaders)).status,200)
    const draft={action:'save',editId:b,sequence:1,request:{...payload,expectedHeads:(await app.notes.repository.get(a)).heads,content:{...content,body:'只在本机草稿'}}}
    assert.equal((await post('/notes/draft',draft)).status,409)
    assert.equal((await post('/notes/draft',draft,{...writeHeaders,origin:'https://bad.example'})).status,403)
    assert.equal((await post('/notes/draft',draft,{...writeHeaders,'x-notebook-repository':'999999'})).status,409)
    assert.equal((await post('/notes/draft',draft,writeHeaders)).status,200)
    assert.equal((await app.notes.repository.get(a)).current.body,'正文')
    assert.equal((await post('/notes/draft',{action:'discard',editId:b,noteId:a},writeHeaders)).status,200)
    await post('/workspace/action',{action:'release',noteId:a},writeHeaders)
    assert.equal(((await(await post('/notes/save',payload,headers)).json()) as {code:string}).code,'note_edit_lost')
    app.workspace.endLocationChange(true)
    assert.equal((await post('/notes/save',payload,writeHeaders)).status,409)
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await app.close();await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100})}
})

test('editor saves before lease release, waits for composition and attachment work, and keeps recovery separate',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'notes-window-client-')),app=await createApplication({dir})
  const repo=app.notes.repository,events:string[]=[]
  let owned=false
  const call:Api=async(path,input)=>{
    if(path==='/notes/get')return {ok:true,note:await repo.get((input as {noteId:string}).noteId)} as never
    if(path==='/notes/draft'){const result=await app.notes.draft(input);if((input as {action:string}).action==='finish')events.push('saved');return result as never}
    if(path==='/notes')return {ok:true,...await repo.list()} as never
    if(path==='/notes/notebooks')return {ok:true,notebooks:await repo.listNotebooks()} as never
    if(path==='/notes/jobs')return {ok:true,jobs:[],cursor:null} as never
    throw Error(path)
  }
  const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v)},removeItem:(k:string)=>{data.delete(k)}}
  const c=new NotesController(call,{storage,repository:()=>1,recoveryScope:'one',autosaveMs:100000,editing:{ready:async()=>{},acquire:async()=>{owned=true},release:async()=>{events.push('released');owned=false},writable:()=>owned}})
  try{
    await repo.save({noteId:a,expectedHeads:[],content});await c.open(a);await c.beginEdit();events.length=0
    c.composition(true);c.update({body:'未完成的中文输入'});assert.equal(await c.leave(),false);assert.deepEqual(events,[])
    c.composition(false);for(let i=0;i<100&&c.getSnapshot().editing;i++)await new Promise(resolve=>setTimeout(resolve,20));assert.deepEqual(events,['saved','released'])
    await c.beginEdit();events.length=0
    let done!:()=>void;const pending=new Promise<void>(r=>done=r)
    void c.queueImageImport(async()=>{await pending;c.update({body:'附件完成'})})
    const leaving=c.leave();assert.deepEqual(events,[]);done();assert.equal(await leaving,true);assert.deepEqual(events,['saved','released'])
    const first=new NoteRecovery(storage,()=>1,'one'),second=new NoteRecovery(storage,()=>1,'two')
    first.write({request:{noteId:a,expectedHeads:[],content}});second.write({request:{noteId:b,expectedHeads:[],content}});first.clear();assert.equal(second.read()?.request.noteId,b)
    await c.beginEdit();owned=false;c.update({body:'过期输入'});assert.equal(c.getSnapshot().draft?.body,'附件完成')
  }finally{c.dispose();await app.close();await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100})}
})
