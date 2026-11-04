import * as React from 'react'
import { useLayoutEffect, useRef, useState } from 'react'
import type { T } from '../locale.js'

const prefix='dsh-github-notebook.private.paper.'
export function readPreference(key:string){try{return localStorage.getItem(prefix+key)}catch{return null}}
export function writePreference(key:string,value:string){try{localStorage.setItem(prefix+key,value)}catch{/* The current view still works. */}}

export function PaperColumns({list,children,selected,t}:{list:React.ReactNode;children:React.ReactNode;selected:boolean;t:T}){
  const root=useRef<HTMLDivElement>(null)
  const [available,setAvailable]=useState(1080)
  const [offset,setOffset]=useState(()=>Math.max(-280,Math.min(280,Number(readPreference('listOffset'))||0)))
  const drag=useRef<{x:number;width:number}|null>(null)
  useLayoutEffect(()=>{
    const el=root.current!
    const measure=()=>setAvailable(el.clientWidth)
    measure();const observer=new ResizeObserver(measure);observer.observe(el)
    return ()=>observer.disconnect()
  },[])
  const baseline=Math.min(432,Math.round(320+(available-1080)*.12))
  const max=Math.max(200,Math.min(480,available-360))
  const width=Math.max(200,Math.min(max,baseline+offset))
  function resize(target:number){const next=Math.max(200,Math.min(max,Math.round(target)))-baseline;setOffset(next);writePreference('listOffset',String(next))}
  return <div className="paper-split" data-selected={selected} ref={root} style={{gridTemplateColumns:`${width}px 0 minmax(0,1fr)`}}>
    <aside id="paper-note-list" className="paper-list" aria-label={t('notesLibrary')}>{list}</aside>
    <div className="paper-divider" role="separator" tabIndex={0} aria-orientation="vertical" aria-controls="paper-note-list" aria-label={t('paperResize')} title={t('paperResize')} aria-valuemin={200} aria-valuemax={max} aria-valuenow={width}
      onDoubleClick={()=>{setOffset(0);writePreference('listOffset','0')}}
      onPointerDown={e=>{if(!e.isPrimary||e.button!==0)return;e.preventDefault();drag.current={x:e.clientX,width};e.currentTarget.setPointerCapture(e.pointerId)}}
      onPointerMove={e=>{if(drag.current && e.currentTarget.hasPointerCapture(e.pointerId))resize(drag.current.width+e.clientX-drag.current.x)}}
      onLostPointerCapture={()=>{drag.current=null}}
      onKeyDown={e=>{const target=({ArrowLeft:width-8,ArrowRight:width+8,Home:200,End:max} as Record<string,number>)[e.key];if(target!==undefined){e.preventDefault();resize(target)}}}/>
    <div className="paper-pane">{children}</div>
  </div>
}
