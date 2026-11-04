import type { SessionController, SessionWireEvent } from '@deepseek-ai/dsh-api-session-controller';
/** Shared bounded, gap-checked frozen log reader. Capture and AI scheduling
 * project the same events differently; neither may weaken pagination safety. */
export declare function readNoteHistory(controller: Pick<SessionController, 'page'>, sessionId: string, throughSeq: number, signal: AbortSignal): Promise<SessionWireEvent[]>;
