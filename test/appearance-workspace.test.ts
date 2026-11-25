import test from 'node:test'
import assert from 'node:assert/strict'
import {appearanceValue,parseAppearance,defaultAppearance,appearanceColors,palettes} from '../src/client/paper/appearance-state.js'
import {codeLanguage,highlightAllowed,searchedTokens} from '../src/client/paper/code-highlight.js'
import {NotebookPages} from '../src/client/paper/notebook-pages.js'
import {NotesController} from '../src/client/notes-controller.js'
import {NoteTabs, overviewTabId} from '../src/client/paper/note-tabs.js'
import type {Api} from '../src/client/api.js'
import {ApiError} from '../src/client/api.js'
import type {NoteView,NoteListItem,NoteListOptions} from '../src/contracts/notes.js'
import {createNoteRevision,materializeNote} from '../src/notes/revisions.js'

test('appearance accepts independent valid choices, migrates retired layouts and palettes, and rejects corrupted or future preferences',()=>{
  for(const raw of [null,'oops','[]','42','{"version":2,"layout":"soft"}'])assert.deepEqual(parseAppearance(raw),defaultAppearance)
  const value=appearanceValue({layout:'island',palette:'berry',size:999,codeWeight:400,mode:'dark',tabs:'false',arbitrary:'ignored'})
  assert.equal(value.layout,'soft');assert.equal(value.palette,'berry');assert.equal(value.size,17);assert.equal(value.tabs,true);assert.equal(value.mode,'host');assert.equal('arbitrary' in value,false)
  for(const retired of ['ribbon','dock','ink','archive'])assert.equal(appearanceValue({layout:retired}).layout,'outline')
  for(const retiredPalette of ['clearblue','lilac','mint','blue','inkwhite'])assert.equal(appearanceValue({palette:retiredPalette}).palette,'native')
  assert.equal(Object.keys(palettes).length,6)
  assert.equal(appearanceValue({...value,palette:'rose'}).layout,'soft')
})
test('native standard palette consumes host semantic roles; explicit contrasts remain distinct',()=>{
  const host={paper:'#123456',shelf:'#234567',ink:'#fefefe',accent:'#abcdef'}
  assert.equal(appearanceColors(defaultAppearance,true,host).paper,host.paper)
  for(const palette of Object.keys(palettes) as (keyof typeof palettes)[]){
    const day=appearanceColors({...defaultAppearance,palette},false),night=appearanceColors({...defaultAppearance,palette},true)
    assert.notEqual(day.paper,night.paper);assert.notEqual(day.ink,day.paper);assert.notEqual(night.ink,night.paper)
  }
  assert.notEqual(appearanceColors(defaultAppearance,false).selected,appearanceColors({...defaultAppearance,contrast:'strong'},false).selected)
})
test('legacy fixed light/dark preferences reopen following DSH without losing layout, fonts or materials',()=>{
  const chosen=appearanceValue({...defaultAppearance,layout:'soft',palette:'pine',fontCjk:'kai',fontLatin:'georgia',materials:'right',codeWeight:300})
  for(const mode of ['light','dark','host'])assert.deepEqual(parseAppearance(JSON.stringify({...chosen,mode})),chosen)
  assert.deepEqual(appearanceValue({...chosen,mode:'dark'}),chosen)
})
test('highlight admission preserves unknown and large text for plain display instead of trimming source',()=>{
  for(const name of ['js','TS','json','py','bash','yml','html','css','sql'])assert.ok(codeLanguage(name))
  assert.equal(codeLanguage('untrusted-lang'),null);assert.equal(highlightAllowed('a'.repeat(100001)),false);assert.equal(highlightAllowed('\n'.repeat(2001)),false);assert.equal(highlightAllowed('\t中文\n  const value = 1'),true)
})
test('search matches survive syntax token boundaries and preserve indentation and unicode source',()=>{
  const line='  const 中文 = "value"',tokens=[{content:'  const 中',color:'#abc'},{content:'文 = "value"',color:'#def'}]
  const result=searchedTokens(line,tokens,'中文')
  assert.equal(result.map(t=>t.content).join(''),line);assert.equal(result.filter(t=>t.match).map(t=>t.content).join(''),'中文')
  assert.deepEqual(searchedTokens(line,undefined,'中文').filter(t=>t.match).map(t=>t.content),['中文'])
})
function row(i:number):NoteListItem{return {noteId:String(i),heads:['head'],title:'笔记 '+i,summary:'',tags:[],notebookId:'book-'+Math.floor(i/100),status:'active',savedAt:'2026-11-15',conflicted:false}}
test('1,000/5,000 metadata rows seed only existing pages; group paging merges without duplicate target rows',()=>{
  for(const count of [1000,5000]){
    const all=Array.from({length:count},(_,i)=>row(i)),pages=new NotebookPages()
    pages.seed({},all.slice(0,50),'50');assert.equal(pages.get('book-0')?.items.length,50);assert.equal(pages.get('book-1'),undefined)
    pages.merge('book-0',{items:all.slice(0,50),cursor:'50'},false);pages.merge('book-0',{items:all.slice(25,75),cursor:'75'},true);assert.equal(pages.get('book-0')?.items.length,75)
    pages.seed({query:'filtered'},[],null);assert.equal(pages.get('book-0')?.items.length,75)
    pages.invalidate();assert.equal(pages.get('book-0'),undefined)
  }
})
function fixture(mode?: 'overview' | 'conversation-list'){
  const overview = mode === 'overview'
  const ids=['01K00000000000000000000000','01K00000000000000000000001','01K00000000000000000000002']
  const notes=new Map(ids.map((id,i)=>[id,materializeNote([createNoteRevision({version:1,noteId:id,parents:[],recordedAt:'2026-11-15T00:00:00.000Z',title:'Note '+i,body:'original',summary:'',tags:[],notebookId:ids[i]!,status:'active',sourceId:null,assetIds:[]})],id)]))
  let failSave=false;const reads:string[]=[],listQueries:NoteListOptions[]=[]
  const call:Api=async(path,input)=>{
    if(path==='/notes/get'){const id=(input as {noteId:string}).noteId;reads.push(id);if(!notes.has(id))throw new ApiError('note_not_found');return {ok:true,note:notes.get(id)} as never}
    if(path==='/notes'){
      listQueries.push(input as NoteListOptions)
      const note=notes.get(ids[0]!)!
      const item={noteId:note.noteId,title:note.current.title,notebookId:note.effectiveNotebookId,savedAt:note.savedAt}
      return {ok:true,items:mode?[item]:[],cursor:'next',...(overview&&{overview:{opened:[],modified:[item]}})} as never
    }
    if(path==='/notes/notebooks')return {ok:true,notebooks:[]} as never
    if(path==='/notes/jobs')return {ok:true,jobs:[],cursor:null} as never
    if(path==='/notes/draft-recovery')return {ok:true,recovered:[ids[1]],failed:[]} as never
    if(path==='/notes/trash'){
      const {noteId}=input as {noteId:string}
      const note=notes.get(noteId)!
      const trashed={...note,current:{...note.current,status:'trashed' as const}}
      notes.set(noteId,trashed)
      return {ok:true,note:trashed} as never
    }
    if(path==='/notes/batch'){
      const {notes:selection,action}=input as {notes:{noteId:string}[];action:string}
      for(const item of selection)if(action==='purge')notes.delete(item.noteId)
      return {ok:true,completed:selection.map(item=>item.noteId)} as never
    }
    if(path==='/notes/draft'){if(failSave)throw new ApiError('network');const v=input as {action:string;request:{noteId:string;content:NoteView['current']}};if(v.action==='save')return {ok:true,state:'editing',note:null} as never;const previous=notes.get(v.request.noteId)!;const note={...previous,current:{...previous.current,...v.request.content}};notes.set(note.noteId,note);return {ok:true,state:'finished',note} as never}
    throw Error(path)
  }
  const controller=new NotesController(call,{...(mode&&{startTab:mode}),autosaveMs:100000,storage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}}),tabs=new NoteTabs(controller),unbind=controller.subscribe(tabs.reconcile)
  return {ids,controller,tabs,notes,reads,listQueries,get lists(){return listQueries.length},set fail(value:boolean){failSave=value},dispose(){unbind();controller.dispose()}}
}
test('tab navigation deduplicates, reveals notebook without scanning pagination, and closing last tab does not delete',async()=>{
  const f=fixture();try{
    await f.tabs.select(f.ids[0]!);await f.tabs.select(f.ids[1]!);await f.tabs.select(f.ids[0]!);assert.equal(f.tabs.getSnapshot().length,2)
    assert.equal(f.controller.getSnapshot().filter.notebookId,f.ids[0]);assert.equal(f.controller.getSnapshot().items[0]?.noteId,f.ids[0]);assert.equal(f.lists,3)
    await f.tabs.close(f.ids[0]!);assert.equal(f.controller.getSnapshot().noteId,f.ids[1]);await f.tabs.close(f.ids[1]!);assert.equal(f.controller.getSnapshot().noteId,null);assert.equal(f.notes.size,3);assert.equal(f.tabs.getSnapshot().length,0)
  }finally{f.dispose()}
})
test('composition and failed saves retain active note, tabs, filter and draft',async()=>{
  const f=fixture();try{
    await f.tabs.select(f.ids[0]!);await f.tabs.select(f.ids[1]!);await f.controller.beginEdit();f.controller.update({body:'unsaved changes'});f.controller.composition(true)
    assert.equal(await f.tabs.select(f.ids[0]!),false);assert.equal(f.controller.getSnapshot().noteId,f.ids[1]);f.controller.composition(false);f.fail=true
    assert.equal(await f.tabs.close(f.ids[1]!),false);assert.equal(f.controller.getSnapshot().draft?.body,'unsaved changes');assert.equal(f.tabs.getSnapshot().length,2);assert.equal(f.controller.getSnapshot().filter.notebookId,f.ids[1])
  }finally{f.dispose()}
})
test('tabs have no cross-controller state and repository switch clears metadata and positions',async()=>{
  const f=fixture(),other=fixture();try{await f.tabs.select(f.ids[0]!);f.tabs.positions.set(f.ids[0]!,200);assert.equal(other.tabs.getSnapshot().length,0);f.controller.switched();assert.equal(f.tabs.getSnapshot().length,0);assert.equal(f.tabs.positions.size,0)}finally{f.dispose();other.dispose()}
})



