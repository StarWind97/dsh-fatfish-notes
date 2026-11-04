import type { SessionController, SessionWireEvent } from '@deepseek-ai/dsh-api-session-controller';
import type { NoteJob, NoteStage } from '../contracts/notes.js';
import type { NoteModel } from '../notes/enrichment.js';
import type { NoteRepository } from '../notes/repository.js';
import type { NoteConversationController } from './note-conversation.js';
export type NoteModelController = NoteConversationController & Partial<Pick<SessionController, 'prompt'>>;
export declare function inspectNoteTurns(events: readonly SessionWireEvent[], requestIds: string[]): {
    active: string[];
    ended: string[];
};
/** Uses only official Host prompt and frozen local image bytes; never reads a
 * path/URL supplied by source text or the model. */
export declare class NoteModelBridge implements NoteModel {
    private readonly provider;
    private readonly repository;
    constructor(provider: () => NoteModelController | undefined, repository: NoteRepository);
    private controller;
    private opening;
    inspect(sessionId: string, requestIds: string[], signal: AbortSignal): Promise<{
        active: string[];
        ended: string[];
    }>;
    dispatch(job: NoteJob, stage: NoteStage, prompt: string, signal: AbortSignal): Promise<void>;
}
