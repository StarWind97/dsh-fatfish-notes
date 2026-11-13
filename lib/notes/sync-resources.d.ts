import { type NoteFiles } from './files.js';
export interface SyncResource {
    path: string;
    bytes: number;
    read: () => Promise<Buffer>;
}
/** Only immutable resource paths enter this internal installer, never documents or manifests. */
export declare function syncResource(resource: SyncResource): {
    verify: (bytes: Buffer) => void;
    present(files: NoteFiles): Promise<boolean>;
    path: string;
    bytes: number;
    read: () => Promise<Buffer>;
};
export declare function resourceBatches<T extends {
    bytes: number;
}>(resources: T[]): Generator<T[]>;
export declare function missingSyncResources(batch: ReturnType<typeof syncResource>[], files: NoteFiles): Promise<{
    verify: (bytes: Buffer) => void;
    present(files: NoteFiles): Promise<boolean>;
    path: string;
    bytes: number;
    read: () => Promise<Buffer>;
}[]>;
