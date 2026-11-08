import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NoteRepository } from '../src/notes/repository.js'
import { DEFAULT_NOTEBOOK_ID } from '../src/notes/notebooks.js'
import { createNoteRevision } from '../src/notes/revisions.js'
import { canonical } from '../src/notes/validation.js'
import { ulid } from '../src/domain/id.js'
import type { NoteContent } from '../src/contracts/notes.js'

const content: NoteContent = { title: '保留内容', body: '正文\n', summary: '摘要', tags: ['标签'], notebookId: null, status: 'active', sourceId: null, assetIds: [] }
async function fixture(t: { after(fn: () => Promise<void>): void }) {
  const dir = await mkdtemp(join(tmpdir(), 'default-book-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  return { dir, repo: new NoteRepository(dir) }
}

test('default notebook is created once, can be renamed/replaced, and defaults do not move existing notes', async t => {
  const { dir, repo } = await fixture(t), seed = (await repo.listNotebooks())[0]!
  assert.equal(seed.isDefault, true); assert.equal(seed.noteCount, 0)
  const first = await repo.save({ expectedHeads: [], content })
  assert.equal(first.current.notebookId, seed.notebookId)
  await repo.saveNotebook({ notebookId: seed.notebookId, expectedHeads: seed.heads, title: '收件箱' })
  const work = await repo.saveNotebook({ expectedHeads: [], title: '工作' })
  await repo.saveNotebook({ notebookId: work.notebookId, expectedHeads: work.heads, title: work.current.title, makeDefault: true })
  const reopened = new NoteRepository(dir), books = await reopened.listNotebooks()
  assert.equal(books.length, 2); assert.equal(books.filter(b => b.isDefault).length, 1)
  assert.equal(books.find(b => b.isDefault)!.notebookId, work.notebookId)
  assert.equal((await reopened.save({ expectedHeads: [], content })).current.notebookId, work.notebookId)
  assert.equal((await reopened.get(first.noteId)).current.notebookId, seed.notebookId)
  assert.equal((await reopened.save({ expectedHeads: [], content: { ...content, notebookId: seed.notebookId } })).current.notebookId, seed.notebookId)
  assert.equal((await reopened.listNotebooks()).find(b => b.notebookId === seed.notebookId)?.current.title, '收件箱')
})

test('legacy unfiled notes receive a stable membership without changing content, timestamps or original bytes', async t => {
  const { repo } = await fixture(t), sourceId = await repo.putSource({ original: '来源' })
  const legacy = createNoteRevision({ version: 1, noteId: ulid(), parents: [], recordedAt: '2026-11-01T00:00:00.000Z', ...content, sourceId })
  await repo.importObjects({ version: 1, revisions: [legacy], notebooks: [] })
  const note = await repo.get(legacy.noteId)
  assert.equal(note.current.notebookId, DEFAULT_NOTEBOOK_ID)
  assert.equal(note.savedAt, legacy.recordedAt); assert.equal(note.current.body, legacy.body)
  assert.equal(note.current.summary, legacy.summary); assert.deepEqual(note.current.tags, legacy.tags)
  assert.deepEqual(await repo.getSource(sourceId), { original: '来源' })
  assert.equal(await readFile(repo.files.path(`revisions/${legacy.noteId}/${legacy.revision}.json`), 'utf8'), canonical(legacy))
  const snapshot = await repo.exportObjects()
  await repo.importObjects(snapshot); assert.deepEqual(await repo.exportObjects(), snapshot)
})

test('independent initializations and default choices converge without duplicate default notebooks', async t => {
  const a = (await fixture(t)).repo, b = (await fixture(t)).repo
  assert.deepEqual(await a.exportObjects(), await b.exportObjects())
  const left = await a.saveNotebook({ title: '左', expectedHeads: [], makeDefault: true })
  const right = await b.saveNotebook({ title: '右', expectedHeads: [], makeDefault: true })
  const as = await a.exportObjects(), bs = await b.exportObjects()
  await a.importObjects(bs); await b.importObjects(as)
  const ab = await a.listNotebooks(), bb = await b.listNotebooks()
  assert.deepEqual(ab, bb); assert.equal(ab.length, 3); assert.equal(ab.filter(v => v.isDefault).length, 1)
  assert.ok([left.notebookId, right.notebookId].includes(ab.find(v => v.isDefault)!.notebookId))
})

test('removal protects the current default and stale note counts before moving any notes', async t => {
  const { repo } = await fixture(t), seed = (await repo.listNotebooks())[0]!
  await assert.rejects(repo.deleteNotebook(seed.notebookId, seed.heads), { code: 'notebook_default' })
  const book = await repo.saveNotebook({ title: '移除目标', expectedHeads: [] })
  const note = await repo.save({ expectedHeads: [], content: { ...content, notebookId: book.notebookId } })
  const before = await repo.exportObjects()
  await assert.rejects(repo.deleteNotebook(book.notebookId, book.heads, undefined, { removal: 'trash', expectedNoteCount: 0 }), { code: 'notebook_contents_changed' })
  assert.deepEqual(await repo.exportObjects(), before)
  assert.equal((await repo.get(note.noteId)).current.status, 'active')
})

for (const removal of ['move', 'trash'] as const) test(`removing a notebook with ${removal} retains sources and supports restoring notes to default`, async t => {
  const { repo } = await fixture(t), book = await repo.saveNotebook({ title: '资料', expectedHeads: [] })
  const sourceId = await repo.putSource({ text: '原始会话' })
  const note = await repo.save({ expectedHeads: [], content: { ...content, notebookId: book.notebookId, sourceId } })
  const alreadyTrashed = await repo.save({ expectedHeads: [], content: { ...content, notebookId: book.notebookId, status: 'trashed' } })
  await repo.deleteNotebook(book.notebookId, book.heads, undefined, { removal, expectedNoteCount: 1 })
  const moved = await repo.get(note.noteId)
  assert.equal(moved.current.notebookId, DEFAULT_NOTEBOOK_ID)
  assert.equal(moved.current.status, removal === 'trash' ? 'trashed' : 'active')
  assert.equal(moved.current.body, content.body); assert.equal(moved.current.sourceId, sourceId)
  assert.equal((await repo.get(alreadyTrashed.noteId)).current.status, 'trashed')
  assert.equal((await repo.getRevision(note.noteId, note.current.revision)).notebookId, book.notebookId)
  assert.deepEqual(await repo.getSource(sourceId), { text: '原始会话' })
  const restored = await repo.restore(note.noteId, moved.heads)
  assert.equal(restored.current.status, 'active'); assert.equal(restored.current.notebookId, DEFAULT_NOTEBOOK_ID)
})

test('interrupted notebook removal retains the notebook and notes and can resume after reviewing the remaining count', async t => {
  const { dir, repo } = await fixture(t), book = await repo.saveNotebook({ title: '中断', expectedHeads: [] })
  for (let i = 0; i < 2; i++) await repo.save({ expectedHeads: [], content: { ...content, notebookId: book.notebookId } })
  let writes = 0
  const failing = new NoteRepository(dir, { beforeWrite(path) { if (path.startsWith('revisions/') && ++writes === 2) throw new Error('disk full') } })
  await assert.rejects(failing.deleteNotebook(book.notebookId, book.heads, undefined, { removal: 'trash', expectedNoteCount: 2 }), /disk full/)
  const remaining = (await repo.listNotebooks()).find(b => b.notebookId === book.notebookId)!
  assert.equal(remaining.current.status, 'active'); assert.equal(remaining.noteCount, 1)
  assert.equal((await repo.list({ status: 'all' })).items.length, 2)
  await repo.deleteNotebook(book.notebookId, remaining.heads, undefined, { removal: 'trash', expectedNoteCount: remaining.noteCount! })
  assert.equal((await repo.list({ status: 'trashed' })).items.length, 2)
})