test('closing other tabs saves active edits, retains all tabs on failure and keeps the requested background tab',async()=>{
 const f=fixture();try{
  for(const id of f.ids)await f.tabs.select(id)
  await f.controller.beginEdit();f.controller.update({body:'unsaved edit'});f.fail=true
  assert.equal(await f.tabs.closeOthers(f.ids[0]!),false);assert.equal(f.tabs.getSnapshot().length,3);assert.equal(f.controller.getSnapshot().noteId,f.ids[2]);assert.equal(f.controller.getSnapshot().draft?.body,'unsaved edit')
  f.fail=false;assert.equal(await f.tabs.closeOthers(f.ids[0]!),true);assert.deepEqual(f.tabs.getSnapshot().map(t=>t.id),[f.ids[0]]);assert.equal(f.notes.get(f.ids[2]!)?.current.body,'unsaved edit')
 }finally{f.dispose()}
})

test('closing all saves once, keeps tabs and draft on failure, and opens no other note', async () => {
  const f=fixture()
  try {
    for (const id of f.ids) await f.tabs.select(id)
    f.tabs.positions.set(f.ids[0]!,160)
    await f.controller.beginEdit()
    f.controller.update({body:'latest edit'})
    f.fail=true
    assert.equal(await f.tabs.closeAll(),false)
    assert.equal(f.tabs.getSnapshot().length,3)
    assert.equal(f.controller.getSnapshot().draft?.body,'latest edit')
    const reads=f.reads.length
    f.fail=false
    assert.equal(await f.tabs.closeAll(),true)
    assert.equal(f.controller.getSnapshot().noteId,null)
    assert.equal(f.tabs.getSnapshot().length,0)
    assert.equal(f.tabs.positions.size,0)
    assert.equal(f.reads.length,reads)
    assert.equal(f.notes.get(f.ids[2]!)?.current.body,'latest edit')
  } finally {f.dispose()}
})

