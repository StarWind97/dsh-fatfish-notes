import * as React from 'react'
import {useLayoutEffect,useRef,useSyncExternalStore} from 'react'
import {X} from 'lucide-react'
import type {NotesController,NotesState} from '../notes-controller.js'
import {noteTabs} from './note-tabs.js'
import {useAppearance} from './appearance.js'
export function useNoteTabs(controller:NotesController,state:NotesState,root:React.RefObject<HTMLElement>){
  const session=noteTabs(controller),tabs=useSyncExternalStore(session.subscribe,session.getSnapshot),previous=useRef<string|null>(null),lastPane=useRef<HTMLElement|null>(null)
  useLayoutEffect(()=>{session.reconcile();return controller.subscribe(session.reconcile)},[session,controller])
  useLayoutEffect(()=>{
    const id=state.noteId,pane=root.current?.querySelector<HTMLElement>('.paper-pane')
    if(state.loadingNote||!id||!pane)return
    if(previous.current!==id||lastPane.current!==pane){pane.scrollTop=session.positions.get(id)??0;previous.current=id;lastPane.current=pane}
    const remember=()=>session.positions.set(id,pane.scrollTop);pane.addEventListener('scroll',remember,{passive:true})
    return()=>{remember();pane.removeEventListener('scroll',remember)}
  })
  useLayoutEffect(()=>{const row=root.current?.querySelector<HTMLElement>('.paper-row[aria-current],.conversation-note-row[aria-current]');row?.scrollIntoView({block:'nearest',inline:'nearest'})},[state.noteId,state.items,root])
  return {session,tabs}
}
export function NoteTabBar({controller,state,session,tabs,onSelect,beforeSelect}:{controller:NotesController;state:NotesState;session:ReturnType<typeof noteTabs>;tabs:ReturnType<ReturnType<typeof noteTabs>['getSnapshot']>;onSelect?:(id:string)=>void;beforeSelect?:()=>void}){
  const appearance=useAppearance(),root=useRef<HTMLElement>(null)
  useLayoutEffect(()=>{root.current?.querySelector('[aria-selected=true]')?.scrollIntoView({block:'nearest',inline:'nearest'})},[state.noteId,tabs])
  if(!appearance.tabs||!tabs.length)return null
  function keys(event:React.KeyboardEvent){
    if(!(event.target instanceof HTMLButtonElement)||event.target.getAttribute('role')!=='tab')return
    const buttons=[...root.current!.querySelectorAll<HTMLButtonElement>('[role=tab]:not(:disabled)')],index=buttons.indexOf(event.target)
    const next=event.key==='ArrowRight'?(index+1)%buttons.length:event.key==='ArrowLeft'?(index-1+buttons.length)%buttons.length:event.key==='Home'?0:event.key==='End'?buttons.length-1:null
    if(next!==null){event.preventDefault();buttons[next]?.focus()}
  }
  return <nav ref={root} className="paper-note-tabs" aria-label="本次打开的笔记" onKeyDown={keys}><div role="tablist">{tabs.map((tab,index)=><div className="paper-note-tab" key={tab.id} data-active={state.noteId===tab.id}><button type="button" role="tab" tabIndex={state.noteId===tab.id||(!state.noteId&&index===0)?0:-1} aria-selected={state.noteId===tab.id} title={tab.title+(tab.trashed?' · 回收站':'')} disabled={state.operation||state.composing||controller.importing} onClick={()=>{beforeSelect?.();void session.select(tab.id).then(ok=>{if(ok)onSelect?.(tab.id)})}}>{tab.title}{tab.trashed?' · 回收站':''}</button><button type="button" aria-label={'关闭标签：'+tab.title} title="关闭标签" disabled={state.operation||state.composing||controller.importing} onClick={()=>{beforeSelect?.();void session.close(tab.id)}}><X size={12}/></button></div>)}</div></nav>
}
