import type { NoteRevision, NoteView, NotebookRevision, NotebookView } from './types.js'
import { NOTE_LIMITS } from './types.js'
import { canonical, contentKeys, date, digest, fail, hash, id, keys, normalizeContent, object, sortedStrings, status, text } from './validation.js'

export function createNoteRevision(input: Omit<NoteRevision, 'revision'>): NoteRevision {
  const v = object(input); keys(v, ['version', 'noteId', 'parents', 'recordedAt', ...contentKeys])
  if (v.version !== 1) fail('note_version')
  const data = { version: 1 as const, noteId: id(v.noteId), parents: sortedStrings(v.parents, NOTE_LIMITS.revisions, hash), recordedAt: date(v.recordedAt), ...normalizeContent(Object.fromEntries(contentKeys.map(k => [k, v[k]]))) }
  return { ...data, revision: digest(canonical(data)) }
}
export function validateNoteRevision(value: unknown): NoteRevision {
  const v = object(value), { revision, ...rest } = v
  const result = createNoteRevision(rest as Omit<NoteRevision, 'revision'>)
  if (hash(revision) !== result.revision) fail('note_hash', '笔记修订校验失败')
  return result
}
export function createNotebookRevision(input: Omit<NotebookRevision, 'revision'>): NotebookRevision {
  const v = object(input); keys(v, ['version', 'notebookId', 'parents', 'recordedAt', 'title', 'status'])
  if (v.version !== 1) fail('note_version')
  const data = { version: 1 as const, notebookId: id(v.notebookId), parents: sortedStrings(v.parents, NOTE_LIMITS.revisions, hash), recordedAt: date(v.recordedAt), title: text(v.title, 1200).trim() || '未命名笔记本', status: status(v.status) }
  return { ...data, revision: digest(canonical(data)) }
}
export function validateNotebookRevision(value: unknown): NotebookRevision {
  const { revision, ...rest } = object(value), result = createNotebookRevision(rest as Omit<NotebookRevision, 'revision'>)
  if (hash(revision) !== result.revision) fail('note_hash')
  return result
}
/** Iterative Kahn validation also bounds stack use for long histories. */
export function topologicalOrder<T extends { revision: string; parents: string[] }>(rows: T[], identity: (r: T) => string): T[] {
  const map = new Map(rows.map(r => [r.revision, r])), degrees = new Map<string, number>(), children = new Map<string, string[]>()
  for (const r of map.values()) {
    degrees.set(r.revision, r.parents.length)
    for (const parent of r.parents) {
      const p = map.get(parent)
      if (!p || identity(p) !== identity(r)) fail('note_parent', '父修订缺失或属于其他笔记')
      const list = children.get(parent) ?? []; list.push(r.revision); children.set(parent, list)
    }
  }
  const ready = [...degrees].filter(([, n]) => n === 0).map(([h]) => h); let seen = 0
  for (let i = 0; i < ready.length; i++) {
    const h = ready[i]!; seen++
    for (const child of children.get(h) ?? []) { const n = degrees.get(child)! - 1; degrees.set(child, n); if (n === 0) ready.push(child) }
  }
  if (seen !== map.size) fail('note_cycle', '父修订存在环')
  return ready.map(h => map.get(h)!)
}
export function validateDag<T extends { revision: string; parents: string[] }>(rows: T[], identity: (r: T) => string): void { topologicalOrder(rows, identity) }
function merge<T extends { revision: string; parents: string[] }>(left: T[], right: T[], validate: (r: unknown) => T, identity: (r: T) => string): T[] {
  if (left.length + right.length > NOTE_LIMITS.revisions * 2) fail('note_limit')
  const map = new Map<string, T>()
  for (const raw of [...left, ...right]) { const row = validate(raw); map.set(row.revision, row) }
  if (map.size > NOTE_LIMITS.revisions) fail('note_limit')
  const rows = [...map.values()].sort((a, b) => a.revision.localeCompare(b.revision))
  validateDag(rows, identity); return rows
}
export function mergeNoteRevisions(left: NoteRevision[], right: NoteRevision[]): NoteRevision[] { return merge(left, right, validateNoteRevision, r => r.noteId) }
export function mergeNotebookRevisions(left: NotebookRevision[], right: NotebookRevision[]): NotebookRevision[] { return merge(left, right, validateNotebookRevision, r => r.notebookId) }
function heads<T extends { revision: string; parents: string[] }>(rows: T[]): T[] {
  const parents = new Set(rows.flatMap(r => r.parents)); return rows.filter(r => !parents.has(r.revision)).sort((a, b) => a.revision.localeCompare(b.revision))
}
export function materializeNote(revisions: NoteRevision[], noteId: string): NoteView {
  id(noteId); const tips = heads(mergeNoteRevisions(revisions, []).filter(r => r.noteId === noteId)), current = tips.find(r => r.status === 'active') ?? tips[0]
  if (!current) fail('note_not_found', '笔记不存在')
  return { noteId, heads: tips.map(r => r.revision), current, conflicts: tips.filter(r => r !== current), savedAt: current.recordedAt, effectiveNotebookId: current.notebookId }
}
export function materializeNotebook(revisions: NotebookRevision[], notebookId: string): NotebookView {
  id(notebookId); const tips = heads(mergeNotebookRevisions(revisions, []).filter(r => r.notebookId === notebookId)), current = tips[0]
  if (!current) fail('notebook_not_found')
  return { notebookId, heads: tips.map(r => r.revision), current, conflicts: tips.slice(1) }
}
