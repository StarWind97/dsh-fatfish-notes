import type { CaptureRequest, NoteStageResult } from '../contracts/notes.js';
import type { NoteConversation } from './note-conversation.js';
import type { NoteModelBridge } from './note-model.js';
import { type T } from '../domain/localization.js';
/** Read only the fixed selection. The model receives text without opening any attachment. */
export declare function suggestMetadata(request: CaptureRequest, conversation: Pick<NoteConversation, 'readTranscript'>, model: Pick<NoteModelBridge, 'dispatch'>, signal: AbortSignal, t?: T): Promise<NoteStageResult>;
