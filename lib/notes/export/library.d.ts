import type { NoteRepository } from '../repository.js';
import type { ExportFile } from './service.js';
import { type T } from '../../domain/localization.js';
export declare function exportLibrary(repository: NoteRepository, input: unknown, signal?: AbortSignal, sink?: {
    start: (filename: string) => void;
    write: (data: Uint8Array) => Promise<void>;
}, t?: T): Promise<ExportFile>;
