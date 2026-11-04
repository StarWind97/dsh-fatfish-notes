import { type GitRunner } from '../git/backend.js';
import { type NotebookLocation } from './folder.js';
import type { GitHubGateway } from '../onboarding/types.js';
import { type PersonalBinding, type PersonalPreview, type PersonalSyncState } from '../contracts/personal.js';
import { NoteRepository } from '../notes/repository.js';
export interface PrivateWorkspaceSyncOptions {
    dir: string;
    notes: NoteRepository;
    gateway: GitHubGateway;
    gitRunner?: GitRunner;
    remoteForTest?: (binding: PersonalBinding) => string;
    now?: () => number;
    batchMs?: number;
    retryMs?: readonly number[];
    drainNotes?: () => Promise<void>;
}
/** Owns only scheduling/transport. Mutations stay independent of the network lock. */
export declare class PrivateWorkspaceSync {
    private readonly options;
    private readonly stagingFile?;
    private readonly returning?;
    private config;
    private readonly file;
    private readonly notes;
    private readonly controller;
    private pending;
    private controls;
    private writing;
    private timer;
    private error;
    private failures;
    private closed;
    private loaded;
    private admitted;
    private changing;
    private candidate;
    private loginState;
    private loginTask;
    private deviceCode;
    private readonly now;
    constructor(options: PrivateWorkspaceSyncOptions, stagingFile?: string | undefined, returning?: NotebookLocation | undefined);
    load(): Promise<void>;
    private persist;
    private control;
    private ensureOpen;
    private isPending;
    get ready(): boolean;
    get changingLocation(): boolean;
    tools(signal: AbortSignal): Promise<{
        ok: true;
        git: boolean;
        gh: boolean;
        account: import("../contracts/onboarding.js").OnboardingAccount | null;
        login: "waiting" | "failed" | "idle";
        deviceCode: string | null;
    }>;
    startLogin(): {
        ok: true;
    };
    state(): PersonalSyncState;
    changed(): void;
    private canSchedule;
    private errorPaused;
    private schedule;
    private clearTimer;
    private activeBinding;
    private exclusiveChange;
    private activate;
    move(input: unknown, signal?: AbortSignal): Promise<boolean>;
    private freshResetFolder;
    resetPreview(input: unknown, signal?: AbortSignal): Promise<{
        ok: true;
        preview: PersonalPreview;
    }>;
    private checkResetLocation;
    reset(input: unknown, signal?: AbortSignal): Promise<void>;
    preview(input: unknown, signal?: AbortSignal): Promise<{
        ok: true;
        preview: PersonalPreview;
    }>;
    connect(input: unknown, signal?: AbortSignal): Promise<void>;
    private checkTarget;
    private backend;
    private validateRemote;
    private verify;
    private remoteManifest;
    sync(signal?: AbortSignal): Promise<void>;
    private synchronize;
    private perform;
    private success;
    close(): Promise<void>;
}
