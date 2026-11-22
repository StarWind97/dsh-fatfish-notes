import { readFile, writeFile, rename, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { appearanceValue, parseAppearance } from '../domain/appearance.js';
import { NotebookError } from '../domain/errors.js';
import { object, text } from '../notes/validation.js';
const invalid = () => new NotebookError('appearance_invalid', '外观设置无效', 400);
export function validatedTheme(input) {
    const v = object(input);
    if (typeof v.dark !== 'boolean' || !['zh', 'en'].includes(String(v.language)))
        throw invalid();
    const color = (key) => { const s = text(v[key], 100); if (!/^(#[\da-f]{3,8}|rgba?\([\d.,%\s]+\)|color\(srgb [\d.\s/]+\))$/i.test(s))
        throw invalid(); return s; };
    return { dark: v.dark, language: v.language, background: color('background'), foreground: color('foreground'), muted: color('muted'), border: color('border') };
}
/** Profile-local preferences. Waiters and writes never enter the note repository queue. */
export class SharedAppearance {
    dir;
    waitMs;
    data = { version: 1, storeId: randomUUID(), value: null, legacy: {}, receipts: [] };
    loaded = false;
    chain = Promise.resolve();
    epoch = randomUUID();
    sequence = 0;
    theme = null;
    waiters = new Map();
    closed = false;
    constructor(dir, waitMs = 20_000) {
        this.dir = dir;
        this.waitMs = waitMs;
    }
    serial(work) { const p = this.chain.then(work, work); this.chain = p.catch(() => { }); return p; }
    async load() {
        if (this.loaded)
            return;
        try {
            const v = object(JSON.parse(await readFile(join(this.dir, 'appearance.json'), 'utf8')));
            if (v.version !== 1 || typeof v.storeId !== 'string' || !Array.isArray(v.receipts) || !v.receipts.every(x => typeof x === 'string') || v.receipts.length > 128)
                throw invalid();
            const legacy = object(v.legacy);
            for (const [key, value] of Object.entries(legacy))
                if (!['embedded', 'standalone', 'conversation'].includes(key) || (value !== null && (typeof value !== 'string' || value.length > 8192)))
                    throw invalid();
            if (v.value !== null && JSON.stringify(appearanceValue(v.value)) !== JSON.stringify(v.value))
                throw invalid();
            this.data = { version: 1, storeId: v.storeId, value: v.value, legacy, receipts: v.receipts };
        }
        catch (e) {
            if (e.code !== 'ENOENT')
                throw e;
        }
        this.loaded = true;
    }
    async persist(next) {
        await mkdir(this.dir, { recursive: true });
        const file = join(this.dir, 'appearance.json'), tmp = file + '.' + randomUUID() + '.tmp';
        try {
            await writeFile(tmp, JSON.stringify(next), 'utf8');
            await rename(tmp, file);
        }
        finally {
            await rm(tmp, { force: true }).catch(() => { });
        }
        this.data = next;
    }
    changed() { this.sequence++; for (const wake of [...this.waiters.values()])
        wake(); }
    get language() { return this.theme?.language; }
    snapshot() { return { ok: true, epoch: this.epoch, sequence: this.sequence, storeId: this.data.storeId, value: this.data.value ? { ...this.data.value } : null, theme: this.theme ? { ...this.theme } : null }; }
    async connect(surface, input) {
        return this.serial(async () => {
            await this.load();
            const v = object(input);
            if (v.legacy !== null && (typeof v.legacy !== 'string' || v.legacy.length > 8192))
                throw invalid();
            const next = { ...this.data, legacy: { ...this.data.legacy } };
            let write = false;
            if (!(surface in next.legacy)) {
                next.legacy[surface] = v.legacy;
                write = true;
            }
            if (!next.value && surface === 'embedded') {
                next.value = parseAppearance(v.legacy);
                write = true;
            }
            const theme = v.theme === undefined ? null : validatedTheme(v.theme);
            if (theme && surface !== 'embedded')
                throw invalid();
            if (write)
                await this.persist(next);
            const themeChanged = theme && JSON.stringify(theme) !== JSON.stringify(this.theme);
            if (themeChanged)
                this.theme = theme;
            if (write || themeChanged)
                this.changed();
            return this.snapshot();
        });
    }
    async update(input) {
        return this.serial(async () => {
            await this.load();
            const v = object(input), operationId = text(v.operationId, 100), patch = object(v.patch);
            if (!/^[a-f0-9-]{36}$/.test(operationId) || v.storeId !== this.data.storeId)
                throw invalid();
            if (!this.data.value)
                throw new NotebookError('appearance_not_ready', '请先打开 DSH 中的肥鱼笔记以完成外观同步', 409);
            if (this.data.receipts.includes(operationId))
                return this.snapshot();
            const value = appearanceValue({ ...this.data.value, ...patch });
            for (const [key, item] of Object.entries(patch))
                if (key === 'version' || key === 'mode' || !(key in value) || value[key] !== item)
                    throw invalid();
            if (!Object.keys(patch).length)
                throw invalid();
            await this.persist({ ...this.data, value, receipts: [...this.data.receipts, operationId].slice(-128) });
            this.changed();
            return this.snapshot();
        });
    }
    setTheme(surface, input) {
        if (surface !== 'embedded')
            throw invalid();
        const theme = validatedTheme(object(input).theme);
        if (JSON.stringify(theme) !== JSON.stringify(this.theme)) {
            this.theme = theme;
            this.changed();
        }
        return this.snapshot();
    }
    async wait(windowId, input, signal) {
        await this.serial(() => this.load());
        const v = object(input);
        if (typeof v.epoch !== 'string' || !Number.isSafeInteger(v.sequence) || Number(v.sequence) < 0)
            throw invalid();
        signal.throwIfAborted();
        if (this.closed || v.epoch !== this.epoch || v.sequence !== this.sequence)
            return this.snapshot();
        await new Promise(resolve => {
            const finish = () => { clearTimeout(timer); signal.removeEventListener('abort', finish); if (this.waiters.get(windowId) === finish)
                this.waiters.delete(windowId); resolve(); };
            const timer = setTimeout(finish, this.waitMs);
            timer.unref?.();
            this.waiters.get(windowId)?.();
            this.waiters.set(windowId, finish);
            signal.addEventListener('abort', finish, { once: true });
        });
        signal.throwIfAborted();
        return this.snapshot();
    }
    async close() { this.closed = true; for (const wake of [...this.waiters.values()])
        wake(); await this.chain; }
}
