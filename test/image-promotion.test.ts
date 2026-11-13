import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {NoteRepository} from '../src/notes/repository.js'
import {NoteTransfers} from '../src/host/note-transfers.js'
import {DraftFiles} from '../src/notes/drafts.js'
import {noteContent} from '../src/client/notes-controller.js'
import {ulid} from '../src/domain/id.js'
import {digest} from '../src/notes/validation.js'
import {EditCoordinator,windowRequest} from '../src/host/edit-coordinator.js'
import type {NoteContent} from '../src/contracts/notes.js'

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')
const content:NoteContent={title:'图片切换',body:'',summary:'',tags:[],notebookId:null,status:'active',sourceId:null,assetIds:[]}
async function fixture(t:{after(fn:()=>Promise<void>):void}){
 const dir=await mkdtemp(join(tmpdir(),'fatfish-promotion-')),repo=new NoteRepository(dir),transfers=new NoteTransfers(dir,repo)
 t.after(async()=>{await transfers.close();repo.close();await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100})})
 const note=await repo.save({expectedHeads:[],content}),editId=ulid(),request={noteId:note.noteId,expectedHeads:note.heads,content:noteContent(note)}
 await repo.draft({action:'save',editId,sequence:0,request})
 const result=await transfers.request({action:'single',noteId:note.noteId,editId,name:'原图.png',size:png.length,base64:png.toString('base64')})
 assert.ok('attachment'in result&&result.attachment);const file=result.attachment
 request.content={...request.content,body:`[原图](../attachments/${file.id}.bin)`,attachments:[file]}
 await repo.draft({action:'save',editId,sequence:1,request})
 return {dir,repo,transfers,note,editId,request,file,input:{action:'promote-image',noteId:note.noteId,editId,attachmentId:file.id}}
}
test('a draft attachment promotes from local original, survives restart and publishes only on finish',async t=>{
 const {dir,repo,transfers,note,editId,request,file,input}=await fixture(t)
 const result=await transfers.request(input);assert.ok('asset'in result&&result.asset)
 const asset=result.asset;assert.equal(asset.id,digest(png)+'.png');assert.deepEqual(await repo.getAsset(asset.id),png)
 assert.equal((await repo.get(note.noteId)).current.body,'')
 assert.ok((await new DraftFiles(join(dir,'local-drafts')).read(editId))?.files.includes('assets/'+asset.id))
 const repeated=await transfers.request(input);assert.deepEqual(repeated,result)
 const restarted=new NoteRepository(dir),again=new NoteTransfers(dir,restarted);t.after(async()=>{await again.close();restarted.close()})
 assert.deepEqual(await again.request(input),result)
 const finished=await repo.draft({action:'finish',editId,sequence:2,request:{...request,content:{...request.content,body:`![原图](../assets/${asset.id})`,assetIds:[asset.id]}}})
 assert.ok(finished.note);assert.deepEqual(await repo.getAttachment(file.id),png);assert.equal((await repo.history(note.noteId)).items.length,2)
 await assert.rejects(transfers.request(input),{code:'note_draft_invalid'})
})

test('a new unsaved note can promote an attachment and recover it without any formal revision',async t=>{
 const {dir,repo,transfers,file}=await fixture(t),noteId=ulid(),editId=ulid()
 const request={noteId,expectedHeads:[],content:{...content,body:`[原图](../attachments/${file.id}.bin)`,attachments:[file]}}
 await repo.draft({action:'save',editId,sequence:0,request})
 const result=await transfers.request({action:'promote-image',noteId,editId,attachmentId:file.id});assert.ok('asset'in result&&result.asset)
 await assert.rejects(repo.get(noteId),{code:'note_not_found'})
 const restarted=new NoteRepository(dir);t.after(async()=>{restarted.close()})
 const recovered=await new DraftFiles(join(dir,'local-drafts')).read(editId);assert.equal(recovered?.request?.noteId,noteId)
 assert.deepEqual(await restarted.getAsset(result.asset.id),png)
 const finished=await repo.draft({action:'finish',editId,sequence:1,request:{...request,content:{...request.content,body:`![原图](../assets/${result.asset.id})`,assetIds:[result.asset.id]}}})
 assert.equal(finished.note?.current.body,`![原图](../assets/${result.asset.id})`)
})

