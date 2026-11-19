import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {randomUUID} from 'node:crypto'
import {NoteRepository} from '../src/notes/repository.js'
import {revisionContent} from '../src/notes/conflicts.js'
import {linkedNotes} from '../src/notes/relations.js'
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
import {createOrganization,mergeOrganization,organizationState,organizationManifest,validateOrganizationManifest} from '../src/notes/organization.js'
const a='01K00000000000000000000000',b='01K00000000000000000000001',c='01K00000000000000000000002',d='01K00000000000000000000003'
const content:NoteContent={title:'长文整理',body:'正文',summary:'',tags:['保留'],notebookId:null,status:'active',sourceId:null,assetIds:[]}
const select=(...notes:NoteView[])=>notes.map(n=>({noteId:n.noteId,expectedHeads:n.heads}))
async function fixture(t:{after(fn:()=>Promise<void>):void}){const dir=await mkdtemp(join(tmpdir(),'fatfish-organize-'));t.after(()=>rm(dir,{recursive:true,force:true}));return {dir,repo:new NoteRepository(dir)}}

test('row rename preserves body and notebook and rejects stale heads or another editor',async t=>{
 const {repo}=await fixture(t),note=await repo.save({noteId:a,expectedHeads:[],content})
 await repo.manage({notes:select(note),action:'rename',title:'新的名称'})
 const latest=await repo.get(a);assert.equal(latest.current.title,'新的名称');assert.equal(latest.current.body,content.body);assert.equal(latest.effectiveNotebookId,note.effectiveNotebookId)
 await assert.rejects(repo.manage({notes:select(note),action:'rename',title:'旧版本改名'}),{code:'note_conflict'})
 repo.editGuard=()=>{throw Object.assign(new Error('busy'),{code:'note_edit_busy'})}
 await assert.rejects(repo.manage({notes:select(latest),action:'rename',title:'覆盖'}),{code:'note_edit_busy'});assert.equal((await repo.get(a)).current.title,'新的名称')
})

