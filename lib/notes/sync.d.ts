import { NotebookError } from '../domain/errors.js';
import type { GitBackend } from '../git/backend.js';
import type { GitSnapshot } from '../git/types.js';
import type { PrivateFiles } from '../private-workspace/types.js';
import { NoteRepository } from './repository.js';
import { type NoteObjects } from './types.js';
interface Snapshot {
    objects: NoteObjects;
    files: Map<string, Buffer>;
}
/** Immutable identity acknowledgement never includes edits made after the frozen snapshot. */
export declare class NotesSyncModule {
    readonly repository: NoteRepository;
    readonly name = "notes";
    readonly version = 1;
    private currentToken;
    private readonly unsubscribe;
    constructor(repository: NoteRepository, changed: () => void);
    close(): void;
    pending(acknowledged: string | null): boolean;
    initialize(): Promise<void>;
    private local;
    validateVersion(version: unknown): void;
    readSnapshot(backend: GitBackend, snapshot: GitSnapshot, signal?: AbortSignal): Promise<Snapshot>;
    install(remote: Snapshot, objects: NoteObjects, signal?: AbortSignal): Promise<void>;
    prepare(backend: GitBackend, snapshot: GitSnapshot, signal?: AbortSignal, verified?: Snapshot): Promise<{
        files: PrivateFiles;
        acknowledged: string;
        install: () => Promise<void>;
    }>;
}
export declare function noteSyncError(error: unknown): NotebookError;
export {};
