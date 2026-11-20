export type TagMode = 'rename' | 'merge' | 'remove';
export interface TagChange {
    source: string;
    target: string | null;
    mode: TagMode;
}
export type TagRequest = {
    action: 'status';
} | ({
    action: 'preview';
} & TagChange) | ({
    action: 'apply';
    token: string;
} & TagChange) | {
    action: 'resume' | 'finish';
    token: string;
};
export interface TagPreviewRow {
    noteId: string;
    title: string;
    book: string;
    notebookId: string | null;
    before: string[];
    after: string[];
}
export interface TagPreview extends TagChange {
    targetCount: number;
    token: string;
    rows: TagPreviewRow[];
}
export type TagPhase = 'applying' | 'done' | 'undoing' | 'undone';
export interface TagReceipt extends TagChange {
    token: string;
    phase: TagPhase;
    rows: {
        noteId: string;
        title: string;
        completed: boolean;
    }[];
}
export interface TagResponse {
    ok: true;
    preview?: TagPreview;
    receipt: TagReceipt | null;
}