test('removed notes close their tabs, foreground prefers right, and bulk removal skips the full batch',async()=>{
  const f=fixture()
  try {
    const [left,middle,right]=f.ids as [string,string,string]
    for(const id of f.ids)await f.tabs.select(id)
    await f.tabs.select(middle)
    assert.ok(await f.controller.changeStatus(true))
    await new Promise<void>(resolve=>setImmediate(resolve))
    assert.equal(f.controller.getSnapshot().noteId,right)
    assert.deepEqual(f.tabs.getSnapshot().map(tab=>tab.id),[left,right])
    // A restored note can be opened again, then a batch removes it and its right neighbor.
    const old=f.notes.get(middle)!
    f.notes.set(middle,{...old,current:{...old.current,status:'active'}})
    await f.tabs.select(middle)
    await f.tabs.select(right)
    assert.equal(await f.controller.batch([right,middle].map(noteId=>({noteId,expectedHeads:f.notes.get(noteId)!.heads})),'purge'),true)
    await new Promise<void>(resolve=>setImmediate(resolve))
    assert.equal(f.controller.getSnapshot().noteId,left)
    assert.deepEqual(f.tabs.getSnapshot().map(tab=>tab.id),[left])
    assert.ok(await f.controller.changeStatus(true))
    assert.equal(f.controller.getSnapshot().noteId,null)
    assert.deepEqual(f.tabs.getSnapshot(),[])
  } finally {f.dispose()}
})

