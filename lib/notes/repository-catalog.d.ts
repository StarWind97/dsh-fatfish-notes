import type { NoteCatalog, NoteManageRequest, NoteView } from '../contracts/notes.js';
export interface ParsedManageRequest {
    action: NoteManageRequest['action'];
    selected: {
        noteId: string;
        expectedHeads: string[];
    }[];
    copy: boolean;
    single: boolean;
    target: string | undefined;
    notebookId: string | undefined;
    tags: string[];
    revision: string | undefined;
    title: string | undefined;
}
export declare function parseManageRequest(request: NoteManageRequest): ParsedManageRequest;
export declare function buildTagCatalog(views: Iterable<NoteView>, detailed: boolean): NoteCatalog;
export declare function countActiveNotesByNotebook(views: Iterable<NoteView>): Map<string, number>;
