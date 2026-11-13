import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm,writeFile,readFile,stat,utimes,rename,mkdir,link} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {randomUUID} from 'node:crypto'
import {setImmediate as nextTurn} from 'node:timers/promises'
import {NotebookApplication} from '../src/host/application.js'
import {windowRequest} from '../src/host/edit-coordinator.js'
import {NoteRepository} from '../src/notes/repository.js'
import {ulid} from '../src/domain/id.js'
import type {NoteContent} from '../src/contracts/notes.js'
import {NoteFiles,safePath} from '../src/notes/files.js'
import {FileInventory} from '../src/notes/inventory.js'
import {NotesSyncModule} from '../src/notes/sync.js'
import {createNoteRevision} from '../src/notes/revisions.js'
import {canonical,digest} from '../src/notes/validation.js'
import {serializeNoteMarkdown} from '../src/notes/markdown.js'

const content:NoteContent={title:'本机访问',body:'原正文',summary:'',tags:[],notebookId:null,status:'active',sourceId:null,assetIds:[]}

test('window status stays responsive during repository work while lease changes remain serialized',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'fatfish-data-path-')),app=new NotebookApplication({dir})
  t.after(async()=>{await app.close();await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100})})
  const windowId=randomUUID(),registered=await app.workspaceRequest('/workspace/register',{windowId,surface:'embedded'}),actor={windowId,serviceEpoch:registered.serviceEpoch}
  let release!:()=>void,entered!:()=>void
  const gate=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r)
  const busy=app.notes.repository.coordinate(async()=>{entered();await gate})
  await ready
  let stateDone=false,acquired=false
  const state=windowRequest.run(actor,()=>app.workspaceRequest('/workspace/state',{})).then(v=>{stateDone=true;return v})
  const acquiring=windowRequest.run(actor,()=>app.workspaceRequest('/workspace/action',{action:'acquire',noteId:'00000000000000000000000001'})).then(v=>{acquired=true;return v})
  try{
    await nextTurn();await nextTurn()
    assert.equal(stateDone,true,'A status heartbeat must not wait behind repository disk work')
    assert.equal(acquired,false,'Ownership transitions must still wait for the protected writer')
    assert.equal((await state).owned,null)
  }finally{release();await busy;await state;await acquiring}
  await assert.rejects(windowRequest.run({...actor,serviceEpoch:'expired'},()=>app.workspaceRequest('/workspace/state',{})),{code:'window_expired'})
})

test('inventory checks targets without notifications, audits missed changes and recovers from watcher failure',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'fatfish-inventory-')),files=new NoteFiles(dir)
  let now=0,audits=0,change!:(path:string|null)=>void,failed!:()=>void
  const inventory=new FileInventory(dir,async()=>{audits++;return files.scan()},safePath,{now:()=>now,watch:(_root,c,e)=>{change=c;failed=e;return {close(){}}}})
  t.after(async()=>{inventory.close();await rm(dir,{recursive:true,force:true})})
  await mkdir(join(dir,'documents'));await writeFile(join(dir,'documents/one.md'),'one')
  const first=await inventory.snapshot(),info=await stat(join(dir,'documents/one.md'))
  await writeFile(join(dir,'documents/one.md'),'two');await utimes(join(dir,'documents/one.md'),info.atime,info.mtime)
  assert.notEqual((await inventory.snapshot(['documents/one.md'])).stamps.get('documents/one.md'),first.stamps.get('documents/one.md'))
  await writeFile(join(dir,'documents/two.md'),'new');now=30_001
  assert.ok((await inventory.snapshot()).paths.includes('documents/two.md'));assert.equal(audits,2)
  change(null);assert.ok((await inventory.snapshot()).paths.includes('documents/one.md'));assert.equal(audits,3)
  failed();await inventory.snapshot();await inventory.snapshot();assert.equal(audits,5)
})

test('inventory retries notification loss during checks, rejects links and rebuilds after root replacement',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'fatfish-inventory-race-')),root=join(dir,'notes'),files=new NoteFiles(root)
  await mkdir(root);await mkdir(join(root,'documents'));await writeFile(join(root,'documents/one.md'),'one')
  let change!:(path:string|null)=>void,interrupt=false
  const inventory=new FileInventory(root,()=>files.scan(),async path=>{await safePath(path);if(interrupt){interrupt=false;change(null)}},{watch:(_root,c)=>{change=c;return {close(){}}}})
  t.after(async()=>{inventory.close();await rm(dir,{recursive:true,force:true})})
  await inventory.snapshot();interrupt=true
  assert.ok((await inventory.snapshot(['documents/one.md'])).paths.includes('documents/one.md'))
  await link(join(root,'documents/one.md'),join(root,'documents/link.md'))
  await assert.rejects(inventory.snapshot(['documents/one.md']),{code:'note_path'})
  await rm(join(root,'documents/link.md'));assert.ok((await inventory.snapshot()).paths.includes('documents/one.md'))
  await rename(root,join(dir,'old'));await mkdir(root);await writeFile(join(root,'manifest.json'),'new root')
  assert.deepEqual((await inventory.snapshot()).paths,['manifest.json'])
})

