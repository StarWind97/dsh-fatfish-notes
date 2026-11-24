import {notebookTitle} from '../notes/notebooks.js'
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
import { ChevronDown, SquarePen, Trash2, ArrowLeft, PanelLeftOpen, Star, Pin , Moon, Sun } from 'lucide-react'
import {SearchControls,SearchOrderPicker,SearchResultStatus,SearchViewPicker,hitLabels,readSearchFacets,replaceSearchFacets,type SearchFacets,type SearchView} from './SearchFilterPanel.js'
import {classificationCss} from './classification-style.js'
import {ClassificationViews} from './ClassificationViews.js'
import {TagManager} from './TagManager.js'
import type {NoteListItem, NoteOrder, SearchHit} from '../contracts/notes.js'
import {Highlight,LinkPreview} from './NoteTools.js'
import {organizationCss} from './organization-style.js'
import { PaperColumns,usePaperColumns,readPreference,writePreference } from './paper/layout.js'
import { NotebookNavigation } from './paper/NotebookNavigation.js'
import { paperCss } from './paper/style.js'
import type { OutlineSession } from './paper/use-outline.js'
import type { T } from './locale.js'
import type {NotesWorkspace} from './workspace.js'
import {WindowButton,WorkspaceNotice} from './WorkspaceNotice.js'
import {AppearanceStyle,useAppearanceProps,useAppearance,AppearanceScope,useAppearanceTheme} from './paper/appearance.js'
import {NoteTabBar,useNoteTabs} from './paper/NoteTabs.js'
import {overviewTabId} from './paper/note-tabs.js'
import {NotebookTree} from './paper/NotebookTree.js'
import {NoteOverview} from './paper/NoteOverview.js'

