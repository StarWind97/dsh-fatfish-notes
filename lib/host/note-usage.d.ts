import type { NoteRepository } from '../notes/repository.js';
export interface NoteUsage {
    bytes: number;
    gitBytes: number;
    notes: number;
    revisions: number;
    level: 'normal' | 'notice' | 'large';
    nearLimit: boolean;
}
/** On-demand metadata walk. No file bodies, credentials or Git objects are opened. */
export declare class NoteUsageReader {
    private repo;
    private cached;
    private pending;
    constructor(repo: NoteRepository);
    read(signal?: AbortSignal): Promise<NoteUsage>;
}
