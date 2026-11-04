import type { NoteRevision, NoteView, NotebookRevision, NotebookView } from './types.js';
export declare function createNoteRevision(input: Omit<NoteRevision, 'revision'>): NoteRevision;
export declare function validateNoteRevision(value: unknown): NoteRevision;
export declare function createNotebookRevision(input: Omit<NotebookRevision, 'revision'>): NotebookRevision;
export declare function validateNotebookRevision(value: unknown): NotebookRevision;
/** Iterative Kahn validation also bounds stack use for long histories. */
export declare function topologicalOrder<T extends {
    revision: string;
    parents: string[];
}>(rows: T[], identity: (r: T) => string): T[];
export declare function validateDag<T extends {
    revision: string;
    parents: string[];
}>(rows: T[], identity: (r: T) => string): void;
export declare function mergeNoteRevisions(left: NoteRevision[], right: NoteRevision[]): NoteRevision[];
export declare function mergeNotebookRevisions(left: NotebookRevision[], right: NotebookRevision[]): NotebookRevision[];
export declare function materializeNote(revisions: NoteRevision[], noteId: string): NoteView;
export declare function materializeNotebook(revisions: NotebookRevision[], notebookId: string): NotebookView;
