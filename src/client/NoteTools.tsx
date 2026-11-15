import * as React from 'react'
import {useEffect,useState} from 'react'
import {ArrowUpRight,Link2} from 'lucide-react'
import type {NoteHistoryItem,NoteListItem,NoteManageRequest,NoteView} from '../contracts/notes.js'
import {api} from './api.js'
import type {NotesController,NotesState} from './notes-controller.js'
import type {T} from './locale.js'
import {PaperDialog} from './paper/PaperDialog.js'
import {NoteMarkdown} from './NoteMarkdown.js'
import {Supplements} from './NoteAttachments.js'
import {noteDateTime} from '../notes/date.js'
export {Highlight} from './SearchText.js'
export function TagSuggestions({value,selected,choose,t}:{value:string;selected:string[];choose:(tag:string)=>void;t:T}) {
  const [tags,setTags]=useState<Array<{tag:string;count:number}>>([])
  useEffect(()=>{const c=new AbortController();void api('/notes/catalog',undefined,c.signal).then(r=>setTags(r.tags)).catch(()=>{});return()=>c.abort()},[])
  const candidates=tags.filter(v=>!selected.includes(v.tag)&&v.tag.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase())).slice(0,8)
  return candidates.length?<div className="paper-tag-suggestions" aria-label={t('findTagSuggestions')}>{candidates.map(v=><button type="button" key={v.tag} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(v.tag)}>#{v.tag}<small>{v.count}</small></button>)}</div>:null
}
export function operationError(controller:NotesController,t:T) {return controller.getSnapshot().error==='note_edit_busy'?t('windowBatchBusy',{count:controller.occupiedCount||1}):t('organizeFailed')}

export function HistoryDialog({note,controller,t,close}:{note:NoteView;controller:NotesController;t:T;close:()=>void}) {
  const [rows,setRows]=useState<NoteHistoryItem[]>([]),[cursor,setCursor]=useState<string|null>(null),[preview,setPreview]=useState<NoteView|null>(null)
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[confirmation,setConfirmation]=useState(false),[loading,setLoading]=useState(false)
  useEffect(()=>{const c=new AbortController();void api('/notes/history',{noteId:note.noteId},c.signal).then(r=>{setRows(r.items);setCursor(r.cursor)}).catch(()=>{if(!c.signal.aborted)setError(t('organizeFailed'))});return()=>c.abort()},[note.noteId])
  async function more(){setLoading(true);try{const r=await api('/notes/history',{noteId:note.noteId,...(cursor?{cursor}:{})});setRows(old=>[...old,...r.items]);setCursor(r.cursor)}catch{setError(t('organizeFailed'))}finally{setLoading(false)}}
  async function select(revision:string){setLoading(true);setConfirmation(false);setError('');try{setPreview((await api('/notes/revision',{noteId:note.noteId,revision})).note)}catch{setError(t('organizeFailed'))}finally{setLoading(false)}}
  async function restore(copy:boolean){if(!preview)return;setBusy(true);try{if(await controller.manage({notes:[{noteId:note.noteId,expectedHeads:note.heads}],action:copy?'revision-copy':'revision',revision:preview.current.revision}))close();else setError(operationError(controller,t))}finally{setBusy(false)}}
  return <PaperDialog title={t('organizeHistory')} closeLabel={t('paperClose')} onClose={close} locked={busy} className="paper-history-dialog"><div className="paper-history-body">
    <nav aria-label={t('organizeVersions')}>{rows.map(row=><button disabled={busy||loading} aria-pressed={preview?.current.revision===row.revision} key={row.revision} onClick={()=>void select(row.revision)}><strong>{noteDateTime(row.recordedAt)}</strong><span>{row.title}</span>{row.revision===note.current.revision&&<small>{t('organizeCurrent')}</small>}</button>)}{cursor&&<button disabled={loading||busy} onClick={()=>void more()}>{t('notesMore')}</button>}</nav>
    <section className="paper-history-preview">{loading?<p role="status">{t('loading')}</p>:preview?<><h2>{preview.current.title}</h2><p className="paper-hint">{preview.current.tags.map(tag=>'#'+tag).join(' ')}</p>{preview.current.summary&&<blockquote>{preview.current.summary}</blockquote>}<NoteMarkdown body={preview.current.body} note={preview}/><Supplements content={preview.current} note={preview} t={t}/></>:<p className="paper-hint">{t('organizePickVersion')}</p>}</section>
    </div>{error&&<p role="alert" className="paper-dialog-message">{error}</p>}{confirmation&&<p className="paper-dialog-message">{t('organizeRestoreConfirm')}</p>}<footer><button disabled={busy} onClick={close}>{t('cancel')}</button><button disabled={busy||loading||!preview} onClick={()=>void restore(true)}>{t('organizeRestoreCopy')}</button><button className="paper-primary" disabled={busy||loading||!preview||preview.current.revision===note.current.revision} onClick={()=>confirmation?void restore(false):setConfirmation(true)}>{t(confirmation?'organizeConfirmRestore':'organizeRestore')}</button></footer></PaperDialog>
}

