import { translator } from '../domain/localization.js';
// The same seed on every device keeps a newly connected library from gaining duplicates.
export const DEFAULT_NOTEBOOK_ID = '00000000000000000000000000';
export const DEFAULT_NOTEBOOK_TITLE = '默认笔记本';
export function notebookTitle(book, t) {
    return book.notebookId === DEFAULT_NOTEBOOK_ID && book.current.title === DEFAULT_NOTEBOOK_TITLE ? t('notesDefaultBook') : book.current.title;
}
export function editedNotebookTitle(book, value, t) {
    const title = value.trim();
    return book && title === notebookTitle(book, t) ? book.current.title : title;
}
export const DEFAULT_NOTEBOOK_TIME = '1970-01-01T00:00:00.000Z';
export const activeNotebook = (book) => [book.current, ...book.conflicts].every(row => row.status === 'active');
export const notebookNameKey = (title) => title.trim().replace(/[A-Z]/g, c => c.toLowerCase());
export const NOTEBOOK_NAME_TAKEN = '已有同名笔记本，请使用其他名称。';
export function sameNamedNotebook(books, title, exceptId) {
    const key = notebookNameKey(title);
    return key ? books.find(book => book.notebookId !== exceptId && activeNotebook(book) && notebookNameKey(book.current.title) === key) : undefined;
}
/** Folder imports create separate books rather than silently merging existing collections. */
export function importedNotebookName(books, title, t = translator('zh')) {
    const base = title.trim() || t('transferUntitledBook');
    if (!sameNamedNotebook(books, base))
        return base;
    let name = t('transferImportedBookName', { name: base }), suffix = 2;
    while (sameNamedNotebook(books, name))
        name = t('transferImportedBookNumber', { name: base, number: suffix++ });
    return name;
}
export function defaultNotebook(books) {
    return books.filter(activeNotebook).sort((a, b) => {
        const selected = (book) => [book.current, ...book.conflicts].map(row => row.defaultSelectedAt ?? '').sort().at(-1) ?? '';
        return selected(b).localeCompare(selected(a)) || a.notebookId.localeCompare(b.notebookId);
    })[0];
}