const browseOrders: NoteOrder[] = ['recent','oldest','created-recent','created-oldest','title-asc','title-desc']
function browseOrder(): NoteOrder {
  const order = readPreference('order') as NoteOrder
  return browseOrders.includes(order) ? order : 'recent'
}
const noWorkspaceSubscribe=()=>()=>{}
const noWorkspaceState=()=>null
type NotesPageProps = {
  controller: NotesController
  t: T
  workspace?: NotesWorkspace
} & (
  | { surface: 'embedded'; onToggleDshTheme: () => void }
  | { surface: 'standalone'; onToggleDshTheme?: never }
)
export function NotesPage(props: NotesPageProps) {
  return <AppearanceScope followHost={props.surface === 'embedded'}><NotesPageView {...props}/></AppearanceScope>
}
function NotesPageView({ controller, t, surface, workspace, onToggleDshTheme }: NotesPageProps) {
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
  async function openResult(item:NoteListItem){
    const filter=controller.getSnapshot().filter
    if(query!==(filter.query??''))return
    clearTimeout(timer.current);setHistory([]);setJump(null)
    if(!await controller.open(item.noteId)||controller.getSnapshot().filter!==filter)return
    if(filter.query&&item.hit)setJump({noteId:item.noteId,query:filter.query,hit:item.hit})
  }
  const [transfer,setTransfer]=useState(false)
  const [settingsCategory,setSettingsCategory]=useState<SettingsCategory>('appearance')
  const [filtersOpen,setFiltersOpen]=useState(false)
  const [tagLibrary,setTagLibrary]=useState<{epoch:number;tag:string}|null>(null)
  const [classBusy,setClassBusy]=useState(false)
  async function openClassification(tags:boolean){
    const epoch=controller.libraryEpoch
    setTagLibrary(tags?{epoch,tag:controller.getSnapshot().filter.tag??''}:null)
    await navigate('notebooks')
  }
  const [full,setFull]=useState(()=>readPreference('width')==='full')
  const app=useRef<HTMLDivElement>(null)
  const noteTabs=useNoteTabs(controller,state,app)
  const appearance=useAppearanceProps(),theme=useAppearanceTheme()
  const dark = appearance['data-theme'] === 'dark'
  const modeToggleLabel = surface === 'embedded'
    ? t(dark ? 'switchDshToLight' : 'switchDshToDark')
    : dark ? t('windowUseLight') : t('windowUseDark')
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
    if(section==='notebooks')void controller.refresh()
    if(section==='notes')void controller.refreshSelected()
    return true
  }
  async function openNotebook(notebookId:string){
    readingPosition.current=null
    if(await navigate('notes'))await choose({notebookId,order:controller.getSnapshot().filter.order??'recent'})
  }
  function choose(filter:NotesState['filter'],keepReading=false) {
    const before=controller.getSnapshot().filter
    if(filter.query?.trim()&&!before.query?.trim())filter={...filter,order:'relevance'}
    if(!filter.query?.trim()&&(before.query?.trim()||filter.order==='relevance'))filter={...filter,order:browseOrder()}
    if(keepReading)return controller.filter(filter)
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
  function refine(filter:NotesState['filter']){
    clearTimeout(timer.current)
    void choose(filter,controller.getSnapshot().filter.status!=='trashed')
  }
  function search(value:string){
    setQuery(value)
    clearTimeout(timer.current)
    timer.current=setTimeout(()=>refine({...controller.getSnapshot().filter,query:value}),220)
  }
  function setFacets(facets:SearchFacets){
    refine(replaceSearchFacets({...controller.getSnapshot().filter,query},facets))
  }
  function filterTag(value:string) {
    const facets=readSearchFacets(controller.getSnapshot().filter)
    if(facets.tag===value)delete facets.tag
    else facets.tag=value
    setFacets(facets)
  }
  async function create(){clearTimeout(timer.current);await controller.create()}
  const inTrash=state.filter.status==='trashed'
  const showOverview=!inTrash||noteTabs.session.activeId===overviewTabId
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
  function chooseView(value:SearchView,allNotebooks=false){
    clearTimeout(timer.current)
    const {favorite,recentIds,status,notebookId,...rest}=controller.getSnapshot().filter
    refine({...rest,query,...(!allNotebooks&&notebookId!==undefined?{notebookId}:{}),...(value==='favorites'?{favorite:true}:value==='visits'?{recentIds:controller.recentIds()}:{})})
  }
  const treeActive=appearanceValue.layout==='tree'&&!selection.selecting&&!query&&!state.filter.tag&&!state.filter.hasFiles&&!state.filter.modifiedPeriod&&!inTrash&&view==='all'
  const previousFilter=useRef<NotesState['filter']>({})
  function toggleTrash() {
    clearTimeout(timer.current);setFiltersOpen(false)
    if(!inTrash)previousFilter.current=state.filter
    const order=state.filter.order??'recent'
    void choose(inTrash?{...previousFilter.current,order}:{status:'trashed',order})
  }
  function chooseNotebook(id?:string){
    const {notebookId,status,templates,...rest}=controller.getSnapshot().filter
    refine({...rest,query,...(id?{notebookId:id}:{})})
  }
  function toggleNotebooks(){
    columns.toggle()
    requestAnimationFrame(()=>Array.from(app.current?.querySelectorAll<HTMLButtonElement>('.paper-books-toggle')??[]).find(button=>button.getClientRects().length)?.focus())
  }
  const itemActions=useItemActions(controller,state,t,id=>controller.open(id),undefined,app)
  const bookName=(id:string|null)=>{const book=activeBooks.find(book=>book.notebookId===id);return book?notebookTitle(book,t):t('notesDefaultBook')}
  const selectedBook=activeBooks.find(b=>b.notebookId===state.filter.notebookId||(state.filter.notebookId===null&&b.isDefault))
  const notebooks=<NotebookNavigation reorder={ids=>void controller.reorderNotebooks(ids)} favorites={view==='favorites'} openFavorites={()=>chooseView('favorites',true)} books={activeBooks} actual={state.note?.effectiveNotebookId??state.draft?.notebookId??null} actions={itemActions.bookActions} selected={state.filter.notebookId} trash={inTrash} disabled={state.operation} t={t} collapse={toggleNotebooks} choose={id=>id?chooseNotebook(id):chooseView('all',true)} manage={()=>void openClassification(false)} openTrash={()=>{if(!inTrash)toggleTrash()}}/>
  const list=<><div className="paper-list-controls"><div className="paper-list-head">
    {!columns.expanded&&columns.wide&&appearanceValue.layout!=='tree'&&<button className="paper-expand-notebooks paper-books-toggle" title={t('paperExpandBooks')} aria-label={t('paperExpandBooks')} aria-expanded={false} aria-controls="paper-notebook-list" onClick={toggleNotebooks}><PanelLeftOpen size={19}/></button>}
    {inTrash?<strong className="paper-trash-title">{t('notesTrash')}</strong>:columns.expanded?<h2 className="paper-list-title" title={(selectedBook?notebookTitle(selectedBook,t):t('paperAll'))}>{(selectedBook?notebookTitle(selectedBook,t):t('paperAll'))}</h2>:<label className="paper-picker"><select aria-label={t('notesNotebook')} value={state.filter.notebookId===undefined?'all':selectedBook?.notebookId??'all'} onChange={e=>{
    const option=e.target.value
    if(option==='manage'){clearTimeout(timer.current);void openClassification(false);return}
    chooseNotebook(option==='all'?undefined:option)
  }}><option value="all">{t('paperAll')}</option>{activeBooks.map(book=><option key={book.notebookId} value={book.notebookId}>{notebookTitle(book,t)}{book.isDefault?` · ${t('notesDefaultBadge')}`:''}</option>)}<option value="manage">{t('notesManageBooks')}…</option></select><ChevronDown size={14}/></label>}
      {!inTrash&&<span className="paper-new-actions"><button title={t('notesNew')} aria-label={t('notesNew')} disabled={state.loadingNote||state.saving||state.operation||(state.loadingList&&!state.items.length)} onClick={()=>void create()}><SquarePen size={17}/></button></span>}</div>
    <SearchControls controller={controller} filter={state.filter} query={query} expanded={state.section==='notes'&&filtersOpen} t={t}
      onQuery={search} onExpanded={setFiltersOpen} onFacets={setFacets} manage={()=>void openClassification(true)}>
      <div className="paper-list-tools" data-selecting={selection.selecting}>
        {!inTrash&&<SearchViewPicker view={view} onChange={chooseView} t={t}/>}
        {view!=='visits'&&<SearchOrderPicker value={state.filter.order??'recent'} query={query} t={t} onChange={order=>{
          if(!query.trim())writePreference('order',order)
          refine({...controller.getSnapshot().filter,query,order})
        }}/>}
        {selection.controls}
      </div>
    </SearchControls>
    {!state.listError&&<SearchResultStatus count={state.items.length} more={!!state.cursor} loading={state.loadingList||query!==(state.filter.query??'')}
      scope={inTrash?t('notesTrash'):(selectedBook?notebookTitle(selectedBook,t):t('paperAll'))} t={t}
      {...(!inTrash&&state.filter.notebookId!==undefined&&{onAll:()=>chooseNotebook()})}/>}
    {state.listError&&<p role="alert">{t('notesListFailed')} <button type="button" onClick={()=>void controller.refresh(true,false,false)}>{t('noteRetry')}</button></p>}
    {!state.loadingList&&!state.items.length&&<p className="paper-hint">{t(state.filter.status==='trashed'?'notesEmptyTrash':'notesEmpty')}</p>}
    </div><div className="paper-list-scroll">{showOverview&&!state.draft&&overview(true)}{treeActive?<NotebookTree t={t} controller={controller} state={state} books={activeBooks} actions={itemActions.noteActions} bookActions={itemActions.bookActions}/>:<><div className="paper-rows">{state.items.map((item,i)=>{
      const stamp=(row:typeof item)=>noteDateTime(state.filter.order?.startsWith('created-')?row.createdAt??row.savedAt:row.savedAt).slice(0,10)
      const date=item.pinned?t('paperPinnedGroup'):stamp(item),showDate=item.pinned?!i:(!i||state.items[i-1]?.pinned||view!=='visits'&&!state.filter.order?.startsWith('title-')&&stamp(state.items[i-1]!)!==date)
      return <React.Fragment key={item.noteId}>{showDate&&!state.filter.query?.trim()&&<p className="paper-date">{date}</p>}<div className="paper-select-row"><NoteSelectionRow t={t} selecting={selection.selecting} selected={selection.selected.some(n=>n.noteId===item.noteId)} label={item.title||t('notesUntitled')} actions={itemActions.noteActions(item)} rowClass="paper-row" current={item.noteId===state.noteId} toggle={()=>selection.toggle(item)} open={()=>void openResult(item)}>
        <strong>{item.pinned&&<Pin size={12} aria-label={t('paperPinned')}/>}{item.favorite&&<Star size={12} fill="currentColor" aria-label={t('findFavorites')}/>} <Highlight value={item.title||t('notesUntitled')} query={state.filter.query}/></strong><span>{(item.conflicted||state.filter.notebookId===undefined)&&<small className="paper-row-meta">{item.conflicted?t('notesConflict'):bookName(item.notebookId)} · </small>}{item.hit&&<small className="paper-hit-source">{item.hit.alternate&&t('findOtherVersion')+' · '}{t(hitLabels[item.hit.field])} · </small>}<Highlight value={item.excerpt||item.summary} query={state.filter.query}/></span>
      </NoteSelectionRow></div></React.Fragment>
    })}</div>{state.cursor&&<button disabled={state.loadingList} onClick={()=>void controller.refresh(false)}>{t('notesMore')}</button>}</>}</div><footer className="paper-list-foot">{(!columns.expanded||inTrash||appearanceValue.layout==='tree')&&<button onClick={toggleTrash}>{inTrash?<ArrowLeft size={16}/>:<Trash2 size={16}/>} {t(inTrash?'paperBackLibrary':'notesTrash')}</button>}<button onClick={()=>setTransfer(true)}>{t('libraryTransfer')}</button></footer></>
  return <div ref={app} className="paper-app" data-full={full} {...appearance}><style>{notesCss+paperCss+feedbackCss+notebookManagerCss+transferCss+organizationCss+classificationCss}</style><AppearanceStyle/>
    {previewLink&&<LinkPreview id={previewLink} t={t} close={()=>setPreviewLink(null)} open={()=>{const id=previewLink;setPreviewLink(null);void follow(id)}}/>}
    {transfer&&<LibraryTransfer controller={controller} state={state} t={t} close={()=>setTransfer(false)}/>}{selection.dialog}{itemActions.dialogs}<header className="paper-top"><strong><BrandMark size={20} color/>{t('nav')}</strong><nav aria-label={t('notesNavigation')}>{(['notes','notebooks','settings'] as const).map(section=><button key={section} disabled={state.operation||classBusy} aria-pressed={state.section===section} onClick={()=>void navigate(section)}>{t(section==='notes'?'notesBrowsePage':section==='notebooks'?'classTitle':'notesSettings')}</button>)}</nav>
    <div className="paper-top-actions">
    {state.section==='notes'&&<><div className="paper-width" role="group" aria-label={t('paperWidth')}>{[false,true].map(value=><button key={String(value)} aria-pressed={full===value} onClick={()=>{setFull(value);writePreference('width',value?'full':'standard')}}>{t(value?'paperFull':'paperStandard')}</button>)}</div><div className="paper-backup">{(!workspace||windowState?.connected)&&<NoteBackupStatus onSettings={()=>void navigate('settings').then(opened=>{if(opened)setSettingsCategory('sync')})} t={t} onPulled={pulled} revision={state.note?.current.revision}/>}</div></>}
    <button type="button" className="paper-mode-toggle" aria-label={modeToggleLabel} title={modeToggleLabel}
      onClick={onToggleDshTheme ?? (() => theme.setMode(dark ? 'light' : 'dark'))}>
      {dark ? <Sun size={16}/> : <Moon size={16}/>}
    </button>
    <FeedbackLink t={t}/>{workspace&&<WindowButton workspace={workspace} t={t}/>}</div></header><NoteUsage t={t}/>{workspace&&<WorkspaceNotice workspace={workspace} t={t}/>}
    <PaperColumns t={t} section={state.section} selected={!!state.draft} list={list} notebooks={notebooks} layout={columns}
      tabs={<NoteTabBar controller={controller} state={state} {...noteTabs} t={t} beforeSelect={()=>clearTimeout(timer.current)} onEmpty={focusOverview}/>}
      other={state.section==='settings'?<SettingsWorkspace t={t} category={settingsCategory} onCategory={setSettingsCategory}/>:state.section==='notebooks'?<ClassificationViews tags={tagLibrary?.epoch===controller.libraryEpoch} busy={classBusy} surface={surface} t={t} onSelect={tags=>{
        if(!tags)setTagLibrary(null)
        else if(tagLibrary?.epoch!==controller.libraryEpoch)setTagLibrary({epoch:controller.libraryEpoch,tag:''})
      }}>{tagLibrary?.epoch===controller.libraryEpoch?<TagManager key={tagLibrary.epoch} controller={controller} state={state} initialTag={tagLibrary.tag} t={t} setBusy={setClassBusy}/>:<NotebookManager controller={controller} state={state} t={t} onOpen={openNotebook}/>}</ClassificationViews>:null}>
      {state.draft?<NoteEditor jump={jump} finishJump={finishJump} onDownloadNotice={itemActions.setDownloadNotice} onNoteLink={setPreviewLink} onReturn={history.length?()=>void returnNote():undefined} onPurge={()=>state.note&&selection.purge({noteId:state.note.noteId,expectedHeads:state.note.heads})} onTrashed={itemActions.offerUndo} outlineSession={outlineSession} onTagClick={filterTag} key={state.noteId} state={state} controller={controller} t={t}/>:showOverview?overview():<div className="paper-empty"><Trash2 size={32}/><h2>{t('notesTrash')}</h2><p>{t('notesEmptyTrash')}</p></div>}
      {(state.loadingNote||state.listError||(!state.draft&&state.error))&&<p role="status">{t(state.loadingNote?'loading':state.error==='note_recovery_failed'?'notesDraftRecoveryFailed':'notesOpenFailed')}</p>}
    </PaperColumns>
  </div>
}
