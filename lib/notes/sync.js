import { conflictRevisions } from './conflicts.js';
import { NotebookError } from '../domain/errors.js';
import { NoteRepository } from './repository.js';
import { NOTE_LIMITS } from './types.js';
import { canonical, digest, fail, object, assetId } from './validation.js';
import { createNoteRevision, validateNoteRevision, validateNotebookRevision, mergeNoteRevisions, mergeNotebookRevisions, materializeNote, materializeNotebook } from './revisions.js';
import { serializeNoteMarkdown, parseNoteMarkdown, NOTE_METADATA_BYTES } from './markdown.js';
import { mediaTypeFor, validateAsset, validateBodyAssets, sourceAttachments, sourceBytes } from './assets.js';
import { utf8 } from './files.js';
import { deletionIds, deletionData, readDeletion, moduleVersion, withoutDeleted } from './deletion.js';
import { ATTACHMENT_LIMIT } from '../contracts/notes.js';
const loadFile = (file) => Buffer.isBuffer(file) ? Promise.resolve(file) : file.load();
const revisionPath = (r) => `notes/revisions/${r.noteId}/${r.revision}.json`;
const bookPath = (r) => `notes/notebooks/${r.notebookId}/${r.revision}.json`;
function manifest(objects, version) {
    const notes = [...new Set(objects.revisions.map(r => r.noteId))].sort().map(noteId => ({ noteId, heads: materializeNote(objects.revisions.filter(r => r.noteId === noteId), noteId).heads }));
    const notebooks = [...new Set(objects.notebooks.map(r => r.notebookId))].sort().map(notebookId => ({ notebookId, heads: materializeNotebook(objects.notebooks.filter(r => r.notebookId === notebookId), notebookId).heads }));
    const data = { version, notes, notebooks, ...(objects.deleted?.length ? { deleted: objects.deleted } : {}) };
    return canonical({ ...data, revision: digest(canonical(data)) });
}
function token(objects) {
    return digest(canonical([...objects.revisions.map(revisionPath), ...objects.notebooks.map(bookPath), ...(objects.deleted ?? []).map(n => `notes/deleted/${n}.json`)].sort()));
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
    validateVersion(version) { if (version !== undefined && ![1, 2, 3].includes(version))
        fail('note_version', '远端笔记版本不支持；已暂停备份，本机编辑仍可使用'); }
    async readSnapshot(backend, snapshot, signal) {
        const files = new Map(), objects = { version: 1, revisions: [], notebooks: [] };
        const prefetch = async (paths, limit) => {
            // Binary bodies are validated sequentially and retained as immutable Git references.
            const selected = paths.filter(p => !files.has(p) && !/^notes\/(assets|attachments)\//.test(p));
            for (let at = 0; at < selected.length; at += 8) {
                const batch = await backend.readBatch(snapshot, new Map(selected.slice(at, at + 8).map(p => [p, limit])), Math.min(512 * 1024 * 1024, limit * 8), signal);
                for (const [path, bytes] of batch)
                    files.set(path, bytes);
            }
        };
        const read = async (path, limit) => {
            const existing = files.get(path);
            if (existing) {
                if (existing.length > limit)
                    fail('note_limit');
                return loadFile(existing);
            }
            const load = () => backend.readBytes(snapshot, path, limit, signal), bytes = await load();
            files.set(path, /^notes\/(assets|attachments)\//.test(path) ? { length: bytes.length, load } : bytes);
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
        const deleted = deletionIds(remoteManifest.deleted);
        if (deleted.length)
            objects.deleted = deleted;
        for (const noteId of deleted) {
            const bytes = await read(`notes/deleted/${noteId}.json`, 1024);
            if (readDeletion(JSON.parse(utf8(bytes))) !== noteId)
                fail('note_path');
        }
        await prefetch(paths, NOTE_LIMITS.body * 6 + NOTE_METADATA_BYTES);
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
        if (objects.revisions.some(r => deleted.includes(r.noteId)))
            fail('note_manifest');
        if (new Set(objects.revisions.map(r => r.noteId)).size > NOTE_LIMITS.notes || canonical(remoteManifest) !== manifest(objects, Number(remoteManifest.version)))
            fail('note_manifest', '远端笔记清单与修订集合不一致；已暂停备份');
        const sources = new Set(objects.revisions.flatMap(r => r.sourceId ? [r.sourceId] : [])), assets = new Set(objects.revisions.flatMap(r => r.assetIds));
        await prefetch([...sources].map(id => `notes/sources/${id}.json`), NOTE_LIMITS.source);
        const sourceFiles = [];
        for (const source of sources) {
            const bytes = await read(`notes/sources/${source}.json`, NOTE_LIMITS.source);
            const parsed = JSON.parse(utf8(bytes));
            if (digest(bytes) !== source || !sourceBytes(parsed).equals(bytes))
                fail('note_hash');
            sourceFiles.push(...sourceAttachments(object(parsed)));
            sourceAssets(parsed).forEach(id => assets.add(id));
        }
        await prefetch([...assets].map(id => `notes/assets/${id}`), NOTE_LIMITS.image);
        for (const asset of assets) {
            const bytes = await read(`notes/assets/${asset}`, NOTE_LIMITS.image);
            if (validateAsset(bytes, mediaTypeFor(asset)).id !== asset)
                fail('note_hash');
        }
        const attachments = [...objects.revisions.flatMap(r => r.attachments ?? []), ...sourceFiles];
        await prefetch([...new Set(attachments.map(a => `notes/attachments/${a.id}.bin`))], ATTACHMENT_LIMIT);
        for (const attachment of new Map(attachments.map(a => [a.id, a])).values()) {
            const bytes = await read(`notes/attachments/${attachment.id}.bin`, ATTACHMENT_LIMIT);
            if (bytes.length !== attachment.bytes || digest(bytes) !== attachment.id)
                fail('note_hash');
        }
        for (const row of objects.revisions) {
            validateBodyAssets(row.body, row.assetIds);
            if (row.notebookId !== null && !objects.notebooks.some(book => book.notebookId === row.notebookId))
                fail('note_parent');
        }
        const external = [];
        await prefetch([...new Set(objects.revisions.map(r => `notes/documents/${r.noteId}.md`))], NOTE_LIMITS.body + NOTE_METADATA_BYTES);
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
            if (row.attachments?.some(a => { const file = files.get(`notes/attachments/${a.id}.bin`); return !file || file.length !== a.bytes; }))
                fail('note_asset');
            external.push(row);
        }
        objects.revisions = mergeNoteRevisions(objects.revisions, external);
        return { objects, files };
    }
    async install(remote, objects, signal) {
        // Validate the whole remote first, then install dependencies before visible revisions.
        const sourceIds = new Set(objects.revisions.flatMap(r => r.sourceId ? [r.sourceId] : []));
        const assetIds = new Set(objects.revisions.flatMap(r => r.assetIds));
        const sourceFiles = [];
        for (const sourceId of sourceIds) {
            const bytes = remote.files.get(`notes/sources/${sourceId}.json`);
            if (bytes) {
                const source = object(JSON.parse(utf8(await loadFile(bytes))));
                sourceAssets(source).forEach(a => assetIds.add(a));
                sourceFiles.push(...sourceAttachments(source));
            }
        }
        for (const [path, stored] of remote.files) {
            if (!/^notes\/(assets|sources|attachments)\//.test(path))
                continue;
            const bytes = await loadFile(stored);
            signal?.throwIfAborted();
            if (path.startsWith('notes/assets/') && assetIds.has(path.slice(13)))
                await this.repository.putAsset(bytes, mediaTypeFor(path.slice(13)), signal);
            else if (path.startsWith('notes/sources/') && sourceIds.has(path.slice(14, -5)))
                await this.repository.putSource(JSON.parse(utf8(bytes)), signal);
            else if (path.startsWith('notes/attachments/')) {
                const file = [...objects.revisions.flatMap(r => r.attachments ?? []), ...sourceFiles].find(a => path === `notes/attachments/${a.id}.bin`);
                if (file)
                    await this.repository.putAttachment(bytes, file.name, signal);
            }
        }
        await this.repository.importObjects(objects, signal);
        await this.local(signal);
    }
    async prepare(backend, snapshot, signal, verified) {
        const remote = verified ?? await this.readSnapshot(backend, snapshot, signal);
        const local = (await this.local(signal)).objects;
        const deleted = [...new Set([...(local.deleted ?? []), ...(remote.objects.deleted ?? [])])].sort();
        const revisions = mergeNoteRevisions(withoutDeleted(local, deleted).revisions, withoutDeleted(remote.objects, deleted).revisions);
        const objects = { version: 1, revisions: mergeNoteRevisions(revisions, conflictRevisions(revisions).filter(r => !deleted.includes(r.noteId))), notebooks: mergeNotebookRevisions(local.notebooks, remote.objects.notebooks), ...(deleted.length ? { deleted } : {}) };
        const files = new Map();
        const retained = new Set();
        const set = (path, data) => { retained.add(path); const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data); const old = remote.files.get(path); if (!old || !Buffer.isBuffer(old) || !old.equals(bytes))
            files.set(path, bytes); };
        const sourceFiles = [];
        const assets = new Set(objects.revisions.flatMap(r => r.assetIds));
        for (const sourceId of new Set(objects.revisions.flatMap(r => r.sourceId ? [r.sourceId] : []))) {
            const bytes = remote.files.get('notes/sources/' + sourceId + '.json');
            const source = bytes ? JSON.parse(utf8(await loadFile(bytes))) : await this.repository.getSource(sourceId, signal);
            set(`notes/sources/${sourceId}.json`, sourceBytes(source));
            sourceAssets(source).forEach(id => assets.add(id));
            sourceFiles.push(...sourceAttachments(object(source)));
        }
        for (const asset of assets) {
            const path = `notes/assets/${asset}`;
            retained.add(path);
            if (!remote.files.has(path))
                files.set(path, () => this.repository.getAsset(asset, signal));
        }
        for (const file of new Map([...objects.revisions.flatMap(r => r.attachments ?? []), ...sourceFiles].map(a => [a.id, a])).values()) {
            const path = `notes/attachments/${file.id}.bin`;
            retained.add(path);
            if (!remote.files.has(path))
                files.set(path, () => this.repository.getAttachment(file.id, signal));
        }
        for (const row of objects.revisions)
            set(revisionPath(row), canonical(row));
        for (const row of objects.notebooks)
            set(bookPath(row), canonical(row));
        for (const noteId of new Set(objects.revisions.map(r => r.noteId)))
            set(`notes/documents/${noteId}.md`, serializeNoteMarkdown(materializeNote(objects.revisions.filter(r => r.noteId === noteId), noteId).current));
        for (const noteId of deleted)
            set(`notes/deleted/${noteId}.json`, deletionData(noteId));
        set('notes/manifest.json', manifest(objects, moduleVersion(objects)));
        if (deleted.length)
            for (const path of snapshot.entries.keys())
                if (/^notes\/(documents|revisions|sources|assets|attachments)\//.test(path) && snapshot.entries.get(path)?.type !== 'tree' && !retained.has(path))
                    files.set(path, null);
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
