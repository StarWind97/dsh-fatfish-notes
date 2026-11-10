import type { NoteJobOverview } from '../contracts/notes.js';
import { NoteRepository } from '../notes/repository.js';
import { type NoteModelController } from './note-model.js';
import { NoteEnrichment } from '../notes/enrichment.js';
/** Composed facade owns every note operation through cancellation and drain. */
export declare class NotesApplication {
    private readonly ready;
    readonly repository: NoteRepository;
    private readonly captureService;
    private readonly conversation;
    private readonly controller;
    private readonly pending;
    private closePromise;
    readonly enrichment: NoteEnrichment;
    private readonly timer;
    private ticking;
    constructor(directory: string, provider: () => NoteModelController | undefined, ready?: () => boolean | 'busy');
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
        ok: true;
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
        ok: true;
        items: import("../contracts/notes.js").NoteListItem[];
    }>;
    list(input: unknown, signal?: AbortSignal): Promise<{
        items: import("../contracts/notes.js").NoteListItem[];
        cursor: string | null;
        ok: true;
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
    export(input: unknown, signal?: AbortSignal): Promise<import("../notes/export/service.js").ExportFile>;
    exportLibrary(input: unknown, signal?: AbortSignal): Promise<import("../notes/export/service.js").ExportFile>;
    exportFont(signal?: AbortSignal): Promise<Buffer<ArrayBufferLike>>;
    exportConversation(input: unknown, signal?: AbortSignal): Promise<import("../notes/export/service.js").ExportFile & {
        warnings: string;
    }>;
    drain(): Promise<void>;
    close(): Promise<void>;
}
