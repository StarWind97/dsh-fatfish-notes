import type { ExportModel } from './model.js';
export declare const exportFontPath: string;
export declare function exportFont(): Promise<Buffer>;
export declare function exportPdf(model: ExportModel, images: Record<string, Buffer>, signal?: AbortSignal): Promise<Buffer>;
