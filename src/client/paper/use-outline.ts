import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { outlineHeadings, chapterAt } from './outline.js'
import { readPreference, writePreference } from './layout.js'

export interface WritingNavigation { jump:(position:number)=>void; topPosition:()=>number|null }
function readingEdge(pane:HTMLElement,leaf:HTMLElement){
  return pane.getBoundingClientRect().top+parseFloat(getComputedStyle(pane).paddingTop)+(leaf.querySelector('.paper-doc-head')?.getBoundingClientRect().height??0)+12
}

export function useOutline({root,body,editing,composing,sourceOpen,writing}:{root:RefObject<HTMLElement>;body:string;editing:boolean;composing:boolean;sourceOpen:boolean;writing:RefObject<WritingNavigation>}) {
  const [open,setOpen]=useState(()=>readPreference('outline')==='open')
  const [wide,setWide]=useState(false)
  const [parsedBody,setParsedBody]=useState(body),[active,setActive]=useState<number|null>(null)
  const trigger=useRef<HTMLButtonElement>(null)
  useEffect(()=>{
    if(composing)return
    if(!editing){setParsedBody(body);return}
    const timer=setTimeout(()=>setParsedBody(body),180)
    return ()=>clearTimeout(timer)
  },[body,editing,composing])
  const headings=useMemo(()=>outlineHeadings(parsedBody),[parsedBody])
  useLayoutEffect(()=>{
    // Measure the whole detail area, which does not shrink when the outline opens.
    const detail=root.current?.closest<HTMLElement>('.paper-detail');if(!detail)return
    const measure=()=>setWide(detail.clientWidth>=900)
    measure();const observer=new ResizeObserver(measure);observer.observe(detail)
    return ()=>observer.disconnect()
  },[root])
  useEffect(()=>{
    const leaf=root.current,pane=leaf?.closest<HTMLElement>('.paper-pane');if(!leaf||!pane||!open||sourceOpen)return
    let frame=0
    const measure=()=>{
      frame=0
      if(editing){const pos=writing.current?.topPosition();if(pos!=null)setActive(chapterAt(headings,pos));return}
      const edge=readingEdge(pane,leaf)+4
      let position=-1
      for(const el of leaf.querySelectorAll<HTMLElement>('.note-markdown :is(h1,h2,h3,h4,h5,h6)')){
        if(el.getBoundingClientRect().top>edge)break
        position=Number(el.dataset.mdPos)
      }
      setActive(chapterAt(headings,position))
    }
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(measure)}
    schedule();pane.addEventListener('scroll',schedule,{passive:true});leaf.addEventListener('load',schedule,true)
    const observer=new ResizeObserver(schedule);observer.observe(leaf)
    return ()=>{cancelAnimationFrame(frame);observer.disconnect();pane.removeEventListener('scroll',schedule);leaf.removeEventListener('load',schedule,true)}
  },[root,writing,headings,open,editing,sourceOpen,wide])
  function toggle(){setOpen(value=>{writePreference('outline',value?'closed':'open');return !value})}
  function close(){setOpen(false);writePreference('outline','closed');trigger.current?.focus({preventScroll:true})}
  function jump(position:number){
    if(editing){
      if(parsedBody!==body||composing)return
      writing.current?.jump(position)
    }else{
      const leaf=root.current,pane=leaf?.closest<HTMLElement>('.paper-pane')
      const target=leaf?.querySelector<HTMLElement>(`.note-markdown :is(h1,h2,h3,h4,h5,h6)[data-md-pos="${position}"]`)
      if(!leaf||!pane||!target)return
      pane.scrollTo({top:pane.scrollTop+target.getBoundingClientRect().top-readingEdge(pane,leaf),behavior:'instant'})
    }
    setActive(position)
    if(!wide)setOpen(false)
  }
  return {open,wide,headings,active,trigger,toggle,close,jump,busy:editing&&(parsedBody!==body||composing)}
}
