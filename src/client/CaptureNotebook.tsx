import * as React from 'react'
import {useEffect,useState} from 'react'
import {api,type Api} from './api.js'
import {activeNotebook} from '../notes/notebooks.js'
import type {NotebookView} from '../contracts/notes.js'
import type {T} from './locale.js'

/** Capture only chooses an existing destination; management belongs to the library/sidebar. */
export function CaptureNotebook({value,choose,t,call=api,onValid}:{value:string|null;choose:(id:string)=>void;t:T;call?:Api;onValid?:(valid:boolean)=>void}){
  const [books,setBooks]=useState<NotebookView[]>([]),[error,setError]=useState(false),[loaded,setLoaded]=useState(false)
  useEffect(()=>{const c=new AbortController();void call('/notes/notebooks',undefined,c.signal).then(r=>{setBooks(r.notebooks.filter(activeNotebook));setLoaded(true)}).catch(()=>{if(!c.signal.aborted){setError(true);onValid?.(false)}});return()=>c.abort()},[call])
  const selected=value??books.find(b=>b.isDefault)?.notebookId??'',valid=books.some(b=>b.notebookId===selected)
  useEffect(()=>{onValid?.(loaded&&valid)},[loaded,valid,onValid])
  return <div className="conversation-book-picker"><style>{captureNotebookCss}</style><label>{t('notesNotebook')}<select aria-label={t('notesNotebook')} value={valid?selected:''} onChange={e=>choose(e.target.value)}><option value="" disabled>{t(loaded?'sessionChooseBook':'loading')}</option>{books.map(b=><option key={b.notebookId} value={b.notebookId}>{b.current.title}{b.isDefault?` · ${t('notesDefaultBadge')}`:''}</option>)}</select></label>{loaded&&!valid&&<p role="alert">原来的笔记本不可用，请重新选择。</p>}{error&&<p role="alert">{t('notesBooksFailed')}</p>}</div>
}

export const captureNotebookCss=`
.conversation-book-picker select,.conversation-book-picker option{background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#222)}
.conversation-book-picker select{display:block;width:100%;margin-top:6px;padding:8px;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:6px}
.conversation-book-actions,.conversation-book-new{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.conversation-book-actions button,.conversation-book-new button{display:inline-flex;align-items:center;gap:5px;font-size:12px}.conversation-book-new input{flex:1;min-width:100px;padding:6px;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:5px;background:transparent;color:inherit}
`
