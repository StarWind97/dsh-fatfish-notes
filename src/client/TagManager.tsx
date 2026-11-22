import * as React from 'react'
import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import type {NoteListOptions,NoteOrder,NoteView} from '../contracts/notes.js'
import type {TagMode,TagRequest,TagReceipt} from '../contracts/tag-management.js'
import type {NotesController,NotesState} from './notes-controller.js'
import type {T} from './locale.js'
import {ArrowRight,ArrowLeftRight,Search,GitMerge,Tag as TagIcon,PencilLine,FileCheck2,ScanSearch} from 'lucide-react'
import {TagDirectory} from './TagDirectory.js'
import {similarCandidates} from './tag-similarity.js'
import {ReadingBody,ReadingSummary} from './NoteReading.js'
import {noteDateTime} from '../notes/date.js'
import {notebookTitle} from '../notes/notebooks.js'
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
  const [pinned,pin]=useState<string|null>(null),[listVersion,resetList]=useState(0)
  const revealRow=useRef(false)
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
  const keepEntry=tags.find(x=>dest&&x.tag===dest&&x.tag!==source)
  const showTarget=side==='to'&&!!keepEntry&&(mode==='merge'||(mode==='rename'&&dest===name.trim()))
  const viewing=showTarget?keepEntry!.tag:source
  const options=useMemo<NoteListOptions>(()=>({tag:viewing,currentOnly:true,limit:50,order,...(debounced&&{query:debounced}),...(book&&{notebookId:book==='default'?null:book}),
    ...(period&&{modifiedPeriod:period as 'month'|'before-month'}),...(files&&{hasFiles:true}),...(favorite&&{favorite:true})}),
    [viewing,debounced,order,book,period,files,favorite,listVersion])
  // Refresh the already visible range when background sync changes the catalog.
  const visibleRange=useRef<{options:NoteListOptions;limit:number}|null>(null)
  const list=useRead(useCallback(async(signal:AbortSignal)=>{
    if(!viewing)return null
    const wanted=visibleRange.current?.options===options?visibleRange.current.limit:50
    const result=await controller.api('/notes',options,signal)
    while(result.cursor&&result.items.length<wanted){
      const next=await controller.api('/notes',{...options,cursor:result.cursor},signal)
      result.items.push(...next.items);result.cursor=next.cursor
    }
    return result
  },[controller,options,epoch,retry,viewing]),options)
  const base=list?.value
  const [more,setMore]=useState<{base:NonNullable<typeof base>,items:NonNullable<typeof base>['items'],cursor:string|null}>()
  const appended=more?.base===base?more:undefined
  const rows=appended?.items??base?.items??[]
  const cursor=appended?appended.cursor:base?.cursor
  const id=pinned??rows[0]?.noteId
  const inFlight=useRef<AbortController|null>(null)
  const [loadingMore,setLoadingMore]=useState(false),[moreError,setMoreError]=useState(false)
  React.useLayoutEffect(()=>{
    setLoadingMore(false);setMoreError(false)
    return ()=>{inFlight.current?.abort();inFlight.current=null}
  },[base,options,epoch,retry])
  useEffect(()=>{setMore(undefined)},[base])
  const detail=useRead(useCallback((signal:AbortSignal)=>id?controller.api('/notes/get',{noteId:id},signal):Promise.resolve(null),[controller,id,epoch,retry]),id)
  const note=detail?.value?.note
  const preview=useRead(useCallback((signal:AbortSignal)=>mode&&source&&(mode==='remove'||(dest&&dest!==source))
    ?controller.api('/notes/tags',{action:'preview',mode,source,target:mode==='remove'?null:dest},signal):Promise.resolve(null),[controller,mode,source,dest,epoch,retry]),JSON.stringify([mode,source,dest]))
  const impact=preview?.value?.preview
  const previewReady=impact&&(! (mode==='rename')||name.trim()===newName)
  const bookName=(id:string|null)=>{const book=state.notebooks.find(b=>id===null?b.isDefault:b.notebookId===id);return book?notebookTitle(book,t):t('notesDefaultBook')}
  const rowAt=rows.findIndex(row=>row.noteId===id)
  const near=useMemo(()=>similarCandidates(tags,source,t),[tags,source,t])
  const effectiveMode=mode==='rename'&&dest===name.trim()?(previewReady?impact.mode:keepEntry?'merge':'rename'):mode
  const OpIcon=effectiveMode==='merge'?GitMerge:effectiveMode==='rename'?PencilLine:TagIcon
  const count=previewReady?impact.rows.length:entry?.count??0
  const bookCount=useMemo(()=>previewReady?new Set(impact.rows.map(row=>row.notebookId)).size:entry?.books?.length??0,[previewReady,impact,entry])
  const overlap=previewReady&&impact.target?impact.rows.filter(row=>row.before.includes(impact.target!)).length:0
  const union=previewReady?impact.targetCount+count-overlap:0
  const scopes:{side:'from'|'to';label:string;tag:string;count:number;active:boolean}[]=[{side:'from',label:effectiveMode==='merge'?t('classFromReview'):t('classAffected'),tag:source,count,active:!showTarget}]
  if(effectiveMode==='merge'&&keepEntry)scopes.push({side:'to',label:t('classToReview'),tag:keepEntry.tag,count:keepEntry.count,active:showTarget})

  const [directoryKey,newDirectory]=useState(0)
  const [spread,setSpread]=useState(false)
  const listElement=useRef<HTMLDivElement>(null)
  useEffect(()=>{if(pane.current)pane.current.scrollTop=0},[id])
  useEffect(()=>{if(listElement.current)listElement.current.scrollTop=0},[options])
  function first(){resetList(n=>n+1);pin(null);setEdit(false);setAddition('')}
  function resetSearch(){setQuery('');setOrder('recent');setBook('');setPeriod('');setFiles(false);setFavorite(false);setFilters(false)}
  function end(){setMode(null);setTarget('');setSide('from');setName('');fail('')}
  function select(tag:string,keep=false){
    end();tell('');setSpread(false);setSelection(tag);resetSearch();first()
    if(keep&&id){pin(id);newDirectory(k=>k+1)}
  }
  function pick(tag:string,inspect=false){
    if(mode!=='merge'){select(tag);return}
    if(tag!==source)setTarget(tag)
    setSide(inspect&&tag!==source?'to':'from')
    first();fail('')
  }
  function begin(next:TagMode,keep=''){
    end();tell('');resetSearch();first();setMode(next);setTarget(keep);setSide('from');setName(next==='rename'?source:'')
  }
  function flip(next:'from'|'to'){setSide(next);resetSearch();first()}
  async function loadMore(openNext=false){
    if(!base||!cursor||inFlight.current||!list?.fresh)return
    const request=new AbortController()
    inFlight.current=request;setLoadingMore(true);setMoreError(false)
    try{
      const next=await controller.api('/notes',{...options,cursor},request.signal)
      if(request.signal.aborted||!valid())return
      const seen=new Set(rows.map(row=>row.noteId))
      const extra=next.items.filter(row=>!seen.has(row.noteId))
      visibleRange.current={options,limit:rows.length+extra.length}
      setMore({base,items:[...rows,...extra],cursor:next.cursor})
      if(openNext&&extra[0]){revealRow.current=true;read(extra[0].noteId)}
    }catch{if(!request.signal.aborted)setMoreError(true)}
    finally{if(inFlight.current===request){inFlight.current=null;setLoadingMore(false)}}
  }
  function step(index:number){
    if(index===rows.length){void loadMore(true);return}
    if(rows[index]){revealRow.current=true;read(rows[index].noteId)}
  }
  useEffect(()=>{if(revealRow.current){revealRow.current=false;listElement.current?.querySelector('[aria-pressed=true]')?.scrollIntoView({block:'nearest'})}},[id])
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
      if(valid()){setAddition('');resetList(n=>n+1);tell('')}
    })
  }
  const problem=catalog?.error||status?.error||list?.error||detail?.error||preview?.error
  return <fieldset disabled={working} className="class-workspace"><legend className="class-sr">{t('classTags')}</legend>
    <TagDirectory key={(mode==='merge'?'pick':'browse')+directoryKey} tags={tags} similar={near} source={source} target={target} picking={mode==='merge'} t={t} pick={pick} onCancel={()=>{end();first()}} onSearch={()=>{if(target){setTarget('');flip('from')}}}/>
    <section className="class-center" data-reviewing={!!mode}><div className="class-context">
      {!mode&&<h2>{source?'# '+source:t('classDirectory')}</h2>}
      {source&&!mode&&<><div className="class-facts"><span>{t('notesBookCount',{count:entry?.count??0})}</span><button aria-expanded={spread} onClick={()=>setSpread(!spread)}>{t('classBooksCount',{count:entry?.books?.length??0})} ▾</button>
        {entry?.latest&&<small>{t('classLatest',{date:noteDateTime(entry.latest).slice(0,10)})}</small>}</div>
      {spread&&<div className="class-options">{entry?.books?.map(b=><button key={b.id??'default'} onClick={()=>{setBook(b.id??'default');setFilters(true);first()}}>{bookName(b.id)} · {b.count}</button>)}</div>}</>}
      {!source&&catalog?.value&&<p>{t('findNoTagMatch')}</p>}
      {(failure||problem)&&<div role="alert">{failure||t('tagFailed')} <button onClick={()=>{fail('');setRetry(x=>x+1)}}>{t('refresh')}</button></div>}
      {notice&&<p role="status">{notice}</p>}
      {unfinished&&pending&&<section role="status"><strong>{t('tagProgress',{done:pending.rows.filter(r=>r.completed).length,total:pending.rows.length})}</strong>
        <button onClick={()=>void batch({action:'resume',token:pending.token})}>{t('tagResume')}</button><button onClick={()=>void batch({action:'finish',token:pending.token})}>{t('tagFinish')}</button></section>}
      {!mode&&entry&&<div className="class-options">{(['rename','merge','remove'] as const).map(m=><button key={m} disabled={!!unfinished||!status?.value||(m==='merge'&&tags.length<2)} onClick={()=>begin(m)}>{t(labels[m])}</button>)}
        {near.length>0&&<button className="check-similar" disabled={!!unfinished} onClick={()=>begin('merge',near.length===1?near[0]?.entry.tag??'':'')}><ScanSearch size={14}/>{t('classCheckSimilar')}</button>}</div>}
      {mode&&<section className="class-action operation" data-operation={effectiveMode} aria-labelledby="operation-title">
        <header className="op-heading"><OpIcon size={18} aria-hidden="true"/><h2 id="operation-title">{effectiveMode==='merge'?t('classMergeHeading'):mode==='rename'?t('classRenameHeading'):t('tagRemove')}</h2></header>
        <div className="op-names" data-single={mode==='remove'}>
          <div className="op-field"><small>{mode==='rename'?t('classOldName'):mode==='remove'?t('classWillRemove'):t('classSourceName')}</small><strong><i aria-hidden="true">#</i>{source}</strong></div>
          {mode!=='remove'&&<><div className="op-direction">{mode==='merge'&&target?<button type="button" aria-label={t('classSwapDirection')} title={t('classSwapDirection')} onClick={()=>{setSelection(target);setTarget(source);flip('from')}}><ArrowLeftRight size={18}/></button>:<ArrowRight size={18} aria-hidden="true"/>}</div>
            {mode==='rename'?<label className="op-field"><small>{effectiveMode==='merge'?t('classExistingName'):t('tagNewName')}</small><input aria-label={t('tagNewName')} maxLength={200} autoFocus value={name} onFocus={e=>e.target.select()} onChange={e=>{setName(e.target.value);if(side==='to')flip('from')}}/></label>:
            <div className="op-field"><small>{t('classKeepName')}</small>{target?<strong><i aria-hidden="true">#</i>{target}</strong>:<button type="button" className="pick-target" onClick={()=>listElement.current?.closest('.class-workspace')?.querySelector<HTMLInputElement>('.class-directory input[type=search]')?.focus()}><Search size={14}/>{t('classPickLeft')}</button>}</div>}</>}
        </div>
        <div className="op-decision">
        <div className="op-impact" aria-label={t('classImpact')} aria-live="polite">
          <div className="op-impact-line"><span>{t('classImpact')}</span><strong>{count} <small>{t('classNoteUnit')}</small></strong><span className="impact-rule" aria-hidden="true"></span><strong>{bookCount} <small>{t('classBookUnit')}</small></strong></div>
          {effectiveMode==='merge'&&previewReady&&impact?<div className="merge-result">{t('classSharedNotes',{count:overlap})}<span aria-hidden="true"> · </span>{t('classMergeTotal',{count:union})}</div>:null}
        {mode==='remove'&&<p className="op-consequence"><FileCheck2 size={15}/>{t('classKeepBody')}</p>}
        {mode==='rename'&&effectiveMode==='merge'&&<p className="op-consequence"><GitMerge size={15}/>{t('classCollisionHint')}</p>}
          </div>
        <div className="op-buttons"><button onClick={()=>{end();first()}}>{t('cancel')}</button><button className="class-primary" disabled={!!unfinished||!previewReady||!preview?.fresh} onClick={()=>{if(previewReady&&impact)void batch({action:'apply',mode:impact.mode,source:impact.source,target:impact.target,token:impact.token})}}>{t(confirmLabels[effectiveMode??mode])}</button></div>
        </div>
      </section>}
    </div><div className="class-search"><input type="search" aria-label={t('notesSearch')} placeholder={t('notesSearch')} value={query} onChange={e=>{const val=e.target.value;if(!query.trim()&&val.trim())setOrder('relevance');if(!val.trim()&&order==='relevance')setOrder('recent');setQuery(val);first()}}/>
      <div className="class-options list-tools"><button aria-expanded={filters} onClick={()=>setFilters(!filters)}>{t('findFilters')} ▾</button><select aria-label={t('paperSort')} value={order} onChange={e=>{setOrder(e.target.value as NoteOrder);first()}}>{(Object.keys(orderLabels) as NoteOrder[]).filter(o=>o!=='relevance'||query.trim()).map(o=><option key={o} value={o}>{t(orderLabels[o])}</option>)}</select></div>
      {filters&&<div className="class-options extra-filters"><select aria-label={t('notesNotebook')} value={book} onChange={e=>{setBook(e.target.value);first()}}><option value="">{t('classAllBooks')}</option>{(entry?.books?.some(b=>b.id===null))&&<option value="default">{t('notesDefaultBook')}</option>}{state.notebooks.filter(b=>b.current.status==='active').map(b=><option key={b.notebookId} value={b.notebookId}>{notebookTitle(b,t)}</option>)}</select>
        <select aria-label={t('findModified')} value={period} onChange={e=>{setPeriod(e.target.value);first()}}><option value="">{t('findTimeAny')}</option><option value="month">{t('findThisMonth')}</option><option value="before-month">{t('findBeforeMonth')}</option></select>
        <label><input type="checkbox" checked={files} onChange={e=>{setFiles(e.target.checked);first()}}/>{t('findFilesOnly')}</label><label><input type="checkbox" checked={favorite} onChange={e=>{setFavorite(e.target.checked);first()}}/>{t('findFavorites')}</label></div>}
    </div>{mode&&<div className="linked-scope">
      <div role="tablist" aria-label={t('classReviewNotes')} className="scope-tabs" onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=Array.from(e.currentTarget.querySelectorAll('button'));const next=tabs.length===1?0:e.key==='Home'?0:e.key==='End'?1:e.target===tabs[0]?1:0;tabs[next]?.focus();tabs[next]?.click()}}>
        {scopes.map(s=><button key={s.side} type="button" role="tab" aria-label={s.label+' · #'+s.tag+' · '+t('notesBookCount',{count:s.count})} title={s.label+' · #'+s.tag} tabIndex={s.active?0:-1} aria-selected={s.active} aria-controls="operation-notes" id={'scope-'+s.side} onClick={()=>{if(!s.active)flip(s.side);else listElement.current?.focus({preventScroll:true})}}><span>{s.side==='to'?t('classKeep'):effectiveMode==='merge'?t('classFrom'):t('classAffected')}</span><strong>#{s.tag}</strong><b>{s.count}</b></button>)}
      </div>
    </div>}<div ref={listElement} className="class-rows" id="operation-notes" tabIndex={-1} role={mode?'tabpanel':undefined} aria-labelledby={mode?'scope-'+(showTarget?'to':'from'):undefined}>{rows.map(row=><button key={row.noteId} aria-pressed={row.noteId===id} onClick={()=>read(row.noteId)}><strong><Highlight value={row.title||t('notesUntitled')} query={debounced}/></strong><span><Highlight value={row.excerpt||row.summary} query={debounced}/></span><small>{bookName(row.notebookId)} · {noteDateTime(row.savedAt).slice(0,10)}</small></button>)}
      {list?.value&&!rows.length&&<p>{t('notesEmpty')}</p>}
      {moreError&&<p role="alert">{t('notesListFailed')}</p>}{cursor&&<button className="class-load-more" disabled={loadingMore||!list?.fresh} onClick={()=>void loadMore()}>{t(loadingMore?'loading':'notesMore')}</button>}</div>
      {(debounced||book||period||files||favorite)&&base&&<footer><span>{t('notesBookCount',{count:base.total??rows.length})}</span></footer>}
    </section><section className="class-reader"><header><span>{t('classReading')}</span><small>{note&&rowAt<0&&list?.value&&t('classOutside')}</small><button disabled={rowAt<=0||loadingMore} aria-label={t('classPrevNote')} onClick={()=>step(rowAt-1)}>↑</button>
      <button disabled={loadingMore||(rowAt+1>=rows.length&&!cursor)} aria-label={t('classNextNote')} onClick={()=>step(rowAt+1)}>↓</button></header>
      <div className="class-paper" ref={pane}>{note?<article className="paper-reading"><small>{bookName(note.effectiveNotebookId)} · {noteDateTime(note.savedAt)}</small><h2>{note.current.title||t('notesUntitled')}</h2>
        <div className="class-chips">{note.current.tags.map(tag=><button key={tag} aria-pressed={!edit&&tag===viewing} onClick={()=>edit?void editTag(note,tag,false):mode==='merge'?pick(tag,true):select(tag,true)}>#{tag}{edit?' ×':''}</button>)}<button onClick={()=>{pin(note.noteId);setEdit(!edit);setAddition('')}}>{t(edit?'classDone':'classEditThis')}</button></div>
        {edit&&<form className="class-options" onSubmit={e=>{e.preventDefault();void editTag(note,addition.trim(),true)}}><input list="class-existing-tags" aria-label={t('notesAddTag')} value={addition} maxLength={200} onChange={e=>setAddition(e.target.value)}/><datalist id="class-existing-tags">{tags.filter(r=>!note.current.tags.includes(r.tag)).map(r=><option key={r.tag} value={r.tag}/>)}</datalist><button disabled={!addition.trim()||note.current.tags.includes(addition.trim())}>{t('notesAddTag')}</button></form>}
        {mode&&<section className="class-delta note-impact" aria-label={t('classNoteChange')}>
          <div><TagIcon size={14}/><strong>{note.current.tags.includes(source)?t('classNoteChange'):t('classUnchanged')}</strong></div>
          {note.current.tags.includes(source)?<>
            <p>{mode==='remove'?t('classWillDrop'):previewReady?t('classWillReplace'):mode==='rename'?t('classEnterName'):t('classAwaitTarget')}</p>
            <div className="delta-path"><span className={previewReady?'old-name':''}>#{source}</span>{previewReady&&impact.target&&<><ArrowRight size={14}/><span className="new-name">#{impact.target}</span></>}</div>
            {previewReady&&effectiveMode==='merge'&&note.current.tags.includes(impact.target!)&&<small>{t('classOneAfter')}</small>}
          </>:<p>{note.current.tags.includes(dest)?t('classKeptOnly',{name:dest}):t('classOutsideImpact')}</p>}
        </section>}
        <ReadingSummary summary={note.current.summary} t={t}/><ReadingBody note={note} t={t} onNoteLink={read}/>
      </article>:<p>{id?t('loading'):t('classPickNote')}</p>}</div></section>
  </fieldset>
}
function doneText(r:TagReceipt,t:T){
  return t(r.mode==='remove'?'classRemoved':r.mode==='rename'?'classRenamed':'classMerged',{source:r.source,target:r.target,count:r.rows.length})
}
