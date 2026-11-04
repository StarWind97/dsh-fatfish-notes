/** Source stays authoritative until the caller commits the new configuration.
 * The receipt allows retrying an interrupted copy to precisely the same target. */
export declare function copyForMove(home: string, source: string, target: string, repoId: number, signal: AbortSignal): Promise<() => Promise<void>>;
