import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import type {SessionWireEvent} from '@deepseek-ai/dsh-api-session-controller'
import type {CaptureSource} from '../src/contracts/notes.js'
import {projectTranscript} from '../src/host/note-conversation.js'
import {NoteRepository} from '../src/notes/repository.js'
import {NoteCaptureService,rawBody,type CaptureConversation} from '../src/notes/capture.js'
import {capturedFile} from '../src/notes/capture-materials.js'
import {bodyMaterials} from '../src/notes/reference-materials.js'
import {sourceMarkdown} from '../src/notes/export/markdown.js'
import {canonical,digest} from '../src/notes/validation.js'
import {validCaptureSource,validNotesResponse} from '../src/client/notes-validation.js'

const bytes=[Buffer.from('first file'),Buffer.from('second file')],ids=['upload:2:1','upload:2:3']
const cut={throughSeq:3,capturedAt:'2026-11-13T00:00:00Z',isSeeded:false}
function transcript(first='before'){
  const file=(i:number)=>({type:'file',attachment:{name:'same.csv',attachmentId:'sha256:'+digest(bytes[i]!),bytes:bytes[i]!.length,mediaType:'text/csv'}})
  return projectTranscript([{type:'user/message',seq:2,time:0,surfaceOp:'append',data:{id:'u',source:{kind:'user'},content:[{type:'text',text:first},file(0),{type:'text',text:'between'},file(1),{type:'text',text:'[上传文件：same.csv]'}]}},{type:'assistant/message',seq:3,time:0,surfaceOp:'append',data:{message:{id:'a',content:[{type:'text',text:'done'}]}}}] as SessionWireEvent[])
}
test('native upload blocks carry identity; text lookalikes stay text and selected material classification follows the card',()=>{
  const value=transcript(),message=value.messages[0]!
  assert.deepEqual(message.blocks[1],{type:'text',text:'[上传文件：same.csv]',materialId:ids[0]})
  assert.deepEqual(message.blocks[4],{type:'text',text:'[上传文件：same.csv]'})
  assert.ok(value.materials!.every(m=>m.placement==='body'))
  const selection={ok:true,...value,cut,defaultMessageIds:['u','a']}
  assert.equal(validNotesResponse('/notes/selection',selection),true)
  const invalid=structuredClone(selection);Object.assign(invalid.messages[0]!.blocks[1]!,{materialId:9})
  assert.equal(validNotesResponse('/notes/selection',invalid),false)
})
test('same-name uploads retain exact positions, bytes and source identities without supplement duplicates',async t=>{
  const root=await mkdtemp(join(tmpdir(),'fatfish-inline-files-')),repo=new NoteRepository(root);t.after(async()=>{repo.close();await rm(root,{recursive:true,force:true})})
  let read=0;const value=transcript(),conversation:CaptureConversation={open:async()=>cut,read:async()=>value,attachment:async()=>{throw Error('not image')},material:async(_s,m)=>{read++;return bytes[ids.indexOf(m.id)]!}}
  const service=new NoteCaptureService(repo,conversation),request={requestId:'inline-upload',sessionId:'s',scope:'session' as const,mode:'raw' as const,autoMetadata:false,notebookId:null,cut,materialIds:ids}
  const result=await service.capture(request),note=result.note.current,source=await repo.getSource(result.sourceId) as unknown as CaptureSource
  const first=`../attachments/${digest(bytes[0]!)}.bin`,second=`../attachments/${digest(bytes[1]!)}.bin`
  assert.ok(note.body.indexOf('before')<note.body.indexOf(first));assert.ok(note.body.indexOf(first)<note.body.indexOf('between'));assert.ok(note.body.indexOf('between')<note.body.indexOf(second))
  assert.match(note.body,/\[上传文件：same.csv\]/);assert.equal(note.attachments?.length,2);assert.deepEqual(note.supplements?.attachmentIds,[])
  assert.deepEqual(await repo.getAttachment(digest(bytes[0]!)),bytes[0]);assert.deepEqual(await repo.getAttachment(digest(bytes[1]!)),bytes[1])
  assert.deepEqual(source.messages,value.messages);assert.equal(digest(canonical(source)),result.sourceId);assert.equal(validCaptureSource(source),true)
  const appendix=sourceMarkdown(source as unknown as Record<string,unknown>).body;assert.match(appendix,new RegExp(digest(bytes[0]!)));assert.doesNotMatch(appendix,/## 文件与图片/)
  const retry=await service.capture(request);assert.equal(retry.sourceId,result.sourceId);assert.equal(read,2)
  const partial=await service.capture({...request,requestId:'one-upload',materialIds:[ids[0]!]});assert.match(partial.note.current.body,/same.csv（未包含）/);assert.equal(bodyMaterials(partial.note.current.body).attachmentIds.length,1)
  const legacy=structuredClone(source);for(const message of legacy.messages)for(const block of message.blocks)if(block.type==='text')delete block.materialId
  assert.equal(validCaptureSource(legacy),true);assert.deepEqual(bodyMaterials(rawBody(legacy)).attachmentIds,[])
  const wrong=structuredClone(source);wrong.archivedMaterials![0]!.messageId='other';assert.match(rawBody(wrong),/关联不可用/);assert.ok(!bodyMaterials(rawBody(wrong)).attachmentIds.includes(digest(bytes[0]!)))
  const noSelection=await service.capture({...request,requestId:'legacy-request',materialIds:undefined});assert.deepEqual(noSelection.note.current.attachments??[],[])
})
test('generated upload links cannot be swallowed by unfinished text fences; omitted and unavailable cards never invent links',()=>{
  const value=transcript('```text\nunfinished'),source:CaptureSource={...value,version:1,sessionId:'s',scope:'session',cut,assets:{},missingAssetIds:[],textOnlyBlocks:[],archivedMaterials:value.materials!.map((m,i)=>({...m,...(i===0?{saved:{id:digest(bytes[0]!),name:m.name,bytes:bytes[0]!.length}}:{available:false})}))}
  const body=rawBody(source);assert.deepEqual(bodyMaterials(body).attachmentIds,[digest(bytes[0]!)]);assert.match(body,/文件不可用/)
  assert.deepEqual(source.messages,value.messages)
  const missing=capturedFile(source.messages[0]!.blocks[1]!,source.messages[0]!,[]);assert.match(missing!.markdown,/关联不可用/)
})
