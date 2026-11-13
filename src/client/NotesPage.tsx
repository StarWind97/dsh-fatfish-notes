import {NoteSelectionRow} from './NoteSelectionRow.js'
import {useItemActions} from './ItemActions.js'
import {NoteUsage} from './NoteUsage.js'
import * as React from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { NotesController, NotesState } from './notes-controller.js'
import { NoteBackupStatus } from './NoteBackupStatus.js'
import { noteDateTime } from '../notes/date.js'
import { NotebookManager, notebookManagerCss } from './NotebookManager.js'
import { activeNotebook } from '../notes/notebooks.js'
import {LibraryTransfer} from './LibraryTransfer.js'
import {transferCss} from './NoteAttachments.js'
import { useNoteSelection } from './NoteBatch.js'
import { NoteEditor } from './NoteEditor.js'
import { SettingsPage } from './SettingsPage.js'
import { FeedbackLink, feedbackCss } from './FeedbackLink.js'
import { notesStyles as s, notesCss } from './notes-style.js'
import { BookOpen, ChevronDown, SquarePen, Search, SlidersHorizontal, ArrowDownUp, Trash2, ArrowLeft, X, PanelLeftOpen, Star, BookTemplate } from 'lucide-react'
import {Highlight,LinkPreview,ReuseDialog,TagSuggestions} from './NoteTools.js'
import {organizationCss} from './organization-style.js'
import { PaperColumns,usePaperColumns,readPreference,writePreference } from './paper/layout.js'
import type { PaperSurface } from './paper/layout-state.js'
import { NotebookNavigation } from './paper/NotebookNavigation.js'
import { paperCss } from './paper/style.js'
import type { OutlineSession } from './paper/use-outline.js'
import type { T } from './locale.js'
import type {NotesWorkspace} from './workspace.js'
import {WindowButton,WorkspaceNotice} from './WorkspaceNotice.js'

