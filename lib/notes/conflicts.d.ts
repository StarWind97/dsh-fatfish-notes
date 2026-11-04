import type { NoteContent, NoteRevision } from './types.js';
export declare function revisionContent(row: NoteRevision): NoteContent;
export declare function conflictForkId(row: NoteRevision): string;
export declare function conflictRevisions(revisions: NoteRevision[]): NoteRevision[];