test('multiword search prioritizes titles, paginates ranked matches and finds distant body context',()=>{
  const rows=Array.from({length:105},(_,i)=>{const id='01K00000000000000000000'+String(i).padStart(3,'0');return materializeNote([createNoteRevision({version:1,noteId:id,parents:[],recordedAt:'2026-11-10T00:00:00.000Z',...content,title:i===80?'月面 观测':`资料${i}`,body:'前言。'.repeat(900)+'月面 中间文字 观测'+(i===2?' 附加词':'')})],id)})
  let cursor:string|null=null;const ids:string[]=[]
  do{const result=searchNotes(rows,{query:'月面 观测',limit:20,...(cursor?{cursor}: {})});assert.match(result.items[0]!.excerpt!,/月面/);ids.push(...result.items.map(n=>n.noteId));cursor=result.cursor}while(cursor)
  assert.equal(ids.length,105);assert.equal(new Set(ids).size,105);assert.equal(ids[0],rows[80]!.noteId)
  assert.equal(searchNotes(rows,{query:'月面 附加词'}).items.length,1)
  assert.deepEqual(searchNotes(rows,{recentIds:[rows[4]!.noteId,rows[1]!.noteId]}).items.map(n=>n.noteId),[rows[4]!.noteId,rows[1]!.noteId])
})
test('local search ranks filenames, titles and matching paragraphs and intersects optional filters',()=>{
  const now = new Date()
  const currentMonth = new Date(now.getFullYear(),now.getMonth(),1).toISOString()
  const previousMonth = new Date(Date.parse(currentMonth)-1).toISOString()
  const file = {name:'月面 观测.pdf',id:'b'.repeat(64),bytes:20}
  const row = (noteId:string, at:string, patch:Partial<NoteContent>) => materializeNote([
    createNoteRevision({version:1,noteId,parents:[],recordedAt:at,...content,...patch})
  ],noteId)
  const together = '前文月面\n\n另一个段落\n\n真正的月面 观测记录'
  const rows = [row(a,previousMonth,{body:'月面\n\n观测'}),row(b,currentMonth,{body:together}),
    row(c,currentMonth,{attachments:[file],favorite:true}),row(d,currentMonth,{title:'月面 观测'})]
  const result = searchNotes(rows,{query:'月面 观测'})
  assert.deepEqual(result.items.map(item=>item.noteId),[d,c,b,a])
  assert.equal(result.items[1]?.hit?.field,'file')
  assert.equal(result.items[1]?.excerpt,file.name)
  assert.equal(result.items[2]?.hit?.bodyOffset,together.lastIndexOf('月面'))
  assert.match(result.items[2]!.excerpt!,/真正的月面 观测/)
  assert.deepEqual(searchNotes(rows,{modifiedPeriod:'month',tag:'保留',hasFiles:true,query:'观测.pdf',favorite:true}).items.map(item=>item.noteId),[c])
  assert.deepEqual(searchNotes(rows,{modifiedPeriod:'before-month',query:'月面 观测',order:'oldest'}).items.map(item=>item.noteId),[a])
  assert.equal(searchNotes(rows,{query:'月面',order:'oldest'}).items[0]?.noteId,a)
  assert.equal(searchNotes(rows,{query:'月面',tag:'其他',hasFiles:true}).items.length,0)
  const alternate=row(a,currentMonth,{title:'其他版本',body:'保留这句旁注',tags:['旧标签']}).current
  const conflict={...rows[0]!,heads:[rows[0]!.current.revision,alternate.revision],conflicts:[alternate]}
  const alternateResult=searchNotes([conflict],{tag:'旧标签',query:'旁注'})
  assert.equal(alternateResult.items.length,1)
  assert.deepEqual(alternateResult.items[0]!.hit,{field:'body',revision:alternate.revision,alternate:true,bodyOffset:4})
  assert.match(alternateResult.items[0]!.excerpt!,/旁注/)
  assert.equal(validNotesResponse('/notes',{ok:true,...alternateResult}),true)
  assert.equal(validNotesResponse('/notes',{ok:true,cursor:null,items:[{...alternateResult.items[0],hit:{field:'body',revision:file.id}}]}),false)
  assert.equal(searchNotes([conflict],{tag:'旧标签',query:'月面'}).items.length,0)
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
  const now=await repo.save({noteId:a,expectedHeads:old.heads,content:{...noteContent(old),body:'修改后',assetIds:[],attachments:[],supplements:{assetIds:[],attachmentIds:[]}}})
  const restored=(await repo.manage({notes:select(now),action:'revision',revision:old.current.revision})).note!
  assert.deepEqual(restored.current.parents,now.heads);assert.deepEqual(restored.current.attachments,[file]);assert.equal((await repo.getRevision(a,now.current.revision)).body,'修改后');assert.equal((await repo.history(a)).items.length,3)
  const copy=(await repo.manage({notes:select(restored),action:'revision-copy',revision:now.current.revision,targetId:b})).note!
  assert.equal(copy.current.body,'修改后');assert.equal((await repo.get(a)).current.body,old.current.body)
  const trash=await repo.trash(a,restored.heads);await repo.batch(select(trash),'purge')
  assert.equal((await repo.get(b)).current.body,'修改后')
})
test('legacy templates remain ordinary notes with unchanged history, files and literal placeholders',async t=>{
 const {repo}=await fixture(t),other=(await fixture(t)).repo,file=await repo.putAttachment(Buffer.from('pdf'),'资料.pdf'),book=await repo.saveNotebook({title:'旧资料',expectedHeads:[]})
 const legacy=await repo.save({noteId:a,expectedHeads:[],content:{...content,isTemplate:true,notebookId:book.notebookId,body:'# {{标题}}\n{{date}}',attachments:[file]}})
 assert.equal((await repo.list()).items.length,1);assert.equal((await repo.listNotebooks()).find(b=>b.notebookId===book.notebookId)?.noteCount,1)
 assert.equal(Object.keys(unzipSync((await exportLibrary(repo,{})).bytes)).filter(n=>n.endsWith('.md')).length,1)
 const copy=(await repo.manage({notes:select(legacy),action:'duplicate',targetId:b})).note!
 assert.equal(copy.current.body,legacy.current.body);assert.equal(copy.current.isTemplate,undefined)
 await assert.rejects(repo.manage({notes:select(legacy),action:'template',targetId:c}),{code:'note_schema'})
 await assert.rejects(repo.manage({notes:select(legacy),action:'instantiate',targetId:c}),{code:'note_schema'})
 await other.putAttachment(Buffer.from('pdf'),'资料.pdf');await other.importObjects(await repo.exportObjects())
 assert.deepEqual((await other.get(a)).heads,legacy.heads);assert.deepEqual(await other.getAttachment(file.id),Buffer.from('pdf'))
 await repo.deleteNotebook(book.notebookId,book.heads,undefined,{removal:'move',expectedNoteCount:2})
 assert.notEqual((await repo.get(a)).effectiveNotebookId,book.notebookId);assert.equal((await repo.getRevision(a,legacy.current.revision)).body,legacy.current.body)
})

