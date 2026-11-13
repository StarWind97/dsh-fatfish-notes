import type { CaptureMaterial, CaptureMessage, CaptureBlock, ArchivedMaterial } from '../contracts/notes.js';
/** A file card has an explicit identity. Plain text and legacy sources never guess one. */
export declare function capturedFile(block: CaptureBlock, message: Pick<CaptureMessage, 'id' | 'seq'>, materials?: ArchivedMaterial[]): {
    label: string;
    markdown: string;
    material: undefined;
} | {
    material: ArchivedMaterial;
    label: string;
    markdown: string;
} | null;
/** Match only actual local Markdown destinations to known selected materials. No disk search. */
export declare function captureLinks(messages: CaptureMessage[], materials: CaptureMaterial[], paths?: ReadonlyMap<string, string>): Map<string, {
    url: string;
    image: boolean;
}[]>;
export declare function capturedText(body: string, materials?: ArchivedMaterial[], externalImagesAsLinks?: boolean): string;
export declare function supplementMarkdown(materials: {
    assetIds: string[];
    attachmentIds: string[];
}, files?: {
    id: string;
    name: string;
}[]): string;
/** A delivery belongs to a turn; an upload belongs to its visible message. */
export declare function materialsFor(messages: CaptureMessage[], materials: CaptureMaterial[]): CaptureMaterial[];
export declare function materialMarkdown(materials: ArchivedMaterial[]): string;
