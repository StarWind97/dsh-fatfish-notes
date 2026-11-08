import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile, readFile, mkdir, symlink, link, readdir, truncate } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DEFAULT_NOTEBOOK_ID } from '../src/notes/notebooks.js'
import { NoteRepository } from '../src/notes/repository.js'
import { createNoteRevision, createNotebookRevision } from '../src/notes/revisions.js'
import { serializeNoteMarkdown } from '../src/notes/markdown.js'
import { canonical, digest } from '../src/notes/validation.js'
import type { NoteContent, NoteRevision, NoteObjects } from '../src/notes/types.js'
import { NOTE_LIMITS } from '../src/notes/types.js'
import { ulid } from '../src/domain/id.js'

const content: NoteContent = { title: '中文 / CON: 标题?', body: '\r\n原文  \r\n', summary: '摘要', tags: ['标签'], notebookId: null, status: 'active', sourceId: null, assetIds: [] }
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')
const code = (wanted: string) => (e: unknown): boolean => e instanceof Error && 'code' in e && e.code === wanted
async function fixture(t: { after(fn: () => Promise<void>): void }): Promise<{ dir: string; repo: NoteRepository }> {
  const dir = await mkdtemp(join(tmpdir(), 'fatfish-notes-中文 ')); t.after(() => rm(dir, { recursive: true, force: true })); return { dir, repo: new NoteRepository(dir) }
}
function child(base: NoteRevision, body: string, patch: Partial<NoteRevision> = {}): NoteRevision {
  const { revision, ...data } = base
  return createNoteRevision({ ...data, parents: [revision], body, ...patch })
}

test('notes storage acknowledges durable body/source/image and reopens exact bytes', async t => {
  const { dir, repo } = await fixture(t), asset = await repo.putAsset(png, 'image/png')
  const sourceId = await repo.putSource({ version: 1, messages: [{ role: 'user', text: content.body }], assetIds: [asset.id] })
  const body = `${content.body}![图](../assets/${asset.id})\r\n `
  const view = await repo.save({ expectedHeads: [], content: { ...content, body, sourceId, assetIds: [asset.id] } })
  const reopened = new NoteRepository(dir), actual = await reopened.get(view.noteId)
  assert.equal(actual.current.body, body); assert.deepEqual(await reopened.getAsset(asset.id), png)
  assert.equal((await reopened.getSource(sourceId)).version, 1)
  assert.equal((await reopened.list()).items[0]?.title, content.title)
  const md = await readFile(join(dir, 'notes', 'documents', `${view.noteId}.md`), 'utf8')
  assert.ok(md.endsWith(body)); assert.ok(!md.includes(dir))
})

test('notes save rejects absent/tampered sources and assets before revision success', async t => {
  const { dir, repo } = await fixture(t)
  await assert.rejects(repo.save({ expectedHeads: [], content: { ...content, sourceId: 'a'.repeat(64) } }))
  await assert.rejects(repo.save({ expectedHeads: [], content: { ...content, assetIds: [`${'a'.repeat(64)}.png`] } }))
  const asset = await repo.putAsset(png, 'image/png')
  await writeFile(join(dir, 'notes', 'assets', asset.id), Buffer.from('broken'))
  await assert.rejects(repo.save({ expectedHeads: [], content: { ...content, assetIds: [asset.id] } }))
  assert.equal((await repo.exportObjects()).revisions.length, 0)
})

