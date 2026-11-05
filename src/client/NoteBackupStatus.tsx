import * as React from 'react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { notebookSync } from './notebook-sync.js'
import { syncPresentation } from './sync-presentation.js'
import { SyncDetails, SyncSymbol, syncCss } from './SyncDetails.js'
import type { T } from './locale.js'

export function NoteBackupStatus({t,onPulled,onSettings,dirty,saving,revision}:{t:T;onPulled:()=>void;onSettings:()=>void;dirty:boolean;saving:boolean;revision?:string|undefined}) {
  const sync=useSyncExternalStore(notebookSync.subscribe,notebookSync.getSnapshot,notebookSync.getSnapshot)
  const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),id=React.useId()
  useEffect(()=>{
    const visibility=()=>notebookSync.foreground(document.visibilityState!=='hidden')
    const online=()=>{void notebookSync.request(true)}
    visibility();document.addEventListener('visibilitychange',visibility);window.addEventListener('online',online)
    return()=>{notebookSync.foreground(false);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('online',online)}
  },[])
  useEffect(()=>{if(sync?.lastSuccessAt)onPulled()},[sync?.lastSuccessAt,onPulled])
  useEffect(()=>{if(!saving)void notebookSync.read()},[saving,revision])
  useEffect(()=>{if(dirty||saving)notebookSync.localChanged()},[dirty,saving])
  useEffect(()=>{if(!open)return;const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)},[open])
  const view=syncPresentation(sync,dirty,saving)
  return <div ref={root} className="notebook-sync-anchor" onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false)}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();setOpen(false)}}}>
    <style>{syncCss}</style><button className="paper-sync-status" data-attention={view.state==='error'} data-state={view.state} onClick={()=>setOpen(true)} onFocus={()=>setOpen(true)} aria-expanded={open} aria-controls={id} aria-haspopup="dialog">
      <SyncSymbol {...view}/><span role="status">{t(view.label)}</span>
    </button>
    {open&&<div className="notebook-sync-popover" id={id} role="dialog" aria-label={t('syncDetails')}><div className="notebook-sync-card">
      <SyncDetails sync={sync} dirty={dirty} saving={saving} t={t}/>
      {(view.state==='error'||view.state==='saved')&&<footer><button onClick={()=>void notebookSync.request(true)}>{t('syncRetry')}</button>{view.settings&&<button onClick={()=>{setOpen(false);onSettings()}}>{t('notesSettings')}</button>}</footer>}
    </div></div>}
  </div>
}
