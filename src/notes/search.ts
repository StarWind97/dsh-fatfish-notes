import type { NoteView, NoteListOptions, NoteListResult } from './types.js'
import { fail, id, text } from './validation.js'
import { fromMarkdown } from 'mdast-util-from-markdown'
import type { Nodes } from 'mdast'

function excerpt(value:string):string {
  const words:string[]=[]
  function visit(node:Nodes) {
    if (node.type==='text' || node.type==='inlineCode' || node.type==='code') words.push(node.value)
    else if (node.type==='image' && node.alt) words.push(node.alt)
    else if ('children' in node) node.children.forEach(visit)
  }
  visit(fromMarkdown(value.slice(0,2400)))
  return words.join(' ').replace(/\s+/g,' ').trim().slice(0,180)
}

/** Rebuilt from immutable objects; no search data is persisted or synchronized. */
export function searchNotes(views: NoteView[], options: NoteListOptions = {}): NoteListResult {
  const limit = options.limit ?? 50
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) fail('note_limit')
  const cursor = options.cursor === undefined ? undefined : id(options.cursor)
  const query = text(options.query ?? '', 12_000).trim().toLocaleLowerCase()
  if (options.status && !['active', 'trashed', 'all'].includes(options.status)) fail()
  if (options.notebookId !== undefined && options.notebookId !== null) id(options.notebookId)
  const selected = views.filter(view => {
    if (!options.order && cursor && view.noteId <= cursor) return false
    const alternatives = [view.current, ...view.conflicts]
    return alternatives.some(r => (options.status === 'all' || r.status === (options.status ?? 'active')) &&
      (options.notebookId === undefined || options.notebookId === view.effectiveNotebookId) && (!options.tag || r.tags.includes(options.tag)) &&
      (!query || [r.title, r.summary, ...r.tags, r.body].join('\n').toLocaleLowerCase().includes(query)))
  }).sort((a, b) => (options.order === 'recent' ? b.savedAt.localeCompare(a.savedAt) : options.order === 'oldest' ? a.savedAt.localeCompare(b.savedAt) : 0) || a.noteId.localeCompare(b.noteId))
  const start=options.order && cursor ? selected.findIndex(note=>note.noteId===cursor)+1 : 0
  const page=selected.slice(start,start+limit)
  return {
    items: page.map(view => ({ noteId: view.noteId, heads: view.heads, title: view.current.title, summary: view.current.summary, excerpt:excerpt(view.current.summary || view.current.body), tags: view.current.tags, notebookId: view.effectiveNotebookId, status: view.current.status, savedAt: view.savedAt, conflicted: view.conflicts.length > 0 })),
    cursor: selected.length > start+limit ? page[page.length-1]!.noteId : null,
  }
}
