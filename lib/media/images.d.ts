import type { ImageMediaType, ImageAsset } from '../contracts/media.js';
export type { ImageMediaType, ImageAsset } from '../contracts/media.js';
export declare const MAX_IMAGE_BYTES: number;
export declare const IMAGE_EXTENSIONS: Readonly<Record<ImageMediaType, string>>;
export declare function normalizeAssetId(value: unknown): string;
export declare function detectImageType(bytes: Buffer): ImageMediaType | null;
/** Copies and canonicalizes all data before any async work; journals never reopen mutable source files. */
export declare function normalizeImageAssets(value: unknown): ImageAsset[];
