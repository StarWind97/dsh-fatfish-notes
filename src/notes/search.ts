import type { NoteView, NoteListOptions, NoteListResult } from './types.js'
import { fail, id, text } from './validation.js'
import { fromMarkdown } from 'mdast-util-from-markdown'
import type { Nodes } from 'mdast'
import { searchTerms } from '../contracts/search.js'
import { NOTE_OVERVIEW_LIMIT, NOTE_OVERVIEW_TAG_LIMIT, type NoteCatalog, type NoteOverviewItem } from '../contracts/notes.js'

const titleCollator=new Intl.Collator('zh-CN',{numeric:true})
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

export function noteTagCounts(views: Iterable<NoteView>): NoteCatalog['tags'] {
  const counts = new Map<string, number>()
  for (const {current} of views) {
    if (current.status !== 'active') continue
    for (const tag of current.tags) counts.set(tag, (counts.get(tag) ?? 0)+1)
  }
  return [...counts].map(([tag,count]) => ({tag,count})).sort((a,b)=>b.count-a.count || a.tag.localeCompare(b.tag))
}

/** Rebuilt from immutable objects; no search data is persisted or synchronized. */
function noteOverview(views: NoteView[], recentIds: string[]) {
  const active = views.filter(view => view.current.status === 'active')
  const byId = new Map(active.map(view => [view.noteId, view]))
  const item = (view: NoteView): NoteOverviewItem => ({
    noteId: view.noteId, title: view.current.title, notebookId: view.effectiveNotebookId, savedAt: view.savedAt,
  })
  const opened = [...new Set(recentIds)].flatMap(id => {
    const view = byId.get(id)
    return view ? [item(view)] : []
  }).slice(0, NOTE_OVERVIEW_LIMIT)
  const modified = active.sort((a, b) => b.savedAt.localeCompare(a.savedAt) || a.noteId.localeCompare(b.noteId))
    .slice(0, NOTE_OVERVIEW_LIMIT).map(item)
  return { opened, modified, tags:noteTagCounts(active).slice(0, NOTE_OVERVIEW_TAG_LIMIT) }
}

export function searchNotes(views: NoteView[], options: NoteListOptions = {}): NoteListResult {
  const limit = options.limit ?? 50
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) fail('note_limit')
  const cursor = options.cursor === undefined ? undefined : id(options.cursor)
  const terms = searchTerms(text(options.query ?? '', 12_000))
  const recent = options.recentIds?.map(id)
  if (recent && recent.length > 100) fail('note_limit')
  for (const key of ['favorite','templates'] as const) if (options[key] !== undefined && typeof options[key] !== 'boolean') fail('note_schema')
  if (options.status && !['active', 'trashed', 'all'].includes(options.status)) fail()
  if (options.notebookId !== undefined && options.notebookId !== null) id(options.notebookId)
  const selected = views.filter(view => {
    if (recent && !recent.includes(view.noteId)) return false
    if (options.currentTag!==undefined && (view.current.status!=='active' || !view.current.tags.includes(options.currentTag))) return false
    const alternatives = [view.current, ...view.conflicts]
    return alternatives.some(r => (options.status === 'all' || r.status === (options.status ?? 'active')) &&
      (options.notebookId === undefined || options.notebookId === view.effectiveNotebookId) && (!options.tag || r.tags.includes(options.tag)) &&
      (!options.favorite || r.favorite) &&
      terms.every(term => [r.title, r.summary, ...r.tags, r.body].join('\n').toLocaleLowerCase().includes(term)))
  }).sort((a, b) => {
    const score = (v: NoteView) => terms.filter(term => v.current.title.toLocaleLowerCase().includes(term)).length
    return Number(!!b.pinned)-Number(!!a.pinned) || score(b)-score(a) || (recent ? recent.indexOf(a.noteId)-recent.indexOf(b.noteId) : 0) || (options.order === 'recent' ? b.savedAt.localeCompare(a.savedAt) : options.order === 'oldest' ? a.savedAt.localeCompare(b.savedAt) : options.order==='created-recent'?(b.createdAt??b.savedAt).localeCompare(a.createdAt??a.savedAt):options.order==='created-oldest'?(a.createdAt??a.savedAt).localeCompare(b.createdAt??b.savedAt):options.order==='title-asc'?titleCollator.compare(a.current.title,b.current.title):options.order==='title-desc'?titleCollator.compare(b.current.title,a.current.title):0) || a.noteId.localeCompare(b.noteId)
  })
  const start=cursor ? selected.findIndex(note=>note.noteId===cursor)+1 : 0
  const page=selected.slice(start,start+limit)
  return {
    items: page.map(view => {
      const r=view.current, body=r.body.toLocaleLowerCase(), positions=terms.map(t=>body.indexOf(t)).filter(p=>p>=0), pos=positions.length?Math.min(...positions):0
      const snippet=terms.length&&positions.length?`${pos>60?'…':''}${excerpt(r.body.slice(Math.max(0,pos-60)))}`:excerpt(r.summary || r.body)
      return { noteId: view.noteId, heads: view.heads, title: r.title, summary: r.summary, excerpt:snippet, tags: r.tags, notebookId: view.effectiveNotebookId, status: r.status, savedAt: view.savedAt,createdAt:view.createdAt??view.savedAt,pinned:!!view.pinned, conflicted: view.conflicts.length > 0, ...(r.favorite!==undefined?{favorite:r.favorite}:{}), ...(r.isTemplate!==undefined?{isTemplate:r.isTemplate}:{}) }
    }),
    cursor: selected.length > start+limit ? page[page.length-1]!.noteId : null,
    ...(options.overviewRecentIds && {overview: noteOverview(views, options.overviewRecentIds)}),
  }
}
