import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer, get } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import type { NotebookApplication } from '../src/host/application.js'
import { registerHostRoutes, type HostRouteServices } from '../src/host/host-routes.js'
import { routePaths } from '../src/host/routes.js'
import { createBoundApplication } from './fixtures/bound-app.js'

async function serverFor(app: NotebookApplication, connection: HostRouteServices['connection']) {
  const routes = new Map<string, WebRoute>()
  let origin = ''
  const server = createServer((req, res) => {
    const route = routes.get(new URL(req.url!, origin).pathname)
    if (!route) { res.writeHead(404); res.end(); return }
    void route.handler(req, res)
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  const off = registerHostRoutes({ connection, webServer: {
    getOrigin: () => origin,
    register: route => { assert.ok('handler' in route); assert.equal(route.kind, 'exact'); routes.set(route.path, route); return () => { routes.delete(route.path) } },
  } }, app)
  return { origin, routes, off, close: async () => {
    off(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()))
  } }
}

test('every host route rejects before reading the body or reaching notebook services; disposal removes all routes', async () => {
  const app = new Proxy({} as NotebookApplication, { get() { assert.fail('Rejected request reached application') } })
  let status: 401 | 403 = 401, checked = 0
  const s = await serverFor(app, { requestRejection(req) {
    checked++; assert.equal('readableFlowing' in req ? req.readableFlowing : undefined, null)
    assert.ok(!(req.headers instanceof Headers))
    assert.equal(req.headers['x-access-test'], 'original-request')
    return status
  } })
  try {
    assert.equal(s.routes.size, routePaths.length)
    for (const denied of [401, 403] as const) {
      status = denied
      for (const path of routePaths) {
        const r = await fetch(s.origin + '/dsh-fatfish-notes' + path, { method: 'POST', headers: { 'x-access-test': 'original-request' }, body: 'not even JSON' })
        assert.equal(r.status, denied, path); assert.equal(r.headers.get('cache-control'), 'no-store')
        assert.equal((await r.json() as { code: string }).code, denied === 401 ? 'host_unauthorized' : 'host_forbidden')
      }
    }
    assert.equal(checked, routePaths.length * 2)
    s.off(); assert.equal(s.routes.size, 0)
    assert.equal((await fetch(s.origin + '/dsh-fatfish-notes/notes')).status, 404)
  } finally { await s.close() }
})

test('host admission preserves application reads, method and origin fences and malformed-body checks', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'fatfish-host-admission-'))
  const app = await createBoundApplication({ dir })
  const s = await serverFor(app, { requestRejection: () => undefined })
  const base = s.origin + '/dsh-fatfish-notes'
  try {
    const r = await fetch(base + '/notes'); assert.equal(r.status, 200); assert.ok(Array.isArray((await r.json() as { items: unknown[] }).items))
    for (const headers of [{ origin: 'https://evil.example' }, { origin: 'null' }, { 'sec-fetch-site': 'cross-site' }, { 'sec-fetch-site': 'same-site' }, { host: 'evil.example' }]) {
      const status = await new Promise<number | undefined>((resolve, reject) => {
        get(base + '/notes', { headers }, response => { response.resume(); response.on('end', () => resolve(response.statusCode)) }).on('error', reject)
      })
      assert.equal(status, 403, JSON.stringify(headers))
    }
    assert.equal((await fetch(base + '/notes/save')).status, 405)
    assert.equal((await fetch(base + '/notes/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'invalid JSON' })).status, 400)
    assert.equal((await fetch(base + '/notes/not-a-route')).status, 404)
  } finally { await s.close(); await app.close(); await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }) }
})

test('host access-check failure denies safely without exposing internal errors', async () => {
  const app = new Proxy({} as NotebookApplication, { get() { assert.fail('Failed check reached application') } })
  const s = await serverFor(app, { requestRejection() { throw new Error('secret internal detail') } })
  try {
    const r = await fetch(s.origin + '/dsh-fatfish-notes/notes'); assert.equal(r.status, 503)
    const text = await r.text(); assert.ok(text.includes('host_access_unavailable')); assert.ok(!text.includes('secret'))
  } finally { await s.close() }
})

test('partial host route registration is rolled back if a later registration fails', () => {
  let registered = 0, disposed = 0
  assert.throws(() => registerHostRoutes({ connection: { requestRejection: () => undefined }, webServer: {
    getOrigin: () => 'http://127.0.0.1:12345', register() {
      if (registered === 3) throw new Error('registration failed')
      registered++; return () => { disposed++ }
    },
  } }, {} as NotebookApplication), /registration failed/)
  assert.equal(disposed, registered)
})
