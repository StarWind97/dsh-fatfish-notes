import type { Context } from '@deepseek-ai/cordis';
export declare const PLUGIN_NAME = "dsh-github-notebook";
export declare const ROUTE_PREFIXES: readonly ["/dsh-github-notebook"];
export declare function ownApplication<T extends {
    close(): Promise<void>;
}>(ctx: Context, dir: string, initialize: () => Promise<T>): Promise<T>;
/** New hosts also coordinate across processes. Only one host may write to this directory. */
export declare function acquireWriter(dir: string): Promise<() => Promise<void>>;
