import {NoteReference} from './NoteReference.js'
import * as React from 'react'
import {useEffect,useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react'
import type {PropsRuntime} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import {BookOpen,ArrowLeft,Search,Link2,LoaderCircle,Download,BookPlus,Check,Notebook,ChevronDown,SquarePen,Plus,Settings} from 'lucide-react'
import {NotesWorkspace} from './workspace.js'
import {NotesController} from './notes-controller.js'
import {NoteEditor} from './NoteEditor.js'
import {WorkspaceNotice,WindowButton} from './WorkspaceNotice.js'
import {bindLibraryLifecycle} from './library-lifecycle.js'
import {notesCss} from './notes-style.js'
import {paperCss} from './paper/style.js'
import {organizationCss} from './organization-style.js'
import {transferCss} from './NoteAttachments.js'
import {WorkspaceBookDialog} from './WorkspaceBookDialog.js'
import {RowMenu} from './RowMenu.js'
import {useItemActions} from './ItemActions.js'
import {TransientNotice} from './TransientNotice.js'
import {ConversationBrowse} from './conversation-browse.js'
import {browserStorage} from './note-recovery.js'
import {activeNotebook} from '../notes/notebooks.js'
import {notebookSync} from './notebook-sync.js'
import {noteDateTime} from '../notes/date.js'
import type {OutlineSession} from './paper/use-outline.js'
import type {T} from './locale.js'
import type {NoteCaptureBridge} from './note-capture-bridge.js'
import type {NoteListItem,NotesApiContract} from '../contracts/notes.js'

type Group='linked'|'workspace'|'find'
export function ConversationNotes({sessionId,useSession,useTabInfo,inputActions,useInput,bridge,t}:PropsRuntime<'sidebar.right.pane.tab'>&{bridge:NoteCaptureBridge;t:T}){
  const {tab}=useTabInfo(),removed=useSession((s:{removed:boolean})=>s.removed)
  const pair=useMemo(()=>{
    const workspace=new NotesWorkspace('conversation',undefined,String(tab.id))
    const controller=new NotesController(workspace.api,{stableList:true,editing:workspace,recoveryScope:workspace.recoveryScope,onSettled:()=>{void notebookSync.request(true)}})
    workspace.bind(controller);return {workspace,controller}
  },[tab.id,sessionId])
  const {workspace,controller}=pair,state=useSyncExternalStore(controller.subscribe,controller.getSnapshot),windowState=useSyncExternalStore(workspace.subscribe,workspace.getSnapshot)
  const [query,setQuery]=useState(''),[group,setGroup]=useState<Group>('linked'),[reading,setReading]=useState(false),[error,setError]=useState(false),[undo,setUndo]=useState<string|null>(null)
  const [context,setContext]=useState<NotesApiContract['/notes/session-context']['response']|null>(null),[contextFailed,setContextFailed]=useState(false)
  const [book,setBook]=useState<string|null>(null),[booksOpen,setBooksOpen]=useState(false),[setup,setSetup]=useState<'new'|'workspace'|null>(null),[linking,setLinking]=useState<Set<string>>(()=>new Set())
  const root=useRef<HTMLElement>(null),pendingLinks=useRef(new Set<string>())
  const [narrow,setNarrow]=useState(false)
  useLayoutEffect(()=>{const el=root.current;if(!el)return;let prior:boolean|undefined;const observer=new ResizeObserver(([entry])=>{const next=entry!.contentRect.width<=520;if(next!==prior){prior=next;setNarrow(next);setBooksOpen(false)}});observer.observe(el);return()=>observer.disconnect()},[])
  useEffect(()=>{if(!narrow||!booksOpen)return;const outside=(e:PointerEvent)=>{if(!(e.target as HTMLElement).closest('.conversation-books,.conversation-browse-caption'))setBooksOpen(false)};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)},[narrow,booksOpen])
  const [sourceOnly,setSourceOnly]=useState(false),[bookWidth,setBookWidth]=useState(()=>{try{return Math.max(160,Math.min(340,Number(localStorage.getItem('fatfish-sidebar-books-width'))||220))}catch{return 220}})
  const [setupBook,setSetupBook]=useState<string|null>(null)
  const alive=useRef(false),visible=useRef(tab.visible);visible.current=tab.visible
  const outline=useRef<OutlineSession>({wide:null,open:false}),list=useRef<HTMLDivElement>(null),scroll=useRef(0),restoring=useRef(false)
  const books=state.notebooks.filter(activeNotebook),mapped=context?.notebookId&&books.some(b=>b.notebookId===context.notebookId)?context.notebookId:null
  const preference=useMemo(()=>windowState.server?.repositoryId&&context?new ConversationBrowse(browserStorage(),windowState.server.repositoryId,context.workspace?.id??null):null,[windowState.server?.repositoryId,context?.workspace?.id,!!context])
  const initializedPreference=useRef<ConversationBrowse|null>(null)
  useEffect(()=>{
    alive.current=true;workspace.start();const unbind=bindLibraryLifecycle(controller)
    void controller.filter({sessionId,relation:'linked',order:'recent'}).then(()=>controller.initialize(null))
    return()=>{alive.current=false;unbind();void controller.leave().finally(()=>{controller.dispose();workspace.dispose()})}
  },[pair,sessionId])
  useEffect(()=>{workspace.setVisible(tab.visible);if(!tab.visible)void controller.leave();else void controller.refresh(true,true)},[tab.visible,pair])
  useEffect(()=>{
    if(!tab.visible)return
    const abort=new AbortController();let pending=false
    const refresh=async()=>{if(pending)return;pending=true;try{const next=await workspace.api('/notes/session-context',{sessionId},abort.signal);setContext(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);setContextFailed(false)}catch{if(!abort.signal.aborted)setContextFailed(true)}finally{pending=false}}
    void refresh();const timer=setInterval(()=>void refresh(),15000);window.addEventListener('focus',refresh);window.addEventListener('fatfish-workspace-book',refresh)
    return()=>{abort.abort();clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('fatfish-workspace-book',refresh)}
  },[pair,sessionId,tab.visible])
  useEffect(()=>{
    if(!preference||!books.length)return
    if(initializedPreference.current!==preference){initializedPreference.current=preference;setBook(preference.initial(books,mapped));setBooksOpen(false);setSetup(null)}
    else if(book&&book!=='all'&&!books.some(b=>b.notebookId===book))setBook(preference.initial(books,mapped))
    if(group==='workspace'&&!mapped)setGroup('find')
  },[preference,state.notebooks,mapped,book,group])
  const browseBook=group==='workspace'?mapped:book,canBrowse=group!=='find'&&group!=='workspace'||!!browseBook||!!query.trim()
  const desiredFilter=useMemo(()=>({order:'recent' as const,sessionId,relation:group==='linked'?(sourceOnly?'source' as const:'linked' as const):'browse' as const,...(group==='find'?{query}:{}),...((group==='find'||group==='workspace')&&browseBook&&browseBook!=='all'?{notebookId:browseBook}:{})}),[query,group,sourceOnly,browseBook,sessionId])
  useEffect(()=>{
    if(!tab.visible||reading||!canBrowse)return
    if(JSON.stringify(controller.getSnapshot().filter)===JSON.stringify(desiredFilter))return
    const timer=setTimeout(()=>void controller.selectFilter(desiredFilter,false),query&&group==='find'?180:0)
    return()=>clearTimeout(timer)
  },[desiredFilter,pair,tab.visible,canBrowse,reading])
  useLayoutEffect(()=>{if(!reading&&restoring.current&&!state.loadingList&&list.current){list.current.scrollTop=scroll.current;restoring.current=false}},[reading,state.loadingList,state.items])
  useEffect(()=>{const saved=(e:Event)=>{const data=(e as CustomEvent<{sessionId:string;noteId:string}>).detail;if(data.sessionId!==sessionId||!visible.current)return;setReading(true);setGroup('linked');setSourceOnly(true);scroll.current=0;void controller.leave().then(async ok=>{if(!ok||!alive.current||!visible.current)return;await controller.filter({sessionId,relation:'linked',order:'recent'});if(alive.current&&visible.current&&await controller.open(data.noteId))setReading(true)})};window.addEventListener('fatfish-notes-captured',saved);return()=>window.removeEventListener('fatfish-notes-captured',saved)},[pair,sessionId])
  function selectBook(id:string){setBook(id);setBooksOpen(false);scroll.current=0;if(id!=='all')preference?.choose(id)}
  async function open(id:string){scroll.current=list.current?.scrollTop??scroll.current;if(await controller.open(id)){setReading(true);return true}return false}
  async function back(){if(await controller.leave()){restoring.current=true;setReading(false)}}
  async function associate(item:Pick<NoteListItem,'noteId'|'heads'>,linked:boolean){if(pendingLinks.current.has(item.noteId)||removed)return;pendingLinks.current.add(item.noteId);setLinking(new Set(pendingLinks.current));setError(false);try{const {note}=await workspace.api('/notes/associate',{noteId:item.noteId,expectedHeads:item.heads,sessionId,linked});controller.patchAssociation(note,linked?'manual':null);setUndo(linked?null:item.noteId);notebookSync.localChanged()}catch{setError(true)}finally{pendingLinks.current.delete(item.noteId);setLinking(new Set(pendingLinks.current))}}
  async function restore(){if(!undo)return;try{const {note}=await workspace.api('/notes/get',{noteId:undo});await associate(note,true);await controller.refresh(true,false,false)}catch{setError(true)}}
  function mappedBook(id:string|null){setContext(c=>c?{...c,notebookId:id}:c);if(id&&!book){setBook(id);preference?.choose(id)}setSetup(null);window.dispatchEvent(new Event('fatfish-workspace-book'))}
  async function create(notebookId=mapped){if(removed)return;if(await controller.create({notebookId:notebookId??state.notebooks.find(b=>b.isDefault)?.notebookId??null,sessionId})){setReading(true);setGroup('linked');setSourceOnly(false)}}
  const actions=useItemActions(controller,state,t,open,()=>setReading(true))
  const tabs:Group[]=mapped?['linked','workspace','find']:['linked','find']
  useEffect(()=>{setUndo(null)},[sessionId,group,sourceOnly,book,reading,tab.visible])
  function resize(value:number){const width=Math.max(160,Math.min(340,value));setBookWidth(width);try{localStorage.setItem('fatfish-sidebar-books-width',String(width))}catch{}}
  function sideBookActions(b:typeof books[number]){return [...actions.bookActions(b).map(a=>a.label===t('notesNew')?{...a,run:()=>void create(b.notebookId)}:a),...(context?.workspace?[{label:'设为当前工作区默认笔记本',disabled:b.notebookId===mapped||state.operation,run:()=>{setSetupBook(b.notebookId);setSetup('workspace')}}]:[])]}
  return <section ref={root} onKeyDown={e=>{if(narrow&&booksOpen&&e.key==='Escape'){e.stopPropagation();setBooksOpen(false)}}} className="paper-app conversation-notes" data-narrow={narrow} data-conversation-notes={sessionId}>
    <style>{notesCss+paperCss+organizationCss+transferCss+conversationNotesCss+conversationBrowseCss+sidebarFollowupCss}</style>
    {actions.dialogs}{setup&&<WorkspaceBookDialog mode={setup} workspace={context?.workspace??null} mapped={mapped} initialSelected={setup==='workspace'?setupBook:null} controller={controller} state={state} t={t} close={()=>{setSetup(null);setSetupBook(null)}} changed={mappedBook}/>}
    <header className="conversation-notes-head"><strong>{reading?<button title={t('notesBack')} aria-label={t('notesBack')} onClick={()=>void back()}><ArrowLeft size={16}/></button>:<BookOpen size={17}/>}<span>{t('sessionNotes')}</span></strong><span><button disabled={!!removed||state.operation} title={t('notesNew')} aria-label={t('notesNew')} onClick={()=>void create()}><SquarePen size={17}/></button><button disabled={!!removed} title={t('sessionSave')} aria-label={t('sessionSave')} onClick={()=>void bridge.open(sessionId)}><BookPlus size={17}/></button><WindowButton workspace={workspace} t={t}/></span></header>
    <WorkspaceNotice workspace={workspace} t={t}/>
    {removed&&<p role="status" className="conversation-message">{t('sessionRemoved')}</p>}
    {error&&<p role="alert" className="conversation-message">{t('sessionOperationFailed')}</p>}
    {undo&&<TransientNotice identity={sessionId+undo} message={t('sessionUnlinked')} close={()=>setUndo(null)} busy={linking.size>0} paused={error} action={()=>void restore()}/> }
    {reading&&state.draft?<div className="paper-detail">{state.note&&<NoteReference controller={controller} available={!removed} inputActions={inputActions} useInput={useInput} sessionId={sessionId} visible={tab.visible} t={t}/>}<NoteEditor key={state.noteId} controller={controller} state={state} t={t} onTagClick={()=>{}} outlineSession={outline} onNoteLink={id=>void open(id)} onReturn={undefined} onPurge={()=>{}}/></div>:<>
      <nav className="conversation-notes-tabs" aria-label={t('sessionNotes')}>{tabs.map(key=><button key={key} aria-pressed={group===key} onClick={()=>{setGroup(key);scroll.current=0}}>{t(key==='linked'?'sessionLinked':key==='workspace'?'sessionWorkspaceBook':'sessionFind')}</button>)}</nav>
      {group==='find'&&<>
        <div className="conversation-notes-search"><Search size={15}/><input type="search" aria-label={t('notesSearch')} placeholder={t('notesSearch')} value={query} onChange={e=>{setQuery(e.target.value);scroll.current=0}}/></div>
        <div className="conversation-browse-caption"><button disabled={!narrow} aria-expanded={narrow?booksOpen:undefined} onClick={()=>{if(narrow)setBooksOpen(!booksOpen)}}><Notebook size={14}/>{books.find(b=>b.notebookId===book)?.current.title??t(book==='all'?'paperAll':'sessionChooseBook')}{narrow&&<ChevronDown size={13}/>}</button><small>{t(book&&book!=='all'?'sessionSearchBook':'sessionSearchAll')}</small></div>
      </>}
      {group==='linked'&&<div className="conversation-linked-filter"><span><button aria-pressed={!sourceOnly} onClick={()=>setSourceOnly(false)}>全部关联</button><button aria-pressed={sourceOnly} onClick={()=>setSourceOnly(true)}>{t('sessionSource')}</button></span>{context?.workspace&&!mapped&&<button title="设置工作区笔记本" aria-label="设置工作区笔记本" onClick={()=>setSetup('workspace')}><BookPlus size={16}/></button>}</div>}
      {group==='workspace'&&mapped&&<div className="conversation-workspace-title"><strong title={books.find(b=>b.notebookId===mapped)?.current.title}>{books.find(b=>b.notebookId===mapped)?.current.title}</strong><button title="新建笔记" aria-label="在工作区笔记本新建笔记" disabled={!!removed||state.operation} onClick={()=>void create(mapped)}><SquarePen size={16}/></button><button title="工作区笔记本设置" aria-label="工作区笔记本设置" onClick={()=>setSetup('workspace')}><Settings size={16}/></button><button title="导出此笔记本" aria-label="导出此笔记本" onClick={()=>actions.exportBook(mapped)}><Download size={16}/></button></div>}
      {contextFailed&&<small role="status" className="conversation-message">{t('sessionContextFailed')}</small>}
      <div className="conversation-browse" style={{'--conversation-books-width':bookWidth+'px'} as React.CSSProperties} data-browser={group==='find'} data-books-open={narrow&&booksOpen}>
        {group==='find'&&<><nav className="conversation-books" aria-label={t('notesNotebook')}><div className="conversation-books-scroll"><button aria-current={book==='all'?'page':undefined} onClick={()=>selectBook('all')}><BookOpen size={14}/>{t('paperAll')}</button>{books.map(b=><RowMenu key={b.notebookId} label={b.current.title+' · 操作'} actions={sideBookActions(b)}><button title={b.current.title} aria-current={book===b.notebookId?'page':undefined} onClick={()=>selectBook(b.notebookId)}><Notebook size={14}/><span>{b.current.title}</span><small>{b.noteCount}</small></button></RowMenu>)}</div><footer><button onClick={()=>setSetup('new')}><Plus size={15}/>{t('notesNewNotebook')}</button></footer></nav><div className="conversation-book-divider" role="separator" aria-label="调整笔记本列宽" aria-orientation="vertical" aria-valuemin={160} aria-valuemax={340} aria-valuenow={bookWidth} tabIndex={0} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();resize(bookWidth+(e.key==='ArrowRight'?10:-10))}}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.dataset.start=String(e.clientX);e.currentTarget.dataset.width=String(bookWidth)}} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))resize(Number(e.currentTarget.dataset.width)+e.clientX-Number(e.currentTarget.dataset.start))}} onPointerUp={e=>e.currentTarget.releasePointerCapture(e.pointerId)}/></>}
        <div className="conversation-notes-list" ref={list} aria-busy={state.loadingList}>{!canBrowse?<p className="conversation-empty">{t('sessionChooseBookHint')}</p>:state.listError?<p role="alert">{t('sessionLoadFailed')}</p>:!state.items.length?<p className="conversation-empty">{t(state.loadingList?'loading':group==='find'||group==='workspace'?'notesEmpty':'sessionEmpty')}</p>:state.items.map(item=><article key={item.noteId}><RowMenu label={item.title+' · 操作'} actions={[...(item.sessionRelation==='source'?[]:[{label:t(item.sessionRelation?'sessionDissociate':'sessionAssociate'),run:()=>void associate(item,!item.sessionRelation),disabled:linking.has(item.noteId)||!!removed}]),...actions.noteActions(item)]}><button className="conversation-note-row" onClick={()=>void open(item.noteId)}><strong>{item.title}</strong><p>{item.summary||item.excerpt}</p><small>{noteDateTime(item.savedAt)}</small></button></RowMenu><div className="conversation-relation" data-linked={!!item.sessionRelation}>{item.sessionRelation==='source'?<span tabIndex={0} title="从本会话转存，已自动关联" aria-label="从本会话转存，已自动关联"><BookPlus size={16}/></span>:<button disabled={linking.has(item.noteId)||!!removed} title={linking.has(item.noteId)?'正在处理':item.sessionRelation?'已关联，点击解除关联':'关联到本会话'} aria-label={t(item.sessionRelation?'sessionDissociate':'sessionAssociate')} aria-pressed={!!item.sessionRelation} onClick={()=>void associate(item,!item.sessionRelation)}>{linking.has(item.noteId)?<LoaderCircle className="conversation-link-spinner" size={16}/>:item.sessionRelation?<Check size={17}/>:<><Link2 size={16}/><span className="conversation-link-plus">+</span></>}</button>}</div></article>)}{canBrowse&&state.cursor&&<button onClick={()=>void controller.refresh(false)}>{t('loadMore')}</button>}</div>
      </div><footer className="conversation-notes-foot">{t('sessionPrivacy')}</footer>
    </>}
  </section>
}

