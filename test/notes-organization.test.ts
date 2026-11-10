import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {randomUUID} from 'node:crypto'
import {NoteRepository} from '../src/notes/repository.js'
import {revisionContent} from '../src/notes/conflicts.js'
import {linkedNotes,fillTemplate} from '../src/notes/relations.js'
import {RecentNotes} from '../src/client/recent-notes.js'
import {createNoteRevision,materializeNote} from '../src/notes/revisions.js'
import {searchNotes} from '../src/notes/search.js'
import {EditCoordinator,windowRequest} from '../src/host/edit-coordinator.js'
import {NotesApplication} from '../src/host/notes.js'
import {validNotesResponse} from '../src/client/notes-validation.js'
import type {NoteContent,NoteView} from '../src/contracts/notes.js'
import {noteContent} from '../src/client/notes-controller.js'
import {renderToStaticMarkup} from 'react-dom/server'
import {createElement} from 'react'
import {NoteMarkdown} from '../src/client/NoteMarkdown.js'
import {exportLibrary} from '../src/notes/export/library.js'
import {unzipSync} from 'fflate'
const a='01K00000000000000000000000',b='01K00000000000000000000001',c='01K00000000000000000000002',d='01K00000000000000000000003'
const content:NoteContent={title:'长文整理',body:'正文',summary:'',tags:['保留'],notebookId:null,status:'active',sourceId:null,assetIds:[]}
const select=(...notes:NoteView[])=>notes.map(n=>({noteId:n.noteId,expectedHeads:n.heads}))
async function fixture(t:{after(fn:()=>Promise<void>):void}){const dir=await mkdtemp(join(tmpdir(),'fatfish-organize-'));t.after(()=>rm(dir,{recursive:true,force:true}));return {dir,repo:new NoteRepository(dir)}}

