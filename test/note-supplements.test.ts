import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {unzipSync} from 'fflate'
import {EditorState,Transaction} from '@codemirror/state'
import {history,undo,redo,isolateHistory} from '@codemirror/commands'
import {supplementField,supplementHistory,setSupplements} from '../src/client/paper/supplement-history.js'
import {NoteRepository} from '../src/notes/repository.js'
import {currentMaterials,remainingSupplements,supplementMaterials} from '../src/notes/note-materials.js'
import {normalizeContent} from '../src/notes/validation.js'
import {createExport} from '../src/notes/export/service.js'
import {createConversationExport} from '../src/notes/export/conversation.js'
import {NoteCaptureService,type CaptureRead,type CaptureConversation} from '../src/notes/capture.js'
import {captureLinks,capturedText} from '../src/notes/capture-materials.js'
import {previewReference} from '../src/host/note-reference.js'
import type {CaptureMessage,CaptureSource,NoteContent} from '../src/contracts/notes.js'

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')
const empty={assetIds:[],attachmentIds:[]}
const content:NoteContent={title:'正文与补充',body:'内容',summary:'',tags:[],notebookId:null,status:'active',sourceId:null,assetIds:[],supplements:empty}
async function fixture(t:{after(fn:()=>Promise<void>):void}){const dir=await mkdtemp(join(tmpdir(),'fatfish-supplements-'));t.after(()=>rm(dir,{recursive:true,force:true}));return new NoteRepository(dir)}
test('supplements persist independently: body deletion does not bring moved files back; removed files stay out of exports',async t=>{
  const repo=await fixture(t),file=await repo.putAttachment(Buffer.from('only-current'),'说明.txt'),image=await repo.putAsset(png,'image/png')
  let value:NoteContent={...content,attachments:[file],assetIds:[image.id],supplements:{assetIds:[image.id],attachmentIds:[file.id]}}
  const first=await repo.save({expectedHeads:[],content:value})
  assert.deepEqual((await new NoteRepository(join(repo.files.root,'..')).get(first.noteId)).current.supplements,first.current.supplements)
  const bundle=unzipSync((await createExport(repo,{noteId:first.noteId,revision:first.current.revision,format:'markdown-zip'})).bytes)
  const markdown=Buffer.from(bundle['正文与补充.md']!).toString();assert.match(markdown,/## 补充附件/);assert.doesNotMatch(markdown,/!\[/);assert.ok(bundle['assets/'+image.id]);assert.equal(Object.keys(bundle).length,3)
  const snapshot=JSON.parse((await createExport(repo,{noteId:first.noteId,revision:first.current.revision,format:'snapshot'})).bytes.toString());assert.deepEqual(snapshot.assets,{});assert.equal(snapshot.attachments.length,2)
  value={...value,body:`[文件](../attachments/${file.id}.bin)\n![图](../assets/${image.id})`};value.supplements=remainingSupplements(value)
  assert.deepEqual(value.supplements,empty)
  value={...value,body:'删除正文中的文件和图片引用'}
  assert.deepEqual(supplementMaterials(value),empty);assert.deepEqual(currentMaterials(value),empty)
  const last=await repo.save({noteId:first.noteId,expectedHeads:first.heads,content:value})
  const plan=await previewReference(repo,{noteId:last.noteId,revision:last.current.revision},new AbortController().signal)
  assert.equal(plan.plan.supplements.length,0)
  const exported=unzipSync((await createExport(repo,{noteId:last.noteId,revision:last.current.revision,format:'markdown-zip'})).bytes)
  assert.deepEqual(Object.keys(exported),['正文与补充.md']);assert.deepEqual((await repo.getRevision(first.noteId,first.current.revision)).supplements,first.current.supplements)
  assert.throws(()=>normalizeContent({...value,supplements:{assetIds:[],attachmentIds:['a'.repeat(64)]}}),{code:'note_asset'})
})
test('body download links to archived images retain the file without rendering it in exports',async t=>{
  const repo=await fixture(t),image=await repo.putAsset(png,'image/png')
  const note=await repo.save({expectedHeads:[],content:{...content,assetIds:[image.id],body:`[下载图片](../assets/${image.id})`}})
  const bundle=unzipSync((await createExport(repo,{noteId:note.noteId,revision:note.current.revision,format:'markdown-zip'})).bytes)
  assert.deepEqual(Buffer.from(bundle['assets/'+image.id]!),png)
  assert.match(Buffer.from(bundle['正文与补充.md']!).toString(),/\[下载图片\]\(<assets\//)
  const snapshot=JSON.parse((await createExport(repo,{noteId:note.noteId,revision:note.current.revision,format:'snapshot'})).bytes.toString())
  assert.deepEqual(snapshot.assets,{});assert.equal(snapshot.attachments.length,1)
})
test('moving a supplement into body is a single undo/redo action',()=>{
  const extra={assetIds:[],attachmentIds:['a'.repeat(64)]}
  let state=EditorState.create({doc:'before',extensions:[history(),supplementHistory,supplementField.init(()=>extra)]})
  const dispatch=(tr:import('@codemirror/state').Transaction)=>{state=tr.state}
  state=state.update({changes:{from:6,insert:'\n[file](x)'},effects:setSupplements.of(empty),annotations:isolateHistory.of('full')}).state
  assert.deepEqual(state.field(supplementField),empty)
  assert.ok(undo({state,dispatch}));assert.equal(state.doc.toString(),'before');assert.deepEqual(state.field(supplementField),extra)
  assert.ok(redo({state,dispatch}));assert.equal(state.doc.toString(),'before\n[file](x)');assert.deepEqual(state.field(supplementField),empty)
  const added='b'.repeat(64)
  state=state.update({effects:setSupplements.of({assetIds:[],attachmentIds:[added]}),annotations:[Transaction.remote.of(true),Transaction.addToHistory.of(false)]}).state
  assert.ok(undo({state,dispatch}));assert.deepEqual(new Set(state.field(supplementField).attachmentIds),new Set([...extra.attachmentIds,added]))
  assert.ok(redo({state,dispatch}));assert.deepEqual(state.field(supplementField).attachmentIds,[added])
})
test('only actual unambiguous message links count as body materials, including reference syntax',()=>{
  const files=[{id:'pdf',seq:1,kind:'file' as const,origin:'upload' as const,name:'报告.pdf',bytes:4,available:true}]
  const messages:CaptureMessage[]=[{id:'m',seq:1,role:'user',blocks:[{type:'text',text:'报告.pdf\n\n`[代码](报告.pdf)`\n\n[unused]: 报告.pdf'}]}]
  assert.equal(captureLinks(messages,files).size,0)
  messages[0]!.blocks=[{type:'text',text:'![预览][r]\n\n[r]: 报告.pdf'}]
  assert.equal(captureLinks(messages,files).get('pdf')?.[0]?.image,true)
  const body=capturedText((messages[0]!.blocks[0] as {text:string}).text,[{...files[0]!,bodyLinks:['报告.pdf'],saved:{id:'a'.repeat(64),name:'报告.pdf',bytes:4}}])
  assert.doesNotMatch(body,/!\[/);assert.match(body,/\.\.\/attachments\//)
  assert.equal(captureLinks(messages,[...files,{...files[0]!,id:'ambiguous'}]).size,0)
})
test('capture and direct export preserve inline image/file positions, leave cards supplemental, and do not duplicate body images',async t=>{
  const repo=await fixture(t),messages:CaptureMessage[]=[{id:'m',seq:1,turn:1,role:'user',blocks:[{type:'text',text:'读 [报告](报告.pdf)，以及文件卡。\n\n![照片][p]\n\n[p]: 照片.png'}, {type:'image',attachmentId:'photo',mediaType:'image/png'}]}]
  const materials=[{id:'photo',seq:1,messageId:'m',turn:1,kind:'image' as const,origin:'upload' as const,name:'照片.png',bytes:png.length,imageId:'photo',available:true},{id:'pdf',seq:1,messageId:'m',turn:1,kind:'file' as const,origin:'upload' as const,name:'报告.pdf',bytes:3,available:true},{id:'card',seq:1,messageId:'m',turn:1,kind:'file' as const,origin:'upload' as const,name:'补充.txt',bytes:5,available:true},{id:'same',seq:1,messageId:'m',turn:1,kind:'image' as const,origin:'delivery' as const,name:'相同照片.png',bytes:png.length,available:true}]
  const transcript:CaptureRead={messages,materials,complete:true,issues:[],imageReferences:new Map([['photo',{attachmentId:'photo' as never,mediaType:'image/png',bytes:png.length,width:1,height:1}]]),materialReferences:new Map(materials.map(m=>[m.id,{kind:'delivery' as const,path:m.name}]))}
  const cut={throughSeq:1,capturedAt:'2026-11-12T00:00:00Z',isSeeded:false},conversation:CaptureConversation={open:async()=>cut,read:async()=>transcript,attachment:async()=>({bytes:png,mediaType:'image/png'}),material:async(_s,m)=>m.kind==='image'?png:Buffer.from(m.id)}
  const result=await new NoteCaptureService(repo,conversation).capture({requestId:'one',sessionId:'s',scope:'session',messageIds:[],mode:'raw',autoMetadata:false,notebookId:null,cut,materialIds:materials.map(m=>m.id)})
  const note=result.note.current
  assert.match(note.body,/\[报告\]\(<\.\.\/attachments\//);assert.match(note.body,/!\[会话图片\]/);assert.doesNotMatch(note.body,/## 文件与图片|## 补充附件/)
  assert.equal(note.supplements?.attachmentIds.length,1);assert.deepEqual(note.supplements?.assetIds,[])
  assert.equal(note.attachments?.find(a=>a.id===note.supplements!.attachmentIds[0])?.name,'补充.txt')
  const source=await repo.getSource(note.sourceId!) as unknown as CaptureSource;assert.deepEqual(source.messages,messages)
  const exported=await createConversationExport(conversation as never,{sessionId:'s',throughSeq:1,messageIds:['m'],materialIds:materials.map(m=>m.id),format:'markdown'},new AbortController().signal)
  assert.equal(JSON.parse(exported.warnings).linked,0)
  const direct=unzipSync(exported.bytes)
  const md=Buffer.from(direct[Object.keys(direct).find(p=>p.endsWith('.md'))!]!).toString();assert.match(md,/## 补充附件/);assert.match(md,/\[报告\]\(<attachments\//);assert.doesNotMatch(md,/## 文件与图片|相同照片\.png/)
})
