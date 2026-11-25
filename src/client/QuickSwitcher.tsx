import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FileText, Hash, Notebook, Search, Sparkles } from 'lucide-react'
import type { NoteListItem, NotebookView, TagEntry } from '../contracts/notes.js'
import { notebookTitle } from '../notes/notebooks.js'
import type { NotesController, NotesState } from './notes-controller.js'
import type { T } from './locale.js'
import { useStyleSheet } from './styles/inject.js'

export type QuickItemGroup = 'notes' | 'books' | 'tags' | 'commands'

export interface QuickItem {
  id: string
  group: QuickItemGroup
  title: string
  meta?: string
  keywords?: string
  run: () => void
}

/** Pure, local-first fuzzy ranker suitable for 1,000+ cached notes in < 5ms. */
export function filterQuickItems(items: readonly QuickItem[], rawQuery: string, limit = 24): QuickItem[] {
  const terms = rawQuery.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return items.slice(0, limit)
  const scored: { item: QuickItem; score: number }[] = []
  for (const item of items) {
    const title = item.title.toLocaleLowerCase()
    const hay = `${title} ${(item.meta ?? '').toLocaleLowerCase()} ${(item.keywords ?? '').toLocaleLowerCase()}`
    if (!terms.every(term => hay.includes(term))) continue
    let score = 0
    for (const term of terms) {
      if (title === term) score += 100
      else if (title.startsWith(term)) score += 60
      else if (title.includes(term)) score += 35
      else score += 10
    }
    if (item.group === 'notes') score += 5
    scored.push({ item, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map(entry => entry.item)
}

export function QuickSwitcher({
  open,
  onClose,
  controller,
  state,
  books,
  t,
  onOpenNote,
  onOpenBook,
  onFilterTag,
  onCreate,
  onToggleTheme,
  onSync,
  onNavigate,
}: {
  open: boolean
  onClose: () => void
  controller: NotesController
  state: NotesState
  books: NotebookView[]
  t: T
  onOpenNote: (noteId: string) => void
  onOpenBook: (notebookId: string) => void
  onFilterTag: (tag: string) => void
  onCreate: () => void
  onToggleTheme: () => void
  onSync: () => void
  onNavigate: (section: 'notes' | 'notebooks' | 'settings') => void
}) {
  useStyleSheet('quick-switcher', quickSwitcherCss, 'components')
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [remoteNotes, setRemoteNotes] = useState<NoteListItem[]>([])
  const [tags, setTags] = useState<TagEntry[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    openerRef.current = document.activeElement as HTMLElement | null
    setQuery('')
    setActiveIndex(0)
    setRemoteNotes([])
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    const abort = new AbortController()
    void controller
      .api('/notes/catalog', undefined, abort.signal)
      .then(result => {
        if (!abort.signal.aborted) setTags(result.tags)
      })
      .catch(() => {})
    return () => {
      cancelAnimationFrame(frame)
      abort.abort()
      openerRef.current?.focus?.({ preventScroll: true })
    }
  }, [open, controller])

  useEffect(() => {
    if (!open) return
    const trimmed = query.trim()
    if (!trimmed) {
      setRemoteNotes([])
      return
    }
    const abort = new AbortController()
    const timer = setTimeout(() => {
      void controller
        .api('/notes', { query: trimmed, order: 'relevance', limit: 15 }, abort.signal)
        .then(res => {
          if (!abort.signal.aborted) setRemoteNotes(res.items)
        })
        .catch(() => {})
    }, 120)
    return () => {
      clearTimeout(timer)
      abort.abort()
    }
  }, [open, query, controller])

  const bookMap = useMemo(() => new Map(books.map(book => [book.notebookId, notebookTitle(book, t)])), [books, t])

  const allItems = useMemo<QuickItem[]>(() => {
    const result: QuickItem[] = []
    const seenNotes = new Set<string>()
    const addNote = (noteId: string, title: string, notebookId: string | null, keywords = '') => {
      if (seenNotes.has(noteId)) return
      seenNotes.add(noteId)
      result.push({
        id: 'note:' + noteId,
        group: 'notes',
        title: title || t('notesUntitled'),
        meta: notebookId ? bookMap.get(notebookId) ?? t('notesDefaultBook') : t('notesDefaultBook'),
        keywords,
        run: () => {
          onClose()
          onOpenNote(noteId)
        },
      })
    }
    for (const item of remoteNotes) addNote(item.noteId, item.title, item.notebookId, `${item.summary} ${item.tags.join(' ')}`)
    for (const item of state.overview?.opened ?? []) addNote(item.noteId, item.title, item.notebookId)
    for (const item of state.overview?.modified ?? []) addNote(item.noteId, item.title, item.notebookId)
    for (const item of state.items) addNote(item.noteId, item.title, item.notebookId, `${item.summary} ${item.tags.join(' ')}`)

    for (const book of books) {
      const name = notebookTitle(book, t)
      result.push({
        id: 'book:' + book.notebookId,
        group: 'books',
        title: name,
        meta: String(book.noteCount),
        run: () => {
          onClose()
          onOpenBook(book.notebookId)
        },
      })
    }

    for (const entry of tags.slice(0, 60)) {
      result.push({
        id: 'tag:' + entry.tag,
        group: 'tags',
        title: '#' + entry.tag,
        meta: String(entry.count),
        keywords: entry.tag,
        run: () => {
          onClose()
          onFilterTag(entry.tag)
        },
      })
    }

    const commands: [string, string, () => void][] = [
      ['new', t('quickSwitchCmdNew'), onCreate],
      ['theme', t('quickSwitchCmdTheme'), onToggleTheme],
      ['sync', t('quickSwitchCmdSync'), onSync],
      ['class', t('quickSwitchCmdClass'), () => onNavigate('notebooks')],
      ['settings', t('quickSwitchCmdSettings'), () => onNavigate('settings')],
    ]
    for (const [key, label, action] of commands) {
      result.push({
        id: 'cmd:' + key,
        group: 'commands',
        title: label,
        run: () => {
          onClose()
          action()
        },
      })
    }
    return result
  }, [remoteNotes, state.overview, state.items, books, tags, bookMap, t, onClose, onOpenNote, onOpenBook, onFilterTag, onCreate, onToggleTheme, onSync, onNavigate])

  const filtered = useMemo(() => filterQuickItems(allItems, query, 24), [allItems, query])
  useEffect(() => setActiveIndex(0), [query, filtered.length])

  if (!open) return null

  const groupLabel = (group: QuickItemGroup) =>
    group === 'notes'
      ? t('quickSwitchGroupNotes')
      : group === 'books'
        ? t('quickSwitchGroupBooks')
        : group === 'tags'
          ? t('quickSwitchGroupTags')
          : t('quickSwitchGroupCommands')

  const groupIcon = (group: QuickItemGroup) =>
    group === 'notes' ? (
      <FileText size={14} aria-hidden="true" />
    ) : group === 'books' ? (
      <Notebook size={14} aria-hidden="true" />
    ) : group === 'tags' ? (
      <Hash size={14} aria-hidden="true" />
    ) : (
      <Sparkles size={14} aria-hidden="true" />
    )

  return (
    <div
      className="paper-cmd-backdrop"
      role="presentation"
      onPointerDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="paper-cmd-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('quickSwitchTitle')}
        onKeyDown={e => {
          if (e.nativeEvent.isComposing) return
          if (e.key === 'Escape') {
            e.preventDefault()
            onClose()
          } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex(i => (filtered.length ? (i + 1) % filtered.length : 0))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex(i => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0))
          } else if (e.key === 'Enter' && filtered[activeIndex]) {
            e.preventDefault()
            filtered[activeIndex]!.run()
          }
        }}
      >
        <div className="paper-cmd-input-row">
          <Search size={16} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            aria-label={t('quickSwitchPlaceholder')}
            placeholder={t('quickSwitchPlaceholder')}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button type="button" className="paper-cmd-close" onClick={onClose}>
            {t('paperClose')}
          </button>
        </div>
        <div className="paper-cmd-list" role="listbox" aria-label={t('quickSwitchTitle')}>
          {!filtered.length ? (
            <p className="paper-cmd-empty">{t('quickSwitchEmpty')}</p>
          ) : (
            filtered.map((item, idx) => {
              const showGroup = idx === 0 || filtered[idx - 1]?.group !== item.group
              return (
                <React.Fragment key={item.id}>
                  {showGroup && <div className="paper-cmd-group">{groupLabel(item.group)}</div>}
                  <button
                    type="button"
                    role="option"
                    aria-selected={idx === activeIndex}
                    className="paper-cmd-item"
                    data-active={idx === activeIndex}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={item.run}
                  >
                    <span className="paper-cmd-lead">
                      {groupIcon(item.group)}
                      <span>{item.title}</span>
                    </span>
                    {item.meta && <small>{item.meta}</small>}
                  </button>
                </React.Fragment>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export const quickSwitcherCss = `
.paper-cmd-trigger{display:inline-flex;align-items:center;gap:7px;height:29px;padding:0 9px;border:1px solid var(--rule);border-radius:8px;background:var(--shelf);color:var(--muted);font-size:12px;cursor:pointer;white-space:nowrap}
.paper-cmd-trigger:hover{border-color:color-mix(in srgb,var(--accent) 45%,var(--rule));color:var(--ink);background:var(--selected)}
.paper-cmd-kbd{font-family:var(--font-mono,Consolas,monospace);font-size:10.5px;padding:1px 5px;border-radius:4px;background:var(--paper);border:1px solid var(--rule);color:var(--muted)}
@container paper (max-width:1080px){.paper-cmd-trigger-label,.paper-cmd-kbd{display:none}.paper-cmd-trigger{padding:0 7px}}
.paper-cmd-backdrop{position:fixed;inset:0;z-index:90;background:#10121670;backdrop-filter:blur(3px);display:flex;align-items:flex-start;justify-content:center;padding:min(12vh,96px) 16px 24px}
.paper-cmd-modal{width:min(580px,100%);max-height:min(72dvh,520px);display:flex;flex-direction:column;background:var(--overlay,var(--paper));color:var(--ink);border:1px solid var(--rule);border-radius:14px;box-shadow:0 24px 64px #0005;overflow:hidden}
.paper-cmd-input-row{display:flex;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid var(--rule);color:var(--muted)}
.paper-cmd-input-row input{flex:1;min-width:0;border:0;outline:none;background:transparent;color:var(--ink);font-size:14.5px}
.paper-cmd-close{border:1px solid var(--rule);background:var(--shelf);color:var(--muted);border-radius:6px;padding:3px 8px;font-size:11.5px;cursor:pointer}
.paper-cmd-close:hover{color:var(--ink);background:var(--selected)}
.paper-cmd-list{overflow:auto;overscroll-behavior:contain;padding:8px;min-height:0;flex:1}
.paper-cmd-group{font-size:11px;font-weight:650;color:var(--muted);padding:8px 10px 4px;letter-spacing:.03em}
.paper-cmd-item{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 10px;border:0;border-radius:8px;background:transparent;color:var(--ink);text-align:start;font-size:13px;cursor:pointer}
.paper-cmd-item[data-active=true],.paper-cmd-item:hover{background:var(--selected);color:var(--accent)}
.paper-cmd-lead{display:inline-flex;align-items:center;gap:8px;min-width:0}.paper-cmd-lead span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.paper-cmd-lead svg{flex:none;opacity:.75}
.paper-cmd-item small{flex:none;color:var(--muted);font-size:11.5px}
.paper-cmd-empty{padding:24px 12px;text-align:center;color:var(--muted);font-size:13px;margin:0}
`