test('final R1 saving/reopening preserves the first authorized reference and rejects a shadowed unsafe reference', async t => {
  const { dir, repo } = await fixture(t), asset = await repo.putAsset(png, 'image/png')
  const body = `> [Pic Ref]: ../assets/${asset.id}\n\n![selected][PIC REF]\n\n[pic  ref]: file:///C:/unused.png`
  const saved = await repo.save({ expectedHeads: [], content: { ...content, body, assetIds: [asset.id] } }), reopened = new NoteRepository(dir)
  assert.equal((await reopened.get(saved.noteId)).current.body, body); assert.deepEqual(await reopened.getAsset(asset.id), png)
  const unsafe = '[Pic Ref]: file:///C:/private.png\n\n![selected][PIC REF]\n\n> [pic  ref]: https://example.com/harmless.png'
  await assert.rejects(reopened.save({ expectedHeads: [], content: { ...content, body: unsafe } }), code('note_asset'))
  for (const prefix of ['', '> ']) {
    const empty = `${prefix}[Pic Ref]: <>\n\n![selected][PIC REF]\n\n[pic  ref]: https://example.com/harmless.png`
    await assert.rejects(reopened.save({ expectedHeads: [], content: { ...content, body: empty } }), code('note_asset'))
  }
  assert.equal((await reopened.list()).items.length, 1); assert.equal((await reopened.exportObjects()).revisions.length, 1)
})

test('notes assets are content-addressed, deduplicated, copied before async work and validate signatures', async t => {
  const { dir, repo } = await fixture(t), bytes = Buffer.from(png)
  const pending = repo.putAsset(bytes, 'image/png'); bytes.fill(0)
  const asset = await pending; assert.deepEqual(await repo.getAsset(asset.id), png)
  assert.deepEqual(await repo.putAsset(png, 'image/png'), asset)
  assert.equal((await readdir(join(dir, 'notes', 'assets'))).length, 1)
  await assert.rejects(repo.putAsset(png, 'image/jpeg'))
  await assert.rejects(repo.putAsset(Buffer.alloc(5 * 1024 * 1024 + 1), 'image/png'))
  await assert.rejects(repo.getAsset('../../secret'))
})

test('notes serial optimistic saves reject stale heads instead of silently overwriting', async t => {
  const { dir, repo } = await fixture(t), base = await repo.save({ expectedHeads: [], content })
  const input = { noteId: base.noteId, expectedHeads: base.heads, content: { ...content, body: '第一写入' } }
  const first = repo.save(input); input.content.body = '调用后篡改'
  const second = new NoteRepository(dir).save({ noteId: base.noteId, expectedHeads: base.heads, content: { ...content, body: '第二写入' } })
  const results = await Promise.allSettled([first, second])
  assert.equal(results[0]?.status, 'fulfilled'); assert.equal(results[1]?.status, 'rejected')
  assert.equal((await repo.get(base.noteId)).current.body, '第一写入')
})

test('replaying a committed edit after another save neither restores obsolete content nor creates a fork',async t=>{
  const {repo}=await fixture(t),base=await repo.save({expectedHeads:[],content})
  const edit={noteId:base.noteId,expectedHeads:base.heads,content:{...content,body:'E'}}
  const first=await repo.save(edit,undefined,true)
  assert.equal((await repo.save(edit,undefined,true)).current.revision,first.current.revision)
  await repo.save({...edit,expectedHeads:first.heads,content:{...content,body:'F'}})
  assert.equal((await repo.save(edit,undefined,true)).current.body,'F')
  assert.equal((await repo.list()).items.length,1)
  const fork=await repo.save({...edit,content:{...content,body:'different'}},undefined,true)
  assert.equal(fork.current.body,'different')
  assert.equal((await repo.list()).items.length,2)
})

test('notes trash and restore add revisions without deleting bodies or source history', async t => {
  const { repo } = await fixture(t), base = await repo.save({ expectedHeads: [], content })
  const trashed = await repo.trash(base.noteId, base.heads)
  assert.equal((await repo.list()).items.length, 0); assert.equal((await repo.list({ status: 'trashed' })).items.length, 1)
  const restored = await repo.restore(base.noteId, trashed.heads)
  assert.equal(restored.current.body, content.body); assert.equal(restored.current.status, 'active')
  assert.equal((await repo.exportObjects()).revisions.length, 3)
})

