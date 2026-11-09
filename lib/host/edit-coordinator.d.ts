import { AsyncLocalStorage } from 'node:async_hooks';
import type { WindowIdentity, WindowSurface, WorkspaceState, WindowTheme } from '../contracts/workspace.js';
export declare const windowRequest: AsyncLocalStorage<WindowIdentity | undefined>;
export declare const EDIT_LEASE_MS = 90000;
/** All state transitions run inside the same repository queue as protected writes. */
export declare class EditCoordinator {
    private readonly repository;
    private readonly generation;
    private readonly now;
    epoch: `${string}-${string}-${string}-${string}-${string}`;
    private sessions;
    private leases;
    private transfer;
    private command;
    private theme;
    private maintenance;
    available: boolean;
    constructor(repository: () => number | null, generation: () => number, now?: () => number);
    private prune;
    register(windowId: string, surface: WindowSurface): WorkspaceState;
    private session;
    state(actor: WindowIdentity, noteId?: string, theme?: WindowTheme): WorkspaceState;
    acquire(actor: WindowIdentity, noteId: string): WorkspaceState;
    release(actor: WindowIdentity, noteId?: string): WorkspaceState;
    handoff(actor: WindowIdentity, noteId: string): WorkspaceState;
    cancel(actor: WindowIdentity, requestId?: string): WorkspaceState;
    check(ids: string[], actor?: WindowIdentity | undefined, requireLease?: boolean): undefined;
    beginLocationChange(): undefined;
    endLocationChange(changed: boolean): void;
    requestOpen(noteId?: string): void;
    acknowledge(actor: WindowIdentity, id?: string): WorkspaceState;
}