export const conversationNotesCss=`
.conversation-reference{padding:7px 14px;border-bottom:1px solid var(--rule);font-size:12px}.conversation-reference p{margin:5px 0;color:var(--muted)}.conversation-notes button{border:0;background:transparent;color:inherit;cursor:pointer;border-radius:6px;padding:5px 8px;display:inline-flex;align-items:center;gap:5px}.conversation-notes button:hover{background:var(--selected)}.conversation-notes-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--base);border-bottom:1px solid var(--rule);flex-shrink:0}.conversation-notes-head strong,.conversation-notes-head>span{display:flex;align-items:center;gap:8px}.conversation-notes-search{display:flex;align-items:center;gap:7px;margin:14px 14px 8px;border:1px solid var(--rule);border-radius:7px;background:var(--base);padding:6px 9px}.conversation-notes-search input{min-width:0;width:100%;border:0;background:transparent;outline:none;color:var(--ink)}.conversation-notes-tabs{display:flex;gap:4px;padding:0 12px 9px;font-size:12px}.conversation-notes-tabs [aria-pressed=true]{background:var(--selected);font-weight:600}.conversation-notes-list{overflow:auto;min-height:0;flex:1;padding:0 12px}.conversation-notes-list article{position:relative;border-bottom:1px solid var(--rule);padding:5px 0}.conversation-notes-list .conversation-note-row{display:block;width:100%;text-align:left;padding:12px 32px 12px 9px}.conversation-note-row strong{display:block;overflow-wrap:anywhere}.conversation-note-row p{font-size:13px;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin:6px 0}.conversation-note-row small{font-size:11px;color:var(--muted)}.conversation-link{position:absolute;right:0;top:12px}.conversation-notes-foot,.conversation-empty{font-size:12px;color:var(--muted);padding:16px}.conversation-notes .paper-detail{min-width:0;min-height:0;flex:1;display:flex;flex-direction:column}.conversation-notes .paper-window-notice{padding:8px 12px}.conversation-message{padding:6px 14px;font-size:12px}
`