test('concurrent edits become separate notes that preserve each branch status, and remain independent on retry',async t=>{
  const {repo}=await fixture(t),base=await repo.save({expectedHeads:[],content})
  const edited=child(base.current,'远端修改'),deleted=child(base.current,content.body,{status:'trashed'})
  const batch={version:1 as const,revisions:[edited,deleted],notebooks:[]}
  await repo.importObjects(batch)
  const first=await repo.list({status:'all'})
  assert.equal(first.items.length,2)
  assert.deepEqual(first.items.map(row=>row.title.slice(-7)).sort(),['冲突版本 A）','冲突版本 B）'])
  const trashed=(await repo.list({status:'trashed'})).items[0]!
  const active=(await repo.list()).items[0]!
  assert.equal((await repo.get(active.noteId)).current.body,'远端修改')
  await repo.importObjects(batch)
  assert.equal((await repo.list()).items.length,1)
  assert.equal((await repo.list({status:'trashed'})).items[0]?.noteId,trashed.noteId)

})

test('notes notebook deletion moves notes to default and sync preserves concurrent note versions', async t => {
  const first = await fixture(t), second = await fixture(t)
  const book = await first.repo.saveNotebook({ title: '我的笔记本', expectedHeads: [] })
  const base = await first.repo.save({ expectedHeads: [], content: { ...content, notebookId: book.notebookId } })
  await second.repo.importObjects(await first.repo.exportObjects())
  const other = await second.repo.save({ noteId: base.noteId, expectedHeads: base.heads, content: { ...base.current, body: '另一端编辑' } as NoteContent }).catch(() => null)
  // Public save accepts content fields only, not an accidental whole revision.
  assert.equal(other, null)
  await second.repo.save({ noteId: base.noteId, expectedHeads: base.heads, content: { ...content, notebookId: book.notebookId, body: '另一端编辑' } })
  await first.repo.deleteNotebook(book.notebookId, book.heads)
  await first.repo.importObjects(await second.repo.exportObjects())
  await second.repo.importObjects(await first.repo.exportObjects())
  const view = await second.repo.get(base.noteId)
  assert.equal(view.effectiveNotebookId, DEFAULT_NOTEBOOK_ID)
  const bodies = await Promise.all((await second.repo.list()).items.map(n => second.repo.get(n.noteId)))
  assert.ok(bodies.some(n => n.current.body === '另一端编辑'))
  assert.equal((await second.repo.list({ notebookId: DEFAULT_NOTEBOOK_ID })).items.length, 2)
  assert.equal((await second.repo.list({ notebookId: book.notebookId })).items.length, 0)
  await second.repo.save({ noteId: base.noteId, expectedHeads: view.heads, content: { ...content, notebookId: null, body: view.current.body } })
  assert.equal((await second.repo.get(base.noteId)).current.notebookId, DEFAULT_NOTEBOOK_ID)
})

test('notes notebook rename/delete concurrency falls back to default while preserving note conflicts', async t => {
  const { repo } = await fixture(t), book = await repo.saveNotebook({ title: '原名', expectedHeads: [] })
  const base = await repo.save({ expectedHeads: [], content: { ...content, notebookId: book.notebookId } })
  const renamed = createNotebookRevision({ version: 1, notebookId: book.notebookId, parents: book.heads, title: '新名', status: 'active', recordedAt: book.current.recordedAt })
  await repo.deleteNotebook(book.notebookId, book.heads)
  await repo.importObjects({ version: 1, notebooks: [renamed], revisions: [child(base.current, 'A'), child(base.current, 'B')] })
  const view = await repo.get(base.noteId)
  assert.equal(view.effectiveNotebookId, DEFAULT_NOTEBOOK_ID); assert.equal(view.conflicts.length, 0); assert.equal((await repo.list()).items.length,3)
  assert.equal((await repo.listNotebooks()).find(b => b.notebookId === book.notebookId)?.conflicts.length, 1)
})

