import test from 'node:test'
import assert from 'node:assert/strict'
import { NoteCaptureBridge } from '../src/client/note-capture-bridge.js'
import { validNotesResponse } from '../src/client/notes-validation.js'
import type { Api } from '../src/client/api.js'
import type { CaptureRequest, CaptureResult, NoteJob } from '../src/contracts/notes.js'
import { createNoteRevision, materializeNote } from '../src/notes/revisions.js'
import { ApiError } from '../src/client/api.js'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { NoteCaptureOverlay } from '../src/client/NoteCapture.js'
import { NoteTurnCheckbox, NoteCaptureDock } from '../src/client/CaptureInline.js'
import { translate } from '../src/client/locale.js'

const selection={ok:true,cut:{throughSeq:111,capturedAt:'2026-11-01T00:00:00.000Z',isSeeded:false},complete:true,issues:[],messages:Array.from({length:112},(_,i)=>({id:`m${i}`,seq:i,role:i%2?'assistant':'user',blocks:[{type:'text',text:`body${i}`}]})),defaultMessageIds:['m110','m111']}

test('capture from a middle answer preserves custom turns across whole-session mode and sends the chosen scope',async()=>{
  const requests:CaptureRequest[]=[]
  const bridge=new NoteCaptureBridge(async(path,input)=>{
    if(path==='/notes/selection')return {...selection,defaultMessageIds:['m2','m3']} as never
    requests.push(input as CaptureRequest);return {ok:true,messageCount:4} as never
  })
  await bridge.open('session','m3')
  const view=()=>[NoteCaptureDock,NoteCaptureOverlay].map(component=>renderToStaticMarkup(createElement(component,{bridge,sessionId:'session',t:translate}))).join('')
  const checkbox=(sessionId:string,seq:number)=>renderToStaticMarkup(createElement(NoteTurnCheckbox,{sessionId,seq,bridge,t:translate}))
  assert.match(view(),/已选 1 轮 · 2 条消息/);assert.doesNotMatch(view(),/role="dialog"/)
  assert.match(checkbox('session',3),/checked/);assert.equal(checkbox('other',3),'');assert.equal(checkbox('session',250),'')
  bridge.showDetail(true);assert.match(view(),/body2/);assert.doesNotMatch(view(),/body110/)
  assert.equal(checkbox('session',3),'')
  bridge.toggleMessages(['m6','m7']);bridge.toggle('m6')
  bridge.setScope('session');assert.match(view(),/56 轮 · 112 条消息/)
  bridge.setScope('selection');assert.deepEqual(bridge.getSnapshot()?.selected,['m2','m3','m7'])
  bridge.showDetail(false);assert.match(view(),/已选 2 轮 · 3 条消息/)
  bridge.setScope('session');assert.match(view(),/已选 56 轮 · 112 条消息/);assert.match(checkbox('session',7),/disabled/)
  bridge.setScope('selection');assert.deepEqual(bridge.getSnapshot()?.selected,['m2','m3','m7'])
  await bridge.save();assert.deepEqual(requests[0]?.messageIds,['m2','m3','m7'])
  await bridge.open('session','m3');bridge.toggleMessages(['m2','m3']);await bridge.save()
  assert.equal(requests.length,1);bridge.setScope('session');await bridge.save()
  assert.equal(requests[1]?.scope,'session');assert.equal(requests[1]?.messageIds,undefined)
  bridge.dispose()
})

