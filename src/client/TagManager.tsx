import * as React from 'react'
import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import type {NoteListOptions,NoteOrder,NoteView} from '../contracts/notes.js'
import type {TagMode,TagRequest,TagReceipt} from '../contracts/tag-management.js'
import type {NotesController,NotesState} from './notes-controller.js'
import type {T} from './locale.js'
import {TagDirectory,foldTag} from './TagDirectory.js'
import {ReadingBody,ReadingSummary} from './NoteReading.js'
import {noteDateTime} from '../notes/date.js'
import {Highlight} from './SearchText.js'

function useRead<V>(read:(signal:AbortSignal)=>Promise<V>,retain?:unknown){
  const [result,setResult]=useState<{read:typeof read;retain?:unknown;value?:V;error?:boolean}>()
  useEffect(()=>{
    const abort=new AbortController()
    void read(abort.signal).then(value=>{if(!abort.signal.aborted)setResult({read,retain,value})},
      ()=>{if(!abort.signal.aborted)setResult({read,error:true})})
    return ()=>abort.abort()
  },[read,retain])
  if (!result) return undefined
  const fresh = result.read === read
  // Keep the same note, result page or preview visible while the host refreshes it.
  if (fresh || (retain !== undefined && result.retain === retain)) return {...result,fresh}
  return undefined
}
function useDebounced(value:string){
  const [current,set]=useState(value)
  useEffect(()=>{const timer=setTimeout(()=>set(value),180);return ()=>clearTimeout(timer)},[value])
  return current
}
const labels={rename:'tagRename',merge:'tagMerge',remove:'tagRemove'} as const
const confirmLabels={rename:'classConfirmRename',merge:'classConfirmMerge',remove:'classConfirmRemove'} as const
const orderLabels={'recent':'classModifiedDesc','oldest':'classModifiedAsc','created-recent':'classCreatedDesc','created-oldest':'classCreatedAsc','title-asc':'classTitleAsc','title-desc':'classTitleDesc','relevance':'findRank'} as const

