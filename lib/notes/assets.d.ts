import type { ImageMediaType } from '../contracts/media.js';
import type { NoteAsset, NoteContent } from './types.js';
import { type NoteFiles } from './files.js';
export declare function validateAsset(bytes: Buffer, mediaType: ImageMediaType): NoteAsset;
export declare function mediaTypeFor(id: string): ImageMediaType;
/** Only archive references are resolved here; ordinary remote links are never fetched. */
export declare function validateBodyAssets(body: string, ids: string[]): string[];
export declare function checkReferences(files: NoteFiles, content: NoteContent): Promise<void>;
export declare function sourceBytes(value: unknown): Buffer;
