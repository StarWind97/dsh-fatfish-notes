import { NOTE_LIMITS } from './types.js';
import { canonical, contentFields, date, digest, fail, hash, id, keys, normalizeContent, object, sortedStrings, status, text } from './validation.js';
export function createNoteRevision(input) {
    const v = object(input), fields = contentFields(v);
    keys(v, ['version', 'noteId', 'parents', 'recordedAt', ...fields]);
    if (v.version !== 1)
        fail('note_version');
    const data = { version: 1, noteId: id(v.noteId), parents: sortedStrings(v.parents, NOTE_LIMITS.revisions, hash), recordedAt: date(v.recordedAt), ...normalizeContent(Object.fromEntries(fields.map(k => [k, v[k]]))) };
    return { ...data, revision: digest(canonical(data)) };
}
export function validateNoteRevision(value) {
    const v = object(value), { revision, ...rest } = v;
    const result = createNoteRevision(rest);
    if (hash(revision) !== result.revision)
        fail('note_hash', '笔记修订校验失败');
    return result;
}
export function createNotebookRevision(input) {
    const v = object(input);
    keys(v, ['version', 'notebookId', 'parents', 'recordedAt', 'title', 'status', ...('defaultSelectedAt' in v ? ['defaultSelectedAt'] : [])]);
    if (v.version !== 1)
        fail('note_version');
    const data = { version: 1, notebookId: id(v.notebookId), parents: sortedStrings(v.parents, NOTE_LIMITS.revisions, hash), recordedAt: date(v.recordedAt), title: text(v.title, 1200).trim() || '未命名笔记本', status: status(v.status) };
    const selected = v.defaultSelectedAt === undefined ? data : { ...data, defaultSelectedAt: date(v.defaultSelectedAt) };
    return { ...selected, revision: digest(canonical(selected)) };
}
export function validateNotebookRevision(value) {
    const { revision, ...rest } = object(value), result = createNotebookRevision(rest);
    if (hash(revision) !== result.revision)
        fail('note_hash');
    return result;
}
/** Iterative Kahn validation also bounds stack use for long histories. */
export function topologicalOrder(rows, identity) {
    const map = new Map(rows.map(r => [r.revision, r])), degrees = new Map(), children = new Map();
    for (const r of map.values()) {
        degrees.set(r.revision, r.parents.length);
        for (const parent of r.parents) {
            const p = map.get(parent);
            if (!p || identity(p) !== identity(r))
                fail('note_parent', '父修订缺失或属于其他笔记');
            const list = children.get(parent) ?? [];
            list.push(r.revision);
            children.set(parent, list);
        }
    }
    const ready = [...degrees].filter(([, n]) => n === 0).map(([h]) => h);
    let seen = 0;
    for (let i = 0; i < ready.length; i++) {
        const h = ready[i];
        seen++;
        for (const child of children.get(h) ?? []) {
            const n = degrees.get(child) - 1;
            degrees.set(child, n);
            if (n === 0)
                ready.push(child);
        }
    }
    if (seen !== map.size)
        fail('note_cycle', '父修订存在环');
    return ready.map(h => map.get(h));
}
export function validateDag(rows, identity) { topologicalOrder(rows, identity); }
function merge(left, right, validate, identity) {
    if (left.length + right.length > NOTE_LIMITS.revisions * 2)
        fail('note_limit');
    const map = new Map();
    for (const raw of [...left, ...right]) {
        const row = validate(raw);
        map.set(row.revision, row);
    }
    if (map.size > NOTE_LIMITS.revisions)
        fail('note_limit');
    const rows = [...map.values()].sort((a, b) => a.revision.localeCompare(b.revision));
    validateDag(rows, identity);
    return rows;
}
export function mergeNoteRevisions(left, right) { return merge(left, right, validateNoteRevision, r => r.noteId); }
export function mergeNotebookRevisions(left, right) { return merge(left, right, validateNotebookRevision, r => r.notebookId); }
function heads(rows) {
    const parents = new Set(rows.flatMap(r => r.parents));
    return rows.filter(r => !parents.has(r.revision)).sort((a, b) => a.revision.localeCompare(b.revision));
}
export function materializeNote(revisions, noteId) {
    id(noteId);
    const tips = heads(mergeNoteRevisions(revisions, []).filter(r => r.noteId === noteId)), current = tips.find(r => r.status === 'active') ?? tips[0];
    if (!current)
        fail('note_not_found', '笔记不存在');
    return { noteId, heads: tips.map(r => r.revision), current, conflicts: tips.filter(r => r !== current), savedAt: current.recordedAt, effectiveNotebookId: current.notebookId };
}
export function materializeNotebook(revisions, notebookId) {
    id(notebookId);
    const tips = heads(mergeNotebookRevisions(revisions, []).filter(r => r.notebookId === notebookId)), current = tips[0];
    if (!current)
        fail('notebook_not_found');
    return { notebookId, heads: tips.map(r => r.revision), current, conflicts: tips.slice(1) };
}