test('notes deleted notebook allows external editing, normal save, trash and restore without stale membership', async t => {
  const { dir, repo } = await fixture(t), book = await repo.saveNotebook({ title: '将删除', expectedHeads: [] })
  const base = await repo.save({ expectedHeads: [], content: { ...content, notebookId: book.notebookId } })
  await repo.deleteNotebook(book.notebookId, book.heads)
  const moved = await repo.get(base.noteId)
  await writeFile(join(dir, 'notes', 'documents', `${base.noteId}.md`), serializeNoteMarkdown(moved.current) + '外部改正文')
  const edited = await repo.get(base.noteId)
  assert.equal(edited.current.notebookId, DEFAULT_NOTEBOOK_ID); assert.ok(edited.current.body.endsWith('外部改正文'))
  const saved = await repo.save({ noteId: base.noteId, expectedHeads: edited.heads, content: { ...content, notebookId: book.notebookId } })
  assert.equal(saved.current.notebookId, DEFAULT_NOTEBOOK_ID)
  const trashed = await repo.trash(base.noteId, saved.heads), restored = await repo.restore(base.noteId, trashed.heads)
  assert.equal(restored.current.status, 'active'); assert.equal(restored.current.notebookId, DEFAULT_NOTEBOOK_ID)
  assert.equal((await repo.getRevision(base.noteId, base.current.revision)).notebookId, book.notebookId)
  const unknown = ulid()
  await assert.rejects(repo.save({ noteId: base.noteId, expectedHeads: restored.heads, content: { ...content, notebookId: unknown } }), code('notebook_not_found'))
})

test('notes external Markdown editing creates a child while preserving concurrent local head', async t => {
  const { dir, repo } = await fixture(t), base = await repo.save({ expectedHeads: [], content })
  await repo.save({ noteId: base.noteId, expectedHeads: base.heads, content: { ...content, body: '本地修改' } })
  const external = serializeNoteMarkdown(base.current) + '\r\n外部尾部 '
  await writeFile(join(dir, 'notes', 'documents', `${base.noteId}.md`), external)
  const view = await new NoteRepository(dir).get(base.noteId)
  assert.equal(view.heads.length, 2)
  const row = [view.current, ...view.conflicts].find(r => r.body.endsWith('\r\n外部尾部 '))!
  assert.deepEqual(row.parents, base.heads)
  const count = (await repo.exportObjects()).revisions.length
  await repo.importMarkdown(base.noteId, external); assert.equal((await repo.exportObjects()).revisions.length, count)
})

test('notes unsafe or invalid external Markdown is preserved and cannot be silently overwritten', async t => {
  const { dir, repo } = await fixture(t), base = await repo.save({ expectedHeads: [], content }), path = join(dir, 'notes', 'documents', `${base.noteId}.md`)
  const bad = serializeNoteMarkdown(base.current) + '\n![坏图](../../secret.png)'
  await writeFile(path, bad)
  await assert.rejects(repo.get(base.noteId), code('note_asset'))
  await assert.rejects(repo.save({ noteId: base.noteId, expectedHeads: base.heads, content }), code('note_asset'))
  assert.equal(await readFile(path, 'utf8'), bad)
  assert.ok((await repo.recover()).some(i => i.path.endsWith('.md')))
  assert.equal(await readFile(path, 'utf8'), bad)
})

test('notes save failure before immutable write leaves prior acknowledged body untouched', async t => {
  const { dir, repo } = await fixture(t), base = await repo.save({ expectedHeads: [], content })
  const failing = new NoteRepository(dir, { beforeWrite(path) { if (path.startsWith('revisions/')) throw new Error('disk full') } })
  await assert.rejects(failing.save({ noteId: base.noteId, expectedHeads: base.heads, content: { ...content, body: '失败' } }), /disk full/)
  assert.equal((await new NoteRepository(dir).get(base.noteId)).current.body, content.body)
})

