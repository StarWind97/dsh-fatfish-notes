import type { NotebookView } from '../contracts/notes.js';
export declare const DEFAULT_NOTEBOOK_ID = "00000000000000000000000000";
export declare const DEFAULT_NOTEBOOK_TIME = "1970-01-01T00:00:00.000Z";
export declare const activeNotebook: (book: NotebookView) => boolean;
export declare function defaultNotebook(books: NotebookView[]): NotebookView | undefined;
