export declare const missing: (e: unknown) => boolean;
/** Retry the same atomic replacement when Windows briefly denies delete sharing. */
export declare function replaceFile(temp: string, target: string): Promise<void>;
export declare function utf8(bytes: Uint8Array): string;
export declare function safePath(path: string): Promise<void>;
/** Files are never read through links. Bounded reads avoid allocation from a changed file size. */
export declare function readBytes(path: string, limit: number): Promise<Buffer>;
export declare function syncDirectory(path: string): Promise<void>;
export declare class NoteFiles {
    readonly root: string;
    readonly beforeWrite?: ((path: string) => void | Promise<void>) | undefined;
    constructor(root: string, beforeWrite?: ((path: string) => void | Promise<void>) | undefined);
    path(relative: string): string;
    read(relative: string, limit?: number): Promise<Buffer>;
    remove(relative: string): Promise<void>;
    write(relative: string, data: string | Buffer, immutable: boolean): Promise<void>;
    scan(): Promise<{
        paths: string[];
        bytes: number;
    }>;
}
