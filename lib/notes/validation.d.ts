import type { NoteContent } from './types.js';
export declare function fail(code?: string, message?: string): never;
export declare function object(value: unknown): Record<string, unknown>;
export declare function keys(value: Record<string, unknown>, allowed: readonly string[]): void;
export declare function text(value: unknown, max: number): string;
export declare function id(value: unknown): string;
export declare function hash(value: unknown): string;
export declare function assetId(value: unknown): string;
export declare function sortedStrings(value: unknown, max: number, check: (v: unknown) => string): string[];
export declare function date(value: unknown): string;
export declare function status(value: unknown): 'active' | 'trashed';
export declare const contentKeys: readonly ["title", "body", "summary", "tags", "notebookId", "status", "sourceId", "assetIds"];
export declare function normalizeContent(value: unknown): NoteContent;
/** Lexicographic object keys; array order is significant. No body normalization. */
export declare function canonical(value: unknown): string;
export declare function digest(value: string | Uint8Array): string;
export declare function relativePath(value: string): string;
