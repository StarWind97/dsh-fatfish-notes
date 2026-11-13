import { NoteUsageReader } from './note-usage.js';
import { suggestMetadata } from './note-suggestion.js';
import { windowRequest } from './edit-coordinator.js';
import { referenceNote, previewReference } from './note-reference.js';
import { NoteTransfers } from './note-transfers.js';
import { NoteRepository } from '../notes/repository.js';
import { NoteCaptureService } from '../notes/capture.js';
import { object, text, id, hash, sortedStrings, normalizeContent } from '../notes/validation.js';
import { mediaTypeFor, sourceAttachments } from '../notes/assets.js';
import { importImage } from '../media/import.js';
import { normalizeImageAssets } from '../media/images.js';
import { NoteConversation } from './note-conversation.js';
import { NoteModelBridge } from './note-model.js';
import { NoteEnrichment } from '../notes/enrichment.js';
import { validateCaptureRequest } from '../notes/capture.js';
import { NotebookError } from '../domain/errors.js';
import { exportLibrary } from '../notes/export/library.js';
import { createExport } from '../notes/export/service.js';
import { createConversationExport, conversationFile } from '../notes/export/conversation.js';
import { exportFont } from '../notes/export/pdf.js';
import { ExportError } from '../notes/export/model.js';
import { ATTACHMENT_LIMIT, ATTACHMENT_WARNING } from '../contracts/notes.js';
/** Composed facade owns every note operation through cancellation and drain. */
export class NotesApplication {
    ready;
    services;
    repository;
    draftRecovery = { ok: true, recovered: [], failed: [] };
    async recoverDrafts() { try {
        this.draftRecovery = await this.repository.recoverDrafts();
    }
    catch {
        this.draftRecovery = { ok: true, recovered: [], failed: ['note_draft_invalid'] };
    } }
    draft(input) { return this.run(() => this.repository.draft(input)); }
    transfers;
    usageReader;
    usage(signal) { return this.run(async (active) => ({ ok: true, usage: await this.usageReader.read(active) }), signal); }
    captureService;
    conversation;
    controller = new AbortController();
    pending = new Set();
    closePromise = null;
    enrichment;
    model;
    timer;
    ticking = false;
    captureProgress = new Map();
    progress(input) { const item = this.captureProgress.get(text(object(input).requestId, 512)); return { ok: true, progress: item?.owner === (windowRequest.getStore()?.windowId ?? 'local') ? item.value : null }; }
    constructor(directory, provider, ready = () => true, services = {}) {
        this.ready = ready;
        this.services = services;
        this.repository = new NoteRepository(directory);
        this.usageReader = new NoteUsageReader(this.repository);
        this.transfers = new NoteTransfers(directory, this.repository);
        this.conversation = new NoteConversation(provider, services);
        this.captureService = new NoteCaptureService(this.repository, this.conversation);
        this.model = new NoteModelBridge(provider, this.repository, services);
        this.enrichment = new NoteEnrichment(this.repository, this.model);
        this.timer = setInterval(() => { if (!this.ticking) {
            this.ticking = true;
            void this.run(async (signal) => { for (const jobId of await this.enrichment.list()) {
                try {
                    await this.enrichment.drive(jobId, signal);
                }
                catch {
                    signal.throwIfAborted();
                }
            } }).catch(() => { }).finally(() => { this.ticking = false; });
        } }, 2000);
        this.timer.unref();
    }
    reference(input, signal) { return this.run(active => referenceNote(this.repository, this.services.attachments?.(), this.conversation, input, active), signal); }
    referencePreview(input, signal) { return this.run(active => previewReference(this.repository, input, active), signal); }
    transfer(input, signal) { return this.run(active => this.transfers.request(input, active), signal); }
    localOperation(work, signal) { return this.run(() => work(), signal); }
    run(work, signal) {
        if (this.controller.signal.aborted)
            return Promise.reject(new NotebookError('closed', '笔记正在关闭', 503));
        const ready = this.ready();
        if (ready === 'busy')
            return Promise.reject(new NotebookError('notebook_busy', '资料正在搬迁或重置，请稍后重试', 409));
        if (!ready)
            return Promise.reject(new NotebookError('notebook_setup_required', '请先连接专用私有笔记库并完成首次同步', 409));
        const active = signal ? AbortSignal.any([signal, this.controller.signal]) : this.controller.signal;
        const result = Promise.resolve().then(() => { active.throwIfAborted(); return work(active); }).catch((error) => {
            if (active.aborted)
                throw new NotebookError('aborted', '操作已取消；请用原请求重试以核对保存结果', 409);
            throw error;
        });
        this.pending.add(result);
        void result.finally(() => this.pending.delete(result)).catch(() => { });
        return result;
    }
    capture(input, signal) {
        return this.run(async (active) => {
            const request = validateCaptureRequest(input), owner = windowRequest.getStore()?.windowId ?? 'local';
            const claim = await this.repository.coordinate(() => { if (this.ready() !== true)
                throw new NotebookError('notebook_busy', '笔记库正在切换'); return this.transfers.task({ action: 'begin' }); });
            const heartbeat = setInterval(() => { this.transfers.task({ action: 'heartbeat', taskId: claim.taskId }); }, 20000);
            heartbeat.unref();
            const report = (value) => { if (this.captureProgress.size > 30)
                this.captureProgress.delete(this.captureProgress.keys().next().value); this.captureProgress.set(request.requestId, { owner, value }); };
            report({ file: '读取会话', bytes: 0, total: 0, done: 0, count: 0, stage: 'reading' });
            try {
                const result = await this.captureService.capture(request, active, report);
                const job = await this.enrichment.ensure(request, result, active);
                const current = this.captureProgress.get(request.requestId).value;
                report({ ...current, stage: 'complete' });
                return { ok: true, ...result, ...(job ? { enrichmentJobId: job.jobId, enrichmentStatus: 'queued' } : {}) };
            }
            finally {
                clearInterval(heartbeat);
                this.transfers.task({ action: 'end', taskId: claim.taskId });
            }
        }, signal);
    }
    job(input, signal) { return this.run(async (active) => ({ ok: true, job: await this.enrichment.drive(text(object(input).jobId, 64), active) }), signal); }
    retryJob(input, signal) { return this.run(async (active) => { const jobId = text(object(input).jobId, 64); await this.enrichment.drive(jobId, active); await this.enrichment.retry(jobId, active); return { ok: true, job: await this.enrichment.drive(jobId, active) }; }, signal); }
    cancelJob(input, signal) { return this.run(async () => ({ ok: true, job: await this.enrichment.cancel(text(object(input).jobId, 64)) }), signal); }
    adoptCandidate(input, signal) { return this.run(async (active) => { const v = object(input); return { ok: true, job: await this.enrichment.adopt(text(v.jobId, 64), v.expectedHeads, active) }; }, signal); }
    submitCandidate(input, sessionId, signal) { return this.run(active => this.enrichment.submit(input, sessionId, active), signal); }
    selection(input, signal) {
        const v = object(input), request = { sessionId: text(v.sessionId, 512), ...(v.anchorMessageId === undefined ? {} : { anchorMessageId: text(v.anchorMessageId, 512) }) };
        return this.run(async (active) => ({ ok: true, ...await this.captureService.selection(request, active) }), signal);
    }
    suggest(input, signal) { return this.run(async (active) => ({ ok: true, metadata: await suggestMetadata(validateCaptureRequest(input), this.conversation, this.model, this.services, AbortSignal.any([active, AbortSignal.timeout(180_000)])) }), signal); }
    get(input, signal) { return this.run(async (active) => ({ ok: true, note: await this.repository.get(text(object(input).noteId, 26), active) }), signal); }
    manage(input, signal) { return this.run(async (active) => ({ ok: true, ...await this.repository.manage(input, active) }), signal); }
    catalog(signal) { return this.run(async (active) => ({ ok: true, ...await this.repository.catalog(active) }), signal); }
    history(input, signal) { return this.run(async (active) => { const v = object(input); return { ok: true, ...await this.repository.history(id(v.noteId), v.cursor === undefined ? undefined : hash(v.cursor), active) }; }, signal); }
    revision(input, signal) { return this.run(async (active) => { const v = object(input), row = await this.repository.getRevision(id(v.noteId), hash(v.revision), active); return { ok: true, note: { noteId: row.noteId, heads: [row.revision], current: row, conflicts: [], savedAt: row.recordedAt, effectiveNotebookId: row.notebookId } }; }, signal); }
    backlinks(input, signal) { const v = object(input); return this.run(async (active) => ({ ok: true, ...await this.repository.backlinkPage(id(v.noteId), { ...(v.cursor !== undefined ? { cursor: id(v.cursor) } : {}), limit: 5 }, active) }), signal); }
    list(input, signal) {
        return this.run(async (active) => {
            const v = object(input), options = {};
            if (v.sessionId !== undefined)
                options.sessionId = text(v.sessionId, 512);
            if (v.relation !== undefined) {
                if (!['source', 'linked', 'browse'].includes(String(v.relation)))
                    throw new NotebookError('note_schema', '关联筛选无效');
                options.relation = v.relation;
            }
            if (v.cursor !== undefined)
                options.cursor = id(v.cursor);
            if (v.limit !== undefined)
                options.limit = Number(v.limit);
            if (v.query !== undefined)
                options.query = text(v.query, 12_000);
            for (const key of ['favorite', 'templates'])
                if (v[key] !== undefined) {
                    if (typeof v[key] !== 'boolean')
                        throw new NotebookError('note_schema', '筛选无效');
                    options[key] = v[key];
                }
            if (v.recentIds !== undefined) {
                if (!Array.isArray(v.recentIds) || v.recentIds.length > 100)
                    throw new NotebookError('note_schema', '访问记录无效');
                options.recentIds = v.recentIds.map(id);
            }
            if (v.tag !== undefined)
                options.tag = text(v.tag, 200);
            if (v.order === 'recent' || v.order === 'oldest')
                options.order = v.order;
            if (v.notebookId !== undefined)
                options.notebookId = v.notebookId === null || v.notebookId === 'null' ? null : id(v.notebookId);
            if (v.status !== undefined) {
                if (!['active', 'trashed', 'all'].includes(String(v.status)))
                    throw new NotebookError('note_schema', '笔记筛选不正确');
                options.status = v.status;
            }
            return { ok: true, ...await this.repository.list(options, active) };
        }, signal);
    }
    associate(input, signal) {
        return this.run(async (active) => {
            const v = object(input);
            if (typeof v.linked !== 'boolean')
                throw new NotebookError('note_schema', '关联选项无效');
            return { ok: true, note: await this.repository.associate(id(v.noteId), sortedStrings(v.expectedHeads, 100_000, hash), text(v.sessionId, 512), v.linked, active) };
        }, signal);
    }
    save(input, signal) {
        return this.run(async (active) => {
            const v = this.saveInput(input), resolve = object(input).resolve;
            if (resolve !== undefined && typeof resolve !== 'boolean')
                throw new NotebookError('note_schema', '保存选项无效');
            const note = resolve === true ? await this.repository.resolve(id(v.noteId), v.expectedHeads, v.content, active) : await this.repository.save(v, active, object(input).keepBoth === true);
            return { ok: true, note, ...(v.noteId && note.noteId !== v.noteId ? { forkedFrom: v.noteId } : {}) };
        }, signal);
    }
    image(input, signal) {
        return this.run(async (active) => {
            const v = object(input);
            const note = await this.repository.get(id(v.noteId), active).catch(error => {
                if (v.draft === true && error instanceof NotebookError && error.code === 'note_not_found')
                    return null;
                throw error;
            });
            if (note && note.current.status !== 'active')
                throw new NotebookError('note_trashed', '回收站里的笔记不能添加图片');
            const image = v.url === undefined
                ? normalizeImageAssets([{ id: 'image', base64: v.base64, mediaType: v.mediaType }])[0]
                : await importImage(text(v.url, 4096), active);
            const asset = await this.repository.putAsset(Buffer.from(image.base64, 'base64'), image.mediaType, active, id(v.noteId));
            return { ok: true, asset: { id: asset.id, bytes: asset.bytes, ...(v.url === undefined ? {} : { preview: `data:${image.mediaType};base64,${image.base64}` }) } };
        }, signal);
    }
    saveInput(input) {
        const v = object(input);
        return { ...(v.noteId === undefined ? {} : { noteId: id(v.noteId) }), expectedHeads: sortedStrings(v.expectedHeads, 100_000, hash), content: normalizeContent(v.content) };
    }
    attachment(input, signal) {
        return this.run(async (active) => {
            const v = object(input), noteId = id(v.noteId);
            const note = await this.repository.get(noteId, active).catch(e => { if (v.draft === true && e instanceof NotebookError && e.code === 'note_not_found')
                return null; throw e; });
            if (note?.current.status === 'trashed')
                throw new NotebookError('note_trashed', '回收站中的笔记不能添加附件');
            const encoded = text(v.base64, Math.ceil(ATTACHMENT_LIMIT / 3) * 4);
            const bytes = Buffer.from(encoded, 'base64');
            if (bytes.toString('base64') !== encoded || bytes.length > ATTACHMENT_LIMIT)
                throw new NotebookError('attachment_limit', '单个附件不能超过 100 MiB');
            if (bytes.length > ATTACHMENT_WARNING && v.allowLarge !== true)
                throw new NotebookError('attachment_large', '附件较大，会增加上传、下载和同步时间，请确认后继续');
            return { ok: true, attachment: await this.repository.putAttachment(bytes, text(v.name, 1000), active, noteId) };
        }, signal);
    }
    download(input, signal) {
        return this.run(async (active) => {
            const v = object(input), note = await this.repository.getRevision(id(v.noteId), hash(v.revision), active);
            const sources = note.sourceId ? sourceAttachments(await this.repository.getSource(note.sourceId, active)) : [];
            const file = [...(note.attachments ?? []), ...sources].find(a => a.id === hash(v.attachmentId));
            if (!file)
                throw new NotebookError('note_asset', '附件不属于此笔记', 404);
            return { bytes: await this.repository.getAttachment(file.id, active), filename: file.name, mediaType: 'application/octet-stream' };
        }, signal);
    }
    batch(input, signal) {
        return this.run(async (active) => {
            const v = object(input);
            return { ok: true, completed: await this.repository.batch(v.notes, v.action, active) };
        }, signal);
    }
    status(input, trashed, signal) {
        return this.run(async (active) => {
            const v = object(input), noteId = id(v.noteId), heads = sortedStrings(v.expectedHeads, 100_000, hash);
            return { ok: true, note: await (trashed ? this.repository.trash(noteId, heads, active) : this.repository.restore(noteId, heads, active)) };
        }, signal);
    }
    resolve(input, signal) {
        return this.run(async (active) => {
            const v = this.saveInput(input);
            return { ok: true, note: await this.repository.resolve(id(v.noteId), v.expectedHeads, v.content, active) };
        }, signal);
    }
    notebooks(signal) { return this.run(async (active) => ({ ok: true, notebooks: await this.repository.listNotebooks(active) }), signal); }
    notebook(input, signal) {
        return this.run(async (active) => {
            const v = object(input), heads = sortedStrings(v.expectedHeads, 100_000, hash);
            if (v.remove === true) {
                if (!['move', 'trash'].includes(String(v.removal)) || !Number.isSafeInteger(v.expectedNoteCount) || Number(v.expectedNoteCount) < 0)
                    throw new NotebookError('note_schema', '请确认移除方式和笔记数量');
                await this.repository.deleteNotebook(id(v.notebookId), heads, active, { removal: v.removal, expectedNoteCount: Number(v.expectedNoteCount) });
            }
            else {
                if (v.makeDefault !== undefined && typeof v.makeDefault !== 'boolean')
                    throw new NotebookError('note_schema', '默认笔记本选项无效');
                await this.repository.saveNotebook({ ...(v.notebookId === undefined ? {} : { notebookId: id(v.notebookId) }), expectedHeads: heads, title: text(v.title, 1200), ...(v.makeDefault === true ? { makeDefault: true } : {}) }, active);
            }
            return { ok: true, notebooks: await this.repository.listNotebooks(active) };
        }, signal);
    }
    jobs(input, signal) {
        return this.run(async (active) => {
            const v = object(input), noteId = id(v.noteId), after = v.cursor === undefined ? '' : hash(v.cursor);
            const jobs = [];
            for (const jobId of (await this.enrichment.list()).sort()) {
                active.throwIfAborted();
                if (jobId <= after)
                    continue;
                const job = await this.enrichment.get(jobId);
                if (job.noteId === noteId)
                    jobs.push({ jobId, noteId, status: job.status, error: job.error, candidate: job.candidate, stages: job.stages.map(stage => ({ status: stage.status })) });
                if (jobs.length === 6)
                    break;
            }
            return { ok: true, jobs: jobs.slice(0, 5), cursor: jobs.length > 5 ? jobs[4].jobId : null };
        }, signal);
    }
    asset(input, signal) {
        return this.run(async (active) => {
            const v = object(input), revision = await this.repository.getRevision(id(v.noteId), hash(v.revision), active), assetId = text(v.assetId, 80);
            let allowed = revision.assetIds.includes(assetId);
            if (v.sourceId !== undefined) {
                if (hash(v.sourceId) !== revision.sourceId)
                    throw new NotebookError('note_asset', '图片不属于此笔记', 404);
                const source = await this.repository.getSource(v.sourceId, active);
                allowed = source.assets !== null && typeof source.assets === 'object' && Object.values(source.assets).includes(assetId);
            }
            if (!allowed)
                throw new NotebookError('note_asset', '图片不属于此笔记', 404);
            return { bytes: await this.repository.getAsset(assetId, active), mediaType: mediaTypeFor(assetId) };
        }, signal);
    }
    source(input, signal) { return this.run(async (active) => ({ ok: true, source: await this.repository.getSource(text(object(input).sourceId, 64), active) }), signal); }
    conversationFile(input, signal) { return this.run(active => conversationFile(this.conversation, input, active), signal); }
    export(input, signal) {
        return this.run(async (active) => {
            try {
                return await createExport(this.repository, input, active, true);
            }
            catch (error) {
                if (error instanceof ExportError)
                    throw new NotebookError(error.code, '导出未完成，请检查图片、内容和导出限制');
                if (error instanceof NotebookError)
                    throw error;
                throw new NotebookError('export_failed', '导出未完成，请检查图片或稍后重试');
            }
        }, signal);
    }
    exportLibrary(input, signal, sink) { return this.run(active => exportLibrary(this.repository, input, active, sink), signal); }
    exportFont(signal) { return this.run(async (active) => { const bytes = await exportFont(); active.throwIfAborted(); return bytes; }, signal); }
    exportConversation(input, signal) {
        return this.run(async (active) => {
            try {
                return await createConversationExport(this.conversation, input, active, true);
            }
            catch (error) {
                if (error instanceof ExportError)
                    throw new NotebookError(error.code, '会话导出未完成');
                throw error;
            }
        }, signal);
    }
    async drain() { await Promise.allSettled([...this.pending, this.enrichment.drain()]); }
    close() {
        if (!this.closePromise) {
            clearInterval(this.timer);
            this.controller.abort();
            this.closePromise = Promise.allSettled([...this.pending, this.enrichment.close()]).then(() => this.transfers.close()).finally(() => this.repository.close());
        }
        return this.closePromise;
    }
}