test('notes interruption after immutable write recovers object before failed index acknowledgment', async t => {
  const { dir, repo } = await fixture(t), base = await repo.save({ expectedHeads: [], content }), asset = await repo.putAsset(png, 'image/png')
  const failing = new NoteRepository(dir, { beforeWrite(path) { if (path === 'manifest.json') throw new Error('index failure') } })
  await assert.rejects(failing.save({ noteId: base.noteId, expectedHeads: base.heads, content: { ...content, body: '已落盘未回执', assetIds: [asset.id] } }), /index failure/)
  const reopened = new NoteRepository(dir); assert.deepEqual(await reopened.recover(), [])
  assert.equal((await reopened.get(base.noteId)).current.body, '已落盘未回执')
  assert.deepEqual(await reopened.getAsset(asset.id), png)
  assert.equal((await reopened.exportObjects()).revisions.length, 2)
})

test('notes interrupted external import retries idempotently even after clock changes', async t => {
  const { dir, repo } = await fixture(t), base = await repo.save({ expectedHeads: [], content }), path = join(dir, 'notes', 'documents', `${base.noteId}.md`)
  await writeFile(path, serializeNoteMarkdown(base.current) + '外部')
  const failing = new NoteRepository(dir, { now: () => 1, beforeWrite(p) { if (p.startsWith('documents/')) throw new Error('projection failure') } })
  await assert.rejects(failing.get(base.noteId), /projection failure/)
  const reopened = new NoteRepository(dir, { now: () => 1000 })
  assert.equal((await reopened.get(base.noteId)).heads.length, 1)
  assert.equal((await reopened.exportObjects()).revisions.length, 2)
})

test('notes corrupt index is preserved verbatim in quarantine and rebuilt from immutable files', async t => {
  const { dir, repo } = await fixture(t), base = await repo.save({ expectedHeads: [], content }), bad = Buffer.from('{broken')
  await writeFile(join(dir, 'notes', 'manifest.json'), bad)
  const reopened = new NoteRepository(dir), issues = await reopened.recover()
  assert.ok(issues.some(i => i.path === 'manifest.json'))
  assert.deepEqual(await readFile(join(dir, 'notes', 'quarantine', `${digest(bad)}.bin`)), bad)
  assert.equal((await reopened.get(base.noteId)).current.body, content.body)
  assert.equal(JSON.parse(await readFile(join(dir, 'notes', 'manifest.json'), 'utf8')).version, 1)
})

test('notes corrupt immutable files and descendants are logically isolated with original bytes retained', async t => {
  const { dir, repo } = await fixture(t), base = await repo.save({ expectedHeads: [], content })
  await repo.save({ noteId: base.noteId, expectedHeads: base.heads, content: { ...content, body: '子修订' } })
  const path = join(dir, 'notes', 'revisions', base.noteId, `${base.current.revision}.json`), bad = canonical({ ...base.current, body: '损坏' })
  await writeFile(path, bad)
  const reopened = new NoteRepository(dir), issues = await reopened.recover()
  assert.equal(new Set(issues.filter(i => i.path.startsWith('revisions/')).map(i => i.path)).size, 2)
  assert.equal(await readFile(path, 'utf8'), bad)
  await assert.rejects(reopened.save({ noteId: base.noteId, expectedHeads: [], content }), code('note_corrupt'))
  await writeFile(path, canonical(base.current))
  assert.deepEqual(await reopened.recover(), []); assert.equal((await reopened.get(base.noteId)).current.body, '子修订')
})

test('notes future manifest versions stop writes without replacing existing files', async t => {
  const { dir, repo } = await fixture(t)
  await mkdir(join(dir, 'notes')); const manifest = '{"version":2,"future":true}'
  await writeFile(join(dir, 'notes', 'manifest.json'), manifest)
  await assert.rejects(repo.save({ expectedHeads: [], content }), code('note_version'))
  await assert.rejects(repo.putAsset(png, 'image/png'), code('note_version'))
  await assert.rejects(repo.putSource({ text: '新来源' }), code('note_version'))
  assert.equal(await readFile(join(dir, 'notes', 'manifest.json'), 'utf8'), manifest)
})

