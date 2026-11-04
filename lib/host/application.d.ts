import { NotesApplication } from './notes.js';
import { PrivateWorkspaceSync, type PrivateWorkspaceSyncOptions } from '../private-workspace/sync.js';
import type { NoteModelController } from './note-model.js';
import type { PersonalState } from '../contracts/personal.js';
export interface ApplicationOptions {
    dir: string;
    conversation?: () => NoteModelController | undefined;
    personal?: Pick<PrivateWorkspaceSyncOptions, 'gateway' | 'gitRunner' | 'remoteForTest' | 'batchMs' | 'retryMs'>;
}
export declare class NotebookApplication {
    private readonly options;
    readonly notes: NotesApplication;
    readonly backup: PrivateWorkspaceSync;
    constructor(options: ApplicationOptions);
    personalState(): PersonalState;
    close(): Promise<void>;
}
export declare function createApplication(options: ApplicationOptions): Promise<NotebookApplication>;
