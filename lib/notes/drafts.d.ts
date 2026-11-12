import type { NoteSaveInput } from '../contracts/notes.js';
export interface LocalDraft {
    editId: string;
    noteId: string;
    sequence: number;
    state: 'editing' | 'finished' | 'discarded';
    request?: NoteSaveInput & {
        noteId: string;
    };
    files: string[];
    resultId?: string;
    resultHeads?: string[];
}
/** Local only, outside notes/. Small receipts prevent cancelled/completed browser journals replaying. */
export declare class DraftFiles {
    readonly root: string;
    constructor(root: string);
    read(editId: string): Promise<LocalDraft | null>;
    list(includeReceipts?: boolean): Promise<LocalDraft[]>;
    write(row: LocalDraft): Promise<void>;
}
