import { type BigIntStats } from 'node:fs';
export interface FileInventorySnapshot {
    paths: string[];
    bytes: number;
    fingerprint: string;
    stamps: Map<string, string>;
    directories: Map<string, string>;
}
export declare const inventoryStamp: (path: string, stat: BigIntStats) => string;
type WatchHandle = {
    close(): void;
};
export interface InventoryOptions {
    now?: () => number;
    watch?: (root: string, change: (path: string | null) => void, error: () => void) => WatchHandle;
}
/** Rebuildable metadata only. Notifications identify work; relevant paths are also checked directly. */
export declare class FileInventory {
    private readonly root;
    private readonly audit;
    private readonly safe;
    private readonly options;
    private current;
    private invalidated;
    private dirty;
    private watcher;
    private unavailable;
    private closed;
    private rootIdentity;
    private lastAudit;
    private revision;
    private readonly now;
    constructor(root: string, audit: () => Promise<FileInventorySnapshot>, safe: (path: string) => Promise<void>, options?: InventoryOptions);
    changed(path: string | null): void;
    close(): void;
    private start;
    private inspect;
    private remove;
    private refresh;
    snapshot(verify?: string[], force?: boolean): Promise<FileInventorySnapshot>;
    private inspectSnapshot;
}
export {};
