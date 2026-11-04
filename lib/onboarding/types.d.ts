import type { OnboardingAccount } from '../contracts/onboarding.js';
export interface GitHubRepository {
    id: number;
    name: string;
    owner: string;
    ownerId: number;
    visibility: 'public' | 'private';
}
export interface GitHubGateway {
    available(signal?: AbortSignal): Promise<boolean>;
    login?(onCode: (code: string) => void, signal: AbortSignal): Promise<void>;
    account(signal?: AbortSignal): Promise<OnboardingAccount | null>;
    repository(owner: string, repo: string, signal?: AbortSignal): Promise<GitHubRepository | null>;
    /** The remote mutation itself must bind this frozen owner, never the current user. */
    createPrivate(owner: OnboardingAccount, repo: string, signal?: AbortSignal): Promise<GitHubRepository | void>;
}
