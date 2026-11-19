import { revisionContent } from './conflicts.js';
import { createNoteRevision } from './revisions.js';
import { NoteFiles, missing, utf8 } from './files.js';
import { canonical, digest, fail, hash, keys, object, text } from './validation.js';
export function parseTagRequest(raw) {
    const v = object(raw);
    if (v.action === 'status') {
        keys(v, ['action']);
        return { action: 'status' };
    }
    if (v.action === 'resume' || v.action === 'undo' || v.action === 'finish') {
        keys(v, ['action', 'token']);
        return { action: v.action, token: hash(v.token) };
    }
    if (v.action !== 'apply' && v.action !== 'preview')
        return fail('note_schema');
    keys(v, ['action', 'source', 'target', 'mode', ...(v.action === 'apply' ? ['token'] : [])]);
    const source = text(v.source, 200).trim(), target = v.target === null ? null : text(v.target, 200).trim();
    if (!source || source === target || !(v.mode === 'merge' || v.mode === 'rename' || v.mode === 'remove') ||
        (v.mode === 'remove' ? target !== null : !target))
        return fail('note_schema');
    const change = { source, target, mode: v.mode };
    return v.action === 'preview' ? { action: 'preview', ...change } : { action: 'apply', ...change, token: hash(v.token) };
}
export function tagRevision(base, tags, notebookId, recordedAt) {
    return createNoteRevision({ ...revisionContent(base), tags, notebookId, version: 1, noteId: base.noteId, parents: [base.revision], recordedAt });
}
export function replaceTag(tags, source, target) {
    return [...new Set([...tags.filter(tag => tag !== source), ...(target ? [target] : [])])].sort();
}
// One local receipt beside the notes directory. Only ordinary note revisions travel with sync.
export async function readTagJournal(files) {
    const bytes = await files.read('manifest.json', 64 * 1024 * 1024).catch(e => { if (missing(e))
        return null; throw e; });
    if (!bytes)
        return null;
    const { job, checksum } = object(JSON.parse(utf8(bytes)));
    if (!job || checksum !== digest(canonical(job)))
        return fail('note_corrupt');
    return job;
}
export async function writeTagJournal(files, job) {
    await files.write('manifest.json', canonical({ job, checksum: digest(canonical(job)) }), false);
}
