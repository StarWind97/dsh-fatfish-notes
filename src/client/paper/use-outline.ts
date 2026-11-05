import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject, type MutableRefObject } from 'react'
import { outlineHeadings, chapterAt } from './outline.js'

export interface WritingNavigation { jump:(position:number)=>void; topPosition:()=>number|null }
export interface OutlineSession { wide:boolean|null; open:boolean }
function readingEdge(pane:HTMLElement){
  return pane.getBoundingClientRect().top+parseFloat(getComputedStyle(pane).paddingTop)+12
}

export function useOutline({root,body,editing,composing,sourceOpen,writing,session}:{root:RefObject<HTMLElement>;body:string;editing:boolean;composing:boolean;sourceOpen:boolean;writing:RefObject<WritingNavigation>;session:MutableRefObject<OutlineSession>}) {
  const [open,setOpen]=useState(session.current.open)
  const [wide,setWide]=useState(session.current.wide??false)
  const [parsedBody,setParsedBody]=useState(body),[active,setActive]=useState<number|null>(null)
  const trigger=useRef<HTMLButtonElement>(null),edge=useRef<HTMLButtonElement>(null),panel=useRef<HTMLElement>(null)
  const change=useCallback((next:boolean)=>{session.current.open=next;setOpen(next)},[session])
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
    const measure=()=>{
      if(!detail.clientWidth)return // A hidden detail panel must not reset the current choice.
      const next=detail.clientWidth>=900
      if(session.current.wide!==next){session.current.wide=next;change(next)}
      setWide(next)
    }
    measure();const observer=new ResizeObserver(measure);observer.observe(detail)
    return ()=>observer.disconnect()
  },[root,session,change])
  useEffect(()=>{
    if(!open||wide||sourceOpen)return
    let timer:ReturnType<typeof setTimeout>|undefined,dragging=false,tabbing=false
    const inside=(target:EventTarget|null)=>target instanceof Node&&[trigger.current,edge.current,panel.current].some(el=>el?.contains(target))
    const cancel=()=>{clearTimeout(timer);timer=undefined}
    const leave=()=>{cancel();timer=setTimeout(()=>change(false),200)}
    const move=(e:PointerEvent)=>{if(e.pointerType==='touch')return;if(inside(e.target))cancel();else if(!dragging&&timer===undefined)timer=setTimeout(()=>{timer=undefined;change(false)},200)}
    const down=(e:PointerEvent)=>{tabbing=false;cancel();timer=undefined;dragging=inside(e.target);if(!dragging)change(false)}
    const up=()=>{dragging=false}
    const key=(e:KeyboardEvent)=>{tabbing=e.key==='Tab'}
    // Chapter navigation can focus the editor programmatically. Only Tab means leaving by keyboard.
    const focus=(e:FocusEvent)=>{if(tabbing&&!inside(e.target))change(false);tabbing=false}
    document.addEventListener('pointermove',move);document.addEventListener('pointerdown',down,true)
    document.addEventListener('pointerup',up);document.addEventListener('pointerleave',leave)
    document.addEventListener('keydown',key,true);document.addEventListener('focusin',focus)
    return()=>{cancel();document.removeEventListener('pointermove',move);document.removeEventListener('pointerdown',down,true);document.removeEventListener('pointerup',up);document.removeEventListener('pointerleave',leave);document.removeEventListener('keydown',key,true);document.removeEventListener('focusin',focus)}
  },[open,wide,sourceOpen,change])
  useEffect(()=>{
    const leaf=root.current,pane=leaf?.closest<HTMLElement>('.paper-pane');if(!leaf||!pane||!open||sourceOpen)return
    let frame=0
    const measure=()=>{
      frame=0
      const atEnd=pane.scrollTop>0&&pane.scrollHeight-pane.clientHeight-pane.scrollTop<=2
      if(editing){const pos=writing.current?.topPosition();if(pos!=null)setActive(chapterAt(headings,pos,atEnd));return}
      const edge=readingEdge(pane)+4
      let position=-1
      for(const el of leaf.querySelectorAll<HTMLElement>('.note-markdown :is(h1,h2,h3,h4,h5,h6)')){
        if(el.getBoundingClientRect().top>edge)break
        position=Number(el.dataset.mdPos)
      }
      setActive(chapterAt(headings,position,atEnd))
    }
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(measure)}
    schedule();pane.addEventListener('scroll',schedule,{passive:true});leaf.addEventListener('load',schedule,true)
    const observer=new ResizeObserver(schedule);observer.observe(leaf);observer.observe(pane)
    return ()=>{cancelAnimationFrame(frame);observer.disconnect();pane.removeEventListener('scroll',schedule);leaf.removeEventListener('load',schedule,true)}
  },[root,writing,headings,open,editing,sourceOpen,wide])
  function toggle(){change(!open)}
  function close(){change(false);trigger.current?.focus({preventScroll:true})}
  function jump(position:number){
    if(editing){
      if(parsedBody!==body||composing)return
      writing.current?.jump(position)
    }else{
      const leaf=root.current,pane=leaf?.closest<HTMLElement>('.paper-pane')
      const target=leaf?.querySelector<HTMLElement>(`.note-markdown :is(h1,h2,h3,h4,h5,h6)[data-md-pos="${position}"]`)
      if(!leaf||!pane||!target)return
      pane.scrollTo({top:pane.scrollTop+target.getBoundingClientRect().top-readingEdge(pane),behavior:'instant'})
    }
    setActive(position)
  }
  return {open,wide,headings,active,trigger,edge,panel,toggle,close,jump,busy:editing&&(parsedBody!==body||composing)}
}
