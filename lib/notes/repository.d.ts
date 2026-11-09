import type { ImageMediaType } from '../contracts/media.js';
import type { NoteObjects, NoteRevision, NoteView, NoteSaveInput, NoteContent, NotebookView, NotebookRemoval, NoteListOptions, NoteListResult, RecoveryIssue, NoteAsset } from './types.js';
import { NoteFiles } from './files.js';
import { type NoteAttachment, type NoteSelection } from '../contracts/notes.js';
export interface NoteRepositoryOptions {
    now?: () => number;
    beforeWrite?: (path: string) => void | Promise<void>;
}
/** One queue per local directory. Parent application owns the cross-process single-writer lease. */
export declare class NoteRepository {
    files: NoteFiles;
    private changeGeneration;
    get generation(): number;
    private readonly changeListeners;
    onChange(listener: () => void): () => void;
    private readonly now;
    constructor(directory: string, options?: NoteRepositoryOptions);
    /** Only before admitting any client operations, during setup or host startup. */
    useDirectory(directory: string): void;
    private run;
    private view;
    private notebook;
    private books;
    private defaultBook;
    private ensureNotebooks;
    private load;
    private limits;
    private writable;
    private complete;
    private localMembership;
    private verifyNotebook;
    private manifest;
    private document;
    private external;
    private append;
    list(options?: NoteListOptions, signal?: AbortSignal): Promise<NoteListResult>;
    get(noteId: string, signal?: AbortSignal): Promise<NoteView>;
    getRevision(noteId: string, revision: string, signal?: AbortSignal): Promise<NoteRevision>;
    save(input: NoteSaveInput, signal?: AbortSignal, keepBoth?: boolean): Promise<NoteView>;
    /** A journaled AI adoption has a stable revision even if its receipt is lost. */
    adoptRevision(input: NoteRevision, persist: (revision: NoteRevision) => Promise<void>, signal?: AbortSignal): Promise<NoteView>;
    private setStatus;
    trash(noteId: string, expectedHeads: string[], signal?: AbortSignal): Promise<NoteView>;
    restore(noteId: string, expectedHeads: string[], signal?: AbortSignal): Promise<NoteView>;
    resolve(noteId: string, expectedHeads: string[], content: NoteContent, signal?: AbortSignal): Promise<NoteView>;
    putAsset(bytes: Uint8Array, mediaType: ImageMediaType, signal?: AbortSignal): Promise<NoteAsset>;
    getAsset(asset: string, signal?: AbortSignal): Promise<Buffer>;
    putAttachment(bytes: Uint8Array, name: string, signal?: AbortSignal): Promise<NoteAttachment>;
    getAttachment(fileId: string, signal?: AbortSignal): Promise<Buffer>;
    /** Validate the entire selection before deleting anything. New remote edits require a fresh confirmation. */
    batch(selection: NoteSelection[], action: 'trash' | 'restore' | 'purge', signal?: AbortSignal): Promise<string[]>;
    private cleanDeleted;
    putSource(value: unknown, signal?: AbortSignal): Promise<string>;
    getSource(sourceId: string, signal?: AbortSignal): Promise<Record<string, unknown>>;
    exportObjects(signal?: AbortSignal): Promise<NoteObjects>;
    /** Import local Markdown edits in the same short queue turn as the frozen identity set. */
    exportSyncSnapshot(signal?: AbortSignal): Promise<{
        objects: NoteObjects;
        generation: number;
    }>;
    importMarkdown(noteId: string, markdown: string, signal?: AbortSignal): Promise<NoteView>;
    /** Sources/assets must already be present; imports are monotonic and may leave recoverable immutable objects on failure. */
    importObjects(input: NoteObjects, signal?: AbortSignal): Promise<void>;
    /** A deterministic fork root and merge commit converge on every device, even after a retry. */
    private splitConflicts;
    listNotebooks(signal?: AbortSignal): Promise<NotebookView[]>;
    saveNotebook(input: {
        notebookId?: string;
        expectedHeads: string[];
        title: string;
        makeDefault?: boolean;
    }, signal?: AbortSignal): Promise<NotebookView>;
    deleteNotebook(notebookId: string, expectedHeads: string[], signal?: AbortSignal, options?: {
        removal?: NotebookRemoval;
        expectedNoteCount?: number;
    }): Promise<void>;
    recover(signal?: AbortSignal): Promise<RecoveryIssue[]>;
}
