import { createHash } from 'node:crypto';
import { lstat, mkdir, open, unlink } from 'node:fs/promises';
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
export async function fileLock(path, action, signal) {
    cancelled(signal);
    await noSymlinks(path);
    let handle;
    try {
        handle = await open(path, 'wx', 0o600);
    }
    catch (error) {
        if (hasCode(error, 'EEXIST'))
            throw new NotebookError('repository_busy', '另一个同步操作正在使用此目录；锁状态不确定时不会自动清除', 409);
        throw error;
    }
    try {
        await handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
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
