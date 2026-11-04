import type { NoteRepository } from '../repository.js';
import { type ExportModel } from './model.js';
export interface ExportFile {
    bytes: Buffer;
    mediaType: string;
    filename: string;
}
export declare function createExport(repository: NoteRepository, input: unknown, signal?: AbortSignal): Promise<ExportFile>;
export declare function renderPdfFile(filename: string, model: ExportModel, images: Record<string, Buffer>, convertedImages: unknown, signal?: AbortSignal): Promise<ExportFile>;