test('promotion rejects foreign resources, non-images and cancelled or invalid editing identities',async t=>{
 const {repo,transfers,note,editId,request,input}=await fixture(t)
 const other=await repo.putAttachment(Buffer.from('not an image'),'看似图片.png',undefined,note.noteId)
 await assert.rejects(transfers.request({...input,attachmentId:other.id}),{code:'note_asset'})
 await repo.draft({action:'save',editId,sequence:2,request:{...request,content:{...request.content,attachments:[...request.content.attachments!,other]}}})
 await assert.rejects(transfers.request({...input,attachmentId:other.id}),{code:'image_type'})
 await assert.rejects(transfers.request({...input,editId:ulid()}),{code:'note_draft_invalid'})
 await assert.rejects(transfers.request({...input,noteId:ulid()}),{code:'note_draft_invalid'})
 let release!:()=>void;const held=repo.coordinate(()=>new Promise<void>(r=>release=r));await new Promise(r=>setImmediate(r))
 const abort=new AbortController(),pending=transfers.request(input,abort.signal);abort.abort();release();await held;await assert.rejects(pending,{name:'AbortError'})
 const coordinator=new EditCoordinator(()=>1,()=>repo.generation),windowId='00000000-0000-4000-8000-000000000001',reg=coordinator.register(windowId,'embedded'),actor={windowId,serviceEpoch:reg.serviceEpoch,leaseId:''}
 actor.leaseId=coordinator.acquire(actor,note.noteId).owned!.leaseId;repo.editGuard=(ids,required)=>coordinator.check(ids,windowRequest.getStore(),required)
 const relinquish=repo.coordinate(()=>coordinator.release(actor,note.noteId)),lost=windowRequest.run(actor,()=>transfers.request(input));await relinquish;await assert.rejects(lost,{code:'note_edit_lost'})
 repo.editGuard=()=>{};const discard=repo.draft({action:'discard',editId,noteId:note.noteId}),late=transfers.request(input);await discard;await assert.rejects(late,{code:'note_draft_invalid'})
})

test('promotion refuses trashed notes and a switched library, preserving the draft original',async t=>{
 const {dir,repo,transfers,note,file,input}=await fixture(t)
 await repo.trash(note.noteId,note.heads)
 await assert.rejects(transfers.request(input),{code:'note_trashed'})
 assert.deepEqual(await repo.getAttachment(file.id),png)
 const change=repo.coordinate(()=>repo.useDirectory(join(dir,'other'))),pending=transfers.request(input);await change
 await assert.rejects(pending,{code:'transfer_expired'})
})
test('promotion validates stored content, pixel limits and preserves valid shared resources on discard',async t=>{
 const {repo,transfers,note,editId,request,file,input}=await fixture(t)
 const shared=await repo.save({expectedHeads:[],content:{...content,body:`[共享](../attachments/${file.id}.bin)`,attachments:[file]}})
 await writeFile(repo.files.path(`attachments/${file.id}.bin`),Buffer.alloc(png.length))
 await assert.rejects(transfers.request(input),(error:unknown)=>!!error&&typeof error==='object'&&'code'in error&&['note_hash','note_corrupt'].includes(String(error.code)))
 await writeFile(repo.files.path(`attachments/${file.id}.bin`),png)
 const huge=Buffer.from(png);huge.writeUInt32BE(40000,16);huge.writeUInt32BE(40000,20)
 const large=await repo.putAttachment(huge,'超大像素.png',undefined,note.noteId)
 await repo.draft({action:'save',editId,sequence:2,request:{...request,content:{...request.content,attachments:[file,large]}}})
 await assert.rejects(transfers.request({...input,attachmentId:large.id}),{code:'image_limit'})
 const result=await transfers.request(input);assert.ok('asset'in result&&result.asset)
 await repo.draft({action:'discard',editId,noteId:note.noteId})
 assert.equal((await repo.get(shared.noteId)).current.attachments![0]!.id,file.id)
 assert.deepEqual(await repo.getAttachment(file.id),png);await assert.rejects(repo.getAsset(result.asset.id))
})
