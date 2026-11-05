import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { T } from '../locale.js'

export function TrashAction({t,disabled,confirm}:{t:T;disabled:boolean;confirm:()=>Promise<void>}) {
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false)
  const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),cancel=useRef<HTMLButtonElement>(null),id=React.useId()
  const close=()=>{setOpen(false);trigger.current?.focus()}
  useEffect(()=>{if(!open)return;cancel.current?.focus();const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)},[open])
  return <div ref={root} className="paper-trash-action" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();close()}}} onBlur={e=>{if(e.relatedTarget&&!e.currentTarget.contains(e.relatedTarget))setOpen(false)}}>
    <button ref={trigger} className="paper-trash-icon" title={t('notesTrashAction')} aria-label={t('notesTrashAction')} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} disabled={disabled||busy} onClick={()=>setOpen(!open)}><Trash2 size={15} aria-hidden="true"/></button>
    {open&&<div className="paper-trash-confirm" role="dialog" id={id} aria-label={t('trashConfirmTitle')}><strong>{t('trashConfirmTitle')}</strong><p>{t('trashConfirmHint')}</p><footer>
      <button ref={cancel} onClick={close} disabled={busy}>{t('cancel')}</button>
      <button className="paper-trash-accept" disabled={disabled||busy} onClick={()=>{setBusy(true);void confirm().finally(()=>{setBusy(false);setOpen(false)})}}>{t('trashConfirmAction')}</button>
    </footer></div>}
  </div>
}
