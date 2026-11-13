import { watch } from 'node:fs';
import { lstat, readdir } from 'node:fs/promises';
import { join, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { fail } from './validation.js';
import { NOTE_LIMITS } from './types.js';
export const inventoryStamp = (path, stat) => JSON.stringify([path, String(stat.dev), String(stat.ino), String(stat.size), String(stat.mtimeNs), String(stat.ctimeNs)]);
const absent = (error) => error instanceof Error && 'code' in error && error.code === 'ENOENT';
/** Rebuildable metadata only. Notifications identify work; relevant paths are also checked directly. */
export class FileInventory {
    root;
    audit;
    safe;
    options;
    current;
    invalidated = true;
    dirty = new Set();
    watcher;
    unavailable = false;
    closed = false;
    rootIdentity = '';
    lastAudit = 0;
    revision = 0;
    now;
    constructor(root, audit, safe, options = {}) {
        this.root = root;
        this.audit = audit;
        this.safe = safe;
        this.options = options;
        this.now = options.now ?? Date.now;
    }
    changed(path) {
        if (path === null || this.dirty.size >= 4096) {
            this.invalidated = true;
            this.dirty.clear();
            return;
        }
        const relative = path.replaceAll('\\', '/');
        if (isAbsolute(path) || relative.split('/').some(p => !p || p === '.' || p === '..')) {
            // Windows can repeatedly report the absolute root after it is removed.
            // Stop this unusable watcher immediately; a later request audits/reopens a new root.
            this.invalidated = true;
            this.unavailable = true;
            this.watcher?.close();
            this.watcher = undefined;
            return;
        }
        this.dirty.add(relative);
    }
    close() { this.closed = true; this.watcher?.close(); this.watcher = undefined; this.current = undefined; this.dirty.clear(); }
    start() {
        if (this.closed || this.watcher || this.unavailable)
            return;
        const failed = () => { this.unavailable = true; this.invalidated = true; this.watcher?.close(); this.watcher = undefined; };
        try {
            this.watcher = this.options.watch ? this.options.watch(this.root, p => this.changed(p), failed) : watch(this.root, { recursive: true, persistent: false }, (_event, p) => this.changed(p === null ? null : String(p))).on('error', failed);
        }
        catch {
            failed();
        }
    }
    async inspect(path) {
        await this.safe(join(this.root, path));
        const stat = await lstat(join(this.root, path), { bigint: true }).catch(e => { if (absent(e))
            return null; throw e; });
        if (stat && (stat.isSymbolicLink() || (stat.isFile() && stat.nlink > 1n) || (!stat.isFile() && !stat.isDirectory())))
            fail('note_path');
        return stat;
    }
    remove(path) {
        const current = this.current;
        for (const key of [...current.stamps.keys()])
            if (key === path || key.startsWith(path + '/')) {
                current.bytes -= Number(JSON.parse(current.stamps.get(key))[3]);
                current.stamps.delete(key);
                this.revision++;
            }
        for (const key of [...current.directories.keys()])
            if (key === path || key.startsWith(path + '/')) {
                current.directories.delete(key);
                this.revision++;
            }
    }
    async refresh(path, forceDirectory = false) {
        const current = this.current, stat = await this.inspect(path);
        if (!stat) {
            this.remove(path);
            return;
        }
        if (path.split('/').length > (stat.isDirectory() ? 8 : 9))
            fail('note_path');
        const stamp = inventoryStamp(path, stat);
        if (stat.isFile()) {
            if (stat.size > BigInt(NOTE_LIMITS.scan))
                fail('note_limit');
            if (current.directories.has(path))
                this.remove(path);
            if (current.stamps.get(path) !== stamp) {
                const before = current.stamps.get(path);
                current.bytes += Number(stat.size) - (before ? Number(JSON.parse(before)[3]) : 0);
                current.stamps.set(path, stamp);
                this.revision++;
            }
            return;
        }
        if (!forceDirectory && current.directories.get(path) === stamp)
            return;
        if (current.stamps.has(path))
            this.remove(path);
        current.directories.set(path, stamp);
        this.revision++;
        const entries = await readdir(join(this.root, path), { withFileTypes: true }), prefix = path ? path + '/' : '', names = new Set(entries.map(e => prefix + e.name));
        const children = [...current.stamps.keys(), ...current.directories.keys()].filter(p => p !== path && p.startsWith(prefix) && !p.slice(prefix.length).includes('/'));
        for (const child of children)
            if (!names.has(child))
                this.remove(child);
        // A directory event only refreshes that branch. Unchanged child directories are not walked.
        for (const entry of entries)
            await this.refresh(prefix + entry.name);
    }
    async snapshot(verify = [], force = false) {
        // Notifications can arrive during an awaited stat/audit. Never clear the object
        // being inspected; retry an invalidated pass instead of publishing partial metadata.
        for (let attempt = 0; attempt < 3; attempt++) {
            const result = await this.inspectSnapshot(verify, force || attempt > 0);
            if (!this.invalidated)
                return result;
        }
        this.current = undefined;
        fail('note_busy', '文件正在变化，请稍后重试');
    }
    async inspectSnapshot(verify, force) {
        await this.safe(this.root);
        const root = await lstat(this.root, { bigint: true }).catch(e => { if (absent(e))
            return null; throw e; });
        if (!root) {
            this.current = undefined;
            this.invalidated = false;
            return this.audit();
        }
        if (!root.isDirectory() || root.isSymbolicLink())
            fail('note_path');
        const identity = [root.dev, root.ino].join(':');
        if (identity !== this.rootIdentity) {
            this.watcher?.close();
            this.watcher = undefined;
            this.current = undefined;
            this.rootIdentity = identity;
            this.unavailable = false;
        }
        this.start();
        const temporary = [...this.dirty].filter(p => p.split('/').some(n => n.startsWith('.tmp-')));
        let staged = false;
        for (const path of temporary) {
            if (await lstat(join(this.root, path)).catch(e => { if (absent(e))
                return null; throw e; }))
                staged = true;
            else
                this.dirty.delete(path);
        }
        if (force || this.invalidated || !this.current || !this.watcher || this.now() - this.lastAudit >= 30_000 || staged) {
            this.dirty.clear();
            this.invalidated = false;
            try {
                this.current = await this.audit();
                this.lastAudit = this.now();
            }
            catch (error) {
                this.current = undefined;
                throw error;
            }
        }
        const before = this.revision;
        // Control metadata and requested dependencies still work when an individual notification is lost.
        const paths = new Set(['', 'manifest.json', 'deleted', 'notebooks', ...verify, ...this.dirty]);
        this.dirty.clear();
        try {
            for (const path of paths)
                await this.refresh(path);
            // Events delivered while checking are kept for the next call as well as checked now.
            for (const path of [...this.dirty])
                await this.refresh(path);
            if (this.current.stamps.size + this.current.directories.size - 1 > NOTE_LIMITS.revisions * 3)
                fail('note_limit');
            if (this.revision !== before) {
                this.current.paths = [...this.current.stamps.keys()].sort();
                this.current.fingerprint = createHash('sha256').update([...this.current.stamps.values()].sort().join('\n')).digest('hex');
            }
            return { paths: [...this.current.paths], bytes: this.current.bytes, fingerprint: this.current.fingerprint, stamps: new Map(this.current.stamps), directories: new Map(this.current.directories) };
        }
        catch (error) {
            this.current = undefined;
            throw error;
        }
    }
}
