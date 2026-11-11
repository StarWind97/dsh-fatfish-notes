import type { NoteObjects } from './types.js'
import { canonical, id, sortedStrings, object, keys, fail } from './validation.js'
export function deletionIds(value: unknown): string[] { return value === undefined ? [] : sortedStrings(value, 100_000, id) }
export function deletionData(noteId: string): string { return canonical({ version: 1, noteId: id(noteId) }) }
export function readDeletion(value: unknown): string {
  const v = object(value); keys(v, ['version', 'noteId'])
  if (v.version !== 1) fail('note_version')
  return id(v.noteId)
}
export function withoutDeleted(objects: NoteObjects, deleted = objects.deleted ?? []): NoteObjects {
  const set = new Set(deleted)
  return { ...objects, revisions: objects.revisions.filter(r => !set.has(r.noteId)), ...(deleted.length ? { deleted: [...set].sort() } : {}) }
}
/** New capacity and metadata require a writer that understands format 3. */
export function moduleVersion(_objects: NoteObjects): 3 { return 3 }
