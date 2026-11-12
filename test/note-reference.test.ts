import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {bodyMaterials} from '../src/notes/reference-materials.js'
import {previewReference,referenceNote} from '../src/host/note-reference.js'
import {NoteRepository} from '../src/notes/repository.js'
import {noteContent} from '../src/client/notes-controller.js'
import {prepareReferences,ReferenceReceipts,referenceInstruction,type ReferenceChoice} from '../src/client/note-reference.js'
import type {Api} from '../src/client/api.js'
import type {AttachmentStore} from '@deepseek-ai/dsh-attachment'
import type {NoteContent} from '../src/contracts/notes.js'

const image='a'.repeat(64)+'.png',file='b'.repeat(64),unused='c'.repeat(64)
test('reference resources follow actual body uses, including reference links, tables and end-of-body images',()=>{
  const body=`![图][photo]\n\n[file][]\n\n[file]: ../attachments/${file}.bin\n[photo]: ../assets/${image}\n[unused]: ../attachments/${unused}.bin\n\n\`[example](../attachments/${unused}.bin)\`\n\n\`\`\`md\n![example](../assets/${unused}.png)\n\`\`\`\n\n| 正文 |\n|---|\n| [文件](../attachments/${file}.bin) |\n\n![末尾仍是正文](../assets/${image})`
  assert.deepEqual(bodyMaterials(body),{assetIds:[image],attachmentIds:[file]})
})

test('reference copies compulsory body files and selected supplements without changing the original note',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'fatfish-reference-'));t.after(()=>rm(dir,{recursive:true,force:true}))
  const repo=new NoteRepository(dir),a=await repo.putAttachment(Buffer.from('body'),'正文.csv'),b=await repo.putAttachment(Buffer.from('extra'),'补充.pdf')
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'),pic=await repo.putAsset(png,'image/png')
  const content:NoteContent={title:'引用资料',body:`[正文文件][data]\n\n[data]: ../attachments/${a.id}.bin`,summary:'摘要',tags:[],notebookId:null,status:'active',sourceId:null,assetIds:[pic.id],attachments:[a,b]}
  const note=await repo.save({expectedHeads:[],content}),plan=(await previewReference(repo,{noteId:note.noteId},new AbortController().signal)).plan
  assert.deepEqual(plan.required,{assetIds:[],attachmentIds:[a.id]});assert.deepEqual(plan.supplements.map(m=>m.id),['image:'+pic.id,'file:'+b.id])
  const saved:Array<{name:string;bytes:Buffer}>=[]
  const store={saveFileStream:async({name,data}:{name:string;data:AsyncIterable<Uint8Array>})=>{const chunks:Buffer[]=[];for await(const c of data)chunks.push(Buffer.from(c));saved.push({name,bytes:Buffer.concat(chunks)});return {attachmentId:String(saved.length)}},fileHostPath:(r:{attachmentId:string})=>'D:/host/'+r.attachmentId} as unknown as AttachmentStore
  const conversation={open:async()=>({throughSeq:1,capturedAt:'2026-11-12T00:00:00Z',isSeeded:false})},request={sessionId:'s',noteId:note.noteId,revision:note.current.revision,assetIds:[pic.id],attachmentIds:[]}
  const result=await referenceNote(repo,store,conversation,request,new AbortController().signal)
  assert.equal(result.files,3);assert.equal(saved.some(r=>r.name===b.name),false);assert.equal(saved.find(r=>r.name===a.name)?.bytes.toString(),'body')
  const md=saved.at(-1)!.bytes.toString();assert.match(md,/\[data\]: <D:\/host\/2>/);assert.match(md,/!\[补充图片 1\]\(<D:\/host\/1>\)/);assert.doesNotMatch(md,/未包含/)
  assert.equal((await repo.get(note.noteId)).current.revision,note.current.revision)
  await assert.rejects(referenceNote(repo,store,conversation,{...request,attachmentIds:[unused]},new AbortController().signal),{code:'note_asset'})
  await repo.save({noteId:note.noteId,expectedHeads:note.heads,content:{...noteContent(note),title:'已变更'}})
  await assert.rejects(referenceNote(repo,store,conversation,request,new AbortController().signal),{code:'reference_changed'})
})