test('pin and custom book order sync independently, append new books, and preserve document modification time',async t=>{
 const {repo}=await fixture(t),other=(await fixture(t)).repo
 const one=await repo.save({noteId:a,expectedHeads:[],content:{...content,title:'A'}}),two=await repo.save({noteId:b,expectedHeads:[],content:{...content,title:'B'}})
 await repo.manage({notes:select(one),action:'favorite'});assert.equal((await repo.get(a)).savedAt,one.savedAt)
 await repo.manage({notes:select(two),action:'pin'});assert.deepEqual((await repo.get(b)).heads,two.heads);assert.equal((await repo.list({order:'title-asc'})).items[0]?.noteId,b)
 await repo.saveNotebook({title:'后建',expectedHeads:[]});const original=(await repo.listNotebooks()).map(b=>b.notebookId),ordered=[...original].reverse()
 await repo.reorderNotebooks(ordered,original);await assert.rejects(repo.reorderNotebooks(original,original),{code:'note_conflict'})
 const appended=await repo.saveNotebook({title:'最后追加',expectedHeads:[]});assert.deepEqual((await repo.listNotebooks()).map(b=>b.notebookId),[...ordered,appended.notebookId])
 await other.importObjects(await repo.exportObjects());assert.equal((await other.get(b)).pinned,true);assert.deepEqual((await other.listNotebooks()).map(b=>b.notebookId),[...ordered,appended.notebookId])
 await other.manage({notes:select(await other.get(b)),action:'unpin'});await repo.importObjects(await other.exportObjects());assert.equal((await repo.get(b)).pinned,false);assert.deepEqual((await repo.get(b)).heads,two.heads)
})

test('concurrent organization changes converge, later observed choices win, and missing events are rejected',()=>{
 const base={version:1 as const,clock:1,recordedAt:'2026-11-15T00:00:00.000Z'}
 const pin=createOrganization({...base,kind:'pin',noteId:a,pinned:true}),unpin=createOrganization({...base,kind:'pin',noteId:a,pinned:false})
 const first=createOrganization({...base,kind:'book-order',ids:[a,b]}),second=createOrganization({...base,kind:'book-order',ids:[b,a]})
 const left=mergeOrganization([pin,first],[unpin,second]),right=mergeOrganization([unpin,second],[pin,first])
 assert.deepEqual(left,right);assert.deepEqual(organizationState(left),organizationState(right))
 const later=createOrganization({...base,clock:2,kind:'pin',noteId:a,pinned:true})
 assert.equal(organizationState(mergeOrganization(left,[later])).pins.get(a),true)
 assert.throws(()=>validateOrganizationManifest(JSON.parse(organizationManifest(left)),left.slice(1),true),{code:'note_manifest'})
 const corrupt={...pin,pinned:false};assert.throws(()=>mergeOrganization([corrupt]),{code:'note_hash'})
})

test('1,000 and 5,000 sorted notes keep pins first and pagination complete in all six orders',()=>{
 for(const size of [1000,5000]){
  const rows=Array.from({length:size},(_,i)=>{const id='01K000000000000000000'+String(i).padStart(5,'0');const at=new Date(Date.UTC(2026,0,1)+i*1000).toISOString();return {...materializeNote([createNoteRevision({version:1,noteId:id,parents:[],recordedAt:at,...content,title:`资料 ${size-i}`})],id),pinned:i%37===0}})
  for(const order of ['recent','oldest','created-recent','created-oldest','title-asc','title-desc'] as const){
   const ids:string[]=[];let cursor:string|null=null
   do{const page=searchNotes(rows,{order,limit:100,...(cursor?{cursor}:{})});ids.push(...page.items.map(n=>n.noteId));cursor=page.cursor}while(cursor)
   assert.equal(ids.length,size);assert.equal(new Set(ids).size,size)
   const pinned=new Set(rows.filter(n=>n.pinned).map(n=>n.noteId));assert(ids.slice(0,pinned.size).every(id=>pinned.has(id)))
  }
 }
})

test('backlinks include actual and reference links, exclude code, unused definitions, images and trash',async t=>{
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
  const html=renderToStaticMarkup(createElement(NoteMarkdown,{body,note:n,query:'正文 标题'}));assert.match(html,/<mark>正文<\/mark>/);assert.match(html,/<mark>标题<\/mark>/);const code=html.match(/<code[^>]*>([\s\S]*?)<\/code>/)?.[1]?.replace(/<\/?span[^>]*>/g,'')??'';assert.match(code,/const <mark>标题<\/mark>/);assert.doesNotMatch(html,/<script>/);assert.equal(n.current.body,'正文')
})