test('overview startup loads metadata and leaves both prior and recovered notes unselected', async () => {
  const f=fixture('overview')
  try {
    await f.controller.initialize(f.ids[2]!)
    assert.equal(f.controller.getSnapshot().noteId,null)
    assert.deepEqual(f.reads,[])
    assert.equal(f.controller.getSnapshot().overview?.modified[0]?.noteId,f.ids[0])
    assert.deepEqual(f.tabs.getSnapshot().map(tab=>tab.id),[overviewTabId])
    assert.equal(f.tabs.activeId,overviewTabId)
  } finally {f.dispose()}
})

test('opening from overview uses its slot, while selecting another tab preserves it',async()=>{
  const f=fixture('overview')
  const [first,second,third]=f.ids as [string,string,string]
  const order=()=>f.tabs.getSnapshot().map(tab=>tab.id)
  try {
    assert.equal(await f.controller.open(first),true)
    assert.deepEqual(order(),[first])
    const reads=f.reads.length
    assert.equal(await f.tabs.select(overviewTabId),true)
    assert.equal(await f.tabs.select(overviewTabId),true)
    assert.deepEqual(order(),[first,overviewTabId])
    assert.equal(f.reads.length,reads)
    assert.equal(await f.controller.open(second),true)
    assert.deepEqual(order(),[first,second])
    assert.equal(await f.tabs.select(overviewTabId),true)
    assert.equal(f.tabs.move(overviewTabId,first),true)
    assert.deepEqual(order(),[overviewTabId,first,second])
    assert.equal(await f.controller.open(third),true)
    assert.deepEqual(order(),[third,first,second])

    assert.equal(await f.tabs.select(overviewTabId),true)
    assert.equal(await f.tabs.select(first),true)
    assert.deepEqual(order(),[third,first,second,overviewTabId])
    assert.equal(await f.tabs.select(overviewTabId),true)
    assert.equal(await f.controller.open(second),true)
    assert.deepEqual(order(),[third,first,second])
    assert.equal(f.tabs.activeId,second)
  } finally {f.dispose()}
})

test('last close and close all select overview, with save and failed-open protection',async()=>{
  const f=fixture('overview')
  const [first,second]=f.ids as [string,string]
  const order=()=>f.tabs.getSnapshot().map(tab=>tab.id)
  try {
    assert.equal(await f.controller.open('missing'),false)
    assert.deepEqual(order(),[overviewTabId])
    assert.equal(f.tabs.activeId,overviewTabId)
    assert.equal(await f.tabs.close(overviewTabId),false)
    assert.equal(await f.controller.open(first),true)
    await f.controller.beginEdit()
    f.controller.update({body:'retained draft'})
    f.fail=true
    assert.equal(await f.tabs.select(overviewTabId),false)
    assert.equal(await f.tabs.closeAll(),false)
    assert.deepEqual(order(),[first])
    assert.equal(f.tabs.activeId,first)
    assert.equal(f.controller.getSnapshot().draft?.body,'retained draft')

    f.fail=false
    const reads=f.reads.length
    assert.equal(await f.tabs.close(first),true)
    assert.deepEqual(order(),[overviewTabId])
    assert.equal(f.tabs.activeId,overviewTabId)
    assert.equal(f.reads.length,reads)
    assert.equal(f.notes.get(first)?.current.body,'retained draft')
    await f.controller.open(first)
    await f.controller.open(second)
    await f.tabs.select(overviewTabId)
    assert.equal(await f.tabs.closeAll(),true)
    assert.deepEqual(order(),[overviewTabId])
    assert.equal(f.tabs.activeId,overviewTabId)
  } finally {f.dispose()}
})

