import * as React from 'react'
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownUp, ChevronRight, ChevronUp, Filter, Search, X } from 'lucide-react'
import type { NoteCatalog, NoteListOptions, NoteOrder, TagEntry } from '../contracts/notes.js'
import type { NotesController } from './notes-controller.js'
import type { LocaleKey, T } from './locale.js'

export type SearchFacets = Pick<NoteListOptions,'tag'|'modifiedPeriod'|'hasFiles'>
export type SearchView = 'all' | 'favorites' | 'visits'

export function readSearchFacets({tag,modifiedPeriod,hasFiles}: NoteListOptions): SearchFacets {
  return {...(tag && {tag}), ...(modifiedPeriod && {modifiedPeriod}), ...(hasFiles && {hasFiles:true})}
}

export function replaceSearchFacets(filter: NoteListOptions, facets: SearchFacets): NoteListOptions {
  const {tag,modifiedPeriod,hasFiles,...list} = filter
  return {...list,...facets}
}

type ControlsProps = {
  controller: NotesController
  filter: NoteListOptions
  query: string
  expanded: boolean
  t: T
  onQuery: (query: string) => void
  onExpanded: (expanded: boolean) => void
  onFacets: (facets: SearchFacets) => void
  manage?: () => void
  children: React.ReactNode
}

export function SearchControls({controller,filter,query,expanded,t,onQuery,onExpanded,onFacets,manage,children}: ControlsProps) {
  const panel = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const facets = readSearchFacets(filter)
  const active: {key:keyof SearchFacets; label:string; remove:string}[] = []
  if (facets.tag) active.push({key:'tag',label:'#'+facets.tag,remove:t('notesClearTag',{tag:facets.tag})})
  if (facets.modifiedPeriod) active.push({key:'modifiedPeriod',label:t(facets.modifiedPeriod==='month'?'findThisMonth':'findBeforeMonth'),remove:t('findRemove',{name:t('findModified')})})
  if (facets.hasFiles) active.push({key:'hasFiles',label:t('findWithFiles'),remove:t('findRemove',{name:t('findWithFiles')})})
  function close() {
    onExpanded(false)
    trigger.current?.focus({preventScroll:true})
  }
  function clear(key?: keyof SearchFacets) {
    const next = key ? {...facets} : {}
    if (key) delete next[key]
    onFacets(next)
    trigger.current?.focus({preventScroll:true})
  }
  return <div className="paper-search-controls">
    <div className="paper-search-row">
      <label className="paper-search"><Search size={15} aria-hidden="true"/>
        <input aria-label={t('notesSearch')} type="search" placeholder={t('notesSearch')} value={query} onChange={event=>onQuery(event.target.value)}/>
      </label>
      <button ref={trigger} className="paper-search-toggle" type="button" aria-label={t('findFilters')}
        title={active.length?t('findFiltersActive',{count:active.length}):t('findFilters')} aria-controls={panel} aria-expanded={expanded}
        data-active={active.length>0} onClick={()=>expanded?close():onExpanded(true)}>
        <Filter size={14} aria-hidden="true"/>{t('findShort')}{active.length>0&&<b>{active.length}</b>}
      </button>
    </div>
    {children}
    {!!active.length&&<div className="paper-search-chips">
      {active.map(({key,label,remove})=><button className="paper-filter-chip" key={key} type="button" aria-label={remove} onClick={()=>clear(key)}>
        <span>{label}</span><X size={12} aria-hidden="true"/>
      </button>)}
      {active.length>1&&<button className="paper-filter-text" type="button" onClick={()=>clear()}>{t('findClear')}</button>}
    </div>}
    {expanded&&<SearchFilterPanel id={panel} controller={controller} facets={facets} t={t} onFacets={onFacets} close={close} {...(manage&&{manage})}/>}
  </div>
}

type Catalog = {controller: NotesController; library: number; epoch: number; tags: NoteCatalog['tags']}
const cachedCatalogs = new WeakMap<NotesController,Catalog>()

function SearchTagContent({tag,count}:TagEntry) {
  return <><span>#{tag}</span><small>{count}</small></>
}

