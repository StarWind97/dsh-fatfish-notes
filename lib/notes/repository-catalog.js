import { NOTE_LIMITS } from './types.js';
import { fail, hash, id, keys, object, sortedStrings, text } from './validation.js';
const MANAGE_ACTIONS = [
    'rename',
    'favorite',
    'unfavorite',
    'pin',
    'unpin',
    'move',
    'add-tags',
    'remove-tags',
    'duplicate',
    'revision',
    'revision-copy',
];
export function parseManageRequest(request) {
    const v = object(request);
    if (!MANAGE_ACTIONS.includes(String(v.action)) || !Array.isArray(v.notes) || !v.notes.length || v.notes.length > NOTE_LIMITS.notes) {
        fail('note_schema');
    }
    const selected = v.notes.map(raw => {
        const n = object(raw);
        keys(n, ['noteId', 'expectedHeads']);
        return { noteId: id(n.noteId), expectedHeads: sortedStrings(n.expectedHeads, NOTE_LIMITS.revisions, hash) };
    });
    if (new Set(selected.map(n => n.noteId)).size !== selected.length)
        fail('note_schema');
    const action = request.action;
    const copy = action === 'duplicate' || action === 'revision-copy';
    const single = copy || action === 'revision' || action === 'rename';
    if (single && selected.length !== 1)
        fail('note_schema');
    const target = copy ? id(v.targetId) : undefined;
    const notebookId = action === 'move' || v.notebookId !== undefined ? id(v.notebookId) : undefined;
    const tags = action === 'add-tags' || action === 'remove-tags'
        ? sortedStrings(v.tags, 50, rawTag => {
            const value = text(rawTag, 200).trim();
            if (!value)
                fail();
            return value;
        })
        : [];
    const revision = action.startsWith('revision') ? hash(v.revision) : undefined;
    const title = v.title === undefined ? undefined : text(v.title, 1200).trim();
    if (action === 'rename' && !title)
        fail('note_schema');
    return { action, selected, copy, single, target, notebookId, tags, revision, title };
}
export function buildTagCatalog(views, detailed) {
    const entries = new Map();
    for (const note of views) {
        if (note.current.status !== 'active')
            continue;
        for (const tag of note.current.tags) {
            const entry = entries.get(tag) ?? { count: 0, latest: '', books: new Map() };
            entry.count++;
            if (detailed) {
                if (note.savedAt > entry.latest)
                    entry.latest = note.savedAt;
                const book = note.effectiveNotebookId;
                entry.books.set(book, (entry.books.get(book) ?? 0) + 1);
            }
            entries.set(tag, entry);
        }
    }
    const tags = [...entries]
        .map(([tag, entry]) => ({
        tag,
        count: entry.count,
        ...(detailed && {
            latest: entry.latest,
            books: [...entry.books].map(([bookId, count]) => ({ id: bookId, count })),
        }),
    }))
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
    return { tags };
}
export function countActiveNotesByNotebook(views) {
    const counts = new Map();
    for (const note of views) {
        if (note.current.status === 'active' && note.effectiveNotebookId) {
            counts.set(note.effectiveNotebookId, (counts.get(note.effectiveNotebookId) ?? 0) + 1);
        }
    }
    return counts;
}
