// The same seed on every device keeps a newly connected library from gaining duplicates.
export const DEFAULT_NOTEBOOK_ID = '00000000000000000000000000';
export const DEFAULT_NOTEBOOK_TIME = '1970-01-01T00:00:00.000Z';
export const activeNotebook = (book) => [book.current, ...book.conflicts].every(row => row.status === 'active');
export function defaultNotebook(books) {
    return books.filter(activeNotebook).sort((a, b) => {
        const selected = (book) => [book.current, ...book.conflicts].map(row => row.defaultSelectedAt ?? '').sort().at(-1) ?? '';
        return selected(b).localeCompare(selected(a)) || a.notebookId.localeCompare(b.notebookId);
    })[0];
}
