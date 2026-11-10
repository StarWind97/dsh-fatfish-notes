import { fail, id, text } from './validation.js';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { searchTerms } from '../contracts/search.js';
function excerpt(value) {
    const words = [];
    function visit(node) {
        if (node.type === 'text' || node.type === 'inlineCode' || node.type === 'code')
            words.push(node.value);
        else if (node.type === 'image' && node.alt)
            words.push(node.alt);
        else if ('children' in node)
            node.children.forEach(visit);
    }
    visit(fromMarkdown(value.slice(0, 2400)));
    return words.join(' ').replace(/\s+/g, ' ').trim().slice(0, 180);
}
/** Rebuilt from immutable objects; no search data is persisted or synchronized. */
export function searchNotes(views, options = {}) {
    const limit = options.limit ?? 50;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
        fail('note_limit');
    const cursor = options.cursor === undefined ? undefined : id(options.cursor);
    const terms = searchTerms(text(options.query ?? '', 12_000));
    const recent = options.recentIds?.map(id);
    if (recent && recent.length > 100)
        fail('note_limit');
    for (const key of ['favorite', 'templates'])
        if (options[key] !== undefined && typeof options[key] !== 'boolean')
            fail('note_schema');
    if (options.status && !['active', 'trashed', 'all'].includes(options.status))
        fail();
    if (options.notebookId !== undefined && options.notebookId !== null)
        id(options.notebookId);
    const selected = views.filter(view => {
        if (!options.order && !terms.length && !recent && cursor && view.noteId <= cursor)
            return false;
        if (recent && !recent.includes(view.noteId))
            return false;
        const alternatives = [view.current, ...view.conflicts];
        return alternatives.some(r => (options.status === 'all' || r.status === (options.status ?? 'active')) &&
            (options.notebookId === undefined || options.notebookId === view.effectiveNotebookId) && (!options.tag || r.tags.includes(options.tag)) &&
            (options.status === 'trashed' || !!r.isTemplate === !!options.templates) && (!options.favorite || r.favorite) &&
            terms.every(term => [r.title, r.summary, ...r.tags, r.body].join('\n').toLocaleLowerCase().includes(term)));
    }).sort((a, b) => {
        const score = (v) => terms.filter(term => v.current.title.toLocaleLowerCase().includes(term)).length;
        return score(b) - score(a) || (recent ? recent.indexOf(a.noteId) - recent.indexOf(b.noteId) : 0) || (options.order === 'recent' ? b.savedAt.localeCompare(a.savedAt) : options.order === 'oldest' ? a.savedAt.localeCompare(b.savedAt) : 0) || a.noteId.localeCompare(b.noteId);
    });
    const start = (options.order || terms.length || recent) && cursor ? selected.findIndex(note => note.noteId === cursor) + 1 : 0;
    const page = selected.slice(start, start + limit);
    return {
        items: page.map(view => {
            const r = view.current, body = r.body.toLocaleLowerCase(), positions = terms.map(t => body.indexOf(t)).filter(p => p >= 0), pos = positions.length ? Math.min(...positions) : 0;
            const snippet = terms.length && positions.length ? `${pos > 60 ? '…' : ''}${excerpt(r.body.slice(Math.max(0, pos - 60)))}` : excerpt(r.summary || r.body);
            return { noteId: view.noteId, heads: view.heads, title: r.title, summary: r.summary, excerpt: snippet, tags: r.tags, notebookId: view.effectiveNotebookId, status: r.status, savedAt: view.savedAt, conflicted: view.conflicts.length > 0, ...(r.favorite !== undefined ? { favorite: r.favorite } : {}), ...(r.isTemplate !== undefined ? { isTemplate: r.isTemplate } : {}) };
        }),
        cursor: selected.length > start + limit ? page[page.length - 1].noteId : null,
    };
}
