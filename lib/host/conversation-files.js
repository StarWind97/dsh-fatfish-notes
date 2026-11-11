import { createHash } from 'node:crypto';
import { basename, dirname, isAbsolute } from 'node:path';
import { ATTACHMENT_LIMIT } from '../contracts/notes.js';
import { NotebookError } from '../domain/errors.js';
export class ConversationFiles {
    services;
    constructor(services = {}) {
        this.services = services;
    }
    scope(sessionId, file) { const workspace = this.services.workspaces?.()?.list().find(w => w.sessionIds.some(s => s === sessionId)); if (!workspace && !isAbsolute(file))
        throw new NotebookError('capture_file_missing', '无法确定文件所属位置'); return { sessionId: sessionId, workspaceRoot: workspace?.path ?? dirname(file) }; }
    async describe(sessionId, material, ref, signal) {
        if (ref.kind !== 'delivery')
            return;
        try {
            const service = this.services.workspaceFiles?.();
            if (!service)
                throw Error('Unavailable');
            const stat = await service.stat(this.scope(sessionId, ref.path), ref.path, signal);
            material.bytes = stat.bytes ?? null;
            material.available = Number.isSafeInteger(stat.bytes) && stat.bytes !== undefined && stat.bytes >= 0;
            ref.version = stat.version;
        }
        catch {
            signal.throwIfAborted();
            material.available = false;
        }
    }
    async read(sessionId, material, ref, signal, progress) {
        if (!material.available || material.bytes === null)
            throw new NotebookError('capture_file_missing', `无法读取“${material.name}”，请取消选择该文件后重试`);
        if (material.bytes > ATTACHMENT_LIMIT)
            throw new NotebookError('attachment_limit', `“${material.name}”超过 100 MiB`);
        const chunks = [];
        let length = 0;
        const add = (b) => { signal.throwIfAborted(); length += b.length; if (length > material.bytes || length > ATTACHMENT_LIMIT)
            throw new NotebookError('capture_file_changed', '文件已变化，请重新选择'); chunks.push(Buffer.from(b)); progress?.(length); };
        if (ref.kind === 'delivery') {
            const service = this.services.workspaceFiles?.();
            if (!service)
                throw new NotebookError('conversation_unavailable', '宿主文件服务暂不可用');
            const scope = this.scope(sessionId, ref.path);
            while (length < material.bytes) {
                const part = await service.readBytes(scope, ref.path, { range: { offset: length, length: Math.min(2 * 1024 * 1024, material.bytes - length) } }, signal);
                if (part.version !== ref.version || part.offset !== length || !part.data.length)
                    throw new NotebookError('capture_file_changed', '文件读取期间发生变化，请重新选择');
                add(part.data);
            }
            if ((await service.stat(scope, ref.path, signal)).version !== ref.version)
                throw new NotebookError('capture_file_changed', '文件读取期间发生变化，请重新选择');
        }
        else {
            const store = this.services.attachments?.();
            if (!store)
                throw new NotebookError('conversation_unavailable', '宿主附件服务暂不可用');
            if (ref.kind === 'upload')
                for await (const b of store.readFileStream(ref.ref, signal))
                    add(b);
            else {
                const image = await store.readImage(ref.ref, signal);
                add(image.data);
            }
        }
        if (length !== material.bytes)
            throw new NotebookError('capture_file_changed', '附件内容不完整');
        const bytes = Buffer.concat(chunks, length);
        if (ref.kind !== 'delivery' && createHash('sha256').update(bytes).digest('hex') !== ref.ref.attachmentId.replace(/^sha256:/, ''))
            throw new NotebookError('capture_file_changed', '附件校验失败');
        return bytes;
    }
}
export const materialName = (path) => basename(path.replace(/\\/g, '/')) || '附件';
