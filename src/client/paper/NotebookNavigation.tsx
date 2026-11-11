import {RowMenu,type RowAction} from '../RowMenu.js'
import * as React from 'react'
import { BookOpen, Notebook, PanelLeftClose, Settings, Trash2 } from 'lucide-react'
import type { NotebookView } from '../../contracts/notes.js'
import type { T } from '../locale.js'

export function NotebookNavigation({books,selected,actual,actions,trash,disabled,t,collapse,choose,manage,openTrash}:{
  actions:(book:NotebookView)=>RowAction[];actual?:string|null;books:NotebookView[];selected:string|null|undefined;trash:boolean;disabled:boolean;t:T
  collapse:()=>void;choose:(id?:string)=>void;manage:()=>void;openTrash:()=>void
}){
  const nav=React.useRef<HTMLElement>(null)
  React.useEffect(()=>{const row=nav.current?.querySelector<HTMLElement>('[data-note-book=true]');if(!row||!nav.current)return;const r=row.getBoundingClientRect(),n=nav.current.getBoundingClientRect();if(r.top<n.top)nav.current.scrollTop+=r.top-n.top;else if(r.bottom>n.bottom)nav.current.scrollTop+=r.bottom-n.bottom},[actual])
  const total=books.every(b=>b.noteCount!==undefined)?books.reduce((sum,b)=>sum+b.noteCount!,0):null
  return <><header><span>{t('notesNotebooks')}</span><button aria-label={t('paperCollapseBooks')} title={t('paperCollapseBooks')} aria-expanded={true} aria-controls="paper-notebook-list" onClick={collapse}><PanelLeftClose size={17}/></button></header>
    <button aria-current={!trash&&selected===undefined?'page':undefined} disabled={disabled} onClick={()=>choose()}><BookOpen size={16}/><span className="paper-notebook-name">{t('paperAll')}</span>{total!==null&&<small>{total}</small>}</button>
    <p>{t('paperMyBooks')}</p><nav ref={nav}>{books.map(book=><div key={book.notebookId} data-note-book={actual===book.notebookId} title={actual===book.notebookId?'当前正文所属笔记本':undefined}><RowMenu label={book.current.title+' · 操作'} actions={actions(book)}><button title={book.current.title} aria-label={book.current.title} aria-current={!trash&&(selected===book.notebookId||selected===null&&book.isDefault)?'page':undefined} disabled={disabled} onClick={()=>choose(book.notebookId)}><Notebook size={16}/><span className="paper-notebook-name">{book.current.title}</span>{book.isDefault&&<span className="paper-default-badge">{t('notesDefaultBadge')}</span>}{book.noteCount!==undefined&&<small>{book.noteCount}</small>}</button></RowMenu></div>)}</nav>
    <footer><button disabled={disabled} onClick={manage}><Settings size={16}/>{t('notesManageBooks')}</button><button disabled={disabled} aria-current={trash?'page':undefined} onClick={openTrash}><Trash2 size={16}/>{t('notesTrash')}</button></footer>
  </>
}
