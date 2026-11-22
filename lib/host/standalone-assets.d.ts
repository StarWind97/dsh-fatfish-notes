import { type Language } from '../domain/localization.js';
/** Only fixed package resources; callers apply the same request fence as the API. */
export declare function standaloneAsset(path: string, language?: Language): Promise<{
    content: Buffer<ArrayBuffer>;
    type: string;
} | undefined>;