export function TagManager({controller,state,initialTag,t,setBusy}:{controller:NotesController;state:NotesState;initialTag:string;t:T;setBusy:(v:boolean)=>void}){
  const [selection,setSelection]=useState(initialTag),[mode,setMode]=useState<TagMode|null>(null),[target,setTarget]=useState('')
  const [side,setSide]=useState<'from'|'to'>('from'),[name,setName]=useState('')
  const [query,setQuery]=useState(''),[order,setOrder]=useState<NoteOrder>('recent'),[filters,setFilters]=useState(false)
  const [book,setBook]=useState(''),[period,setPeriod]=useState(''),[files,setFiles]=useState(false),[favorite,setFavorite]=useState(false)
  const [pages,setPages]=useState<string[]>([]),[pinned,pin]=useState<string|null>(null),[lastRow,setLastRow]=useState(false)
  const [edit,setEdit]=useState(false),[addition,setAddition]=useState(''),[working,work]=useState(false),lock=useRef(false)
  const [retry,setRetry]=useState(0),[notice,tell]=useState(''),[failure,fail]=useState('')
  const pane=useRef<HTMLDivElement>(null),lease=useRef(controller.libraryEpoch),live=useRef(true)
  useEffect(()=>{live.current=true;return ()=>{live.current=false;setBusy(false)}},[setBusy])
  const valid=()=>live.current&&controller.libraryEpoch===lease.current
  const epoch=controller.catalogEpoch,debounced=useDebounced(query),newName=useDebounced(name.trim())
  const catalog=useRead(useCallback((signal:AbortSignal)=>controller.api('/notes/catalog',{details:true},signal),[controller,epoch,retry]),'catalog')
  const status=useRead(useCallback((signal:AbortSignal)=>controller.api('/notes/tags',{action:'status'},signal),[controller,epoch,retry]),'status')
  const pending=status?.value?.receipt
  const unfinished=pending?.phase==='applying'||pending?.phase==='undoing'
  const tags=catalog?.value?.tags??[],source=selection||tags[0]?.tag||''
  const entry=tags.find(x=>x.tag===source),dest=mode==='rename'?newName:target
  const viewing=mode==='merge'&&side==='to'&&target?target:source
  const options=useMemo<NoteListOptions>(()=>({tag:viewing,currentOnly:true,limit:20,order,...(debounced&&{query:debounced}),...(book&&{notebookId:book==='default'?null:book}),
    ...(period&&{modifiedPeriod:period as 'month'|'before-month'}),...(files&&{hasFiles:true}),...(favorite&&{favorite:true}),...(pages.length&&{cursor:pages[pages.length-1]!})}),
    [viewing,debounced,order,book,period,files,favorite,pages])
  const list=useRead(useCallback((signal:AbortSignal)=>viewing?controller.api('/notes',options,signal):Promise.resolve(null),[controller,options,epoch,retry,viewing]),options)
  const rows=list?.value?.items??[],id=pinned??(lastRow?rows.at(-1):rows[0])?.noteId
  const detail=useRead(useCallback((signal:AbortSignal)=>id?controller.api('/notes/get',{noteId:id},signal):Promise.resolve(null),[controller,id,epoch,retry]),id)
  const note=detail?.value?.note
  const preview=useRead(useCallback((signal:AbortSignal)=>mode&&source&&(mode==='remove'||(dest&&dest!==source))
    ?controller.api('/notes/tags',{action:'preview',mode,source,target:mode==='remove'?null:dest},signal):Promise.resolve(null),[controller,mode,source,dest,epoch,retry]),JSON.stringify([mode,source,dest]))
  const impact=preview?.value?.preview
  const previewReady=impact&&(! (mode==='rename')||name.trim()===newName)
  const bookName=(id:string|null)=>state.notebooks.find(b=>id===null?b.isDefault:b.notebookId===id)?.current.title??t('notesDefaultBook')
  const rowAt=rows.findIndex(row=>row.noteId===id)
  const near=tags.find(x=>x.tag!==source&&foldTag(x.tag)===foldTag(source))
  const [directoryKey,newDirectory]=useState(0)
  const [spread,setSpread]=useState(false)
  const listElement=useRef<HTMLDivElement>(null)
  useEffect(()=>{if(pane.current)pane.current.scrollTop=0},[id])
  useEffect(()=>{if(listElement.current)listElement.current.scrollTop=0},[options])
  function first(){setPages([]);pin(null);setLastRow(false);setEdit(false);setAddition('')}
  function resetSearch(){setQuery('');setOrder('recent');setBook('');setPeriod('');setFiles(false);setFavorite(false);setFilters(false)}
  function end(){setMode(null);setTarget('');setSide('from');setName('');fail('')}
  function select(tag:string,keep=false){
    end();tell('');setSpread(false);setSelection(tag);resetSearch();first()
    if(keep&&id){pin(id);newDirectory(k=>k+1)}
  }
  function pick(tag:string){
    if(mode!=='merge'){select(tag);return}
    if(tag===source){setSide('from')}else{setTarget(tag);setSide('to')}
    first();fail('')
  }
  function begin(next:TagMode,keep=''){
    end();tell('');first();setMode(next);setTarget(keep);setSide(keep?'to':'from');setName(next==='rename'?source:'')
  }
  function flip(next:'from'|'to'){setSide(next);first()}
  function page(next:boolean,landOnLast=false){
    const cursor=list?.value?.cursor
    if(next&&!cursor)return
    setPages(old=>next?[...old,cursor!]:old.slice(0,-1));pin(null);setLastRow(landOnLast);setEdit(false);setAddition('')
  }
  function read(n:string){pin(n);setEdit(false);setAddition('')}
  async function mutate(fn:()=>Promise<void>){
    if(lock.current||!valid())return
    lock.current=true;work(true);setBusy(true);fail('')
    try{await fn()}catch(e){
      if(valid()){
        const code=e&&typeof e==='object'&&'code'in e?e.code:''
        fail(t(code==='note_edit_busy'?'windowEditBusy':code==='tag_changed'||code==='note_conflict'?'tagChanged':'tagFailed'))
      }
    }finally{if(valid()){setRetry(x=>x+1);work(false);setBusy(false)}lock.current=false}
  }
  async function batch(request:TagRequest){
    await mutate(async()=>{
      const r=(await controller.api('/notes/tags',request)).receipt
      if(!r||controller.libraryEpoch!==lease.current)return
      await controller.tagsChanged(r,request.action==='finish')
      if(!valid())return
      end();first();resetSearch()
      if(r.phase==='done'){
        setSelection(r.target??'');newDirectory(x=>x+1)
        tell(doneText(r,t))
      }else{setSelection('');tell(t('tagRestored'))}
    })
  }
  async function editTag(n:NoteView,tag:string,add:boolean){
    if(!tag||add&&n.current.tags.includes(tag))return
    pin(n.noteId)
    await mutate(async()=>{
      const ok=await controller.manage({action:add?'add-tags':'remove-tags',notes:[{noteId:n.noteId,expectedHeads:n.heads}],tags:[tag]})
      if(!ok)throw Object.assign(new Error(),{code:controller.getSnapshot().error})
      if(valid()){setAddition('');setPages([]);tell('')}
    })
  }
  const problem=catalog?.error||status?.error||list?.error||detail?.error||preview?.error
  return <fieldset disabled={working} className="class-workspace"><legend className="class-sr">{t('classTags')}</legend>
    <TagDirectory key={(mode==='merge'?'pick':'browse')+directoryKey} tags={tags} source={source} target={target} picking={mode==='merge'} t={t} pick={pick} onCancel={()=>{end();first()}} onSearch={()=>{if(target){setTarget('');flip('from')}}}/>
    <section className="class-center"><div className="class-context">
      <h2>{source?'# '+source:t('classDirectory')}</h2>
      {source&&<><div className="class-facts"><span>{t('notesBookCount',{count:entry?.count??0})}</span><button aria-expanded={spread} onClick={()=>setSpread(!spread)}>{t('classBooksCount',{count:entry?.books?.length??0})} ▾</button>
        {entry?.latest&&<small>{t('classLatest',{date:noteDateTime(entry.latest).slice(0,10)})}</small>}</div>
      {spread&&<div className="class-options">{entry?.books?.map(b=><button key={b.id??'default'} onClick={()=>{setBook(b.id??'default');setFilters(true);first()}}>{bookName(b.id)} · {b.count}</button>)}</div>}</>}
      {!source&&catalog?.value&&<p>{t('findNoTagMatch')}</p>}
      {(failure||problem)&&<div role="alert">{failure||t('tagFailed')} <button onClick={()=>{fail('');setRetry(x=>x+1)}}>{t('refresh')}</button></div>}
      {notice&&<p role="status">{notice}</p>}
      {unfinished&&pending&&<section role="status"><strong>{t('tagProgress',{done:pending.rows.filter(r=>r.completed).length,total:pending.rows.length})}</strong>
        <button onClick={()=>void batch({action:'resume',token:pending.token})}>{t('tagResume')}</button><button onClick={()=>void batch({action:'finish',token:pending.token})}>{t('tagFinish')}</button></section>}
      {!mode&&entry&&<div className="class-options">{(['rename','merge','remove'] as const).map(m=><button key={m} disabled={!!unfinished||!status?.value||(m==='merge'&&tags.length<2)} onClick={()=>begin(m)}>{t(labels[m])}</button>)}
        {near&&<button disabled={!!unfinished} onClick={()=>begin('merge',near.tag)}>{t('classCheckSimilar')}</button>}</div>}
      {mode&&<section className="class-action"><strong>{t(labels[mode])}「{source}」</strong>
        {mode==='rename'&&<input aria-label={t('tagNewName')} value={name} maxLength={200} onChange={e=>setName(e.target.value)}/>}
        {mode==='merge'&&(target?<><strong> → {t('classKeep')}「{target}」</strong><button onClick={()=>{setSelection(target);setTarget(source);flip('to')}}>{t('classSwap',{name:source})}</button></>:<small>{t('classPickHint')}</small>)}
        {previewReady&&<><p>{mode==='rename'&&impact.mode==='merge'&&t('tagCollision')}{t('tagImpact',{count:impact.rows.length,books:new Set(impact.rows.map(r=>r.notebookId)).size})}
          {impact.mode==='remove'?t('tagRemoveHint'):impact.mode==='merge'&&t('classOverlap',{both:impact.rows.filter(r=>r.before.includes(impact.target!)).length,total:impact.targetCount+impact.rows.filter(r=>!r.before.includes(impact.target!)).length,target:impact.target})}</p>
          <button className="class-primary" disabled={!!unfinished||!preview?.fresh} onClick={()=>void batch({action:'apply',mode:impact.mode,source:impact.source,target:impact.target,token:impact.token})}>{t(confirmLabels[impact.mode])}</button></>}
        <button onClick={()=>{end();first()}}>{t('cancel')}</button>
        {mode==='merge'&&target&&<div className="class-options">{(['from','to'] as const).map(s=><button key={s} aria-pressed={side===s} onClick={()=>flip(s)}>{t(s==='from'?'classFrom':'classKeep')} · {s==='from'?source:target} ({tags.find(row=>row.tag===(s==='from'?source:target))?.count??0})</button>)}</div>}
      </section>}
    </div><div className="class-search"><input type="search" aria-label={t('notesSearch')} placeholder={t('notesSearch')} value={query} onChange={e=>{const val=e.target.value;if(!query.trim()&&val.trim())setOrder('relevance');if(!val.trim()&&order==='relevance')setOrder('recent');setQuery(val);first()}}/>
      <div className="class-options"><button aria-expanded={filters} onClick={()=>setFilters(!filters)}>{t('findFilters')} ▾</button><select aria-label={t('paperSort')} value={order} onChange={e=>{setOrder(e.target.value as NoteOrder);first()}}>{(Object.keys(orderLabels) as NoteOrder[]).filter(o=>o!=='relevance'||query.trim()).map(o=><option key={o} value={o}>{t(orderLabels[o])}</option>)}</select></div>
      {filters&&<div className="class-options"><select aria-label={t('notesNotebook')} value={book} onChange={e=>{setBook(e.target.value);first()}}><option value="">{t('classAllBooks')}</option>{(entry?.books?.some(b=>b.id===null))&&<option value="default">{t('notesDefaultBook')}</option>}{state.notebooks.filter(b=>b.current.status==='active').map(b=><option key={b.notebookId} value={b.notebookId}>{b.current.title}</option>)}</select>
        <select aria-label={t('findModified')} value={period} onChange={e=>{setPeriod(e.target.value);first()}}><option value="">{t('findTimeAny')}</option><option value="month">{t('findThisMonth')}</option><option value="before-month">{t('findBeforeMonth')}</option></select>
        <label><input type="checkbox" checked={files} onChange={e=>{setFiles(e.target.checked);first()}}/>{t('findFilesOnly')}</label><label><input type="checkbox" checked={favorite} onChange={e=>{setFavorite(e.target.checked);first()}}/>{t('findFavorites')}</label></div>}
    </div><div ref={listElement} className="class-rows">{rows.map(row=><button key={row.noteId} aria-pressed={row.noteId===id} onClick={()=>read(row.noteId)}><strong><Highlight value={row.title||t('notesUntitled')} query={debounced}/></strong><span><Highlight value={row.excerpt||row.summary} query={debounced}/></span><small>{bookName(row.notebookId)} · {noteDateTime(row.savedAt).slice(0,10)}</small></button>)}
      {list?.value&&!rows.length&&<p>{t('notesEmpty')}</p>}</div>
      <footer><span>{t('notesBookCount',{count:list?.value?.total??rows.length})}</span><button disabled={!pages.length} aria-label={t('classPrevPage')} onClick={()=>page(false)}>‹</button><span>{pages.length+1}</span><button disabled={!list?.value?.cursor} aria-label={t('classNextPage')} onClick={()=>page(true)}>›</button></footer>
    </section><section className="class-reader"><header><span>{t('classReading')}</span><small>{note&&rowAt<0&&list?.value&&t('classOutside')}</small><button disabled={rowAt<=0&&!pages.length} aria-label={t('classPrevNote')} onClick={()=>rowAt>0?read(rows[rowAt-1]!.noteId):page(false,true)}>↑</button>
      <button disabled={rowAt+1>=rows.length&&!list?.value?.cursor} aria-label={t('classNextNote')} onClick={()=>rowAt+1<rows.length?read(rows[rowAt+1]!.noteId):page(true)}>↓</button></header>
      <div className="class-paper" ref={pane}>{note?<article className="paper-reading"><small>{bookName(note.effectiveNotebookId)} · {noteDateTime(note.savedAt)}</small><h2>{note.current.title||t('notesUntitled')}</h2>
        <div className="class-chips">{note.current.tags.map(tag=><button key={tag} aria-pressed={!edit&&tag===viewing} onClick={()=>edit?void editTag(note,tag,false):mode==='merge'?pick(tag):select(tag,true)}>#{tag}{edit?' ×':''}</button>)}<button onClick={()=>{pin(note.noteId);setEdit(!edit);setAddition('')}}>{t(edit?'classDone':'classEditThis')}</button></div>
        {edit&&<form className="class-options" onSubmit={e=>{e.preventDefault();void editTag(note,addition.trim(),true)}}><input list="class-existing-tags" aria-label={t('notesAddTag')} value={addition} maxLength={200} onChange={e=>setAddition(e.target.value)}/><datalist id="class-existing-tags">{tags.filter(r=>!note.current.tags.includes(r.tag)).map(r=><option key={r.tag} value={r.tag}/>)}</datalist><button disabled={!addition.trim()||note.current.tags.includes(addition.trim())}>{t('notesAddTag')}</button></form>}
        {previewReady&&note.current.tags.includes(source)&&<p className="class-delta">{t('classNoteChange')}　<del>#{source}</del> {impact.target?' → #'+impact.target:t('tagRemove')}</p>}
        <ReadingSummary summary={note.current.summary} t={t}/><ReadingBody note={note} t={t} onNoteLink={read}/>
      </article>:<p>{id?t('loading'):t('classPickNote')}</p>}</div></section>
  </fieldset>
}
function doneText(r:TagReceipt,t:T){
  return t(r.mode==='remove'?'classRemoved':r.mode==='rename'?'classRenamed':'classMerged',{source:r.source,target:r.target,count:r.rows.length})
}
