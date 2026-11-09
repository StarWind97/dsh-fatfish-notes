import * as React from 'react'
import { useLayoutEffect, useRef, useState } from 'react'
import type { T } from '../locale.js'
import { clamp, columnPreference, columnSizes, defaultColumns, wideColumns, type ColumnPreference, type PaperSurface } from './layout-state.js'

const prefix='dsh-fatfish-notes.private.paper.'
export function readPreference(key:string){try{return localStorage.getItem(prefix+key)}catch{return null}}
export function writePreference(key:string,value:string){try{localStorage.setItem(prefix+key,value)}catch{/* The current view still works. */}}

export function usePaperColumns(root:React.RefObject<HTMLDivElement>,surface:PaperSurface) {
  const [available,setAvailable]=useState(0),[wide,setWide]=useState(false)
  const [preferences,setPreferences]=useState<Record<PaperSurface,ColumnPreference>>(()=>({embedded:columnPreference(readPreference('columns.embedded')),standalone:columnPreference(readPreference('columns.standalone'))}))
  useLayoutEffect(()=>{
    const el=root.current!
    const measure=()=>{if(el.clientWidth){setAvailable(el.clientWidth);setWide(previous=>wideColumns(el.clientWidth,previous))}}
    measure();const observer=new ResizeObserver(measure);observer.observe(el)
    return ()=>observer.disconnect()
  },[root])
  const preference=preferences[surface],sizes=columnSizes(available,preference,wide)
  function update(patch:Partial<ColumnPreference>){setPreferences(current=>{
    const next={...current[surface],...patch};writePreference('columns.'+surface,JSON.stringify(next));return {...current,[surface]:next}
  })}
  function resize(column:'book'|'list',target:number){update({[column]:clamp(Math.round(target),column==='book'?164:240,column==='book'?sizes.bookMax:Math.max(240,sizes.listMax))})}
  return {...sizes,wide,resize,toggle:()=>update({open:!sizes.expanded}),reset:(column:'book'|'list')=>update({[column]:defaultColumns[column]})}
}
type Layout = ReturnType<typeof usePaperColumns>

function Divider({column,layout,t,hidden=false}:{column:'book'|'list';layout:Layout;t:T;hidden?:boolean}){
  const drag=useRef<{x:number;width:number}|null>(null),books=column==='book'
  const width=layout[column],min=books?164:layout.listMin,max=books?layout.bookMax:layout.listMax
  return <div className="paper-divider" hidden={hidden} role="separator" tabIndex={0} aria-orientation="vertical" aria-controls={books?'paper-notebook-list':'paper-note-list'} aria-label={t(books?'paperResizeBooks':'paperResize')} title={t(books?'paperResizeBooks':'paperResize')} aria-valuemin={min} aria-valuemax={max} aria-valuenow={width}
    onDoubleClick={()=>layout.reset(column)}
    onPointerDown={e=>{if(!e.isPrimary||e.button!==0)return;e.preventDefault();drag.current={x:e.clientX,width};e.currentTarget.setPointerCapture(e.pointerId)}}
    onPointerMove={e=>{if(drag.current&&e.currentTarget.hasPointerCapture(e.pointerId))layout.resize(column,drag.current.width+e.clientX-drag.current.x)}}
    onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);drag.current=null}}
    onLostPointerCapture={()=>{drag.current=null}}
    onKeyDown={e=>{const target=({ArrowLeft:width-8,ArrowRight:width+8,Home:min,End:max} as Record<string,number>)[e.key];if(target!==undefined){e.preventDefault();layout.resize(column,target)}}}/>
}

export function PaperColumns({list,notebooks,layout,children,selected,t,hidden=false}:{list:React.ReactNode;notebooks:React.ReactNode;layout:Layout;children:React.ReactNode;selected:boolean;t:T;hidden?:boolean}){
  // Keep all five positions mounted: collapsing navigation must not recreate CodeMirror.
  return <div className="paper-split" hidden={hidden} data-selected={selected} data-notebooks={layout.expanded} style={{gridTemplateColumns:`${layout.expanded?layout.book:0}px 0 ${layout.list}px 0 minmax(0,1fr)`}}>
    <aside id="paper-notebook-list" className="paper-notebook-nav" hidden={!layout.expanded} aria-label={t('notesNotebooks')}>{notebooks}</aside>
    <Divider column="book" layout={layout} t={t} hidden={!layout.expanded}/>
    <aside id="paper-note-list" className="paper-list" aria-label={t('notesLibrary')}>{list}</aside>
    <Divider column="list" layout={layout} t={t}/>
    <div className="paper-detail">{children}</div>
  </div>
}
