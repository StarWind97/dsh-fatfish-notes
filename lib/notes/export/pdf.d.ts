import type { ExportModel } from './model.js';
export declare const exportFontPath: string;
export declare function exportFont(): Promise<Buffer>;
import { type T } from '../../domain/localization.js';
export declare function exportPdf(model: ExportModel, images: Record<string, Buffer>, signal?: AbortSignal, t?: T): Promise<Buffer>;
