export type NoteMode = 'raw';
export type NoteStatus = 'active' | 'trashed';
/** Binary export endpoint is handled separately from the JSON NotesApiContract. */
export type NoteExportFormat = 'markdown' | 'markdown-zip' | 'pdf' | 'png-long' | 'snapshot' | 'original';
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
    assetIds?: string[];
    attachmentIds?: string[];
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
    favorite?: boolean;
    isTemplate?: boolean;
    sessionLinks?: string[];
    supplements?: NoteSupplements;
}
/** Explicit membership; removing a body link must not recreate a supplement. */
export interface NoteSupplements {
    assetIds: string[];
    attachmentIds: string[];
}
export interface NoteAttachment {
    id: string;
    name: string;
    bytes: number;
}
export declare const ATTACHMENT_WARNING: number;
export declare const ATTACHMENT_LIMIT: number;
/** Fits the existing 2 MiB JSON request budget after base64 encoding. */
export declare const SINGLE_TRANSFER_LIMIT: number;
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
export type NoteDraftRequest = {
    action: 'save' | 'finish';
    editId: string;
    sequence: number;
    request: NoteSaveInput & {
        noteId: string;
    };
} | {
    action: 'discard';
    editId: string;
    noteId: string;
};
export interface NoteDraftResult {
    ok: true;
    state: 'editing' | 'finished' | 'discarded';
    note: NoteView | null;
}
export interface NoteListItem {
    sessionRelation?: 'source' | 'manual' | null;
    excerpt?: string;
    favorite?: boolean;
    isTemplate?: boolean;
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
    favorite?: boolean;
    templates?: boolean;
    recentIds?: string[];
    sessionId?: string;
    relation?: 'source' | 'linked' | 'browse';
}
export interface NoteListResult {
    items: NoteListItem[];
    cursor: string | null;
}
export type NoteManageAction = 'rename' | 'favorite' | 'unfavorite' | 'move' | 'add-tags' | 'remove-tags' | 'duplicate' | 'template' | 'instantiate' | 'revision' | 'revision-copy';
export interface NoteManageRequest {
    notes: NoteSelection[];
    action: NoteManageAction;
    notebookId?: string;
    tags?: string[];
    revision?: string;
    title?: string;
    date?: string;
    targetId?: string;
}
export interface NoteHistoryItem {
    revision: string;
    recordedAt: string;
    title: string;
    summary: string;
    status: NoteStatus;
}
export interface NoteCatalog {
    tags: Array<{
        tag: string;
        count: number;
    }>;
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
    metadata?: NoteStageResult;
    requestId: string;
    sessionId: string;
    scope: 'turn' | 'selection' | 'session';
    anchorMessageId?: string;
    messageIds?: string[];
    mode: NoteMode;
    autoMetadata: boolean;
    notebookId: string | null;
    cut?: CaptureCut;
    materialIds?: string[];
    allowLarge?: boolean;
}
export type CaptureBlock = {
    type: 'text';
    text: string;
    materialId?: string;
} | {
    type: 'image';
    attachmentId: string;
    mediaType: string;
};
export interface CaptureMessage {
    id: string;
    seq: number;
    turn?: number;
    role: 'user' | 'assistant';
    blocks: CaptureBlock[];
}
export interface CaptureMaterial {
    id: string;
    kind: 'image' | 'file';
    origin: 'upload' | 'delivery';
    name: string;
    bytes: number | null;
    seq: number;
    turn?: number;
    messageId?: string;
    imageId?: string;
    available: boolean;
    placement?: 'body' | 'supplement';
}
export interface ArchivedMaterial extends CaptureMaterial {
    saved?: NoteAttachment;
    assetId?: string;
    bodyLinks?: string[];
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
    materials?: CaptureMaterial[];
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
    archivedMaterials?: ArchivedMaterial[];
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
export type ConversationExportFormat = 'markdown' | 'pdf' | 'png-long';
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
    materialIds?: string[];
    allowLarge?: boolean;
}
export interface CaptureProgress {
    file: string;
    bytes: number;
    total: number;
    done: number;
    count: number;
    stage: 'reading' | 'saving' | 'complete';
}
export interface ReferencePlan {
    noteId: string;
    revision: string;
    title: string;
    required: {
        assetIds: string[];
        attachmentIds: string[];
    };
    supplements: Array<{
        id: string;
        name: string;
        bytes: number | null;
        image: boolean;
    }>;
}
export interface NotesApiContract {
    '/notes/usage': {
        request: undefined;
        response: {
            ok: true;
            usage: {
                bytes: number;
                gitBytes: number;
                notes: number;
                revisions: number;
                level: 'normal' | 'notice' | 'large';
                nearLimit: boolean;
            };
        };
    };
    '/notes/capture-progress': {
        request: {
            requestId: string;
        };
        response: {
            ok: true;
            progress: CaptureProgress | null;
        };
    };
    '/notes/conversation-file': {
        request: {
            sessionId: string;
            throughSeq: number;
            messageIds: string[];
            materialId: string;
            hash: string;
        };
        response: never;
    };
    '/notes/reference-preview': {
        request: {
            noteId: string;
        };
        response: {
            ok: true;
            plan: ReferencePlan;
        };
    };
    '/notes/reference': {
        request: {
            sessionId: string;
            noteId: string;
            revision: string;
            assetIds: string[];
            attachmentIds: string[];
        };
        response: {
            ok: true;
            instruction: string;
            files: number;
            path: string;
        };
    };
    '/notes/import-task': {
        request: {
            action: 'begin' | 'end' | 'heartbeat';
            taskId?: string;
        };
        response: {
            ok: true;
            taskId?: string;
        };
    };
    '/notes/transfer': {
        request: {
            action: 'single' | 'begin' | 'chunk' | 'finish' | 'cancel' | 'promote-image';
            noteId: string;
            editId?: string;
            attachmentId?: string;
            draft?: boolean;
            name?: string;
            size?: number;
            mediaType?: string;
            uploadId?: string;
            offset?: number;
            base64?: string;
        };
        response: {
            ok: true;
            uploadId?: string;
            offset?: number;
            asset?: {
                id: string;
                bytes: number;
                mediaType: string;
                preview?: string;
            };
            attachment?: NoteAttachment;
        };
    };
    '/notes/session-context': {
        request: {
            sessionId: string;
        };
        response: {
            ok: true;
            workspace: {
                id: string;
                title: string;
            } | null;
            notebookId: string | null;
        };
    };
    '/notes/associate': {
        request: {
            noteId: string;
            expectedHeads: string[];
            sessionId: string;
            linked: boolean;
        };
        response: {
            ok: true;
            note: NoteView;
        };
    };
    '/notes/workspace-book': {
        request: {
            workspaceId: string;
            notebookId?: string | null;
        };
        response: {
            ok: true;
            notebookId: string | null;
        };
    };
    '/notes/manage': {
        request: NoteManageRequest;
        response: {
            ok: true;
            completed: string[];
            note?: NoteView;
        };
    };
    '/notes/catalog': {
        request: undefined;
        response: {
            ok: true;
        } & NoteCatalog;
    };
    '/notes/history': {
        request: {
            noteId: string;
            cursor?: string;
        };
        response: {
            ok: true;
            items: NoteHistoryItem[];
            cursor: string | null;
        };
    };
    '/notes/revision': {
        request: {
            noteId: string;
            revision: string;
        };
        response: {
            ok: true;
            note: NoteView;
        };
    };
    '/notes/backlinks': {
        request: {
            noteId: string;
            cursor?: string;
        };
        response: {
            ok: true;
            items: NoteListItem[];
            total: number;
            cursor: string | null;
        };
    };
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
    '/notes/draft': {
        request: NoteDraftRequest;
        response: NoteDraftResult;
    };
    '/notes/draft-recovery': {
        request: undefined;
        response: {
            ok: true;
            recovered: string[];
            failed: string[];
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
    '/notes/suggest': {
        request: CaptureRequest;
        response: {
            ok: true;
            metadata: NoteStageResult;
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
    transport?: 'auxiliary';
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
