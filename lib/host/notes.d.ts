import type { CaptureProgress } from '../contracts/notes.js';
import type { ConversationFileServices } from './conversation-files.js';
import type { NoteJobOverview } from '../contracts/notes.js';
import { NoteTransfers } from './note-transfers.js';
import { NoteRepository } from '../notes/repository.js';
import { type NoteModelController } from './note-model.js';
import { NoteEnrichment } from '../notes/enrichment.js';
import { exportLibrary } from '../notes/export/library.js';
/** Composed facade owns every note operation through cancellation and drain. */
export declare class NotesApplication {
    private readonly ready;
    private readonly services;
    readonly repository: NoteRepository;
    draftRecovery: {
        ok: true;
        recovered: string[];
        failed: string[];
    };
    recoverDrafts(): Promise<void>;
    draft(input: unknown): Promise<import("../contracts/notes.js").NoteDraftResult>;
    readonly transfers: NoteTransfers;
    private readonly usageReader;
    usage(signal?: AbortSignal): Promise<{
        ok: true;
        usage: import("./note-usage.js").NoteUsage;
    }>;
    private readonly captureService;
    private readonly conversation;
    private readonly controller;
    private readonly pending;
    private closePromise;
    readonly enrichment: NoteEnrichment;
    private readonly model;
    private readonly timer;
    private ticking;
    private captureProgress;
    progress(input: unknown): {
        ok: true;
        progress: CaptureProgress | null;
    };
    constructor(directory: string, provider: () => NoteModelController | undefined, ready?: () => boolean | 'busy', services?: ConversationFileServices);
    reference(input: unknown, signal?: AbortSignal): Promise<{
        ok: true;
        instruction: string;
        files: number;
        path: string;
    }>;
    referencePreview(input: unknown, signal?: AbortSignal): Promise<{
        ok: true;
        plan: import("../contracts/notes.js").ReferencePlan;
    }>;
    transfer(input: unknown, signal?: AbortSignal): Promise<{
        ok: true;
        uploadId: string;
        offset: number;
        asset?: never;
        attachment?: never;
    } | {
        ok: true;
        asset: import("../notes/types.js").NoteAsset;
        uploadId?: never;
        offset?: never;
        attachment?: never;
    } | {
        ok: true;
        attachment: import("../contracts/notes.js").NoteAttachment;
        uploadId?: never;
        offset?: never;
        asset?: never;
    } | {
        ok: true;
    }>;
    localOperation<T>(work: () => Promise<T>, signal?: AbortSignal): Promise<T>;
    private run;
    capture(input: unknown, signal?: AbortSignal): Promise<{
        enrichmentJobId: string | null;
        enrichmentStatus: "not-requested" | "unavailable" | "queued";
        note: import("../contracts/notes.js").NoteView;
        sourceId: string;
        complete: boolean;
        messageCount: number;
        missingAssetIds: string[];
        cut: import("../contracts/notes.js").CaptureCut;
        issues: string[];
        ok: true;
    }>;
    job(input: unknown, signal?: AbortSignal): Promise<{
        ok: true;
        job: import("../contracts/notes.js").NoteJob;
    }>;
    retryJob(input: unknown, signal?: AbortSignal): Promise<{
        ok: true;
        job: import("../contracts/notes.js").NoteJob;
    }>;
    cancelJob(input: unknown, signal?: AbortSignal): Promise<{
        ok: true;
        job: import("../contracts/notes.js").NoteJob;
    }>;
    adoptCandidate(input: unknown, signal?: AbortSignal): Promise<{
        ok: true;
        job: import("../contracts/notes.js").NoteJob;
    }>;
    submitCandidate(input: unknown, sessionId: string | undefined, signal?: AbortSignal): Promise<{
        jobId: string;
        status: import("../contracts/notes.js").NoteJob["status"];
    }>;
    selection(input: unknown, signal?: AbortSignal): Promise<{
        cut: import("../contracts/notes.js").CaptureCut;
        defaultMessageIds: string[];
        messages: import("../contracts/notes.js").CaptureMessage[];
        complete: boolean;
        issues: string[];
        materials?: import("../contracts/notes.js").CaptureMaterial[];
        ok: true;
    }>;
    suggest(input: unknown, signal?: AbortSignal): Promise<{
        ok: true;
        metadata: import("../contracts/notes.js").NoteStageResult;
    }>;
    get(input: unknown, signal?: AbortSignal): Promise<{
        ok: true;
        note: import("../contracts/notes.js").NoteView;
    }>;
    manage(input: unknown, signal?: AbortSignal): Promise<{
        completed: string[];
        note?: import("../contracts/notes.js").NoteView;
        ok: true;
    }>;
    catalog(signal?: AbortSignal): Promise<{
        tags: Array<{
            tag: string;
            count: number;
        }>;
        ok: true;
    }>;
    history(input: unknown, signal?: AbortSignal): Promise<{
        items: import("../contracts/notes.js").NoteHistoryItem[];
        cursor: string | null;
        ok: true;
    }>;
    revision(input: unknown, signal?: AbortSignal): Promise<{
        ok: true;
        note: {
            noteId: string;
            heads: string[];
            current: import("../contracts/notes.js").NoteRevision;
            conflicts: never[];
            savedAt: string;
            effectiveNotebookId: string | null;
        };
    }>;
    backlinks(input: unknown, signal?: AbortSignal): Promise<{
        items: import("../contracts/notes.js").NoteListItem[];
        cursor: string | null;
        total: number;
        ok: true;
    }>;
    list(input: unknown, signal?: AbortSignal): Promise<{
        items: import("../contracts/notes.js").NoteListItem[];
        cursor: string | null;
        ok: true;
    }>;
    associate(input: unknown, signal?: AbortSignal): Promise<{
        ok: true;
        note: import("../contracts/notes.js").NoteView;
    }>;
    save(input: unknown, signal?: AbortSignal): Promise<{
        forkedFrom?: string;
        ok: true;
        note: import("../contracts/notes.js").NoteView;
    }>;
    image(input: unknown, signal?: AbortSignal): Promise<{
        ok: true;
        asset: {
            preview?: string;
            id: string;
            bytes: number;
        };
    }>;
    private saveInput;
    attachment(input: unknown, signal?: AbortSignal): Promise<{
        ok: true;
        attachment: import("../contracts/notes.js").NoteAttachment;
    }>;
    download(input: unknown, signal?: AbortSignal): Promise<{
        bytes: Buffer<ArrayBufferLike>;
        filename: string;
        mediaType: string;
    }>;
    batch(input: unknown, signal?: AbortSignal): Promise<{
        ok: true;
        completed: string[];
    }>;
    status(input: unknown, trashed: boolean, signal?: AbortSignal): Promise<{
        ok: true;
        note: import("../contracts/notes.js").NoteView;
    }>;
    resolve(input: unknown, signal?: AbortSignal): Promise<{
        ok: true;
        note: import("../contracts/notes.js").NoteView;
    }>;
    notebooks(signal?: AbortSignal): Promise<{
        ok: true;
        notebooks: import("../contracts/notes.js").NotebookView[];
    }>;
    notebook(input: unknown, signal?: AbortSignal): Promise<{
        ok: true;
        notebooks: import("../contracts/notes.js").NotebookView[];
    }>;
    jobs(input: unknown, signal?: AbortSignal): Promise<{
        ok: true;
        jobs: NoteJobOverview[];
        cursor: string | null;
    }>;
    asset(input: unknown, signal?: AbortSignal): Promise<{
        bytes: Buffer<ArrayBufferLike>;
        mediaType: import("../contracts/media.js").ImageMediaType;
    }>;
    source(input: unknown, signal?: AbortSignal): Promise<{
        ok: true;
        source: Record<string, unknown>;
    }>;
    conversationFile(input: unknown, signal?: AbortSignal): Promise<import("../notes/export/service.js").ExportFile>;
    export(input: unknown, signal?: AbortSignal): Promise<import("../notes/export/service.js").ExportFile>;
    exportLibrary(input: unknown, signal?: AbortSignal, sink?: Parameters<typeof exportLibrary>[3]): Promise<import("../notes/export/service.js").ExportFile>;
    exportFont(signal?: AbortSignal): Promise<Buffer<ArrayBufferLike>>;
    exportConversation(input: unknown, signal?: AbortSignal): Promise<import("../notes/export/service.js").ExportFile & {
        warnings: string;
    }>;
    drain(): Promise<void>;
    close(): Promise<void>;
}
