import { NotebookError } from '../domain/errors.js';
import type { NoteRepository } from '../notes/repository.js';
export interface NotebookLocation {
    ownerId: number;
    repositoryId: number;
    folder: string;
}
export declare class PreviousFolderUnavailable extends NotebookError {
    readonly folder: string;
    constructor(folder: string);
}
export declare function readFolderIdentity(folder: string): Promise<string | null>;
export declare function markFolder(location: NotebookLocation): Promise<void>;
export declare function verifyRememberedFolder(home: string, location: NotebookLocation): Promise<void>;
export declare function outside(parent: string, child: string): boolean;
export declare function folderPath(home: string, input: unknown): string;
export declare function suggestedFolder(home: string, repo: string): string;
export declare function distinctFolder(home: string, source: string, target: string): void;
export declare function emptyFolder(path: string): Promise<void>;
export declare function claimFolder(home: string, path: string): Promise<void>;
export declare const folderMarker = ".dsh-notebook-folder";
export declare function checkFolder(home: string, path: string, bound?: boolean): Promise<void>;
export declare function prepareFolder(home: string, path: string, notes: NoteRepository): Promise<void>;
