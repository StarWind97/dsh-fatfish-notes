import {noteContent} from '../src/client/notes-controller.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm,readdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {unzipSync} from 'fflate'
import {NoteRepository} from '../src/notes/repository.js'
import {NoteCaptureService,type CaptureConversation,type CaptureRead} from '../src/notes/capture.js'
import {NoteTransfers} from '../src/host/note-transfers.js'
import {ConversationFiles,type ConversationFileServices} from '../src/host/conversation-files.js'
import {referenceNote} from '../src/host/note-reference.js'
import {createExport} from '../src/notes/export/service.js'
import {zipEntries} from '../src/notes/export/zip.js'
import {digest} from '../src/notes/validation.js'
import {sourceAttachments} from '../src/notes/assets.js'
import type {CaptureRequest,NoteContent} from '../src/contracts/notes.js'
import type {AttachmentStore} from '@deepseek-ai/dsh-attachment'
import {windowRequest} from '../src/host/edit-coordinator.js'

const cut={throughSeq:8,capturedAt:'2026-11-11T00:00:00Z',isSeeded:false}
const noteId='01K00000000000000000000000'
const content:NoteContent={title:'文件笔记',body:'正文',summary:'',tags:[],notebookId:null,status:'active',sourceId:null,assetIds:[]}
async function setup(t:{after(fn:()=>Promise<void>):void}){const dir=await mkdtemp(join(tmpdir(),'fatfish-e-'));t.after(()=>rm(dir,{recursive:true,force:true}));return {dir,repo:new NoteRepository(dir)}}
function captureFixture(repo:NoteRepository){
  let bytes=Buffer.from('original,pdf,data'),reads=0
  const transcript:CaptureRead={complete:true,issues:[],messages:[{id:'u',seq:2,turn:1,role:'user',blocks:[{type:'text',text:'保留文件'}]},{id:'a',seq:4,turn:1,role:'assistant',blocks:[{type:'text',text:'交付完成'}]},{id:'u2',seq:6,turn:2,role:'user',blocks:[{type:'text',text:'另一轮'}]}],materials:[{id:'upload',seq:2,messageId:'u',turn:1,kind:'file',origin:'upload',name:'资料.pdf',bytes:bytes.length,available:true},{id:'delivery',seq:5,turn:1,kind:'file',origin:'delivery',name:'结果.csv',bytes:bytes.length,available:true},{id:'other',seq:6,messageId:'u2',turn:2,kind:'file',origin:'upload',name:'另一轮.txt',bytes:1,available:true}],materialReferences:new Map([['upload',{kind:'delivery',path:'upload.pdf'}],['delivery',{kind:'delivery',path:'result.csv'}],['other',{kind:'delivery',path:'other.txt'}]])}
  const conversation:CaptureConversation={open:async()=>cut,read:async()=>transcript,attachment:async()=>{throw Error('not an image')},material:async(_s,_m,_r,_signal,progress)=>{reads++;progress?.(bytes.length);return bytes}}
  const request:CaptureRequest={requestId:'capture-one',sessionId:'session',scope:'selection',messageIds:['u','a'],mode:'raw',autoMetadata:false,notebookId:null,cut,materialIds:['upload','delivery']}
  return {service:new NoteCaptureService(repo,conversation),conversation,request,transcript,change:()=>{bytes=Buffer.from('changed after capture')},reads:()=>reads}
}
test('E materials follow selected messages/turns, deduplicate storage and survive body edits and receipt retries',async t=>{
  const {repo}=await setup(t),f=captureFixture(repo),progress:number[]=[]
  await assert.rejects(f.service.capture({...f.request,requestId:'wrong',materialIds:['other']}),{code:'source_mismatch'})
  const result=await f.service.capture(f.request,undefined,p=>progress.push(p.bytes)),first=result.note.current
  assert.equal(first.attachments?.length,1);assert.ok(progress.some(n=>n>0));assert.doesNotMatch(first.body,/文件与图片|资料.pdf|结果.csv|另一轮/);assert.deepEqual(first.supplements?.attachmentIds,first.attachments!.map(f=>f.id))
  const source=await repo.getSource(first.sourceId!);assert.equal(sourceAttachments(source).length,2)
  const edited=await repo.save({noteId:result.note.noteId,expectedHeads:result.note.heads,content:{...noteContent(result.note),body:'手工正文',attachments:[],supplements:{assetIds:[],attachmentIds:[]}}})
  f.change();const retry=await f.service.capture(f.request);assert.equal(retry.sourceId,result.sourceId);assert.equal(f.reads(),2)
  assert.equal((await repo.get(result.note.noteId)).current.body,'手工正文')
  const zip=await createExport(repo,{noteId:edited.noteId,revision:edited.current.revision,format:'markdown-zip',includeSource:true})
  const files=unzipSync(zip.bytes),names=Object.keys(files);assert.equal(names.filter(n=>n.startsWith('attachments/')).length,1)
  assert.equal(Buffer.from(files[names.find(n=>n.startsWith('attachments/'))!]!).toString(),'original,pdf,data')
  const text=Buffer.from(files[names.find(n=>n.endsWith('.md'))!]!).toString();assert.match(text,/原始素材/);assert.match(text,/attachments\//)
  const excluded=unzipSync((await createExport(repo,{noteId:edited.noteId,revision:edited.current.revision,format:'markdown-zip',includeSource:true,attachmentIds:[],assetIds:[]})).bytes)
  assert.equal(Object.keys(excluded).length,1);assert.match(Buffer.from(Object.values(excluded)[0]!).toString(),/未包含/)
})
test('E cancelling capture mid-file never reports a saved note',async t=>{
  const {repo}=await setup(t),f=captureFixture(repo),abort=new AbortController()
  f.conversation.material=async()=>{abort.abort();abort.signal.throwIfAborted();return Buffer.alloc(0)}
  await assert.rejects(f.service.capture(f.request,abort.signal),{name:'AbortError'})
  assert.equal((await repo.list()).items.length,0)
})
test('E chunk upload enforces owner, exact offsets, complete length and cancellation cleanup',async t=>{
  const {repo,dir}=await setup(t),transfers=new NoteTransfers(dir,repo);t.after(()=>transfers.close())
  const begin=await transfers.request({action:'begin',noteId,draft:true,name:'文件.pdf',size:4}),uploadId='uploadId'in begin?begin.uploadId!:''
  await assert.rejects(transfers.request({action:'chunk',noteId,uploadId,offset:1,base64:'YWJjZA=='}),{code:'transfer_chunk'})
  await assert.rejects(windowRequest.run({windowId:'other'} as never,()=>transfers.request({action:'cancel',noteId,uploadId})),{code:'transfer_expired'})
  await transfers.request({action:'chunk',noteId,uploadId,offset:0,base64:'YWJjZA=='})
  const result=await transfers.request({action:'finish',noteId,uploadId});assert.equal('attachment'in result?result.attachment?.id:null,digest('abcd'))
  assert.deepEqual(await readdir(join(dir,'transfers')),[])
  const other=await transfers.request({action:'begin',noteId,draft:true,name:'cancel.bin',size:20});await transfers.request({action:'cancel',noteId,uploadId:'uploadId'in other?other.uploadId:''});assert.deepEqual(await readdir(join(dir,'transfers')),[])
  const task=transfers.task({action:'begin'});assert.throws(()=>transfers.task({action:'begin'}),{code:'notebook_busy'});transfers.task({action:'end',taskId:task.taskId});assert.equal(transfers.active,false)
})
test('E delivery reads are bounded and fail on changed versions',async()=>{
  const data=Buffer.alloc(5*1024*1024,7),ranges:number[]=[];let changed=false
  const service={stat:async()=>({version:'v1',bytes:data.length}),readBytes:async(_scope:unknown,_path:string,options:{range:{offset:number;length:number}})=>{ranges.push(options.range.length);return {version:changed?'v2':'v1',offset:options.range.offset,data:data.subarray(options.range.offset,options.range.offset+options.range.length)}}}
  const files=new ConversationFiles({workspaceFiles:()=>service as never}),material={id:'d',seq:1,turn:1,kind:'file' as const,origin:'delivery' as const,name:'file.pdf',bytes:data.length,available:true},ref={kind:'delivery' as const,path:'D:/isolated/file.pdf',version:'v1'},signal=new AbortController().signal
  assert.deepEqual(await files.read('session',material,ref,signal),data);assert.equal(ranges.length,3);assert.ok(ranges.every(n=>n<=2*1024*1024))
  changed=true;await assert.rejects(files.read('session',material,ref,signal),{code:'capture_file_changed'})
})
test('E references save independent host copies and always retain body resources',async t=>{
  const {repo}=await setup(t),a=await repo.putAttachment(Buffer.from('PDF'),'资料.pdf'),b=await repo.putAttachment(Buffer.from('WAV'),'声音.wav')
  const note=await repo.save({expectedHeads:[],content:{...content,body:`[PDF](../attachments/${a.id}.bin)\n\n[音频](../attachments/${b.id}.bin)`,attachments:[a,b]}})
  const copied=new Map<string,Buffer>();let i=0
  const store={saveFileStream:async({name,data}:{name:string;data:AsyncIterable<Uint8Array>})=>{const chunks:Buffer[]=[];for await(const c of data)chunks.push(Buffer.from(c));const id=String(i++);copied.set(id,Buffer.concat(chunks));return {attachmentId:id,name}},fileHostPath:(ref:{attachmentId:string})=>'D:/host/attachments/'+ref.attachmentId} as unknown as AttachmentStore
  const r=await referenceNote(repo,store,{open:async()=>cut},{sessionId:'s',noteId:note.noteId,revision:note.current.revision,assetIds:[],attachmentIds:[a.id]},new AbortController().signal)
  assert.equal(r.files,3);assert.match(r.instruction,/@"D:\/host\/attachments\/2"/);assert.equal(copied.get('0')!.toString(),'PDF');assert.equal(copied.get('1')!.toString(),'WAV')
  const text=copied.get('2')!.toString();assert.match(text,/D:\/host\/attachments\/0/);assert.match(text,/D:\/host\/attachments\/1/);assert.doesNotMatch(text,/未包含/)
})
test('E ZIP streams valid entries and stops subsequent file reads when cancelled',async()=>{
  const abort=new AbortController(),chunks:Buffer[]=[];let read=0
  const entries=[{path:'第一份.txt',read:async()=>{read++;return Buffer.from('中文')}},{path:'file.bin',read:async()=>{read++;return Buffer.alloc(900000,3)}}]
  for await(const c of zipEntries(entries))chunks.push(Buffer.from(c));assert.equal(read,2);assert.equal(Buffer.from(unzipSync(Buffer.concat(chunks))['第一份.txt']!).toString(),'中文')
  read=0;await assert.rejects(async()=>{for await(const _ of zipEntries(entries,abort.signal)){abort.abort()}},{name:'AbortError'});assert.equal(read,1)
})