function SearchFilterPanel({id,controller,facets,t,onFacets,close,manage}: Pick<ControlsProps,'controller'|'t'|'onFacets'|'manage'> & {
  id: string; facets: SearchFacets; close: () => void
}) {
  const [attempt,retry] = useState(0)
  const [failure,fail] = useState<{controller: NotesController; library: number; epoch: number; attempt: number}>()
  const [draft,setDraft] = useState('')
  const [all,setAll] = useState(false)
  const [loaded,setLoaded] = useState<Catalog>()
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null), probe = useRef<HTMLDivElement>(null)
  const [commonCount,setCommonCount] = useState(0)
  const library = controller.libraryEpoch, epoch = controller.catalogEpoch
  const entry = cachedCatalogs.get(controller) ?? loaded
  const tags = entry?.controller===controller&&entry.library===library&&entry.epoch===epoch ? entry.tags : undefined
  const failed = failure?.controller===controller && failure.library===library && failure.epoch===epoch && failure.attempt===attempt
  useEffect(()=>{
    if (tags) return
    const request = new AbortController()
    void controller.api('/notes/catalog',undefined,request.signal).then(result=>{
      if (request.signal.aborted || controller.libraryEpoch!==library || controller.catalogEpoch!==epoch) return
      const catalog = {controller,library,epoch,tags:result.tags}
      cachedCatalogs.set(controller,catalog)
      setLoaded(catalog)
    }).catch(()=>{if(!request.signal.aborted)fail({controller,library,epoch,attempt})})
    return ()=>request.abort()
  },[controller,library,epoch,attempt,tags])
  const directory = useMemo(()=>[...(tags??[])].sort((a,b)=>a.tag.localeCompare(b.tag,'zh-CN',{numeric:true})),[tags])
  const measureChips = useMemo(()=>tags?.map(entry=><span key={entry.tag} className="paper-search-tag">
    <SearchTagContent {...entry}/>
  </span>),[tags])

  useLayoutEffect(()=>{
    const sample = probe.current
    if(!sample||!tags?.length)return
    const pane = sample.closest<HTMLElement>('.paper-list,.conversation-notes')
    function measure() {
      if(!sample?.clientWidth)return
      const rowLimit = (pane?.clientHeight??window.innerHeight)<=640 ? 2 : 3
      let rows = 0, previousTop = -1, count = 0
      // Read the rows formed by the browser, including the actual font and tag lengths.
      for(const child of sample.children as HTMLCollectionOf<HTMLElement>){
        if(child.offsetTop!==previousTop){
          if(++rows>rowLimit)break
          previousTop=child.offsetTop
        }
        count++
      }
      const visible = list.current, active = document.activeElement
      if(active&&visible?.dataset.directory==='false'&&Array.from(visible.children).indexOf(active)>=count)
        input.current?.focus({preventScroll:true})
      setCommonCount(count)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(sample)
    if(pane)observer.observe(pane)
    document.fonts?.addEventListener('loadingdone',measure)
    return ()=>{
      observer.disconnect()
      document.fonts?.removeEventListener('loadingdone',measure)
    }
  },[tags])

  const common = tags?.slice(0,commonCount)??[]
  const term = draft.trim().toLocaleLowerCase()
  const showDirectory = !!term||all
  const candidates = term ? directory.filter(entry=>entry.tag.toLocaleLowerCase().includes(term)) : all ? directory : common
  function choose(tag: string) {
    const next = {...facets}
    if (tag===next.tag) delete next.tag
    else next.tag = tag
    if (term && !all && !common.some(entry=>entry.tag===tag)) input.current?.focus()
    setDraft('')
    onFacets(next)
  }
  return <section id={id} className="paper-search-filter-panel" aria-label={t('findFilters')} onKeyDown={event=>{
    if(event.key==='Escape'&&!event.nativeEvent.isComposing){event.preventDefault();event.stopPropagation();close()}
  }}>
    <header><strong>{t('findShort')}</strong><button className="paper-filter-text" type="button" onClick={close}><ChevronUp size={14}/>{t('findCollapse')}</button></header>
    <div className="paper-filter-options">
      <label>{t('findModified')} <select aria-label={t('findModified')} value={facets.modifiedPeriod??''} onChange={event=>{
        const next = {...facets}, period = event.target.value
        if (period==='month'||period==='before-month') next.modifiedPeriod = period
        else delete next.modifiedPeriod
        onFacets(next)
      }}><option value="">{t('findTimeAny')}</option><option value="month">{t('findThisMonth')}</option><option value="before-month">{t('findBeforeMonth')}</option></select></label>
      <label><input type="checkbox" checked={!!facets.hasFiles} onChange={event=>{
        const next = {...facets}
        if (event.target.checked) next.hasFiles = true
        else delete next.hasFiles
        onFacets(next)
      }}/>{t('findWithFiles')}</label>
    </div>
    <label className="paper-tag-search"><Search size={13} aria-hidden="true"/>
      <input ref={input} type="search" aria-label={t('findTagName')} placeholder={t('findTagName')} value={draft}
        onChange={event=>{setDraft(event.target.value);if(list.current)list.current.scrollTop=0}}
        onKeyDown={event=>{
          if(event.key==='Enter'&&!event.nativeEvent.isComposing&&term&&candidates[0]){event.preventDefault();choose(candidates[0].tag)}
        }}/>
    </label>
    {tags ? <>
      <div className="paper-tag-heading">
        <span title={t('findTagCountsScope')}>{term?t('findTagCount',{count:candidates.length}):t(all?'findAllByName':'findCommonTags')}</span>
        {(all||tags.length>commonCount)&&!term&&<button className="paper-filter-text" type="button" onClick={()=>{
          setAll(!all);if(list.current)list.current.scrollTop=0
        }}>{all?t('findCommonOnly'):t('findAllTags',{count:tags.length})}</button>}
      </div>
      <div className="paper-search-tag-layout">
        <div className="paper-search-tag-measure" aria-hidden="true">
          <div ref={probe} className="paper-search-tag-probe">{measureChips}</div>
        </div>
        {candidates.length>0?<div ref={list} className="paper-search-tag-choices" data-directory={showDirectory}
          aria-label={t('findTagCountsScope')}>
          {candidates.map(entry=><button key={entry.tag} className="paper-search-tag" type="button" data-tag={entry.tag}
            title={entry.tag} aria-pressed={facets.tag===entry.tag} onClick={()=>choose(entry.tag)}>
            <SearchTagContent {...entry}/>
          </button>)}
        </div>:(!tags.length||showDirectory)&&<small role="status">{t(term?'findNoTagMatch':'findNoTags')}</small>}
      </div>
    </>:<small role="status">{t(failed?'findCatalogFailed':'loading')} {failed&&<button className="paper-filter-text" type="button" onClick={()=>retry(n=>n+1)}>{t('noteRetry')}</button>}</small>}
    {manage&&<div className="paper-filter-management"><button className="paper-filter-text" type="button" onClick={manage}>{t('tagEntry')}<ChevronRight size={12} aria-hidden="true"/></button></div>}
  </section>
}

