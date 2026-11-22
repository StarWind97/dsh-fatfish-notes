import type { NoteConversation } from '../../host/note-conversation.js';
import { type ExportFile } from './service.js';
import { type T } from '../../domain/localization.js';
export declare function createConversationExport(conversation: Pick<NoteConversation, 'read' | 'attachment'> & Partial<Pick<NoteConversation, 'material'>>, input: unknown, signal: AbortSignal, streaming?: boolean, t?: T): Promise<ExportFile & {
    warnings: string;
}>;
export declare function conversationFile(conversation: Pick<NoteConversation, 'read' | 'material'>, input: unknown, signal: AbortSignal, t?: T): Promise<ExportFile>;
