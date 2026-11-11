import type { CaptureMaterial, CaptureMessage, ArchivedMaterial } from '../contracts/notes.js';
/** A delivery belongs to a turn; an upload belongs to its visible message. */
export declare function materialsFor(messages: CaptureMessage[], materials: CaptureMaterial[]): CaptureMaterial[];
export declare function materialMarkdown(materials: ArchivedMaterial[]): string;
