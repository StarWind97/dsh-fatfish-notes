import * as React from 'react'
import {useEffect,useLayoutEffect,useRef,useState,useSyncExternalStore} from 'react'
import {X,ChevronDown} from 'lucide-react'
import {createPortal} from 'react-dom'
import {RowMenu} from '../RowMenu.js'
import type {NotesController,NotesState} from '../notes-controller.js'
import {noteTabs} from './note-tabs.js'
import {useAppearance,useAppearanceProps} from './appearance.js'
export function useNoteTabs(controller:NotesController,state:NotesState,root:React.RefObject<HTMLElement>,onSelected?:(id:string)=>void){
  const selected=useRef(onSelected);selected.current=onSelected
  const session=noteTabs(controller),tabs=useSyncExternalStore(session.subscribe,session.getSnapshot),previous=useRef<string|null>(null),lastPane=useRef<HTMLElement|null>(null)
  useLayoutEffect(()=>{session.reconcile();return controller.subscribe(session.reconcile)},[session,controller])
  useLayoutEffect(()=>{
    const id=state.noteId,pane=root.current?.querySelector<HTMLElement>('.paper-pane')
    if(state.loadingNote||!id||!pane)return
    if(previous.current!==id||lastPane.current!==pane){pane.scrollTop=session.positions.get(id)??0;previous.current=id;lastPane.current=pane}
    const remember=()=>session.positions.set(id,pane.scrollTop);pane.addEventListener('scroll',remember,{passive:true})
    return()=>{remember();pane.removeEventListener('scroll',remember)}
  })
  useEffect(()=>{const el=root.current;if(!el)return
    const key=(e:KeyboardEvent)=>{if(e.defaultPrevented||e.key!=='Tab'||!e.ctrlKey||e.altKey||e.metaKey||e.isComposing||(e.target as HTMLElement).closest('dialog,[role=dialog],[role=menu]'))return
      const state=controller.getSnapshot(),tabs=session.getSnapshot();if(tabs.length<2||state.composing||state.operation||controller.importing)return
      e.preventDefault();e.stopPropagation();if(state.loadingNote||e.repeat)return
      const at=tabs.findIndex(t=>t.id===state.noteId),next=tabs[(at+(e.shiftKey?tabs.length-1:1))%tabs.length];if(next)void session.select(next.id).then(ok=>{if(ok)selected.current?.(next.id)})
    }
    el.addEventListener('keydown',key);return()=>el.removeEventListener('keydown',key)
  },[controller,session,root])
  useLayoutEffect(()=>{const row=root.current?.querySelector<HTMLElement>('.paper-row[aria-current],.conversation-note-row[aria-current]');row?.scrollIntoView({block:'nearest',inline:'nearest'})},[state.noteId,state.items,root])
  return {session,tabs}
}
export function NoteTabBar({controller,state,session,tabs,onSelect,beforeSelect}:{controller:NotesController;state:NotesState;session:ReturnType<typeof noteTabs>;tabs:ReturnType<ReturnType<typeof noteTabs>['getSnapshot']>;onSelect?:(id:string)=>void;beforeSelect?:()=>void}){
  const appearance=useAppearance(),appearanceProps=useAppearanceProps(),root=useRef<HTMLElement>(null),overflow=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null)
  const [width,setWidth]=useState(0),[more,setMore]=useState(false),[at,setAt]=useState({top:0,right:0})
  useLayoutEffect(()=>{const el=root.current;if(!el)return;const measure=()=>{setWidth(el.clientWidth);setMore(false)};measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect()},[appearance.tabs,tabs.length>0])
  useEffect(()=>{if(!more)return;const outside=(e:PointerEvent)=>{const target=e.target as HTMLElement;if(!overflow.current?.contains(target)&&!trigger.current?.contains(target)&&!target.closest('[role=menu]'))setMore(false)};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)},[more])
  const count=Math.max(1,Math.floor((width-48)/150)),visible=tabs.slice(0,count)
  const current=tabs.find(t=>t.id===state.noteId)
  if(current&&!visible.includes(current))visible[visible.length-1]=current
  const rest=tabs.filter(t=>!visible.includes(t)),busy=state.operation||state.composing||controller.importing
  if(!appearance.tabs||!tabs.length)return null
  async function select(id:string){beforeSelect?.();if(await session.select(id)){setMore(false);onSelect?.(id)}}
  function actions(id:string){return [{label:'关闭此标签',disabled:busy,run:()=>{beforeSelect?.();void session.close(id).then(ok=>{if(ok)setMore(false)})}},{label:'关闭其他标签',disabled:busy||tabs.length<2,run:()=>{beforeSelect?.();void session.closeOthers(id).then(ok=>{if(ok){setMore(false);onSelect?.(id)}})}}]}
  function keys(event:React.KeyboardEvent){
    if(!(event.target instanceof HTMLButtonElement)||event.target.getAttribute('role')!=='tab')return
    const buttons=[...root.current!.querySelectorAll<HTMLButtonElement>('[role=tab]:not(:disabled)')],index=buttons.indexOf(event.target)
    const next=event.key==='ArrowRight'?(index+1)%buttons.length:event.key==='ArrowLeft'?(index-1+buttons.length)%buttons.length:event.key==='Home'?0:event.key==='End'?buttons.length-1:null
    if(next!==null){event.preventDefault();buttons[next]?.focus()}
  }
  return <nav ref={root} className="paper-note-tabs" aria-label="本次打开的笔记" onKeyDown={keys}><div role="tablist">{visible.map((tab,index)=><div className="paper-note-tab" key={tab.id} data-active={state.noteId===tab.id}><RowMenu triggerVisible={false} label={tab.title+' · 标签操作'} actions={actions(tab.id)}><button type="button" role="tab" tabIndex={state.noteId===tab.id||(!state.noteId&&index===0)?0:-1} aria-selected={state.noteId===tab.id} title={tab.title+(tab.trashed?' · 回收站':'')} disabled={busy} onClick={()=>void select(tab.id)}>{tab.title}{tab.trashed?' · 回收站':''}</button><button type="button" aria-label={'关闭标签：'+tab.title} title="关闭标签" disabled={busy} onClick={()=>{beforeSelect?.();void session.close(tab.id)}}><X size={12}/></button></RowMenu></div>)}</div>
    {!!rest.length&&<button ref={trigger} type="button" className="paper-tabs-more" aria-label={`其他打开的笔记（${rest.length}）`} title={`其他打开的笔记（${rest.length}）`} aria-expanded={more} aria-haspopup="dialog" onClick={()=>{const r=trigger.current!.getBoundingClientRect();setAt({top:r.bottom+4,right:Math.max(8,innerWidth-r.right)});setMore(!more)}}><ChevronDown size={16}/><small>{rest.length}</small></button>}
    {more&&!!rest.length&&createPortal(<div ref={overflow} className="paper-tabs-overflow" role="dialog" aria-label="其他打开的笔记" style={{...appearanceProps.style,...at}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setMore(false);trigger.current?.focus()}}}><header>其他打开的笔记</header>{rest.map(tab=><RowMenu key={tab.id} label={tab.title+' · 标签操作'} actions={actions(tab.id)}><button type="button" disabled={busy} title={tab.title} onClick={()=>void select(tab.id)}>{tab.title}</button></RowMenu>)}</div>,document.body)}
  </nav>
}