test('multiword search prioritizes titles, paginates ranked matches and finds distant body context',()=>{
  const rows=Array.from({length:105},(_,i)=>{const id='01K00000000000000000000'+String(i).padStart(3,'0');return materializeNote([createNoteRevision({version:1,noteId:id,parents:[],recordedAt:'2026-11-10T00:00:00.000Z',...content,title:i===80?'月面 观测':`资料${i}`,body:'前言。'.repeat(900)+'月面 中间文字 观测'+(i===2?' 附加词':'')})],id)})
  let cursor:string|null=null;const ids:string[]=[]
  do{const result=searchNotes(rows,{query:'月面 观测',limit:20,...(cursor?{cursor}: {})});assert.match(result.items[0]!.excerpt!,/月面/);ids.push(...result.items.map(n=>n.noteId));cursor=result.cursor}while(cursor)
  assert.equal(ids.length,105);assert.equal(new Set(ids).size,105);assert.equal(ids[0],rows[80]!.noteId)
  assert.equal(searchNotes(rows,{query:'月面 附加词'}).items.length,1)
  assert.deepEqual(searchNotes(rows,{recentIds:[rows[4]!.noteId,rows[1]!.noteId]}).items.map(n=>n.noteId),[rows[4]!.noteId,rows[1]!.noteId])
})
test('favorites survive immutable synchronization, editing and filtering without modifying original material',async t=>{
  const {repo}=await fixture(t),other=(await fixture(t)).repo
  let note=await repo.save({noteId:a,expectedHeads:[],content})
  await repo.manage({notes:select(note),action:'favorite'});note=await repo.get(a)
  assert.equal(noteContent(note).favorite,true);assert.equal(note.current.body,'正文')
  await other.importObjects(await repo.exportObjects());assert.equal((await other.list({favorite:true})).items[0]?.noteId,a)
  await repo.save({noteId:a,expectedHeads:note.heads,content:{...noteContent(note),body:'新正文'}})
  await repo.manage({notes:select(await repo.get(a)),action:'unfavorite'});assert.equal((await repo.list({favorite:true})).items.length,0)
})
test('batch metadata preflights stale versions, occupied notes and tag limits before writing any selected item',async t=>{
  const {repo}=await fixture(t),book=await repo.saveNotebook({title:'移动目标',expectedHeads:[]})
  const one=await repo.save({noteId:a,expectedHeads:[],content}),two=await repo.save({noteId:b,expectedHeads:[],content:{...content,tags:Array.from({length:50},(_,i)=>'标签'+i)}})
  await assert.rejects(repo.manage({notes:select(one,two),action:'add-tags',tags:['新标签']}));assert.deepEqual((await repo.get(a)).heads,one.heads)
  await repo.save({noteId:b,expectedHeads:two.heads,content})
  await assert.rejects(repo.manage({notes:select(one,two),action:'move',notebookId:book.notebookId}),{code:'note_conflict'});assert.deepEqual((await repo.get(a)).heads,one.heads)
  const coordinator=new EditCoordinator(()=>1,()=>0),windowId=randomUUID();coordinator.register(windowId,'standalone');const actor={windowId,serviceEpoch:coordinator.epoch};coordinator.acquire(actor,b);repo.editGuard=(ids,lease)=>coordinator.check(ids,windowRequest.getStore(),lease)
  await assert.rejects(repo.manage({notes:select(one,await repo.get(b)),action:'move',notebookId:book.notebookId}),{code:'note_edit_busy'});assert.deepEqual((await repo.get(a)).heads,one.heads)
  coordinator.release({...actor,leaseId:coordinator.state(actor).owned!.leaseId},b)
  await repo.manage({notes:select(one,await repo.get(b)),action:'add-tags',tags:['新增']})
  await repo.manage({notes:select(await repo.get(a),await repo.get(b)),action:'remove-tags',tags:['新增']})
  assert.deepEqual((await repo.get(a)).current.tags,['保留'])
  await repo.manage({notes:select(await repo.get(a),await repo.get(b)),action:'move',notebookId:book.notebookId})
  assert.equal((await repo.get(a)).effectiveNotebookId,book.notebookId);assert.deepEqual((await repo.catalog()).tags,[{tag:'保留',count:2}])
})
test('history restoration appends a new revision, preserves former content and restores referenced binaries; copies remain independent',async t=>{
  const {repo}=await fixture(t),image=await repo.putAsset(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=','base64'),'image/png'),file=await repo.putAttachment(Buffer.from('video'),'视频.mp4')
  const old=await repo.save({noteId:a,expectedHeads:[],content:{...content,body:`![图](../assets/${image.id})`,assetIds:[image.id],attachments:[file]}})
  const now=await repo.save({noteId:a,expectedHeads:old.heads,content:{...noteContent(old),body:'修改后',assetIds:[],attachments:[]}})
  const restored=(await repo.manage({notes:select(now),action:'revision',revision:old.current.revision})).note!
  assert.deepEqual(restored.current.parents,now.heads);assert.deepEqual(restored.current.attachments,[file]);assert.equal((await repo.getRevision(a,now.current.revision)).body,'修改后');assert.equal((await repo.history(a)).items.length,3)
  const copy=(await repo.manage({notes:select(restored),action:'revision-copy',revision:now.current.revision,targetId:b})).note!
  assert.equal(copy.current.body,'修改后');assert.equal((await repo.get(a)).current.body,old.current.body)
  const trash=await repo.trash(a,restored.heads);await repo.batch(select(trash),'purge')
  assert.equal((await repo.get(b)).current.body,'修改后')
})
test('template snapshots retain media, expand only safe variables, sync and do not leak into normal library results',async t=>{
  const {repo}=await fixture(t),other=(await fixture(t)).repo,file=await repo.putAttachment(Buffer.from('pdf'),'资料.pdf')
  const original=await repo.save({noteId:a,expectedHeads:[],content:{...content,body:'# {{标题}}\n{{date}}\n{{unknown}}',summary:'{{日期}}',attachments:[file],favorite:true}})
  const template=(await repo.manage({notes:select(original),action:'template',targetId:b,title:'项目小结'})).note!
  assert.equal(template.current.sourceId,null);assert.equal(template.current.favorite,undefined);assert.equal((await repo.list({templates:true})).items.length,1);assert.equal((await repo.list()).items.length,1)
  await repo.save({noteId:a,expectedHeads:original.heads,content:{...noteContent(original),body:'原笔记修改'}})
  assert.match((await repo.get(b)).current.body,/标题/)
  const created=(await repo.manage({notes:select(template),action:'instantiate',targetId:c,title:'本周',date:'2026-11-10'})).note!
  assert.equal(created.current.body,'# 本周\n2026-11-10\n{{unknown}}');assert.deepEqual(created.current.attachments,[file]);assert.equal(created.current.isTemplate,false)
  // Synchronize payload objects only after transferring content-addressed attachments.
  await other.putAttachment(Buffer.from('pdf'),'资料.pdf');await other.importObjects(await repo.exportObjects());assert.equal((await other.get(b)).current.isTemplate,true)
  await assert.rejects(repo.manage({notes:select(created),action:'instantiate',targetId:d,title:'非法',date:'2026-11-10'}))
  assert.equal(fillTemplate('{{title}} {{标题}}','{{date}}','2026-11-10'),'{{date}} {{date}}')
})
test('templates stay separate from notebook counts, removal and library export; explicit stale move destinations fail',async t=>{
  const {repo}=await fixture(t),book=await repo.saveNotebook({title:'可移除本',expectedHeads:[]})
  const original=await repo.save({noteId:a,expectedHeads:[],content:{...content,notebookId:book.notebookId}})
  const template=(await repo.manage({notes:select(original),action:'template',targetId:b,title:'独立模板'})).note!
  assert.equal((await repo.listNotebooks()).find(n=>n.notebookId===book.notebookId)?.noteCount,1)
  assert.equal(Object.keys(unzipSync((await exportLibrary(repo,{})).bytes)).filter(n=>n.endsWith('.md')).length,1)
  await repo.deleteNotebook(book.notebookId,book.heads,undefined,{removal:'move',expectedNoteCount:1})
  assert.equal((await repo.get(b)).current.status,'active');assert.deepEqual((await repo.get(b)).heads,template.heads)
  await assert.rejects(repo.manage({notes:select(await repo.get(a)),action:'move',notebookId:book.notebookId}),{code:'notebook_trashed'})
  const long=await repo.save({noteId:c,expectedHeads:[],content:{...content,title:'长'.repeat(400)}})
  const copy=(await repo.manage({notes:select(long),action:'duplicate',targetId:d})).note!
  assert.ok(Buffer.byteLength(copy.current.title)<=1200);assert.match(copy.current.title,/副本/)
})
test('backlinks include actual and reference links, exclude code, unused definitions, images, trash and templates',async t=>{
  assert.deepEqual([...linkedNotes(`[引用](fatfish-note:${a})\n\n\`[伪](fatfish-note:${b})\`\n\n[unused]: fatfish-note:${c}\n\n![图](fatfish-note:${d})`)], [a])
  assert.deepEqual([...linkedNotes(`[引用][id]\n\n[id]: fatfish-note:${a}`)],[a])
  const {repo}=await fixture(t);await repo.save({noteId:a,expectedHeads:[],content});const linked=await repo.save({noteId:b,expectedHeads:[],content:{...content,body:`[引用](fatfish-note:${a})`}})
  assert.equal((await repo.backlinks(a))[0]?.noteId,b);await repo.trash(b,linked.heads);assert.equal((await repo.backlinks(a)).length,0)
})
test('recent visits are repository-scoped, deduplicated, bounded and tolerate unavailable local storage',()=>{
  const map=new Map<string,string>(),storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v)},removeItem:(k:string)=>{map.delete(k)}};let repository=1
  const visits=new RecentNotes(storage,()=>repository);visits.visit(a);visits.visit(b);visits.visit(a);assert.deepEqual(visits.read(),[a,b]);repository=2;assert.deepEqual(visits.read(),[]);new RecentNotes(undefined,()=>2).visit(a)
})
test('new facade responses validate and body highlighting is presentation only with safe HTML handling',async t=>{
  const {dir}=await fixture(t),app=new NotesApplication(dir,()=>undefined);t.after(()=>app.close())
  const n=(await app.save({noteId:a,expectedHeads:[],content})).note
  for(const [path,result]of [['/notes/history',await app.history({noteId:a})],['/notes/catalog',await app.catalog()],['/notes/revision',await app.revision({noteId:a,revision:n.current.revision})],['/notes/backlinks',await app.backlinks({noteId:a})],['/notes/manage',await app.manage({notes:select(n),action:'favorite'})]] as const)assert.equal(validNotesResponse(path,result),true,path)
  const body='正文 <script>alert(1)</script> **标题**\n\n```js\nconst 标题 = 1;\n```'
  const html=renderToStaticMarkup(createElement(NoteMarkdown,{body,note:n,query:'正文 标题'}));assert.match(html,/<mark>正文<\/mark>/);assert.match(html,/<mark>标题<\/mark>/);assert.match(html,/<code[^>]*>const <mark>标题<\/mark>/);assert.doesNotMatch(html,/<script>/);assert.equal(n.current.body,'正文')
})
