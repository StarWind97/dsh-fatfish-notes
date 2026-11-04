/** Shared wire-only image types; safe for Client type checking without Node globals. */
export type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
export interface ImageAsset {
    id: string;
    mediaType: ImageMediaType;
    base64: string;
}