export const hitLabels = {title:'findHitTitle',file:'findHitFile',tag:'findHitTag',summary:'findHitSummary',body:'findHitBody'} as const
const orderLabels = {recent:'classModifiedDesc',oldest:'classModifiedAsc','created-recent':'classCreatedDesc','created-oldest':'classCreatedAsc',
  'title-asc':'classTitleAsc','title-desc':'classTitleDesc',relevance:'findRank'} satisfies Record<NoteOrder,LocaleKey>

export function SearchOrderPicker({value,query,onChange,t}: {value:NoteOrder;query:string;onChange:(order:NoteOrder)=>void;t:T}) {
  return <label className="paper-order"><ArrowDownUp size={14} aria-hidden="true"/>
    <select aria-label={t('paperSort')} value={value} onChange={event=>onChange(event.target.value as NoteOrder)}>
      {(Object.keys(orderLabels) as NoteOrder[]).filter(key=>key!=='relevance'||query.trim()).map(key=><option key={key} value={key}>{t(orderLabels[key])}</option>)}
    </select>
  </label>
}

export function SearchViewPicker({view,onChange,t}: {view:SearchView;onChange:(view:SearchView)=>void;t:T}) {
  const choices: [SearchView, LocaleKey][] = [['all','findAllView'],['favorites','findFavorites'],['visits','findRecent']]
  return <div className="paper-quick-view">
    <div className="paper-segmented paper-segmented-sm" role="group" aria-label={t('findView')}>
      {choices.map(([id,key])=><button key={id} type="button" aria-pressed={view===id} onClick={()=>onChange(id)}>{t(key)}</button>)}
    </div>
    {view==='visits'&&<small>{t('findLocal')}</small>}
  </div>
}

export function SearchResultStatus({count,more,loading,scope,t,onAll}: {count:number;more:boolean;loading:boolean;scope:string;t:T;onAll?:()=>void}) {
  return <div className="paper-search-status"><span role="status">
    {t(loading?'loading':more?'findShown':'notesBookCount',{count})} · {scope}
  </span>{onAll&&<button type="button" className="paper-filter-text paper-scope-all" onClick={onAll}>{t('findAcross')}</button>}</div>
}
