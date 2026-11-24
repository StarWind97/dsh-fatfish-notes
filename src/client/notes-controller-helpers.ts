import { DEFAULT_UNTITLED_NOTE_TITLE, NOTE_OVERVIEW_LIMIT } from '../contracts/notes.js'
import type {
  NoteContent,
  NoteJobOverview,
  NoteListItem,
  NoteListOptions,
  NoteOverview,
  NoteView,
  NotebookView,
} from '../contracts/notes.js'
import { supplementMaterials } from '../notes/note-materials.js'

export interface DetailRequest {
  navigation: number
  noteId: string
  kind: 'open' | 'operation' | 'poll' | 'sync'
  baseNote: NoteView | null
}

export interface NotesState {
  section: 'notes' | 'notebooks' | 'settings'
  items: NoteListItem[]
  cursor: string | null
  filter: NoteListOptions
  notebooks: NotebookView[]
  loadingList: boolean
  listError: boolean
  loadingNote: boolean
  noteId: string | null
  note: NoteView | null
  draft: NoteContent | null
  dirty: boolean
  openedFromTab: boolean
  editing: boolean
  saving: boolean
  composing: boolean
  operation: boolean
  error: string | null
  conflict: NoteView | null
  jobs: NoteJobOverview[]
  jobsError: boolean
  jobsCursor: string | null
  overview?: NoteOverview
  removal?: { ids: string[]; activeId: string | null }
}

export interface EditAccess {
  ready(): Promise<void>
  acquire(noteId: string): Promise<void>
  release(noteId?: string): Promise<void>
  writable(noteId: string): boolean
}

export function emptyNotesState(): NotesState {
  return {
    section: 'notes',
    items: [],
    cursor: null,
    filter: {},
    notebooks: [],
    loadingList: false,
    listError: false,
    loadingNote: false,
    noteId: null,
    note: null,
    draft: null,
    dirty: false,
    openedFromTab: false,
    editing: false,
    saving: false,
    composing: false,
    operation: false,
    error: null,
    conflict: null,
    jobs: [],
    jobsError: false,
    jobsCursor: null,
  }
}

export const noteContent = (note: NoteView): NoteContent => ({
  title: note.current.title,
  body: note.current.body,
  summary: note.current.summary,
  tags: [...note.current.tags],
  notebookId: note.effectiveNotebookId,
  status: note.current.status,
  sourceId: note.current.sourceId,
  assetIds: [...note.current.assetIds],
  supplements: supplementMaterials(note.current),
  ...(note.current.attachments ? { attachments: structuredClone(note.current.attachments) } : {}),
  ...(note.current.originPath !== undefined ? { originPath: note.current.originPath } : {}),
  ...(note.current.favorite !== undefined ? { favorite: note.current.favorite } : {}),
  ...(note.current.sessionLinks !== undefined ? { sessionLinks: [...note.current.sessionLinks] } : {}),
  ...(note.current.isTemplate !== undefined ? { isTemplate: note.current.isTemplate } : {}),
})

export const comparable = (c: NoteContent) =>
  Object.fromEntries(
    Object.entries({
      ...c,
      title: c.title.trim() || DEFAULT_UNTITLED_NOTE_TITLE,
      summary: c.summary.trim(),
      tags: [...new Set(c.tags.map(t => t.trim()))].sort(),
      assetIds: [...new Set(c.assetIds)].sort(),
    }).sort(([a], [b]) => a.localeCompare(b)),
  )

export const sameContent = (a: NoteContent, b: NoteContent) => JSON.stringify(comparable(a)) === JSON.stringify(comparable(b))
export const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
export const errorCode = (e: unknown) => (e instanceof Error && 'code' in e ? String(e.code) : 'request_failed')

export function newId(): string {
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  let value = BigInt(Date.now()) << 80n
  for (let i = 0; i < 10; i++) value |= BigInt(bytes[i]!) << BigInt(8 * (9 - i))
  let result = ''
  for (let i = 0; i < 26; i++) {
    result = alphabet[Number(value & 31n)]! + result
    value >>= 5n
  }
  return result
}

export function mergeOverviewItems(
  overview: NoteOverview | undefined,
  requestedIds: string[] | undefined,
  recent: string[],
  existingOpened: NoteOverview['opened'] | undefined,
): { overview?: NoteOverview } {
  if (!overview || !requestedIds) return {}
  if (equal(recent, requestedIds)) return { overview }
  const requested = new Set(requestedIds)
  const byId = new Map(overview.opened.map(item => [item.noteId, item]))
  // Include visits made while the list request was in flight.
  for (const item of existingOpened ?? []) {
    if (!requested.has(item.noteId)) byId.set(item.noteId, item)
  }
  const opened = recent
    .flatMap(id => {
      const item = byId.get(id)
      return item ? [item] : []
    })
    .slice(0, NOTE_OVERVIEW_LIMIT)
  return { overview: { ...overview, opened } }
}
