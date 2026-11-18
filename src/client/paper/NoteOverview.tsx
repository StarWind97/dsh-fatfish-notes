import * as React from 'react'
import type { NoteOverview as NoteOverviewData, NoteOverviewItem, NotebookView } from '../../contracts/notes.js'
import { noteDateTime } from '../../notes/date.js'
import type { T } from '../locale.js'
import { BrandMark, BrandWordmark } from '../Brand.js'
import { ArrowLeft, ArrowUpRight, Plus } from 'lucide-react'

const guide = 'https://github.com/StarWind97/dsh-fatfish-notes/blob/main/docs/user-guide.zh.md'

export interface OverviewTagResults {
  tag: string
  items: NoteOverviewItem[]
  cursor: string | null
  loading: boolean
  failed: boolean
  epoch: number
}

export function NoteOverview({overview, books, t, compact=false, disabled, open, create, browseTag, tagResults, back, more, retry}: {
  overview: NoteOverviewData | undefined
  books: NotebookView[]
  t: T
  compact?: boolean
  disabled: boolean
  open: (id:string)=>void
  create: ()=>void
  browseTag: (tag:string)=>void
  tagResults: OverviewTagResults | null
  back: ()=>void
  more: ()=>void
  retry: ()=>void
}) {
  const titles = new Map(books.map(book=>[book.notebookId, book.current.title]))
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
    return <section><h3>{t(key)}</h3>{rows(items,key==='notesRecentlyModified')}</section>
  }
  return <div className="paper-overview-viewport" data-compact={compact} data-browsing={!!tagResults}>
    <section className="paper-overview" aria-label={t('notesOverview')}>
    {tagResults ? <div className="paper-overview-results" aria-busy={tagResults.loading}>
      <button type="button" className="paper-overview-back" onClick={back}><ArrowLeft size={16} aria-hidden="true"/>{t('notesBackOverview')}</button>
      <h2 tabIndex={-1}>{tagResults.tag}</h2>
      {rows(tagResults.items,true)}
      {tagResults.loading && <p role="status">{t('loading')}</p>}
      {tagResults.failed && <p role="alert">{t('notesListFailed')} <button type="button" onClick={retry}>{t('refresh')}</button></p>}
      {!tagResults.loading && !tagResults.failed && tagResults.items.length===0 && <p>{t('notesEmpty')}</p>}
      {!!tagResults.cursor && !tagResults.failed && <button type="button" disabled={disabled||tagResults.loading} onClick={more}>{t('notesMore')}</button>}
    </div> : <>
    <header>
      <h2 className="paper-overview-brand" aria-label={t('nav')} tabIndex={-1}>
        <BrandMark size={144} color/><BrandWordmark/>
      </h2>
      <div className="paper-overview-actions">
        <button type="button" className="paper-overview-new" disabled={disabled} onClick={create}><Plus size={16} aria-hidden="true"/>{t('notesNew')}</button>
        <a href={guide} target="_blank" rel="noopener noreferrer">{t('notesOnlineGuide')}<ArrowUpRight size={14} aria-hidden="true"/></a>
      </div>
    </header>
    <div className="paper-overview-groups">
      {group(overview?.opened ?? [], 'notesRecentlyOpened')}
      {group(overview?.modified ?? [], 'notesRecentlyModified')}
    </div>
    {!!overview?.tags.length && <section className="paper-overview-tags">
      <h3>{t('notesBrowseTags')}</h3>
      <ul>{overview.tags.map(({tag,count})=><li key={tag}><button type="button" data-overview-tag={tag} data-popular={count>=4}
        disabled={disabled} onClick={()=>browseTag(tag)}><span>{tag}</span><small>{count}</small></button></li>)}</ul>
    </section>}
    </>}
    </section>
  </div>
}
