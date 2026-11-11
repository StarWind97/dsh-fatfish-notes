import type { RepoRef } from '../domain/types.js';
export interface GitTarget {
    ref: RepoRef;
    key: string;
    repositoryKey: string;
    remote: string;
}
export interface TreeEntry {
    sha: string;
    mode: string;
    type: string;
}
export interface GitSnapshot {
    revision: string | null;
    treeSha: string | null;
    entries: ReadonlyMap<string, TreeEntry>;
}
export interface RepositoryInspection {
    available: boolean;
    readable: boolean;
    write: 'unverified';
    initialized: boolean;
}
export interface ChangeSet {
    files: ReadonlyMap<string, string | Uint8Array | (() => Promise<Uint8Array>) | null>;
}
export interface Reconciliation {
    state: 'synced' | 'pending' | 'unknown';
    revision?: string | null;
}
