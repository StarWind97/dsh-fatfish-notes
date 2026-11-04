import { type ExportModel, type ExportRun, type ExportImage } from './model.js';
export declare const EXPORT_LIMITS: {
    readonly side: 32767;
    readonly pixels: 32000000;
    readonly pages: 500;
    readonly imagePixels: 32000000;
};
export type Draw = {
    type: 'text';
    x: number;
    y: number;
    width: number;
    height: number;
    size: number;
    runs: ExportRun[];
    shade: boolean;
    quote: boolean;
} | {
    type: 'image';
    x: number;
    y: number;
    width: number;
    height: number;
    assetId: string;
    alt: string;
} | {
    type: 'line';
    x: number;
    y: number;
    width: number;
    height: number;
};
export interface ExportPage {
    width: number;
    height: number;
    items: Draw[];
}
export type Measure = (text: string, size: number) => number;
export declare function checkPixels(width: number, height: number, ratio: number): void;
/** Character boundaries preserve Chinese and long unbroken code. Adjacent runs retain links. */
export declare function wrapRuns(runs: ExportRun[], width: number, size: number, measure: Measure): ExportRun[][];
/** Both renderers consume these positioned lines. Tall rows split by line, repeating the header. */
export declare function layoutExport(model: ExportModel, images: Record<string, ExportImage>, measure: Measure, width: number, pageHeight: number | null): ExportPage[];