test('duplicate detection only uses this repository/session unsent draft, not previous messages',()=>{
  const values=new Map<string,string>(),storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v)}}
  const r={noteId:'a',revision:'v1',path:'D:/host/1'},receipts=new ReferenceReceipts(storage,'repo/session')
  receipts.remember([r],'question');assert.equal(receipts.has(r,'question'),false)
  const input=referenceInstruction([{...r,title:'A'}]);assert.equal(receipts.has(r,input),true)
  assert.equal(new ReferenceReceipts(storage,'repo/session').has(r,input),true)
  assert.equal(new ReferenceReceipts(storage,'other/session').has(r,input),false)
  assert.equal(new ReferenceReceipts(storage,'repo/other').has(r,input),false)
  assert.equal(receipts.has({...r,revision:'v2'},input),false)
  assert.equal(receipts.has(r,''),false,'sent draft is cleared, the same note may be referenced again')
  assert.equal(receipts.has(r,'manually removed reference'),false)
  receipts.remember([{noteId:'b',revision:'v1',path:'D:/host/2'}],input)
  assert.equal(receipts.has(r,input+' D:/host/2'),true,'later additions retain earlier unsent references')
})

function batchFixture(options:{failAt?:number;change?:boolean;abort?:AbortController}={}){
  const choices:ReferenceChoice[]=['A','B','C'].map(noteId=>({plan:{noteId,revision:'v1',title:noteId,required:{assetIds:[image],attachmentIds:[file]},supplements:[{id:'file:'+unused,name:'extra',image:false,bytes:1}]},selected:[]}))
  const calls:string[]=[];let copied=0,active=0,max=0
  const api=(async(path:string,body:any,signal?:AbortSignal)=>{
    signal?.throwIfAborted();calls.push(path+':'+(body.action??body.noteId))
    if(path==='/notes/import-task')return {ok:true,taskId:'t'}
    if(path==='/notes/reference-preview')return {ok:true,plan:{...choices.find(c=>c.plan.noteId===body.noteId)!.plan,revision:options.change?'v2':'v1'}}
    active++;max=Math.max(max,active);copied++;await new Promise(r=>setTimeout(r,1));active--
    assert.deepEqual(body.assetIds,[image]);assert.deepEqual(body.attachmentIds,[file])
    if(copied===options.failAt)throw Error('file unavailable')
    if(options.abort)options.abort.abort()
    return {ok:true,path:'D:/host/'+body.noteId,instruction:'unused',files:3}
  }) as Api
  return {choices,api,calls,count:()=>copied,max:()=>max}
}
test('batch references prepare serially, confirm versions and compose one ordered insertion',async()=>{
  const f=batchFixture(),progress:string[]=[]
  const r=await prepareReferences(f.api,'session',f.choices,new AbortController().signal,(_,title)=>progress.push(title))
  assert.deepEqual(progress,['A','B','C']);assert.equal(f.max(),1);assert.deepEqual(r.notes.map(n=>n.noteId),['A','B','C'])
  assert.equal((r.instruction.match(/请先完整阅读/g)??[]).length,1);assert.ok(r.instruction.indexOf('D:/host/A')<r.instruction.indexOf('D:/host/B'));assert.equal(f.calls.at(-1),'/notes/import-task:end')
})
test('failed, cancelled or changed batch never returns partial insertion text and releases the task',async()=>{
  const failed=batchFixture({failAt:2});await assert.rejects(prepareReferences(failed.api,'s',failed.choices,new AbortController().signal,()=>{}));assert.equal(failed.count(),2);assert.equal(failed.calls.at(-1),'/notes/import-task:end')
  const abort=new AbortController(),cancelled=batchFixture({abort});await assert.rejects(prepareReferences(cancelled.api,'s',cancelled.choices,abort.signal,()=>{}),{name:'AbortError'});assert.equal(cancelled.count(),1);assert.equal(cancelled.calls.at(-1),'/notes/import-task:end')
  const changed=batchFixture({change:true});await assert.rejects(prepareReferences(changed.api,'s',changed.choices,new AbortController().signal,()=>{}),{code:'reference_changed'});assert.equal(changed.calls.at(-1),'/notes/import-task:end')
})
