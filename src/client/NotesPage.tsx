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
import {SettingsWorkspace} from './SettingsWorkspace.js'
import type {SettingsCategory} from './SettingsTabs.js'
import { FeedbackLink, feedbackCss } from './FeedbackLink.js'
import { notesStyles as s, notesCss } from './notes-style.js'
import {BrandMark} from './Brand.js'
import { ChevronDown, SquarePen, Search, SlidersHorizontal, ArrowDownUp, Trash2, ArrowLeft, X, PanelLeftOpen, Star, Pin , Moon, Sun } from 'lucide-react'
import {SearchFilterPanel} from './SearchFilterPanel.js'
import type {NoteListItem, NoteOrder, SearchHit} from '../contracts/notes.js'
import {Highlight,LinkPreview} from './NoteTools.js'
import {organizationCss} from './organization-style.js'
import { PaperColumns,usePaperColumns,readPreference,writePreference } from './paper/layout.js'
import type { PaperSurface } from './paper/layout-state.js'
import { NotebookNavigation } from './paper/NotebookNavigation.js'
import { paperCss } from './paper/style.js'
import type { OutlineSession } from './paper/use-outline.js'
import type { T } from './locale.js'
import type {NotesWorkspace} from './workspace.js'
import {WindowButton,WorkspaceNotice} from './WorkspaceNotice.js'
import {AppearanceStyle,useAppearanceProps,useAppearance,AppearanceScope,useAppearanceTheme} from './paper/appearance.js'
import {NoteTabBar,useNoteTabs} from './paper/NoteTabs.js'
import {NotebookTree} from './paper/NotebookTree.js'
import {NoteOverview} from './paper/NoteOverview.js'

