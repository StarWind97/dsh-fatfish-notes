import type { ToolRuntime } from '@deepseek-ai/dsh-tools';
import type { NotesApplication } from './notes.js';
export declare function registerNoteTools(tools: Pick<ToolRuntime, 'register'>, notes: NotesApplication): () => void;
