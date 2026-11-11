import type { SessionController, SessionWireEvent } from '@deepseek-ai/dsh-api-session-controller';
import type { NoteJob, NoteStage } from '../contracts/notes.js';
import type { NoteModel } from '../notes/enrichment.js';
import type { NoteRepository } from '../notes/repository.js';
import type { NoteConversationController } from './note-conversation.js';
import type { ConversationFileServices } from './conversation-files.js';
declare module '@deepseek-ai/dsh-llm/types' {
    interface LlmRequestPurposeMap {
        'fatfish-notes-metadata': true;
    }
}
export type NoteModelController = NoteConversationController & Partial<Pick<SessionController, 'modelCatalog'>>;
export declare function inspectNoteTurns(events: readonly SessionWireEvent[], requestIds: string[]): {
    active: string[];
    ended: string[];
};
/** Auxiliary requests use the Host's configured model and frozen note assets.
 * No prompt(), tools, hidden session or current conversation messages are used. */
export declare class NoteModelBridge implements NoteModel {
    private readonly provider;
    private readonly repository;
    private readonly services;
    readonly auxiliary = true;
    constructor(provider: () => NoteModelController | undefined, repository: NoteRepository, services?: ConversationFileServices);
    inspect(): Promise<{
        active: string[];
        ended: string[];
    }>;
    private selection;
    dispatch(job: Pick<NoteJob, 'sessionId'>, stage: NoteStage, prompt: string, signal: AbortSignal, previewImages?: ReadonlyMap<string, Buffer>): Promise<import("../contracts/notes.js").NoteStageResult>;
}
