import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm,readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {NoteRepository} from '../src/notes/repository.js'
import {handbookBundle,handbookId,initialHandbook,openHandbook,pristineNotes,existingHandbook} from '../src/notes/handbook.js'
import {revisionContent} from '../src/notes/conflicts.js'
import {DEFAULT_NOTEBOOK_ID} from '../src/notes/notebooks.js'
import {createApplication} from '../src/host/application.js'
import {PrivateWorkspaceSync} from '../src/private-workspace/sync.js'
import {runGit,type GitRunner} from '../src/git/backend.js'
import type {GitHubGateway,GitHubRepository} from '../src/onboarding/types.js'
import {validNotesResponse} from '../src/client/notes-validation.js'
import {copyForMove} from '../src/private-workspace/move.js'
import {markFolder} from '../src/private-workspace/folder.js'
import {createServer} from 'node:http'
import {createHttpHandler} from '../src/host/routes.js'

async function fixture(t:{after(fn:()=>Promise<void>):void},beforeWrite?:(path:string)=>void){
  const dir=await mkdtemp(join(tmpdir(),'fatfish-handbook-')),repo=new NoteRepository(dir,{...(beforeWrite?{beforeWrite}:{})})
  t.after(async()=>{repo.close();await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100})})
  return {dir,repo}
}
test('bundled handbook is deterministic, contains three linked editable chapters and valid local resources',async t=>{
  const {repo}=await fixture(t),a=await handbookBundle(),b=await handbookBundle()
  assert.deepEqual(a,b);assert.equal(a.objects.revisions.length,3);assert.equal(a.files.size,3)
  const {noteId,created}=await openHandbook(repo,true);assert.equal(created,true);assert.equal(noteId,handbookId(0,'welcome'))
  const notes=(await repo.list({order:'recent'})).items;assert.equal(notes[0]!.noteId,noteId)
  assert.match((await repo.get(noteId!)).current.body,/搜索笔记或附件名[\s\S]*点击即可跳到原句/)
  for(const row of a.objects.revisions){
    const note=await repo.get(row.noteId);assert.equal(note.current.body,row.body);assert.doesNotMatch(row.body,/handbook-(?:note|asset|file):/)
    for(const match of row.body.matchAll(/fatfish-note:([0-9A-Z]{26})/g))await repo.get(match[1]!)
    for(const id of row.assetIds)assert.equal((await repo.getAsset(id)).length,a.files.get(`notes/assets/${id}`)!.length)
    for(const file of row.attachments??[])assert.equal((await repo.getAttachment(file.id)).length,file.bytes)
  }
  assert.equal((await repo.listNotebooks()).find(b=>b.isDefault)!.notebookId,DEFAULT_NOTEBOOK_ID)
  assert.ok((await repo.backlinks(handbookId(0,'materials'))).length>=2)
  const current=await repo.get(noteId!);await repo.save({noteId:current.noteId,expectedHeads:current.heads,content:{...revisionContent(current.current),body:'用户自己的开头'}})
  assert.equal((await repo.get(noteId!)).current.body,'用户自己的开头')
})
test('handbook lookup survives renamed books, moved notes and edited titles without restoring missing chapters',async t=>{
  const {repo}=await fixture(t);await openHandbook(repo,true)
  const book=(await repo.listNotebooks()).find(b=>b.notebookId===handbookId(0,'book'))!
  await repo.saveNotebook({notebookId:book.notebookId,expectedHeads:book.heads,title:'我的阅读材料'})
  const note=await repo.get(handbookId(0,'welcome'));await repo.save({noteId:note.noteId,expectedHeads:note.heads,content:{...revisionContent(note.current),title:'我的入口',notebookId:DEFAULT_NOTEBOOK_ID,body:'我修改的内容'}})
  const material=await repo.get(handbookId(0,'materials'));await repo.trash(material.noteId,material.heads)
  assert.equal((await openHandbook(repo,true)).noteId,note.noteId)
  assert.equal((await repo.get(note.noteId)).current.body,'我修改的内容')
  assert.equal((await repo.get(material.noteId)).current.status,'trashed')
  assert.equal((await repo.listNotebooks()).length,2)
})
test('purged handbook stays deleted; manual addition uses new identities and remaps its links',async t=>{
  const {repo}=await fixture(t);await openHandbook(repo,true)
  for(const item of (await repo.list()).items){const trashed=await repo.trash(item.noteId,item.heads);await repo.batch([{noteId:item.noteId,expectedHeads:trashed.heads}],'purge')}
  assert.equal((await openHandbook(repo,false)).noteId,null)
  assert.equal(pristineNotes(await repo.exportObjects()),false)
  assert.equal(await initialHandbook(await repo.exportObjects(),{version:1,revisions:[],notebooks:[]}),undefined)
  const next=await openHandbook(repo,true);assert.equal(next.noteId,handbookId(1,'welcome'))
  const body=(await repo.get(next.noteId!)).current.body;assert.ok(body.includes(handbookId(1,'materials')));assert.ok(!body.includes(handbookId(0,'materials')))
  await assert.rejects(repo.get(handbookId(0,'welcome')))
})
test('simultaneous add requests share one copy, and a different repository never inherits its state',async t=>{
  const {repo}=await fixture(t),other=(await fixture(t)).repo
  const result=await Promise.all([openHandbook(repo,true),openHandbook(repo,true),openHandbook(repo,true)])
  assert.equal(result.filter(r=>r.created).length,1);assert.equal((await repo.list()).items.length,3)
  assert.equal((await openHandbook(other,false)).noteId,null)
})
for(const boundary of ['assets/','notebooks/','revisions/','manifest.json'])test(`manual addition recovers after interruption at ${boundary} without duplicate chapters`,async t=>{
  let armed=false,hit=false
  const {dir,repo}=await fixture(t,path=>{if(armed&&!hit&&path.startsWith(boundary)){hit=true;throw Error('simulated power loss')}})
  await repo.exportObjects();armed=true
  await assert.rejects(openHandbook(repo,true));assert.equal(hit,true)
  const restarted=new NoteRepository(dir);t.after(async()=>restarted.close())
  assert.equal((await openHandbook(restarted,true)).noteId,handbookId(0,'welcome'))
  assert.equal((await restarted.list()).items.length,3)
  await assert.rejects(readFile(join(dir,'handbook-import/manifest.json')))
})
test('automatic eligibility excludes local history, tombstones and changed default notebooks',async t=>{
  const {repo}=await fixture(t),empty=await repo.exportObjects();assert.equal(pristineNotes(empty),true)
  const def=(await repo.listNotebooks())[0]!;await repo.saveNotebook({notebookId:def.notebookId,expectedHeads:def.heads,title:'收件箱'})
  assert.equal(await initialHandbook(await repo.exportObjects(),empty),undefined)
  assert.equal(await initialHandbook(empty,{...empty,deleted:[handbookId(0,'materials')]}),undefined)
  assert.equal(await initialHandbook(empty,(await handbookBundle()).objects),undefined)
  assert.equal(validNotesResponse('/notes/handbook',{ok:true,noteId:'bad',created:true}),false)
  assert.equal(validNotesResponse('/notes/handbook',{ok:true,noteId:null,created:false}),true)
})
test('an interrupted handbook import travels with an offline library move and can resume there',async t=>{
  let armed=false,hit=false
  const {dir,repo}=await fixture(t,path=>{if(armed&&!hit&&path.startsWith('revisions/')){hit=true;throw Error('interrupted')}})
  await repo.exportObjects();armed=true;await assert.rejects(openHandbook(repo,true))
  const location={repositoryId:123,folder:dir,ownerId:123,repo:'manual-test'}
  await markFolder(location)
  const outer=await mkdtemp(join(tmpdir(),'handbook-move-'));t.after(()=>rm(outer,{recursive:true,force:true,maxRetries:10,retryDelay:100}))
  const target=join(outer,'library');await copyForMove(dir,dir,target,123,new AbortController().signal)
  const moved=new NoteRepository(target);t.after(async()=>moved.close())
  assert.equal((await openHandbook(moved,true)).noteId,handbookId(0,'welcome'));assert.equal((await moved.list()).items.length,3)
})

