export type NoteMode = 'raw';
export type NoteStatus = 'active' | 'trashed';
/** Binary export endpoint is handled separately from the JSON NotesApiContract. */
export type NoteExportFormat = 'markdown' | 'markdown-zip' | 'pdf' | 'png-long' | 'png-pages' | 'snapshot' | 'original';
export interface NoteExportRequest {
    noteId: string;
    revision: string;
    format: NoteExportFormat;
    includeSource?: boolean;
    includeTags?: boolean;
    includeSummary?: boolean;
    assetId?: string;
    convertedImages?: Array<{
        assetId: string;
        png: string;
    }>;
}
export interface NoteContent {
    title: string;
    body: string;
    summary: string;
    tags: string[];
    notebookId: string | null;
    status: NoteStatus;
    sourceId: string | null;
    assetIds: string[];
    attachments?: NoteAttachment[];
    originPath?: string;
}
export interface NoteAttachment {
    id: string;
    name: string;
    bytes: number;
}
export declare const ATTACHMENT_WARNING: number;
export declare const ATTACHMENT_LIMIT: number;
export interface NoteSelection {
    noteId: string;
    expectedHeads: string[];
}
export interface NoteRevision extends NoteContent {
    version: 1;
    noteId: string;
    revision: string;
    parents: string[];
    recordedAt: string;
}
export interface NoteView {
    noteId: string;
    heads: string[];
    current: NoteRevision;
    conflicts: NoteRevision[];
    savedAt: string;
    effectiveNotebookId: string | null;
}
export interface NoteSaveInput {
    noteId?: string;
    expectedHeads: string[];
    content: NoteContent;
}
export interface NoteListItem {
    excerpt?: string;
    noteId: string;
    heads: string[];
    title: string;
    summary: string;
    tags: string[];
    notebookId: string | null;
    status: NoteStatus;
    savedAt: string;
    conflicted: boolean;
}
export interface NoteListOptions {
    cursor?: string;
    limit?: number;
    query?: string;
    tag?: string;
    notebookId?: string | null;
    status?: NoteStatus | 'all';
    order?: 'recent' | 'oldest';
}
export interface NoteListResult {
    items: NoteListItem[];
    cursor: string | null;
}
export interface NotebookRevision {
    version: 1;
    notebookId: string;
    revision: string;
    parents: string[];
    recordedAt: string;
    title: string;
    status: NoteStatus;
    defaultSelectedAt?: string;
}
export interface NotebookView {
    notebookId: string;
    heads: string[];
    current: NotebookRevision;
    conflicts: NotebookRevision[];
    isDefault?: boolean;
    noteCount?: number;
}
export type NotebookRemoval = 'move' | 'trash';
export interface CaptureRequest {
    requestId: string;
    sessionId: string;
    scope: 'turn' | 'selection' | 'session';
    anchorMessageId?: string;
    messageIds?: string[];
    mode: NoteMode;
    autoMetadata: boolean;
    notebookId: string | null;
}
export type CaptureBlock = {
    type: 'text';
    text: string;
} | {
    type: 'image';
    attachmentId: string;
    mediaType: string;
};
export interface CaptureMessage {
    id: string;
    seq: number;
    role: 'user' | 'assistant';
    blocks: CaptureBlock[];
}
export interface CaptureCut {
    throughSeq: number;
    capturedAt: string;
    isSeeded: boolean;
}
export interface CaptureTranscript {
    messages: CaptureMessage[];
    complete: boolean;
    issues: string[];
}
export interface CaptureSource extends CaptureTranscript {
    version: 1;
    sessionId: string;
    scope: CaptureRequest['scope'];
    cut: CaptureCut;
    assets: Record<string, string>;
    missingAssetIds: string[];
    textOnlyBlocks: Array<{
        messageId: string;
        blockIndex: number;
    }>;
}
export interface CaptureResult {
    note: NoteView;
    sourceId: string;
    complete: boolean;
    messageCount: number;
    missingAssetIds: string[];
    enrichmentJobId: string | null;
    enrichmentStatus: 'not-requested' | 'unavailable' | 'queued';
    cut: CaptureCut;
    issues: string[];
}
export interface CaptureSelectionRequest {
    sessionId: string;
    anchorMessageId?: string;
}
export interface CaptureSelection extends CaptureTranscript {
    cut: CaptureCut;
    defaultMessageIds: string[];
}
export type ConversationExportFormat = 'markdown' | 'pdf' | 'png-long' | 'png-pages';
export interface ConversationExportRequest {
    sessionId: string;
    throughSeq: number;
    messageIds: string[];
    format: 'markdown' | 'snapshot' | 'pdf';
    snapshotHash?: string;
    convertedImages?: Array<{
        assetId: string;
        png: string;
    }>;
}
export interface NotesApiContract {
    '/notes/attachment': {
        request: {
            noteId: string;
            draft?: boolean;
            name: string;
            base64: string;
            allowLarge?: boolean;
        };
        response: {
            ok: true;
            attachment: NoteAttachment;
        };
    };
    '/notes/batch': {
        request: {
            notes: NoteSelection[];
            action: 'trash' | 'restore' | 'purge';
        };
        response: {
            ok: true;
            completed: string[];
        };
    };
    '/notes': {
        request: NoteListOptions;
        response: NoteListResult & {
            ok: true;
        };
    };
    '/notes/save': {
        request: NoteSaveInput & {
            resolve?: boolean;
            keepBoth?: boolean;
        };
        response: {
            ok: true;
            note: NoteView;
            forkedFrom?: string;
        };
    };
    '/notes/image': {
        request: {
            noteId: string;
            draft?: boolean;
        } & ({
            url: string;
        } | {
            base64: string;
            mediaType: string;
        });
        response: {
            ok: true;
            asset: {
                id: string;
                bytes: number;
                preview?: string;
            };
        };
    };
    '/notes/trash': {
        request: {
            noteId: string;
            expectedHeads: string[];
        };
        response: {
            ok: true;
            note: NoteView;
        };
    };
    '/notes/restore': {
        request: {
            noteId: string;
            expectedHeads: string[];
        };
        response: {
            ok: true;
            note: NoteView;
        };
    };
    '/notes/resolve': {
        request: NoteSaveInput & {
            noteId: string;
        };
        response: {
            ok: true;
            note: NoteView;
        };
    };
    '/notes/notebooks': {
        request: undefined;
        response: {
            ok: true;
            notebooks: NotebookView[];
        };
    };
    '/notes/notebook': {
        request: {
            notebookId?: string;
            expectedHeads: string[];
            title: string;
            remove?: boolean;
            makeDefault?: boolean;
            removal?: NotebookRemoval;
            expectedNoteCount?: number;
        };
        response: {
            ok: true;
            notebooks: NotebookView[];
        };
    };
    '/notes/jobs': {
        request: {
            noteId: string;
            cursor?: string;
        };
        response: {
            ok: true;
            jobs: NoteJobOverview[];
            cursor: string | null;
        };
    };
    '/notes/job': {
        request: {
            jobId: string;
        };
        response: {
            ok: true;
            job: NoteJob;
        };
    };
    '/notes/job/retry': {
        request: {
            jobId: string;
        };
        response: {
            ok: true;
            job: NoteJob;
        };
    };
    '/notes/job/cancel': {
        request: {
            jobId: string;
        };
        response: {
            ok: true;
            job: NoteJob;
        };
    };
    '/notes/candidate': {
        request: {
            jobId: string;
            expectedHeads: string[];
        };
        response: {
            ok: true;
            job: NoteJob;
        };
    };
    '/notes/capture': {
        request: CaptureRequest;
        response: CaptureResult & {
            ok: true;
        };
    };
    '/notes/selection': {
        request: CaptureSelectionRequest;
        response: CaptureSelection & {
            ok: true;
        };
    };
    '/notes/get': {
        request: {
            noteId: string;
        };
        response: {
            ok: true;
            note: NoteView;
        };
    };
    '/notes/source': {
        request: {
            sourceId: string;
        };
        response: {
            ok: true;
            source: Record<string, unknown>;
        };
    };
}
export interface NoteCandidate {
    requestId: string;
    noteId: string;
    sourceId: string;
    baseRevision: string;
    mode: 'metadata';
    title: string;
    summary: string;
    tags: string[];
}
export interface NoteStageResult {
    title: string;
    summary: string;
    tags: string[];
}
export interface NoteStage {
    kind: 'chunk' | 'final';
    input: string;
    assetIds: string[];
    attempt: number;
    requestId: string;
    status: 'ready' | 'waiting' | 'done' | 'failed';
    result: NoteStageResult | null;
    error: string | null;
}
export interface NoteJob {
    version: 1;
    jobId: string;
    captureRequestId: string;
    sessionId: string;
    noteId: string;
    sourceId: string;
    baseRevision: string;
    mode: 'metadata';
    autoMetadata: boolean;
    status: 'running' | 'failed' | 'cancelled' | 'candidate' | 'completed';
    error: string | null;
    stages: NoteStage[];
    candidate: NoteCandidate | null;
    adoption: NoteRevision | null;
}
export type NoteJobOverview = Pick<NoteJob, 'jobId' | 'noteId' | 'status' | 'error' | 'candidate'> & {
    stages: Array<Pick<NoteStage, 'status'>>;
};
