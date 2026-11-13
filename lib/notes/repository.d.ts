import type { ImageMediaType } from '../contracts/media.js';
import type { NoteObjects, NoteRevision, NoteView, NoteSaveInput, NoteContent, NotebookView, NotebookRemoval, NoteListOptions, NoteListResult, RecoveryIssue, NoteAsset } from './types.js';
import { NoteFiles } from './files.js';
import { type NoteAttachment, type NoteSelection, type NoteManageRequest, type NoteHistoryItem, type NoteCatalog } from '../contracts/notes.js';
import type { NoteDraftRequest, NoteDraftResult } from '../contracts/notes.js';
import { type SyncResource } from './sync-resources.js';
export interface NoteRepositoryOptions {
    now?: () => number;
    beforeWrite?: (path: string) => void | Promise<void>;
}
/** One queue per local directory. Parent application owns the cross-process single-writer lease. */
export declare class NoteRepository {
    files: NoteFiles;
    editGuard: (noteIds: string[], requireLease?: boolean) => void;
    coordinate<T>(work: () => T | Promise<T>): Promise<T>;
    private changeGeneration;
    get generation(): number;
    private readonly changeListeners;
    onChange(listener: () => void): () => void;
    private readonly now;
    private validated;
    private readonly checkedRows;
    private readonly sourceSessions;
    private writeEpoch;
    private backlinkIndex;
    private backlinkFingerprint;
    private get drafts();
    constructor(directory: string, options?: NoteRepositoryOptions);
    /** Only before admitting any client operations, during setup or host startup. */
    useDirectory(directory: string): void;
    close(): void;
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
    associate(noteId: string, heads: string[], sessionId: string, linked: boolean, signal?: AbortSignal): Promise<NoteView>;
    get(noteId: string, signal?: AbortSignal): Promise<NoteView>;
    getRevision(noteId: string, revision: string, signal?: AbortSignal): Promise<NoteRevision>;
    history(noteId: string, cursor?: string, signal?: AbortSignal): Promise<{
        items: NoteHistoryItem[];
        cursor: string | null;
    }>;
    catalog(signal?: AbortSignal): Promise<NoteCatalog>;
    backlinks(noteId: string, signal?: AbortSignal): Promise<NoteListResult['items']>;
    backlinkPage(noteId: string, options?: {
        cursor?: string;
        limit?: number;
    }, signal?: AbortSignal): Promise<NoteListResult & {
        total: number;
    }>;
    /** All selected heads/leases and resulting content are checked before the first write. */
    manage(request: NoteManageRequest, signal?: AbortSignal): Promise<{
        completed: string[];
        note?: NoteView;
    }>;
    save(input: NoteSaveInput, signal?: AbortSignal, keepBoth?: boolean): Promise<NoteView>;
    private saveContent;
    /** Serialized with formal writes; the local journal never increments the sync generation. */
    draft(input: NoteDraftRequest): Promise<NoteDraftResult>;
    private draftView;
    private finishDraft;
    recoverDrafts(): Promise<{
        ok: true;
        recovered: string[];
        failed: string[];
    }>;
    private pinDraftFile;
    private retainedFiles;
    private cleanupDraft;
    /** A journaled AI adoption has a stable revision even if its receipt is lost. */
    adoptRevision(input: NoteRevision, persist: (revision: NoteRevision) => Promise<void>, signal?: AbortSignal): Promise<NoteView>;
    private setStatus;
    trash(noteId: string, expectedHeads: string[], signal?: AbortSignal): Promise<NoteView>;
    restore(noteId: string, expectedHeads: string[], signal?: AbortSignal): Promise<NoteView>;
    resolve(noteId: string, expectedHeads: string[], content: NoteContent, signal?: AbortSignal): Promise<NoteView>;
    /** A durable editing journal owns small uploads through cancellation and recovery. */
    putDraftFile(noteId: string, editId: string, bytes: Uint8Array, name: string, mediaType?: ImageMediaType, signal?: AbortSignal): Promise<{
        asset: NoteAsset;
    } | {
        attachment: NoteAttachment;
    }>;
    /** Promote only an attachment recorded in this durable edit; never reopen a caller path. */
    promoteDraftImage(noteId: string, editId: string, attachmentId: string, signal?: AbortSignal): Promise<{
        preview: string;
        id: string;
        mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
        bytes: number;
    }>;
    putAsset(bytes: Uint8Array, mediaType: ImageMediaType, signal?: AbortSignal, noteId?: string): Promise<NoteAsset>;
    getAsset(asset: string, signal?: AbortSignal): Promise<Buffer>;
    putAttachment(bytes: Uint8Array, name: string, signal?: AbortSignal, noteId?: string): Promise<NoteAttachment>;
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
    private mergeObjects;
    private syncRetainedFiles;
    /** Check once per phase, keep bounded queue turns, then merge against the latest local graph. */
    installSyncResources(resources: SyncResource[], objects: NoteObjects, signal?: AbortSignal): Promise<{
        objects: NoteObjects;
        generation: number;
    } | undefined>;
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
