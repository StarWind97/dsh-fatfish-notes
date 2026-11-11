import type { AttachmentStore } from '@deepseek-ai/dsh-attachment';
import type { NoteRepository } from '../notes/repository.js';
import type { NoteConversation } from './note-conversation.js';
export declare function referenceNote(repository: NoteRepository, store: AttachmentStore | undefined, conversation: Pick<NoteConversation, 'open'>, input: unknown, signal: AbortSignal): Promise<{
    ok: true;
    instruction: string;
    files: number;
}>;
