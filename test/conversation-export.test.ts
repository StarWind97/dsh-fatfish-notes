import test from 'node:test'
import assert from 'node:assert/strict'
import { unzipSync } from 'fflate'
import { createConversationExport } from '../src/notes/export/conversation.js'
import { NoteConversation } from '../src/host/note-conversation.js'
import { NoteCaptureBridge } from '../src/client/note-capture-bridge.js'
import { fixture, request } from './fixtures/notes-capture.js'
import type { CaptureMessage, CaptureSelection } from '../src/contracts/notes.js'

const signal=new AbortController().signal
test('DSH 0.2.2 chat export reads images with the complete reference from the frozen history',async()=>{
  const f=fixture(), pixels=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')
  const reference={attachmentId:'test-image',mediaType:'image/png',bytes:pixels.length,width:1,height:1}
  f.events[0]={...f.events[0]!,data:{id:'m0',source:{kind:'user'},content:[{type:'image',attachment:reference}]}}
  let reads=0
  f.controller.attachment=async input=>{
    reads++;assert.deepEqual(input,{sessionId:request.sessionId,attachment:reference})
    return {attachment:input.attachment,data:pixels.toString('base64')}
  }
  const file=await createConversationExport(new NoteConversation(()=>f.controller),{sessionId:request.sessionId,throughSeq:1,messageIds:['m0','m1'],format:'markdown'},signal)
  const files=unzipSync(file.bytes),image=Object.keys(files).find(p=>p.startsWith('assets/'))!
  assert.equal(reads,1);assert.deepEqual(Buffer.from(files[image]!),pixels)
  assert.deepEqual(JSON.parse(file.warnings),{partial:false,missing:0,linked:0})
})

test('chat export reads only selected visible messages at the selected cutoff in conversation order',async()=>{
  const f=fixture(), history=new NoteConversation(()=>f.controller)
  const form={sessionId:request.sessionId,throughSeq:41,messageIds:['m41','m2'],format:'markdown'}
  const file=await createConversationExport(history,form,signal)
  const body=file.bytes.toString()
  assert.ok(body.indexOf('## 用户')<body.indexOf('## AI'))
  assert.match(body,/question 2/);assert.match(body,/answer 41/);assert.doesNotMatch(body,/answer 3|question 40/)
  assert.deepEqual(JSON.parse(file.warnings),{partial:false,missing:0,linked:0})
  assert.ok(f.cuts.length && f.cuts.every(n=>n===41))
  await assert.rejects(createConversationExport(history,{...form,messageIds:['m42']},signal),{code:'source_mismatch'})
})

test('chat export bundles selected images, warns for missing and external images, and keeps Markdown references scoped',async()=>{
  const pixels=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGMUSVnAwMDAxAAGAAy+ARwF/nw5AAAAAElFTkSuQmCC','base64')
  const messages:CaptureMessage[]=[
    {id:'q',seq:1,role:'user',blocks:[{type:'text',text:'读 [示例][1]。\n\n[1]: https://example.org/first\n\n~~~text\nunfinished'},
      {type:'image',attachmentId:'ok',mediaType:'image/png'}]},
    {id:'a',seq:2,role:'assistant',blocks:[{type:'text',text:'读 [示例][1]。\n\n[1]: https://example.org/second\n\n![远程](https://example.org/x.png)'},
      {type:'image',attachmentId:'gone',mediaType:'image/png'}]}]
  const conversation={read:async()=>({messages,issues:['unknown_required_event'],complete:false}),attachment:async(_sid:string,id:string)=>{
    if(id!=='ok')throw Error('not available')
    return {bytes:pixels,mediaType:'image/png' as const}
  }}
  const form={sessionId:'s',throughSeq:2,messageIds:['q','a'],format:'markdown'}
  const file=await createConversationExport(conversation,form,signal), files=unzipSync(file.bytes)
  assert.deepEqual(JSON.parse(file.warnings),{partial:true,missing:1,linked:1})
  const image=Object.keys(files).find(p=>p.startsWith('assets/'))!
  assert.deepEqual(Buffer.from(files[image]!),pixels)
  const body=Buffer.from(files[Object.keys(files).find(p=>p.endsWith('.md'))!]!).toString()
  assert.ok(body.includes('('+image+')'));assert.match(body,/unfinished\n~~~\n/)
  assert.match(body,/\[示例\]\[chat-1-0-1\]/);assert.match(body,/\[示例\]\[chat-2-0-1\]/)
  assert.match(body,/\[图片未能读取\]/);assert.doesNotMatch(body,/!\[远程\]/)
  const snapshot=JSON.parse((await createConversationExport(conversation,{...form,format:'snapshot'},signal)).bytes.toString())
  assert.ok(snapshot.assets[image.slice(7)])
  assert.deepEqual(snapshot.model.blocks.flatMap((b:{runs?:Array<{href?:string}>})=>b.runs?.flatMap(r=>r.href?[r.href]:[])??[]),
    ['https://example.org/first','https://example.org/second','https://example.org/x.png'])
  await assert.rejects(createConversationExport(conversation,{...form,format:'pdf',snapshotHash:'stale'},signal),{code:'source_mismatch'})
  const pdf=await createConversationExport(conversation,{...form,format:'pdf',snapshotHash:snapshot.snapshotHash},signal)
  assert.ok(pdf.bytes.subarray(0,5).equals(Buffer.from('%PDF-')))
})

test('direct export uses shareable turn selection without resuming or creating a pending note',async()=>{
  const selection:CaptureSelection={cut:{throughSeq:4,capturedAt:new Date().toISOString(),isSeeded:false},
    messages:[0,1,2,3].map(i=>({id:String(i),role:i%2?'assistant':'user',seq:i,blocks:[]})),complete:true,issues:[],defaultMessageIds:['2','3']}
  const bridge=new NoteCaptureBridge(async(path)=>{
    assert.equal(path,'/notes/selection');return {ok:true,...selection} as never
  },{getItem:()=>assert.fail('export loaded note recovery'),setItem:()=>assert.fail('export saved note recovery'),removeItem:()=>assert.fail()})
  await bridge.openExport('s','3')
  assert.deepEqual(bridge.getSnapshot()?.selected,['2','3'])
  bridge.exportFormat('pdf');bridge.exportRange('custom');bridge.toggle('1');bridge.showDetail(true);bridge.exportDialog()
  bridge.exportRange('session');bridge.exportRange('turn');bridge.exportRange('custom')
  assert.deepEqual(bridge.getSnapshot()?.selected,['2','3','1'])
  assert.equal(bridge.getSnapshot()?.exporting?.format,'pdf')
  await bridge.save();bridge.close();assert.equal(bridge.getSnapshot(),null)
})
