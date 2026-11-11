import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { fixture, request } from './fixtures/notes-capture.js'
import { createBoundApplication as createApplication } from './fixtures/bound-app.js'
import { createHttpHandler } from '../src/host/routes.js'
import { NotesApplication } from '../src/host/notes.js'
import type { CaptureResult } from '../src/contracts/notes.js'
import { NoteCaptureBridge } from '../src/client/note-capture-bridge.js'
import type { Api } from '../src/client/api.js'
import type { SessionController, SessionPromptRequest } from '@deepseek-ai/dsh-api-session-controller'
import {ulid} from '../src/domain/id.js'

test('ordinary attachments require size consent and download with scope, MIME and HTTP fences',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'notes-attachment-http-')),app=await createApplication({dir})
  let origin='';const server=createServer((req,res)=>{void createHttpHandler({app,getOrigin:()=>origin})(req,res)})
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();assert.ok(address&&typeof address!=='string');origin=`http://127.0.0.1:${address.port}`
  const post=(path:string,body:unknown,headers:Record<string,string>={})=>fetch(origin+'/dsh-fatfish-notes'+path,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)})
  try{
    const noteId=ulid(),payload={noteId,draft:true,name:'网页.html',base64:Buffer.from('<script>alert(1)</script>').toString('base64')}
    assert.equal((await post('/notes/attachment',payload,{origin:'https://evil.example'})).status,403)
    assert.equal((await post('/notes/batch',{notes:[],action:'purge'},{'sec-fetch-site':'cross-site'})).status,403)
    const uploaded=await app.notes.attachment(payload),saved=await app.notes.save({noteId,expectedHeads:[],content:{title:'附件下载',body:`[网页](../attachments/${uploaded.attachment.id}.bin)`,summary:'',tags:[],notebookId:null,status:'active',sourceId:null,assetIds:[],attachments:[uploaded.attachment]}})
    const query=new URLSearchParams({noteId,revision:saved.note.current.revision,attachmentId:uploaded.attachment.id}),url=origin+'/dsh-fatfish-notes/notes/download?'+query
    const response=await fetch(url);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/octet-stream');assert.match(response.headers.get('content-disposition')??'',/^attachment;/);assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.equal(await response.text(),'<script>alert(1)</script>')
    assert.equal((await fetch(url,{headers:{'sec-fetch-site':'cross-site'}})).status,403)
    assert.equal((await fetch(url.replace(uploaded.attachment.id,'f'.repeat(64)))).status,404)
    await assert.rejects(app.notes.attachment({...payload,base64:Buffer.alloc(50*1024*1024+1).toString('base64')}),{code:'attachment_large'})
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await app.close();await rm(dir,{recursive:true,force:true})}
})

test('M3 host serves raw capture without model/GitHub behind the notebook HTTP fence',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'notes-host-')),f=fixture()
  const app=await createApplication({dir,conversation:()=>({...f.controller,inspect:async()=>{throw new Error('never use limited inspect')}})})
  let origin='';const server=createServer((req,res)=>{void createHttpHandler({app,getOrigin:()=>origin})(req,res)})
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();assert.ok(address&&typeof address!=='string');origin=`http://127.0.0.1:${address.port}`
  const post=(prefix:string,path:string,body:unknown,headers:Record<string,string>={})=>fetch(`${origin}/${prefix}${path}`,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)})
  try {
    for(const prefix of ['dsh-fatfish-notes']){
      assert.equal((await post(prefix,'/notes/capture',request,{origin:'https://evil.example'})).status,403)
      assert.equal((await post(prefix,'/notes/capture',request,{'sec-fetch-site':'cross-site'})).status,403)
      assert.equal((await fetch(`${origin}/${prefix}/notes/capture`)).status,405)
      assert.equal((await post(prefix,'/notes/capture',{...request,padding:'x'.repeat(2*1024*1024)})).status,413)
      assert.equal((await post(prefix,'/config',{padding:'x'.repeat(2*1024*1024)})).status,404)
    }
    const first=await post('dsh-fatfish-notes','/notes/capture',request);assert.equal(first.status,200)
    const a=await first.json() as CaptureResult
    const second=await post('dsh-fatfish-notes','/notes/capture',request);assert.equal(second.status,200)
    const b=await second.json() as CaptureResult;assert.equal(a.note.noteId,b.note.noteId);assert.equal(a.messageCount,112)
    const source=await post('dsh-fatfish-notes','/notes/source',{sourceId:a.sourceId});assert.equal(source.status,200)
    const get=await fetch(`${origin}/dsh-fatfish-notes/notes/get?noteId=${a.note.noteId}`);assert.equal(get.status,200)
    assert.equal(f.follows,1)
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await app.close();await rm(dir,{recursive:true,force:true})}
})

