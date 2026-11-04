import type { NoteView, NoteListOptions, NoteListResult } from './types.js';
/** Rebuilt from immutable objects; no search data is persisted or synchronized. */
export declare function searchNotes(views: NoteView[], options?: NoteListOptions): NoteListResult;