const browseOrders: NoteOrder[] = ['recent','oldest','created-recent','created-oldest','title-asc','title-desc']
function browseOrder(): NoteOrder {
  const order = readPreference('order') as NoteOrder
  return browseOrders.includes(order) ? order : 'recent'
}
const hitLabels = {title:'findHitTitle',file:'findHitFile',tag:'findHitTag',summary:'findHitSummary',body:'findHitBody'} as const
const noWorkspaceSubscribe=()=>()=>{}
const noWorkspaceState=()=>null
type NotesPageProps={ controller: NotesController; t: T; surface?:PaperSurface;workspace?:NotesWorkspace }
export function NotesPage(props:NotesPageProps){return <AppearanceScope><NotesPageView {...props}/></AppearanceScope>}
function NotesPageView({ controller, t, surface='embedded',workspace }: NotesPageProps) {
  const windowState=useSyncExternalStore(workspace?.subscribe??noWorkspaceSubscribe,workspace?.getSnapshot??noWorkspaceState)
  const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot)
  const selection=useNoteSelection(controller,state,t)
  const [history,setHistory]=useState<string[]>([])
  useEffect(()=>{if(!state.noteId&&!state.loadingNote)setHistory(items=>items.length?[]:items)},[state.noteId,state.loadingNote])
  const [previewLink,setPreviewLink]=useState<string|null>(null)
  async function follow(id:string){const previous=state.noteId;if(await controller.open(id)&&previous)setHistory(h=>[...h,previous])}
  async function returnNote(){const id=history.at(-1);if(id&&await controller.open(id))setHistory(h=>h.slice(0,-1))}
  const [query,setQuery]=useState(state.filter.query??'')
  const [jump,setJump]=useState<{noteId:string;query:string;hit:SearchHit}|null>(null)
  const finishJump=useCallback(()=>setJump(null),[])
  const filterButton=useRef<HTMLButtonElement>(null)
  const filterPanelId=React.useId()
  function closeFilters(){setBooksOpen(false);filterButton.current?.focus({preventScroll:true})}
  async function openResult(item:NoteListItem){
    const filter=controller.getSnapshot().filter
    if(query!==(filter.query??''))return
    clearTimeout(timer.current);setHistory([]);setJump(null)
    if(!await controller.open(item.noteId)||controller.getSnapshot().filter!==filter)return
    if(filter.query&&item.hit)setJump({noteId:item.noteId,query:filter.query,hit:item.hit})
  }
  const [transfer,setTransfer]=useState(false)
  const [settingsCategory,setSettingsCategory]=useState<SettingsCategory>('appearance')
  const [booksOpen,setBooksOpen]=useState(false)
  const [full,setFull]=useState(()=>readPreference('width')==='full')
  const app=useRef<HTMLDivElement>(null)
  const noteTabs=useNoteTabs(controller,state,app)
  const appearance=useAppearanceProps(),theme=useAppearanceTheme()
  const appearanceValue=useAppearance()
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
    if(await navigate('notes'))await choose({notebookId,order:controller.getSnapshot().filter.order??'recent'})
  }
  function choose(filter:NotesState['filter']) {
    const before=controller.getSnapshot().filter
    if(filter.query?.trim()&&!before.query?.trim())filter={...filter,order:'relevance'}
    if(!filter.query?.trim()&&(before.query?.trim()||filter.order==='relevance'))filter={...filter,order:browseOrder()}
    return controller.selectFilter(filter,(app.current?.clientWidth??560)>=560 &&
      (!!controller.getSnapshot().draft || filter.status==='trashed'))
  }
  const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined)
  useEffect(()=>{void controller.initialize(null,browseOrder());return()=>{clearTimeout(timer.current);void controller.leave()}},[controller])
  useEffect(()=>{setQuery(state.filter.query??'')},[state.filter.query])
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
  function period(value:NonNullable<NotesState['filter']['modifiedPeriod']>|''){
    clearTimeout(timer.current)
    const {modifiedPeriod,...rest}=controller.getSnapshot().filter
    void choose({...rest,query,...(value && {modifiedPeriod:value})})
  }
  function files(value:boolean){
    clearTimeout(timer.current)
    const {hasFiles,...rest}=controller.getSnapshot().filter
    void choose({...rest,query,...(value && {hasFiles:true})})
  }
  async function create(){clearTimeout(timer.current);await controller.create()}
  const inTrash=state.filter.status==='trashed'
  const overview = (compact=false) => <NoteOverview compact={compact} overview={state.overview} books={activeBooks} t={t}
    disabled={state.loadingNote||state.operation} create={()=>void create()} open={id=>{
      clearTimeout(timer.current)
      void controller.open(id,true).then(ok=>{
        if(!ok&&['note_deleted','note_not_found'].includes(controller.getSnapshot().error??''))void controller.refresh()
      })
    }}/>
  function focusOverview() {
    requestAnimationFrame(()=>{
      const nodes=Array.from(app.current?.querySelectorAll<HTMLElement>('.paper-overview-brand')??[])
      const element=nodes.find(node=>node.getClientRects().length)
      element?.scrollIntoView({block:'nearest'})
      element?.focus({preventScroll:true})
    })
  }
  const view=state.filter.favorite?'favorites':state.filter.recentIds?'visits':'all'
  function chooseView(value:string,allNotebooks=false){
    clearTimeout(timer.current)
    const {favorite,recentIds,status,notebookId,...rest}=controller.getSnapshot().filter
    void choose({...rest,query,...(!allNotebooks&&notebookId!==undefined?{notebookId}:{}),...(value==='favorites'?{favorite:true}:value==='visits'?{recentIds:controller.recentIds()}:{})})
  }
  const treeActive=appearanceValue.layout==='tree'&&!selection.selecting&&!query&&!state.filter.tag&&!state.filter.hasFiles&&!state.filter.modifiedPeriod&&!inTrash&&view==='all'
  const previousFilter=useRef<NotesState['filter']>({})
  function toggleTrash() {
    clearTimeout(timer.current);setBooksOpen(false)
    if(!inTrash)previousFilter.current=state.filter
    const order=state.filter.order??'recent'
    void choose(inTrash?{...previousFilter.current,order}:{status:'trashed',order})
  }
  function chooseNotebook(id?:string){
    clearTimeout(timer.current);setHistory([]);setBooksOpen(false)
    const {notebookId:ignored,status:previousStatus,templates:ignoredTemplates,...rest}=controller.getSnapshot().filter
    void choose({...rest,query,...(id?{notebookId:id}:{})})
  }
  function toggleNotebooks(){
    columns.toggle()
    requestAnimationFrame(()=>Array.from(app.current?.querySelectorAll<HTMLButtonElement>('.paper-books-toggle')??[]).find(button=>button.getClientRects().length)?.focus())
  }
  const itemActions=useItemActions(controller,state,t,id=>controller.open(id),undefined,app)
  const selectedBook=activeBooks.find(b=>b.notebookId===state.filter.notebookId||(state.filter.notebookId===null&&b.isDefault))
  const notebooks=<NotebookNavigation reorder={ids=>void controller.reorderNotebooks(ids)} favorites={view==='favorites'} openFavorites={()=>chooseView('favorites',true)} books={activeBooks} actual={state.note?.effectiveNotebookId??state.draft?.notebookId??null} actions={itemActions.bookActions} selected={state.filter.notebookId} trash={inTrash} disabled={state.operation} t={t} collapse={toggleNotebooks} choose={id=>id?chooseNotebook(id):chooseView('all',true)} manage={()=>void navigate('notebooks')} openTrash={()=>{if(!inTrash)toggleTrash()}}/>
  const list=<><div className="paper-list-controls"><div className="paper-list-head">
    {!columns.expanded&&columns.wide&&!['dock','tree','ribbon','archive'].includes(appearanceValue.layout)&&<button className="paper-expand-notebooks paper-books-toggle" title={t('paperExpandBooks')} aria-label={t('paperExpandBooks')} aria-expanded={false} aria-controls="paper-notebook-list" onClick={toggleNotebooks}><PanelLeftOpen size={19}/></button>}
    {inTrash?<strong className="paper-trash-title">{t('notesTrash')}</strong>:columns.expanded?<h2 className="paper-list-title" title={selectedBook?.current.title??t('paperAll')}>{selectedBook?.current.title??t('paperAll')}</h2>:<label className="paper-picker"><select aria-label={t('notesNotebook')} value={state.filter.notebookId===undefined?'all':selectedBook?.notebookId??'all'} onChange={e=>{
    const option=e.target.value
    if(option==='manage'){clearTimeout(timer.current);void navigate('notebooks');return}
    chooseNotebook(option==='all'?undefined:option)
  }}><option value="all">{t('paperAll')}</option>{activeBooks.map(book=><option key={book.notebookId} value={book.notebookId}>{book.current.title}{book.isDefault?` · ${t('notesDefaultBadge')}`:''}</option>)}<option value="manage">{t('notesManageBooks')}…</option></select><ChevronDown size={14}/></label>}
      {!inTrash&&<span className="paper-new-actions"><button title={t('notesNew')} aria-label={t('notesNew')} disabled={state.loadingNote||state.saving||state.operation||(state.loadingList&&!state.items.length)} onClick={()=>void create()}><SquarePen size={17}/></button></span>}</div>
    <div className="paper-search"><Search size={16}/><input aria-label={t('notesSearch')} type="search" placeholder={t('notesSearch')} value={query} onChange={e=>search(e.target.value)}/>
      <button ref={filterButton} aria-controls={filterPanelId} aria-label={t('findFilters')} title={t('findFilters')} aria-expanded={booksOpen} onClick={()=>setBooksOpen(!booksOpen)}><SlidersHorizontal size={15}/></button></div>
    <div className="paper-list-tools" data-selecting={selection.selecting}>
    {!inTrash&&<div className="paper-quick-view"><select aria-label={t('findView')} value={view} onChange={e=>chooseView(e.target.value)}><option value="all">{t('paperAll')}</option><option value="favorites">{t('findFavorites')}</option><option value="visits">{t('findRecent')}</option></select>{view==='visits'&&<small>{t('findLocal')}</small>}</div>}
    <label className="paper-order" hidden={view==='visits'}><ArrowDownUp size={14}/><select aria-label={t('paperSort')} value={state.filter.order??'recent'} onChange={e=>{
      const order=e.target.value as NonNullable<NotesState['filter']['order']>
      clearTimeout(timer.current);if(!query.trim())writePreference('order',order);void choose({...state.filter,query,order})
    }}>{state.filter.query?.trim()&&<option value="relevance">{t('findRank')}</option>}<option value="recent">修改时间：从新到旧</option><option value="oldest">修改时间：从旧到新</option><option value="created-recent">创建时间：从新到旧</option><option value="created-oldest">创建时间：从旧到新</option><option value="title-asc">标题：升序</option><option value="title-desc">标题：降序</option></select></label>{selection.controls}</div>
    {state.filter.tag&&<button className="paper-filter-chip" aria-label={t('notesClearTag',{tag:state.filter.tag})} onClick={()=>filterTag()}>
      <span>{t('notesFilterTag',{tag:state.filter.tag})}</span><X size={13} aria-hidden="true"/>
    </button>}
    {state.filter.modifiedPeriod&&<button className="paper-filter-chip" aria-label={t('findRemove',{name:t('findModified')})} onClick={()=>period('')}>{t('findModified')} · {t(state.filter.modifiedPeriod==='month'?'findThisMonth':'findBeforeMonth')}<X size={13}/></button>}
    {state.filter.hasFiles&&<button className="paper-filter-chip" aria-label={t('findRemove',{name:t('findFilesOnly')})} onClick={()=>files(false)}>{t('findFilesOnly')}<X size={13}/></button>}
    {query.trim()&&state.filter.notebookId!==undefined&&<button className="paper-scope-all" onClick={()=>chooseNotebook()}>{t('findAcross')}</button>}
    {booksOpen&&<div id={filterPanelId}><SearchFilterPanel controller={controller} filter={state.filter} t={t} onTag={filterTag} onPeriod={period} onFiles={files} close={closeFilters}/></div>}
    {state.listError&&<p role="alert">{t('notesListFailed')}</p>}
    {!state.loadingList&&!state.items.length&&<p className="paper-hint">{t(state.filter.status==='trashed'?'notesEmptyTrash':'notesEmpty')}</p>}
    </div><div className="paper-list-scroll">{!inTrash&&!state.draft&&overview(true)}{treeActive?<NotebookTree controller={controller} state={state} books={activeBooks} actions={itemActions.noteActions} bookActions={itemActions.bookActions}/>:<><div className="paper-rows">{state.items.map((item,i)=>{
      const stamp=(row:typeof item)=>noteDateTime(state.filter.order?.startsWith('created-')?row.createdAt??row.savedAt:row.savedAt).slice(0,10)
      const date=item.pinned?'置顶':stamp(item),showDate=item.pinned?!i:(!i||state.items[i-1]?.pinned||view!=='visits'&&!state.filter.order?.startsWith('title-')&&stamp(state.items[i-1]!)!==date)
      return <React.Fragment key={item.noteId}>{showDate&&!state.filter.query?.trim()&&<p className="paper-date">{date}</p>}<div className="paper-select-row"><NoteSelectionRow selecting={selection.selecting} selected={selection.selected.some(n=>n.noteId===item.noteId)} label={item.title||t('notesUntitled')} actions={itemActions.noteActions(item)} rowClass="paper-row" current={item.noteId===state.noteId} toggle={()=>selection.toggle(item)} open={()=>void openResult(item)}>
        <strong>{item.pinned&&<Pin size={12} aria-label="已置顶"/>}{item.favorite&&<Star size={12} fill="currentColor" aria-label={t('findFavorites')}/>} <Highlight value={item.title||t('notesUntitled')} query={state.filter.query}/></strong><span>{(item.conflicted||state.filter.notebookId===undefined)&&<small className="paper-row-meta">{item.conflicted?t('notesConflict'):activeBooks.find(b=>b.notebookId===item.notebookId)?.current.title??t('notesDefaultBook')} · </small>}{item.hit&&<small className="paper-hit-source">{item.hit.alternate&&t('findOtherVersion')+' · '}{t(hitLabels[item.hit.field])} · </small>}<Highlight value={item.excerpt||item.summary} query={state.filter.query}/></span>
      </NoteSelectionRow></div></React.Fragment>
    })}</div>{state.cursor&&<button disabled={state.loadingList} onClick={()=>void controller.refresh(false)}>{t('notesMore')}</button>}</>}</div><footer className="paper-list-foot">{(!columns.expanded||inTrash||appearanceValue.layout==='tree')&&<button onClick={toggleTrash}>{inTrash?<ArrowLeft size={16}/>:<Trash2 size={16}/>} {t(inTrash?'paperBackLibrary':'notesTrash')}</button>}<button onClick={()=>setTransfer(true)}>{t('libraryTransfer')}</button></footer></>
  return <div ref={app} className="paper-app" data-full={full} {...appearance}><style>{notesCss+paperCss+feedbackCss+notebookManagerCss+transferCss+organizationCss}</style><AppearanceStyle/>
    {previewLink&&<LinkPreview id={previewLink} t={t} close={()=>setPreviewLink(null)} open={()=>{const id=previewLink;setPreviewLink(null);void follow(id)}}/>}
    {transfer&&<LibraryTransfer controller={controller} state={state} t={t} close={()=>setTransfer(false)}/>}{selection.dialog}{itemActions.dialogs}<header className="paper-top"><strong><BrandMark size={20} color/>{t('nav')}</strong><nav aria-label={t('notesNavigation')}>{(['notes','notebooks','settings'] as const).map(section=><button key={section} disabled={state.operation} aria-pressed={state.section===section} onClick={()=>void navigate(section)}>{t(section==='notes'?'notesBrowsePage':section==='notebooks'?'notesManagePage':'notesSettings')}</button>)}</nav>
    {state.section==='notes'&&<><div className="paper-width" role="group" aria-label={t('paperWidth')}>{[false,true].map(value=><button key={String(value)} aria-pressed={full===value} onClick={()=>{setFull(value);writePreference('width',value?'full':'standard')}}>{t(value?'paperFull':'paperStandard')}</button>)}</div><div className="paper-backup">{(!workspace||windowState?.connected)&&<NoteBackupStatus onSettings={()=>void navigate('settings').then(opened=>{if(opened)setSettingsCategory('sync')})} t={t} onPulled={pulled} revision={state.note?.current.revision}/>}</div></>}<button className="paper-mode-toggle" aria-label={appearance['data-theme']==='dark'?'切换浅色':'切换深色'} title={appearance['data-theme']==='dark'?'切换浅色':'切换深色'} onClick={()=>theme.setMode(appearance['data-theme']==='dark'?'light':'dark')}>{appearance['data-theme']==='dark'?<Sun size={16}/>:<Moon size={16}/>}</button><FeedbackLink t={t}/>{workspace&&<WindowButton workspace={workspace} t={t}/>}</header><NoteUsage t={t}/>{workspace&&<WorkspaceNotice workspace={workspace} t={t}/>}
    <PaperColumns t={t} section={state.section} selected={!!state.draft} list={list} notebooks={notebooks} layout={columns} rail={<><button className="paper-books-toggle" title={t('paperExpandBooks')} aria-label={t('paperExpandBooks')} aria-expanded={false} aria-controls="paper-notebook-list" onClick={toggleNotebooks}><PanelLeftOpen size={19}/></button>{activeBooks.map(book=><button key={book.notebookId} title={book.current.title} aria-label={book.current.title} aria-current={state.filter.notebookId===book.notebookId?'page':undefined} onClick={()=>chooseNotebook(book.notebookId)}>{book.current.title.slice(0,1)}</button>)}</>} other={state.section==='settings'?<SettingsWorkspace t={t} category={settingsCategory} onCategory={setSettingsCategory}/>:state.section==='notebooks'?<NotebookManager controller={controller} state={state} t={t} onOpen={openNotebook}/>:null}>
      <NoteTabBar controller={controller} state={state} {...noteTabs} t={t} beforeSelect={()=>clearTimeout(timer.current)} onEmpty={focusOverview}/>
      {state.draft?<NoteEditor jump={jump} finishJump={finishJump} onDownloadNotice={itemActions.setDownloadNotice} onNoteLink={setPreviewLink} onReturn={history.length?()=>void returnNote():undefined} onPurge={()=>state.note&&selection.purge({noteId:state.note.noteId,expectedHeads:state.note.heads})} onTrashed={itemActions.offerUndo} outlineSession={outlineSession} onTagClick={filterTag} key={state.noteId} state={state} controller={controller} t={t}/>:inTrash?<div className="paper-empty"><Trash2 size={32}/><h2>{t('notesTrash')}</h2><p>{t('notesEmptyTrash')}</p></div>:overview()}
      {(state.loadingNote||state.listError||(!state.draft&&state.error))&&<p role="status">{t(state.loadingNote?'loading':state.error==='note_recovery_failed'?'notesDraftRecoveryFailed':'notesOpenFailed')}</p>}
    </PaperColumns>
  </div>
}
