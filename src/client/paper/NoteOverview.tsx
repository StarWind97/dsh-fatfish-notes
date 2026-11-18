import * as React from 'react'
import type { NoteOverview as NoteOverviewData, NoteOverviewItem, NotebookView } from '../../contracts/notes.js'
import { noteDateTime } from '../../notes/date.js'
import type { T } from '../locale.js'

const guide = 'https://github.com/StarWind97/dsh-fatfish-notes/blob/main/docs/user-guide.zh.md'

export function NoteOverview({overview, books, t, compact=false, disabled, open, create}: {
  overview: NoteOverviewData | undefined
  books: NotebookView[]
  t: T
  compact?: boolean
  disabled: boolean
  open: (id:string)=>void
  create: ()=>void
}) {
  const titles = new Map(books.map(book=>[book.notebookId, book.current.title]))
  function group(items: NoteOverviewItem[], key:'notesRecentlyOpened'|'notesRecentlyModified') {
    if (!items.length) return null
    return <section>
      <h3>{t(key)}</h3>
      <ul>{items.map(({noteId,title,notebookId,savedAt}) => {
        const book = notebookId ? titles.get(notebookId) : t('notesDefaultBook')
        return <li key={noteId}><button type="button" disabled={disabled} onClick={()=>open(noteId)}>
          <span className="paper-overview-title" title={title}>{title || t('notesUntitled')}</span>
          {book && <small title={book}>{book}</small>}
          {key==='notesRecentlyModified' && <time dateTime={savedAt}>{noteDateTime(savedAt).slice(0,10)}</time>}
        </button></li>
      })}</ul>
    </section>
  }
  return <div className="paper-overview-viewport" data-compact={compact}><section className="paper-overview">
    <header>
      <h2 tabIndex={-1}>{t('notesOverview')}</h2>
      <div>
        <button type="button" className="paper-primary" disabled={disabled} onClick={create}>{t('notesNew')}</button>
        <a href={guide} target="_blank" rel="noopener noreferrer">{t('notesOnlineGuide')}</a>
      </div>
    </header>
    <div className="paper-overview-groups">
      {group(overview?.opened ?? [], 'notesRecentlyOpened')}
      {group(overview?.modified ?? [], 'notesRecentlyModified')}
    </div>
  </section></div>
}
