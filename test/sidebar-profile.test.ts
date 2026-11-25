import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, realpathSync, renameSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const runner = require.resolve('./browser/run-search-sidebar.cjs')
const { resolveIsolatedRoot } = require(runner)

test('sidebar runner uses the exact primary profile, including from a linked worktree', t => {
  const temp = mkdtempSync(join(tmpdir(), 'fatfish-qa-root-'))
  t.after(() => rmSync(temp, { recursive: true, force: true }))
  const main = join(temp, 'main')
  const worktree = join(temp, 'linked')
  const primary = join(main, '.dsh-home', 'pure-001')
  const nested = join(main, 'copy', '.dsh-home', 'pure-001')
  const external = join(temp, 'external', '.dsh-home', 'pure-001')
  for (const dir of [primary, nested, external]) mkdirSync(dir, { recursive: true })
  const git = (...args: string[]) => execFileSync('git', ['-C', main, ...args], { stdio: 'pipe' })
  git('init')
  git('-c','user.name=QA','-c','user.email=qa@example.invalid','-c','commit.gpgsign=false','commit','--allow-empty','-m','fixture')
  git('worktree','add','--detach',worktree)
  const copy = join(worktree,'.dsh-home','pure-001')
  mkdirSync(copy, { recursive: true })
  const real = realpathSync.native(primary)
  const alias = join(temp, 'profile-alias')
  symlinkSync(primary, alias, 'junction')
  for (const root of [main, worktree]) {
    assert.equal(resolveIsolatedRoot(root, {}), real)
    assert.equal(resolveIsolatedRoot(root, { FATFISH_QA_ROOT: primary }), real)
    assert.equal(resolveIsolatedRoot(root, { FATFISH_QA_ROOT: alias }), real)
    for (const other of [copy, nested, external]) {
      assert.throws(() => resolveIsolatedRoot(root, { FATFISH_QA_ROOT: other }), /主目录/)
    }
  }

  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.toLowerCase() !== 'path'))
  const withoutGit = (root: string, profile: string) => execFileSync(process.execPath, ['-e',
    'const [modulePath, root, explicit] = process.argv.slice(1); console.log(require(modulePath).resolveIsolatedRoot(root, { FATFISH_QA_ROOT: explicit }))',
    runner,root,profile], { cwd: temp, env: { ...env, PATH: temp }, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim()
  assert.equal(withoutGit(main,primary), real)
  assert.throws(() => withoutGit(main,nested), /主目录/)
  assert.throws(() => withoutGit(worktree,primary), /归属/)
  renameSync(primary, join(temp, 'original'))
  symlinkSync(external, primary, 'junction')
  assert.throws(() => resolveIsolatedRoot(main, {}), /主目录/)
})
