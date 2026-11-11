import { spawn } from 'node:child_process'
import { lstat, mkdtemp, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { NotebookError } from '../domain/errors.js'
import { isRecord } from '../domain/record.js'
import { normalizeRemoteUrl, validBranch } from '../domain/repo.js'
import { cancelled, digest, directory, fileLock, hasCode, noSymlinks } from './common.js'
import type { ChangeSet, GitSnapshot, GitTarget, Reconciliation, RepositoryInspection, TreeEntry } from './types.js'

export interface GitRunOptions { cwd?: string; input?: string | Uint8Array; env?: NodeJS.ProcessEnv; signal?: AbortSignal; timeoutMs?: number; allowFailure?: boolean; outputBytes?: boolean; maxOutputBytes?: number }
export interface GitRunResult { stdout: string; bytes?: Buffer; exitCode: number }
export type GitRunner = (args: readonly string[], options?: GitRunOptions) => Promise<GitRunResult>
/** Only call with non-secret Git commands. Child output is never included in errors or persisted. */
export const runGit: GitRunner = async (args, options = {}) => {
  cancelled(options.signal)
  const inherited: NodeJS.ProcessEnv = { ...process.env }
  // Authentication settings remain Git's responsibility; only repository-routing overrides
  // are removed so ambient shell state cannot redirect writes out of the dedicated clone.
  for (const key of Object.keys(inherited)) if (['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_NAMESPACE'].includes(key.toUpperCase())) delete inherited[key]
  return new Promise((resolveResult, reject) => {
    const command = process.platform === 'win32' ? ['-c','core.longpaths=true',...args] : [...args]
    const child = spawn('git', command, { cwd: options.cwd, env: { ...inherited, GIT_TERMINAL_PROMPT: '0', ...options.env }, detached: process.platform !== 'win32', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
    const chunks: Buffer[] = []
    let bytes = 0, aborted = false, timedOut = false, overflow = false
    let stopping = false
    const terminate = () => {
      if (stopping || !child.pid) return
      stopping = true
      if (process.platform === 'win32') {
        const killer = spawn(join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe'), ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
        killer.on('error', () => { child.kill('SIGKILL') })
      } else {
        try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') }
      }
    }
    // Keep the repository lock until descendants release the pipes. A cancelled push is
    // still reconciled later: killing the client cannot prove the remote did not accept it.
    const abort = () => { aborted = true; terminate() }
    const timeout = setTimeout(() => { timedOut = true; terminate() }, options.timeoutMs ?? 60_000)
    options.signal?.addEventListener('abort', abort, { once: true })
    const cleanup = () => { clearTimeout(timeout); options.signal?.removeEventListener('abort', abort) }
    child.stdout.on('data', (chunk: Buffer) => { bytes += chunk.length; if (bytes > (options.maxOutputBytes ?? 16 * 1024 * 1024)) { overflow = true; terminate() } else chunks.push(chunk) })
    child.stderr.on('data', () => { /* Never reflect remote/helper messages, URLs, or possible credentials. */ })
    child.stdin.on('error', () => { /* The exit/error event supplies a safe result. */ })
    child.on('error', () => { cleanup(); reject(new NotebookError('git_unavailable', '无法启动 Git，请检查本机 Git 安装及运行权限', 503)) })
    child.on('close', code => {
      cleanup()
      if (aborted) reject(new NotebookError('cancelled', 'Git 操作已取消', 499))
      else if (timedOut) reject(new NotebookError('git_timeout', 'Git 操作超时，提交状态需核对', 504))
      else if (overflow) reject(new NotebookError('git_output_limit', 'Git 返回内容超过安全读取上限'))
      else if (code !== 0 && !options.allowFailure) reject(new NotebookError('git_failed', 'Git 操作失败，请检查仓库、网络及本机 Git 授权', 502))
      else { const output = Buffer.concat(chunks); resolveResult({ stdout: options.outputBytes ? '' : output.toString('utf8'), ...(options.outputBytes ? { bytes: output } : {}), exitCode: code ?? -1 }) }
    })
    child.stdin.end(options.input ?? '')
    if (options.signal?.aborted) abort()
  })
}
export interface GitBackendOptions { rootDir: string; remote: string; branch?: string; allowLocal?: boolean; runner?: GitRunner; timeoutMs?: number; githubCliAuth?: boolean }
export function createGitBackend(options: GitBackendOptions): GitBackend { return new GitBackend(options) }
export class GitBackend {
  readonly kind = 'git'
  readonly target: GitTarget
  readonly directory: string
  private readonly root: string
  private readonly runner: GitRunner
  private readonly timeoutMs: number
  constructor(private readonly options: GitBackendOptions) {
    const normalized = normalizeRemoteUrl(options.remote, { allowLocal: options.allowLocal ?? false })
    const branch = options.branch ?? normalized.ref.branch
    if (!validBranch(branch)) throw new NotebookError('invalid_branch', '分支名称无效')
    const ref = { ...normalized.ref, branch }
    const repositoryKey = normalized.local ? normalized.url : `github:${ref.owner.toLowerCase()}/${ref.repo.toLowerCase()}`
    this.target = { ref, remote: normalized.url, repositoryKey, key: `${repositoryKey}@${branch}` }
    this.root = resolve(options.rootDir); this.directory = join(this.root, digest(repositoryKey))
    this.runner = options.runner ?? runGit; this.timeoutMs = options.timeoutMs ?? 60_000
  }
  private git(args: readonly string[], signal?: AbortSignal, extra: GitRunOptions = {}): Promise<GitRunResult> {
    return this.runner(args, { cwd: this.directory, timeoutMs: this.timeoutMs, ...extra, ...(signal ? { signal } : {}) })
  }
  async exclusive<T>(action: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    await directory(this.root)
    return fileLock(join(this.root, `${digest(this.target.repositoryKey)}.lock`), async () => {
      await this.ensure(signal)
      if(this.options.githubCliAuth){await this.git(['config','--local','--replace-all','credential.https://github.com.helper',''],signal);await this.git(['config','--local','--add','credential.https://github.com.helper','!gh auth git-credential'],signal)}
      return action()
    }, signal)
  }
  private async ensure(signal?: AbortSignal): Promise<void> {
    cancelled(signal); await noSymlinks(this.directory)
    let exists = true
    try { await lstat(this.directory) } catch (error) { if (hasCode(error, 'ENOENT')) exists = false; else throw error }
    if (!exists) {
      // Publish only a completely validated clone at the canonical path. Interrupted
      // setup remains in its unique staging directory, never blocking a same-target
      // retry. Preserve failed staging rather than recursively deleting uncertain data.
      const staging = await mkdtemp(`${this.directory}.initializing-`)
      await noSymlinks(staging)
      await this.git(['init', '--initial-branch=dsh-unused'], signal, { cwd: staging })
      await noSymlinks(join(staging, '.git'))
      await this.checkObjectDirectory(join(staging, '.git'))
      await this.git(['remote', 'add', 'origin', this.target.remote], signal, { cwd: staging })
      await writeFile(join(staging, '.git', 'dsh-owner.json'), JSON.stringify({ version: 1, remote: this.target.remote }), { flag: 'wx', mode: 0o600 })
      await this.validateRepository(staging, signal)
      cancelled(signal)
      await noSymlinks(this.directory)
      // A directory appearing during setup belongs to someone else, even if empty.
      try { await lstat(this.directory); throw new NotebookError('unowned_repository', '此目录不是已验证的插件专用仓库，已保留原内容') }
      catch (error) { if (!hasCode(error, 'ENOENT')) throw error }
      await rename(staging, this.directory)
      return
    }
    await this.validateRepository(this.directory, signal)
  }
  private async validateRepository(path: string, signal?: AbortSignal): Promise<void> {
    await noSymlinks(join(path, '.git'))
    let owner: unknown
    try { owner = JSON.parse(await readFile(join(path, '.git', 'dsh-owner.json'), 'utf8')) }
    catch { throw new NotebookError('unowned_repository', '此目录不是已验证的插件专用仓库，已保留原内容') }
    if (!isRecord(owner) || owner.version !== 1 || typeof owner.remote !== 'string' || Object.keys(owner).length !== 2) throw new NotebookError('repository_mismatch', '专用仓库来源与当前目标不匹配')
    // Ownership is pinned to the original origin. The selected transport may change
    // only within the same canonical repository; never rewrite the marker or origin.
    let ownedKey: string
    try {
      const owned = normalizeRemoteUrl(owner.remote, { allowLocal: true })
      ownedKey = owned.local ? owned.url : `github:${owned.ref.owner.toLowerCase()}/${owned.ref.repo.toLowerCase()}`
    } catch { throw new NotebookError('repository_mismatch', '专用仓库来源无效') }
    if (ownedKey !== this.target.repositoryKey) throw new NotebookError('repository_mismatch', '专用仓库来源与当前目标不匹配')
    await this.checkObjectDirectory(join(path, '.git'))
    const origin = (await this.git(['remote', 'get-url', 'origin'], signal, { cwd: path })).stdout.trim()
    if (origin !== owner.remote) throw new NotebookError('repository_mismatch', '专用仓库 origin 与所有权记录不匹配')
    // The object workspace deliberately has no checkout. Any user-created file is unknown, even ignored files.
    if ((await readdir(path)).some(name => name !== '.git') || (await this.git(['status', '--porcelain=v1', '--untracked-files=all'], signal, { cwd: path })).stdout.trim()) throw new NotebookError('dirty_repository', '专用仓库存在未知修改，已停止且不会清理这些内容', 409)
  }
  private async checkObjectDirectory(path: string): Promise<void> {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new NotebookError('unsafe_path', 'Git 专用目录内部包含符号链接，已停止操作')
      if (entry.isDirectory()) await this.checkObjectDirectory(join(path, entry.name))
    }
  }
  private async head(signal?: AbortSignal): Promise<string | null> {
    const output = (await this.git(['ls-remote', '--heads', this.target.remote], signal)).stdout
    const refs = output.trim().split(/\r?\n/).filter(Boolean).map(line => line.split(/\s+/))
    const selected = refs.find(parts => parts[1] === `refs/heads/${this.target.ref.branch}`)?.[0]
    if (!selected) {
      if (refs.length) throw new NotebookError('ref_not_found', '仓库存在，但指定分支不存在', 404)
      return null
    }
    await this.git(['fetch', '--no-tags', this.target.remote, `refs/heads/${this.target.ref.branch}`], signal)
    return this.sha((await this.git(['rev-parse', 'FETCH_HEAD^{commit}'], signal)).stdout.trim())
  }
  private sha(value: string): string { if (!/^[a-f0-9]{40,64}$/.test(value)) throw new NotebookError('invalid_revision', 'Git 返回的提交标识无效'); return value }
  async inspect(signal?: AbortSignal): Promise<RepositoryInspection> {
    const revision = await this.head(signal)
    return { available: true, readable: true, write: 'unverified', initialized: revision !== null }
  }
  async snapshot(signal?: AbortSignal, atRevision?: string): Promise<GitSnapshot> {
    const revision = atRevision ? this.sha(atRevision) : await this.head(signal)
    const entries = new Map<string, TreeEntry>()
    let treeSha: string | null = null
    if (revision) {
      treeSha = this.sha((await this.git(['rev-parse', `${revision}^{tree}`], signal)).stdout.trim())
      const tree = (await this.git(['ls-tree', '-r', '-t', '-z', revision], signal)).stdout
      for (const record of tree.split('\0').filter(Boolean)) {
        const match = /^(\d+) (\w+) ([a-f0-9]+)\t([\s\S]+)$/.exec(record)
        if (!match?.[1] || !match[2] || !match[3] || !match[4]) throw new NotebookError('invalid_tree', 'Git 文件树格式无效')
        entries.set(match[4], { mode: match[1], type: match[2], sha: match[3] })
      }
    }
    const snapshot: GitSnapshot = { revision, treeSha, entries }
    return snapshot
  }
  async readFile(snapshot: GitSnapshot, path: string, signal?: AbortSignal): Promise<string> {
    const entry = snapshot.entries.get(path)
    if (!entry) throw new NotebookError('file_not_found', '指定版本中没有此文件', 404)
    if (entry.type !== 'blob' || !['100644', '100755'].includes(entry.mode)) throw new NotebookError('unsafe_path', '同步路径不是普通文件')
    return (await this.git(['cat-file', 'blob', this.sha(entry.sha)], signal)).stdout
  }
  /** Explicit byte path for bounded private objects; text reads keep a separate size limit. */
  async readBytes(snapshot: GitSnapshot, path: string, limit: number, signal?: AbortSignal): Promise<Buffer> {
    const entry = snapshot.entries.get(path)
    if (!entry || entry.type !== 'blob' || !['100644', '100755'].includes(entry.mode)) throw new NotebookError('unsafe_path', '同步对象缺失或不是普通文件')
    if (!Number.isSafeInteger(limit) || limit < 0 || limit > 512 * 1024 * 1024) throw new NotebookError('note_limit', '同步对象读取上限无效')
    const size = Number((await this.git(['cat-file', '-s', this.sha(entry.sha)], signal)).stdout.trim())
    if (!Number.isSafeInteger(size) || size < 0 || size > limit) throw new NotebookError('note_limit', '同步对象超过读取上限')
    const result = await this.git(['cat-file', 'blob', this.sha(entry.sha)], signal, { outputBytes: true, maxOutputBytes: limit })
    if (!result.bytes || result.bytes.length !== size) throw new NotebookError('note_corrupt', '同步对象字节读取不完整')
    return result.bytes
  }
  /** One bounded Git process for immutable objects, including binary attachments. */
  async readBatch(snapshot: GitSnapshot, requests: ReadonlyMap<string, number>, limit: number, signal?: AbortSignal): Promise<Map<string, Buffer>> {
    const rows = [...requests].map(([path, max]) => {
      const entry = snapshot.entries.get(path)
      if (!entry || entry.type !== 'blob' || !['100644','100755'].includes(entry.mode)) throw new NotebookError('unsafe_path','同步对象缺失或不是普通文件')
      if (!Number.isSafeInteger(max) || max < 0 || max > 512 * 1024 * 1024) throw new NotebookError('note_limit','同步对象读取上限无效')
      return {path,max,sha:this.sha(entry.sha)}
    })
    if (!Number.isSafeInteger(limit) || limit < 0 || limit > 512 * 1024 * 1024) throw new NotebookError('note_limit','同步对象读取上限无效')
    const files = new Map<string,Buffer>()
    if (!rows.length) return files
    const result = await this.git(['cat-file','--batch'],signal,{input:rows.map(r=>r.sha+'\n').join(''),outputBytes:true,maxOutputBytes:Math.min(limit,rows.reduce((n,r)=>n+r.max,0))+rows.length*100})
    const bytes = result.bytes
    if (!bytes) throw new NotebookError('note_corrupt','同步对象读取不完整')
    let offset=0,total=0
    for (const row of rows) {
      const end=bytes.indexOf(10,offset)
      if (end<offset || end-offset>98) throw new NotebookError('note_corrupt','同步对象头无效')
      const header=/^([a-f0-9]{40,64}) blob (\d+)$/.exec(bytes.toString('ascii',offset,end)),size=Number(header?.[2])
      if (!header || header[1]!==row.sha || !Number.isSafeInteger(size)) throw new NotebookError('note_corrupt','同步对象头无效')
      total+=size
      if (size>row.max || total>limit) throw new NotebookError('note_limit','同步对象超过读取上限')
      offset=end+1
      if (offset+size>=bytes.length || bytes[offset+size]!==10) throw new NotebookError('note_corrupt','同步对象读取不完整')
      files.set(row.path,bytes.subarray(offset,offset+size));offset+=size+1
    }
    if (offset!==bytes.length) throw new NotebookError('note_corrupt','同步对象包含多余数据')
    return files
  }
  async commit(snapshot: GitSnapshot, change: ChangeSet, _operationId: string, signal?: AbortSignal): Promise<string> {
    const index = join(this.directory, '.git', `dsh-index-${randomUUID()}`)
    const extra: GitRunOptions = { env: { GIT_INDEX_FILE: index } }
    try {
      await this.git(['read-tree', snapshot.revision ?? '--empty'], signal, extra)
      for (const [path, content] of change.files) {
        if (content === null) await this.git(['update-index', '--force-remove', '--', path], signal, extra)
        else {
          const blob = this.sha((await this.git(['hash-object', '-w', '--stdin'], signal, { input: typeof content==='function'?await content():content })).stdout.trim())
          await this.git(['update-index', '--add', '--cacheinfo', `100644,${blob},${path}`], signal, extra)
        }
      }
      const tree = this.sha((await this.git(['write-tree'], signal, extra)).stdout.trim())
      const identity: string[] = []
      for (const [key, fallback] of [['user.name', 'dsh-fatfish-notes'], ['user.email', 'dsh-fatfish-notes@users.noreply.github.com']]) {
        if (!key || !fallback) continue
        const configured = await this.git(['config', '--get', key], signal, { allowFailure: true })
        if (configured.exitCode !== 0 && configured.exitCode !== 1) throw new NotebookError('git_identity_failed', '无法读取本机 Git 提交身份配置')
        if (!configured.stdout.trim()) identity.push('-c', `${key}=${fallback}`)
      }
      const commit = this.sha((await this.git([...identity, 'commit-tree', tree, ...(snapshot.revision ? ['-p', snapshot.revision] : []), '-m', '同步私人笔记\n\n同步笔记、选材及归档图片。'], signal)).stdout.trim())
      await this.git(['update-ref', `refs/dsh/transactions/${commit}`, commit], signal)
      return commit
    } finally { await unlink(index).catch(error => { if (!hasCode(error, 'ENOENT')) throw error }) }
  }
  async push(commitSha: string, parent: string | null, signal?: AbortSignal): Promise<void> {
    if (await this.head(signal) !== parent) throw new NotebookError('revision_conflict', '远端分支已变化', 409)

    const ref='refs/heads/'+this.target.ref.branch
    const parents=(await this.git(['show','-s','--format=%P',this.sha(commitSha)],signal)).stdout.trim()
    if(parents!==(parent??''))throw new NotebookError('revision_conflict','待推送修订与预期父提交不一致',409)
    await this.git(['push','--force-with-lease='+ref+':'+(parent??''), this.target.remote, `${this.sha(commitSha)}:refs/heads/${this.target.ref.branch}`], signal)
  }
  async reconcile(commitSha: string, signal?: AbortSignal): Promise<Reconciliation> {
    try {
      const revision = await this.head(signal)
      if (revision === commitSha) return { state: 'synced', revision }
      if (!revision) return { state: 'pending', revision }
      const result = await this.git(['merge-base', '--is-ancestor', this.sha(commitSha), revision], signal, { allowFailure: true })
      if (result.exitCode === 0) return { state: 'synced', revision }
      if (result.exitCode === 1) return { state: 'pending', revision }
      return { state: 'unknown' }
    } catch { return { state: 'unknown' } }
  }
}
