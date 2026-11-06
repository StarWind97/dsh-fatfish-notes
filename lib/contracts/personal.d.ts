import type { OnboardingAccount } from './onboarding.js';
export declare const DEFAULT_PRIVATE_REPO_NAME = "fatfish-notes";
export interface PersonalBinding {
    account: OnboardingAccount;
    repo: string;
    repositoryId: number;
}
export interface PersonalSyncState {
    ready: boolean;
    folder: string;
    defaultFolder: string;
    notesConsent?: boolean;
    notesPending?: boolean;
    enabled: boolean;
    status: 'local' | 'idle' | 'syncing' | 'pending' | 'error' | 'paused' | 'disabled';
    binding: PersonalBinding | null;
    lastSuccessAt: string | null;
    lastFailure?: {
        at: string;
        code: string;
    };
    errorCode: string | null;
    error: string | null;
    pending: boolean;
}
export interface PersonalState {
    ok: true;
    sync: PersonalSyncState;
}
export interface PersonalPreview {
    reuseFolder?: boolean;
    id: string;
    account: OnboardingAccount;
    repo: string;
    exists: boolean;
    folder: string;
    repositoryId: number | null;
    dataScope: string[];
}
export interface PersonalApiContract {
    '/personal/folder/pick': {
        request: Record<string, never>;
        response: {
            ok: true;
            folder: string | null;
        };
    };
    '/personal/sync/start': {
        request: Record<string, never>;
        response: PersonalState;
    };
    '/personal/sync/move': {
        request: {
            repositoryId: number;
            folder: string;
        };
        response: PersonalState & {
            cleanupPending: boolean;
        };
    };
    '/personal/sync/reset-preview': {
        request: {
            repositoryId: number;
            repo: string;
            mode: 'existing' | 'create';
            folder: string;
            folderIntent?: 'locate' | 'new';
        };
        response: {
            ok: true;
            preview: PersonalPreview;
        };
    };
    '/personal/sync/reset': {
        request: {
            repositoryId: number;
            previewId: string;
            confirmPrivate: true;
        };
        response: PersonalState;
    };
    '/personal/sync/tools': {
        request: Record<string, never>;
        response: {
            ok: true;
            git: boolean;
            gh: boolean;
            account: OnboardingAccount | null;
            login: 'idle' | 'waiting' | 'failed';
            deviceCode: string | null;
        };
    };
    '/personal/sync/login': {
        request: Record<string, never>;
        response: {
            ok: true;
        };
    };
    '/personal': {
        request: undefined;
        response: PersonalState;
    };
    '/personal/sync/preview': {
        request: {
            repo: string;
            mode: 'existing' | 'create';
            folder: string;
        };
        response: {
            ok: true;
            preview: PersonalPreview;
        };
    };
    '/personal/sync/connect': {
        request: {
            previewId: string;
            confirmPrivate: true;
        };
        response: PersonalState;
    };
    '/personal/sync': {
        request: Record<string, never>;
        response: PersonalState;
    };
}
