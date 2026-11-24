import {notebookTitle} from "../../notes/notebooks.js"
import * as React from 'react'
import type { NoteOverview as NoteOverviewData, NoteOverviewItem, NotebookView } from '../../contracts/notes.js'
import { noteDateTime } from '../../notes/date.js'
import type { T } from '../locale.js'
import { BrandMark, BrandWordmark } from '../Brand.js'
import { ArrowUpRight, Plus } from 'lucide-react'

const guideUrl = (language: T['language']) => `https://github.com/StarWind97/dsh-fatfish-notes/blob/main/docs/user-guide.${language === 'en' ? 'en' : 'zh'}.md`

export function NoteOverview({overview, books, t, compact=false, disabled, open, create}: {
  overview: NoteOverviewData | undefined
  books: NotebookView[]
  t: T
  compact?: boolean
  disabled: boolean
  open: (id:string)=>void
  create: ()=>void
}) {
  const titles = new Map(books.map(book=>[book.notebookId, notebookTitle(book,t)]))
  const currentYear = String(new Date().getFullYear())
  function rows(items:NoteOverviewItem[], showDate:boolean) {
    return <ul className="paper-overview-notes">{items.map(({noteId,title,notebookId,savedAt}) => {
      const book = notebookId ? titles.get(notebookId) : t('notesDefaultBook')
      const date = showDate ? noteDateTime(savedAt).slice(0,10) : ''
      return <li key={noteId}><button type="button" disabled={disabled} onClick={()=>open(noteId)}>
        <span className="paper-overview-note-text">
          <strong className="paper-overview-title" title={title}>{title || t('notesUntitled')}</strong>
          {book && <small title={book}>{book}</small>}
        </span>
        {date && <time dateTime={savedAt} title={date}>{date.startsWith(currentYear) ? date.slice(5) : date}</time>}
      </button></li>
    })}</ul>
  }
  function group(items: NoteOverviewItem[], key:'notesRecentlyOpened'|'notesRecentlyModified') {
    if (!items.length) return null
    return <section data-recent={key==='notesRecentlyOpened'?'opened':'modified'}><h3>{t(key)}</h3>{rows(items,key==='notesRecentlyModified')}</section>
  }
  return <div className="paper-overview-viewport" data-compact={compact}>
    <section className="paper-overview" aria-label={t('notesOverview')}>
      <header>
        <h2 className="paper-overview-brand" aria-label={t('nav')} tabIndex={-1}>
          <BrandMark size={144} color/><BrandWordmark t={t}/>
        </h2>
        <div className="paper-overview-actions">
          <button type="button" className="paper-overview-new" disabled={disabled} onClick={create}><Plus size={16} aria-hidden="true"/>{t('notesNew')}</button>
          <a href={guideUrl(t.language)} target="_blank" rel="noopener noreferrer">{t('notesOnlineGuide')}<ArrowUpRight size={14} aria-hidden="true"/></a>
        </div>
      </header>
      <div className="paper-overview-groups">
        {group(overview?.opened ?? [], 'notesRecentlyOpened')}
        {group(overview?.modified ?? [], 'notesRecentlyModified')}
      </div>
    </section>
  </div>
}
