import type { RepoRef } from './types.js';
export declare function validBranch(branch: string): boolean;
export declare function parseRepoRef(input: unknown): RepoRef | null;
export interface RemoteUrl {
    ref: RepoRef;
    url: string;
    local: boolean;
}
export declare function normalizeRemoteUrl(input: unknown, { allowLocal }?: {
    allowLocal?: boolean;
}): RemoteUrl;
