import type { TagChange, TagPhase, TagRequest } from '../contracts/tag-management.js';
import type { NoteRevision } from '../contracts/notes.js';
import { NoteFiles } from './files.js';
export interface TagRow {
    noteId: string;
    before: string;
    after: string;
    notebookId: string | null;
    title: string;
    undo?: string;
}
export interface TagJournal extends TagChange {
    token: string;
    phase: TagPhase;
    at: string;
    undoAt?: string;
    rows: TagRow[];
}
export declare function parseTagRequest(raw: unknown): TagRequest;
export declare function tagRevision(base: NoteRevision, tags: string[], notebookId: string | null, recordedAt: string): NoteRevision;
export declare function replaceTag(tags: string[], source: string, target: string | null): string[];
export declare function readTagJournal(files: NoteFiles): Promise<TagJournal | null>;
export declare function writeTagJournal(files: NoteFiles, job: TagJournal): Promise<void>;