export function Backlinks({note,t,open,refreshToken,onTotal}:{note:NoteView;t:T;open:(id:string)=>void;refreshToken?:unknown;onTotal?:(total:number|null)=>void}) {
  const [expanded,setExpanded]=useState(true),[items,setItems]=useState<NoteListItem[]>([]),[total,setTotal]=useState<number|null>(null)
  const [cursor,setCursor]=useState<string|null>(null),[error,setError]=useState(false),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0)
  const active=React.useRef<AbortController|null>(null)
  useEffect(()=>{const c=new AbortController();active.current?.abort();active.current=c;setLoading(true);setError(false)
    void api('/notes/backlinks',{noteId:note.noteId},c.signal).then(r=>{setItems(r.items);setTotal(r.total);setCursor(r.cursor)}).catch(()=>{if(!c.signal.aborted)setError(true)}).finally(()=>{if(!c.signal.aborted)setLoading(false)})
    return()=>{active.current?.abort()}
  },[note.noteId,note.current.revision,refreshToken,retry])
  async function more(){if(!cursor||loading)return;const c=new AbortController();active.current=c;setLoading(true);setError(false)
    try{const r=await api('/notes/backlinks',{noteId:note.noteId,cursor},c.signal);if(c.signal.aborted)return;setItems(old=>[...old,...r.items.filter(item=>!old.some(v=>v.noteId===item.noteId))]);setTotal(r.total);setCursor(r.cursor)}catch{if(!c.signal.aborted)setError(true)}finally{if(!c.signal.aborted)setLoading(false)}
  }
  useEffect(()=>{onTotal?.(error?null:total)},[total,error,onTotal])
  if(total===0&&!loading&&!error)return null
  return <section className="paper-backlinks" aria-label={t('reuseBacklinks')} aria-busy={loading}><button aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}><Link2 size={15}/>{t('reuseBacklinks')}{total!==null&&` · ${total}`}</button>
    {loading&&total===null&&<p role="status">{t('loading')}</p>}{error&&<p role="alert">{t('organizeFailed')} <button onClick={()=>setRetry(n=>n+1)}>{t('noteRetry')}</button></p>}
    {expanded&&<>{items.length>0&&<ul>{items.map(item=><li key={item.noteId}><button onClick={()=>open(item.noteId)}>{item.title}<ArrowUpRight size={14}/></button></li>)}</ul>}{cursor&&<button disabled={loading} onClick={()=>void more()}>{t(loading?'loading':'notesMore')}</button>}</>}
  </section>
}
export function LinkPreview({id,t,close,open}:{id:string;t:T;close:()=>void;open:()=>void}) {
  const [note,setNote]=useState<NoteView|null>(null),[failed,setFailed]=useState(false)
  useEffect(()=>{const c=new AbortController();void api('/notes/get',{noteId:id},c.signal).then(r=>setNote(r.note)).catch(()=>{if(!c.signal.aborted)setFailed(true)});return()=>c.abort()},[id])
  return <PaperDialog title={t('reusePreview')} closeLabel={t('paperClose')} onClose={close}><div className="paper-dialog-content">{failed?<p role="alert">{t('linkDeleted')}</p>:note?<><h2>{note.current.title}</h2>{note.current.status==='trashed'&&<p>{t('linkTrashed')}</p>}<p className="paper-hint">{note.current.tags.map(tag=>'#'+tag).join(' ')}</p>{note.current.summary&&<blockquote>{note.current.summary}</blockquote>}<NoteMarkdown body={note.current.body.slice(0,6000)} note={note}/>{note.current.body.length>6000&&<p>{t('reusePreviewTruncated')}</p>}</>:<p>{t('loading')}</p>}</div><footer><button onClick={close}>{t('paperClose')}</button><button className="paper-primary" disabled={!note} onClick={open}>{t('notesOpen')}</button></footer></PaperDialog>
}