const conversationBrowseCss=`
.conversation-notes .paper-doc-head .paper-back{display:none}
.conversation-notes-tabs{padding-top:12px;flex-wrap:wrap;flex:none}.conversation-browse{min-height:0;flex:1;display:flex}.conversation-browse[data-browser=true]{display:grid;grid-template-columns:minmax(110px,30%) minmax(0,1fr)}.conversation-books{min-height:0;overflow:auto;border-right:1px solid var(--rule);padding:4px 7px;scrollbar-width:thin}.conversation-books button{width:100%;text-align:left;justify-content:flex-start;padding:9px 7px;gap:6px;font-size:12px}.conversation-books button span{min-width:0;overflow-wrap:anywhere}.conversation-books small{margin-left:auto;color:var(--muted)}.conversation-books svg{flex:none}.conversation-books [aria-current=page]{background:var(--selected);font-weight:600}.conversation-browse .conversation-notes-list{padding:0 10px}.conversation-browse .conversation-note-row{padding:12px 5px 6px}.conversation-relation{display:flex;align-items:center;gap:5px;padding:0 4px 6px;color:var(--muted);font-size:11px}.conversation-relation small{display:inline-flex;align-items:center;gap:4px}.conversation-relation button{font-size:11px}.conversation-browse-caption{display:flex;align-items:center;justify-content:space-between;padding:0 14px 9px;gap:8px;font-size:12px}.conversation-browse-caption small{color:var(--muted)}.conversation-workspace-prompt{margin:0 14px 10px;padding:10px 12px;background:var(--shelf);border-radius:7px;display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px}.conversation-workspace-prompt strong{font-weight:500}.conversation-workspace-setup{padding:4px 14px 12px;flex:none;max-height:40%;overflow:auto}.conversation-notes-foot{padding:9px 14px;flex:none}.conversation-browse .conversation-empty{padding:12px 8px}
@container paper (max-width:520px){.conversation-browse[data-browser=true]{display:flex;position:relative}.conversation-browse[data-browser=true] .conversation-books{display:none;width:190px;max-width:65%;flex:none}.conversation-browse[data-books-open=true] .conversation-books{display:block}.conversation-browse-caption small{display:none}}
`

