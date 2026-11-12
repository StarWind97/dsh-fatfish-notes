import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm,readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {NoteRepository} from '../src/notes/repository.js'
import {WorkspaceBooks} from '../src/host/workspace-books.js'
import {noteContent} from '../src/client/notes-controller.js'
import type {NoteContent} from '../src/contracts/notes.js'
import {fixture as captureFixture,request} from './fixtures/notes-capture.js'
import {NoteCaptureService} from '../src/notes/capture.js'
import {NoteConversation} from '../src/host/note-conversation.js'
const a='01K00000000000000000000000',b='01K00000000000000000000001'
const content:NoteContent={title:'会话关联',body:'原文',summary:'',tags:[],notebookId:null,status:'active',sourceId:null,assetIds:[]}
async function fixture(t:{after(fn:()=>Promise<void>):void}){const dir=await mkdtemp(join(tmpdir(),'fatfish-session-'));t.after(()=>rm(dir,{recursive:true,force:true}));return {dir,repo:new NoteRepository(dir)}}
test('session associations survive editing, history and restart, but copies do not inherit them',async t=>{
  const {dir,repo}=await fixture(t);let n=await repo.save({noteId:a,expectedHeads:[],content});const first=n.current.revision
  n=await repo.associate(a,n.heads,'session-a',true);n=await repo.associate(a,n.heads,'session-b',true)
  assert.equal((await repo.list({sessionId:'session-a',relation:'linked'})).items.length,1)
  n=await repo.save({noteId:a,expectedHeads:n.heads,content:{...noteContent(n),body:'手动修改'}})
  n=(await repo.manage({notes:[{noteId:a,expectedHeads:n.heads}],action:'revision',revision:first})).note!
  assert.deepEqual(n.current.sessionLinks,['session-a','session-b']);assert.equal(n.current.body,'原文')
  const copy=(await repo.manage({notes:[{noteId:a,expectedHeads:n.heads}],action:'duplicate',targetId:b})).note!
  assert.equal(copy.current.sessionLinks,undefined)
  assert.deepEqual((await new NoteRepository(dir).get(a)).current.sessionLinks,n.current.sessionLinks)
  assert.equal(JSON.parse(await readFile(join(dir,'notes/manifest.json'),'utf8')).version,4)
  n=await repo.associate(a,n.heads,'session-a',false);assert.equal((await repo.list({sessionId:'session-a'})).items.length,0)
  await assert.rejects(repo.associate(a,[first],'session-a',true),{code:'note_conflict'})
  n=await repo.trash(a,n.heads);assert.equal((await repo.list({sessionId:'session-b'})).items.length,0)
  await repo.restore(a,n.heads);assert.equal((await repo.list({sessionId:'session-b'})).items.length,1)
})
test('workspace defaults are local, repository-specific, persisted and fall back when their notebook is removed',async t=>{
  const {dir,repo}=await fixture(t);let repoId=1
  const map=new WorkspaceBooks(dir,repo,()=>repoId),book=await repo.saveNotebook({title:'项目',expectedHeads:[]})
  await map.request({workspaceId:'workspace',notebookId:book.notebookId})
  assert.equal((await new WorkspaceBooks(dir,repo,()=>repoId).request({workspaceId:'workspace'})).notebookId,book.notebookId)
  repoId=2;assert.equal((await map.request({workspaceId:'workspace'})).notebookId,null)
  repoId=1;await repo.deleteNotebook(book.notebookId,book.heads,undefined,{removal:'move',expectedNoteCount:0})
  assert.equal((await map.request({workspaceId:'workspace'})).notebookId,null)
})
test('related lists include source and manual notes once; browsing reports relation without filtering out other notes',async t=>{
  const {repo}=await fixture(t),f=captureFixture(),service=new NoteCaptureService(repo,new NoteConversation(()=>f.controller))
  const source=(await service.capture(request)).note
  let manual=await repo.save({noteId:a,expectedHeads:[],content})
  manual=await repo.associate(a,manual.heads,request.sessionId,true)
  await repo.associate(source.noteId,source.heads,request.sessionId,true)
  await repo.save({noteId:b,expectedHeads:[],content:{...content,title:'未关联'}})
  const related=await repo.list({sessionId:request.sessionId,relation:'linked'})
  assert.equal(related.items.length,2)
  assert.equal(related.items.find(n=>n.noteId===source.noteId)?.sessionRelation,'source')
  assert.equal(related.items.find(n=>n.noteId===a)?.sessionRelation,'manual')
  const browse=await repo.list({sessionId:request.sessionId,relation:'browse'})
  assert.equal(browse.items.length,3);assert.equal(browse.items.find(n=>n.noteId===b)?.sessionRelation,null)
  const current=await repo.get(source.noteId);await repo.associate(source.noteId,current.heads,request.sessionId,false)
  assert.equal((await repo.list({sessionId:request.sessionId,relation:'source'})).items.length,1)
  manual=await repo.associate(a,manual.heads,'another-session',true);await repo.associate(a,manual.heads,request.sessionId,false)
  assert.equal((await repo.list({sessionId:'another-session',relation:'linked'})).items.length,1)
  assert.equal((await repo.list({sessionId:request.sessionId,relation:'linked'})).items.length,1)
})
