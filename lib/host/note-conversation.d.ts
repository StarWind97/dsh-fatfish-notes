import type { SessionController, SessionWireEvent } from '@deepseek-ai/dsh-api-session-controller';
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
import type { CaptureCut } from '../contracts/notes.js';
import type { CaptureRead } from '../notes/capture.js';
import type { ImageMediaType } from '../contracts/media.js';
export type NoteConversationController = Pick<SessionController, 'follow' | 'page' | 'attachment'>;
/** Archive append-origin text, rather than the model-compaction replacement. */
export declare function projectTranscript(events: readonly SessionWireEvent[]): CaptureRead;
export declare class NoteConversation {
    private readonly provider;
    constructor(provider: () => NoteConversationController | undefined);
    private controller;
    open(sessionId: string, signal: AbortSignal): Promise<CaptureCut>;
    read(sessionId: string, cut: Pick<CaptureCut, 'throughSeq'>, signal: AbortSignal): Promise<CaptureRead>;
    attachment(sessionId: string, attachmentId: string, mediaType: string, signal: AbortSignal, reference?: ImageAttachmentRef): Promise<{
        bytes: Buffer;
        mediaType: ImageMediaType;
    }>;
}
