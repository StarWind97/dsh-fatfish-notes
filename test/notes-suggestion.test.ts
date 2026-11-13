import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {suggestMetadata} from '../src/host/note-suggestion.js'
import {NoteModelBridge} from '../src/host/note-model.js'
import {NoteConversation} from '../src/host/note-conversation.js'
import {NoteRepository} from '../src/notes/repository.js'
import {NoteCaptureService} from '../src/notes/capture.js'
import {NoteCaptureBridge} from '../src/client/note-capture-bridge.js'
import {fixture,request} from './fixtures/notes-capture.js'
import type {CaptureRequest} from '../src/contracts/notes.js'
import {ApiError} from '../src/client/api.js'

const metadata={title:'观测笔记',summary:'保留这次观测的结论和线索。',tags:['观测']}
test('preview generates selected metadata without a note or conversation message; only confirmation saves',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'notes-preview-')),f=fixture(),repo=new NoteRepository(dir),signals=new AbortController()
  const prompts:string[]=[]
  const controller={...f.controller,async *follow(){yield {type:'snapshot',header:{id:request.sessionId},projections:{values:{modelSelection:{next:{provider:'p',model:'m'}}}}}},prompt(){assert.fail('preview must not create chat messages')}}
  const llm={async prepareCall(){return {config:{},async *stream(o:any){prompts.push(o.messages[0].content[0].text);assert.deepEqual(o.tools,[]);yield {type:'text-delta',text:JSON.stringify(metadata)};yield {type:'finish',reason:{kind:'stop'}}}}}}
  const services={llm:()=>llm as never},conversation=new NoteConversation(()=>f.controller),model=new NoteModelBridge(()=>controller as never,repo,services)
  try{
    const cut=await conversation.open(request.sessionId,signals.signal),selected:CaptureRequest={...request,scope:'selection',messageIds:['m2','m3'],cut}
    assert.deepEqual(await suggestMetadata(selected,conversation,model,services,signals.signal),metadata)
    assert.match(prompts[0]!,/answer 3/);assert.doesNotMatch(prompts[0]!,/answer 111/)
    assert.equal((await repo.files.scan()).paths.length,0,'preview creates no note, journal or source')
    const service=new NoteCaptureService(repo,conversation)
    assert.throws(()=>service.capture({...selected,metadata:{...metadata,title:'  '}}),{code:'capture_title'})
    const saved=await service.capture({...selected,metadata,autoMetadata:true})
    assert.equal(saved.note.current.title,metadata.title);assert.equal(saved.note.current.summary,metadata.summary);assert.deepEqual(saved.note.current.tags,metadata.tags)
    assert.match(saved.note.current.body,/answer 3/);assert.equal(saved.enrichmentJobId,null)
    await assert.rejects(service.capture({...selected,metadata:{...metadata,title:'Changed'}}),{code:'capture_request_mismatch'})
  }finally{await rm(dir,{recursive:true,force:true})}
})

test('suggestion cancellation and range changes cannot adopt stale metadata or save early',async()=>{
  let resolve!:(v:any)=>void,signal:AbortSignal|undefined,saves=0
  const selection={ok:true,cut:{throughSeq:1,capturedAt:'2026-11-12T00:00:00Z',isSeeded:false},complete:true,issues:[],messages:[{id:'u',seq:0,role:'user',blocks:[{type:'text',text:'观测问题'}]},{id:'a',seq:1,role:'assistant',blocks:[{type:'text',text:'原始答案'}]}],defaultMessageIds:['u','a']}
  const bridge=new NoteCaptureBridge(async(path,input,active)=>{
    if(path==='/notes/session-context')return {ok:true,workspace:null,notebookId:null} as never
    if(path==='/notes/selection')return selection as never
    if(path==='/notes/suggest'){signal=active;return await new Promise(r=>{resolve=r}) as never}
    if(path==='/notes/capture'){saves++;assert.deepEqual((input as CaptureRequest).metadata,metadata);return {ok:true,messageCount:1} as never}
    throw Error(path)
  })
  try{
    await bridge.open('s','a');const pending=bridge.suggest();await bridge.save();assert.equal(saves,0)
    bridge.toggle('u');assert.equal(signal?.aborted,true);resolve({ok:true,metadata});await pending
    assert.notEqual(bridge.getSnapshot()?.metadata?.title,metadata.title)
    const next=bridge.suggest();resolve({ok:true,metadata});await next;assert.deepEqual(bridge.getSnapshot()?.metadata,metadata)
    bridge.metadata({title:''});await bridge.save();assert.equal(saves,0)
    bridge.metadata({title:metadata.title});await bridge.save();assert.equal(saves,1)
    await bridge.open('s','a');const last=bridge.suggest();bridge.close();resolve({ok:true,metadata});await last;assert.equal(bridge.getSnapshot(),null)
  }finally{bridge.dispose()}
})

test('failed suggestion keeps manual fields editable and allows a later confirmed save',async()=>{
  let saved:CaptureRequest|undefined
  const bridge=new NoteCaptureBridge(async(path,input)=>{
    if(path==='/notes/session-context')return {ok:true,workspace:null,notebookId:null} as never
    if(path==='/notes/selection')return {ok:true,cut:{throughSeq:0,capturedAt:'2026-11-12T00:00:00Z',isSeeded:false},complete:true,issues:[],messages:[{id:'m',seq:0,role:'user',blocks:[{type:'text',text:'[上传文件：资料.pdf]',materialId:'upload:0:0'},{type:'text',text:'保存的原文'}]}],defaultMessageIds:['m']} as never
    if(path==='/notes/suggest')throw new ApiError('ai_unavailable')
    if(path==='/notes/capture'){saved=input as CaptureRequest;return {ok:true,messageCount:1} as never}
    throw Error(path)
  })
  try{await bridge.open('s');assert.equal(bridge.getSnapshot()?.metadata?.title,'保存的原文');bridge.metadata(metadata);await bridge.suggest();assert.equal(bridge.getSnapshot()?.suggestionError,'ai_unavailable');assert.equal(bridge.getSnapshot()?.suggesting,false);assert.deepEqual(bridge.getSnapshot()?.metadata,metadata);assert.equal(saved,undefined);bridge.metadata({summary:''});await bridge.save();assert.equal(saved!.metadata?.summary,'');assert.equal(saved!.autoMetadata,false)}finally{bridge.dispose()}
})
