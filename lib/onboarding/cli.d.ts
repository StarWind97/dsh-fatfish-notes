import type { OnboardingAccount } from '../contracts/onboarding.js';
import type { GitHubGateway, GitHubRepository } from './types.js';
export interface CliRunOptions {
    signal?: AbortSignal;
    timeoutMs?: number;
    onOutput?: (chunk: string) => void;
}
export interface CliRunResult {
    exitCode: number;
    stdout: string;
}
export type CliRunner = (args: readonly string[], options?: CliRunOptions) => Promise<CliRunResult>;
/** Output stays at the process boundary; callers explicitly select safe structured fields. */
export declare const runCli: CliRunner;
export declare class GitHubCli implements GitHubGateway {
    private readonly options;
    private readonly runner;
    constructor(options?: {
        runner?: CliRunner;
        authTimeoutMs?: number;
    });
    available(signal?: AbortSignal): Promise<boolean>;
    login(onCode: (code: string) => void, signal: AbortSignal): Promise<void>;
    account(signal?: AbortSignal): Promise<OnboardingAccount | null>;
    repository(owner: string, repo: string, signal?: AbortSignal): Promise<GitHubRepository | null>;
    createPrivate(frozen: OnboardingAccount, repo: string, signal?: AbortSignal): Promise<GitHubRepository>;
}
