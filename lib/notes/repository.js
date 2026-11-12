import { conflictForkId, conflictRevisions, revisionContent } from './conflicts.js';
import { join, resolve } from 'node:path';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { NotebookError } from '../domain/errors.js';
import { ulid } from '../domain/id.js';
import { NOTE_LIMITS } from './types.js';
import { canonical, digest, fail, hash, id, normalizeContent, object, keys, sortedStrings, assetId, text } from './validation.js';
import { createNoteRevision, validateNoteRevision, mergeNoteRevisions, materializeNote, createNotebookRevision, validateNotebookRevision, mergeNotebookRevisions, materializeNotebook, topologicalOrder } from './revisions.js';
import { parseNoteMarkdown, serializeNoteMarkdown, NOTE_METADATA_BYTES } from './markdown.js';
import { NoteFiles, missing, safePath, utf8 } from './files.js';
import { checkReferences, sourceAttachments, sourceBytes, validateAsset, mediaTypeFor } from './assets.js';
import { searchNotes } from './search.js';
import { activeNotebook, defaultNotebook, DEFAULT_NOTEBOOK_ID, DEFAULT_NOTEBOOK_TIME, sameNamedNotebook, NOTEBOOK_NAME_TAKEN } from './notebooks.js';
import { deletionIds, deletionData, readDeletion, moduleVersion } from './deletion.js';
import { attachment } from './validation.js';
import { ATTACHMENT_LIMIT } from '../contracts/notes.js';
import { linkedNotes, fillTemplate } from './relations.js';
import { DraftFiles } from './drafts.js';
const queues = new Map();
const conflict = () => { throw new NotebookError('note_conflict', '笔记已有新版本，请重新读取或明确解决冲突', 409); };
const same = (a, b) => canonical([...a].sort()) === canonical([...b].sort());
const notePath = (r) => `revisions/${r.noteId}/${r.revision}.json`;
const notebookPath = (r) => `notebooks/${r.notebookId}/${r.revision}.json`;
/** One queue per local directory. Parent application owns the cross-process single-writer lease. */
export class NoteRepository {
    files;
    editGuard = () => { };
    coordinate(work) { return this.run(async () => work()); }
    changeGeneration = 0;
    get generation() { return this.changeGeneration; }
    changeListeners = new Set();
    onChange(listener) { this.changeListeners.add(listener); return () => { this.changeListeners.delete(listener); }; }
    now;
    validated;
    checkedRows = new Map();
    sourceSessions = new Map();
    writeEpoch = 0;
    get drafts() { return new DraftFiles(resolve(this.files.root, '../local-drafts')); }
    constructor(directory, options = {}) {
        this.files = new NoteFiles(resolve(join(directory, 'notes')), async (path) => { this.validated = undefined; this.writeEpoch++; await options.beforeWrite?.(path); if (/^(revisions|notebooks|deleted)\//.test(path)) {
            this.changeGeneration++;
            this.changeListeners.forEach(listener => listener());
        } });
        this.now = options.now ?? Date.now;
    }
    /** Only before admitting any client operations, during setup or host startup. */
    useDirectory(directory) {
        this.validated = undefined;
        this.checkedRows.clear();
        this.sourceSessions.clear();
        this.files = new NoteFiles(resolve(directory, 'notes'), this.files.beforeWrite);
    }
    run(work, signal) {
        const result = (queues.get(this.files.root) ?? Promise.resolve()).then(() => { signal?.throwIfAborted(); return work(); });
        const tail = result.catch(() => { this.validated = undefined; });
        queues.set(this.files.root, tail);
        void tail.finally(() => { if (queues.get(this.files.root) === tail)
            queues.delete(this.files.root); });
        return result;
    }
    view(state, noteId) {
        if (state.deleted?.includes(noteId))
            fail('note_deleted', '这篇笔记已彻底删除');
        const view = materializeNote(state.revisions.filter(r => r.noteId === noteId), noteId);
        const notebookId = view.current.notebookId;
        if (notebookId !== null) {
            const rows = state.notebooks.filter(r => r.notebookId === notebookId);
            if (!rows.length || state.blocked.has(notebookId))
                view.effectiveNotebookId = null;
            else {
                const book = materializeNotebook(rows, notebookId);
                if ([book.current, ...book.conflicts].some(r => r.status === 'trashed'))
                    view.effectiveNotebookId = null;
            }
        }
        if (view.effectiveNotebookId === null)
            view.effectiveNotebookId = this.defaultBook(state)?.notebookId ?? null;
        return view;
    }
    notebook(state, notebookId) { return materializeNotebook(state.notebooks.filter(r => r.notebookId === notebookId), notebookId); }
    books(state) { return [...new Set(state.notebooks.map(r => r.notebookId))].sort().map(n => this.notebook(state, n)); }
    defaultBook(state) { return defaultNotebook(this.books(state)); }
    async ensureNotebooks(state) {
        if (state.issues.length)
            return;
        const books = this.books(state), seed = books.find(b => b.notebookId === DEFAULT_NOTEBOOK_ID);
        if ((!seed && !books.some(b => b.current.defaultSelectedAt)) || !this.defaultBook(state)) {
            const row = createNotebookRevision({ version: 1, notebookId: DEFAULT_NOTEBOOK_ID, title: seed?.current.title ?? '默认笔记本', status: 'active',
                parents: seed?.heads ?? [], recordedAt: seed?.current.recordedAt ?? DEFAULT_NOTEBOOK_TIME, defaultSelectedAt: DEFAULT_NOTEBOOK_TIME });
            state.notebooks = mergeNotebookRevisions(state.notebooks, [row]);
            await this.files.write(notebookPath(row), canonical(row), true);
            await this.manifest(state);
        }
        // Assign legacy unfiled notes once, retaining their order and all original content.
        for (const noteId of new Set(state.revisions.map(r => r.noteId))) {
            const view = this.view(state, noteId);
            if (view.heads.length !== 1 || view.current.notebookId !== null)
                continue;
            await this.external(state, noteId);
            const latest = this.view(state, noteId);
            if (latest.heads.length !== 1 || latest.current.notebookId !== null)
                continue;
            const { revision: _revision, ...data } = latest.current;
            await this.append(state, createNoteRevision({ ...data, parents: latest.heads, notebookId: this.defaultBook(state).notebookId }));
        }
    }
    async load() {
        const listing = await this.files.scan(), epoch = this.writeEpoch;
        if (this.validated?.fingerprint === listing.fingerprint)
            return structuredClone(this.validated.state);
        this.validated = undefined;
        const state = { version: 1, revisions: [], notebooks: [], issues: [], blocked: new Set(), detachedRevisions: [], detachedNotebooks: [], acknowledgedPaths: [] };
        const paths = listing.paths;
        for (const path of this.checkedRows.keys())
            if (!listing.stamps.has(path))
                this.checkedRows.delete(path);
        state.deleted = [];
        for (const path of paths.filter(p => p.startsWith('deleted/'))) {
            const noteId = readDeletion(JSON.parse(utf8(await this.files.read(path, 1024))));
            if (path !== `deleted/${noteId}.json`)
                fail('note_path');
            state.deleted.push(noteId);
        }
        // Future module formats must never be silently reinitialized.
        if (paths.includes('manifest.json')) {
            let manifest;
            try {
                manifest = JSON.parse(utf8(await this.files.read('manifest.json')));
                const v = object(manifest);
                if (v.version !== undefined && ![1, 2, 3, 4].includes(v.version))
                    fail('note_version', '笔记模块版本不支持，已暂停写入');
                if (Object.keys(v).some(k => !['version', 'notes', 'notebooks', 'revision', 'deleted'].includes(k)))
                    fail('note_schema');
                const { revision, ...data } = v;
                if (![1, 2, 3, 4].includes(v.version) || !Array.isArray(v.notes) || !Array.isArray(v.notebooks) || revision !== digest(canonical(data)))
                    fail('note_manifest');
                if (deletionIds(v.deleted).some(n => !state.deleted.includes(n)))
                    fail('note_deleted_missing', '删除记录缺失，已暂停操作');
                const claims = [];
                for (const [rows, field, directory] of [[v.notes, 'noteId', 'revisions'], [v.notebooks, 'notebookId', 'notebooks']]) {
                    const identities = new Set();
                    for (const raw of rows) {
                        const entry = object(raw);
                        keys(entry, [field, 'heads']);
                        const identity = id(entry[field]), heads = sortedStrings(entry.heads, NOTE_LIMITS.revisions, hash);
                        if (!heads.length || identities.has(identity))
                            fail('note_manifest');
                        identities.add(identity);
                        if (directory !== 'revisions' || !state.deleted.includes(identity))
                            claims.push(...heads.map(head => `${directory}/${identity}/${head}.json`));
                    }
                }
                state.acknowledgedPaths = claims;
            }
            catch (e) {
                if (e instanceof NotebookError && ['note_version', 'note_schema', 'note_deleted_missing'].includes(e.code))
                    throw e;
                if (!(e instanceof SyntaxError || e instanceof NotebookError))
                    throw e;
                state.issues.push({ path: 'manifest.json', code: 'note_manifest' });
            }
        }
        for (const path of paths) {
            if (!path.startsWith('revisions/') && !path.startsWith('notebooks/'))
                continue;
            if (path.startsWith('revisions/') && state.deleted.includes(path.split('/')[1]))
                continue;
            if (path.split('/').at(-1)?.startsWith('.tmp-'))
                continue;
            try {
                const cached = this.checkedRows.get(path);
                if (cached && [...cached.stamps].every(([p, stamp]) => listing.stamps.get(p) === stamp)) {
                    if (path.startsWith('revisions/'))
                        state.revisions.push(structuredClone(cached.row));
                    else
                        state.notebooks.push(structuredClone(cached.row));
                    continue;
                }
                this.checkedRows.delete(path);
                const value = JSON.parse(utf8(await this.files.read(path, NOTE_LIMITS.body * 6 + NOTE_METADATA_BYTES)));
                let row, references = [];
                if (path.startsWith('revisions/')) {
                    row = validateNoteRevision(value);
                    if (path !== notePath(row))
                        fail('note_path');
                    references = await checkReferences(this.files, row);
                    state.revisions.push(row);
                }
                else {
                    row = validateNotebookRevision(value);
                    if (path !== notebookPath(row))
                        fail('note_path');
                    state.notebooks.push(row);
                }
                const dependencies = [path, ...references];
                if (dependencies.every(p => listing.stamps.has(p)))
                    this.checkedRows.set(path, { row: structuredClone(row), stamps: new Map(dependencies.map(p => [p, listing.stamps.get(p)])) });
            }
            catch (e) {
                if (!(e instanceof NotebookError || e instanceof SyntaxError || missing(e)))
                    throw e;
                state.issues.push({ path, code: e instanceof NotebookError ? e.code : 'note_corrupt' });
                state.blocked.add(path.split('/')[1] ?? '');
            }
        }
        // A corrupt ancestor quarantines its descendants logically, without moving/deleting bytes.
        const prune = (rows, identity, path) => {
            let remaining = rows;
            for (;;) {
                const byHash = new Map(remaining.map(r => [r.revision, r]));
                const next = remaining.filter(r => {
                    const valid = r.parents.every(p => byHash.has(p) && identity(byHash.get(p)) === identity(r));
                    if (!valid) {
                        state.issues.push({ path: path(r), code: 'note_parent' });
                        state.blocked.add(identity(r));
                    }
                    return valid;
                });
                if (next.length === remaining.length)
                    return next;
                remaining = next;
            }
        };
        const allRevisions = state.revisions, allNotebooks = state.notebooks;
        state.revisions = mergeNoteRevisions(prune(allRevisions, r => r.noteId, notePath), []);
        state.notebooks = mergeNotebookRevisions(prune(allNotebooks, r => r.notebookId, notebookPath), []);
        const available = new Set([...state.revisions.map(notePath), ...state.notebooks.map(notebookPath)]);
        state.detachedRevisions = allRevisions.filter(r => !available.has(notePath(r)));
        state.detachedNotebooks = allNotebooks.filter(r => !available.has(notebookPath(r)));
        for (const path of state.acknowledgedPaths)
            if (!available.has(path)) {
                state.issues.push({ path, code: 'note_missing' });
                state.blocked.add(path.split('/')[1]);
            }
        this.limits(state);
        if (state.deleted.length && !state.issues.length)
            await this.cleanDeleted(state, paths);
        await this.ensureNotebooks(state);
        // Never retain an interrupted/migrated/externally changing graph. Return a separate
        // copy so callers and write operations cannot mutate the cached validation result.
        if (!state.issues.length && epoch === this.writeEpoch && (await this.files.scan()).fingerprint === listing.fingerprint)
            this.validated = { fingerprint: listing.fingerprint, state: structuredClone(state) };
        return state;
    }
    limits(state) {
        if (state.revisions.length + state.notebooks.length > NOTE_LIMITS.revisions || new Set(state.revisions.map(r => r.noteId)).size > NOTE_LIMITS.notes)
            fail('note_limit');
    }
    writable(state, identity) { if (state.deleted?.includes(identity))
        fail('note_deleted', '这篇笔记已彻底删除'); if (state.blocked.has(identity))
        fail('note_corrupt', '该笔记有损坏修订，原件已隔离保留，请先恢复'); }
    complete(state) {
        if (state.issues.some(issue => issue.code === 'note_missing'))
            fail('note_corrupt', '已确认保存的修订缺失或不可用，原清单已保留，请先恢复');
    }
    localMembership(state, content) {
        if (content.notebookId === null)
            return { ...content, notebookId: this.defaultBook(state)?.notebookId ?? null };
        this.writable(state, content.notebookId);
        const book = this.notebook(state, content.notebookId);
        return !activeNotebook(book) ? { ...content, notebookId: this.defaultBook(state)?.notebookId ?? null } : content;
    }
    async verifyNotebook(state, content) {
        if (content.notebookId !== null) {
            const view = this.notebook(state, content.notebookId);
            if ([view.current, ...view.conflicts].some(r => r.status !== 'active'))
                fail('notebook_trashed');
        }
        await checkReferences(this.files, content);
    }
    async manifest(state) {
        this.complete(state);
        if (state.issues.some(i => i.path === 'manifest.json')) {
            const bytes = await this.files.read('manifest.json');
            await this.files.write(`quarantine/${digest(bytes)}.bin`, bytes, true);
        }
        const notes = [...new Set(state.revisions.map(r => r.noteId))].sort().map(noteId => ({ noteId, heads: this.view(state, noteId).heads }));
        const notebooks = [...new Set(state.notebooks.map(r => r.notebookId))].sort().map(notebookId => ({ notebookId, heads: this.notebook(state, notebookId).heads }));
        const data = { version: moduleVersion(state), notes, notebooks, ...(state.deleted?.length ? { deleted: [...state.deleted].sort() } : {}) };
        await this.files.write('manifest.json', canonical({ ...data, revision: digest(canonical(data)) }), false);
    }
    async document(state, noteId) {
        await this.files.write(`documents/${noteId}.md`, serializeNoteMarkdown(this.view(state, noteId).current), false);
    }
    async external(state, noteId, markdown) {
        const path = `documents/${noteId}.md`, bytes = markdown === undefined ? await this.files.read(path, NOTE_LIMITS.body + NOTE_METADATA_BYTES).catch(e => { if (missing(e))
            return null; throw e; }) : Buffer.from(markdown);
        if (!bytes)
            return;
        const parsed = parseNoteMarkdown(utf8(bytes));
        if (parsed.revision.noteId !== noteId)
            fail('note_path');
        const base = state.revisions.find(r => r.noteId === noteId && r.revision === parsed.declaredRevision);
        if (!base)
            fail('note_parent');
        if (!parsed.changed)
            return;
        this.complete(state);
        // External metadata may change content, but cannot rewrite ancestry/timestamps.
        if (!same(parsed.revision.parents, base.parents) || parsed.revision.recordedAt !== base.recordedAt)
            fail('note_frontmatter');
        const { revision: _revision, ...raw } = parsed.revision;
        const contentOf = (r) => { const { revision: _h, recordedAt: _t, ...data } = r; return canonical(data); };
        let row = createNoteRevision(this.localMembership(state, { ...raw, parents: [base.revision], recordedAt: new Date(this.now()).toISOString() }));
        row = state.revisions.find(r => r.noteId === noteId && contentOf(r) === contentOf(row)) ?? row;
        await this.verifyNotebook(state, row);
        const next = mergeNoteRevisions(state.revisions, [row]);
        this.limits({ ...state, revisions: next });
        await this.files.write(notePath(row), canonical(row), true);
        state.revisions = next;
        await this.document(state, noteId);
        await this.manifest(state);
    }
    async append(state, row, beforeAppend) {
        this.complete(state);
        const { revision: _revision, ...data } = row;
        row = createNoteRevision(this.localMembership(state, data));
        this.writable(state, row.noteId);
        await this.verifyNotebook(state, row);
        const next = mergeNoteRevisions(state.revisions, [row]);
        this.limits({ ...state, revisions: next });
        // Final membership normalization and the caller's durable identity share
        // this repository queue turn. Nothing can change membership between them.
        await beforeAppend?.(structuredClone(row));
        await this.files.write(notePath(row), canonical(row), true);
        state.revisions = next;
        await this.document(state, row.noteId);
        await this.manifest(state);
        return this.view(state, row.noteId);
    }
    async list(options = {}, signal) {
        const input = structuredClone(options);
        return this.run(async () => {
            const s = await this.load();
            let views = [...new Set(s.revisions.map(r => r.noteId))].map(n => this.view(s, n));
            if (input.sessionId) {
                text(input.sessionId, 512);
                const origins = this.sourceSessions;
                for (const sourceId of new Set(views.flatMap(v => v.current.sourceId ? [v.current.sourceId] : []))) {
                    signal?.throwIfAborted();
                    if (!origins.has(sourceId)) {
                        const source = object(JSON.parse(utf8(await this.files.read(`sources/${sourceId}.json`, NOTE_LIMITS.source))));
                        if (origins.size >= 10000)
                            origins.clear();
                        origins.set(sourceId, String(source.sessionId ?? ''));
                    }
                }
                const relation = (v) => v.current.sourceId && origins.get(v.current.sourceId) === input.sessionId ? 'source' : v.current.sessionLinks?.includes(input.sessionId) ? 'manual' : null;
                views = views.filter(v => v.current.status === 'active' && !v.current.isTemplate && (input.relation === 'browse' || (input.relation === 'source' ? relation(v) === 'source' : !!relation(v))));
                const page = searchNotes(views, input), byId = new Map(views.map(v => [v.noteId, v]));
                return { ...page, items: page.items.map(item => ({ ...item, sessionRelation: relation(byId.get(item.noteId)) })) };
            }
            return searchNotes(views, input);
        }, signal);
    }
    async associate(noteId, heads, sessionId, linked, signal) {
        id(noteId);
        text(sessionId, 512);
        if (!sessionId.trim())
            fail('note_schema');
        return this.run(async () => {
            this.editGuard([noteId]);
            const state = await this.load();
            this.complete(state);
            this.writable(state, noteId);
            await this.external(state, noteId);
            const view = this.view(state, noteId);
            if (!same(view.heads, heads) || view.conflicts.length)
                conflict();
            if (view.current.status !== 'active' || view.current.isTemplate)
                fail('note_trashed');
            const links = new Set(view.current.sessionLinks ?? []);
            if (linked)
                links.add(sessionId);
            else
                links.delete(sessionId);
            const content = normalizeContent({ ...revisionContent(view.current), sessionLinks: [...links] });
            if (canonical(content) === canonical(revisionContent(view.current)))
                return view;
            return this.append(state, createNoteRevision({ version: 1, noteId, parents: view.heads, recordedAt: new Date(this.now()).toISOString(), ...content }));
        }, signal);
    }
    async get(noteId, signal) {
        id(noteId);
        return this.run(async () => { const s = await this.load(); this.writable(s, noteId); await this.external(s, noteId); return this.view(s, noteId); }, signal);
    }
    async getRevision(noteId, revision, signal) {
        id(noteId);
        hash(revision);
        return this.run(async () => {
            const s = await this.load(), row = s.revisions.find(r => r.noteId === noteId && r.revision === revision);
            if (!row)
                fail('note_not_found', '笔记修订不存在或已损坏');
            return row;
        }, signal);
    }
    async history(noteId, cursor, signal) {
        id(noteId);
        if (cursor)
            hash(cursor);
        return this.run(async () => {
            const state = await this.load();
            this.writable(state, noteId);
            this.view(state, noteId);
            const rows = state.revisions.filter(r => r.noteId === noteId).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt) || b.revision.localeCompare(a.revision));
            const start = cursor ? rows.findIndex(r => r.revision === cursor) + 1 : 0, page = rows.slice(start, start + 30);
            return { items: page.map(({ revision, recordedAt, title, summary, status }) => ({ revision, recordedAt, title, summary, status })), cursor: rows.length > start + 30 ? page.at(-1).revision : null };
        }, signal);
    }
    async catalog(signal) {
        return this.run(async () => {
            const state = await this.load(), tags = new Map();
            for (const noteId of new Set(state.revisions.map(r => r.noteId))) {
                const row = this.view(state, noteId).current;
                if (row.status === 'active' && !row.isTemplate)
                    row.tags.forEach(tag => tags.set(tag, (tags.get(tag) ?? 0) + 1));
            }
            return { tags: [...tags].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)) };
        }, signal);
    }
    async backlinks(noteId, signal) {
        id(noteId);
        return this.run(async () => {
            const state = await this.load();
            this.view(state, noteId);
            const views = [...new Set(state.revisions.map(r => r.noteId))].map(n => this.view(state, n))
                .filter(v => v.noteId !== noteId && v.current.status === 'active' && !v.current.isTemplate && linkedNotes(v.current.body).has(noteId));
            return searchNotes(views, { order: 'recent', limit: 100 }).items;
        }, signal);
    }
    /** All selected heads/leases and resulting content are checked before the first write. */
    async manage(request, signal) {
        const v = object(request), actions = ['rename', 'favorite', 'unfavorite', 'move', 'add-tags', 'remove-tags', 'duplicate', 'template', 'instantiate', 'revision', 'revision-copy'];
        if (!actions.includes(String(v.action)) || !Array.isArray(v.notes) || !v.notes.length || v.notes.length > NOTE_LIMITS.notes)
            fail('note_schema');
        const selected = v.notes.map(raw => { const n = object(raw); keys(n, ['noteId', 'expectedHeads']); return { noteId: id(n.noteId), expectedHeads: sortedStrings(n.expectedHeads, NOTE_LIMITS.revisions, hash) }; });
        if (new Set(selected.map(n => n.noteId)).size !== selected.length)
            fail('note_schema');
        const action = request.action, copy = ['duplicate', 'template', 'instantiate', 'revision-copy'].includes(action), single = copy || action === 'revision' || action === 'rename';
        if (single && selected.length !== 1)
            fail('note_schema');
        const target = copy ? id(v.targetId) : undefined;
        const notebookId = action === 'move' || v.notebookId !== undefined ? id(v.notebookId) : undefined;
        const tags = ['add-tags', 'remove-tags'].includes(action) ? sortedStrings(v.tags, 50, t => { const value = text(t, 200).trim(); if (!value)
            fail(); return value; }) : [];
        const revision = action.startsWith('revision') ? hash(v.revision) : undefined;
        const title = v.title === undefined ? undefined : text(v.title, 1200).trim();
        if (action === 'rename' && !title)
            fail('note_schema');
        const date = action === 'instantiate' ? text(v.date, 10) : '';
        if (action === 'instantiate' && !/^\d{4}-\d{2}-\d{2}$/.test(date))
            fail('note_date');
        return this.run(async () => {
            this.editGuard([...selected.map(n => n.noteId), ...(target ? [target] : [])]);
            const state = await this.load();
            this.complete(state);
            if (state.issues.length)
                fail('note_corrupt');
            if (notebookId && !activeNotebook(this.notebook(state, notebookId)))
                fail('notebook_trashed', '目标笔记本已被移除，请重新选择');
            if (target && (state.deleted?.includes(target) || state.revisions.some(r => r.noteId === target)))
                fail('note_conflict', '副本已存在，请刷新笔记库核对');
            const rows = [];
            for (const item of selected) {
                this.writable(state, item.noteId);
                await this.external(state, item.noteId);
                const view = this.view(state, item.noteId), current = view.current;
                if (!same(view.heads, item.expectedHeads) || view.conflicts.length)
                    conflict();
                if (current.status !== 'active')
                    fail('note_trashed', '请先恢复回收站中的笔记');
                const old = revision ? state.revisions.find(r => r.noteId === item.noteId && r.revision === revision) : current;
                if (!old)
                    fail('note_not_found', '历史版本不存在');
                let content = { ...revisionContent(old), notebookId: notebookId ?? (revision ? old.notebookId : view.effectiveNotebookId), status: 'active' };
                if (revision) {
                    delete content.sessionLinks;
                    content = { ...content, sourceId: current.sourceId, ...(current.sessionLinks !== undefined ? { sessionLinks: current.sessionLinks } : {}), ...(current.favorite !== undefined ? { favorite: current.favorite } : {}), ...(current.isTemplate !== undefined ? { isTemplate: current.isTemplate } : {}) };
                }
                if (action === 'rename')
                    content.title = title;
                if (action === 'favorite' || action === 'unfavorite')
                    content.favorite = action === 'favorite';
                if (action === 'add-tags')
                    content.tags = [...new Set([...current.tags, ...tags])];
                if (action === 'remove-tags')
                    content.tags = current.tags.filter(t => !tags.includes(t));
                if (copy) {
                    delete content.originPath;
                    delete content.favorite;
                    delete content.sessionLinks;
                    content.isTemplate = action === 'template';
                    const suffix = `（${action === 'template' ? '模板' : '副本'}）`, chars = Array.from(old.title);
                    while (Buffer.byteLength(chars.join('') + suffix) > 1200)
                        chars.pop();
                    content.title = title || chars.join('') + suffix;
                }
                if (action === 'template')
                    content.sourceId = null;
                if (action === 'instantiate') {
                    if (!current.isTemplate)
                        fail('note_schema');
                    content.title = title || current.title;
                    content.body = fillTemplate(content.body, content.title, date);
                    content.summary = fillTemplate(content.summary, content.title, date);
                    content.sourceId = null;
                }
                content = normalizeContent(this.localMembership(state, content));
                await checkReferences(this.files, content);
                await this.verifyNotebook(state, content);
                rows.push(createNoteRevision({ version: 1, noteId: target ?? item.noteId, parents: target ? [] : view.heads, recordedAt: new Date(this.now()).toISOString(), ...content }));
            }
            let note;
            for (const row of rows)
                note = await this.append(state, row);
            return { completed: rows.map(r => r.noteId), ...(single && note ? { note } : {}) };
        }, signal);
    }
    async save(input, signal, keepBoth = false) {
        const v = object(input);
        if (Object.keys(v).some(k => !['noteId', 'expectedHeads', 'content'].includes(k)))
            fail('note_schema');
        const noteId = input.noteId === undefined ? ulid(this.now()) : id(input.noteId), rawContent = normalizeContent(input.content), expected = sortedStrings(input.expectedHeads, NOTE_LIMITS.revisions, hash);
        return this.run(() => this.saveContent(noteId, expected, rawContent, keepBoth), signal);
    }
    async saveContent(noteId, expected, rawContent, keepBoth, deduplicate = false) {
        this.editGuard([noteId]);
        const s = await this.load();
        this.writable(s, noteId);
        await this.external(s, noteId);
        const content = this.localMembership(s, rawContent);
        const exists = s.revisions.some(r => r.noteId === noteId), heads = exists ? this.view(s, noteId).heads : [];
        if (exists)
            this.editGuard([noteId], true);
        if (deduplicate && exists && canonical(revisionContent(this.view(s, noteId).current)) === canonical(content))
            return this.view(s, noteId);
        if (!same(expected, heads) || heads.length > 1) {
            const base = expected.length === 1 && s.revisions.find(r => r.noteId === noteId && r.revision === expected[0]);
            if (!keepBoth || !base || !exists)
                return conflict();
            const previous = s.revisions.find(row => row.noteId === noteId && same(row.parents, expected) && canonical(revisionContent(row)) === canonical(content));
            if (previous) {
                const forkId = conflictForkId(previous);
                return this.view(s, s.revisions.some(row => row.noteId === forkId) ? forkId : noteId);
            }
            // Identical retries of the same stale edit produce the same branch.
            const branch = createNoteRevision({ version: 1, noteId, parents: expected, recordedAt: base.recordedAt, ...content });
            if (!s.revisions.some(r => r.revision === branch.revision))
                await this.append(s, branch);
            await this.splitConflicts(s);
            const forkId = conflictForkId(branch);
            return this.view(s, s.revisions.some(row => row.noteId === forkId) ? forkId : noteId);
        }
        return this.append(s, createNoteRevision({ version: 1, noteId, parents: heads, recordedAt: new Date(this.now()).toISOString(), ...content }));
    }
    /** Serialized with formal writes; the local journal never increments the sync generation. */
    draft(input) {
        return this.run(async () => {
            const v = object(input), editId = id(v.editId), action = v.action;
            if (!['save', 'finish', 'discard'].includes(String(action)))
                fail('note_schema');
            const raw = action === 'discard' ? null : object(v.request), noteId = id(raw?.noteId ?? v.noteId);
            this.editGuard([noteId], true);
            let row = await this.drafts.read(editId);
            if (row && row.noteId !== noteId)
                fail('note_draft_invalid');
            if (action === 'discard') {
                if (row?.state === 'finished')
                    fail('note_draft_finished', '本次编辑已经完成，请重新打开笔记');
                row = { editId, noteId, sequence: row?.sequence ?? 0, state: 'discarded', files: row?.files ?? [] };
                await this.drafts.write(row);
                await this.cleanupDraft(row);
                return { ok: true, state: 'discarded', note: null };
            }
            if (!Number.isSafeInteger(v.sequence) || Number(v.sequence) < 0)
                fail('note_schema');
            const sequence = Number(v.sequence), request = { noteId, expectedHeads: sortedStrings(raw.expectedHeads, 100000, hash), content: normalizeContent(raw.content) };
            if (row?.state === 'discarded')
                return { ok: true, state: 'discarded', note: null };
            if (row?.state === 'finished' && sequence <= row.sequence)
                return { ok: true, state: 'finished', note: row.resultId ? await this.draftView(row.resultId) : null };
            if (row?.state === 'finished')
                request.expectedHeads = row.resultHeads ?? request.expectedHeads;
            // A newer browser checkpoint after a crash may contain keystrokes not delivered to the host.
            const other = (await this.drafts.list()).some(d => d.noteId === noteId && d.editId !== editId && d.state === 'editing');
            if (other)
                fail('note_edit_busy', '这篇笔记还有未完成的本机草稿，请重新打开插件恢复');
            if (!row || row.state === 'finished' || sequence > row.sequence) {
                if (row?.state === 'editing' && !same(row.request.expectedHeads, request.expectedHeads))
                    fail('note_draft_invalid');
                row = { editId, noteId, sequence, state: 'editing', request, files: row?.files ?? [] };
                await this.drafts.write(row);
            }
            if (action === 'save')
                return { ok: true, state: 'editing', note: null };
            return this.finishDraft(row);
        });
    }
    async draftView(noteId) { const s = await this.load(); return s.revisions.some(r => r.noteId === noteId) && !s.deleted?.includes(noteId) ? this.view(s, noteId) : null; }
    async finishDraft(row) {
        const request = row.request, c = request.content;
        const empty = !request.expectedHeads.length && (!c.title.trim() || c.title === '无标题') && !c.body.trim() && !c.summary.trim() && !c.tags.length && !c.assetIds.length && !c.attachments?.length;
        const note = empty ? null : await this.saveContent(row.noteId, request.expectedHeads, c, true, true);
        row = { editId: row.editId, noteId: row.noteId, sequence: row.sequence, state: 'finished', files: row.files, ...(note ? { resultId: note.noteId, resultHeads: note.heads } : {}) };
        await this.drafts.write(row);
        await this.cleanupDraft(row);
        return { ok: true, state: 'finished', note };
    }
    async recoverDrafts() {
        return this.run(async () => {
            const recovered = [], failed = [];
            for (const row of await this.drafts.list(true)) {
                try {
                    if (row.state === 'editing') {
                        const result = await this.finishDraft(row);
                        if (result.note)
                            recovered.push(result.note.noteId);
                    }
                    else if (row.files.length)
                        await this.cleanupDraft(row);
                }
                catch {
                    failed.push(row.noteId);
                }
            }
            return { ok: true, recovered, failed };
        });
    }
    async pinDraftFile(noteId, path) {
        if (!noteId)
            return;
        for (const row of await this.drafts.list())
            if (row.noteId === noteId && row.state === 'editing' && !row.files.includes(path)) {
                row.files.push(path);
                await this.drafts.write(row);
            }
    }
    async retainedFiles(state) {
        const retained = new Set();
        for (const row of state.revisions) {
            row.assetIds.forEach(a => retained.add('assets/' + a));
            row.attachments?.forEach(a => retained.add('attachments/' + a.id + '.bin'));
            if (row.sourceId) {
                const source = object(JSON.parse(utf8(await this.files.read('sources/' + row.sourceId + '.json'))));
                sourceAttachments(source).forEach(a => retained.add('attachments/' + a.id + '.bin'));
                if (source.assets)
                    Object.values(object(source.assets)).forEach(a => retained.add('assets/' + assetId(a)));
            }
        }
        for (const row of await this.drafts.list())
            if (row.state === 'editing') {
                row.files.forEach(p => retained.add(p));
                row.request?.content.assetIds.forEach(a => retained.add('assets/' + a));
                row.request?.content.attachments?.forEach(a => retained.add('attachments/' + a.id + '.bin'));
            }
        return retained;
    }
    async cleanupDraft(row) {
        if (!row.files.length)
            return;
        const state = await this.load();
        this.complete(state);
        if (state.issues.length)
            fail('note_corrupt');
        const retained = await this.retainedFiles(state);
        for (const path of row.files)
            if (!retained.has(path))
                await this.files.remove(path);
        await this.drafts.write({ ...row, files: [] });
    }
    /** A journaled AI adoption has a stable revision even if its receipt is lost. */
    async adoptRevision(input, persist, signal) {
        const row = validateNoteRevision(input);
        return this.run(async () => {
            this.editGuard([row.noteId]);
            const state = await this.load();
            this.writable(state, row.noteId);
            await this.external(state, row.noteId);
            if (state.revisions.some(r => r.revision === row.revision)) {
                await this.document(state, row.noteId);
                await this.manifest(state);
                return this.view(state, row.noteId);
            }
            const view = this.view(state, row.noteId);
            if (view.heads.length !== 1 || !same(view.heads, row.parents))
                conflict();
            return this.append(state, row, persist);
        }, signal);
    }
    async setStatus(noteId, expectedHeads, status, signal) {
        id(noteId);
        const expected = sortedStrings(expectedHeads, NOTE_LIMITS.revisions, hash);
        return this.run(async () => {
            this.editGuard([noteId]);
            const s = await this.load();
            this.writable(s, noteId);
            await this.external(s, noteId);
            const view = this.view(s, noteId);
            if (!same(view.heads, expected) || view.heads.length > 1)
                conflict();
            const { revision: _revision, ...data } = view.current;
            return this.append(s, createNoteRevision({ ...data, notebookId: view.effectiveNotebookId, parents: view.heads, status, recordedAt: new Date(this.now()).toISOString() }));
        }, signal);
    }
    async trash(noteId, expectedHeads, signal) { return this.setStatus(noteId, expectedHeads, 'trashed', signal); }
    async restore(noteId, expectedHeads, signal) { return this.setStatus(noteId, expectedHeads, 'active', signal); }
    async resolve(noteId, expectedHeads, content, signal) {
        id(noteId);
        const expected = sortedStrings(expectedHeads, NOTE_LIMITS.revisions, hash), normalized = normalizeContent(content);
        return this.run(async () => {
            this.editGuard([noteId]);
            const s = await this.load();
            this.writable(s, noteId);
            await this.external(s, noteId);
            const view = this.view(s, noteId);
            if (!same(view.heads, expected))
                conflict();
            return this.append(s, createNoteRevision({ version: 1, noteId, parents: view.heads, recordedAt: new Date(this.now()).toISOString(), ...normalized }));
        }, signal);
    }
    async putAsset(bytes, mediaType, signal, noteId) {
        const copy = Buffer.from(bytes), metadata = validateAsset(copy, mediaType);
        return this.run(async () => { this.editGuard(noteId ? [noteId] : []); const state = await this.load(); await this.manifest(state); await this.pinDraftFile(noteId, `assets/${metadata.id}`); await this.files.write(`assets/${metadata.id}`, copy, true); return metadata; }, signal);
    }
    async getAsset(asset, signal) {
        assetId(asset);
        return this.run(async () => { const bytes = await this.files.read(`assets/${asset}`, NOTE_LIMITS.image); if (validateAsset(bytes, mediaTypeFor(asset)).id !== asset)
            fail('note_hash'); return bytes; }, signal);
    }
    async putAttachment(bytes, name, signal, noteId) {
        const copy = Buffer.from(bytes), metadata = attachment({ id: digest(copy), name, bytes: copy.length });
        return this.run(async () => { this.editGuard(noteId ? [noteId] : []); const state = await this.load(); await this.manifest(state); await this.pinDraftFile(noteId, `attachments/${metadata.id}.bin`); await this.files.write(`attachments/${metadata.id}.bin`, copy, true); return metadata; }, signal);
    }
    async getAttachment(fileId, signal) {
        hash(fileId);
        return this.run(async () => { const bytes = await this.files.read(`attachments/${fileId}.bin`, ATTACHMENT_LIMIT); if (digest(bytes) !== fileId)
            fail('note_hash'); return bytes; }, signal);
    }
    /** Validate the entire selection before deleting anything. New remote edits require a fresh confirmation. */
    async batch(selection, action, signal) {
        if (!Array.isArray(selection) || !selection.length || selection.length > NOTE_LIMITS.notes || !['trash', 'restore', 'purge'].includes(action))
            fail('note_schema');
        const selected = selection.map(raw => { const v = object(raw); keys(v, ['noteId', 'expectedHeads']); return { noteId: id(v.noteId), expectedHeads: sortedStrings(v.expectedHeads, NOTE_LIMITS.revisions, hash) }; });
        if (new Set(selected.map(n => n.noteId)).size !== selected.length)
            fail('note_schema');
        return this.run(async () => {
            this.editGuard(selected.map(n => n.noteId));
            const s = await this.load();
            this.complete(s);
            if (s.issues.length)
                fail('note_corrupt');
            for (const item of selected) {
                this.writable(s, item.noteId);
                await this.external(s, item.noteId);
                const view = this.view(s, item.noteId);
                if (!same(view.heads, item.expectedHeads) || view.conflicts.length)
                    conflict();
                if (action !== 'trash' && view.current.status !== 'trashed')
                    fail('note_not_trashed', '只能从回收站彻底删除或恢复');
            }
            for (const item of selected) {
                if (action === 'purge') {
                    await this.files.write(`deleted/${item.noteId}.json`, deletionData(item.noteId), true);
                    s.deleted = [...new Set([...(s.deleted ?? []), item.noteId])].sort();
                }
                else {
                    const view = this.view(s, item.noteId), { revision: _revision, ...data } = view.current;
                    await this.append(s, createNoteRevision({ ...data, notebookId: view.effectiveNotebookId, parents: view.heads, status: action === 'trash' ? 'trashed' : 'active', recordedAt: new Date(this.now()).toISOString() }));
                }
            }
            if (action === 'purge') {
                s.revisions = s.revisions.filter(r => !s.deleted.includes(r.noteId));
                await this.cleanDeleted(s, (await this.files.scan()).paths);
                await this.manifest(s);
            }
            return selected.map(n => n.noteId);
        }, signal);
    }
    async cleanDeleted(state, paths) {
        const deleted = new Set(state.deleted), retained = new Set(), candidates = new Set(), remove = [];
        const dependencies = async (r, target) => {
            r.assetIds.forEach(a => target.add(`assets/${a}`));
            r.attachments?.forEach(a => target.add(`attachments/${a.id}.bin`));
            if (r.sourceId) {
                target.add(`sources/${r.sourceId}.json`);
                const bytes = await this.files.read(`sources/${r.sourceId}.json`).catch(e => { if (missing(e))
                    return null; throw e; });
                if (bytes) {
                    const source = object(JSON.parse(utf8(bytes)));
                    sourceAttachments(source).forEach(a => target.add(`attachments/${a.id}.bin`));
                    if (source.assets)
                        Object.values(object(source.assets)).forEach(a => target.add(`assets/${assetId(a)}`));
                }
            }
        };
        for (const row of state.revisions)
            await dependencies(row, retained);
        for (const row of await this.drafts.list())
            if (row.state === 'editing') {
                row.files.forEach(p => retained.add(p));
                row.request?.content.assetIds.forEach(a => retained.add('assets/' + a));
                row.request?.content.attachments?.forEach(a => retained.add('attachments/' + a.id + '.bin'));
            }
        for (const path of paths) {
            if (path.startsWith('revisions/') && deleted.has(path.split('/')[1])) {
                const row = validateNoteRevision(JSON.parse(utf8(await this.files.read(path))));
                await dependencies(row, candidates);
                remove.push(path);
            }
            else if (path.startsWith('documents/') && deleted.has(path.slice(10, -3)))
                remove.push(path);
            else if (/^(jobs|captures)\//.test(path)) {
                const value = object(JSON.parse(utf8(await this.files.read(path))));
                const data = value.data && typeof value.data === 'object' ? object(value.data) : value;
                if (deleted.has(String(data.noteId)))
                    remove.push(path);
            }
        }
        // Keep deleted revisions until dependencies are removed, making interrupted cleanup retryable.
        for (const path of [...candidates].sort((a, b) => Number(a.startsWith('sources/')) - Number(b.startsWith('sources/'))))
            if (!retained.has(path))
                await this.files.remove(path);
        for (const path of remove)
            await this.files.remove(path);
    }
    async putSource(value, signal) {
        const bytes = sourceBytes(value), sourceId = digest(bytes);
        return this.run(async () => { await this.load(); await this.files.write(`sources/${sourceId}.json`, bytes, true); return sourceId; }, signal);
    }
    async getSource(sourceId, signal) {
        hash(sourceId);
        return this.run(async () => { const bytes = await this.files.read(`sources/${sourceId}.json`, NOTE_LIMITS.source); if (digest(bytes) !== sourceId)
            fail('note_hash'); return object(JSON.parse(utf8(bytes))); }, signal);
    }
    async exportObjects(signal) { return (await this.exportSyncSnapshot(signal)).objects; }
    /** Import local Markdown edits in the same short queue turn as the frozen identity set. */
    async exportSyncSnapshot(signal) {
        return this.run(async () => {
            const state = await this.load();
            if (state.issues.length)
                fail('note_corrupt', '笔记存在损坏文件，请恢复后再同步');
            for (const noteId of new Set(state.revisions.map(row => row.noteId)))
                await this.external(state, noteId);
            return { objects: { version: 1, revisions: state.revisions, notebooks: state.notebooks, ...(state.deleted?.length ? { deleted: state.deleted } : {}) }, generation: this.changeGeneration };
        }, signal);
    }
    async importMarkdown(noteId, markdown, signal) {
        id(noteId);
        parseNoteMarkdown(markdown);
        return this.run(async () => { this.editGuard([noteId]); const s = await this.load(); this.writable(s, noteId); await this.external(s, noteId); await this.external(s, noteId, markdown); return this.view(s, noteId); }, signal);
    }
    /** Sources/assets must already be present; imports are monotonic and may leave recoverable immutable objects on failure. */
    async importObjects(input, signal) {
        const v = object(input);
        keys(v, ['version', 'revisions', 'notebooks', ...('deleted' in v ? ['deleted'] : [])]);
        if (v.version !== 1 || !Array.isArray(v.revisions) || !Array.isArray(v.notebooks))
            fail('note_version');
        const copy = structuredClone(input);
        const incoming = copy.revisions.map(validateNoteRevision), incomingBooks = copy.notebooks.map(validateNotebookRevision);
        this.limits(copy);
        return this.run(async () => {
            const s = await this.load();
            const deleted = [...new Set([...(s.deleted ?? []), ...deletionIds(copy.deleted)])].sort();
            // Individually valid orphan objects can be completed by this validated input.
            // Truly damaged files never enter these sets and remain write-protected.
            const revisions = mergeNoteRevisions([...s.revisions, ...s.detachedRevisions].filter(r => !deleted.includes(r.noteId)), incoming.filter(r => !deleted.includes(r.noteId)));
            const notebooks = mergeNotebookRevisions([...s.notebooks, ...s.detachedNotebooks], incomingBooks);
            const available = new Set([...revisions.map(notePath), ...notebooks.map(notebookPath)]);
            const issues = s.issues.filter(issue => !deleted.includes(issue.path.split('/')[1] ?? '') && (!(issue.code === 'note_parent' || issue.code === 'note_missing') || !available.has(issue.path)));
            const next = { ...s, revisions, notebooks, deleted, detachedRevisions: [], detachedNotebooks: [], issues, blocked: new Set(issues.map(i => i.path.split('/')[1] ?? '')) };
            this.limits(next);
            this.complete(next);
            for (const r of incoming.filter(r => !deleted.includes(r.noteId)))
                this.writable(next, r.noteId);
            for (const r of incomingBooks)
                this.writable(next, r.notebookId);
            // load() has just checked the local objects and their dependencies against disk.
            // Identical immutable hashes need no second reference scan or atomic publication.
            const localNotes = new Set(s.revisions.map(r => r.revision)), localBooks = new Set(s.notebooks.map(r => r.revision));
            for (const r of incoming.filter(r => !deleted.includes(r.noteId) && !localNotes.has(r.revision)))
                await checkReferences(this.files, r);
            const noteHashes = new Set(incoming.map(r => r.revision)), notebookHashes = new Set(incomingBooks.map(r => r.revision));
            for (const r of topologicalOrder(notebooks, r => r.notebookId))
                if (notebookHashes.has(r.revision) && !localBooks.has(r.revision))
                    await this.files.write(notebookPath(r), canonical(r), true);
            for (const r of topologicalOrder(revisions, r => r.noteId))
                if (noteHashes.has(r.revision) && !localNotes.has(r.revision))
                    await this.files.write(notePath(r), canonical(r), true);
            for (const noteId of deleted)
                await this.files.write(`deleted/${noteId}.json`, deletionData(noteId), true);
            for (const noteId of new Set([...incoming, ...s.detachedRevisions].map(r => r.noteId).filter(n => !deleted.includes(n)))) {
                await this.external(next, noteId);
                await this.document(next, noteId);
            }
            await this.splitConflicts(next);
            await this.ensureNotebooks(next);
            await this.manifest(next);
            if (deleted.length)
                await this.cleanDeleted(next, (await this.files.scan()).paths);
        }, signal);
    }
    /** A deterministic fork root and merge commit converge on every device, even after a retry. */
    async splitConflicts(state) {
        for (const row of conflictRevisions(state.revisions))
            if (!state.deleted?.includes(row.noteId))
                await this.append(state, row);
    }
    async listNotebooks(signal) {
        return this.run(async () => {
            const s = await this.load(), selected = this.defaultBook(s)?.notebookId, counts = new Map();
            for (const noteId of new Set(s.revisions.map(r => r.noteId))) {
                const note = this.view(s, noteId);
                if (note.current.status === 'active' && !note.current.isTemplate && note.effectiveNotebookId)
                    counts.set(note.effectiveNotebookId, (counts.get(note.effectiveNotebookId) ?? 0) + 1);
            }
            return this.books(s).map(book => ({ ...book, isDefault: book.notebookId === selected, noteCount: counts.get(book.notebookId) ?? 0 }));
        }, signal);
    }
    async saveNotebook(input, signal) {
        const notebookId = input.notebookId === undefined ? ulid(this.now()) : id(input.notebookId), expected = sortedStrings(input.expectedHeads, NOTE_LIMITS.revisions, hash), title = text(input.title, 1200).trim() || '未命名笔记本';
        return this.run(async () => {
            this.editGuard([]);
            const s = await this.load();
            this.writable(s, notebookId);
            this.complete(s);
            const heads = s.notebooks.some(r => r.notebookId === notebookId) ? this.notebook(s, notebookId).heads : [];
            if (!same(heads, expected))
                conflict();
            if (sameNamedNotebook(this.books(s), title, notebookId))
                fail('notebook_name_taken', NOTEBOOK_NAME_TAKEN);
            const previous = s.notebooks.filter(r => r.notebookId === notebookId).map(r => r.defaultSelectedAt ?? '').sort().at(-1);
            const selected = input.makeDefault ? new Date(Math.max(this.now(), ...s.notebooks.map(r => r.defaultSelectedAt ? Date.parse(r.defaultSelectedAt) + 1 : 0))).toISOString() : previous;
            const row = createNotebookRevision({ version: 1, notebookId, title, status: 'active', parents: heads, recordedAt: new Date(this.now()).toISOString(), ...(selected ? { defaultSelectedAt: selected } : {}) });
            s.notebooks = mergeNotebookRevisions(s.notebooks, [row]);
            this.limits(s);
            await this.files.write(notebookPath(row), canonical(row), true);
            await this.manifest(s);
            return this.notebook(s, notebookId);
        }, signal);
    }
    async deleteNotebook(notebookId, expectedHeads, signal, options = {}) {
        id(notebookId);
        const expected = sortedStrings(expectedHeads, NOTE_LIMITS.revisions, hash);
        return this.run(async () => {
            const s = await this.load();
            this.writable(s, notebookId);
            const book = this.notebook(s, notebookId);
            this.editGuard([...new Set(s.revisions.map(r => r.noteId))].filter(n => { const v = this.view(s, n); return !v.current.isTemplate && v.effectiveNotebookId === notebookId; }));
            this.complete(s);
            if (!same(book.heads, expected))
                conflict();
            const destination = this.defaultBook(s);
            if (destination.notebookId === notebookId)
                fail('notebook_default', '请先把另一个笔记本设为默认，再移除此笔记本');
            if (!activeNotebook(book))
                fail('notebook_trashed');
            const members = [];
            for (const noteId of new Set(s.revisions.map(r => r.noteId))) {
                const member = this.view(s, noteId);
                if (member.current.isTemplate || member.effectiveNotebookId !== notebookId)
                    continue;
                this.writable(s, noteId);
                await this.external(s, noteId);
                const note = this.view(s, noteId);
                if (note.effectiveNotebookId !== notebookId)
                    continue;
                if (note.heads.length > 1)
                    conflict();
                members.push(note);
            }
            const count = members.filter(note => note.current.status === 'active').length;
            if (options.expectedNoteCount !== undefined && options.expectedNoteCount !== count)
                fail('notebook_contents_changed', '笔记数量已变化，请重新确认移除范围');
            for (const note of members) {
                const { revision: _revision, ...data } = note.current;
                await this.append(s, createNoteRevision({ ...data, parents: note.heads, notebookId: destination.notebookId,
                    status: options.removal === 'trash' ? 'trashed' : data.status, recordedAt: new Date(this.now()).toISOString() }));
            }
            const row = createNotebookRevision({ version: 1, notebookId, title: book.current.title, status: 'trashed', parents: book.heads, recordedAt: new Date(this.now()).toISOString() });
            // Publish the notebook tombstone only after every selected note is safely retained.
            s.notebooks = mergeNotebookRevisions(s.notebooks, [row]);
            this.limits(s);
            await this.files.write(notebookPath(row), canonical(row), true);
            await this.manifest(s);
        }, signal);
    }
    async recover(signal) {
        return this.run(async () => {
            const s = await this.load();
            for (const noteId of new Set(s.revisions.map(r => r.noteId))) {
                if (s.blocked.has(noteId))
                    continue;
                try {
                    await this.external(s, noteId);
                    await this.document(s, noteId);
                }
                catch (e) {
                    if (!(e instanceof NotebookError))
                        throw e;
                    s.issues.push({ path: `documents/${noteId}.md`, code: e.code });
                }
            }
            if (!s.issues.some(issue => issue.code === 'note_missing'))
                await this.manifest(s);
            return s.issues;
        }, signal);
    }
}
