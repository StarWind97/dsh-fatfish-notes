import type { NoteView, NoteListOptions, NoteListResult } from './types.js';
import { type NoteCatalog } from '../contracts/notes.js';
export declare function noteTagCounts(views: Iterable<NoteView>): NoteCatalog['tags'];
export declare function searchNotes(views: NoteView[], options?: NoteListOptions): NoteListResult;