test('notes crash after immutable publication removes only its verified staging hardlink', async t => {
  const { dir, repo } = await fixture(t), base = await repo.save({ expectedHeads: [], content })
  const folder = join(dir, 'notes', 'revisions', base.noteId), original = join(folder, `${base.current.revision}.json`)
  const staging = join(folder, '.tmp-00000000-0000-0000-0000-000000000001')
  await link(original, staging)
  assert.equal((await new NoteRepository(dir).get(base.noteId)).current.body, content.body)
  assert.deepEqual(await readdir(folder), [`${base.current.revision}.json`])
})

test('notes external hardlinks are rejected instead of followed or removed', async t => {
  const { dir, repo } = await fixture(t), outside = await fixture(t), base = await repo.save({ expectedHeads: [], content })
  const original = join(dir, 'notes', 'revisions', base.noteId, `${base.current.revision}.json`)
  const external = join(outside.dir, 'external.json'); await link(original, external)
  await assert.rejects(repo.get(base.noteId), code('note_path'))
  assert.equal(await readFile(external, 'utf8'), canonical(base.current))
})

test('notes valid JSON but damaged manifest is preserved and cannot redefine immutable history', async t => {
  const { dir, repo } = await fixture(t), base = await repo.save({ expectedHeads: [], content })
  const bad = '{"version":1,"notes":[],"notebooks":[],"revision":"bad"}'
  await writeFile(join(dir, 'notes', 'manifest.json'), bad)
  assert.ok((await repo.recover()).some(i => i.path === 'manifest.json'))
  assert.equal(await readFile(join(dir, 'notes', 'quarantine', `${digest(bad)}.bin`), 'utf8'), bad)
  assert.equal((await repo.get(base.noteId)).current.body, content.body)
})

test('notes frozen historical reads verify both note identity and hash', async t => {
  const { repo } = await fixture(t), base = await repo.save({ expectedHeads: [], content })
  await repo.save({ noteId: base.noteId, expectedHeads: base.heads, content: { ...content, body: '更新正文' } })
  assert.deepEqual(await repo.getRevision(base.noteId, base.current.revision), base.current)
  await assert.rejects(repo.getRevision(ulid(), base.current.revision), code('note_not_found'))
  await assert.rejects(repo.getRevision(base.noteId, '../../secret'), code('note_hash'))
})

test('notes byte scanner refuses oversized unknown files without removing any source', async t => {
  const { dir, repo } = await fixture(t); await mkdir(join(dir, 'notes'))
  const path = join(dir, 'notes', 'unknown.data'); await writeFile(path, '')
  await truncate(path, NOTE_LIMITS.scan + 1)
  await assert.rejects(repo.list(), code('note_limit'))
})

test('notes 5000-note cap rejects the entire oversized import before writes', async t => {
  const { dir, repo } = await fixture(t)
  const revisions = Array.from({ length: NOTE_LIMITS.notes + 1 }, (_, i) => createNoteRevision({ version: 1, noteId: ulid(i), parents: [], recordedAt: '2026-11-01T00:00:00.000Z', ...content }))
  await assert.rejects(repo.importObjects({ version: 1, revisions, notebooks: [] }), code('note_limit'))
  assert.deepEqual(await readdir(dir), [])
})

test('notes archived images enforce the actual per-note 20 MiB budget', async t => {
  const { repo } = await fixture(t), assets: string[] = []
  for (let i = 0; i < 5; i++) {
    const bytes = Buffer.alloc(NOTE_LIMITS.image); png.copy(bytes); bytes[bytes.length - 1] = i
    assets.push((await repo.putAsset(bytes, 'image/png')).id)
  }
  const base = await repo.save({ expectedHeads: [], content: { ...content, assetIds: assets.slice(0, 4) } })
  await assert.rejects(repo.save({ noteId: base.noteId, expectedHeads: base.heads, content: { ...content, assetIds: assets } }), code('note_limit'))
  assert.equal((await repo.get(base.noteId)).current.assetIds.length, 4)
})

