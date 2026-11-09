export type WindowSurface = 'embedded' | 'standalone';
export interface WindowIdentity {
    windowId: string;
    serviceEpoch: string;
    leaseId?: string;
}
export interface EditLease {
    noteId: string;
    leaseId: string;
    expiresAt: number;
}
export interface WindowTheme {
    dark: boolean;
    background: string;
    foreground: string;
    muted: string;
    border: string;
    language: 'zh' | 'en';
}
export interface WorkspaceState {
    ok: true;
    serviceEpoch: string;
    repositoryId: number | null;
    changeSeq: number;
    available: boolean;
    owner: WindowSurface | null;
    owned: EditLease | null;
    handoff: {
        id: string;
        noteId: string;
        incoming: boolean;
    } | null;
    command: {
        id: string;
        noteId: string;
    } | null;
    theme: WindowTheme | null;
}
export interface WorkspaceApiContract {
    '/workspace/register': {
        request: {
            windowId: string;
            surface: WindowSurface;
        };
        response: WorkspaceState;
    };
    '/workspace/state': {
        request: {
            noteId?: string;
            theme?: WindowTheme;
        };
        response: WorkspaceState;
    };
    '/workspace/action': {
        request: {
            action: 'acquire' | 'release' | 'handoff' | 'cancel' | 'ack';
            noteId?: string;
            requestId?: string;
        };
        response: WorkspaceState;
    };
    '/workspace/open': {
        request: {
            noteId?: string;
        };
        response: {
            ok: true;
            focused: boolean;
            reused: boolean;
        };
    };
}
