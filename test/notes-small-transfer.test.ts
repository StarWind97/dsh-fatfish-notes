import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm,rmdir,readdir,readFile,mkdir,writeFile,link,symlink} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {NoteRepository} from '../src/notes/repository.js'
import {DraftFiles} from '../src/notes/drafts.js'
import {NoteTransfers} from '../src/host/note-transfers.js'
import {NoteEnrichment} from '../src/notes/enrichment.js'
import {EditCoordinator,windowRequest} from '../src/host/edit-coordinator.js'
import {transferEntry} from '../src/client/library-import.js'
import {noteContent} from '../src/client/notes-controller.js'
import {ulid} from '../src/domain/id.js'
import {digest} from '../src/notes/validation.js'
import type {Api} from '../src/client/api.js'
import type {NoteContent} from '../src/contracts/notes.js'

const content:NoteContent={title:'小文件',body:'原正文',summary:'',tags:[],notebookId:null,status:'active',sourceId:null,assetIds:[]}
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')
async function fixture(t:{after(fn:()=>Promise<void>):void}){
 const dir=await mkdtemp(join(tmpdir(),'fatfish-small-'));t.after(()=>rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100}))
 const repo=new NoteRepository(dir),note=await repo.save({expectedHeads:[],content}),editId=ulid(),request={noteId:note.noteId,expectedHeads:note.heads,content:noteContent(note)}
 await repo.draft({action:'save',editId,sequence:0,request})
 const transfers=new NoteTransfers(dir,repo);t.after(()=>transfers.close())
 const input=(bytes:Buffer=Buffer.from('new file'))=>({action:'single',noteId:note.noteId,editId,name:'材料.txt',size:bytes.length,base64:bytes.toString('base64')})
 return {dir,repo,note,editId,request,transfers,input}
}
test('warm editor small upload uses one request without a full scan; discard cleans only unreferenced files',async t=>{
 const {repo,note,editId,transfers,dir}=await fixture(t),bytes=Buffer.from('single request bytes'),actions:string[]=[]
 await repo.get(note.noteId);let scans=0;const scan=repo.files.scan.bind(repo.files);repo.files.scan=async()=>{scans++;return scan()}
 const api:Api=async(path,body)=>{assert.equal(path,'/notes/transfer');actions.push((body as {action:string}).action);return await transfers.request(body) as never}
 const options={noteId:note.noteId,draft:false,editId}
 const result=await transferEntry({path:'材料.txt',bytes:bytes.length,read:async()=>bytes},options,api)
 assert.deepEqual(actions,['single']);assert.equal(scans,0);assert.equal(result.attachment?.id,digest(bytes))
 const journal=await new DraftFiles(join(dir,'local-drafts')).read(editId);assert.ok(journal?.files.includes('attachments/'+digest(bytes)+'.bin'))
 assert.deepEqual((await repo.get(note.noteId)).heads,note.heads)
 const shared=await repo.putAttachment(Buffer.from('shared'),'shared.txt',undefined,note.noteId)
 await repo.save({expectedHeads:[],content:{...content,attachments:[shared]}})
 await repo.draft({action:'discard',editId,noteId:note.noteId})
 await assert.rejects(repo.getAttachment(digest(bytes)));assert.equal((await repo.getAttachment(shared.id)).toString(),'shared')
})
test('single uploads reject bad size, encoding, image, note and draft before storing',async t=>{
 const {repo,transfers,input}=await fixture(t),initial=await repo.files.scan()
 for(const bad of [{...input(),size:1024*1024+1},{...input(),size:0},{...input(),size:1},{...input(),base64:'YWJjZA'},{...input(),mediaType:'image/svg+xml'},{...input(),mediaType:'image/png'},{...input(),editId:ulid()},{...input(),noteId:ulid()}])await assert.rejects(transfers.request(bad))
 assert.equal((await repo.files.scan()).fingerprint,initial.fingerprint)
})
test('queued single upload rejects cancellation, closed draft, lost lease and switched directory',async t=>{
 const {repo,note,editId,transfers,input,dir}=await fixture(t)
 let release!:()=>void;const gate=new Promise<void>(r=>release=r),held=repo.coordinate(()=>gate),abort=new AbortController()
 const pending=transfers.request(input(),abort.signal);abort.abort();release();await held;await assert.rejects(pending,{name:'AbortError'})
 const discard=repo.draft({action:'discard',editId,noteId:note.noteId}),late=transfers.request(input());await discard;await assert.rejects(late,{code:'note_draft_invalid'})
 const next=ulid();await repo.draft({action:'save',editId:next,sequence:0,request:{noteId:note.noteId,expectedHeads:note.heads,content:noteContent(note)}})
 const coordinator=new EditCoordinator(()=>1,()=>repo.generation),windowId='00000000-0000-4000-8000-000000000001',registration=coordinator.register(windowId,'embedded'),actor={windowId,serviceEpoch:registration.serviceEpoch,leaseId:''}
 actor.leaseId=coordinator.acquire(actor,note.noteId).owned!.leaseId;repo.editGuard=(ids,required)=>coordinator.check(ids,windowRequest.getStore(),required)
 const relinquish=repo.coordinate(()=>coordinator.release(actor,note.noteId)),lost=windowRequest.run(actor,()=>transfers.request({...input(),editId:next}));await relinquish;await assert.rejects(lost,{code:'note_edit_lost'})
 repo.editGuard=()=>{};const change=repo.coordinate(()=>repo.useDirectory(join(dir,'other'))),switched=transfers.request({...input(),editId:next});await change;await assert.rejects(switched,{code:'transfer_expired'})
 assert.deepEqual(await readdir(join(dir,'notes/attachments')).catch(()=>[]),[])
})
test('single image and attachment complete once and survive restart without premature formal revision',async t=>{
 const {repo,note,editId,request,transfers,input,dir}=await fixture(t)
 const result=await transfers.request({...input(png),mediaType:'image/png'});assert.ok('asset'in result&&result.asset)
 const asset='asset'in result?result.asset!:null;assert.ok(asset)
 assert.deepEqual((await repo.get(note.noteId)).heads,note.heads)
 const finished=await repo.draft({action:'finish',editId,sequence:1,request:{...request,content:{...request.content,body:`![图](../assets/${asset.id})`,assetIds:[asset.id]}}})
 assert.ok(finished.note);await assert.rejects(transfers.request(input()),{code:'note_draft_invalid'})
 const restarted=new NoteRepository(dir);assert.deepEqual(await restarted.getAsset(asset.id),png);assert.equal((await restarted.history(note.noteId)).items.length,2)
})
test('small threshold is exactly one MiB; malformed reads stop before any request',async()=>{
 const actions:string[]=[],api:Api=async(_path,body)=>{actions.push((body as {action:string}).action);return {ok:true,uploadId:'u',attachment:{id:'a'.repeat(64),name:'x',bytes:1024*1024}} as never}
 const bytes=Buffer.alloc(1024*1024),options={noteId:ulid(),draft:true,editId:ulid()}
 await transferEntry({path:'x',bytes:bytes.length,read:async()=>bytes},options,api);assert.deepEqual(actions,['single'])
 actions.length=0;await assert.rejects(transferEntry({path:'x',bytes:10,read:async()=>bytes},options,api));assert.deepEqual(actions,[])
})
test('larger editor files and library imports retain chunking and cancel cleanup',async()=>{
 const actions:string[]=[],api:Api=async(_path,body)=>{const action=(body as {action:string}).action;actions.push(action);return {ok:true,uploadId:'u'} as never},options={noteId:ulid(),draft:true,editId:ulid()}
 await transferEntry({path:'x',bytes:1024*1024+1,read:async()=>Buffer.alloc(1024*1024+1)},options,api);assert.deepEqual(actions,['begin','chunk','chunk','finish'])
 actions.length=0;await transferEntry({path:'x',bytes:1,read:async()=>Buffer.alloc(1)},{noteId:options.noteId,draft:true},api);assert.deepEqual(actions,['begin','chunk','finish'])
 actions.length=0;const failed:Api=async(path,body,signal)=>{const result=await api(path,body,signal);if((body as {action:string}).action==='chunk')throw Error('interrupted');return result}
 await assert.rejects(transferEntry({path:'x',bytes:1024*1024+1,read:async()=>Buffer.alloc(1024*1024+1)},options,failed));assert.deepEqual(actions,['begin','chunk','cancel'])
})
test('job discovery touches only its own directory and leaves unrelated files alone',async t=>{
 const {dir,repo}=await fixture(t),jobs=join(dir,'notes/jobs');await mkdir(jobs,{recursive:true});await writeFile(join(jobs,'a'.repeat(64)+'.json'),'journal');await writeFile(join(jobs,'other.txt'),'leave alone')
 const enrichment=new NoteEnrichment(repo,{dispatch:async()=>{},inspect:async()=>({active:[],ended:[]})})
 repo.files.scan=async()=>{throw Error('Unexpected whole-library scan')}
 assert.deepEqual(await enrichment.list(),['a'.repeat(64)]);assert.equal(await readFile(join(jobs,'other.txt'),'utf8'),'leave alone')
})
test('new-note draft accepts an exact one-MiB file without creating a formal note',async t=>{
 const {repo,transfers,dir}=await fixture(t),noteId=ulid(),editId=ulid(),bytes=Buffer.alloc(1024*1024,7)
 await repo.draft({action:'save',editId,sequence:0,request:{noteId,expectedHeads:[],content}})
 const result=await transfers.request({action:'single',noteId,editId,name:'limit.bin',size:bytes.length,base64:bytes.toString('base64')})
 assert.ok('attachment'in result&&result.attachment);assert.ok(!(await repo.list()).items.some(n=>n.noteId===noteId))
 const row=await new DraftFiles(join(dir,'local-drafts')).read(editId);assert.equal(row?.files.length,1)
 await repo.draft({action:'discard',editId,noteId});await assert.rejects(repo.getAttachment(digest(bytes)))
})
test('failed publication leaves a durable pin that discard can safely clean',async t=>{
 const {repo,transfers,input,note,editId,dir}=await fixture(t),write=repo.files.write.bind(repo.files)
 repo.files.write=async(path,...rest)=>{if(path.startsWith('attachments/'))throw Error('disk failure');return write(path,...rest)}
 await assert.rejects(transfers.request(input()),/disk failure/)
 const row=await new DraftFiles(join(dir,'local-drafts')).read(editId);assert.equal(row?.files.length,1)
 repo.files.write=write;await repo.draft({action:'discard',editId,noteId:note.noteId});assert.deepEqual((await repo.get(note.noteId)).heads,note.heads)
})
test('job listing rejects linked files and directories without following them',async t=>{
 const {dir,repo}=await fixture(t),jobs=join(dir,'notes/jobs'),outside=join(dir,'outside');await mkdir(jobs);await mkdir(outside)
 await writeFile(join(outside,'source.json'),'untouched');const target=join(jobs,'b'.repeat(64)+'.json')
 await link(join(outside,'source.json'),target);await assert.rejects(repo.files.listJobs(),{code:'note_path'});await rm(target)
 await rmdir(jobs);await symlink(outside,jobs,'junction');await assert.rejects(repo.files.listJobs(),{code:'note_path'})
 assert.equal(await readFile(join(outside,'source.json'),'utf8'),'untouched');await rm(jobs)
})