async function syncFixture(t:{after(fn:()=>Promise<void>):void}){
  const dir=await mkdtemp(join(tmpdir(),'handbook-sync-')),remote=join(dir,'remote.git');await runGit(['init','--bare','--initial-branch=main',remote])
  const account={id:123,login:'Alice'};let repository:GitHubRepository|null=null,runner:GitRunner=runGit
  const gateway:GitHubGateway={available:async()=>true,account:async()=>account,repository:async()=>repository,createPrivate:async()=>repository={id:456,owner:'Alice',ownerId:123,name:'manual-test',visibility:'private'}}
  const instances:Array<{notes:NoteRepository;sync:PrivateWorkspaceSync}>=[]
  t.after(async()=>{for(const i of instances){await i.sync.close();i.notes.close()}await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100})})
  async function instance(name:string,handbook=true){const notes=new NoteRepository(join(dir,name)),sync=new PrivateWorkspaceSync({dir:join(dir,name),notes,gateway,remoteForTest:()=>pathToFileURL(remote).href,gitRunner:(a,o)=>runner(a,o),batchMs:3600000,...(handbook?{initialNotes:initialHandbook}:{})});await sync.load();instances.push({notes,sync});return {notes,sync}}
  async function connect(sync:PrivateWorkspaceSync){const {preview}=await sync.preview({mode:repository?'existing':'create',repo:'manual-test'});await sync.connect({previewId:preview.id,confirmPrivate:true})}
  return {dir,remote,gateway,instance,connect,set runner(r:GitRunner){runner=r}}
}
test('production initialization and another device produce one handbook, preserve edits and never refill a cleared library',async t=>{
  const f=await syncFixture(t),a=await f.instance('a');await f.connect(a.sync)
  assert.equal((await a.notes.list()).items.length,3)
  const first=await a.notes.get(handbookId(0,'welcome'));await a.notes.save({noteId:first.noteId,expectedHeads:first.heads,content:{...revisionContent(first.current),body:'我的版本'}});await a.sync.sync()
  const b=await f.instance('b');await f.connect(b.sync);assert.equal((await b.notes.get(first.noteId)).current.body,'我的版本')
  assert.equal((await b.notes.listNotebooks()).length,2)
  for(const item of (await b.notes.list()).items){const trash=await b.notes.trash(item.noteId,item.heads);await b.notes.batch([{noteId:item.noteId,expectedHeads:trash.heads}],'purge')}
  await b.sync.sync();await a.sync.sync();assert.equal((await a.notes.list()).items.length,0)
  const c=await f.instance('c');await f.connect(c.sync);assert.equal((await c.notes.list()).items.length,0)
})
test('existing untouched empty library receives the handbook only on new first connection, not on upgrade/background sync',async t=>{
  const f=await syncFixture(t),old=await f.instance('old',false);await f.connect(old.sync);assert.equal((await old.notes.list()).items.length,0)
  await old.sync.close();old.notes.close()
  const upgrade=await f.instance('old');await upgrade.sync.sync();assert.equal((await upgrade.notes.list()).items.length,0)
  const fresh=await f.instance('fresh');await f.connect(fresh.sync);assert.equal((await fresh.notes.list()).items.length,3)
})
test('failed first push leaves no visible handbook; retry and a second clone converge',async t=>{
  const f=await syncFixture(t),a=await f.instance('retry');f.runner=async(args,options)=>{if(args.includes('push'))throw Error('network unavailable');return runGit(args,options)}
  await assert.rejects(f.connect(a.sync));assert.equal((await a.notes.list()).items.length,0)
  f.runner=runGit;await a.sync.sync();const b=await f.instance('other');await f.connect(b.sync)
  assert.equal((await b.notes.list()).items.length,3);assert.equal(existingHandbook(await b.notes.exportObjects()),handbookId(0,'welcome'))
})
test('application wires the real handbook provider and manual help requires completed setup',async t=>{
  const f=await syncFixture(t),app=await createApplication({dir:join(f.dir,'application'),personal:{gateway:f.gateway,remoteForTest:()=>pathToFileURL(f.remote).href}})
  t.after(()=>app.close())
  await assert.rejects(app.notes.handbook({action:'add'}),{code:'notebook_setup_required'})
  const {preview}=await app.backup.preview({mode:'create',repo:'manual-test'});await app.backup.connect({previewId:preview.id,confirmPrivate:true})
  assert.equal((await app.notes.handbook({action:'open'})).noteId,handbookId(0,'welcome'))
  await assert.rejects(app.notes.handbook({action:'replace'}),{code:'invalid_request'})
  let origin='';const server=createServer((req,res)=>void createHttpHandler({app,getOrigin:()=>origin})(req,res))
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();assert(address&&typeof address!=='string');origin=`http://127.0.0.1:${address.port}`
  try{
    const url=origin+'/dsh-fatfish-notes/notes/handbook',post=(headers:Record<string,string>={})=>fetch(url,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify({action:'add'})})
    assert.equal((await fetch(url)).status,405)
    assert.equal((await post({origin:'https://other.example'})).status,403)
    assert.equal((await post({'x-notebook-repository':'999'})).status,409)
    app.requireWindowIdentity=true;assert.equal((await post()).status,409)
    app.requireWindowIdentity=false;assert.equal((await post()).status,200)
  }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()))}
})
test('two first connections to an untouched empty remote converge without conflicts',async t=>{
  const f=await syncFixture(t),old=await f.instance('seed-empty',false);await f.connect(old.sync)
  const a=await f.instance('left'),b=await f.instance('right');await Promise.all([f.connect(a.sync),f.connect(b.sync)]);await a.sync.sync();await b.sync.sync()
  assert.deepEqual(await a.notes.exportObjects(),await b.notes.exportObjects());assert.equal((await a.notes.list()).items.length,3)
  assert((await a.notes.list()).items.every(n=>!n.conflicted))
})
test('local empty state restores a populated or trashed remote without adding a handbook',async t=>{
  const f=await syncFixture(t),old=await f.instance('used',false);await f.connect(old.sync)
  const seed=(await handbookBundle()).objects.revisions[0]!
  const note=await old.notes.save({expectedHeads:[],content:{...revisionContent(seed),assetIds:[],body:'用户自己的笔记',notebookId:null}});await old.notes.trash(note.noteId,note.heads);await old.sync.sync()
  const fresh=await f.instance('restore-used');await f.connect(fresh.sync)
  assert.equal((await fresh.notes.list({status:'all'})).items.length,1);assert.equal((await fresh.notes.list()).items.length,0)
  assert.equal(existingHandbook(await fresh.notes.exportObjects()),null)
})


for(const version of [1,2])test(`handbook v${version} identities remain discoverable and edited content is preserved`,async t=>{
 const {repo}=await fixture(t),book=await repo.saveNotebook({notebookId:handbookId(0,'book',version),expectedHeads:[],title:'我的旧手册'})
 const note=await repo.save({noteId:handbookId(0,'welcome',version),expectedHeads:[],content:{title:'用户改过的开头',body:'我的补充',summary:'',tags:[],status:'active',notebookId:book.notebookId,sourceId:null,assetIds:[]}})
 assert.notEqual(note.noteId,handbookId(0,'welcome'));assert.equal((await openHandbook(repo,true)).noteId,note.noteId);assert.deepEqual((await repo.get(note.noteId)).heads,note.heads);assert.equal((await repo.list()).items.length,1)
})