const noWorkspaceSubscribe=()=>()=>{}
const noWorkspaceState=()=>null
export function NotesPage({ controller, t, surface='embedded',workspace }: { controller: NotesController; t: T; surface?:PaperSurface;workspace?:NotesWorkspace }) {
  const windowState=useSyncExternalStore(workspace?.subscribe??noWorkspaceSubscribe,workspace?.getSnapshot??noWorkspaceState)
  const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot)
  const selection=useNoteSelection(controller,state,t)
  const [history,setHistory]=useState<string[]>([])
  const [previewLink,setPreviewLink]=useState<string|null>(null),[fromTemplate,setFromTemplate]=useState(false)
  async function follow(id:string){const previous=state.noteId;if(await controller.open(id)&&previous)setHistory(h=>[...h,previous])}
  async function returnNote(){const id=history.at(-1);if(id&&await controller.open(id))setHistory(h=>h.slice(0,-1))}
  const [query,setQuery]=useState(state.filter.query??''),[tag,setTag]=useState(state.filter.tag??'')
  const [transfer,setTransfer]=useState(false)
  const [booksOpen,setBooksOpen]=useState(false)
  const [full,setFull]=useState(()=>readPreference('width')==='full')
  const app=useRef<HTMLDivElement>(null)
  const columns=usePaperColumns(app,surface)
  const outlineSession=useRef<OutlineSession>({wide:null,open:false})
  const readingPosition=useRef<{noteId:string|null;pane:number;list:number}|null>(null)
  useLayoutEffect(()=>{
    if(state.section!=='notes'||!readingPosition.current)return
    const saved=readingPosition.current;readingPosition.current=null
    if(saved.noteId!==state.noteId)return
    const pane=app.current?.querySelector<HTMLElement>('.paper-pane'),list=app.current?.querySelector<HTMLElement>('.paper-list-scroll')
    if(pane)pane.scrollTop=saved.pane
    if(list)list.scrollTop=saved.list
  },[state.section,state.noteId])
  async function navigate(section:NotesState['section']){
    clearTimeout(timer.current)
    if(section===controller.getSnapshot().section)return true
    if(controller.getSnapshot().section==='notes')readingPosition.current={noteId:controller.getSnapshot().noteId,pane:app.current?.querySelector('.paper-pane')?.scrollTop??0,list:app.current?.querySelector('.paper-list-scroll')?.scrollTop??0}
    if(!await controller.navigate(section))return false
    if(section==='notebooks')await controller.refresh()
    return true
  }
  async function openNotebook(notebookId:string){
    readingPosition.current=null
    if(await navigate('notes'))await controller.selectFilter({notebookId,order:controller.getSnapshot().filter.order??'recent'})
  }
  const choose=(filter:NotesState['filter'])=>controller.selectFilter(filter,(app.current?.clientWidth??560)>=560)
  const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined)
  useEffect(()=>{void controller.initialize(readPreference('last'),readPreference('order')==='oldest'?'oldest':'recent');return()=>{clearTimeout(timer.current);void controller.leave()}},[controller])
  useEffect(()=>{if(state.note?.current.status==='active')writePreference('last',state.note.noteId)},[state.note?.noteId,state.note?.current.status])
  useEffect(()=>{setQuery(state.filter.query??'');setTag(state.filter.tag??'')},[state.filter.query,state.filter.tag])
  useEffect(()=>{
    if(!state.noteId||state.section!=='notes')return
    const id=setInterval(()=>{if(document.visibilityState!=='hidden')void controller.pollJobs()},2500)
    return()=>clearInterval(id)
  },[controller,state.noteId,state.section])
  const pulled=useCallback(()=>{void controller.refresh(true,true)},[controller])
  const activeBooks=state.notebooks.filter(activeNotebook)
  function search(value:string){setQuery(value);clearTimeout(timer.current);timer.current=setTimeout(()=>void choose({...controller.getSnapshot().filter,query:value}),220)}
  function filterTag(value?:string) {
    clearTimeout(timer.current)
    const {tag:previous,...rest}=controller.getSnapshot().filter
    void choose({...rest,query,...(value && value!==previous ? {tag:value} : {})})
  }
  async function create(){clearTimeout(timer.current);await controller.create()}
  const inTrash=state.filter.status==='trashed'
  const view=state.filter.templates?'templates':state.filter.favorite?'favorites':state.filter.recentIds?'visits':'all'
  function chooseView(value:string){clearTimeout(timer.current);void choose({order:'recent',...(value==='favorites'?{favorite:true}:value==='templates'?{templates:true}:value==='visits'?{recentIds:controller.recentIds()}:{})})}
  const previousFilter=useRef<NotesState['filter']>({})
  function toggleTrash() {
    clearTimeout(timer.current);setBooksOpen(false)
    if(!inTrash)previousFilter.current=state.filter
    const order=state.filter.order??'recent'
    void choose(inTrash?{...previousFilter.current,order}:{status:'trashed',order})
  }
  function chooseNotebook(id?:string){
    clearTimeout(timer.current);setHistory([]);setBooksOpen(false)
    const {notebookId:ignored,status:previousStatus,templates:ignoredTemplates,recentIds:ignoredVisits,favorite:ignoredFavorite,...rest}=controller.getSnapshot().filter
    void choose({...rest,query,...(id?{notebookId:id}:{})})
  }
  function toggleNotebooks(){
    columns.toggle()
    requestAnimationFrame(()=>app.current?.querySelector<HTMLButtonElement>(columns.expanded?'.paper-expand-notebooks':'.paper-notebook-nav header button')?.focus())
  }
  const itemActions=useItemActions(controller,state,t,id=>controller.open(id),undefined,app)
  const selectedBook=activeBooks.find(b=>b.notebookId===state.filter.notebookId||(state.filter.notebookId===null&&b.isDefault))
  const notebooks=<NotebookNavigation books={activeBooks} actual={state.note?.effectiveNotebookId??state.draft?.notebookId??null} actions={itemActions.bookActions} selected={state.filter.notebookId} trash={inTrash} disabled={state.operation} t={t} collapse={toggleNotebooks} choose={chooseNotebook} manage={()=>void navigate('notebooks')} openTrash={()=>{if(!inTrash)toggleTrash()}}/>
  const list=<><div className="paper-list-controls"><div className="paper-list-head">
    {!columns.expanded&&columns.wide&&<button className="paper-expand-notebooks" title={t('paperExpandBooks')} aria-label={t('paperExpandBooks')} aria-expanded={false} aria-controls="paper-notebook-list" onClick={toggleNotebooks}><PanelLeftOpen size={17}/></button>}
    {inTrash?<strong className="paper-trash-title">{t('notesTrash')}</strong>:columns.expanded?<h2 className="paper-list-title" title={selectedBook?.current.title??t('paperAll')}>{selectedBook?.current.title??t('paperAll')}</h2>:<label className="paper-picker"><select aria-label={t('notesNotebook')} value={state.filter.notebookId===undefined?'all':selectedBook?.notebookId??'all'} onChange={e=>{
    const option=e.target.value
    if(option==='manage'){clearTimeout(timer.current);void navigate('notebooks');return}
    chooseNotebook(option==='all'?undefined:option)
  }}><option value="all">{t('paperAll')}</option>{activeBooks.map(book=><option key={book.notebookId} value={book.notebookId}>{book.current.title}{book.isDefault?` · ${t('notesDefaultBadge')}`:''}</option>)}<option value="manage">{t('notesManageBooks')}…</option></select><ChevronDown size={14}/></label>}
      {!inTrash&&<span className="paper-new-actions"><button title={t('reuseFromTemplate')} aria-label={t('reuseFromTemplate')} disabled={state.operation} onClick={async()=>{if(await controller.leave())setFromTemplate(true)}}><BookTemplate size={17}/></button><button title={t('notesNew')} aria-label={t('notesNew')} disabled={state.loadingNote||state.saving||state.operation||(state.loadingList&&!state.items.length)} onClick={()=>void create()}><SquarePen size={17}/></button></span>}</div>
    <div className="paper-search"><Search size={16}/><input aria-label={t('notesSearch')} type="search" placeholder={t('notesSearch')} value={query} onChange={e=>search(e.target.value)}/>
      <button aria-label={t('paperFilter')} title={t('paperFilter')} aria-expanded={booksOpen} onClick={()=>setBooksOpen(!booksOpen)}><SlidersHorizontal size={15}/></button></div>
    <div className="paper-list-tools" data-selecting={selection.selecting}>
    {!inTrash&&<div className="paper-quick-view"><select aria-label={t('findView')} value={view} onChange={e=>chooseView(e.target.value)}><option value="all">{t('paperAll')}</option><option value="favorites">{t('findFavorites')}</option><option value="visits">{t('findRecent')}</option><option value="templates">{t('reuseTemplates')}</option></select>{view==='visits'&&<small>{t('findLocal')}</small>}</div>}
    <label className="paper-order" hidden={view==='visits'}><ArrowDownUp size={14}/><select aria-label={t('paperSort')} value={state.filter.order??'recent'} onChange={e=>{
      const order=e.target.value==='oldest'?'oldest':'recent'
      clearTimeout(timer.current);writePreference('order',order);void choose({...state.filter,query,order})
    }}><option value="recent">{t('paperRecent')}</option><option value="oldest">{t('paperOldest')}</option></select></label>{selection.controls}</div>
    {state.filter.tag&&<button className="paper-filter-chip" aria-label={t('notesClearTag',{tag:state.filter.tag})} onClick={()=>filterTag()}>
      <span>{t('notesFilterTag',{tag:state.filter.tag})}</span><X size={13} aria-hidden="true"/>
    </button>}
    {booksOpen&&<div className="paper-controls"><form onSubmit={e=>{e.preventDefault();void choose({...state.filter,query,tag})}}><label>{t('notesTag')}<input value={tag} onChange={e=>setTag(e.target.value)}/></label><button>{t('notesSearchAction')}</button></form><TagSuggestions value={tag} selected={[]} choose={value=>{setTag(value);filterTag(value)}} t={t}/>
      <button onClick={()=>void controller.refresh(true,true)}>{t('refresh')}</button></div>}
    {state.listError&&<p role="alert">{t('notesListFailed')}</p>}
    {!state.loadingList&&!state.items.length&&<p className="paper-hint">{t(state.filter.status==='trashed'?'notesEmptyTrash':'notesEmpty')}</p>}
    </div><div className="paper-list-scroll"><div className="paper-rows">{state.items.map((item,i)=>{
      const date=noteDateTime(item.savedAt).slice(0,10),showDate=view!=='visits'&&(!i||noteDateTime(state.items[i-1]!.savedAt).slice(0,10)!==date)
      return <React.Fragment key={item.noteId}>{showDate&&<p className="paper-date">{date}</p>}<div className="paper-select-row"><NoteSelectionRow selecting={selection.selecting} selected={selection.selected.some(n=>n.noteId===item.noteId)} label={item.title||t('notesUntitled')} actions={itemActions.noteActions(item)} rowClass="paper-row" current={item.noteId===state.noteId} toggle={()=>selection.toggle(item)} open={()=>{clearTimeout(timer.current);setHistory([]);void controller.open(item.noteId)}}>
        <strong>{item.favorite&&<Star size={12} fill="currentColor" aria-label={t('findFavorites')}/>} <Highlight value={item.title||t('notesUntitled')} query={state.filter.query}/></strong>{(item.excerpt||item.summary)&&<span><Highlight value={item.excerpt||item.summary} query={state.filter.query}/></span>}<small>{item.conflicted?t('notesConflict'):item.isTemplate?t('reuseTemplates'):activeBooks.find(b=>b.notebookId===item.notebookId)?.current.title??t('notesDefaultBook')}</small>
      </NoteSelectionRow></div></React.Fragment>
    })}</div>{state.cursor&&<button disabled={state.loadingList} onClick={()=>void controller.refresh(false)}>{t('notesMore')}</button>}</div><footer className="paper-list-foot">{(!columns.expanded||inTrash)&&<button onClick={toggleTrash}>{inTrash?<ArrowLeft size={16}/>:<Trash2 size={16}/>} {t(inTrash?'paperBackLibrary':'notesTrash')}</button>}<button onClick={()=>setTransfer(true)}>{t('libraryTransfer')}</button></footer></>
  return <div ref={app} className="paper-app" data-full={full}><style>{notesCss+paperCss+feedbackCss+notebookManagerCss+transferCss+organizationCss}</style>
    {previewLink&&<LinkPreview id={previewLink} t={t} close={()=>setPreviewLink(null)} open={()=>{const id=previewLink;setPreviewLink(null);void follow(id)}}/>}
    {fromTemplate&&<ReuseDialog mode="instantiate" state={state} controller={controller} t={t} close={()=>setFromTemplate(false)}/>}
    {transfer&&<LibraryTransfer controller={controller} state={state} t={t} close={()=>setTransfer(false)}/>}{selection.dialog}{itemActions.dialogs}<header className="paper-top"><strong><BookOpen size={20}/>{t('nav')}</strong><nav aria-label={t('notesNavigation')}>{(['notes','notebooks','settings'] as const).map(section=><button key={section} disabled={state.operation} aria-pressed={state.section===section} onClick={()=>void navigate(section)}>{t(section==='notes'?'notesLibrary':section==='notebooks'?'notesNotebooks':'notesSettings')}</button>)}</nav>
    {state.section==='notes'&&<><div className="paper-width" role="group" aria-label={t('paperWidth')}>{[false,true].map(value=><button key={String(value)} aria-pressed={full===value} onClick={()=>{setFull(value);writePreference('width',value?'full':'standard')}}>{t(value?'paperFull':'paperStandard')}</button>)}</div><div className="paper-backup">{(!workspace||windowState?.connected)&&<NoteBackupStatus onSettings={()=>void controller.navigate('settings')} t={t} onPulled={pulled} revision={state.note?.current.revision}/>}</div></>}<FeedbackLink t={t}/>{workspace&&<WindowButton workspace={workspace} t={t}/>}</header><NoteUsage t={t}/>{workspace&&<WorkspaceNotice workspace={workspace} t={t}/>}
    {state.section==='settings'&&<div className="paper-other" style={s.page}><h2>{t('notesSettings')}</h2><SettingsPage t={t} showFeedback={false}/></div>}
    <PaperColumns t={t} hidden={state.section!=='notes'} selected={!!state.draft} list={list} notebooks={notebooks} layout={columns}>
      {state.draft?<NoteEditor onDownloadNotice={itemActions.setDownloadNotice} onNoteLink={setPreviewLink} onReturn={history.length?()=>void returnNote():undefined} onPurge={()=>state.note&&selection.purge({noteId:state.note.noteId,expectedHeads:state.note.heads})} outlineSession={outlineSession} onTagClick={filterTag} key={state.noteId} state={state} controller={controller} t={t}/>:<div className="paper-empty"><BookOpen size={32}/><h2>{t(inTrash?'notesTrash':'notesWelcome')}</h2><p>{t(inTrash?'notesEmptyTrash':'notesEmptyHint')}</p>{!inTrash&&<button className="paper-primary" onClick={()=>void create()}>{t('notesNew')}</button>}</div>}
      {(state.loadingNote||state.listError||(!state.draft&&state.error))&&<p role="status">{t(state.loadingNote?'loading':state.error==='note_recovery_failed'?'notesDraftRecoveryFailed':'notesOpenFailed')}</p>}
    </PaperColumns>
    {state.section==='notebooks'&&<NotebookManager controller={controller} state={state} t={t} onOpen={openNotebook}/>}
  </div>
}
