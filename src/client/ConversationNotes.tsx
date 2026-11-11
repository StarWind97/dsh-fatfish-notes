import {NoteReference} from './NoteReference.js'
import * as React from 'react'
import {useEffect,useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react'
import type {PropsRuntime} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import {BookOpen,ArrowLeft,Search,Link,Unlink,BookPlus,Check,Notebook,ChevronDown} from 'lucide-react'
import {NotesWorkspace} from './workspace.js'
import {NotesController} from './notes-controller.js'
import {NoteEditor} from './NoteEditor.js'
import {WorkspaceNotice,WindowButton} from './WorkspaceNotice.js'
import {bindLibraryLifecycle} from './library-lifecycle.js'
import {notesCss} from './notes-style.js'
import {paperCss} from './paper/style.js'
import {organizationCss} from './organization-style.js'
import {transferCss} from './NoteAttachments.js'
import {CaptureNotebook} from './CaptureNotebook.js'
import {ConversationBrowse} from './conversation-browse.js'
import {browserStorage} from './note-recovery.js'
import {activeNotebook} from '../notes/notebooks.js'
import {notebookSync} from './notebook-sync.js'
import {noteDateTime} from '../notes/date.js'
import type {OutlineSession} from './paper/use-outline.js'
import type {T} from './locale.js'
import type {NoteCaptureBridge} from './note-capture-bridge.js'
import type {NoteListItem,NotesApiContract} from '../contracts/notes.js'

type Group='source'|'linked'|'workspace'|'find'
export function ConversationNotes({sessionId,useSession,useTabInfo,inputActions,useInput,bridge,t}:PropsRuntime<'sidebar.right.pane.tab'>&{bridge:NoteCaptureBridge;t:T}){
  const {tab}=useTabInfo(),removed=useSession((s:{removed:boolean})=>s.removed)
  const pair=useMemo(()=>{
    const workspace=new NotesWorkspace('conversation',undefined,String(tab.id))
    const controller=new NotesController(workspace.api,{editing:workspace,recoveryScope:workspace.recoveryScope,onSettled:()=>{void notebookSync.request(true)}})
    workspace.bind(controller);return {workspace,controller}
  },[tab.id,sessionId])
  const {workspace,controller}=pair,state=useSyncExternalStore(controller.subscribe,controller.getSnapshot),windowState=useSyncExternalStore(workspace.subscribe,workspace.getSnapshot)
  const [query,setQuery]=useState(''),[group,setGroup]=useState<Group>('source'),[reading,setReading]=useState(false),[error,setError]=useState(false),[undo,setUndo]=useState<string|null>(null)
  const [context,setContext]=useState<NotesApiContract['/notes/session-context']['response']|null>(null),[contextFailed,setContextFailed]=useState(false)
  const [book,setBook]=useState<string|null>(null),[booksOpen,setBooksOpen]=useState(false),[setup,setSetup]=useState(false),[setupBook,setSetupBook]=useState<string|null>(null),[linking,setLinking]=useState<string|null>(null)
  const alive=useRef(false),visible=useRef(tab.visible);visible.current=tab.visible
  const outline=useRef<OutlineSession>({wide:null,open:false}),list=useRef<HTMLDivElement>(null),scroll=useRef(0),restoring=useRef(false)
  const books=state.notebooks.filter(activeNotebook),mapped=context?.notebookId&&books.some(b=>b.notebookId===context.notebookId)?context.notebookId:null
  const preference=useMemo(()=>windowState.server?.repositoryId&&context?new ConversationBrowse(browserStorage(),windowState.server.repositoryId,context.workspace?.id??null):null,[windowState.server?.repositoryId,context?.workspace?.id,!!context])
  const initializedPreference=useRef<ConversationBrowse|null>(null)
  useEffect(()=>{
    alive.current=true;workspace.start();const unbind=bindLibraryLifecycle(controller)
    void controller.filter({sessionId,relation:'source',order:'recent'}).then(()=>controller.initialize(null))
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
    if(initializedPreference.current!==preference){initializedPreference.current=preference;setBook(preference.initial(books,mapped));setBooksOpen(false);setSetup(false)}
    else if(book&&book!=='all'&&!books.some(b=>b.notebookId===book))setBook(preference.initial(books,mapped))
    if(group==='workspace'&&!mapped)setGroup('find')
  },[preference,state.notebooks,mapped,book,group])
  const browseBook=group==='workspace'?mapped:book,canBrowse=group!=='find'&&group!=='workspace'||!!browseBook||!!query.trim()
  useEffect(()=>{
    if(!tab.visible||reading||!canBrowse)return
    const timer=setTimeout(()=>void controller.selectFilter({order:'recent',sessionId,relation:group==='source'||group==='linked'?group:'browse',...(group==='find'?{query}:{}),...((group==='find'||group==='workspace')&&browseBook&&browseBook!=='all'?{notebookId:browseBook}:{})},false),query&&group==='find'?180:0)
    return()=>clearTimeout(timer)
  },[query,group,browseBook,sessionId,pair,tab.visible,reading,canBrowse])
  useLayoutEffect(()=>{if(!reading&&restoring.current&&!state.loadingList&&list.current){list.current.scrollTop=scroll.current;restoring.current=false}},[reading,state.loadingList,state.items])
  useEffect(()=>{const saved=(e:Event)=>{const data=(e as CustomEvent<{sessionId:string;noteId:string}>).detail;if(data.sessionId!==sessionId||!visible.current)return;setReading(true);setGroup('source');scroll.current=0;void controller.leave().then(async ok=>{if(!ok||!alive.current||!visible.current)return;await controller.filter({sessionId,relation:'source',order:'recent'});if(alive.current&&visible.current&&await controller.open(data.noteId))setReading(true)})};window.addEventListener('fatfish-notes-captured',saved);return()=>window.removeEventListener('fatfish-notes-captured',saved)},[pair,sessionId])
  function selectBook(id:string){setBook(id);setBooksOpen(false);scroll.current=0;if(id!=='all')preference?.choose(id)}
  async function open(id:string){scroll.current=list.current?.scrollTop??scroll.current;if(await controller.open(id))setReading(true)}
  async function back(){if(await controller.leave()){restoring.current=true;setReading(false)}}
  async function associate(item:Pick<NoteListItem,'noteId'|'heads'>,linked:boolean){if(linking||removed)return;setLinking(item.noteId);setError(false);try{await workspace.api('/notes/associate',{noteId:item.noteId,expectedHeads:item.heads,sessionId,linked});setUndo(linked?null:item.noteId);await controller.refresh(true,true);void notebookSync.request(true)}catch{setError(true)}finally{setLinking(null)}}
  async function restore(){if(!undo)return;try{const {note}=await workspace.api('/notes/get',{noteId:undo});await associate(note,true)}catch{setError(true)}}
  function mappedBook(id:string){setContext(c=>c?{...c,notebookId:id}:c);setBook(id);preference?.choose(id);setSetup(false);setGroup('workspace');void controller.refresh(true,true);window.dispatchEvent(new Event('fatfish-workspace-book'))}
  const tabs:Group[]=mapped?['source','linked','workspace','find']:['source','linked','find']
  return <section className="paper-app conversation-notes" data-conversation-notes={sessionId}>
    <style>{notesCss+paperCss+organizationCss+transferCss+conversationNotesCss+conversationBrowseCss}</style>
    <header className="conversation-notes-head"><strong>{reading?<button title={t('notesBack')} aria-label={t('notesBack')} onClick={()=>void back()}><ArrowLeft size={16}/></button>:<BookOpen size={17}/>}<span>{t('sessionNotes')}</span></strong><span><button disabled={!!removed} title={t('sessionSave')} aria-label={t('sessionSave')} onClick={()=>void bridge.open(sessionId)}><BookPlus size={17}/></button><WindowButton workspace={workspace} t={t}/></span></header>
    <WorkspaceNotice workspace={workspace} t={t}/>
    {removed&&<p role="status" className="conversation-message">{t('sessionRemoved')}</p>}
    {error&&<p role="alert" className="conversation-message">{t('sessionOperationFailed')}</p>}
    {undo&&<p role="status" className="conversation-message">{t('sessionUnlinked')} <button disabled={!!linking||!!removed} onClick={()=>void restore()}>{t('undo')}</button></p>}
    {reading&&state.note?<div className="paper-detail"><NoteReference controller={controller} available={!removed} inputActions={inputActions} useInput={useInput} sessionId={sessionId} visible={tab.visible} t={t}/><NoteEditor key={state.noteId} controller={controller} state={state} t={t} onTagClick={()=>{}} outlineSession={outline} onNoteLink={id=>void open(id)} onReturn={undefined} onPurge={()=>{}}/></div>:<>
      <nav className="conversation-notes-tabs" aria-label={t('sessionNotes')}>{tabs.map(key=><button key={key} aria-pressed={group===key} onClick={()=>{setGroup(key);scroll.current=0}}>{t(key==='source'?'sessionSource':key==='linked'?'sessionLinked':key==='workspace'?'sessionWorkspaceBook':'sessionFind')}</button>)}</nav>
      {group==='find'&&<>
        <div className="conversation-notes-search"><Search size={15}/><input type="search" aria-label={t('notesSearch')} placeholder={t('notesSearch')} value={query} onChange={e=>{setQuery(e.target.value);scroll.current=0}}/></div>
        <div className="conversation-browse-caption"><button aria-expanded={booksOpen} onClick={()=>setBooksOpen(!booksOpen)}><Notebook size={14}/>{books.find(b=>b.notebookId===book)?.current.title??t(book==='all'?'paperAll':'sessionChooseBook')}<ChevronDown size={13}/></button><small>{t(book&&book!=='all'?'sessionSearchBook':'sessionSearchAll')}</small></div>
        {contextFailed?<p className="conversation-message" role="status">{t('sessionContextFailed')}</p>:context?.workspace&&!mapped&&<aside className="conversation-workspace-prompt"><strong>{t('sessionWorkspaceMissing',{title:context.workspace.title})}</strong><button aria-expanded={setup} onClick={()=>setSetup(!setup)}><BookPlus size={14}/>{t('sessionSetupBook')}</button></aside>}
        {setup&&context?.workspace&&<div className="conversation-workspace-setup"><CaptureNotebook value={setupBook} choose={setSetupBook} workspace={context.workspace} call={workspace.api} t={t} onMapped={mappedBook}/><button onClick={()=>setSetup(false)}>{t('cancel')}</button></div>}
      </>}
      <div className="conversation-browse" data-browser={group==='find'} data-books-open={booksOpen||!book&&!query}>
        {group==='find'&&<nav className="conversation-books" aria-label={t('notesNotebook')}><button aria-current={book==='all'?'page':undefined} onClick={()=>selectBook('all')}><BookOpen size={14}/>{t('paperAll')}</button>{books.map(b=><button key={b.notebookId} aria-current={book===b.notebookId?'page':undefined} onClick={()=>selectBook(b.notebookId)}><Notebook size={14}/><span>{b.current.title}</span><small>{b.noteCount}</small></button>)}</nav>}
        <div className="conversation-notes-list" ref={list} aria-busy={state.loadingList}>{!canBrowse?<p className="conversation-empty">{t('sessionChooseBookHint')}</p>:state.listError?<p role="alert">{t('sessionLoadFailed')}</p>:!state.items.length?<p className="conversation-empty">{t(state.loadingList?'loading':group==='find'||group==='workspace'?'notesEmpty':'sessionEmpty')}</p>:state.items.map(item=><article key={item.noteId}><button className="conversation-note-row" onClick={()=>void open(item.noteId)}><strong>{item.title}</strong><p>{item.summary||item.excerpt}</p><small>{noteDateTime(item.savedAt)}</small></button><div className="conversation-relation">{item.sessionRelation==='source'?<small><Check size={12}/>{t('sessionSourceLinked')}</small>:item.sessionRelation==='manual'?<><small><Check size={12}/>{t('sessionAlreadyLinked')}</small><button disabled={!!linking||!!removed} title={t('sessionDissociate')} aria-label={t('sessionDissociate')} onClick={()=>void associate(item,false)}><Unlink size={14}/></button></>:<button disabled={!!linking||!!removed} onClick={()=>void associate(item,true)}><Link size={14}/>{t('sessionAssociate')}</button>}</div></article>)}{canBrowse&&state.cursor&&<button onClick={()=>void controller.refresh(false)}>{t('loadMore')}</button>}</div>
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
