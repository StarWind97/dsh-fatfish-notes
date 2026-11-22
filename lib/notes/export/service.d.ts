import type { NoteRepository } from '../repository.js';
import { type ExportModel } from './model.js';
import { type T } from '../../domain/localization.js';
/** Rendering needs decoded images in memory; this never limits Markdown or stored originals. */
export declare function renderImageBudget(): (value: Buffer) => void;
export interface ExportFile {
    bytes: Buffer;
    mediaType: string;
    filename: string;
    stream?: () => AsyncIterable<Uint8Array>;
}
export declare function createExport(repository: NoteRepository, input: unknown, signal?: AbortSignal, streaming?: boolean, t?: T): Promise<ExportFile>;
export declare function renderPdfFile(filename: string, model: ExportModel, images: Record<string, Buffer>, convertedImages: unknown, signal?: AbortSignal, t?: T): Promise<ExportFile>;