test('notes repository refuses directory symlinks/junctions and leaves outside files unchanged', async t => {
  const { dir, repo } = await fixture(t), outside = await fixture(t)
  await mkdir(join(dir, 'notes')); await symlink(outside.dir, join(dir, 'notes', 'assets'), 'junction')
  await assert.rejects(repo.putAsset(png, 'image/png'), code('note_path'))
  assert.deepEqual(await readdir(outside.dir), [])
})

test('notes imported malformed objects fail before any immutable revision is written', async t => {
  const { repo } = await fixture(t), base = await repo.save({ expectedHeads: [], content })
  const valid = child(base.current, '有效'), invalid = { ...child(base.current, '无效'), surprise: 'future' }
  await assert.rejects(repo.importObjects({ version: 1, revisions: [valid, invalid], notebooks: [] } as NoteObjects), code('note_schema'))
  assert.equal((await repo.exportObjects()).revisions.length, 1)
})

test('notes already-aborted requests do not write any files and a failed queue remains usable', async t => {
  const { repo } = await fixture(t), controller = new AbortController(); controller.abort()
  await assert.rejects(repo.save({ expectedHeads: [], content }, controller.signal))
  assert.equal((await repo.exportObjects()).revisions.length, 0)
  assert.equal((await repo.save({ expectedHeads: [], content })).current.body, content.body)
})

