import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Ellipsis, type LucideIcon } from 'lucide-react'
import type { T } from '../locale.js'

export interface NoteAction { label:string; icon:LucideIcon; run:()=>void; secondary?:boolean; disabled?:boolean; menuOnly?:boolean; title?:string; ariaLabel?:string; compact?:boolean }
export function NoteActions({actions,t,children}:{actions:NoteAction[]; t:T;children?:React.ReactNode}) {
  const [open,setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null)
  useEffect(()=>{
    if (!open) return
    const outside = (e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)}
    document.addEventListener('pointerdown',outside)
    root.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus()
    return ()=>document.removeEventListener('pointerdown',outside)
  },[open])
  function button(action:NoteAction,menu=false) {
    const Icon = action.icon
    return <button key={action.label} role={menu?'menuitem':undefined} title={action.title} aria-label={action.ariaLabel} data-compact={action.compact||undefined}
      className={!menu && action.secondary?'paper-secondary':undefined} disabled={action.disabled}
      onClick={()=>{if(menu){setOpen(false);trigger.current?.focus()}action.run()}}><Icon size={15}/><span className="paper-action-label">{action.label}</span></button>
  }
  return <div className="paper-actions" ref={root} onBlur={e=>{if(e.relatedTarget&&!e.currentTarget.contains(e.relatedTarget))setOpen(false)}}
    onKeyDown={e=>{
      if(!open)return
      if(e.key==='Escape'){e.preventDefault();setOpen(false);trigger.current?.focus();return}
      if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return
      const buttons=Array.from(root.current!.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'))
      const i=buttons.indexOf(document.activeElement as HTMLButtonElement)
      e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus()
    }}>
    {actions.filter(a=>!a.menuOnly).map(a=>button(a))}
    {children}
    {actions.some(a=>a.secondary||a.menuOnly)&&<div className={`paper-overflow${actions.some(a=>a.menuOnly)?' always':''}`}><button ref={trigger} aria-label={t('paperMore')} title={t('paperMore')} aria-expanded={open} aria-haspopup="menu" onClick={()=>setOpen(!open)}><Ellipsis size={17}/></button>
      {open&&<div className="paper-popup more" role="menu">{actions.filter(a=>a.secondary||a.menuOnly).map(a=>button(a,true))}</div>}</div>}
  </div>
}
