import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { NotebookError } from '../domain/errors.js';
import { isRecord } from '../domain/record.js';
import { cancelled } from '../git/common.js';
import { createGitBackend, runGit } from '../git/backend.js';
import { checkFolder, distinctFolder, emptyFolder, folderMarker, folderPath, markFolder, prepareFolder, readFolderIdentity, suggestedFolder, verifyRememberedFolder } from './folder.js';
import { missing, replaceFile } from '../notes/files.js';
import { copyForMove } from './move.js';
import { DEFAULT_PRIVATE_REPO_NAME } from '../contracts/personal.js';
import { NotesSyncModule, noteSyncError } from '../notes/sync.js';
import { NoteRepository } from '../notes/repository.js';
const MANIFEST = 'notebook.json';
const SCOPE = ['笔记和笔记本（含回收站）', '原始选材与归档图片'];
const PAUSE = new Set(['note_version', 'note_sync_invalid', 'personal_account_changed', 'personal_repository_changed', 'personal_repository_public', 'personal_repository_unrelated', 'unsupported_personal_version', 'invalid_personal_data', 'personal_data_limit', 'personal_subscription_limit', 'invalid_personal_manifest', 'github_account_invalid', 'github_repository_forbidden']);
function fail(code, message, status = 409) {
    throw new NotebookError(code, message, status);
}
function record(input, allowed) {
    if (!isRecord(input) || Object.keys(input).some(k => !allowed.includes(k)))
        fail('invalid_request', '私人笔记请求格式无效', 400);
    return input;
}
function account(input) {
    return isRecord(input) && Object.keys(input).length === 2 && typeof input.login === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(input.login) && Number.isSafeInteger(input.id) && Number(input.id) > 0;
}
function binding(input) {
    return isRecord(input) && Object.keys(input).length === 3 && account(input.account) && typeof input.repo === 'string' && /^[a-zA-Z0-9_.-]{1,100}$/.test(input.repo) && Number.isSafeInteger(input.repositoryId) && Number(input.repositoryId) > 0;
}
function locationOf(bound, folder) {
    return { ownerId: bound.account.id, repositoryId: bound.repositoryId, folder };
}
function remember(locations = [], current) {
    return [...locations.filter(l => l.repositoryId !== current.repositoryId && relative(l.folder, current.folder) !== ''), current];
}
function validateConfig(input, home) {
    if (!isRecord(input) || input.version !== 1 || typeof input.enabled !== 'boolean' || typeof input.initializing !== 'boolean' || (input.binding !== null && !binding(input.binding)) || (input.lastSuccessAt !== null && (typeof input.lastSuccessAt !== 'string' || !Number.isFinite(Date.parse(input.lastSuccessAt)))) || !Object.hasOwn(input, 'preview'))
        fail('personal_config_invalid', '笔记同步设置损坏；原文件已保留', 500);
    if (input.preview !== null) {
        const p = input.preview;
        if (isRecord(p))
            p.folder = folderPath(home, p.folder ?? home);
        if (!isRecord(p) || typeof p.id !== 'string' || !account(p.account) || typeof p.repo !== 'string' || !/^[a-zA-Z0-9_.-]{1,100}$/.test(p.repo) || typeof p.exists !== 'boolean' || (p.repositoryId !== null && (!Number.isSafeInteger(p.repositoryId) || Number(p.repositoryId) <= 0)) || typeof p.creationAttempted !== 'boolean' || !Array.isArray(p.dataScope) || JSON.stringify(p.dataScope) !== JSON.stringify(SCOPE))
            fail('personal_config_invalid', '笔记同步预览损坏；原文件已保留', 500);
    }
    if (input.folder !== undefined)
        input.folder = folderPath(home, input.folder);
    if (input.locations !== undefined) {
        if (!Array.isArray(input.locations) || input.locations.some(v => !isRecord(v) || !Number.isSafeInteger(v.ownerId) || Number(v.ownerId) <= 0 || !Number.isSafeInteger(v.repositoryId) || Number(v.repositoryId) <= 0))
            fail('personal_config_invalid', '本机笔记库位置记录无效', 500);
        for (const item of input.locations)
            item.folder = folderPath(home, item.folder);
    }
    if (input.paused !== undefined && input.paused !== null &&
        (!isRecord(input.paused) || typeof input.paused.code !== 'string' ||
            !PAUSE.has(input.paused.code) || typeof input.paused.message !== 'string' || input.paused.message.length > 500)) {
        fail('personal_config_invalid', '笔记同步暂停状态无效；原文件已保留', 500);
    }
    if ((input.notesConsent !== undefined && typeof input.notesConsent !== 'boolean') || (input.notesAcknowledged !== undefined && input.notesAcknowledged !== null && (typeof input.notesAcknowledged !== 'string' || !/^[a-f0-9]{64}$/.test(input.notesAcknowledged))))
        fail('personal_config_invalid', '笔记同步设置无效；原文件已保留', 500);
    return structuredClone({ ...input, notesConsent: input.notesConsent ?? false, notesAcknowledged: input.notesAcknowledged ?? null, paused: input.paused ?? null });
}
function safe(error) {
    return error instanceof NotebookError ? error : new NotebookError('personal_sync_failed', '私人笔记同步未完成；本机记录已保留，请检查网络后重试', 502);
}
/** Owns only scheduling/transport. Mutations stay independent of the network lock. */
export class PrivateWorkspaceSync {
    options;
    stagingFile;
    returning;
    config = { version: 1, notesConsent: false, notesAcknowledged: null, enabled: false, binding: null, lastSuccessAt: null, initializing: false, paused: null, preview: null };
    file;
    notes;
    controller = new AbortController();
    pending = null;
    controls = Promise.resolve();
    writing = Promise.resolve();
    timer = null;
    error = null;
    failures = 0;
    closed = false;
    loaded = false;
    admitted = false;
    changing = false;
    candidate = null;
    loginState = 'idle';
    loginTask = null;
    deviceCode = null;
    now;
    constructor(options, stagingFile, returning) {
        this.options = options;
        this.stagingFile = stagingFile;
        this.returning = returning;
        this.notes = new NotesSyncModule(options.notes, () => this.changed());
        this.file = stagingFile ?? join(options.dir, 'backup', 'sync.json');
        this.now = options.now ?? Date.now;
    }
    async load() {
        if (this.loaded)
            return;
        try {
            this.config = validateConfig(JSON.parse(await readFile(this.file, 'utf8')), this.options.dir);
        }
        catch (error) {
            if (error?.code !== 'ENOENT') {
                if (error instanceof NotebookError)
                    throw error;
                fail('personal_config_invalid', '无法读取笔记同步设置；原文件已保留', 500);
            }
        }
        if (this.config.binding) {
            const folder = this.config.folder ?? this.options.dir;
            await checkFolder(this.options.dir, folder, true);
            if (!this.stagingFile && !this.config.initializing && this.config.lastSuccessAt) {
                const loc = locationOf(this.config.binding, folder);
                if (this.config.locations?.some(l => l.repositoryId === loc.repositoryId && l.ownerId === loc.ownerId && !relative(l.folder, folder))) {
                    await verifyRememberedFolder(this.options.dir, loc);
                }
                else {
                    // An older installation can vouch for its active binding only.
                    await markFolder(loc);
                    this.config.locations = remember(this.config.locations, loc);
                    await this.persist();
                }
            }
            this.options.notes.useDirectory(folder);
            // A previously disabled installation needs fresh user confirmation.
            if (this.config.enabled && !this.stagingFile) {
                try {
                    await this.notes.initialize();
                }
                catch (error) {
                    const failure = noteSyncError(error);
                    this.config.paused = { code: failure.code, message: failure.message };
                }
            }
        }
        this.admitted = !!(this.config.binding && this.config.enabled && this.config.notesConsent && this.config.lastSuccessAt && !this.config.initializing);
        this.loaded = true;
        if (this.config.paused) {
            this.error = new NotebookError(this.config.paused.code, this.config.paused.message, 409);
        }
        if (this.config.enabled && this.isPending() && this.canSchedule())
            this.schedule(this.options.batchMs ?? 5000);
    }
    persist(config = this.config) {
        const result = this.writing.then(async () => {
            const temp = `${this.file}.${randomUUID()}.tmp`;
            try {
                await mkdir(join(this.options.dir, 'backup'), { recursive: true });
                await writeFile(temp, JSON.stringify(config), { mode: 0o600 });
                await replaceFile(temp, this.file);
            }
            catch {
                fail('personal_config_persist_failed', '笔记同步设置保存失败；请重试', 500);
            }
            finally {
                await rm(temp, { force: true }).catch(() => {
                });
            }
        });
        this.writing = result.catch(() => {
        });
        return result;
    }
    control(action) {
        const result = this.controls.then(() => {
            this.ensureOpen();
            return action();
        });
        this.controls = result.catch(() => {
        });
        return result;
    }
    ensureOpen() {
        if (this.closed)
            fail('closed', '笔记同步服务已关闭', 503);
    }
    isPending() {
        return this.config.initializing || (this.config.notesConsent && this.notes.pending(this.config.notesAcknowledged));
    }
    get ready() {
        return this.admitted && !this.changing;
    }
    get changingLocation() { return this.changing; }
    async tools(signal) {
        const [git, gh] = await Promise.all([
            (this.options.gitRunner ?? runGit)(['--version'], { signal }).then(r => r.exitCode === 0).catch(() => { cancelled(signal); return false; }),
            this.options.gateway.available(signal)
        ]);
        const account = gh && !this.loginTask ? await this.options.gateway.account(signal) : null;
        return { ok: true, git, gh, account, login: this.loginState, deviceCode: this.deviceCode };
    }
    startLogin() {
        if (!this.options.gateway.login)
            fail('gh_unavailable', '请安装 GitHub CLI', 503);
        if (!this.loginTask) {
            this.deviceCode = null;
            this.loginState = 'waiting';
            this.loginTask = this.options.gateway.login(code => { this.deviceCode = code; }, this.controller.signal)
                .then(() => { this.loginState = 'idle'; }, () => { this.loginState = 'failed'; })
                .finally(() => { this.loginTask = null; this.deviceCode = null; });
        }
        return { ok: true };
    }
    state() {
        const pending = this.isPending();
        let status;
        if (this.pending)
            status = 'syncing';
        else if (this.error)
            status = this.errorPaused() ? 'paused' : 'error';
        else if (!this.config.binding)
            status = 'local';
        else if (!this.config.enabled)
            status = 'disabled';
        else
            status = pending ? 'pending' : 'idle';
        const defaultFolder = suggestedFolder(this.options.dir, DEFAULT_PRIVATE_REPO_NAME);
        return {
            folder: this.config.folder ?? (this.config.binding ? this.options.dir : this.config.preview?.folder ?? defaultFolder),
            defaultFolder,
            ready: this.admitted,
            notesConsent: this.config.notesConsent,
            notesPending: this.config.notesConsent && !!this.notes.pending(this.config.notesAcknowledged),
            enabled: this.config.enabled,
            status,
            binding: structuredClone(this.config.binding),
            lastSuccessAt: this.config.lastSuccessAt,
            errorCode: this.error?.code ?? null,
            error: this.error?.message ?? null,
            pending,
        };
    }
    changed() {
        if (this.loaded && !this.closed && this.config.enabled && this.canSchedule())
            this.schedule(this.options.batchMs ?? 5000);
    }
    canSchedule() {
        return !this.errorPaused();
    }
    errorPaused() {
        return !!this.error && PAUSE.has(this.error.code);
    }
    schedule(ms) {
        if (this.timer || this.closed || this.changing || this.stagingFile || !this.config.enabled || (!this.isPending() && !this.error))
            return;
        this.timer = setTimeout(() => {
            this.timer = null;
            void this.sync().catch(() => {
            });
        }, ms);
        this.timer.unref();
    }
    clearTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
    activeBinding(repositoryId) {
        const bound = this.config.binding;
        if (!this.admitted || !bound || bound.repositoryId !== repositoryId)
            fail('personal_repository_changed', '当前笔记库已改变，请重新打开设置');
        return bound;
    }
    async exclusiveChange(action) {
        this.changing = true;
        this.clearTimer();
        try {
            await Promise.all([this.pending?.catch(() => { }), this.options.drainNotes?.()]);
            return await action();
        }
        finally {
            this.changing = false;
            if (this.canSchedule())
                this.schedule(this.options.batchMs ?? 5000);
        }
    }
    async activate(next, signal) {
        const old = this.config.folder ?? this.options.dir;
        const previous = remember(this.config.locations, locationOf(this.config.binding, old));
        next.locations = remember(previous, locationOf(next.binding, next.folder));
        this.options.notes.useDirectory(next.folder);
        try {
            await verifyRememberedFolder(this.options.dir, locationOf(next.binding, next.folder));
            await this.notes.initialize();
            cancelled(signal);
            await this.persist(next);
            this.config = next;
        }
        catch (error) {
            this.options.notes.useDirectory(old);
            await this.notes.initialize();
            throw error;
        }
    }
    move(input, signal) {
        return this.control(async () => {
            const v = record(input, ['repositoryId', 'folder']), bound = this.activeBinding(v.repositoryId);
            const folder = folderPath(this.options.dir, v.folder), source = this.config.folder ?? this.options.dir;
            const active = signal ? AbortSignal.any([signal, this.controller.signal]) : this.controller.signal;
            return this.exclusiveChange(async () => {
                const cleanup = await copyForMove(this.options.dir, source, folder, bound.repositoryId, active).catch(e => {
                    cancelled(active);
                    if (e instanceof NotebookError)
                        throw e;
                    return fail('notebook_move_failed', '无法搬迁到所选位置，请检查权限和可用空间');
                });
                cancelled(active);
                await this.activate({ ...this.config, folder, preview: null }, active);
                try {
                    await cleanup();
                    return false;
                }
                catch {
                    return true;
                }
            });
        });
    }
    async freshResetFolder(candidate, folder) {
        if (candidate.returning) {
            await verifyRememberedFolder(this.options.dir, candidate.returning);
            return;
        }
        if (candidate.config.binding) {
            await checkFolder(this.options.dir, folder, true);
            return;
        }
        const files = await readdir(folder).catch(e => { if (missing(e))
            return []; throw e; });
        if (candidate.config.preview?.folder === folder && files.length === 1 && files[0] === folderMarker) {
            await checkFolder(this.options.dir, folder, true);
        }
        else
            await emptyFolder(folder);
    }
    resetPreview(input, signal) {
        return this.control(async () => {
            const v = record(input, ['repositoryId', 'repo', 'mode', 'folder', 'folderIntent']), old = this.activeBinding(v.repositoryId);
            if (this.isPending())
                fail('notebook_unsynced', '请先同步原笔记库的本机修改');
            if (typeof v.repo !== 'string' || (v.mode !== 'existing' && v.repo.toLowerCase() === old.repo.toLowerCase()))
                fail('notebook_reset_target', '请选择另一个专用私有仓库');
            let known;
            if (v.mode === 'existing' && this.config.locations?.length) {
                if (!/^[a-zA-Z0-9_.-]{1,100}$/.test(v.repo) || v.repo === '.' || v.repo === '..')
                    fail('invalid_request', '私有仓库名称无效', 400);
                const owner = await this.options.gateway.account(signal);
                if (!owner)
                    fail('personal_auth_required', '请先登录 GitHub 个人账号');
                const remote = await this.options.gateway.repository(owner.login, v.repo, signal);
                if (!remote)
                    fail('notebook_repo_missing', '未找到这个私有笔记库，请核对名称');
                this.validateRemote(remote, { account: owner, repo: v.repo, repositoryId: remote.id });
                if (remote.id === old.repositoryId)
                    fail('notebook_reset_target', '请选择另一个专用私有仓库');
                known = this.config.locations.find(l => l.ownerId === owner.id && l.repositoryId === remote.id);
            }
            if (v.folderIntent !== undefined && (!known || !['locate', 'new'].includes(String(v.folderIntent)) || !v.folder))
                fail('invalid_request', '请选择有效的本机资料夹', 400);
            const folder = v.folder ? folderPath(this.options.dir, v.folder) : known?.folder ?? suggestedFolder(this.options.dir, v.repo);
            // An explicit folder overrides the suggestion. A user may also point
            // to a manually relocated copy, but only its matching marker admits it.
            const reuse = known && v.folderIntent !== 'new' && (v.folderIntent === 'locate' || !relative(known.folder, folder) || await readFolderIdentity(folder) !== null) ? { ...known, folder } : undefined;
            this.checkResetLocation(folder, reuse);
            // Isolate the creation receipt and the empty source from the active
            // notebook. A lost push/response can be retried after a host restart.
            const identity = [old.repositoryId, v.repo.toLowerCase(), folder];
            if (reuse)
                identity.push('return', reuse.repositoryId);
            const key = createHash('sha256').update(JSON.stringify(identity)).digest('hex');
            const stage = join(this.options.dir, 'backup', 'reset-' + key);
            await this.candidate?.close();
            const target = new PrivateWorkspaceSync({ ...this.options, notes: new NoteRepository(stage) }, stage + '.json', reuse);
            this.candidate = target;
            if (!reuse)
                await target.load();
            await this.freshResetFolder(target, folder);
            const result = await target.preview({ repo: v.repo, mode: v.mode, folder }, signal);
            if (result.preview.repositoryId === old.repositoryId)
                fail('notebook_reset_target', '请选择另一个专用私有仓库');
            return result;
        });
    }
    checkResetLocation(folder, reuse) {
        const home = this.options.dir, source = this.config.folder ?? home;
        // rc.5 and earlier could keep the notebook in the control directory.
        // Its notes/ tree is separate from all legal child libraries.
        if (reuse && !relative(home, folder) && relative(source, folder))
            return;
        distinctFolder(home, source, folder);
    }
    reset(input, signal) {
        return this.control(async () => {
            const v = record(input, ['repositoryId', 'previewId', 'confirmPrivate']), old = this.activeBinding(v.repositoryId);
            const target = this.candidate, preview = target?.config.preview;
            if (!target || !preview || preview.id !== v.previewId || v.confirmPrivate !== true)
                fail('personal_preview_required', '请重新检查目标笔记库');
            this.checkResetLocation(preview.folder, target.returning);
            if (preview.repositoryId === old.repositoryId)
                fail('notebook_reset_target', '请选择另一个专用私有仓库');
            const active = signal ? AbortSignal.any([signal, this.controller.signal]) : this.controller.signal;
            await this.exclusiveChange(async () => {
                await this.notes.initialize();
                if (this.isPending())
                    fail('notebook_unsynced', '请先同步原笔记库的本机修改');
                await this.freshResetFolder(target, preview.folder);
                await target.connect({ previewId: preview.id, confirmPrivate: true }, active);
                cancelled(active);
                // The source may have advanced on another device while the target
                // was being prepared. Reconcile it while its local writes are gated.
                await this.synchronize(active, undefined, true);
                await this.notes.initialize();
                if (this.isPending())
                    fail('notebook_unsynced', '原笔记库仍有未同步修改，请完成同步后重试');
                await this.activate({ ...structuredClone(target.config), preview: null }, active);
                this.error = null;
                this.failures = 0;
                await target.close();
                this.candidate = null;
                await rm(target.file, { force: true }).catch(() => { });
            });
        });
    }
    async preview(input, signal) {
        return this.control(async () => {
            const value = record(input, ['repo', 'mode', 'folder']), active = signal ? AbortSignal.any([signal, this.controller.signal]) : this.controller.signal;
            if (value.mode !== 'existing' && value.mode !== 'create')
                fail('invalid_request', '请选择已有仓库或新建仓库', 400);
            if (this.config.binding && this.config.enabled && !this.stagingFile)
                fail('notebook_already_bound', '笔记库已经绑定');
            const repo = value.repo ?? DEFAULT_PRIVATE_REPO_NAME;
            if (typeof repo !== 'string' || !/^[a-zA-Z0-9_.-]{1,100}$/.test(repo) || repo === '.' || repo === '..')
                fail('invalid_request', '私有仓库名称无效', 400);
            const folder = value.folder ? folderPath(this.options.dir, value.folder) : suggestedFolder(this.options.dir, repo);
            if (this.config.binding && folder !== (this.config.folder ?? this.options.dir))
                fail('notebook_folder_bound', '该笔记库已经绑定本机资料夹');
            await checkFolder(this.options.dir, folder, !!this.config.binding);
            const owner = await this.options.gateway.account(active);
            if (!owner)
                fail('personal_auth_required', '请先登录 GitHub 个人账号');
            if (this.config.binding && (owner.id !== this.config.binding.account.id || owner.login.toLowerCase() !== this.config.binding.account.login.toLowerCase() || repo.toLowerCase() !== this.config.binding.repo.toLowerCase()))
                fail('personal_account_changed', '当前私人笔记已绑定其他账号或仓库；为避免混入数据已停止');
            // Preserve the uncertain creation ledger when previewing exactly the same target.
            const prior = this.config.preview, same = prior?.account.id === owner.id && prior.repo.toLowerCase() === repo.toLowerCase();
            const knownRepositoryId = this.config.binding?.repositoryId ??
                (same ? prior.repositoryId : null);
            const remote = await this.options.gateway.repository(owner.login, repo, active);
            if (value.mode === 'existing' && !remote)
                fail('notebook_repo_missing', '未找到这个私有笔记库，请核对名称');
            if (value.mode === 'create' && remote && !(same && prior.creationAttempted))
                fail('notebook_repo_exists', '该名称已被使用，请改名或选择接入已有库');
            if (!remote && knownRepositoryId !== null) {
                fail('personal_repository_changed', '已确认的私人笔记仓库不存在；已保留原绑定和创建恢复记录');
            }
            if (remote) {
                const repositoryId = knownRepositoryId ?? remote.id;
                this.validateRemote(remote, { account: owner, repo, repositoryId });
                if (this.returning && (owner.id !== this.returning.ownerId || remote.id !== this.returning.repositoryId))
                    fail('personal_repository_changed', '目标仓库身份已变化，请重新检查');
                await this.checkTarget({ account: owner, repo, repositoryId }, !!(same && prior.creationAttempted && prior.repositoryId === remote.id), active);
            }
            cancelled(active);
            const preview = { id: randomUUID(), account: structuredClone(owner), repo, folder, exists: remote !== null, repositoryId: knownRepositoryId ?? remote?.id ?? null, dataScope: [...SCOPE], creationAttempted: same ? prior.creationAttempted : false, ...(this.returning ? { reuseFolder: true } : {}) };
            this.config.preview = preview;
            await this.persist();
            const { creationAttempted: _, ...wire } = preview;
            return { ok: true, preview: structuredClone(wire) };
        });
    }
    connect(input, signal) {
        return this.control(async () => {
            const value = record(input, ['previewId', 'confirmPrivate']), preview = this.config.preview;
            if (this.config.binding && this.config.enabled && !this.stagingFile)
                fail('notebook_already_bound', '笔记库已经绑定');
            if (!preview || value.previewId !== preview.id || value.confirmPrivate !== true)
                fail('personal_preview_required', '请先核对并确认私有仓库及同步范围');
            const active = signal ? AbortSignal.any([signal, this.controller.signal]) : this.controller.signal;
            const current = await this.options.gateway.account(active);
            if (!current || current.id !== preview.account.id || current.login.toLowerCase() !== preview.account.login.toLowerCase())
                fail('personal_account_changed', 'GitHub 登录账号已变化；未创建或连接仓库');
            let remote = await this.options.gateway.repository(current.login, preview.repo, active);
            let confirmedNew = !!(remote && preview.creationAttempted && preview.repositoryId === remote.id);
            if (remote && !preview.exists && !preview.creationAttempted)
                fail('notebook_repo_exists', '该名称已被使用，请重新检查仓库');
            if (!this.returning && !this.config.binding)
                await prepareFolder(this.options.dir, preview.folder, this.options.notes);
            if (!remote) {
                if (preview.exists || preview.repositoryId !== null || this.config.binding)
                    fail('personal_repository_changed', '已确认的私人笔记仓库不存在；未重新创建');
                preview.creationAttempted = true;
                await this.persist();
                try {
                    remote = await this.options.gateway.createPrivate(current, preview.repo, active) ?? null;
                    confirmedNew = !!remote;
                }
                catch (error) {
                    cancelled(active);
                    remote = await this.options.gateway.repository(current.login, preview.repo, active);
                    if (!remote)
                        throw safe(error);
                }
                if (!remote)
                    remote = await this.options.gateway.repository(current.login, preview.repo, active);
                if (!remote)
                    fail('personal_creation_unknown', '私有仓库创建结果尚未确认；请核对同一目标后重试', 502);
            }
            const bound = { account: preview.account, repo: preview.repo, repositoryId: this.config.binding?.repositoryId ?? preview.repositoryId ?? remote.id };
            this.validateRemote(remote, bound);
            if (this.config.binding && (this.config.binding.account.id !== bound.account.id || this.config.binding.repositoryId !== bound.repositoryId))
                fail('personal_repository_changed', '已绑定的私人笔记仓库身份已变化');
            // Persist the stable identity before the first commit so interruption resumes this target.
            if (confirmedNew) {
                preview.repositoryId = remote.id;
                await this.persist();
            }
            let verified;
            if (!this.config.binding) {
                verified = await this.checkTarget(bound, confirmedNew, active, true);
                preview.repositoryId = remote.id;
                preview.creationAttempted = confirmedNew && !verified;
                this.config.folder = preview.folder;
                this.options.notes.useDirectory(preview.folder);
                this.config.binding = bound;
                this.config.initializing = true;
            }
            cancelled(active);
            this.config.notesConsent = true;
            this.config.enabled = true;
            this.config.paused = null;
            this.error = null;
            await this.persist();
            await this.synchronize(signal, verified);
        });
    }
    async checkTarget(bound, allowNew, signal, checkData = false) {
        const backend = this.backend(bound);
        return backend.exclusive(async () => {
            const snapshot = await backend.snapshot(signal);
            if (allowNew && !snapshot.revision)
                return;
            if (!snapshot.entries.has(MANIFEST))
                fail('personal_repository_unrelated', '此仓库没有 DSH笔记标识，请选择专用私有笔记库');
            const manifest = await this.remoteManifest(backend, snapshot, bound, signal);
            this.notes.validateVersion(manifest.modules.notes);
            if (manifest.modules.notes !== this.notes.version || !snapshot.entries.has('notes/manifest.json'))
                fail('note_sync_invalid', '仓库缺少有效的笔记清单');
            if (checkData && snapshot.revision)
                return { revision: snapshot.revision, data: await this.notes.readSnapshot(backend, snapshot, signal).catch(error => { cancelled(signal); throw noteSyncError(error); }) };
            return undefined;
        }, signal);
    }
    backend(bound) {
        const root = this.config.folder ?? this.options.dir;
        return createGitBackend({ rootDir: join(root, 'backup', 'repositories'), remote: this.options.remoteForTest?.(bound) ?? `https://github.com/${bound.account.login}/${bound.repo}.git`, branch: 'main', ...(this.options.gitRunner ? { runner: this.options.gitRunner } : {}), ...(this.options.remoteForTest ? { allowLocal: true } : { githubCliAuth: true }) });
    }
    validateRemote(remote, bound) {
        if (remote.visibility !== 'private')
            fail('personal_repository_public', '私人笔记仓库已变为公开；同步已停止');
        if (remote.id !== bound.repositoryId || remote.ownerId !== bound.account.id || remote.owner.toLowerCase() !== bound.account.login.toLowerCase() || remote.name.toLowerCase() !== bound.repo.toLowerCase())
            fail('personal_repository_changed', '私人笔记仓库的稳定身份已变化；同步已停止');
    }
    async verify(bound, signal) {
        const owner = await this.options.gateway.account(signal);
        if (!owner)
            fail('personal_auth_required', '请重新检查 GitHub 登录或网络', 503);
        if (owner.id !== bound.account.id || owner.login.toLowerCase() !== bound.account.login.toLowerCase())
            fail('personal_account_changed', 'GitHub 登录账号已变化；笔记同步已停止');
        const remote = await this.options.gateway.repository(bound.account.login, bound.repo, signal);
        if (!remote)
            fail('personal_repository_changed', '无法找到已绑定的私人笔记仓库；同步已停止');
        this.validateRemote(remote, bound);
    }
    async remoteManifest(backend, snapshot, bound, signal) {
        if (!snapshot.entries.has(MANIFEST)) {
            if (this.config.initializing && this.config.preview?.creationAttempted && !snapshot.revision)
                return { format: 'dsh-github-notebook', version: 1, owner: bound.account, repositoryId: bound.repositoryId, modules: {} };
            fail('personal_repository_unrelated', '远端缺少私人笔记标识；未覆盖任何内容');
        }
        let manifest;
        try {
            manifest = JSON.parse(await backend.readFile(snapshot, MANIFEST, signal));
        }
        catch (error) {
            if (error instanceof NotebookError)
                throw error;
            fail('invalid_personal_manifest', '私人笔记仓库标识不是有效 JSON');
        }
        if (!isRecord(manifest) || manifest.format !== 'dsh-github-notebook' || manifest.version !== 1 || !isRecord(manifest.owner) || manifest.owner.id !== bound.account.id || manifest.repositoryId !== bound.repositoryId || !isRecord(manifest.modules))
            fail('invalid_personal_manifest', '私人笔记仓库标识或拥有者无效；同步已停止');
        return manifest;
    }
    sync(signal) {
        if (this.changing)
            return Promise.reject(new NotebookError('notebook_busy', '正在切换资料，请稍后重试', 409));
        return this.synchronize(signal);
    }
    synchronize(signal, verified, confirmTip = false) {
        if (this.closed)
            return Promise.reject(new NotebookError('closed', '笔记同步服务已关闭', 503));
        if (this.pending)
            return this.pending;
        this.clearTimer();
        this.error = null;
        this.config.paused = null;
        if (!this.config.enabled || !this.config.binding)
            return Promise.resolve();
        const active = signal ? AbortSignal.any([this.controller.signal, signal]) : this.controller.signal;
        const result = this.perform(this.config.binding, active, verified, confirmTip).then(() => {
            this.failures = 0;
        }).catch(async (error) => {
            const failure = safe(error);
            if (!active.aborted) {
                // A local edit may have scheduled a batch while transport was active.
                // Failure replaces that deadline with backoff, or removes it on pause.
                this.clearTimer();
                this.error = failure;
                this.failures++;
                this.config.paused = this.errorPaused() ? { code: failure.code, message: failure.message } : null;
                await this.persist();
                if (!this.errorPaused() && this.config.enabled)
                    this.schedule((this.options.retryMs ?? [60000, 300000, 900000])[Math.min(this.failures - 1, (this.options.retryMs?.length ?? 3) - 1)] ?? 900000);
            }
            throw failure;
        }).finally(() => {
            if (this.pending === result) {
                this.pending = null;
            }
            if (!this.isPending() && !this.error)
                this.clearTimer();
            else if (!this.error && this.config.enabled)
                this.schedule(this.options.batchMs ?? 5000);
        });
        this.pending = result;
        return result;
    }
    async perform(bound, signal, verified, confirmTip = false) {
        const backend = this.backend(bound);
        await backend.exclusive(async () => {
            for (let attempt = 0; attempt < 4; attempt++) {
                cancelled(signal);
                await this.verify(bound, signal);
                const snapshot = await backend.snapshot(signal), manifest = await this.remoteManifest(backend, snapshot, bound, signal);
                this.notes.validateVersion(manifest.modules.notes);
                if (snapshot.entries.has(MANIFEST) && (manifest.modules.notes !== this.notes.version || !snapshot.entries.has('notes/manifest.json')))
                    fail('note_sync_invalid', '远端笔记清单缺失；已暂停笔记备份');
                const folder = this.config.folder ?? this.options.dir;
                if (this.returning)
                    await verifyRememberedFolder(this.options.dir, this.returning);
                else if (this.config.initializing || this.stagingFile)
                    await markFolder(locationOf(bound, folder));
                const notes = await this.notes.prepare(backend, snapshot, signal, verified?.revision === snapshot.revision ? verified?.data : undefined).catch(error => { cancelled(signal); throw noteSyncError(error); });
                const files = new Map(notes.files);
                if (!snapshot.entries.has(MANIFEST) || manifest.modules.notes !== this.notes.version) {
                    manifest.modules.notes = this.notes.version;
                    files.set(MANIFEST, JSON.stringify(manifest));
                }
                if (!snapshot.entries.has('README.md'))
                    files.set('README.md', '# 私有笔记\n\n由 DSH笔记同步。请保持仓库私有。\n');
                let synchronizedRevision = snapshot.revision;
                if (files.size) {
                    const commit = await backend.commit(snapshot, { files }, randomUUID(), signal);
                    await this.verify(bound, signal);
                    try {
                        await backend.push(commit, snapshot.revision, signal);
                        if ((await backend.reconcile(commit, signal)).state !== 'synced')
                            fail('personal_sync_unconfirmed', '远端备份结果尚未核对；本机保存已保留，请重试', 502);
                        synchronizedRevision = commit;
                    }
                    catch (error) {
                        cancelled(signal);
                        if (attempt === 3)
                            throw error;
                        continue;
                    }
                }
                cancelled(signal);
                await notes.install().catch(error => { cancelled(signal); throw noteSyncError(error); });
                if (confirmTip && (!synchronizedRevision || (await backend.reconcile(synchronizedRevision, signal)).revision !== synchronizedRevision)) {
                    cancelled(signal);
                    if (attempt === 3)
                        fail('personal_sync_unconfirmed', '无法确认原仓库的最新修订，已保留当前绑定', 409);
                    continue;
                }
                await this.success(notes.acknowledged);
                return;
            }
        }, signal);
    }
    async success(notesAck) {
        const next = { ...this.config, notesAcknowledged: notesAck ?? this.config.notesAcknowledged, lastSuccessAt: new Date(this.now()).toISOString(), initializing: false };
        if (!this.stagingFile)
            next.locations = remember(this.config.locations, locationOf(this.config.binding, this.config.folder ?? this.options.dir));
        await this.persist(next);
        this.config = next;
        this.admitted = true;
    }
    async close() {
        if (this.closed)
            return;
        this.closed = true;
        this.notes.close();
        this.clearTimer();
        this.controller.abort();
        await Promise.allSettled([this.controls, this.pending, this.writing, this.loginTask]);
        await this.candidate?.close();
        this.clearTimer();
    }
}
