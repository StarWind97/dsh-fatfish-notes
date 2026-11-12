import type { CaptureMaterial, CaptureMessage, ArchivedMaterial } from '../contracts/notes.js';
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
