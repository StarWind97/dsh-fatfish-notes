import { canonical, id, sortedStrings, object, keys, fail } from './validation.js';
export function deletionIds(value) { return value === undefined ? [] : sortedStrings(value, 100_000, id); }
export function deletionData(noteId) { return canonical({ version: 1, noteId: id(noteId) }); }
export function readDeletion(value) {
    const v = object(value);
    keys(v, ['version', 'noteId']);
    if (v.version !== 1)
        fail('note_version');
    return id(v.noteId);
}
export function withoutDeleted(objects, deleted = objects.deleted ?? []) {
    const set = new Set(deleted);
    return { ...objects, revisions: objects.revisions.filter(r => !set.has(r.noteId)), ...(deleted.length ? { deleted: [...set].sort() } : {}) };
}
export function moduleVersion(objects) { return objects.deleted?.length || objects.revisions.some(r => r.attachments !== undefined || r.originPath !== undefined) ? 2 : 1; }
