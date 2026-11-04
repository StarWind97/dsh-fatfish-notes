import type { NoteConversation } from '../../host/note-conversation.js';
import { type ExportFile } from './service.js';
export declare function createConversationExport(conversation: Pick<NoteConversation, 'read' | 'attachment'>, input: unknown, signal: AbortSignal): Promise<ExportFile & {
    warnings: string;
}>;
