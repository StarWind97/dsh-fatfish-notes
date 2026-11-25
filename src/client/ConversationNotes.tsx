import {notebookTitle} from '../notes/notebooks.js'
import type {NoteOrder} from '../contracts/notes.js'
import {useNoteReference} from './use-note-reference.js'
import type {ReferenceTarget} from './note-reference.js'
import {PaperDialog} from './paper/PaperDialog.js'
import * as React from 'react'
import {useCallback,useEffect,useId,useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react'
import type {PropsRuntime} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import {BookOpen,Link2,LoaderCircle,Download,BookPlus,Check,Notebook,ChevronDown,SquarePen,Plus,Settings,MessageSquarePlus,ListChecks,X,Star,Pin} from 'lucide-react'
import {NotesWorkspace} from './workspace.js'
import {NotesController} from './notes-controller.js'
import {NoteEditor} from './NoteEditor.js'
import {WorkspaceNotice} from './WorkspaceNotice.js'
import {bindLibraryLifecycle} from './library-lifecycle.js'
import {notesCss} from './notes-style.js'
import {paperCss} from './paper/style.js'
import {useStyleSheet} from './styles/inject.js'
import {AppearanceStyle,useAppearanceProps,AppearanceScope} from './paper/appearance.js'
import {useNoteTabs} from './paper/NoteTabs.js'
import {conversationListTabId} from './paper/note-tabs.js'
import {conversationBrowseCss,conversationNotesCss,referenceListCss} from './conversation-style.js'
import {ConversationSidebarHeader} from './ConversationSidebarHeader.js'
export {conversationNotesCss} from './conversation-style.js'
import {organizationCss} from './organization-style.js'
import {transferCss} from './NoteAttachments.js'
import {WorkspaceBookDialog} from './WorkspaceBookDialog.js'
import {RowMenu} from './RowMenu.js'
import {NoteSelectionRow} from './NoteSelectionRow.js'
import {useItemActions} from './ItemActions.js'
import {TransientNotice} from './TransientNotice.js'
import {SearchControls,SearchOrderPicker,SearchResultStatus,SearchViewPicker,hitLabels,type SearchFacets,type SearchView} from './SearchFilterPanel.js'
import {Highlight} from './SearchText.js'
import {ResizeDivider} from './paper/layout.js'
import {activeNotebook} from '../notes/notebooks.js'
import {notebookSync} from './notebook-sync.js'
import {noteDateTime} from '../notes/date.js'
import type {OutlineSession} from './paper/use-outline.js'
import type {T} from './locale.js'
import type {NoteCaptureBridge} from './note-capture-bridge.js'
import type {NoteListItem,NoteListOptions,NotesApiContract,SearchHit} from '../contracts/notes.js'

type Group='linked'|'workspace'|'find'
type ConversationSearch = {query:string; order:NoteOrder; browseOrder:NoteOrder; bookId:string|null; view:SearchView; visits:string[]; facets:SearchFacets}
const initialSearch = ():ConversationSearch => ({query:'',order:'recent',browseOrder:'recent',bookId:null,view:'all',visits:[],facets:{}})
type ConversationProps=PropsRuntime<'sidebar.right.pane.tab'>&{bridge:NoteCaptureBridge;t:T}
export function ConversationNotes(props:ConversationProps){return <AppearanceScope followHost><ConversationNotesView key={props.sessionId} {...props}/></AppearanceScope>}
function ConversationNotesView({sessionId,useSession,useTabInfo,inputActions,useInput,bridge,t}:ConversationProps){
  const {tab}=useTabInfo(),removed=useSession((s:{removed:boolean})=>s.removed)
  const appearance=useAppearanceProps()
  const pair=useMemo(()=>{
    const workspace=new NotesWorkspace('conversation',undefined,String(tab.id))
    const controller=new NotesController(workspace.api,{startTab:'conversation-list',stableList:true,editing:workspace,recoveryScope:workspace.recoveryScope,onSettled:()=>{void notebookSync.request(true)}})
    workspace.bind(controller);return {workspace,controller}
  },[tab.id,sessionId])
  const {workspace,controller}=pair,state=useSyncExternalStore(controller.subscribe,controller.getSnapshot),windowState=useSyncExternalStore(workspace.subscribe,workspace.getSnapshot)
  const [search,setSearch]=useState(initialSearch),[filtersOpen,setFiltersOpen]=useState(false)
  const [group,setGroup]=useState<Group>('linked'),[error,setError]=useState(false),[undo,setUndo]=useState<string|null>(null)
  const [context,setContext]=useState<NotesApiContract['/notes/session-context']['response']|null>(null),[contextFailed,setContextFailed]=useState(false)
  const [booksOpen,setBooksOpen]=useState(false),[setup,setSetup]=useState<'new'|'workspace'|null>(null),[linking,setLinking]=useState<Set<string>>(()=>new Set())
  const scopeButton=useRef<HTMLButtonElement>(null),scopeId=useId()
  const searchArea=useRef<HTMLDivElement>(null),bookPicker=useRef<HTMLElement>(null)
  const [jump,setJump]=useState<{noteId:string;query:string;hit:SearchHit}|null>(null)
  const finishJump=useCallback(()=>setJump(null),[])
  const root=useRef<HTMLElement>(null),pendingLinks=useRef(new Set<string>())
  const noteTabs=useNoteTabs(controller,state,root)
  const [width,setWidth]=useState(0),narrow=width<=520
  useLayoutEffect(()=>{
    const element=root.current
    if(!element)return
    let wasNarrow=element.clientWidth<=520
    const observer=new ResizeObserver(([entry])=>{
      const measured=entry!.contentRect.width
      setWidth(measured)
      if((measured<=520)!==wasNarrow){wasNarrow=measured<=520;setBooksOpen(false)}
    })
    observer.observe(element)
    return ()=>observer.disconnect()
  },[])
  const [bookWidth,setBookWidth]=useState(()=>{
    try{return Math.max(160,Math.min(340,Number(localStorage.getItem('fatfish-sidebar-books-width'))||220))}catch{return 220}
  })
  const railMax=Math.max(160,Math.min(340,Math.floor(width*.42))),railWidth=Math.min(bookWidth,railMax)
  const [setupBook,setSetupBook]=useState<string|null>(null)
  const [selecting,setSelecting]=useState(false),[chosen,setChosen]=useState<ReferenceTarget[]>([]),[showChosen,setShowChosen]=useState(false)
  const reference=useNoteReference({controller,inputActions,useInput,sessionId,visible:tab.visible,available:!removed,scope:String(windowState.server?.repositoryId??''),t,inserted:ids=>{setChosen(rows=>rows.filter(r=>!ids.includes(r.noteId)));setShowChosen(false)}})
  useEffect(()=>{setSelecting(false);setChosen([]);setShowChosen(false)},[sessionId,windowState.server?.repositoryId])
  function toggleChosen(row:ReferenceTarget){setChosen(rows=>rows.some(r=>r.noteId===row.noteId)?rows.filter(r=>r.noteId!==row.noteId):[...rows,{noteId:row.noteId,title:row.title}])}
  function exitSelection(){setSelecting(false);setChosen([]);setShowChosen(false)}
  const alive=useRef(false),visible=useRef(tab.visible);visible.current=tab.visible
  const outline=useRef<OutlineSession>({wide:null,open:false}),list=useRef<HTMLDivElement>(null)
  const positions=useRef<Partial<Record<Group,{top:number;rows:number}>>>({}),restoring=useRef<Group|null>(null)
  const showDetail=!!state.draft
  const showBookRail=group==='find'&&!narrow
  const bookPickerOpen=group==='find'&&narrow&&booksOpen&&!showDetail&&tab.visible
  useEffect(()=>{
    if(showDetail||!tab.visible)setBooksOpen(false)
  },[showDetail,tab.visible])
  useLayoutEffect(()=>{
    if(!bookPickerOpen)return
    const host=root.current,area=searchArea.current,button=scopeButton.current,picker=bookPicker.current
    if(!host||!area||!button||!picker)return
    const position=()=>{
      const pane=host.getBoundingClientRect(),anchor=button.getBoundingClientRect()
      const controls=area.getBoundingClientRect()
      if(anchor.bottom<=controls.top||anchor.top>=controls.bottom){setBooksOpen(false);return}
      const gap=4,padding=8
      const below=Math.min(pane.bottom,window.innerHeight)-anchor.bottom-gap-padding
      const above=anchor.top-Math.max(pane.top,0)-gap-padding
      const opensAbove=below<140&&above>below
      picker.style.left=`${anchor.left-pane.left-host.clientLeft}px`
      picker.style.top=opensAbove?'auto':`${anchor.bottom-pane.top-host.clientTop+gap}px`
      picker.style.bottom=opensAbove?`${pane.top+host.clientTop+host.clientHeight-anchor.top+gap}px`:'auto'
      picker.style.width=`${Math.min(300,pane.right-anchor.left-padding)}px`
      picker.style.maxHeight=`${Math.max(0,Math.min(440,opensAbove?above:below))}px`
    }
    position()
    const current=picker.querySelector<HTMLButtonElement>('[aria-current=page]')
    current?.scrollIntoView({block:'nearest'})
    current?.focus({preventScroll:true})
    const observer=new ResizeObserver(position)
    observer.observe(host)
    observer.observe(area)
    observer.observe(button)
    const outside=(event:Event)=>{
      const target=event.target
      // Notebook actions open a menu through a portal.
      if(target instanceof Element&&!picker.contains(target)&&!button.contains(target)&&!target.closest('.paper-row-menu'))setBooksOpen(false)
    }
    area.addEventListener('scroll',position)
    document.addEventListener('pointerdown',outside)
    document.addEventListener('focusin',outside)
    return ()=>{
      observer.disconnect()
      area.removeEventListener('scroll',position)
      document.removeEventListener('pointerdown',outside)
      document.removeEventListener('focusin',outside)
    }
  },[bookPickerOpen])
  const books=state.notebooks.filter(activeNotebook),mapped=context?.notebookId&&books.some(b=>b.notebookId===context.notebookId)?context.notebookId:null
  const libraryEpoch=controller.libraryEpoch,library=useRef(libraryEpoch)
  useLayoutEffect(()=>{
    if(library.current===libraryEpoch)return
    library.current=libraryEpoch;positions.current={};restoring.current=null
    setSearch(initialSearch());setGroup('linked');setBooksOpen(false);setFiltersOpen(false);setContext(null);setSetup(null);setJump(null)
  },[libraryEpoch])
  useEffect(()=>{
    alive.current=true;workspace.start();const unbind=bindLibraryLifecycle(controller)
    void controller.filter({order:'recent',sessionId,relation:'linked'}).then(()=>controller.initialize(null))
    return()=>{alive.current=false;unbind();void controller.leave().finally(()=>{controller.dispose();workspace.dispose()})}
  },[pair,sessionId])
  useEffect(()=>{workspace.setVisible(tab.visible);if(!tab.visible)void controller.leave();else void controller.refresh(true,true)},[tab.visible,pair])
  useEffect(()=>{
    if(!tab.visible)return
    const abort=new AbortController();let pending=false
    const refresh=async()=>{if(pending)return;pending=true;try{const next=await workspace.api('/notes/session-context',{sessionId},abort.signal);setContext(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);setContextFailed(false)}catch{if(!abort.signal.aborted)setContextFailed(true)}finally{pending=false}}
    void refresh();const timer=setInterval(()=>void refresh(),15000);window.addEventListener('focus',refresh);window.addEventListener('fatfish-workspace-book',refresh)
    return()=>{abort.abort();clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('fatfish-workspace-book',refresh)}
  },[pair,sessionId,tab.visible,libraryEpoch])
  const selectedBook=books.find(book=>book.notebookId===search.bookId)
  const selectedBookTitle=selectedBook?notebookTitle(selectedBook,t):t('paperAll')
  const bookTitle=(id:string|null)=>{const book=books.find(book=>book.notebookId===id);return book?notebookTitle(book,t):undefined}
  useEffect(()=>{
    if(context&&group==='workspace'&&!mapped)switchGroup('linked')
    if(search.bookId&&state.notebooks.length&&!selectedBook){
      if(group==='find')resetListScroll()
      else delete positions.current.find
      setSearch(previous=>({...previous,bookId:null}))
    }
  },[context,group,mapped,search.bookId,selectedBook,state.notebooks.length])
  const scope=group==='workspace'?mapped:group==='find'?selectedBook?.notebookId:null
  const desiredFilter=useMemo<NoteListOptions>(()=>({
    order:group==='find'?search.order:'recent',
    sessionId,
    relation:group==='linked'?'linked':'browse',
    ...(scope&&{notebookId:scope}),
    ...(group==='find'&&{query:search.query,...search.facets,
      ...(search.view==='favorites'?{favorite:true}:search.view==='visits'?{recentIds:search.visits}:{})})
  }),[group,scope,search,sessionId])
  const filterMatches=JSON.stringify(state.filter)===JSON.stringify(desiredFilter)
  const ready=filterMatches&&!state.loadingList&&!state.listError
  useEffect(()=>{
    if(!tab.visible||showDetail||filterMatches||(group==='workspace'&&!mapped))return
    const typing=group==='find'&&search.query.trim()&&search.query!==(state.filter.query??'')
    const timer=setTimeout(()=>{
      if(controller.getSnapshot().noteId)return
      const rows=restoring.current===group?positions.current[group]?.rows??0:0
      void controller.filter(desiredFilter,rows)
    },typing?180:0)
    return ()=>clearTimeout(timer)
  },[desiredFilter,controller,tab.visible,showDetail,filterMatches,search.query,state.filter.query,group,mapped])
  useLayoutEffect(()=>{
    if(showDetail){restoring.current=group;return}
    if(restoring.current!==group||!list.current||!ready)return
    list.current.scrollTop=positions.current[group]?.top??0
    restoring.current=null
  },[group,showDetail,ready,state.items])
  useEffect(()=>{
    const saved=(event:Event)=>{
      const data=(event as CustomEvent<{sessionId:string;noteId:string}>).detail
      if(data.sessionId!==sessionId||!visible.current)return
      void controller.open(data.noteId).then(ok=>{
        if(ok&&alive.current&&visible.current)void controller.refresh(true,false,false)
      })
    }
    window.addEventListener('fatfish-notes-captured',saved)
    return()=>window.removeEventListener('fatfish-notes-captured',saved)
  },[controller,sessionId])
  function rememberPosition() {
    const element=list.current
    if(element&&filterMatches&&!state.listError&&!restoring.current)
      positions.current[group]={top:element.scrollTop,rows:state.items.length}
  }
  function resetListScroll() {
    delete positions.current[group]
    restoring.current=null
    if(list.current)list.current.scrollTop=0
  }
  function switchGroup(next:Group) {
    if(next===group)return
    rememberPosition()
    restoring.current=next
    setBooksOpen(false)
    setGroup(next)
  }
  function changeSearch(patch:Partial<ConversationSearch>) {
    resetListScroll()
    setSearch(previous=>({...previous,...patch}))
  }
  function searchNotes(query:string) {
    const order=query.trim()?search.query.trim()?search.order:'relevance':search.browseOrder
    changeSearch({query,order})
  }
  function selectBook(bookId:string|null) {
    if(bookId!==search.bookId)changeSearch({bookId})
    if(narrow){setBooksOpen(false);scopeButton.current?.focus({preventScroll:true})}
  }
  function open(id:string){setJump(null);return controller.open(id)}
  async function openResult(item:NoteListItem) {
    if(!filterMatches||state.listError)return
    const filter=state.filter
    rememberPosition()
    if(!await open(item.noteId)||controller.getSnapshot().filter!==filter)return
    if(group==='find'&&filter.query&&item.hit)setJump({noteId:item.noteId,query:filter.query,hit:item.hit})
  }
  async function associate(item:Pick<NoteListItem,'noteId'|'heads'>,linked:boolean){if(pendingLinks.current.has(item.noteId)||removed)return;pendingLinks.current.add(item.noteId);setLinking(new Set(pendingLinks.current));setError(false);try{const {note}=await workspace.api('/notes/associate',{noteId:item.noteId,expectedHeads:item.heads,sessionId,linked});controller.patchAssociation(note,linked?'manual':null);setUndo(linked?null:item.noteId);notebookSync.localChanged()}catch{setError(true)}finally{pendingLinks.current.delete(item.noteId);setLinking(new Set(pendingLinks.current))}}
  async function restore(){if(!undo)return;try{const {note}=await workspace.api('/notes/get',{noteId:undo});await associate(note,true);await controller.refresh(true,false,false)}catch{setError(true)}}
  function mappedBook(id:string|null){setContext(c=>c?{...c,notebookId:id}:c);window.dispatchEvent(new Event('fatfish-workspace-book'))}
  async function create(notebookId=mapped){if(removed)return;await controller.create({notebookId:notebookId??state.notebooks.find(b=>b.isDefault)?.notebookId??null,sessionId})}
  const actions=useItemActions(controller,state,t,open,undefined,root)
  const tabs:Group[]=mapped?['linked','workspace','find']:['linked','find']
  useEffect(()=>{setUndo(null)},[sessionId,group,search.bookId,showDetail,tab.visible])
  function resize(value:number){const width=Math.max(160,Math.min(340,value));setBookWidth(width);try{localStorage.setItem('fatfish-sidebar-books-width',String(width))}catch{}}
  function sideBookActions(b:typeof books[number]){return [...actions.bookActions(b).map(a=>a.label===t('notesNew')?{...a,run:()=>void create(b.notebookId)}:a),...(context?.workspace?[{label:t('sidebarWorkspaceDefault'),disabled:b.notebookId===mapped||state.operation,run:()=>{setSetupBook(b.notebookId);setSetup('workspace')}}]:[])]}
  const bookNavigation=(showBookRail||bookPickerOpen)&&!showDetail&&<nav id={scopeId} ref={bookPickerOpen?bookPicker:undefined}
    className={bookPickerOpen?'conversation-books conversation-book-picker':'conversation-books'} aria-label={t('notesNotebook')}>
    <div className="conversation-books-scroll">
      <button type="button" aria-current={!selectedBook?'page':undefined} onClick={()=>selectBook(null)}><BookOpen size={14}/>{t('paperAll')}</button>
      {books.map(book=><RowMenu key={book.notebookId} label={t('rowActionsLabel',{title:notebookTitle(book,t)})} actions={sideBookActions(book)} reveal="interaction">
        <button type="button" title={notebookTitle(book,t)} aria-current={book.notebookId===selectedBook?.notebookId?'page':undefined} onClick={()=>selectBook(book.notebookId)}>
          <Notebook size={14}/><span>{notebookTitle(book,t)}</span><small className="paper-notebook-count">{book.noteCount}</small>
        </button>
      </RowMenu>)}
    </div>
    <footer><button type="button" onClick={()=>{setBooksOpen(false);setSetup('new')}}><Plus size={15}/>{t('notesNewNotebook')}</button></footer>
  </nav>
  useStyleSheet('notes-base', notesCss, 'base')
  useStyleSheet('paper-base', paperCss, 'layout')
  useStyleSheet('organization', organizationCss, 'components')
  useStyleSheet('transfer', transferCss, 'components')
  useStyleSheet('conversation-notes', conversationNotesCss + conversationBrowseCss + referenceListCss, 'components')
  return <section ref={root} onKeyDown={e=>{if(e.key==='Escape'&&!(e.target as HTMLElement).closest('dialog')){if(bookPickerOpen){e.preventDefault();e.stopPropagation();setBooksOpen(false);scopeButton.current?.focus({preventScroll:true})}else if(selecting){e.stopPropagation();exitSelection()}}}} className="paper-app conversation-notes" data-narrow={narrow} data-conversation-notes={sessionId} {...appearance}>
    <AppearanceStyle/>
    {actions.dialogs}{reference.dialogs}
    {showChosen&&<PaperDialog title={t('sidebarSelectedCount',{count:chosen.length})} closeLabel={t('paperClose')} onClose={()=>setShowChosen(false)} className="reference-selection-dialog"><div className="paper-dialog-content">{chosen.length?chosen.map(row=><div className="conversation-selected-row" key={row.noteId}><span title={row.title}>{row.title}</span><button aria-label={t('sidebarRemoveNamedSelection',{title:row.title})} title={t('sidebarRemoveSelection')} onClick={()=>toggleChosen(row)}><X size={15}/></button></div>):<p>{t('sidebarNoneSelected')}</p>}</div><footer><button onClick={()=>setShowChosen(false)}>{t('sidebarKeepSelecting')}</button><button className="paper-primary" disabled={!chosen.length||!reference.enabled} onClick={()=>{setShowChosen(false);reference.open(chosen)}}>{t('sidebarReferenceSelected')}</button></footer></PaperDialog>}
    {setup&&<WorkspaceBookDialog mode={setup} workspace={context?.workspace??null} mapped={mapped} initialSelected={setup==='workspace'?setupBook:null} controller={controller} state={state} t={t} close={()=>{setSetup(null);setSetupBook(null)}} changed={mappedBook}/>}
    <ConversationSidebarHeader showDetail={showDetail} removed={!!removed} operation={state.operation} controller={controller} state={state} noteTabs={noteTabs} workspace={workspace} t={t} onCreate={()=>void create()} onSaveSession={()=>void bridge.open(sessionId)}/>
    <WorkspaceNotice workspace={workspace} t={t}/>
    {removed&&<p role="status" className="conversation-message">{t('sessionRemoved')}</p>}
    {error&&<p role="alert" className="conversation-message">{t('sessionOperationFailed')}</p>}
    {undo&&<TransientNotice t={t} identity={sessionId+undo} message={t('sessionUnlinked')} close={()=>setUndo(null)} busy={linking.size>0} paused={error} action={()=>void restore()}/> }
    {showDetail?<div className="paper-detail"><NoteEditor jump={jump} finishJump={finishJump} onDownloadNotice={actions.setDownloadNotice} onTrashed={actions.offerUndo} onBack={()=>void noteTabs.session.select(conversationListTabId)} referenceAction={{label:t('paperQuote'),ariaLabel:t('referenceTitle'),title:t('referenceTooltip'),icon:MessageSquarePlus,compact:true,disabled:!reference.enabled,run:()=>state.note&&reference.open([{noteId:state.note.noteId,title:state.note.current.title}])}} key={state.noteId} controller={controller} state={state} t={t} onTagClick={()=>{}} outlineSession={outline} onNoteLink={id=>void open(id)} onReturn={undefined} onPurge={()=>{}}/></div>:<>

      <nav className="conversation-notes-tabs" aria-label={t('sessionNotes')}>
        {tabs.map(key=><button key={key} aria-pressed={group===key} onClick={()=>switchGroup(key)}>
          {t(key==='linked'?'sessionLinked':key==='workspace'?'sessionWorkspaceBook':'sessionFind')}
        </button>)}
      </nav>
      {group==='find'&&<div ref={searchArea} className="conversation-search-area">
        <SearchControls controller={controller} filter={desiredFilter} query={search.query} expanded={filtersOpen} t={t}
          onQuery={searchNotes} onExpanded={setFiltersOpen} onFacets={facets=>changeSearch({facets})}>
          <div className="paper-list-tools">
            {narrow&&<button ref={scopeButton} className="conversation-scope" type="button" aria-label={t('findBookScope')}
              aria-expanded={bookPickerOpen} aria-controls={scopeId} title={selectedBookTitle} onClick={()=>setBooksOpen(open=>!open)}>
              <Notebook size={14}/><span>{selectedBookTitle}</span><ChevronDown size={13}/>
            </button>}
            <SearchViewPicker view={search.view} t={t} onChange={view=>changeSearch({view,visits:view==='visits'?controller.recentIds():[]})}/>
            {search.view!=='visits'&&<SearchOrderPicker value={search.order} query={search.query} t={t}
              onChange={order=>changeSearch({order,...(!search.query.trim()&&{browseOrder:order})})}/>}
          </div>
        </SearchControls>
      </div>}
      {bookPickerOpen&&bookNavigation}
      {group==='linked'&&context?.workspace&&!mapped&&<div className="conversation-workspace-title">
        <button type="button" title={t('sidebarSetWorkspaceBook')} onClick={()=>setSetup('workspace')}><BookPlus size={16}/>{t('sidebarSetWorkspaceBook')}</button>
      </div>}
      {group==='workspace'&&mapped&&<div className="conversation-workspace-title"><strong title={bookTitle(mapped)}>{bookTitle(mapped)}</strong><button title={t('notesNew')} aria-label={t('sidebarCreateInWorkspace')} disabled={!!removed||state.operation} onClick={()=>void create(mapped)}><SquarePen size={16}/></button><button title={t('workspaceBookSettings')} aria-label={t('workspaceBookSettings')} onClick={()=>setSetup('workspace')}><Settings size={16}/></button><button title={t('bookExport')} aria-label={t('bookExport')} onClick={()=>actions.exportBook(mapped)}><Download size={16}/></button></div>}
      {contextFailed&&<small role="status" className="conversation-message">{t('sessionContextFailed')}</small>}
      <div className="conversation-selection-bar" data-find={group==='find'} data-selecting={selecting}>
        {group==='find'&&(!filterMatches||!state.listError)&&<SearchResultStatus count={state.items.length} more={!!state.cursor}
          loading={!filterMatches||state.loadingList} scope={selectedBookTitle} t={t}
          {...(selectedBook&&{onAll:()=>selectBook(null)})}/>}
        {selecting?<><strong>{t('sidebarSelectedCount',{count:chosen.length})}</strong><button disabled={!chosen.length} onClick={()=>setShowChosen(true)}>{t('sidebarReviewSelected')}</button><button disabled={!chosen.length||!reference.enabled} onClick={()=>reference.open(chosen)}><MessageSquarePlus size={14}/>{t('sidebarReferenceSelected')}</button><button disabled={!chosen.length} onClick={()=>setChosen([])}>{t('sidebarClearSelection')}</button><button onClick={exitSelection}>{t('sidebarExitSelection')}</button></>:<button aria-label={t('sidebarSelectNotes')} disabled={!!removed} onClick={()=>setSelecting(true)}><ListChecks size={15}/>{t('batchSelect')}</button>}
      </div>
      <div className="conversation-browse" style={{'--conversation-books-width':railWidth+'px'} as React.CSSProperties}
        data-browser={group==='find'} data-book-rail={showBookRail}>
        {showBookRail&&<>
          {bookNavigation}
          <ResizeDivider className="conversation-book-divider" controls={scopeId} label={t('paperResizeBooks')} title={t('paperResizeBooks')}
            width={railWidth} min={160} max={railMax} resize={resize} reset={()=>resize(220)}/>
        </>}
        <div className="conversation-notes-list" ref={list} aria-busy={!filterMatches||state.loadingList} data-selecting={selecting} onScroll={rememberPosition}>
          {!filterMatches?<p className="conversation-empty">{t('loading')}</p>:
            state.listError?<p role="alert">{t('sessionLoadFailed')} <button type="button" onClick={()=>void controller.refresh(true,false,false)}>{t('noteRetry')}</button></p>:
            !state.items.length?<p className="conversation-empty">{t(state.loadingList?'loading':group==='linked'?'sessionEmpty':'notesEmpty')}</p>:state.items.map(item=>{
            const selected=chosen.some(row=>row.noteId===item.noteId)
            return <article key={item.noteId} data-selected={selected&&selecting}>
              <NoteSelectionRow t={t} selecting={selecting} selected={selected} current={item.noteId===state.noteId} label={t('sidebarSelectNamedNote',{title:item.title})} rowClass="conversation-note-row" toggle={()=>toggleChosen(item)} open={()=>void openResult(item)} actions={[
                {label:t('referenceTitle'),disabled:!reference.enabled,run:()=>reference.open([item])},
                {label:t('sidebarAddSelection'),disabled:!!removed,run:()=>{setSelecting(true);if(!selected)toggleChosen(item)}},
                ...(item.sessionRelation==='source'?[]:[{label:t(item.sessionRelation?'sessionDissociate':'sessionAssociate'),run:()=>void associate(item,!item.sessionRelation),disabled:linking.has(item.noteId)||!!removed}]),...actions.noteActions(item)
              ]}>
                <strong>{item.pinned&&<Pin size={12} aria-label={t('paperPinned')}/>}{item.favorite&&<Star size={12} aria-label={t('findFavorites')}/>}
                  <Highlight value={item.title||t('notesUntitled')} query={state.filter.query}/></strong>
                <p>{item.hit&&<span className="paper-hit-source">{item.hit.alternate&&t('findOtherVersion')+' · '}{t(hitLabels[item.hit.field])} · </span>}
                  <Highlight value={item.excerpt||item.summary} query={state.filter.query}/></p>
                <small>{group==='find'&&(bookTitle(item.notebookId)??t('notesDefaultBook'))+' · '}
                  {noteDateTime(item.savedAt)}{group==='linked'&&item.sessionRelation==='source'&&' · '+t('sessionSource')}</small>
              </NoteSelectionRow>
              {!selecting&&<div className="conversation-relation">
                <button className="conversation-quote" title={t('referenceTooltip')} aria-label={t('sidebarReferenceNamedNote',{title:item.title})} disabled={!reference.enabled} onClick={()=>reference.open([item])}><MessageSquarePlus size={16}/></button>
                {item.sessionRelation==='source'?<span className="conversation-association" data-linked tabIndex={0} title={t('sidebarAutoLinked')} aria-label={t('sidebarAutoLinked')}><BookPlus size={16}/></span>:<button className="conversation-association" data-linked={!!item.sessionRelation} disabled={linking.has(item.noteId)||!!removed} title={linking.has(item.noteId)?t('sidebarLinkWorking'):item.sessionRelation?t('sidebarUnlink'):t('sessionAssociate')} aria-label={t(item.sessionRelation?'sessionDissociate':'sessionAssociate')} aria-pressed={!!item.sessionRelation} onClick={()=>void associate(item,!item.sessionRelation)}>{linking.has(item.noteId)?<LoaderCircle className="conversation-link-spinner" size={16}/>:item.sessionRelation?<Check size={17}/>:<><Link2 size={16}/><span className="conversation-link-plus">+</span></>}</button>}
              </div>}
            </article>
          })}
          {filterMatches&&state.cursor&&!state.listError&&<button type="button" disabled={state.loadingList} onClick={()=>void controller.refresh(false)}>{t('loadMore')}</button>}
        </div>
      </div><footer className="conversation-notes-foot">{t('sessionPrivacy')}</footer>
    </>}
  </section>
}
