export type * from '../contracts/notes.js'
import type { NoteRevision, NotebookRevision } from '../contracts/notes.js'
export interface NoteObjects { version: 1; revisions: NoteRevision[]; notebooks: NotebookRevision[]; deleted?: string[] }
export interface RecoveryIssue { path: string; code: string }
export interface NoteAsset { id: string; mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'; bytes: number }
export const NOTE_LIMITS = {
  body: 10 * 1024 * 1024, source: 20 * 1024 * 1024, image: 20 * 1024 * 1024,
  images: 128, notes: 5_000, revisions: 100_000,
  scan: 512 * 1024 * 1024, messages: 20_000,
} as const
