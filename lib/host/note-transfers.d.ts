import { NoteRepository } from '../notes/repository.js';
/** One bounded chunk per request; immutable assets become visible only after a complete file. */
export declare class NoteTransfers {
    private directory;
    private repository;
    private batch;
    task(input: unknown): {
        ok: true;
        taskId: string;
    } | {
        ok: true;
        taskId?: never;
    };
    private uploads;
    private timer;
    private cleanup;
    private clearAbandoned;
    constructor(directory: string, repository: NoteRepository);
    get active(): boolean;
    private remove;
    close(): Promise<void>;
    request(input: unknown, signal?: AbortSignal): Promise<{
        ok: true;
        uploadId: string;
        offset: number;
        asset?: never;
        attachment?: never;
    } | {
        ok: true;
        asset: import("../notes/types.js").NoteAsset;
        uploadId?: never;
        offset?: never;
        attachment?: never;
    } | {
        ok: true;
        attachment: import("../contracts/notes.js").NoteAttachment;
        uploadId?: never;
        offset?: never;
        asset?: never;
    } | {
        ok: true;
    }>;
}
