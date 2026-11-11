import type { NoteRepository } from '../notes/repository.js';
/** Device-local workspace choices, isolated by the stable GitHub repository ID. */
export declare class WorkspaceBooks {
    private dir;
    private repository;
    private repositoryId;
    private chain;
    constructor(dir: string, repository: NoteRepository, repositoryId: () => number | null);
    request(input: unknown): Promise<{
        ok: true;
        notebookId: string | null;
    }>;
}
