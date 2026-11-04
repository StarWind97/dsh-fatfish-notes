import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileLock } from '../src/git/common.js'

async function abandonedLock(path: string): Promise<void> {
  const module = new URL('../src/git/common.ts', import.meta.url).href
  const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval',
    `import { fileLock } from ${JSON.stringify(module)};
     await fileLock(process.argv[1], async () => { process.stdout.write('locked'); await new Promise(() => setInterval(() => {}, 1000)); });`, path],
  { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  const closed = once(child, 'close')
  try {
    const ready = await Promise.race([once(child.stdout, 'data'), closed.then(() => { throw new Error('Lock owner exited before locking') })])
    assert.equal(String(ready[0]), 'locked')
    assert.equal(JSON.parse(await readFile(path, 'utf8')).pid, child.pid)
  } finally { child.kill('SIGKILL'); await closed }
}

test('a killed lock owner is recovered and the next operation completes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'notebook-lock-')), path = join(root, 'repo.lock')
  try {
    await abandonedLock(path)
    assert.equal(await fileLock(path, async () => {
      assert.equal(JSON.parse(await readFile(path, 'utf8')).pid, process.pid)
      return 'synced'
    }), 'synced')
    assert.deepEqual(await readdir(root), [])
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('simultaneous recovery admits only one operation and leaves no stale lock', async () => {
  const root = await mkdtemp(join(tmpdir(), 'notebook-lock-')), path = join(root, 'repo.lock')
  try {
    await abandonedLock(path)
    let running = 0, maxRunning = 0
    const action = () => fileLock(path, async () => {
      running++; maxRunning = Math.max(maxRunning, running)
      await new Promise(resolve => setTimeout(resolve, 80)); running--
    })
    const results = await Promise.allSettled([action(), action(), action()])
    assert.equal(maxRunning, 1)
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1)
    for (const result of results) if (result.status === 'rejected') assert.equal(result.reason.code, 'repository_busy')
    assert.deepEqual(await readdir(root), [])
    await fileLock(path, async () => {})
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('live owners and unrecognizable locks are retained regardless of age', async () => {
  const root = await mkdtemp(join(tmpdir(), 'notebook-lock-')), path = join(root, 'repo.lock')
  try {
    for (const value of [JSON.stringify({ pid: process.pid, createdAt: '2000-01-01T00:00:00.000Z' }), '', '{broken', '{"pid":-1}']) {
      await writeFile(path, value)
      await assert.rejects(fileLock(path, async () => assert.fail('Must not run')), { code: 'repository_busy' })
      assert.equal(await readFile(path, 'utf8'), value)
    }
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('failed actions and cancellation release locks without admitting cancelled work', async () => {
  const root = await mkdtemp(join(tmpdir(), 'notebook-lock-')), path = join(root, 'repo.lock')
  try {
    await assert.rejects(fileLock(path, async () => { throw new Error('action failed') }), /action failed/)
    assert.deepEqual(await readdir(root), [])
    const controller = new AbortController(); controller.abort()
    await assert.rejects(fileLock(path, async () => assert.fail('Must not run'), controller.signal), { code: 'cancelled' })
    assert.deepEqual(await readdir(root), [])
    await fileLock(path, async () => {})
  } finally { await rm(root, { recursive: true, force: true }) }
})
