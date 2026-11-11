import { mkdir, open, unlink, readFile, readdir, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { NoteRepository } from '../notes/repository.js';
import { object, text, id, fail } from '../notes/validation.js';
import { ATTACHMENT_LIMIT } from '../contracts/notes.js';
import { NOTE_LIMITS } from '../notes/types.js';
import { windowRequest } from './edit-coordinator.js';
import { safePath } from '../notes/files.js';
/** One bounded chunk per request; immutable assets become visible only after a complete file. */
export class NoteTransfers {
    directory;
    repository;
    batch;
    task(input) {
        const v = object(input), owner = windowRequest.getStore()?.windowId ?? 'local';
        if (this.batch && Date.now() - this.batch.updated > 90_000)
            this.batch = undefined;
        if (v.action === 'begin') {
            if (this.batch)
                fail('notebook_busy', '已有一项导入正在进行，请先完成或取消');
            this.batch = { id: randomUUID(), owner, updated: Date.now() };
            return { ok: true, taskId: this.batch.id };
        }
        if (!this.batch || this.batch.id !== v.taskId || this.batch.owner !== owner)
            fail('transfer_expired');
        if (v.action === 'end')
            this.batch = undefined;
        else if (v.action === 'heartbeat')
            this.batch.updated = Date.now();
        else
            fail('note_schema');
        return { ok: true };
    }
    uploads = new Map();
    timer;
    cleanup;
    async clearAbandoned() { const folder = join(this.directory, 'transfers'); await safePath(folder); for (const name of await readdir(folder).catch(() => [])) {
        if (!/^[a-f0-9-]{36}$/.test(name))
            continue;
        const path = join(folder, name), stat = await lstat(path);
        if (stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && Date.now() - stat.mtimeMs > 24 * 60 * 60_000)
            await unlink(path);
    } }
    constructor(directory, repository) {
        this.directory = directory;
        this.repository = repository;
        this.cleanup = this.clearAbandoned().catch(() => { });
        this.timer = setInterval(() => { for (const v of this.uploads.values())
            if (Date.now() - v.updated > 5 * 60_000)
                void this.remove(v); }, 30000);
        this.timer.unref();
    }
    get active() { return this.uploads.size > 0 || !!this.batch && Date.now() - this.batch.updated <= 90_000; }
    async remove(v) { await v.chain.catch(() => { }); this.uploads.delete(v.id); await v.handle.close().catch(() => { }); await unlink(v.file).catch(() => { }); }
    async close() { clearInterval(this.timer); await Promise.all([...this.uploads.values()].map(v => this.remove(v))); }
    async request(input, signal) {
        const raw = object(input), noteId = id(raw.noteId), owner = windowRequest.getStore()?.windowId ?? 'local', action = text(raw.action, 20);
        signal?.throwIfAborted();
        if (action === 'begin') {
            await this.cleanup;
            this.repository.editGuard([noteId], raw.draft !== true);
            if (raw.draft !== true)
                await this.repository.get(noteId, signal);
            const size = Number(raw.size);
            if (!Number.isSafeInteger(size) || size < 0 || size > ATTACHMENT_LIMIT)
                fail('attachment_limit');
            const mediaType = raw.mediaType === undefined ? undefined : text(raw.mediaType, 30);
            if (mediaType && (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(mediaType) || size > NOTE_LIMITS.image))
                fail('image_limit');
            if (this.uploads.size >= 16)
                fail('notebook_busy');
            const uploadId = randomUUID(), folder = join(this.directory, 'transfers');
            await safePath(folder);
            await mkdir(folder, { recursive: true });
            const file = join(folder, uploadId), handle = await open(file, 'wx', 0o600);
            this.uploads.set(uploadId, { id: uploadId, noteId, owner, root: this.repository.files.root, name: text(raw.name, 1000), size, offset: 0, ...(mediaType ? { mediaType } : {}), file, handle, chain: Promise.resolve(), updated: Date.now() });
            return { ok: true, uploadId, offset: 0 };
        }
        const uploadId = text(raw.uploadId, 36), v = this.uploads.get(uploadId);
        if (!v || v.noteId !== noteId || v.owner !== owner || v.root !== this.repository.files.root)
            fail('transfer_expired');
        if (action === 'cancel') {
            await this.remove(v);
            return { ok: true };
        }
        const next = v.chain.then(async () => {
            signal?.throwIfAborted();
            v.updated = Date.now();
            this.repository.editGuard([v.noteId]);
            if (action === 'chunk') {
                const encoded = text(raw.base64, 2 * 1024 * 1024), bytes = Buffer.from(encoded, 'base64'), offset = Number(raw.offset);
                if (!bytes.length || bytes.length > 1024 * 1024 || bytes.toString('base64') !== encoded || !Number.isSafeInteger(offset) || offset !== v.offset || offset + bytes.length > v.size)
                    fail('transfer_chunk');
                let written = 0;
                while (written < bytes.length) {
                    signal?.throwIfAborted();
                    const r = await v.handle.write(bytes, written, bytes.length - written, v.offset + written);
                    if (!r.bytesWritten)
                        fail('transfer_write');
                    written += r.bytesWritten;
                }
                v.offset += written;
                return { ok: true, uploadId, offset: v.offset };
            }
            if (action !== 'finish' || v.offset !== v.size)
                fail('transfer_incomplete');
            await v.handle.sync();
            signal?.throwIfAborted();
            const bytes = await readFile(v.file);
            if (bytes.length !== v.size)
                fail('transfer_incomplete');
            if (v.mediaType)
                return { ok: true, asset: await this.repository.putAsset(bytes, v.mediaType, signal, v.noteId) };
            return { ok: true, attachment: await this.repository.putAttachment(bytes, v.name, signal, v.noteId) };
        });
        v.chain = next.catch(() => { });
        try {
            return await next;
        }
        finally {
            if (action === 'finish')
                await this.remove(v);
        }
    }
}
