import type { Root } from 'mdast';
export interface ExportRun {
    text: string;
    strong?: boolean;
    emphasis?: boolean;
    code?: boolean;
    href?: string;
}
export type ExportBlock = {
    type: 'text';
    kind: 'paragraph' | 'heading' | 'code' | 'quote' | 'meta';
    runs: ExportRun[];
    level?: number;
} | {
    type: 'image';
    assetId: string;
    alt: string;
} | {
    type: 'table';
    rows: ExportRun[][][];
} | {
    type: 'rule';
};
export interface ExportModel {
    title: string;
    blocks: ExportBlock[];
    assetIds: string[];
}
export interface ExportImage {
    dataUrl: string;
    width: number;
    height: number;
}
export interface ExportSnapshot {
    attachments?: import('../../contracts/notes.js').NoteAttachment[];
    noteId: string;
    revision: string;
    filename: string;
    model: ExportModel;
    assets: Record<string, string>;
}
export declare class ExportError extends Error {
    readonly code: string;
    constructor(code: string);
}
export declare function exportLink(url: string): string | undefined;
export declare function exportTree(body: string): Root;
/** Safe projection, shared by PDF and the isolated image renderer. No HTML or URL fetch. */
export declare function exportModel(title: string, body: string, allowed: readonly string[], markdownOnly?: boolean): ExportModel;
