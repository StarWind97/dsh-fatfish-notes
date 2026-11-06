import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { fixture, request } from './fixtures/notes-capture.js'
import { createBoundApplication as createApplication } from './fixtures/bound-app.js'
import { createHttpHandler } from '../src/host/routes.js'
import type { NoteContent, NoteView, NoteListResult, NotebookView } from '../src/contracts/notes.js'
import { NotesApplication } from '../src/host/notes.js'

const content = (body = '  原文\r\n\n'): NoteContent => ({ title: 'Local', body, summary: '', tags: ['中文'], notebookId: null, status: 'active', sourceId: null, assetIds: [] })
test('M5 real HTTP local library CRUD, notebooks, source assets and route-specific request budget', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'notes-library-host-'))
  const app = await createApplication({ dir,  })
  let origin = ''; const server = createServer((req, res) => { void createHttpHandler({ app, getOrigin: () => origin })(req, res) })
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done)); const address = server.address(); assert.ok(address && typeof address !== 'string'); origin = `http://127.0.0.1:${address.port}`
  const post = (path: string, body: unknown, headers: Record<string, string> = {}, prefix = 'dsh-fatfish-notes') => fetch(`${origin}/${prefix}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
  const get = (path: string) => fetch(`${origin}/dsh-fatfish-notes${path}`)
  try {
    for (const prefix of ['dsh-fatfish-notes']) {
      for (const path of ['/notes','/notes/save','/notes/trash','/notes/restore','/notes/resolve','/notes/notebook','/notes/notebooks','/notes/jobs','/notes/asset']) {
        assert.equal((await post(path, {}, { origin: 'https://evil.example' }, prefix)).status, 403)
        assert.equal((await post(path, {}, { 'sec-fetch-site': 'cross-site' }, prefix)).status, 403)
      }
      assert.equal((await post('/notes/save', { padding: 'x'.repeat(12 * 1024 * 1024) }, {}, prefix)).status, 413)
      assert.equal((await post('/notes/resolve', { padding: 'x'.repeat(2 * 1024 * 1024) }, {}, prefix)).status, 413)
      assert.equal((await post('/notes/capture', { padding: 'x'.repeat(2 * 1024 * 1024) }, {}, prefix)).status, 413)
      assert.equal((await post('/config', { padding: 'x'.repeat(2 * 1024 * 1024) }, {}, prefix)).status, 404)
    }
    const created = await post('/notes/save', { expectedHeads: [], content: content() }); assert.equal(created.status, 200)
    let note = (await created.json() as { note: NoteView }).note; assert.equal(note.current.body, content().body)
    const books = await (await post('/notes/notebook', { expectedHeads: [], title: '工作笔记' })).json() as { notebooks: NotebookView[] }, book = books.notebooks[0]!
    const moved = await post('/notes/save', { noteId: note.noteId, expectedHeads: note.heads, content: { ...content(), notebookId: book.notebookId } }); assert.equal(moved.status, 200); note = (await moved.json() as { note: NoteView }).note
    const list = await (await get(`/notes?query=${encodeURIComponent('原文')}&tag=${encodeURIComponent('中文')}&notebookId=${book.notebookId}&limit=1`)).json() as NoteListResult; assert.equal(list.items.length, 1)
    assert.equal((await post('/notes/save', { noteId: note.noteId, expectedHeads: [], content: content('stale') })).status, 409)
    await post('/notes/notebook', { notebookId: book.notebookId, expectedHeads: book.heads, title: book.current.title, remove: true })
    note = (await (await get(`/notes/get?noteId=${note.noteId}`)).json() as { note: NoteView }).note; assert.equal(note.effectiveNotebookId, null)
    const bigBody = 'a'.repeat(3 * 1024 * 1024), large = await post('/notes/save', { noteId: note.noteId, expectedHeads: note.heads, content: content(bigBody), resolve: true }); assert.equal(large.status, 200)
    note = (await large.json() as { note: NoteView }).note; assert.equal(note.current.body, bigBody)
    const trashed = await post('/notes/trash', { noteId: note.noteId, expectedHeads: note.heads }); assert.equal(trashed.status, 200); note = (await trashed.json() as { note: NoteView }).note
    assert.equal((await (await get('/notes')).json() as NoteListResult).items.length, 0)
    assert.equal((await (await get('/notes?status=trashed')).json() as NoteListResult).items.length, 1)
    const restored = await post('/notes/restore', { noteId: note.noteId, expectedHeads: note.heads }); assert.equal(restored.status, 200); note = (await restored.json() as { note: NoteView }).note
    const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'), asset = await app.notes.repository.putAsset(bytes, 'image/png')
    const sourceId = await app.notes.repository.putSource({ assets: { attachment: asset.id }, messages: [] })
    const upload={noteId:note.noteId,base64:bytes.toString('base64'),mediaType:'image/png'}
    assert.equal((await get('/notes/image')).status,405)
    assert.equal((await post('/notes/image',upload,{origin:'https://other.example'})).status,403)
    const draftId='01M6PAPER00000000000000002'
    assert.equal((await post('/notes/image',{...upload,noteId:draftId,draft:true})).status,200)
    assert.notEqual((await post('/notes/get',{noteId:draftId})).status,200)
    const imported=await post('/notes/image',upload)
    assert.equal(imported.status,200)
    assert.equal((await imported.json() as {asset:{id:string}}).asset.id,asset.id)
    assert.notEqual((await post('/notes/image',{...upload,mediaType:'image/jpeg'})).status,200)
    assert.notEqual((await post('/notes/image',{noteId:note.noteId,url:'https://127.0.0.1/private.png'})).status,200)
    const imageNote = (await app.notes.save({ expectedHeads: [], content: { ...content(`![图](../assets/${asset.id})`), sourceId, assetIds: [asset.id] } })).note
    const query = new URLSearchParams({ noteId: imageNote.noteId, revision: imageNote.current.revision, assetId: asset.id })
    const image = await get(`/notes/asset?${query}`); assert.equal(image.status, 200); assert.equal(image.headers.get('content-type'), 'image/png'); assert.deepEqual(Buffer.from(await image.arrayBuffer()), bytes)
    query.set('sourceId', sourceId); assert.equal((await get(`/notes/asset?${query}`)).status, 200)
    query.set('sourceId', 'a'.repeat(64)); assert.equal((await get(`/notes/asset?${query}`)).status, 404)
    query.delete('sourceId'); query.set('noteId', note.noteId); query.set('revision', note.current.revision); assert.equal((await get(`/notes/asset?${query}`)).status, 404)
    query.set('assetId', '../../secret'); assert.notEqual((await get(`/notes/asset?${query}`)).status, 200)
    assert.equal((await fetch(`${origin}/dsh-fatfish-notes/notes/asset?${query}`, { headers: { 'sec-fetch-site': 'cross-site' } })).status, 403)
    const restarted = new NotesApplication(app.personalState().sync.folder, () => undefined)
    try { assert.equal((await restarted.get({ noteId: note.noteId })).note.current.body, bigBody) } finally { await restarted.close() }
  } finally { server.closeAllConnections(); await new Promise<void>(done => server.close(() => done())); await app.close(); await rm(dir, { recursive: true, force: true }) }
})
test('M5 durable note-to-job discovery survives facade restart without browser storage; response hides stage inputs', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'notes-jobs-')), f = fixture(), app = new NotesApplication(dir, () => f.controller)
  try {
    const captured = await app.capture({ ...request, autoMetadata: true }); await app.close()
    const restarted = new NotesApplication(dir, () => f.controller)
    try {
      const result = await restarted.jobs({ noteId: captured.note.noteId })
      assert.equal(result.jobs.length, 1); assert.equal(result.jobs[0]!.jobId, captured.enrichmentJobId); assert.equal(result.cursor, null)
      assert.ok(result.jobs[0]!.stages.every(stage => !('input' in stage))); assert.equal((await restarted.jobs({ noteId: '01K00000000000000000000000' })).jobs.length, 0)
      for (let i = 0; i < 5; i++) await restarted.enrichment.ensure({ ...request, requestId: `job-extra-${i}`, autoMetadata: true }, captured, new AbortController().signal)
      const first = await restarted.jobs({ noteId: captured.note.noteId }); assert.equal(first.jobs.length, 5); assert.ok(first.cursor)
      const next = await restarted.jobs({ noteId: captured.note.noteId, cursor: first.cursor }); assert.equal(next.jobs.length, 1); assert.equal(next.cursor, null)
      assert.ok(!first.jobs.some(job => job.jobId === next.jobs[0]!.jobId))
    } finally { await restarted.close() }
  } finally { await app.close(); await rm(dir, { recursive: true, force: true }) }
})
