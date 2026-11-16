import type { AppearanceState } from '../contracts/appearance.js';
import type { WindowSurface, WindowTheme } from '../contracts/workspace.js';
export declare function validatedTheme(input: unknown): WindowTheme;
/** Profile-local preferences. Waiters and writes never enter the note repository queue. */
export declare class SharedAppearance {
    private dir;
    private waitMs;
    private data;
    private loaded;
    private chain;
    private readonly epoch;
    private sequence;
    private theme;
    private waiters;
    private closed;
    constructor(dir: string, waitMs?: number);
    private serial;
    private load;
    private persist;
    private changed;
    private snapshot;
    connect(surface: WindowSurface, input: unknown): Promise<AppearanceState>;
    update(input: unknown): Promise<AppearanceState>;
    setTheme(surface: WindowSurface, input: unknown): AppearanceState;
    wait(windowId: string, input: unknown, signal: AbortSignal): Promise<AppearanceState>;
    close(): Promise<void>;
}
