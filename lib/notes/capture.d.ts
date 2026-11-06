import type { CaptureRequest, CaptureResult, CaptureSource, CaptureCut, CaptureMessage, CaptureSelectionRequest, CaptureSelection, CaptureTranscript } from '../contracts/notes.js';
import type { ImageMediaType } from '../contracts/media.js';
import { NoteRepository } from './repository.js';
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
/** Host image references travel with a frozen read, but are not archived or sent to the UI. */
export interface CaptureRead extends CaptureTranscript {
    imageReferences?: ReadonlyMap<string, ImageAttachmentRef>;
}
export interface CaptureConversation {
    open(sessionId: string, signal: AbortSignal): Promise<CaptureCut>;
    read(sessionId: string, cut: CaptureCut, signal: AbortSignal): Promise<CaptureRead>;
    attachment(sessionId: string, attachmentId: string, mediaType: string, signal: AbortSignal, reference?: ImageAttachmentRef): Promise<{
        bytes: Buffer;
        mediaType: ImageMediaType;
    }>;
}
export declare function validateCaptureRequest(input: unknown): CaptureRequest;
export declare function selectMessages(messages: CaptureMessage[], request: Pick<CaptureRequest, 'scope' | 'messageIds' | 'anchorMessageId'>): CaptureMessage[];
export declare function rawBody(source: CaptureSource): string;
/** Durable request identity is written BEFORE reading history; a frozen cut is
 * persisted before pagination. Retrying never selects a newer tail or note ID. */
export declare class NoteCaptureService {
    readonly repository: NoteRepository;
    private readonly conversation;
    private tail;
    constructor(repository: NoteRepository, conversation: CaptureConversation);
    capture(input: unknown, signal?: AbortSignal): Promise<CaptureResult>;
    selection(input: CaptureSelectionRequest, signal?: AbortSignal): Promise<CaptureSelection>;
    private perform;
}
