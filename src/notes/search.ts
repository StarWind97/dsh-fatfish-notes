import type { NoteView, NoteListOptions, NoteListResult, NoteRevision, SearchHit } from './types.js'
import { fail, id, text } from './validation.js'
import { fromMarkdown } from 'mdast-util-from-markdown'
import type { Nodes } from 'mdast'
import { searchTerms } from '../contracts/search.js'
import { NOTE_OVERVIEW_LIMIT, type NoteOverviewItem } from '../contracts/notes.js'

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

type Match = {score: number; hit: SearchHit; text: string}

function bodyMatch(body: string, terms: string[], positions: number[]) {
  const found = positions.filter(pos => pos >= 0)
  if (!found.length) return undefined
  const first = Math.min(...found)
  if (found.length === 1) return {count: 1, offset: first}
  // The common case needs no second pass: the first occurrences are together.
  if (!/\r?\n[ \t]*\r?\n/.test(body.slice(first, Math.max(...found)))) return {count: found.length, offset: first}
  let best = {count: 1, offset: first}
  for (const block of body.matchAll(/[^\n]+(?:\n(?![ \t]*\r?\n)[^\n]+)*/g)) {
    const offsets = terms.map(term => block[0].indexOf(term)).filter(pos => pos >= 0)
    if (offsets.length > best.count) best = {count: offsets.length, offset: block.index + Math.min(...offsets)}
    if (best.count === found.length) break
  }
  return best
}

function matchRevision(revision: NoteRevision, terms: string[], phrase: string): Match | undefined {
  const fields: Array<[SearchHit['field'],string,number]> = [
    ['title',revision.title,50], ['summary',revision.summary,22],
    ...revision.tags.map((tag): [SearchHit['field'],string,number] => ['tag',tag,20]),
    ...(revision.attachments ?? []).map((file): [SearchHit['field'],string,number] => ['file',file.name,45]),
  ]
  const matched = new Set<string>()
  let best: Match | undefined
  function consider(field: SearchHit['field'], value: string, score: number) {
    if (!best || score > best.score) best = {score,hit:{field,revision:revision.revision},text:value}
  }
  for (const [field,value,weight] of fields) {
    const lower = value.toLocaleLowerCase()
    const hits = terms.filter(term => lower.includes(term))
    if (!hits.length) continue
    hits.forEach(term => matched.add(term))
    const exact = (field === 'file' || field === 'title') && lower === phrase
    consider(field,value,(exact ? 200 : 0) + (hits.length === terms.length ? 100 : 0) + weight + hits.length / terms.length)
  }
  const body = revision.body.toLocaleLowerCase()
  const positions = terms.map(term => body.indexOf(term))
  if (!terms.every((term,i) => matched.has(term) || positions[i]! >= 0)) return undefined
  const passage = bodyMatch(body,terms,positions)
  if (passage) {
    consider('body','',(passage.count === terms.length ? 100 : 0) + 30 + passage.count / terms.length)
    if (best && (best.hit.field === 'body' || best.hit.field === 'title')) {
      let offset = passage.offset
      if (body.length !== revision.body.length) {
        let normalized = 0
        offset = 0
        for (const char of revision.body) {
          const end = normalized + char.toLocaleLowerCase().length
          if (end > passage.offset) break
          normalized = end
          offset += char.length
        }
      }
      best.hit.bodyOffset = offset
    }
  }
  return best
}

function resultExcerpt(row: NoteRevision, match?: Match) {
  if (!match) return excerpt(row.summary || row.body)
  if (match.hit.bodyOffset !== undefined) {
    const pos = match.hit.bodyOffset
    const start = Math.max(0,pos-52,pos ? row.body.lastIndexOf('\n',pos-1)+1 : 0)
    const passage = row.body.slice(start,start+360).split(/\r?\n[ \t]*\r?\n/,1)[0]!
    return (start > 0 ? '…' : '') + (excerpt(passage) || passage.trim().slice(0,180))
  }
  return match.hit.field === 'title' ? excerpt(row.summary || row.title) : match.text.slice(0,180)
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
  return { opened, modified }
}

