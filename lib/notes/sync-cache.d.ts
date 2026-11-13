import type { GitSnapshot } from '../git/types.js';
/** Receipts from a completely validated snapshot. Binary bodies are never retained. */
export declare class VerifiedSnapshotFiles {
    private readonly byteLimit;
    private readonly entryLimit;
    private readonly files;
    private bytes;
    constructor(byteLimit?: number, entryLimit?: number);
    private identity;
    get(snapshot: GitSnapshot, path: string, limit: number): {
        length: number;
        bytes?: Buffer;
    } | undefined;
    remember(snapshot: GitSnapshot, path: string, file: Buffer | {
        length: number;
    }): void;
}
