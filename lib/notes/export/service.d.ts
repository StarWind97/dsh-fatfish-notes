import type { NoteRepository } from '../repository.js';
import { type ExportModel } from './model.js';
/** Rendering needs decoded images in memory; this never limits Markdown or stored originals. */
export declare function renderImageBudget(): (value: Buffer) => void;
export interface ExportFile {
    bytes: Buffer;
    mediaType: string;
    filename: string;
    stream?: () => AsyncIterable<Uint8Array>;
}
export declare function createExport(repository: NoteRepository, input: unknown, signal?: AbortSignal, streaming?: boolean): Promise<ExportFile>;
export declare function renderPdfFile(filename: string, model: ExportModel, images: Record<string, Buffer>, convertedImages: unknown, signal?: AbortSignal): Promise<ExportFile>;
