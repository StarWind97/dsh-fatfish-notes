import type { NoteRepository } from '../repository.js';
import type { ExportFile } from './service.js';
export declare function exportLibrary(repository: NoteRepository, input: unknown, signal?: AbortSignal): Promise<ExportFile>;
