import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { createBoundApplication as createApplication } from './fixtures/bound-app.js'
import { createHttpHandler } from '../src/host/routes.js'

test('M7 real HTTP exports/font retain both-prefix fences, private headers, POST and 2 MiB limits', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'notes-export-http-'))
  const app = await createApplication({ dir,  })
  let origin = ''; const server = createServer((req, res) => { void createHttpHandler({ app, getOrigin: () => origin })(req, res) })
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done)); const address = server.address(); assert.ok(address && typeof address !== 'string'); origin = `http://127.0.0.1:${address.port}`
  const post = (prefix: string, path: string, body: unknown, headers: Record<string,string> = {}) => fetch(`${origin}/${prefix}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
  try {
    const note = (await app.notes.save({ expectedHeads: [], content: { title: '下载 (中文)', body: '离线正文', summary: '', tags: [], notebookId: null, status: 'active', sourceId: null, assetIds: [] } })).note
    for (const prefix of ['dsh-github-notebook']) {
      for (const path of ['/notes/export','/notes/export-font']) {
        assert.equal((await post(prefix, path, {}, { origin: 'https://evil.example' })).status, 403)
        assert.equal((await post(prefix, path, {}, { 'sec-fetch-site': 'cross-site' })).status, 403)
      }
      assert.equal((await fetch(`${origin}/${prefix}/notes/export`)).status, 405)
      assert.equal((await post(prefix, '/notes/export', { padding: 'x'.repeat(2 * 1024 * 1024) })).status, 413)
      const result = await post(prefix, '/notes/export', { noteId: note.noteId, revision: note.current.revision, format: 'markdown' })
      assert.equal(result.status, 200); assert.equal(result.headers.get('cache-control'), 'no-store'); assert.equal(result.headers.get('x-content-type-options'), 'nosniff'); assert.ok(result.headers.get('content-disposition')?.startsWith("attachment; filename*=UTF-8''")); assert.ok((await result.text()).includes('离线正文'))
    }
    const font = await fetch(`${origin}/dsh-github-notebook/notes/export-font`)
    assert.equal(font.status, 200); assert.equal(font.headers.get('content-type'), 'font/otf'); assert.equal((await font.arrayBuffer()).byteLength, 16437364)
    const invalid = await post('dsh-github-notebook', '/notes/export', { noteId: note.noteId, revision: note.current.revision, format: 'original', assetId: 'C:/secret.png' }), text = await invalid.text()
    assert.equal(invalid.status, 400); assert.ok(text.includes('export_image_missing')); assert.ok(!text.includes(dir)); assert.ok(!text.includes('C:/secret'))
  } finally { server.closeAllConnections(); await new Promise<void>(done => server.close(() => done())); await app.close(); await rm(dir, { recursive: true, force: true }) }
})
