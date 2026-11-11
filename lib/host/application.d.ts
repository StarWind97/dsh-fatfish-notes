import type { ConversationFileServices } from './conversation-files.js';
import { NotesApplication } from './notes.js';
import { PrivateWorkspaceSync, type PrivateWorkspaceSyncOptions } from '../private-workspace/sync.js';
import type { NoteModelController } from './note-model.js';
import type { PersonalState } from '../contracts/personal.js';
import { EditCoordinator } from './edit-coordinator.js';
import { WorkspaceBooks } from './workspace-books.js';
import type { WorkspaceRegistry } from '@deepseek-ai/dsh-workspace';
export interface ApplicationOptions extends ConversationFileServices {
    dir: string;
    conversation?: () => NoteModelController | undefined;
    workspaces?: () => Pick<WorkspaceRegistry, 'list'> | undefined;
    pickFolder?: (signal?: AbortSignal) => Promise<string | null>;
    personal?: Pick<PrivateWorkspaceSyncOptions, 'gateway' | 'gitRunner' | 'remoteForTest' | 'batchMs' | 'retryMs'>;
}
export declare class NotebookApplication {
    private readonly options;
    readonly notes: NotesApplication;
    readonly backup: PrivateWorkspaceSync;
    readonly workspace: EditCoordinator;
    readonly workspaceBooks: WorkspaceBooks;
    requireWindowIdentity: boolean;
    openWindow: ((noteId?: string) => Promise<{
        ok: true;
        focused: boolean;
        reused: boolean;
    }>) | undefined;
    closeWindowService: (() => Promise<void>) | undefined;
    constructor(options: ApplicationOptions);
    workspaceRequest(path: string, input: unknown): Promise<import("../contracts/workspace.js").WorkspaceState>;
    changeLocation<T>(work: () => Promise<T>): Promise<T>;
    personalState(): PersonalState;
    workspaceBook(input: unknown): Promise<{
        ok: true;
        notebookId: string | null;
    }>;
    sessionContext(input: unknown): Promise<{
        ok: true;
        workspace: {
            id: string;
            title: string;
        } | null;
        notebookId: string | null;
    }>;
    pickFolder(signal?: AbortSignal): Promise<{
        ok: true;
        folder: string | null;
    }>;
    close(): Promise<void>;
}
export declare function createApplication(options: ApplicationOptions): Promise<NotebookApplication>;
