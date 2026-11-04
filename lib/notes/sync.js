import { conflictRevisions } from './conflicts.js';
import { NotebookError } from '../domain/errors.js';
import { NoteRepository } from './repository.js';
import { NOTE_LIMITS } from './types.js';
import { canonical, digest, fail, object, assetId } from './validation.js';
import { createNoteRevision, validateNoteRevision, validateNotebookRevision, mergeNoteRevisions, mergeNotebookRevisions, materializeNote, materializeNotebook } from './revisions.js';
import { serializeNoteMarkdown, parseNoteMarkdown, NOTE_METADATA_BYTES } from './markdown.js';
import { mediaTypeFor, validateAsset, validateBodyAssets, sourceBytes } from './assets.js';
import { utf8 } from './files.js';
const revisionPath = (r) => `notes/revisions/${r.noteId}/${r.revision}.json`;
const bookPath = (r) => `notes/notebooks/${r.notebookId}/${r.revision}.json`;
function manifest(objects, version) {
    const notes = [...new Set(objects.revisions.map(r => r.noteId))].sort().map(noteId => ({ noteId, heads: materializeNote(objects.revisions.filter(r => r.noteId === noteId), noteId).heads }));
    const notebooks = [...new Set(objects.notebooks.map(r => r.notebookId))].sort().map(notebookId => ({ notebookId, heads: materializeNotebook(objects.notebooks.filter(r => r.notebookId === notebookId), notebookId).heads }));
    const data = { version, notes, notebooks };
    return canonical({ ...data, revision: digest(canonical(data)) });
}
function token(objects) {
    return digest(canonical([...objects.revisions.map(revisionPath), ...objects.notebooks.map(bookPath)].sort()));
}
function sourceAssets(source) {
    const value = object(source).assets;
    if (value === undefined)
        return [];
    return Object.values(object(value)).map(assetId);
}
/** Immutable identity acknowledgement never includes edits made after the frozen snapshot. */
export class NotesSyncModule {
    repository;
    name = 'notes';
    version = 1;
    currentToken = null;
    unsubscribe;
    constructor(repository, changed) {
        this.repository = repository;
        this.unsubscribe = repository.onChange(() => { this.currentToken = null; changed(); });
    }
    close() { this.unsubscribe(); }
    pending(acknowledged) { return this.currentToken === null || this.currentToken !== acknowledged; }
    async initialize() { await this.local(); }
    async local(signal) {
        const { objects, generation } = await this.repository.exportSyncSnapshot(signal);
        if (generation === this.repository.generation)
            this.currentToken = token(objects);
        return { objects };
    }
    validateVersion(version) { if (version !== undefined && version !== 1)
        fail('note_version', '远端笔记版本不支持；已暂停备份，本机编辑仍可使用'); }
    async readSnapshot(backend, snapshot, signal) {
        const files = new Map(), objects = { version: 1, revisions: [], notebooks: [] };
        let total = 0;
        const read = async (path, limit) => {
            const existing = files.get(path);
            if (existing)
                return existing;
            const bytes = await backend.readBytes(snapshot, path, Math.min(limit, NOTE_LIMITS.scan - total), signal);
            total += bytes.length;
            if (total > NOTE_LIMITS.scan)
                fail('note_limit');
            files.set(path, bytes);
            return bytes;
        };
        const paths = [...snapshot.entries.keys()].filter(path => /^notes\/(revisions|notebooks)\//.test(path) && snapshot.entries.get(path)?.type !== 'tree');
        if (paths.length > NOTE_LIMITS.revisions)
            fail('note_limit');
        if (!snapshot.entries.has('notes/manifest.json')) {
            if ([...snapshot.entries.keys()].some(path => path.startsWith('notes/')))
                fail('note_manifest', '远端笔记清单缺失；已保留远端内容');
            return { objects, files };
        }
        const remoteManifest = object(JSON.parse(utf8(await read('notes/manifest.json', NOTE_LIMITS.scan))));
        this.validateVersion(remoteManifest.version);
        for (const path of paths) {
            const raw = JSON.parse(utf8(await read(path, NOTE_LIMITS.body * 6 + NOTE_METADATA_BYTES)));
            if (path.startsWith('notes/revisions/')) {
                const row = validateNoteRevision(raw);
                if (revisionPath(row) !== path)
                    fail('note_path');
                objects.revisions.push(row);
            }
            else {
                const row = validateNotebookRevision(raw);
                if (bookPath(row) !== path)
                    fail('note_path');
                objects.notebooks.push(row);
            }
        }
        objects.revisions = mergeNoteRevisions(objects.revisions, []);
        objects.notebooks = mergeNotebookRevisions(objects.notebooks, []);
        if (new Set(objects.revisions.map(r => r.noteId)).size > NOTE_LIMITS.notes || canonical(remoteManifest) !== manifest(objects, Number(remoteManifest.version)))
            fail('note_manifest', '远端笔记清单与修订集合不一致；已暂停备份');
        const sources = new Set(objects.revisions.flatMap(r => r.sourceId ? [r.sourceId] : [])), assets = new Set(objects.revisions.flatMap(r => r.assetIds));
        for (const source of sources) {
            const bytes = await read(`notes/sources/${source}.json`, NOTE_LIMITS.source);
            const parsed = JSON.parse(utf8(bytes));
            if (digest(bytes) !== source || !sourceBytes(parsed).equals(bytes))
                fail('note_hash');
            sourceAssets(parsed).forEach(id => assets.add(id));
        }
        for (const asset of assets) {
            const bytes = await read(`notes/assets/${asset}`, NOTE_LIMITS.image);
            if (validateAsset(bytes, mediaTypeFor(asset)).id !== asset)
                fail('note_hash');
        }
        for (const row of objects.revisions) {
            validateBodyAssets(row.body, row.assetIds);
            if (row.assetIds.reduce((n, id) => n + files.get(`notes/assets/${id}`).length, 0) > NOTE_LIMITS.imageTotal)
                fail('note_limit');
            if (row.notebookId !== null && !objects.notebooks.some(book => book.notebookId === row.notebookId))
                fail('note_parent');
        }
        const external = [];
        for (const noteId of new Set(objects.revisions.map(r => r.noteId))) {
            const path = `notes/documents/${noteId}.md`, markdown = utf8(await read(path, NOTE_LIMITS.body + NOTE_METADATA_BYTES)), parsed = parseNoteMarkdown(markdown);
            const base = objects.revisions.find(r => r.noteId === noteId && r.revision === parsed.declaredRevision);
            if (!base || parsed.revision.noteId !== noteId)
                fail('note_parent');
            if (!parsed.changed)
                continue;
            if (canonical(base.parents) !== canonical(parsed.revision.parents) || base.recordedAt !== parsed.revision.recordedAt)
                fail('note_frontmatter');
            // Use the declared version's timestamp so every device derives exactly the same external edit identity.
            const { revision: _hash, ...externalContent } = parsed.revision;
            const row = createNoteRevision({ ...externalContent, parents: [base.revision] });
            validateBodyAssets(row.body, row.assetIds);
            if (row.assetIds.some(id => !files.has(`notes/assets/${id}`)) || (row.sourceId && !files.has(`notes/sources/${row.sourceId}.json`)) || (row.notebookId && !objects.notebooks.some(b => b.notebookId === row.notebookId)))
                fail('note_asset');
            external.push(row);
        }
        objects.revisions = mergeNoteRevisions(objects.revisions, external);
        return { objects, files };
    }
    async install(remote, objects, signal) {
        // Validate the whole remote first, then install dependencies before visible revisions.
        for (const [path, bytes] of remote.files) {
            signal?.throwIfAborted();
            if (path.startsWith('notes/assets/'))
                await this.repository.putAsset(bytes, mediaTypeFor(path.slice(13)), signal);
            else if (path.startsWith('notes/sources/'))
                await this.repository.putSource(JSON.parse(utf8(bytes)), signal);
        }
        await this.repository.importObjects(objects, signal);
        await this.local(signal);
    }
    async prepare(backend, snapshot, signal, verified) {
        const remote = verified ?? await this.readSnapshot(backend, snapshot, signal);
        const local = (await this.local(signal)).objects;
        const revisions = mergeNoteRevisions(local.revisions, remote.objects.revisions);
        const objects = { version: 1, revisions: mergeNoteRevisions(revisions, conflictRevisions(revisions)), notebooks: mergeNotebookRevisions(local.notebooks, remote.objects.notebooks) };
        const files = new Map();
        const set = (path, data) => { const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data); if (!remote.files.get(path)?.equals(bytes))
            files.set(path, bytes); };
        const assets = new Set(objects.revisions.flatMap(r => r.assetIds));
        for (const sourceId of new Set(objects.revisions.flatMap(r => r.sourceId ? [r.sourceId] : []))) {
            const bytes = remote.files.get('notes/sources/' + sourceId + '.json');
            const source = bytes ? JSON.parse(utf8(bytes)) : await this.repository.getSource(sourceId, signal);
            set(`notes/sources/${sourceId}.json`, sourceBytes(source));
            sourceAssets(source).forEach(id => assets.add(id));
        }
        for (const asset of assets)
            set(`notes/assets/${asset}`, remote.files.get(`notes/assets/${asset}`) ?? await this.repository.getAsset(asset, signal));
        for (const row of objects.revisions)
            set(revisionPath(row), canonical(row));
        for (const row of objects.notebooks)
            set(bookPath(row), canonical(row));
        for (const noteId of new Set(objects.revisions.map(r => r.noteId)))
            set(`notes/documents/${noteId}.md`, serializeNoteMarkdown(materializeNote(objects.revisions.filter(r => r.noteId === noteId), noteId).current));
        set('notes/manifest.json', manifest(objects, this.version));
        return { files, acknowledged: token(objects), install: () => this.install(remote, objects, signal) };
    }
}
export function noteSyncError(error) {
    if (error instanceof NotebookError) {
        if (error.code === 'note_version')
            return error;
        if (error.code.startsWith('note_') || error.code === 'invalid_note' || error.code === 'unsafe_path')
            return new NotebookError('note_sync_invalid', '笔记备份数据缺失、损坏或超过上限；已暂停笔记备份，本机编辑仍可使用');
        return error;
    }
    if (error instanceof SyntaxError)
        return new NotebookError('note_sync_invalid', '远端笔记数据格式损坏；已暂停备份，本机编辑仍可使用');
    return new NotebookError('personal_sync_failed', '笔记备份未完成；本机记录已保留，请重试', 502);
}