test('tab moves leave the note, draft and scroll position intact and are cleared on repository change',async()=>{
  const f=fixture('overview')
  const other=fixture('overview')
  const [first,second,third]=f.ids as [string,string,string]
  try {
    for(const id of f.ids)await f.controller.open(id)
    await f.controller.beginEdit()
    f.controller.update({body:'currently editing'})
    f.tabs.positions.set(third,220)
    const reads=f.reads.length
    assert.equal(f.tabs.move(second,null),true)
    assert.deepEqual(f.tabs.getSnapshot().map(tab=>tab.id),[first,third,second])
    assert.equal(f.tabs.move(second,third,'after'),false)
    assert.equal(f.tabs.move('missing',first),false)
    assert.equal(f.tabs.activeId,third)
    assert.equal(f.controller.getSnapshot().draft?.body,'currently editing')
    assert.equal(f.tabs.positions.get(third),220)
    assert.equal(f.reads.length,reads)
    assert.deepEqual(other.tabs.getSnapshot().map(tab=>tab.id),[overviewTabId])
    f.controller.switched()
    assert.deepEqual(f.tabs.getSnapshot().map(tab=>tab.id),[overviewTabId])
    assert.equal(f.tabs.positions.size,0)
  } finally {f.dispose();other.dispose()}
})

test('conversation starts on the list tab and uses its position when opening a note', async () => {
  const {controller, tabs, ids, reads, listQueries, dispose} = fixture('conversation-list')
  const [first, second] = ids as [string, string, string]
  const list = 'conversation-list'
  const order = () => tabs.getSnapshot().map(tab => tab.id)
  try {
    await controller.initialize(null)
    assert.equal(tabs.activeId, list)
    assert.deepEqual(order(), [list])
    assert.deepEqual(reads, [])
    assert.equal(listQueries.some(query => query.overviewRecentIds !== undefined), false)
    assert.ok(await controller.open(first))

    assert.ok(await tabs.select(list))
    assert.ok(tabs.move(list, first))
    assert.ok(await controller.open(second))
    assert.deepEqual(order(), [second, first])

    assert.ok(await tabs.select(list))
    assert.ok(await tabs.select(first))
    assert.deepEqual(order(), [second, first, list])
    assert.ok(await tabs.select(list))
    assert.ok(await controller.open(second))
    assert.deepEqual(order(), [second, first])

    assert.ok(await tabs.close(first))
    assert.ok(await tabs.close(second))
    assert.equal(tabs.activeId, list)
    assert.deepEqual(order(), [list])
  } finally { dispose() }
})

test('conversation tab switches preserve the filtered page and failed edits keep the note open', async () => {
  const f = fixture('conversation-list')
  const {controller, tabs} = f
  const [first, second] = f.ids as [string, string, string]
  const list = 'conversation-list'
  const filter = {order: 'oldest', relation: 'browse', sessionId: 'session-a', query: 'drafts', notebookId: first} as const
  try {
    await controller.filter(filter)
    const {items, cursor} = controller.getSnapshot()
    const lists = f.lists
    assert.ok(await controller.open(first))
    assert.ok(await controller.open(second))
    assert.ok(await tabs.select(first))

    await controller.beginEdit()
    controller.update({body: 'Keep this text'})
    f.fail = true
    assert.equal(await tabs.select(list), false)
    assert.equal(tabs.activeId, first)
    assert.equal(controller.getSnapshot().draft?.body, 'Keep this text')
    assert.deepEqual(tabs.getSnapshot().map(tab => tab.id), [first, second])

    // A fresh tab selection must not replace the browse results with the open note's notebook.
    f.fail = false
    assert.ok(await tabs.select(second))
    assert.ok(await tabs.select(list))
    assert.equal(tabs.activeId, list)
    assert.deepEqual(controller.getSnapshot().filter, filter)
    assert.equal(controller.getSnapshot().cursor, cursor)
    assert.deepEqual(controller.getSnapshot().items, items)
    assert.equal(f.lists, lists + 1) // One list refresh when the edited note is saved.
  } finally { f.dispose() }
})
