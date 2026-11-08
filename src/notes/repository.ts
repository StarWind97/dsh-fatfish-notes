import { conflictForkId, conflictRevisions, revisionContent } from './conflicts.js'
import { join, resolve } from 'node:path'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { NotebookError } from '../domain/errors.js'
import { ulid } from '../domain/id.js'
import type { ImageMediaType } from '../contracts/media.js'
import type { NoteObjects, NoteRevision, NotebookRevision, NoteView, NoteSaveInput, NoteContent, NotebookView, NotebookRemoval, NoteListOptions, NoteListResult, RecoveryIssue, NoteAsset } from './types.js'
import { NOTE_LIMITS } from './types.js'
import { canonical, digest, fail, hash, id, normalizeContent, object, keys, sortedStrings, assetId } from './validation.js'
import { createNoteRevision, validateNoteRevision, mergeNoteRevisions, materializeNote, createNotebookRevision, validateNotebookRevision, mergeNotebookRevisions, materializeNotebook, topologicalOrder } from './revisions.js'
import { parseNoteMarkdown, serializeNoteMarkdown, NOTE_METADATA_BYTES } from './markdown.js'
import { NoteFiles, missing, safePath, utf8 } from './files.js'
import { checkReferences, sourceBytes, validateAsset, mediaTypeFor } from './assets.js'
import { searchNotes } from './search.js'
import { activeNotebook, defaultNotebook, DEFAULT_NOTEBOOK_ID, DEFAULT_NOTEBOOK_TIME } from './notebooks.js'

interface State extends NoteObjects {
  issues: RecoveryIssue[]; blocked: Set<string>
  detachedRevisions: NoteRevision[]; detachedNotebooks: NotebookRevision[]
  acknowledgedPaths: string[]
}
export interface NoteRepositoryOptions { now?: () => number; beforeWrite?: (path: string) => void | Promise<void> }
const queues = new Map<string, Promise<unknown>>()
const conflict = (): never => { throw new NotebookError('note_conflict', '笔记已有新版本，请重新读取或明确解决冲突', 409) }
const same = (a: string[], b: string[]): boolean => canonical([...a].sort()) === canonical([...b].sort())
const notePath = (r: NoteRevision): string => `revisions/${r.noteId}/${r.revision}.json`
const notebookPath = (r: NotebookRevision): string => `notebooks/${r.notebookId}/${r.revision}.json`