const sidebarFollowupCss=`
.conversation-browse[data-browser=true]{grid-template-columns:minmax(160px,min(var(--conversation-books-width),42%)) 5px minmax(210px,1fr)}
.conversation-books{display:flex;flex-direction:column;padding:4px 3px 0;overflow:hidden}.conversation-books-scroll{flex:1;min-height:0;overflow:auto}.conversation-books .paper-menu-row>button:first-of-type{width:auto}.conversation-books .paper-menu-row>button.paper-row-more{width:25px}.conversation-books button span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.conversation-books footer{flex:none;border-top:1px solid var(--rule);padding:7px 3px;background:var(--base)}.conversation-book-divider{cursor:col-resize;touch-action:none;background:transparent}.conversation-book-divider:hover,.conversation-book-divider:focus{background:var(--selected)}
.conversation-linked-filter,.conversation-workspace-title{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 14px 10px;flex:none;font-size:12px}.conversation-linked-filter [aria-pressed=true]{background:var(--selected)}.conversation-workspace-title strong{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.conversation-notes-list article .paper-menu-row{padding-right:0}.conversation-notes-list .conversation-note-row{padding:12px 130px 12px 5px!important;min-height:92px}.conversation-relation{position:absolute;right:33px;top:15px;max-width:122px;padding:0;flex-wrap:wrap;justify-content:flex-end}.conversation-relation small{font-size:11px}.conversation-notes-list .paper-row-more{align-self:flex-start;margin-top:9px}
@container paper (max-width:520px){.conversation-browse[data-browser=true]{display:flex}.conversation-book-divider{display:none}.conversation-browse[data-browser=true] .conversation-books{width:min(var(--conversation-books-width),45%);min-width:145px}.conversation-browse[data-books-open=true] .conversation-books{display:flex}.conversation-notes-list .conversation-note-row{padding-right:90px!important}.conversation-relation{max-width:86px}}
.conversation-notes-list .conversation-note-row{padding-right:36px!important}.conversation-notes-list .paper-row-more{position:absolute;right:0;top:44px;margin:0;width:30px;height:28px}.conversation-relation{right:0;top:10px;max-width:32px;width:30px;height:28px;justify-content:center}.conversation-relation button,.conversation-relation>span{display:inline-flex;justify-content:center;align-items:center;width:30px;height:28px;position:relative;padding:0!important}.conversation-relation[data-linked=true]{color:light-dark(#387b4b,#93bf9a)}.conversation-link-plus{position:absolute;right:0;bottom:0;font-size:11px;background:var(--paper);line-height:12px}.conversation-link-spinner{animation:conversation-spin 1s linear infinite}@keyframes conversation-spin{to{transform:rotate(360deg)}}
.conversation-browse-caption button:disabled{opacity:1;cursor:default}.conversation-browse{position:relative}.conversation-browse .conversation-notes-list{min-width:0;flex:1}
.conversation-notes[data-narrow=true] .conversation-browse[data-browser=true]{display:flex}.conversation-notes[data-narrow=true] .conversation-book-divider{display:none}.conversation-notes[data-narrow=true] .conversation-browse .conversation-books{display:none;position:absolute;inset:0 auto 8px 8px;width:min(300px,calc(100% - 16px));max-width:calc(100% - 16px);min-width:0;z-index:12;background:var(--base);border:1px solid var(--rule);border-radius:8px;box-shadow:0 6px 24px #0003}.conversation-notes[data-narrow=true] .conversation-browse[data-books-open=true] .conversation-books{display:flex}
`