test('cancelling inline selection discards picks and options; remounted rows read the active session and snapshot',async()=>{
  const saved:CaptureRequest[]=[]
  const bridge=new NoteCaptureBridge(async(path,input)=>{
    if(path==='/notes/selection')return {...selection,defaultMessageIds:['m4','m5']} as never
    saved.push(input as CaptureRequest);return {ok:true,messageCount:2} as never
  })
  await bridge.open('old','m5')
  bridge.toggleMessages(['m0','m1']);bridge.options(true);bridge.showDetail(true);bridge.showDetail(false)
  bridge.close();await bridge.save();assert.equal(saved.length,0)
  await bridge.open('new','m5')
  assert.equal(bridge.getSnapshot()?.detail,false);assert.equal(bridge.getSnapshot()?.autoMetadata,false)
  assert.deepEqual(bridge.getSnapshot()?.selected,['m4','m5'])
  const row=(sessionId:string,seq:number)=>renderToStaticMarkup(createElement(NoteTurnCheckbox,{sessionId,seq,bridge,t:translate}))
  assert.equal(row('old',5),'');assert.equal(row('new',4),'');assert.match(row('new',5),/checked/)
  bridge.toggle('m4');assert.doesNotMatch(row('new',5),/checked/);bridge.toggleMessages(['m4','m5'])
  assert.match(row('new',5),/checked/);bridge.dispose()
})

test('M4 independent AI options survive receipt loss/reload and keep the raw save when AI fails', async () => {
  const data = new Map<string,string>(), storage = { getItem: (k:string) => data.get(k) ?? null, setItem: (k:string,v:string) => { data.set(k,v) }, removeItem: (k:string) => { data.delete(k) } }
  const requests: CaptureRequest[] = []; let fail = true, completed = false
  const revision = createNoteRevision({ version:1,noteId:'01K00000000000000000000000',parents:[],recordedAt:'2026-11-01T00:00:00.000Z',title:'Saved',body:'original',summary:'',tags:[],notebookId:null,status:'active',sourceId:'a'.repeat(64),assetIds:[] })
  const note = materializeNote([revision], revision.noteId)
  const job: NoteJob = { version:1,jobId:'b'.repeat(64),captureRequestId:'unused',sessionId:'session',noteId:note.noteId,sourceId:revision.sourceId!,baseRevision:revision.revision,mode:'metadata',autoMetadata:true,status:'failed',error:'ai_no_candidate',stages:[{kind:'final',input:'original',assetIds:[],attempt:1,requestId:'attempt',status:'failed',result:null,error:'ai_no_candidate'}],candidate:null,adoption:null }
  const call: Api = async (path,body) => {
    if (path === '/notes/selection') return selection as never
    if (path === '/notes/job' || path === '/notes/job/retry') { if (path === '/notes/job/retry') completed = true; return {ok:true,job:{...job,status:completed?'completed':'failed'}} as never }
    if (path === '/notes/get') return {ok:true,note} as never
    const req = body as CaptureRequest; requests.push(req); if (fail) throw new ApiError('network')
    return {ok:true,note,sourceId:revision.sourceId,complete:true,messageCount:2,missingAssetIds:[],enrichmentJobId:job.jobId,enrichmentStatus:'queued',cut:selection.cut,issues:[]} as never
  }
  const first = new NoteCaptureBridge(call, storage); await first.open('session'); first.options(true)
  const html = renderToStaticMarkup(createElement(NoteCaptureOverlay,{bridge:first,sessionId:'session',t:translate})); assert.doesNotMatch(html,/AI 整理正文/); assert.match(html,/建议标题/); assert.doesNotMatch(html,/暂不支持 AI/)
  await first.save(); first.dispose(); assert.equal(requests[0]!.mode,'raw'); assert.equal(requests[0]!.autoMetadata,true)
  const next = new NoteCaptureBridge(call,storage); await next.open('session'); assert.equal(next.getSnapshot()!.recoveries.length,1); fail = false; await next.save()
  assert.deepEqual(requests[0],requests[1]); assert.equal(next.getSnapshot()!.status,'saved'); assert.equal(next.getSnapshot()!.job!.status,'failed'); assert.equal(next.getSnapshot()!.recoveries.length,1)
  assert.ok(![...data.values()].some(s => s.includes('original')))
  await next.refreshJob('retry'); assert.equal(next.getSnapshot()!.job!.status,'completed'); assert.equal(data.size,0); next.dispose()
})
test('M3 both entry points use full selection; lost response retries same identity across bridge restart',async()=>{
  const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v)},removeItem:(k:string)=>{data.delete(k)}}
  const requests:CaptureRequest[]=[];let fail=true
  const call:Api=async(path,body)=>{
    if(path==='/notes/selection')return selection as never
    if(path==='/notes/capture'){requests.push(body as CaptureRequest);if(fail)throw new Error('receipt lost');return{ok:true,messageCount:2} as never}
    throw new Error('unexpected')
  }
  const first=new NoteCaptureBridge(call,storage);await first.open('session','m111')
  assert.equal(first.getSnapshot()?.selection?.messages.length,112);await first.save();assert.equal(first.getSnapshot()?.status,'failed');first.dispose()
  const next=new NoteCaptureBridge(call,storage);await next.open('session');assert.equal(next.getSnapshot()?.status,'cancelled');fail=false;await next.save()
  assert.deepEqual(requests[0],requests[1]);assert.equal(data.size,0);assert.equal(next.getSnapshot()?.status,'saved')
  await next.open('session');await next.save();assert.equal(requests[2]?.scope,'session');assert.notEqual(requests[2]?.requestId,requests[0]?.requestId)
  next.dispose()
})
test('M3 cancellation retains request and does not report success from stale asynchronous response',async()=>{
  let done!:(v:unknown)=>void
  const call:Api=async(path)=>path==='/notes/selection'?selection as never:await new Promise<unknown>(resolve=>{done=resolve}) as never
  const bridge=new NoteCaptureBridge(call);await bridge.open('session');const saving=bridge.save(),id=bridge.getSnapshot()?.request?.requestId
  bridge.close();done({ok:true});await saving
  assert.equal(bridge.getSnapshot(),null);assert.ok(id)
})
test('M3 client refuses selection duplicates and false-complete missing assets',()=>{
  assert.equal(validNotesResponse('/notes/selection',selection),true)
  assert.equal(validNotesResponse('/notes/selection',{...selection,messages:[selection.messages[0],selection.messages[0]]}),false)
  const sourceId='a'.repeat(64),revision=createNoteRevision({version:1,noteId:'01K00000000000000000000000',parents:[],recordedAt:'2026-11-01T00:00:00.000Z',title:'Saved',body:'original',summary:'',tags:[],notebookId:null,status:'active',sourceId,assetIds:[]})
  const complete={ok:true,note:materializeNote([revision],revision.noteId),sourceId,complete:true,messageCount:2,missingAssetIds:[],enrichmentJobId:null,enrichmentStatus:'not-requested',cut:selection.cut,issues:[]}
  assert.equal(validNotesResponse('/notes/capture',complete),true)
  const missing={...complete,missingAssetIds:['missing']}
  assert.equal(validNotesResponse('/notes/capture',missing),false)
  assert.equal(validNotesResponse('/notes/capture',{...missing,complete:false}),true)
})

