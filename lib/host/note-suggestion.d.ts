import type { CaptureRequest, NoteStageResult } from '../contracts/notes.js';
import type { CaptureConversation } from '../notes/capture.js';
import type { ConversationFileServices } from './conversation-files.js';
import type { NoteModelBridge } from './note-model.js';
/** Preview reads the frozen selection only. No note, source or capture journal is written. */
export declare function suggestMetadata(request: CaptureRequest, conversation: CaptureConversation, model: NoteModelBridge, services: ConversationFileServices, signal: AbortSignal): Promise<NoteStageResult>;