test('warm local reads and a draft file stay local without walking the entire library again',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'fatfish-local-index-')),repo=new NoteRepository(dir)
  t.after(async()=>{repo.files.inventory.close();await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100})})
  const note=await repo.save({expectedHeads:[],content})
  for(let i=0;i<8;i++)await repo.save({expectedHeads:[],content:{...content,title:'其他 '+i}})
  await repo.list();await repo.get(note.noteId)
  const scan=repo.files.scan.bind(repo.files);let scans=0;repo.files.scan=async()=>{scans++;return scan()}
  const editId=ulid();await repo.draft({action:'save',editId,sequence:0,request:{noteId:note.noteId,expectedHeads:note.heads,content}})
  await repo.list();await repo.listNotebooks();await repo.get(note.noteId)
  const result=await repo.putDraftFile(note.noteId,editId,Buffer.from('小文件'),'小文件.txt')
  assert.ok('attachment'in result);assert.equal(scans,0,'Warm local actions must not trigger a full inventory walk')
  assert.equal((await repo.get(note.noteId)).current.attachments?.length??0,0,'Receiving a draft file must not publish a formal revision')
  await repo.draft({action:'discard',editId,noteId:note.noteId})
})

test('deferred deletion audits missed external revisions before removing a shared resource',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'fatfish-cleanup-audit-')),repo=new NoteRepository(dir),sync=new NotesSyncModule(repo,()=>{})
  t.after(async()=>{sync.close();repo.close();await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100})})
  const attachment=await repo.putAttachment(Buffer.from('shared original'),'shared.txt')
  const note=await repo.save({expectedHeads:[],content:{...content,attachments:[attachment]}}),objects=await repo.exportObjects()
  await mkdir(join(repo.files.root,'deleted'),{recursive:true})
  repo.files.inventory.close()
  Object.defineProperty(repo.files,'inventory',{value:new FileInventory(repo.files.root,()=>repo.files.scan(),safePath,{watch:()=>({close(){}})})})
  await repo.list()
  const extra=Buffer.from('pending'),extraFile={id:digest(extra),name:'pending.txt',bytes:extra.length}
  const {revision:_revision,...data}=note.current,incoming={...objects,revisions:[...objects.revisions,createNoteRevision({...data,parents:note.heads,attachments:[attachment,extraFile]})]}
  let enter!:()=>void,release!:()=>void;const ready=new Promise<void>(r=>enter=r),gate=new Promise<void>(r=>release=r)
  const pending=sync.install({objects:incoming,files:new Map([[`notes/attachments/${extraFile.id}.bin`,{length:extra.length,load:async()=>{enter();await gate;return extra}}]])},incoming)
  await ready
  try{
    const trashed=await repo.trash(note.noteId,note.heads);await repo.batch([{noteId:note.noteId,expectedHeads:trashed.heads}],'purge')
    await repo.list()
    // A second writer crashed after publishing a valid immutable revision, before the manifest.
    // No notification is delivered, but cleanup must preserve its shared dependency.
    const row=createNoteRevision({...data,noteId:ulid(),parents:[]})
    await mkdir(join(repo.files.root,'revisions',row.noteId));await writeFile(join(repo.files.root,'revisions',row.noteId,row.revision+'.json'),canonical(row))
    await writeFile(join(repo.files.root,'documents',row.noteId+'.md'),serializeNoteMarkdown(row))
    release();await pending
    assert.deepEqual(await repo.getAttachment(attachment.id),Buffer.from('shared original'))
    assert.equal((await repo.get(row.noteId)).current.title,content.title)
  }finally{release();await pending.catch(()=>{})}
})

test('notebook mutations and explicit recovery audit changes even without notifications',async t=>{
  for(const action of ['save','delete','recover']){
    const dir=await mkdtemp(join(tmpdir(),'fatfish-book-audit-')),repo=new NoteRepository(dir)
    t.after(async()=>{repo.close();await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100})})
    const book=await repo.saveNotebook({title:'first',expectedHeads:[]})
    repo.files.inventory.close();Object.defineProperty(repo.files,'inventory',{value:new FileInventory(repo.files.root,()=>repo.files.scan(),safePath,{watch:()=>({close(){}})})})
    await repo.list();const path=repo.files.path(`notebooks/${book.notebookId}/${book.current.revision}.json`),bytes=await readFile(path),info=await stat(path)
    await writeFile(path,bytes.toString().replace('first','other'));await utimes(path,info.atime,info.mtime)
    if(action==='recover')assert.ok((await repo.recover()).some(issue=>issue.path.startsWith('notebooks/')))
    else await assert.rejects(action==='save'?repo.saveNotebook({notebookId:book.notebookId,title:'third',expectedHeads:book.heads}):repo.deleteNotebook(book.notebookId,book.heads),{code:'note_corrupt'})
  }
})

test('changed remote notes recheck their local ancestors when notifications are lost',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'fatfish-merge-audit-')),repo=new NoteRepository(dir),sync=new NotesSyncModule(repo,()=>{})
  t.after(async()=>{sync.close();repo.close();await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100})})
  const note=await repo.save({expectedHeads:[],content}),objects=await repo.exportObjects()
  repo.files.inventory.close();Object.defineProperty(repo.files,'inventory',{value:new FileInventory(repo.files.root,()=>repo.files.scan(),safePath,{watch:()=>({close(){}})})})
  await repo.list();const path=repo.files.path(`revisions/${note.noteId}/${note.current.revision}.json`),bytes=await readFile(path),info=await stat(path)
  await writeFile(path,bytes.toString().replace('原正文','坏正文'));await utimes(path,info.atime,info.mtime)
  const {revision:_revision,...data}=note.current,incoming={...objects,revisions:[...objects.revisions,createNoteRevision({...data,parents:note.heads,body:'远端新版本'})]}
  await assert.rejects(sync.install({objects:incoming,files:new Map()},incoming),{code:'note_corrupt'})
  assert.equal((await readFile(path)).toString(),bytes.toString().replace('原正文','坏正文'),'Damaged original bytes must remain available for recovery')
})
