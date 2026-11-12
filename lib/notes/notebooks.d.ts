import type { NotebookView } from '../contracts/notes.js';
export declare const DEFAULT_NOTEBOOK_ID = "00000000000000000000000000";
export declare const DEFAULT_NOTEBOOK_TIME = "1970-01-01T00:00:00.000Z";
export declare const activeNotebook: (book: NotebookView) => boolean;
export declare const notebookNameKey: (title: string) => string;
export declare const NOTEBOOK_NAME_TAKEN = "\u5DF2\u6709\u540C\u540D\u7B14\u8BB0\u672C\uFF0C\u8BF7\u4F7F\u7528\u5176\u4ED6\u540D\u79F0\u3002";
export declare function sameNamedNotebook(books: NotebookView[], title: string, exceptId?: string): NotebookView | undefined;
/** Folder imports create separate books rather than silently merging existing collections. */
export declare function importedNotebookName(books: NotebookView[], title: string): string;
export declare function defaultNotebook(books: NotebookView[]): NotebookView | undefined;