for (const kind of ['note', 'notebook'] as const) {
  test(`notes R1 ${kind} missing acknowledged head stays reported without rewriting its manifest`, async t => {
    const { dir, repo } = await fixture(t)
    const result = kind === 'note' ? await repo.save({ expectedHeads: [], content }) : await repo.saveNotebook({ expectedHeads: [], title: '组' })
    const row = result.current, identity = 'noteId' in row ? row.noteId : row.notebookId
    const path = join(dir, 'notes', kind === 'note' ? 'revisions' : 'notebooks', identity, `${row.revision}.json`)
    const manifestPath = join(dir, 'notes', 'manifest.json'), original = await readFile(manifestPath)
    await rm(path)
    const reopened = new NoteRepository(dir)
    await assert.rejects(reopened.exportObjects(), code('note_corrupt'))
    for (let i = 0; i < 2; i++) {
      assert.ok((await reopened.recover()).some(issue => issue.code === 'note_missing'))
      assert.deepEqual(await readFile(manifestPath), original)
    }
    if (kind === 'note') await assert.rejects(reopened.save({ noteId: identity, expectedHeads: [], content }), code('note_corrupt'))
    else await assert.rejects(reopened.saveNotebook({ notebookId: identity, expectedHeads: [], title: '不能覆盖' }), code('note_corrupt'))
    await reopened.importObjects({ version: 1, revisions: kind === 'note' ? [row] as NoteRevision[] : [], notebooks: kind === 'notebook' ? [row] as import('../src/notes/types.js').NotebookRevision[] : [] })
    assert.deepEqual(await reopened.recover(), [])
    assert.equal((await reopened.exportObjects())[kind === 'note' ? 'revisions' : 'notebooks'].filter(r => ('noteId' in r ? r.noteId : r.notebookId) === identity).length, 1)
  })

  test(`notes R2 ${kind} reversed import interrupted before parent can be retried after restart`, async t => {
    const { dir } = await fixture(t), identity = ulid()
    const base = kind === 'note' ? createNoteRevision({ version: 1, noteId: identity, parents: [], recordedAt: '2026-11-01T00:00:00.000Z', ...content }) : createNotebookRevision({ version: 1, notebookId: identity, parents: [], recordedAt: '2026-11-01T00:00:00.000Z', title: '组', status: 'active' })
    const tip = 'noteId' in base ? child(base, '子修订') : createNotebookRevision({ version: 1, notebookId: identity, parents: [base.revision], recordedAt: base.recordedAt, title: '重命名', status: 'active' })
    const input: NoteObjects = { version: 1, revisions: kind === 'note' ? [tip, base] as NoteRevision[] : [], notebooks: kind === 'notebook' ? [tip, base] as import('../src/notes/types.js').NotebookRevision[] : [] }
    const failing = new NoteRepository(dir, { beforeWrite(path) { if (path.endsWith(`${base.revision}.json`)) throw new Error('parent write interrupted') } })
    await assert.rejects(failing.importObjects(input), /parent write interrupted/)
    assert.equal((await new NoteRepository(dir).exportObjects())[kind === 'note' ? 'revisions' : 'notebooks'].filter(r => ('noteId' in r ? r.noteId : r.notebookId) === identity).length, 0)
    const reopened = new NoteRepository(dir)
    await reopened.importObjects(input)
    assert.equal((await reopened.exportObjects())[kind === 'note' ? 'revisions' : 'notebooks'].filter(r => ('noteId' in r ? r.noteId : r.notebookId) === identity).length, kind === 'note' ? 3 : 2)
    assert.deepEqual(await reopened.recover(), [])
  })

  test(`notes R2 ${kind} complete validated import repairs a preexisting orphan without discarding its bytes`, async t => {
    const { dir, repo } = await fixture(t), identity = ulid()
    const base = kind === 'note' ? createNoteRevision({ version: 1, noteId: identity, parents: [], recordedAt: '2026-11-01T00:00:00.000Z', ...content }) : createNotebookRevision({ version: 1, notebookId: identity, parents: [], recordedAt: '2026-11-01T00:00:00.000Z', title: '组', status: 'active' })
    const tip = 'noteId' in base ? child(base, '孤儿正文') : createNotebookRevision({ version: 1, notebookId: identity, parents: [base.revision], recordedAt: base.recordedAt, title: '孤儿新名', status: 'active' })
    const directory = join(dir, 'notes', kind === 'note' ? 'revisions' : 'notebooks', identity); await mkdir(directory, { recursive: true })
    const path = join(directory, `${tip.revision}.json`); await writeFile(path, canonical(tip))
    const input: NoteObjects = { version: 1, revisions: kind === 'note' ? [base] as NoteRevision[] : [], notebooks: kind === 'notebook' ? [base] as import('../src/notes/types.js').NotebookRevision[] : [] }
    await repo.importObjects(input)
    assert.equal(await readFile(path, 'utf8'), canonical(tip))
    assert.equal((await repo.exportObjects())[kind === 'note' ? 'revisions' : 'notebooks'].filter(r => ('noteId' in r ? r.noteId : r.notebookId) === identity).length, kind === 'note' ? 3 : 2)
  })

  test(`notes R2 ${kind} import repair never overwrites genuinely corrupt immutable bytes`, async t => {
    const { dir, repo } = await fixture(t)
    const base = kind === 'note' ? await repo.save({ expectedHeads: [], content }) : await repo.saveNotebook({ expectedHeads: [], title: '组' })
    const row = base.current, identity = 'noteId' in row ? row.noteId : row.notebookId
    const path = join(dir, 'notes', kind === 'note' ? 'revisions' : 'notebooks', identity, `${row.revision}.json`)
    const bad = canonical({ ...row, title: '被破坏' }); await writeFile(path, bad)
    const input: NoteObjects = { version: 1, revisions: kind === 'note' ? [row] as NoteRevision[] : [], notebooks: kind === 'notebook' ? [row] as import('../src/notes/types.js').NotebookRevision[] : [] }
    await assert.rejects(repo.importObjects(input), code('note_corrupt'))
    assert.equal(await readFile(path, 'utf8'), bad)
  })
}

test('notes R3 sparse and undefined source arrays are rejected before any write; dense arrays roundtrip', async t => {
  const { dir, repo } = await fixture(t)
  for (const items of [new Array(1), new Array(2), [undefined], { nested: new Array(3) }]) await assert.rejects(repo.putSource({ items }))
  assert.deepEqual(await readdir(dir), [])
  const value = { items: [null, '原文', 2, true, { nested: [] }] }
  const sourceId = await repo.putSource(value)
  assert.deepEqual(await repo.getSource(sourceId), value)
})
