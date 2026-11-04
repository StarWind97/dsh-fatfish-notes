import { createHash } from 'node:crypto';
import { lstat, mkdir, open, readFile, unlink } from 'node:fs/promises';
import { dirname, parse, resolve } from 'node:path';
import { NotebookError } from '../domain/errors.js';
import { isRecord } from '../domain/record.js';
export function digest(value) { return createHash('sha256').update(value).digest('hex'); }
export function cancelled(signal) { if (signal?.aborted)
    throw new NotebookError('cancelled', '操作已取消', 499); }
export function hasCode(error, code) { return isRecord(error) && error.code === code; }
export function safeError(error) {
    return error instanceof NotebookError ? error : new NotebookError('sync_failed', '同步未完成，请检查连接后重试；恢复记录已保留', 502);
}
/** Do not traverse junctions/symlinks even inside the plugin's configured storage root. */
export async function noSymlinks(path) {
    const absolute = resolve(path), root = parse(absolute).root;
    let current = absolute;
    while (current !== root) {
        try {
            if ((await lstat(current)).isSymbolicLink())
                throw new NotebookError('unsafe_path', '同步目录包含符号链接，已停止操作');
        }
        catch (error) {
            if (!hasCode(error, 'ENOENT'))
                throw error;
        }
        current = dirname(current);
    }
}
export async function directory(path) { await noSymlinks(path); await mkdir(path, { recursive: true }); await noSymlinks(path); }
function busy() {
    return new NotebookError('repository_busy', '另一个同步操作正在使用此目录，或无法确认锁的状态；请关闭其他使用此资料夹的 DSH 实例后重试', 409);
}
async function lockOwnerState(path) {
    let owner;
    try {
        owner = JSON.parse(await readFile(path, 'utf8'));
    }
    catch (error) {
        return hasCode(error, 'ENOENT') ? 'missing' : 'unknown';
    }
    if (!isRecord(owner) || !Number.isSafeInteger(owner.pid) || Number(owner.pid) <= 0 ||
        typeof owner.createdAt !== 'string' || !Number.isFinite(Date.parse(owner.createdAt)))
        return 'unknown';
    // Age alone never proves a process has stopped. EPERM and unknown errors keep the lock.
    try {
        process.kill(Number(owner.pid), 0);
        return 'unknown';
    }
    catch (error) {
        return hasCode(error, 'ESRCH') ? 'exited' : 'unknown';
    }
}
async function acquireLock(path) {
    try {
        return await open(path, 'wx', 0o600);
    }
    catch (error) {
        if (!hasCode(error, 'EEXIST'))
            throw error;
    }
    if (await lockOwnerState(path) === 'unknown')
        throw busy();
    // Serialize recovery across processes so a second recovery cannot unlink the new owner's lock.
    const recoveryPath = `${path}.recovery`;
    await noSymlinks(recoveryPath);
    let recovery;
    try {
        recovery = await open(recoveryPath, 'wx', 0o600);
    }
    catch (error) {
        if (hasCode(error, 'EEXIST'))
            throw busy();
        throw error;
    }
    try {
        await noSymlinks(path);
        const owner = await lockOwnerState(path);
        if (owner === 'unknown')
            throw busy();
        if (owner === 'exited')
            await unlink(path);
        try {
            return await open(path, 'wx', 0o600);
        }
        catch (error) {
            if (hasCode(error, 'EEXIST'))
                throw busy();
            throw error;
        }
    }
    finally {
        await recovery.close();
        await unlink(recoveryPath);
    }
}
export async function fileLock(path, action, signal) {
    cancelled(signal);
    await noSymlinks(path);
    const handle = await acquireLock(path);
    try {
        await handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
        cancelled(signal);
        return await action();
    }
    finally {
        await handle.close();
        await unlink(path);
    }
}
const queues = new Map();
export async function serial(key, action, signal) {
    const previous = queues.get(key) ?? Promise.resolve();
    let release = () => { };
    const next = new Promise(resolve => { release = resolve; });
    const tail = previous.catch(() => { }).then(() => next);
    queues.set(key, tail);
    await previous.catch(() => { });
    try {
        cancelled(signal);
        return await action();
    }
    finally {
        release();
        if (queues.get(key) === tail)
            queues.delete(key);
    }
}
