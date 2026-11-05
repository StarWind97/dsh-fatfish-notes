import type { ChangeSet, GitSnapshot, GitTarget, Reconciliation, RepositoryInspection } from './types.js';
export interface GitRunOptions {
    cwd?: string;
    input?: string | Uint8Array;
    env?: NodeJS.ProcessEnv;
    signal?: AbortSignal;
    timeoutMs?: number;
    allowFailure?: boolean;
    outputBytes?: boolean;
    maxOutputBytes?: number;
}
export interface GitRunResult {
    stdout: string;
    bytes?: Buffer;
    exitCode: number;
}
export type GitRunner = (args: readonly string[], options?: GitRunOptions) => Promise<GitRunResult>;
/** Only call with non-secret Git commands. Child output is never included in errors or persisted. */
export declare const runGit: GitRunner;
export interface GitBackendOptions {
    rootDir: string;
    remote: string;
    branch?: string;
    allowLocal?: boolean;
    runner?: GitRunner;
    timeoutMs?: number;
    githubCliAuth?: boolean;
}
export declare function createGitBackend(options: GitBackendOptions): GitBackend;
export declare class GitBackend {
    private readonly options;
    readonly kind = "git";
    readonly target: GitTarget;
    readonly directory: string;
    private readonly root;
    private readonly runner;
    private readonly timeoutMs;
    constructor(options: GitBackendOptions);
    private git;
    exclusive<T>(action: () => Promise<T>, signal?: AbortSignal): Promise<T>;
    private ensure;
    private validateRepository;
    private checkObjectDirectory;
    private head;
    private sha;
    inspect(signal?: AbortSignal): Promise<RepositoryInspection>;
    snapshot(signal?: AbortSignal, atRevision?: string): Promise<GitSnapshot>;
    readFile(snapshot: GitSnapshot, path: string, signal?: AbortSignal): Promise<string>;
    /** Explicit byte path for bounded private objects; text reads keep a separate size limit. */
    readBytes(snapshot: GitSnapshot, path: string, limit: number, signal?: AbortSignal): Promise<Buffer>;
    /** One bounded Git process for immutable objects, including binary attachments. */
    readBatch(snapshot: GitSnapshot, requests: ReadonlyMap<string, number>, limit: number, signal?: AbortSignal): Promise<Map<string, Buffer>>;
    commit(snapshot: GitSnapshot, change: ChangeSet, _operationId: string, signal?: AbortSignal): Promise<string>;
    push(commitSha: string, parent: string | null, signal?: AbortSignal): Promise<void>;
    reconcile(commitSha: string, signal?: AbortSignal): Promise<Reconciliation>;
}