test('M3 P2 limit failure can reselect a local answer while retaining the original request for recovery',async()=>{
  const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v)},removeItem:(k:string)=>{data.delete(k)}}
  const requests:CaptureRequest[]=[];let selectionCalls=0,limit=true
  const call:Api=async(path,body)=>{
    if(path==='/notes/selection'){selectionCalls++;return selection as never}
    const request=body as CaptureRequest;requests.push(request)
    if(request.scope==='session'&&limit)throw new ApiError('note_limit')
    return{ok:true,messageCount:2} as never
  }
  const first=new NoteCaptureBridge(call,storage);await first.open('session');await first.save();const original=requests[0]!
  assert.equal(first.getSnapshot()?.error,'note_limit');first.dispose()
  const second=new NoteCaptureBridge(call,storage);await second.open('session','m111')
  assert.equal(second.getSnapshot()?.error,'note_limit')
  const failedMarkup=renderToStaticMarkup(createElement(NoteCaptureOverlay,{bridge:second,sessionId:'session',t:translate}))
  assert.ok(failedMarkup.includes(translate('noteLimitRecovery')));assert.ok(failedMarkup.includes(translate('noteReselect')));assert.ok(failedMarkup.includes(translate('noteRetryOriginal')))
  await second.reselect();assert.equal(second.getSnapshot()?.status,'selecting');assert.equal(selectionCalls,2)
  const selectMarkup=renderToStaticMarkup(createElement(NoteCaptureOverlay,{bridge:second,sessionId:'session',t:translate}))
  assert.ok(selectMarkup.includes(translate('noteNewSaveWarning')));assert.ok(selectMarkup.includes(translate('noteRecoverSession',{index:1})))
  assert.deepEqual(second.getSnapshot()?.selected,['m110','m111']);await second.save()
  assert.notEqual(requests[1]?.requestId,original.requestId);assert.equal(requests[1]?.scope,'selection');assert.equal(second.getSnapshot()?.status,'saved')
  second.dispose()
  const third=new NoteCaptureBridge(call,storage);await third.open('session');assert.equal(third.getSnapshot()?.request?.requestId,original.requestId)
  limit=false;await third.save();assert.deepEqual(requests[2],original);assert.equal(data.size,0);third.dispose()
})

