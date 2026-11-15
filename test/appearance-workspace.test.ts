import test from 'node:test'
import assert from 'node:assert/strict'
import {appearanceValue,parseAppearance,defaultAppearance,appearanceColors,palettes} from '../src/client/paper/appearance-state.js'
import {codeLanguage,highlightAllowed,searchedTokens} from '../src/client/paper/code-highlight.js'
import {NotebookPages} from '../src/client/paper/notebook-pages.js'
import {NotesController} from '../src/client/notes-controller.js'
import {NoteTabs} from '../src/client/paper/note-tabs.js'
import type {Api} from '../src/client/api.js'
import {ApiError} from '../src/client/api.js'
import type {NoteView,NoteListItem} from '../src/contracts/notes.js'
import {createNoteRevision,materializeNote} from '../src/notes/revisions.js'

test('appearance accepts independent valid choices and rejects corrupted or future preferences',()=>{
  for(const raw of [null,'oops','[]','42','{"version":2,"layout":"island"}'])assert.deepEqual(parseAppearance(raw),defaultAppearance)
  const value=appearanceValue({layout:'island',palette:'native',size:999,codeWeight:400,mode:'dark',tabs:'false',arbitrary:'ignored'})
  assert.equal(value.layout,'island');assert.equal(value.size,17);assert.equal(value.tabs,true);assert.equal(value.mode,'dark');assert.equal('arbitrary' in value,false)
  assert.equal(appearanceValue({...value,palette:'rose'}).layout,'island')
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
function fixture(){
  const ids=['01K00000000000000000000000','01K00000000000000000000001','01K00000000000000000000002']
  const notes=new Map(ids.map((id,i)=>[id,materializeNote([createNoteRevision({version:1,noteId:id,parents:[],recordedAt:'2026-11-15T00:00:00.000Z',title:'Note '+i,body:'original',summary:'',tags:[],notebookId:ids[i]!,status:'active',sourceId:null,assetIds:[]})],id)]))
  let failSave=false,lists=0;const reads:string[]=[]
  const call:Api=async(path,input)=>{
    if(path==='/notes/get'){const id=(input as {noteId:string}).noteId;reads.push(id);if(!notes.has(id))throw new ApiError('note_not_found');return {ok:true,note:notes.get(id)} as never}
    if(path==='/notes'){lists++;return {ok:true,items:[],cursor:'next'} as never}
    if(path==='/notes/notebooks')return {ok:true,notebooks:[]} as never
    if(path==='/notes/jobs')return {ok:true,jobs:[],cursor:null} as never
    if(path==='/notes/draft'){if(failSave)throw new ApiError('network');const v=input as {action:string;request:{noteId:string;content:NoteView['current']}};if(v.action==='save')return {ok:true,state:'editing',note:null} as never;const previous=notes.get(v.request.noteId)!;const note={...previous,current:{...previous.current,...v.request.content}};notes.set(note.noteId,note);return {ok:true,state:'finished',note} as never}
    throw Error(path)
  }
  const controller=new NotesController(call,{autosaveMs:100000,storage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}}),tabs=new NoteTabs(controller),unbind=controller.subscribe(tabs.reconcile)
  return {ids,controller,tabs,notes,reads,get lists(){return lists},set fail(value:boolean){failSave=value},dispose(){unbind();controller.dispose()}}
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