test('M4 host raw save succeeds without a model; task routes retain fences and cancellation is local', async () => {
  const dir=await mkdtemp(join(tmpdir(),'notes-ai-host-')), f=fixture()
  const app=await createApplication({dir,conversation:()=>({...f.controller,inspect:async()=>{throw new Error('no limited inspect')}})})
  let origin=''; const server=createServer((req,res)=>{void createHttpHandler({app,getOrigin:()=>origin})(req,res)})
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();assert.ok(address&&typeof address!=='string');origin=`http://127.0.0.1:${address.port}`
  const post=(prefix:string,path:string,body:unknown,headers:Record<string,string>={})=>fetch(`${origin}/${prefix}${path}`,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)})
  try {
    const captured=await (await post('dsh-fatfish-notes','/notes/capture',{...request,autoMetadata:true})).json() as CaptureResult
    assert.equal(captured.messageCount,112);assert.ok(captured.enrichmentJobId)
    for(const prefix of ['dsh-fatfish-notes']) {
      for(const path of ['/notes/job','/notes/job/retry','/notes/job/cancel','/notes/candidate']) assert.equal((await post(prefix,path,{jobId:captured.enrichmentJobId},{origin:'https://evil.example'})).status,403)
      const response:Response=await fetch(`${origin}/${prefix}/notes/job?jobId=${captured.enrichmentJobId}`);assert.equal(response.status,200)
      const result=await response.json() as {job:{error:string;status:string}};assert.equal(result.job.error,'ai_unavailable');assert.equal(result.job.status,'running')
    }
    assert.equal((await app.notes.repository.list()).items.length,1)
    const cancelled=await post('dsh-fatfish-notes','/notes/job/cancel',{jobId:captured.enrichmentJobId});assert.equal(cancelled.status,200);assert.equal(((await cancelled.json()) as {job:{status:string}}).job.status,'cancelled')
    const replay=await app.notes.capture({...request,autoMetadata:true});assert.equal(replay.enrichmentJobId,captured.enrichmentJobId);assert.equal(replay.note.noteId,captured.note.noteId)
  } finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await app.close();await rm(dir,{recursive:true,force:true})}
})

test('M4 facade close drains its admitted prompt operation without cancelling the whole session', async () => {
  const dir=await mkdtemp(join(tmpdir(),'notes-ai-drain-')), f=fixture(); let entered!:()=>void, finished=false
  const waiting=new Promise<void>(resolve=>{entered=resolve})
  const controller={...f.controller,prompt:async(_request:SessionPromptRequest,active:AbortSignal)=>{entered();await new Promise<void>((_resolve,reject)=>active.addEventListener('abort',()=>{setTimeout(()=>{finished=true;reject(active.reason)},15)},{once:true}));return{accepted:true as const}}} as unknown as SessionController
  const app=new NotesApplication(dir,()=>controller)
  try {
    const captured=await app.capture({...request,autoMetadata:true}), running=app.job({jobId:captured.enrichmentJobId});void running.catch(()=>{})
    await waiting;await app.close();await assert.rejects(running);assert.equal(finished,true)
    const restarted=new NotesApplication(dir,()=>f.controller)
    try {const replay=await restarted.capture({...request,autoMetadata:true});assert.equal(replay.enrichmentJobId,captured.enrichmentJobId);assert.equal((await restarted.repository.list()).items.length,1)}finally{await restarted.close()}
  }finally{await app.close();await rm(dir,{recursive:true,force:true})}
})

test('M3 facade close aborts and drains in-flight paging, refuses new writes',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'notes-drain-')),f=fixture()
  let entered!:()=>void;const waiting=new Promise<void>(resolve=>{entered=resolve});let finished=false
  f.controller.page=async(_request,signal)=>{entered();await new Promise<void>((resolve,reject)=>{signal.addEventListener('abort',()=>{setTimeout(()=>{finished=true;reject(signal.reason)},15)},{once:true})});return{records:[],hasMore:false,cursor:-1}}
  const app=new NotesApplication(dir,()=>f.controller)
  try {
    const capture=app.capture(request);void capture.catch(()=>{})
    await waiting;await app.close();assert.equal(finished,true);await assert.rejects(capture)
    await assert.rejects(app.capture({...request,requestId:'new'}),{code:'closed'})
    assert.equal((await app.repository.list()).items.length,0)
  }finally{await app.close();await rm(dir,{recursive:true,force:true})}
})

test('M3 P2 real 129-image host rejection recovers to two-message capture through the reply entry',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'notes-limit-reselect-')),f=fixture(),app=new NotesApplication(dir,()=>f.controller)
  f.events[0]={...f.events[0]!,data:{id:'m0',source:{kind:'user'},content:Array.from({length:129},(_,i)=>({type:'image',attachment:{attachmentId:`image-${i}`,mediaType:'image/png',bytes:1,width:1,height:1}}))}}
  const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v)},removeItem:(k:string)=>{data.delete(k)}}
  const call:Api=async(path,body,signal)=>{if(path==='/notes/selection')return await app.selection(body,signal) as never;if(path==='/notes/capture')return await app.capture(body,signal) as never;throw new Error('unexpected')}
  const first=new NoteCaptureBridge(call,storage)
  try {
    await first.open(request.sessionId);await first.save();assert.equal(first.getSnapshot()?.error,'note_limit');const original=first.getSnapshot()?.request?.requestId
    assert.equal((await app.repository.list()).items.length,0);first.dispose()
    const next=new NoteCaptureBridge(call,storage);await next.open(request.sessionId,'m111');await next.reselect()
    assert.deepEqual(next.getSnapshot()?.selected,['m110','m111']);await next.save()
    assert.equal(next.getSnapshot()?.status,'saved');assert.equal(next.getSnapshot()?.result?.messageCount,2);assert.equal((await app.repository.list()).items.length,1)
    assert.equal(next.getSnapshot()?.recoveries[0]?.request.requestId,original)
    await next.resume(original!);assert.equal(next.getSnapshot()?.error,'note_limit');assert.equal((await app.repository.list()).items.length,1);next.dispose()
  }finally{first.dispose();await app.close();await rm(dir,{recursive:true,force:true})}
})
