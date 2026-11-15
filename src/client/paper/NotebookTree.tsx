import * as React from 'react'
import {useEffect,useLayoutEffect,useRef,useState} from 'react'
import {ChevronDown,ChevronRight,Notebook} from 'lucide-react'
import type {NotesController,NotesState} from '../notes-controller.js'
import type {NotebookView,NoteListItem} from '../../contracts/notes.js'
import {NotebookPages} from './notebook-pages.js'
import {NoteSelectionRow} from '../NoteSelectionRow.js'
import type {RowAction} from '../RowMenu.js'
import {RowMenu} from '../RowMenu.js'
const stores=new WeakMap<NotesController,{epoch:number;catalog:number;pages:NotebookPages;expanded:Set<string>}>()
export function NotebookTree({controller,state,books,actions,bookActions}:{controller:NotesController;state:NotesState;books:NotebookView[];actions:(item:NoteListItem)=>RowAction[];bookActions:(book:NotebookView)=>RowAction[]}){
  let stored=stores.get(controller);if(!stored||stored.epoch!==controller.libraryEpoch){stored={epoch:controller.libraryEpoch,catalog:controller.catalogEpoch,pages:new NotebookPages(),expanded:new Set()};stores.set(controller,stored)}
  const model=stored,[,render]=useState(0),[busy,setBusy]=useState<string[]>([]),[errors,setErrors]=useState<string[]>([]),requests=useRef(new Map<string,AbortController>())
  const actual=state.note?.effectiveNotebookId??state.draft?.notebookId
  useLayoutEffect(()=>{if(model.catalog!==controller.catalogEpoch){model.catalog=controller.catalogEpoch;model.pages.invalidate()}model.pages.seed(state.filter,state.items,state.cursor);if(actual)model.expanded.add(actual);render(n=>n+1)},[model,state.filter,state.items,state.cursor,actual,controller.catalogEpoch])
  useEffect(()=>()=>{for(const request of requests.current.values())request.abort();requests.current.clear()},[])
  async function load(id:string,more=false){
    if(requests.current.has(id))return
    const abort=new AbortController(),epoch=controller.libraryEpoch,catalog=controller.catalogEpoch;requests.current.set(id,abort);setBusy(ids=>[...ids,id]);setErrors(ids=>ids.filter(x=>x!==id))
    const old=model.pages.get(id),append=more&&!!old?.complete&&!!old.cursor
    try{const page=await controller.api('/notes',{notebookId:id,order:'recent',limit:50,...(append?{cursor:old!.cursor!}:{})},abort.signal);if(!abort.signal.aborted&&epoch===controller.libraryEpoch&&catalog===controller.catalogEpoch){model.pages.merge(id,page,append);render(n=>n+1)}}
    catch{if(!abort.signal.aborted)setErrors(ids=>[...ids,id])}
    finally{requests.current.delete(id);if(!abort.signal.aborted)setBusy(ids=>ids.filter(x=>x!==id))}
  }
  function toggle(id:string){if(model.expanded.has(id))model.expanded.delete(id);else{model.expanded.add(id);if(!model.pages.get(id))void load(id)}render(n=>n+1)}
  async function open(id:string){if(await controller.open(id))await controller.revealCurrent(id)}
  return <div className="paper-notebook-tree" aria-label="笔记本与笔记">{books.map(book=>{
    const expanded=model.expanded.has(book.notebookId),page=model.pages.get(book.notebookId),pending=busy.includes(book.notebookId)
    return <section className="paper-tree-group" key={book.notebookId}><header><RowMenu label={book.current.title+' · 操作'} actions={bookActions(book)}><button aria-expanded={expanded} title={book.current.title} aria-current={actual===book.notebookId?'page':undefined} onClick={()=>toggle(book.notebookId)}>{expanded?<ChevronDown size={14}/>:<ChevronRight size={14}/>}<Notebook size={14}/><span>{book.current.title}</span><small>{book.noteCount??''}</small></button></RowMenu></header>{expanded&&<div className="paper-tree-items">{page?.items.map(item=><div className="paper-tree-row" key={item.noteId}><NoteSelectionRow selecting={false} selected={false} label={item.title||'无标题'} actions={actions(item)} rowClass="paper-row" current={item.noteId===state.noteId} toggle={()=>{}} open={()=>void open(item.noteId)}><strong>{item.title||'无标题'}</strong></NoteSelectionRow></div>)}{pending&&<p role="status">加载中…</p>}{errors.includes(book.notebookId)?<button onClick={()=>void load(book.notebookId)}>加载失败，重试</button>:!pending&&(!page?.complete||page.cursor)?<button className="paper-tree-more" onClick={()=>void load(book.notebookId,true)}>加载更多笔记</button>:!pending&&!page?.items.length?<p className="paper-hint">暂无笔记</p>:null}</div>}</section>
  })}</div>
}