export function searchNotes(views: NoteView[], options: NoteListOptions = {}): NoteListResult {
  const limit = options.limit ?? 50
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) fail('note_limit')
  const cursor = options.cursor === undefined ? undefined : id(options.cursor)
  const terms = searchTerms(text(options.query ?? '', 12_000))
  const recent = options.recentIds?.map(id)
  if (recent && recent.length > 100) fail('note_limit')
  for (const key of ['favorite','templates','hasFiles','currentOnly'] as const) if (options[key] !== undefined && typeof options[key] !== 'boolean') fail('note_schema')
  if (options.modifiedPeriod !== undefined && !['month','before-month'].includes(options.modifiedPeriod)) fail('note_schema')
  if (options.status && !['active', 'trashed', 'all'].includes(options.status)) fail()
  if (options.notebookId !== undefined && options.notebookId !== null) id(options.notebookId)
  const now = new Date()
  const month = new Date(now.getFullYear(),now.getMonth(),1).toISOString()
  const nextMonth = new Date(now.getFullYear(),now.getMonth()+1,1).toISOString()
  const phrase = (options.query ?? '').trim().toLocaleLowerCase()
  const selected: Array<{view: NoteView; row: NoteRevision; match?: Match}> = []
  for (const view of views) {
    if (recent && !recent.includes(view.noteId)) continue
    if (options.notebookId !== undefined && options.notebookId !== view.effectiveNotebookId) continue
    if (options.modifiedPeriod === 'month' && (view.savedAt < month || view.savedAt >= nextMonth)) continue
    if (options.modifiedPeriod === 'before-month' && view.savedAt >= month) continue
    for (const row of options.currentOnly?[view.current]:[view.current,...view.conflicts]) {
      if (options.status !== 'all' && row.status !== (options.status ?? 'active')) continue
      if (options.tag && !row.tags.includes(options.tag) || options.favorite && !row.favorite) continue
      if (options.hasFiles && !row.attachments?.length) continue
      const match = terms.length ? matchRevision(row,terms,phrase) : undefined
      if (terms.length && !match) continue
      if (match && row !== view.current) match.hit.alternate = true
      selected.push({view,row,...(match && {match})})
      break
    }
  }
  const relevance = terms.length && (!options.order || options.order === 'relevance')
  selected.sort((left,right) => {
    const a=left.view,b=right.view
    if (relevance && left.match!.score !== right.match!.score) return right.match!.score-left.match!.score
    const pinned = Number(!!b.pinned)-Number(!!a.pinned)
    if (pinned && (!terms.length || relevance)) return pinned
    if (recent) return recent.indexOf(a.noteId)-recent.indexOf(b.noteId)
    let order = 0
    switch(options.order) {
      case 'oldest': order=a.savedAt.localeCompare(b.savedAt); break
      case 'created-recent': order=(b.createdAt??b.savedAt).localeCompare(a.createdAt??a.savedAt); break
      case 'created-oldest': order=(a.createdAt??a.savedAt).localeCompare(b.createdAt??b.savedAt); break
      case 'title-asc': order=titleCollator.compare(a.current.title,b.current.title); break
      case 'title-desc': order=titleCollator.compare(b.current.title,a.current.title); break
      case 'recent': case 'relevance': order=b.savedAt.localeCompare(a.savedAt); break
    }
    return order || a.noteId.localeCompare(b.noteId)
  })
  const start = cursor ? selected.findIndex(entry=>entry.view.noteId===cursor)+1 : 0
  const page = selected.slice(start,start+limit)
  return {
    ...(options.currentOnly && {total:selected.length}),
    items: page.map(({view,row,match}) => {
      const r = view.current
      return {noteId:view.noteId, heads:view.heads, title:r.title, summary:r.summary, excerpt:resultExcerpt(row,match), ...(match && {hit:match.hit}), tags:r.tags, notebookId:view.effectiveNotebookId, status:r.status, savedAt:view.savedAt,createdAt:view.createdAt??view.savedAt,pinned:!!view.pinned, conflicted:view.conflicts.length>0,...(r.favorite!==undefined?{favorite:r.favorite}:{}),...(r.isTemplate!==undefined?{isTemplate:r.isTemplate}:{})}
    }),
    cursor: selected.length > start+limit ? page[page.length-1]!.view.noteId : null,
    ...(options.overviewRecentIds && {overview: noteOverview(views, options.overviewRecentIds)}),
  }
}
