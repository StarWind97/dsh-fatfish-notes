import * as React from 'react'
import {useEffect,useState} from 'react'
import {Plus,Check} from 'lucide-react'
import {api,type Api} from './api.js'
import {importId} from './library-import.js'
import {activeNotebook} from '../notes/notebooks.js'
import type {NotebookView} from '../contracts/notes.js'
import type {T} from './locale.js'

export function CaptureNotebook({value,choose,workspace,t,call=api,onMapped}:{value:string|null;choose:(id:string)=>void;workspace?:{id:string;title:string}|null;t:T;call?:Api;onMapped?:(id:string)=>void}){
  const [books,setBooks]=useState<NotebookView[]>([]),[adding,setAdding]=useState(false),[title,setTitle]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(false),[mapped,setMapped]=useState<string|null>(null)
  useEffect(()=>{const c=new AbortController();void call('/notes/notebooks',undefined,c.signal).then(r=>setBooks(r.notebooks.filter(activeNotebook))).catch(()=>{if(!c.signal.aborted)setError(true)});if(workspace)void call('/notes/workspace-book',{workspaceId:workspace.id},c.signal).then(r=>setMapped(r.notebookId)).catch(()=>{});return()=>c.abort()},[workspace?.id,call])
  const selected=value??books.find(b=>b.isDefault)?.notebookId??''
  async function save(create:boolean){
    setBusy(true);setError(false)
    try{
      let target=selected
      if(create){const notebookId=importId(),r=await call('/notes/notebook',{notebookId,title:title.trim(),expectedHeads:[]});const book=r.notebooks.find(b=>b.notebookId===notebookId);if(!book)throw Error();target=book.notebookId;setBooks(r.notebooks.filter(activeNotebook));choose(target);setAdding(false)}
      if(workspace){await call('/notes/workspace-book',{workspaceId:workspace.id,notebookId:target});setMapped(target);onMapped?.(target);window.dispatchEvent(new Event('fatfish-workspace-book'))}
    }catch{setError(true)}finally{setBusy(false)}
  }
  return <div className="conversation-book-picker"><style>{captureNotebookCss}</style><label>{t('notesNotebook')}<select aria-label={t('notesNotebook')} value={selected} disabled={busy} onChange={e=>choose(e.target.value)}><option hidden value=""/>{books.map(b=><option key={b.notebookId} value={b.notebookId}>{b.current.title}{b.isDefault?` · ${t('notesDefaultBadge')}`:''}</option>)}</select></label>
    <div className="conversation-book-actions"><button type="button" disabled={busy} onClick={()=>{setAdding(!adding);setTitle(workspace?.title??'')}}><Plus size={14}/>{t(workspace?'sessionNewWorkspaceBook':'notesNewNotebook')}</button>{workspace&&selected&&<button type="button" disabled={busy||selected===mapped} onClick={()=>void save(false)}>{selected===mapped?<Check size={14}/>:null}{t(selected===mapped?'sessionWorkspaceDefault':'sessionSetDefault')}</button>}</div>
    {adding&&<form className="conversation-book-new" onSubmit={e=>{e.preventDefault();void save(true)}}><input aria-label={t('notesNotebook')} placeholder={t('sessionBookName')} value={title} onChange={e=>setTitle(e.target.value)} autoFocus maxLength={180}/><button disabled={busy||!title.trim()}>{t('create')}</button><button type="button" disabled={busy} onClick={()=>setAdding(false)}>{t('cancel')}</button></form>}
    {error&&<p role="alert">{t('notesBooksFailed')}</p>}
  </div>
}

export const captureNotebookCss=`
.conversation-book-picker select,.conversation-book-picker option{background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#222)}
.conversation-book-picker select{display:block;width:100%;margin-top:6px;padding:8px;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:6px}
.conversation-book-actions,.conversation-book-new{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.conversation-book-actions button,.conversation-book-new button{display:inline-flex;align-items:center;gap:5px;font-size:12px}.conversation-book-new input{flex:1;min-width:100px;padding:6px;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:5px;background:transparent;color:inherit}
`
