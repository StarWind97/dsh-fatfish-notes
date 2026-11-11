import {NoteReference} from './NoteReference.js'
import * as React from 'react'
import {useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react'
import type {PropsRuntime} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import {BookOpen,ArrowLeft,Search,Link,Unlink,BookPlus} from 'lucide-react'
import {NotesWorkspace} from './workspace.js'
import {NotesController} from './notes-controller.js'
import {NoteEditor} from './NoteEditor.js'
import {WorkspaceNotice,WindowButton} from './WorkspaceNotice.js'
import {bindLibraryLifecycle} from './library-lifecycle.js'
import {notesCss} from './notes-style.js'
import {paperCss} from './paper/style.js'
import {organizationCss} from './organization-style.js'
import {transferCss} from './NoteAttachments.js'
import {notebookSync} from './notebook-sync.js'
import {noteDateTime} from '../notes/date.js'
import type {OutlineSession} from './paper/use-outline.js'
import type {T} from './locale.js'
import type {NoteCaptureBridge} from './note-capture-bridge.js'
import type {NoteListItem} from '../contracts/notes.js'

export function ConversationNotes({sessionId,useTabInfo,inputActions,useInput,bridge,t}:PropsRuntime<'sidebar.right.pane.tab'>&{bridge:NoteCaptureBridge;t:T}){
  const {tab}=useTabInfo()
  const pair=useMemo(()=>{
    const workspace=new NotesWorkspace('conversation',undefined,String(tab.id))
    const controller=new NotesController(workspace.api,{editing:workspace,recoveryScope:workspace.recoveryScope,onSettled:()=>{void notebookSync.request(true)}})
    workspace.bind(controller);return {workspace,controller}
  },[tab.id,sessionId])
  const {workspace,controller}=pair,state=useSyncExternalStore(controller.subscribe,controller.getSnapshot)
  const [query,setQuery]=useState(''),[group,setGroup]=useState<'source'|'linked'|'all'>('source'),[reading,setReading]=useState(false),[error,setError]=useState(false),[undo,setUndo]=useState<string|null>(null)
  const alive=useRef(false),visible=useRef(tab.visible);visible.current=tab.visible
  const outline=useRef<OutlineSession>({wide:null,open:false})
  useEffect(()=>{
    alive.current=true;workspace.start();const unbind=bindLibraryLifecycle(controller)
    void controller.filter({sessionId,relation:'source',order:'recent'}).then(()=>controller.initialize(null))
    return()=>{alive.current=false;unbind();void controller.leave().finally(()=>{controller.dispose();workspace.dispose()})}
  },[pair,sessionId])
  useEffect(()=>{workspace.setVisible(tab.visible);if(!tab.visible)void controller.leave();else void controller.refresh(true,true)},[tab.visible,pair])
  useEffect(()=>{if(!tab.visible||reading)return;const timer=setTimeout(()=>void controller.selectFilter({order:'recent',query,...(group==='all'?{}:{sessionId,relation:group})},false),180);return()=>clearTimeout(timer)},[query,group,sessionId,pair,tab.visible,reading])
  useEffect(()=>{const saved=(e:Event)=>{const data=(e as CustomEvent<{sessionId:string;noteId:string}>).detail;if(data.sessionId!==sessionId||!visible.current)return;setReading(true);setQuery('');setGroup('source');void controller.leave().then(async ok=>{if(!ok||!alive.current||!visible.current)return;await controller.filter({sessionId,relation:'source',order:'recent'});if(alive.current&&visible.current&&await controller.open(data.noteId))setReading(true)})};window.addEventListener('fatfish-notes-captured',saved);return()=>window.removeEventListener('fatfish-notes-captured',saved)},[pair,sessionId])
  async function open(id:string){if(await controller.open(id))setReading(true)}
  async function back(){if(await controller.leave())setReading(false)}
  async function associate(item:Pick<NoteListItem,'noteId'|'heads'>,linked:boolean){setError(false);try{await workspace.api('/notes/associate',{noteId:item.noteId,expectedHeads:item.heads,sessionId,linked});setUndo(linked?null:item.noteId);await controller.refresh(true,true);if(linked){setGroup('linked');setQuery('')}}catch{setError(true)}}
  async function restore(){if(!undo)return;try{const {note}=await workspace.api('/notes/get',{noteId:undo});await associate(note,true)}catch{setError(true)}}
  return <section className="paper-app conversation-notes" data-conversation-notes={sessionId}>
    <style>{notesCss+paperCss+organizationCss+transferCss+conversationNotesCss}</style>
    <header className="conversation-notes-head"><strong>{reading?<button title={t('notesBack')} aria-label={t('notesBack')} onClick={()=>void back()}><ArrowLeft size={16}/></button>:<BookOpen size={17}/>}<span>{t('sessionNotes')}</span></strong><span><button title={t('sessionSave')} aria-label={t('sessionSave')} onClick={()=>void bridge.open(sessionId)}><BookPlus size={17}/></button><WindowButton workspace={workspace} t={t}/></span></header>
    <WorkspaceNotice workspace={workspace} t={t}/>
    {error&&<p role="alert" className="conversation-message">{t('sessionOperationFailed')}</p>}
    {undo&&<p role="status" className="conversation-message">{t('sessionUnlinked')} <button onClick={()=>void restore()}>{t('undo')}</button></p>}
    {reading&&state.note?<div className="paper-detail"><NoteReference controller={controller} inputActions={inputActions} useInput={useInput} sessionId={sessionId} visible={tab.visible} t={t}/><NoteEditor key={state.noteId} controller={controller} state={state} t={t} onTagClick={()=>{}} outlineSession={outline} onNoteLink={id=>void open(id)} onReturn={undefined} onPurge={()=>{}}/></div>:<>
      <div className="conversation-notes-search"><Search size={15}/><input type="search" aria-label={t('notesSearch')} placeholder={t('notesSearch')} value={query} onChange={e=>setQuery(e.target.value)}/></div>
      <nav className="conversation-notes-tabs">{(['source','linked','all'] as const).map(key=><button key={key} aria-pressed={group===key} onClick={()=>setGroup(key)}>{t(key==='source'?'sessionSource':key==='linked'?'sessionLinked':'sessionFind')}</button>)}</nav>
      <div className="conversation-notes-list" aria-busy={state.loadingList}>{state.listError?<p role="alert">{t('sessionLoadFailed')}</p>:!state.items.length?<p className="conversation-empty">{t(state.loadingList?'loading':group==='all'?'notesEmpty':'sessionEmpty')}</p>:state.items.map(item=><article key={item.noteId}><button className="conversation-note-row" onClick={()=>void open(item.noteId)}><strong>{item.title}</strong><p>{item.summary||item.excerpt}</p><small>{noteDateTime(item.savedAt)}</small></button>{group!=='source'&&<button className="conversation-link" title={t(group==='all'?'sessionAssociate':'sessionDissociate')} aria-label={t(group==='all'?'sessionAssociate':'sessionDissociate')} onClick={()=>void associate(item,group==='all')}>{group==='all'?<Link size={15}/>:<Unlink size={15}/>}</button>}</article>)}{state.cursor&&<button onClick={()=>void controller.refresh(false)}>{t('loadMore')}</button>}</div>
      <footer className="conversation-notes-foot">{t('sessionPrivacy')}</footer>
    </>}
  </section>
}

export const conversationNotesCss=`
.conversation-reference{padding:7px 14px;border-bottom:1px solid var(--rule);font-size:12px}.conversation-reference p{margin:5px 0;color:var(--muted)}.conversation-notes button{border:0;background:transparent;color:inherit;cursor:pointer;border-radius:6px;padding:5px 8px;display:inline-flex;align-items:center;gap:5px}.conversation-notes button:hover{background:var(--selected)}.conversation-notes-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--base);border-bottom:1px solid var(--rule);flex-shrink:0}.conversation-notes-head strong,.conversation-notes-head>span{display:flex;align-items:center;gap:8px}.conversation-notes-search{display:flex;align-items:center;gap:7px;margin:14px 14px 8px;border:1px solid var(--rule);border-radius:7px;background:var(--base);padding:6px 9px}.conversation-notes-search input{min-width:0;width:100%;border:0;background:transparent;outline:none;color:var(--ink)}.conversation-notes-tabs{display:flex;gap:4px;padding:0 12px 9px;font-size:12px}.conversation-notes-tabs [aria-pressed=true]{background:var(--selected);font-weight:600}.conversation-notes-list{overflow:auto;min-height:0;flex:1;padding:0 12px}.conversation-notes-list article{position:relative;border-bottom:1px solid var(--rule);padding:5px 0}.conversation-notes-list .conversation-note-row{display:block;width:100%;text-align:left;padding:12px 32px 12px 9px}.conversation-note-row strong{display:block;overflow-wrap:anywhere}.conversation-note-row p{font-size:13px;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin:6px 0}.conversation-note-row small{font-size:11px;color:var(--muted)}.conversation-link{position:absolute;right:0;top:12px}.conversation-notes-foot,.conversation-empty{font-size:12px;color:var(--muted);padding:16px}.conversation-notes .paper-detail{min-width:0;min-height:0;flex:1;display:flex;flex-direction:column}.conversation-notes .paper-window-notice{padding:8px 12px}.conversation-message{padding:6px 14px;font-size:12px}.conversation-book-picker select{display:block;width:100%;margin-top:6px;padding:8px;background:var(--base);color:inherit;border:1px solid var(--rule);border-radius:6px}.conversation-book-actions,.conversation-book-new{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.conversation-book-actions button,.conversation-book-new button{display:inline-flex;align-items:center;gap:5px;font-size:12px}.conversation-book-new input{flex:1;min-width:100px;padding:6px;border:1px solid var(--rule);border-radius:5px;background:transparent;color:inherit}
`
