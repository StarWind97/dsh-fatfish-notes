import type { AttachmentStore, FileAttachmentRef, ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
import type { WorkspaceRegistry } from '@deepseek-ai/dsh-workspace';
import { type CaptureMaterial } from '../contracts/notes.js';
export type WorkspaceFileService = Pick<import('@deepseek-ai/dsh-api-workspace-files').WorkspaceFiles, 'stat' | 'readBytes'>;
export interface ConversationFileServices {
    llm?: () => import('@deepseek-ai/dsh-llm').LlmRuntime | undefined;
    attachments?: () => AttachmentStore | undefined;
    workspaceFiles?: () => WorkspaceFileService | undefined;
    workspaces?: () => Pick<WorkspaceRegistry, 'list'> | undefined;
}
export type MaterialReference = {
    kind: 'upload';
    ref: FileAttachmentRef;
} | {
    kind: 'image';
    ref: ImageAttachmentRef;
} | {
    kind: 'delivery';
    path: string;
    version?: string;
};
export declare class ConversationFiles {
    private services;
    constructor(services?: ConversationFileServices);
    private scope;
    describe(sessionId: string, material: CaptureMaterial, ref: MaterialReference, signal: AbortSignal): Promise<void>;
    read(sessionId: string, material: CaptureMaterial, ref: MaterialReference, signal: AbortSignal, progress?: (bytes: number) => void): Promise<Buffer>;
}
export declare const materialName: (path: string) => string;
