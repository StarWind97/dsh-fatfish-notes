import { NotebookError } from '../domain/errors.js';
export declare function digest(value: string): string;
export declare function cancelled(signal?: AbortSignal): void;
export declare function hasCode(error: unknown, code: string): boolean;
export declare function safeError(error: unknown): NotebookError;
/** Do not traverse junctions/symlinks even inside the plugin's configured storage root. */
export declare function noSymlinks(path: string): Promise<void>;
export declare function directory(path: string): Promise<void>;
export declare function fileLock<T>(path: string, action: () => Promise<T>, signal?: AbortSignal): Promise<T>;
export declare function serial<T>(key: string, action: () => Promise<T>, signal?: AbortSignal): Promise<T>;