/** One queue per local directory. Parent application owns the cross-process single-writer lease. */
export class NoteRepository {
  files: NoteFiles
  private changeGeneration = 0
  get generation(): number { return this.changeGeneration }
  private readonly changeListeners = new Set<() => void>()
  onChange(listener: () => void): () => void { this.changeListeners.add(listener); return () => { this.changeListeners.delete(listener) } }
  private readonly now: () => number
  constructor(directory: string, options: NoteRepositoryOptions = {}) {
    this.files = new NoteFiles(resolve(join(directory, 'notes')), async path => { await options.beforeWrite?.(path); if (/^(revisions|notebooks)\//.test(path)) { this.changeGeneration++; this.changeListeners.forEach(listener => listener()) } }); this.now = options.now ?? Date.now
  }
  /** Only before admitting any client operations, during setup or host startup. */
  useDirectory(directory: string): void {
    this.files = new NoteFiles(resolve(directory, 'notes'), this.files.beforeWrite)
  }
  private run<T>(work: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    const result = (queues.get(this.files.root) ?? Promise.resolve()).then(() => { signal?.throwIfAborted(); return work() })
    const tail = result.catch(() => {}); queues.set(this.files.root, tail)
    void tail.finally(() => { if (queues.get(this.files.root) === tail) queues.delete(this.files.root) })
    return result
  }
  private view(state: State, noteId: string): NoteView {
    const view = materializeNote(state.revisions.filter(r => r.noteId === noteId), noteId)
    const notebookId = view.current.notebookId
    if (notebookId !== null) {
      const rows = state.notebooks.filter(r => r.notebookId === notebookId)
      if (!rows.length || state.blocked.has(notebookId)) view.effectiveNotebookId = null
      else { const book = materializeNotebook(rows, notebookId); if ([book.current, ...book.conflicts].some(r => r.status === 'trashed')) view.effectiveNotebookId = null }
    }
    if (view.effectiveNotebookId === null) view.effectiveNotebookId = this.defaultBook(state)?.notebookId ?? null
    return view
  }
  private notebook(state: State, notebookId: string): NotebookView { return materializeNotebook(state.notebooks.filter(r => r.notebookId === notebookId), notebookId) }
  private books(state: State): NotebookView[] { return [...new Set(state.notebooks.map(r => r.notebookId))].sort().map(n => this.notebook(state, n)) }
  private defaultBook(state: State): NotebookView | undefined { return defaultNotebook(this.books(state)) }
  private async ensureNotebooks(state: State): Promise<void> {
    if (state.issues.length) return
    const books = this.books(state), seed = books.find(b => b.notebookId === DEFAULT_NOTEBOOK_ID)
    if ((!seed && !books.some(b => b.current.defaultSelectedAt)) || !this.defaultBook(state)) {
      const row = createNotebookRevision({ version: 1, notebookId: DEFAULT_NOTEBOOK_ID, title: seed?.current.title ?? '默认笔记本', status: 'active',
        parents: seed?.heads ?? [], recordedAt: seed?.current.recordedAt ?? DEFAULT_NOTEBOOK_TIME, defaultSelectedAt: DEFAULT_NOTEBOOK_TIME })
      state.notebooks = mergeNotebookRevisions(state.notebooks, [row])
      await this.files.write(notebookPath(row), canonical(row), true); await this.manifest(state)
    }
    // Assign legacy unfiled notes once, retaining their order and all original content.
    for (const noteId of new Set(state.revisions.map(r => r.noteId))) {
      const view = this.view(state, noteId)
      if (view.heads.length !== 1 || view.current.notebookId !== null) continue
      await this.external(state, noteId)
      const latest = this.view(state, noteId)
      if (latest.heads.length !== 1 || latest.current.notebookId !== null) continue
      const { revision: _revision, ...data } = latest.current
      await this.append(state, createNoteRevision({ ...data, parents: latest.heads, notebookId: this.defaultBook(state)!.notebookId }))
    }
  }
  private async load(): Promise<State> {
    const state: State = { version: 1, revisions: [], notebooks: [], issues: [], blocked: new Set(), detachedRevisions: [], detachedNotebooks: [], acknowledgedPaths: [] }
    const paths = (await this.files.scan()).paths
    // Future module formats must never be silently reinitialized.
    if (paths.includes('manifest.json')) {
      let manifest: unknown
      try {
        manifest = JSON.parse(utf8(await this.files.read('manifest.json'))) as unknown
        const v = object(manifest)
        if (v.version !== undefined && v.version !== 1) fail('note_version', '笔记模块版本不支持，已暂停写入')
        if (Object.keys(v).some(k => !['version', 'notes', 'notebooks', 'revision'].includes(k))) fail('note_schema')
        const { revision, ...data } = v
        if (v.version !== 1 || !Array.isArray(v.notes) || !Array.isArray(v.notebooks) || revision !== digest(canonical(data))) fail('note_manifest')
        const claims: string[] = []
        for (const [rows, field, directory] of [[v.notes, 'noteId', 'revisions'], [v.notebooks, 'notebookId', 'notebooks']] as const) {
          const identities = new Set<string>()
          for (const raw of rows) {
            const entry = object(raw); keys(entry, [field, 'heads'])
            const identity = id(entry[field]), heads = sortedStrings(entry.heads, NOTE_LIMITS.revisions, hash)
            if (!heads.length || identities.has(identity)) fail('note_manifest')
            identities.add(identity); claims.push(...heads.map(head => `${directory}/${identity}/${head}.json`))
          }
        }
        state.acknowledgedPaths = claims
      } catch (e) {
        if (e instanceof NotebookError && ['note_version', 'note_schema'].includes(e.code)) throw e
        if (!(e instanceof SyntaxError || e instanceof NotebookError)) throw e
        state.issues.push({ path: 'manifest.json', code: 'note_manifest' })
      }
    }
    for (const path of paths) {
      if (!path.startsWith('revisions/') && !path.startsWith('notebooks/')) continue
      if (path.split('/').at(-1)?.startsWith('.tmp-')) continue
      try {
        const value: unknown = JSON.parse(utf8(await this.files.read(path, NOTE_LIMITS.body * 6 + NOTE_METADATA_BYTES)))
        if (path.startsWith('revisions/')) {
          const row = validateNoteRevision(value); if (path !== notePath(row)) fail('note_path')
          await checkReferences(this.files, row); state.revisions.push(row)
        } else {
          const row = validateNotebookRevision(value); if (path !== notebookPath(row)) fail('note_path'); state.notebooks.push(row)
        }
      } catch (e) {
        if (!(e instanceof NotebookError || e instanceof SyntaxError || missing(e))) throw e
        state.issues.push({ path, code: e instanceof NotebookError ? e.code : 'note_corrupt' }); state.blocked.add(path.split('/')[1] ?? '')
      }
    }
    // A corrupt ancestor quarantines its descendants logically, without moving/deleting bytes.
    const prune = <T extends { revision: string; parents: string[] }>(rows: T[], identity: (r: T) => string, path: (r: T) => string): T[] => {
      let remaining = rows
      for (;;) {
        const byHash = new Map(remaining.map(r => [r.revision, r]))
        const next = remaining.filter(r => {
          const valid = r.parents.every(p => byHash.has(p) && identity(byHash.get(p)!) === identity(r))
          if (!valid) { state.issues.push({ path: path(r), code: 'note_parent' }); state.blocked.add(identity(r)) }
          return valid
        })
        if (next.length === remaining.length) return next
        remaining = next
      }
    }
    const allRevisions = state.revisions, allNotebooks = state.notebooks
    state.revisions = mergeNoteRevisions(prune(allRevisions, r => r.noteId, notePath), [])
    state.notebooks = mergeNotebookRevisions(prune(allNotebooks, r => r.notebookId, notebookPath), [])
    const available = new Set([...state.revisions.map(notePath), ...state.notebooks.map(notebookPath)])
    state.detachedRevisions = allRevisions.filter(r => !available.has(notePath(r)))
    state.detachedNotebooks = allNotebooks.filter(r => !available.has(notebookPath(r)))
    for (const path of state.acknowledgedPaths) if (!available.has(path)) {
      state.issues.push({ path, code: 'note_missing' }); state.blocked.add(path.split('/')[1]!)
    }
    this.limits(state)
    await this.ensureNotebooks(state)
    return state
  }
  private limits(state: NoteObjects): void {
    if (state.revisions.length + state.notebooks.length > NOTE_LIMITS.revisions || new Set(state.revisions.map(r => r.noteId)).size > NOTE_LIMITS.notes) fail('note_limit')
  }
  private writable(state: State, identity: string): void { if (state.blocked.has(identity)) fail('note_corrupt', '该笔记有损坏修订，原件已隔离保留，请先恢复') }
  private complete(state: State): void {
    if (state.issues.some(issue => issue.code === 'note_missing')) fail('note_corrupt', '已确认保存的修订缺失或不可用，原清单已保留，请先恢复')
  }
  private localMembership<T extends NoteContent>(state: State, content: T): T {
    if (content.notebookId === null) return { ...content, notebookId: this.defaultBook(state)?.notebookId ?? null }
    this.writable(state, content.notebookId)
    const book = this.notebook(state, content.notebookId)
    return !activeNotebook(book) ? { ...content, notebookId: this.defaultBook(state)?.notebookId ?? null } : content
  }
  private async verifyNotebook(state: State, content: NoteContent): Promise<void> {
    if (content.notebookId !== null) {
      const view = this.notebook(state, content.notebookId)
      if ([view.current, ...view.conflicts].some(r => r.status !== 'active')) fail('notebook_trashed')
    }
    await checkReferences(this.files, content)
  }
  private async manifest(state: State): Promise<void> {
    this.complete(state)
    if (state.issues.some(i => i.path === 'manifest.json')) {
      const bytes = await this.files.read('manifest.json')
      await this.files.write(`quarantine/${digest(bytes)}.bin`, bytes, true)
    }
    const notes = [...new Set(state.revisions.map(r => r.noteId))].sort().map(noteId => ({ noteId, heads: this.view(state, noteId).heads }))
    const notebooks = [...new Set(state.notebooks.map(r => r.notebookId))].sort().map(notebookId => ({ notebookId, heads: this.notebook(state, notebookId).heads }))
    const data = { version: 1, notes, notebooks }
    await this.files.write('manifest.json', canonical({ ...data, revision: digest(canonical(data)) }), false)
  }
  private async document(state: State, noteId: string): Promise<void> {
    await this.files.write(`documents/${noteId}.md`, serializeNoteMarkdown(this.view(state, noteId).current), false)
  }
  private async external(state: State, noteId: string, markdown?: string): Promise<void> {
    const path = `documents/${noteId}.md`, bytes = markdown === undefined ? await this.files.read(path, NOTE_LIMITS.body + NOTE_METADATA_BYTES).catch(e => { if (missing(e)) return null; throw e }) : Buffer.from(markdown)
    if (!bytes) return
    const parsed = parseNoteMarkdown(utf8(bytes))
    if (parsed.revision.noteId !== noteId) fail('note_path')
    const base = state.revisions.find(r => r.noteId === noteId && r.revision === parsed.declaredRevision)
    if (!base) fail('note_parent')
    if (!parsed.changed) return
    this.complete(state)
    // External metadata may change content, but cannot rewrite ancestry/timestamps.
    if (!same(parsed.revision.parents, base.parents) || parsed.revision.recordedAt !== base.recordedAt) fail('note_frontmatter')
    const { revision: _revision, ...raw } = parsed.revision
    const contentOf = (r: NoteRevision): string => { const { revision: _h, recordedAt: _t, ...data } = r; return canonical(data) }
    let row = createNoteRevision(this.localMembership(state, { ...raw, parents: [base.revision], recordedAt: new Date(this.now()).toISOString() }))
    row = state.revisions.find(r => r.noteId === noteId && contentOf(r) === contentOf(row)) ?? row
    await this.verifyNotebook(state, row)
    const next = mergeNoteRevisions(state.revisions, [row]); this.limits({ ...state, revisions: next })
    await this.files.write(notePath(row), canonical(row), true); state.revisions = next
    await this.document(state, noteId); await this.manifest(state)
  }
  private async append(state: State, row: NoteRevision, beforeAppend?: (revision: NoteRevision) => Promise<void>): Promise<NoteView> {
    this.complete(state)
    const { revision: _revision, ...data } = row
    row = createNoteRevision(this.localMembership(state, data))
    this.writable(state, row.noteId); await this.verifyNotebook(state, row)
    const next = mergeNoteRevisions(state.revisions, [row]); this.limits({ ...state, revisions: next })
    // Final membership normalization and the caller's durable identity share
    // this repository queue turn. Nothing can change membership between them.
    await beforeAppend?.(structuredClone(row))
    await this.files.write(notePath(row), canonical(row), true); state.revisions = next
    await this.document(state, row.noteId); await this.manifest(state)
    return this.view(state, row.noteId)
  }
  async list(options: NoteListOptions = {}, signal?: AbortSignal): Promise<NoteListResult> {
    const input = structuredClone(options)
    return this.run(async () => { const s = await this.load(); return searchNotes([...new Set(s.revisions.map(r => r.noteId))].map(n => this.view(s, n)), input) }, signal)
  }
  async get(noteId: string, signal?: AbortSignal): Promise<NoteView> {
    id(noteId); return this.run(async () => { const s = await this.load(); this.writable(s, noteId); await this.external(s, noteId); return this.view(s, noteId) }, signal)
  }
  async getRevision(noteId: string, revision: string, signal?: AbortSignal): Promise<NoteRevision> {
    id(noteId); hash(revision)
    return this.run(async () => {
      const s = await this.load(), row = s.revisions.find(r => r.noteId === noteId && r.revision === revision)
      if (!row) fail('note_not_found', '笔记修订不存在或已损坏')
      return row
    }, signal)
  }
  async save(input: NoteSaveInput, signal?: AbortSignal, keepBoth = false): Promise<NoteView> {
    const v = object(input); if (Object.keys(v).some(k => !['noteId', 'expectedHeads', 'content'].includes(k))) fail('note_schema')
    const noteId = input.noteId === undefined ? ulid(this.now()) : id(input.noteId), rawContent = normalizeContent(input.content), expected = sortedStrings(input.expectedHeads, NOTE_LIMITS.revisions, hash)
    return this.run(async () => {
      const s = await this.load(); this.writable(s, noteId); await this.external(s, noteId)
      const content = this.localMembership(s, rawContent)
      const exists = s.revisions.some(r => r.noteId === noteId), heads = exists ? this.view(s, noteId).heads : []
      if (!same(expected, heads) || heads.length > 1) {
        const base=expected.length===1 && s.revisions.find(r=>r.noteId===noteId&&r.revision===expected[0])
        if(!keepBoth||!base||!exists)return conflict()
        const previous=s.revisions.find(row=>row.noteId===noteId&&same(row.parents,expected)&&canonical(revisionContent(row))===canonical(content))
        if(previous){
          const forkId=conflictForkId(previous)
          return this.view(s,s.revisions.some(row=>row.noteId===forkId)?forkId:noteId)
        }
        // Identical retries of the same stale edit produce the same branch.
        const branch=createNoteRevision({version:1,noteId,parents:expected,recordedAt:base.recordedAt,...content})
        if(!s.revisions.some(r=>r.revision===branch.revision))await this.append(s,branch)
        await this.splitConflicts(s)
        const forkId=conflictForkId(branch)
        return this.view(s,s.revisions.some(row=>row.noteId===forkId)?forkId:noteId)
      }
      return this.append(s, createNoteRevision({ version: 1, noteId, parents: heads, recordedAt: new Date(this.now()).toISOString(), ...content }))
    }, signal)
  }
  /** A journaled AI adoption has a stable revision even if its receipt is lost. */
  async adoptRevision(input: NoteRevision, persist: (revision: NoteRevision) => Promise<void>, signal?: AbortSignal): Promise<NoteView> {
    const row = validateNoteRevision(input)
    return this.run(async () => {
      const state = await this.load(); this.writable(state, row.noteId); await this.external(state, row.noteId)
      if (state.revisions.some(r => r.revision === row.revision)) {
        await this.document(state, row.noteId); await this.manifest(state); return this.view(state, row.noteId)
      }
      const view = this.view(state, row.noteId)
      if (view.heads.length !== 1 || !same(view.heads, row.parents)) conflict()
      return this.append(state, row, persist)
    }, signal)
  }
  private async setStatus(noteId: string, expectedHeads: string[], status: 'active' | 'trashed', signal?: AbortSignal): Promise<NoteView> {
    id(noteId); const expected = sortedStrings(expectedHeads, NOTE_LIMITS.revisions, hash)
    return this.run(async () => {
      const s = await this.load(); this.writable(s, noteId); await this.external(s, noteId); const view = this.view(s, noteId)
      if (!same(view.heads, expected) || view.heads.length > 1) conflict()
      const { revision: _revision, ...data } = view.current
      return this.append(s, createNoteRevision({ ...data, notebookId: view.effectiveNotebookId, parents: view.heads, status, recordedAt: new Date(this.now()).toISOString() }))
    }, signal)
  }
  async trash(noteId: string, expectedHeads: string[], signal?: AbortSignal): Promise<NoteView> { return this.setStatus(noteId, expectedHeads, 'trashed', signal) }
  async restore(noteId: string, expectedHeads: string[], signal?: AbortSignal): Promise<NoteView> { return this.setStatus(noteId, expectedHeads, 'active', signal) }
  async resolve(noteId: string, expectedHeads: string[], content: NoteContent, signal?: AbortSignal): Promise<NoteView> {
    id(noteId); const expected = sortedStrings(expectedHeads, NOTE_LIMITS.revisions, hash), normalized = normalizeContent(content)
    return this.run(async () => {
      const s = await this.load(); this.writable(s, noteId); await this.external(s, noteId); const view = this.view(s, noteId)
      if (!same(view.heads, expected)) conflict()
      return this.append(s, createNoteRevision({ version: 1, noteId, parents: view.heads, recordedAt: new Date(this.now()).toISOString(), ...normalized }))
    }, signal)
  }
  async putAsset(bytes: Uint8Array, mediaType: ImageMediaType, signal?: AbortSignal): Promise<NoteAsset> {
    const copy = Buffer.from(bytes), metadata = validateAsset(copy, mediaType)
    return this.run(async () => { await this.load(); await this.files.write(`assets/${metadata.id}`, copy, true); return metadata }, signal)
  }
  async getAsset(asset: string, signal?: AbortSignal): Promise<Buffer> {
    assetId(asset); return this.run(async () => { const bytes = await this.files.read(`assets/${asset}`, NOTE_LIMITS.image); if (validateAsset(bytes, mediaTypeFor(asset)).id !== asset) fail('note_hash'); return bytes }, signal)
  }
  async putSource(value: unknown, signal?: AbortSignal): Promise<string> {
    const bytes = sourceBytes(value), sourceId = digest(bytes)
    return this.run(async () => { await this.load(); await this.files.write(`sources/${sourceId}.json`, bytes, true); return sourceId }, signal)
  }
  async getSource(sourceId: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
    hash(sourceId); return this.run(async () => { const bytes = await this.files.read(`sources/${sourceId}.json`, NOTE_LIMITS.source); if (digest(bytes) !== sourceId) fail('note_hash'); return object(JSON.parse(utf8(bytes)) as unknown) }, signal)
  }
  async exportObjects(signal?: AbortSignal): Promise<NoteObjects> { return (await this.exportSyncSnapshot(signal)).objects }
  /** Import local Markdown edits in the same short queue turn as the frozen identity set. */
  async exportSyncSnapshot(signal?: AbortSignal): Promise<{ objects: NoteObjects; generation: number }> {
    return this.run(async () => {
      const state = await this.load()
      if (state.issues.length) fail('note_corrupt', '笔记存在损坏文件，请恢复后再同步')
      for (const noteId of new Set(state.revisions.map(row => row.noteId))) await this.external(state, noteId)
      return { objects: { version: 1, revisions: state.revisions, notebooks: state.notebooks }, generation: this.changeGeneration }
    }, signal)
  }
  async importMarkdown(noteId: string, markdown: string, signal?: AbortSignal): Promise<NoteView> {
    id(noteId); parseNoteMarkdown(markdown)
    return this.run(async () => { const s = await this.load(); this.writable(s, noteId); await this.external(s, noteId); await this.external(s, noteId, markdown); return this.view(s, noteId) }, signal)
  }
  /** Sources/assets must already be present; imports are monotonic and may leave recoverable immutable objects on failure. */
  async importObjects(input: NoteObjects, signal?: AbortSignal): Promise<void> {
    const v = object(input); keys(v, ['version', 'revisions', 'notebooks']); if (v.version !== 1 || !Array.isArray(v.revisions) || !Array.isArray(v.notebooks)) fail('note_version')
    const copy = structuredClone(input)
    const incoming = copy.revisions.map(validateNoteRevision), incomingBooks = copy.notebooks.map(validateNotebookRevision)
    this.limits(copy)
    return this.run(async () => {
      const s = await this.load()
      // Individually valid orphan objects can be completed by this validated input.
      // Truly damaged files never enter these sets and remain write-protected.
      const revisions = mergeNoteRevisions([...s.revisions, ...s.detachedRevisions], incoming)
      const notebooks = mergeNotebookRevisions([...s.notebooks, ...s.detachedNotebooks], incomingBooks)
      const available = new Set([...revisions.map(notePath), ...notebooks.map(notebookPath)])
      const issues = s.issues.filter(issue => !(issue.code === 'note_parent' || issue.code === 'note_missing') || !available.has(issue.path))
      const next: State = { ...s, revisions, notebooks, detachedRevisions: [], detachedNotebooks: [], issues, blocked: new Set(issues.map(i => i.path.split('/')[1] ?? '')) }
      this.limits(next); this.complete(next)
      for (const r of incoming) this.writable(next, r.noteId)
      for (const r of incomingBooks) this.writable(next, r.notebookId)
      for (const r of incoming) await checkReferences(this.files, r)
      const noteHashes = new Set(incoming.map(r => r.revision)), notebookHashes = new Set(incomingBooks.map(r => r.revision))
      for (const r of topologicalOrder(notebooks, r => r.notebookId)) if (notebookHashes.has(r.revision)) await this.files.write(notebookPath(r), canonical(r), true)
      for (const r of topologicalOrder(revisions, r => r.noteId)) if (noteHashes.has(r.revision)) await this.files.write(notePath(r), canonical(r), true)
      for (const noteId of new Set([...incoming, ...s.detachedRevisions].map(r => r.noteId))) { await this.external(next, noteId); await this.document(next, noteId) }
      await this.splitConflicts(next)
      await this.ensureNotebooks(next)
      await this.manifest(next)
    }, signal)
  }
  /** A deterministic fork root and merge commit converge on every device, even after a retry. */
  private async splitConflicts(state:State):Promise<void> {
    for(const row of conflictRevisions(state.revisions))await this.append(state,row)
  }
  async listNotebooks(signal?: AbortSignal): Promise<NotebookView[]> {
    return this.run(async () => {
      const s = await this.load(), selected = this.defaultBook(s)?.notebookId, counts = new Map<string, number>()
      for (const noteId of new Set(s.revisions.map(r => r.noteId))) {
        const note = this.view(s, noteId)
        if (note.current.status === 'active' && note.effectiveNotebookId) counts.set(note.effectiveNotebookId, (counts.get(note.effectiveNotebookId) ?? 0) + 1)
      }
      return this.books(s).map(book => ({ ...book, isDefault: book.notebookId === selected, noteCount: counts.get(book.notebookId) ?? 0 }))
    }, signal)
  }
  async saveNotebook(input: { notebookId?: string; expectedHeads: string[]; title: string; makeDefault?: boolean }, signal?: AbortSignal): Promise<NotebookView> {
    const notebookId = input.notebookId === undefined ? ulid(this.now()) : id(input.notebookId), expected = sortedStrings(input.expectedHeads, NOTE_LIMITS.revisions, hash), title = input.title
    return this.run(async () => {
      const s = await this.load(); this.writable(s, notebookId)
      this.complete(s)
      const heads = s.notebooks.some(r => r.notebookId === notebookId) ? this.notebook(s, notebookId).heads : []
      if (!same(heads, expected)) conflict()
      const previous = s.notebooks.filter(r => r.notebookId === notebookId).map(r => r.defaultSelectedAt ?? '').sort().at(-1)
      const selected = input.makeDefault ? new Date(Math.max(this.now(), ...s.notebooks.map(r => r.defaultSelectedAt ? Date.parse(r.defaultSelectedAt) + 1 : 0))).toISOString() : previous
      const row = createNotebookRevision({ version: 1, notebookId, title, status: 'active', parents: heads, recordedAt: new Date(this.now()).toISOString(), ...(selected ? { defaultSelectedAt: selected } : {}) })
      s.notebooks = mergeNotebookRevisions(s.notebooks, [row]); this.limits(s)
      await this.files.write(notebookPath(row), canonical(row), true); await this.manifest(s); return this.notebook(s, notebookId)
    }, signal)
  }
  async deleteNotebook(notebookId: string, expectedHeads: string[], signal?: AbortSignal, options: { removal?: NotebookRemoval; expectedNoteCount?: number } = {}): Promise<void> {
    id(notebookId); const expected = sortedStrings(expectedHeads, NOTE_LIMITS.revisions, hash)
    return this.run(async () => {
      const s = await this.load(); this.writable(s, notebookId); const book = this.notebook(s, notebookId)
      this.complete(s)
      if (!same(book.heads, expected)) conflict()
      const destination = this.defaultBook(s)!
      if (destination.notebookId === notebookId) fail('notebook_default', '请先把另一个笔记本设为默认，再移除此笔记本')
      if (!activeNotebook(book)) fail('notebook_trashed')
      const members: NoteView[] = []
      for (const noteId of new Set(s.revisions.map(r => r.noteId))) {
        if (this.view(s, noteId).effectiveNotebookId !== notebookId) continue
        this.writable(s, noteId); await this.external(s, noteId)
        const note = this.view(s, noteId)
        if (note.effectiveNotebookId !== notebookId) continue
        if (note.heads.length > 1) conflict()
        members.push(note)
      }
      const count = members.filter(note => note.current.status === 'active').length
      if (options.expectedNoteCount !== undefined && options.expectedNoteCount !== count) fail('notebook_contents_changed', '笔记数量已变化，请重新确认移除范围')
      for (const note of members) {
        const { revision: _revision, ...data } = note.current
        await this.append(s, createNoteRevision({ ...data, parents: note.heads, notebookId: destination.notebookId,
          status: options.removal === 'trash' ? 'trashed' : data.status, recordedAt: new Date(this.now()).toISOString() }))
      }
      const row = createNotebookRevision({ version: 1, notebookId, title: book.current.title, status: 'trashed', parents: book.heads, recordedAt: new Date(this.now()).toISOString() })
      // Publish the notebook tombstone only after every selected note is safely retained.
      s.notebooks = mergeNotebookRevisions(s.notebooks, [row]); this.limits(s)
      await this.files.write(notebookPath(row), canonical(row), true); await this.manifest(s)
    }, signal)
  }
  async recover(signal?: AbortSignal): Promise<RecoveryIssue[]> {
    return this.run(async () => {
      const s = await this.load()
      for (const noteId of new Set(s.revisions.map(r => r.noteId))) {
        if (s.blocked.has(noteId)) continue
        try { await this.external(s, noteId); await this.document(s, noteId) }
        catch (e) { if (!(e instanceof NotebookError)) throw e; s.issues.push({ path: `documents/${noteId}.md`, code: e.code }) }
      }
      if (!s.issues.some(issue => issue.code === 'note_missing')) await this.manifest(s)
      return s.issues
    }, signal)
  }
}
