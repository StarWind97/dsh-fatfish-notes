export type * from '../contracts/notes.js';
import type { NoteRevision, NotebookRevision } from '../contracts/notes.js';
export interface NoteObjects {
    version: 1;
    revisions: NoteRevision[];
    notebooks: NotebookRevision[];
    deleted?: string[];
}
export interface RecoveryIssue {
    path: string;
    code: string;
}
export interface NoteAsset {
    id: string;
    mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
    bytes: number;
}
export declare const NOTE_LIMITS: {
    readonly body: number;
    readonly source: number;
    readonly image: number;
    readonly images: 128;
    readonly imageTotal: number;
    readonly notes: 5000;
    readonly revisions: 100000;
    readonly scan: number;
    readonly messages: 20000;
};
