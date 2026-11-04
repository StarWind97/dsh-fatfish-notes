import type { SessionController, SessionWireEvent } from '@deepseek-ai/dsh-api-session-controller';
import type { CaptureCut, CaptureTranscript } from '../contracts/notes.js';
import type { ImageMediaType } from '../contracts/media.js';
export type NoteConversationController = Pick<SessionController, 'follow' | 'page' | 'attachment'>;
/** rc.5 UI uses append-origin, NOT foldSurface's model-compaction replacement. */
export declare function projectTranscript(events: readonly SessionWireEvent[]): CaptureTranscript;
export declare class NoteConversation {
    private readonly provider;
    constructor(provider: () => NoteConversationController | undefined);
    private controller;
    open(sessionId: string, signal: AbortSignal): Promise<CaptureCut>;
    read(sessionId: string, cut: Pick<CaptureCut, 'throughSeq'>, signal: AbortSignal): Promise<CaptureTranscript>;
    attachment(sessionId: string, attachmentId: string, mediaType: string, signal: AbortSignal): Promise<{
        bytes: Buffer;
        mediaType: ImageMediaType;
    }>;
}