test('M3 P2 unknown receipt and cancellation allow explicit reselection without discarding recovery identities',async()=>{
  const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v)},removeItem:(k:string)=>{data.delete(k)}}
  const requests:CaptureRequest[]=[];let fail='network'
  const call:Api=async(path,body,signal)=>{
    if(path==='/notes/selection')return selection as never
    requests.push(body as CaptureRequest)
    if(fail==='network')throw new ApiError('network')
    if(fail==='cancel')return await new Promise((_,reject)=>{signal?.addEventListener('abort',()=>reject(signal.reason),{once:true})}) as never
    return{ok:true,messageCount:2} as never
  }
  const bridge=new NoteCaptureBridge(call,storage);await bridge.open('session');await bridge.save();const unknown=requests[0]!
  await bridge.reselect();bridge.toggle('m110');fail='cancel';const pending=bridge.save();bridge.cancel();await pending
  assert.equal(bridge.getSnapshot()?.status,'cancelled');const cancelled=requests[1]!
  await bridge.reselect();assert.equal(bridge.getSnapshot()?.status,'selecting');assert.equal(bridge.getSnapshot()?.recoveries.length,2)
  fail='';await bridge.save();assert.notEqual(requests[2]?.requestId,cancelled.requestId);assert.equal(bridge.getSnapshot()?.recoveries.length,2)
  await bridge.resume(unknown.requestId);assert.deepEqual(requests[3],unknown);assert.equal(bridge.getSnapshot()?.recoveries.length,1)
  bridge.dispose()
  const restarted=new NoteCaptureBridge(call,storage);await restarted.open('session','m111');assert.equal(restarted.getSnapshot()?.request?.requestId,cancelled.requestId)
  await restarted.save();assert.deepEqual(requests[4],cancelled);assert.equal(data.size,0);restarted.dispose()
})

test('pending capture keeps its recovery identity after restarting',async()=>{
  const original:CaptureRequest={requestId:'pending-request',sessionId:'session',scope:'session',mode:'raw',autoMetadata:false,notebookId:null}
  const data=new Map([['fatfish-notes-private:capture:unbound:session',JSON.stringify({version:1,requests:[{request:original,error:null}]})]]),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v)},removeItem:(k:string)=>{data.delete(k)}}
  const requests:CaptureRequest[]=[]
  const call:Api=async(path,body)=>{if(path==='/notes/selection')return selection as never;requests.push(body as CaptureRequest);return{ok:true,messageCount:2} as never}
  const bridge=new NoteCaptureBridge(call,storage);await bridge.open('session','m111');assert.deepEqual(bridge.getSnapshot()?.request,original)
  await bridge.reselect();await bridge.save();bridge.dispose()
  const next=new NoteCaptureBridge(call,storage);await next.open('session');assert.deepEqual(next.getSnapshot()?.request,original);await next.save()
  assert.deepEqual(requests[1],original);assert.equal(data.size,0);next.dispose()
})
