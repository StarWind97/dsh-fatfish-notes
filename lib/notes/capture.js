import { NoteRepository } from './repository.js';
import { canonical, digest, fail, object, text, id, hash, sortedStrings } from './validation.js';
import { NOTE_LIMITS } from './types.js';
import { missing, utf8 } from './files.js';
import { createNoteRevision, materializeNote, validateNoteRevision } from './revisions.js';
import { ulid } from '../domain/id.js';
import { validateBodyAssets } from './assets.js';
import { NotebookError } from '../domain/errors.js';
const identifier = (v) => { const s = text(v, 512); if (!s || /[\u0000-\u001f]/.test(s))
    fail('capture_request'); return s; };
export function validateCaptureRequest(input) {
    const v = object(input);
    if (Object.keys(v).some(k => !['requestId', 'sessionId', 'scope', 'anchorMessageId', 'messageIds', 'mode', 'autoMetadata', 'notebookId'].includes(k)))
        fail('capture_request');
    if (!['turn', 'selection', 'session'].includes(String(v.scope)) || v.mode !== 'raw' || typeof v.autoMetadata !== 'boolean')
        fail('capture_request');
    const result = { requestId: identifier(v.requestId), sessionId: identifier(v.sessionId), scope: v.scope, mode: v.mode, autoMetadata: v.autoMetadata, notebookId: v.notebookId === null ? null : id(v.notebookId) };
    if (v.anchorMessageId !== undefined)
        result.anchorMessageId = identifier(v.anchorMessageId);
    if (v.messageIds !== undefined)
        result.messageIds = sortedStrings(v.messageIds, NOTE_LIMITS.messages, identifier);
    if (result.scope === 'turn' && !result.anchorMessageId || result.scope === 'selection' && !result.messageIds?.length)
        fail('capture_request');
    return result;
}
export function selectMessages(messages, request) {
    if (request.scope === 'session')
        return messages;
    if (request.scope === 'selection') {
        const ids = new Set(request.messageIds);
        const selected = messages.filter(m => ids.has(m.id));
        if (selected.length !== request.messageIds?.length)
            fail('source_mismatch', '选定消息不属于本次会话快照');
        return selected;
    }
    const end = messages.findIndex(m => m.id === request.anchorMessageId);
    if (end < 0 || messages[end].role !== 'assistant')
        fail('source_mismatch', '对应的已完成回答不可用');
    let start = end;
    while (start > 0 && messages[start].role !== 'user')
        start--;
    return messages.slice(start, end + 1);
}
export function rawBody(source) {
    const literal = new Set(source.textOnlyBlocks.map(b => `${b.messageId}:${b.blockIndex}`));
    const fenced = (value) => { let width = 3; for (const match of value.matchAll(/`+/g))
        width = Math.max(width, match[0].length + 1); const fence = '`'.repeat(width); return `${fence}text\n${value}\n${fence}`; };
    return source.messages.map(m => `## ${m.role === 'user' ? '用户' : 'AI'}\n\n${m.blocks.map((b, i) => b.type === 'text' ? literal.has(`${m.id}:${i}`) ? fenced(b.text) : b.text : source.assets[b.attachmentId] ? `![会话图片](../assets/${source.assets[b.attachmentId]})` : '[图片未归档]').join('\n')}`).join('\n\n---\n\n');
}
function markTextOnlyImages(source) {
    const safe = (body) => { try {
        validateBodyAssets(body, Object.values(source.assets));
        return true;
    }
    catch (e) {
        if (!(e instanceof NotebookError) || e.code !== 'note_asset')
            throw e;
        return false;
    } };
    for (const message of source.messages)
        message.blocks.forEach((block, blockIndex) => {
            if (block.type === 'text' && !safe(block.text))
                source.textOnlyBlocks.push({ messageId: message.id, blockIndex });
        });
    // Cross-message reference definitions can also create an unsafe image link.
    // In that rare case retain all text blocks literally instead of following it.
    if (!safe(rawBody(source)))
        source.textOnlyBlocks = source.messages.flatMap(m => m.blocks.flatMap((b, blockIndex) => b.type === 'text' ? [{ messageId: m.id, blockIndex }] : []));
    if (source.textOnlyBlocks.length) {
        source.complete = false;
        source.issues.push('image_links_kept_as_text');
    }
}
/** Durable request identity is written BEFORE reading history; a frozen cut is
 * persisted before pagination. Retrying never selects a newer tail or note ID. */
export class NoteCaptureService {
    repository;
    conversation;
    tail = Promise.resolve();
    constructor(repository, conversation) {
        this.repository = repository;
        this.conversation = conversation;
    }
    capture(input, signal = new AbortController().signal) {
        const request = validateCaptureRequest(input);
        const result = this.tail.catch(() => { }).then(() => this.perform(request, signal));
        this.tail = result;
        return result;
    }
    async selection(input, signal = new AbortController().signal) {
        const sessionId = identifier(input.sessionId), cut = await this.conversation.open(sessionId, signal);
        const transcript = await this.conversation.read(sessionId, cut, signal);
        const selected = input.anchorMessageId ? selectMessages(transcript.messages, { scope: 'turn', anchorMessageId: identifier(input.anchorMessageId) }) : transcript.messages;
        return { messages: transcript.messages, complete: transcript.complete, issues: transcript.issues, cut, defaultMessageIds: selected.map(m => m.id) };
    }
    async perform(request, signal) {
        signal.throwIfAborted();
        const path = `captures/${digest(request.requestId)}.json`, files = this.repository.files;
        const write = async (journal) => { const data = canonical(journal); await files.write(path, canonical({ hash: digest(data), data: journal }), false); };
        const bytes = await files.read(path, NOTE_LIMITS.body * 6 + 1024 * 1024).catch(e => { if (missing(e))
            return null; throw e; });
        let journal;
        if (bytes) {
            const envelope = object(JSON.parse(utf8(bytes))), value = object(envelope.data);
            if (envelope.hash !== digest(canonical(value)) || value.version !== 1)
                fail('capture_corrupt');
            if (canonical(validateCaptureRequest(value.request)) !== canonical(request))
                fail('capture_request_mismatch', '同一保存请求不能改变来源或选项，请重试原请求');
            id(value.noteId);
            journal = value;
            if (journal.cut && (!Number.isSafeInteger(journal.cut.throughSeq) || journal.cut.throughSeq < -1))
                fail('capture_corrupt');
            if (journal.sourceId)
                hash(journal.sourceId);
            if (journal.revision) {
                validateNoteRevision(journal.revision);
                if (journal.revision.noteId !== journal.noteId || journal.revision.sourceId !== journal.sourceId)
                    fail('capture_corrupt');
            }
        }
        else {
            // Respect the repository's future-version/corruption gate before even
            // introducing a local request journal into its module directory.
            await this.repository.list({ limit: 1 }, signal);
            if (request.notebookId !== null) {
                const book = (await this.repository.listNotebooks(signal)).find(b => b.notebookId === request.notebookId);
                if (!book || [book.current, ...book.conflicts].some(b => b.status !== 'active'))
                    fail('notebook_unavailable', '所选笔记本不可用');
            }
            journal = { version: 1, request, noteId: ulid(), recordedAt: new Date().toISOString(), cut: null, sourceId: null, revision: null, finished: false };
            await write(journal);
        }
        if (!journal.cut) {
            journal.cut = await this.conversation.open(request.sessionId, signal);
            await write(journal);
        }
        signal.throwIfAborted();
        if (!journal.sourceId) {
            const transcript = await this.conversation.read(request.sessionId, journal.cut, signal);
            const messages = selectMessages(transcript.messages, request), assets = Object.create(null), missingAssetIds = [];
            const images = new Map();
            for (const block of messages.flatMap(m => m.blocks))
                if (block.type === 'image') {
                    if (images.has(block.attachmentId) && images.get(block.attachmentId).mediaType !== block.mediaType)
                        fail('capture_attachment', '同一图片出现不一致的附件类型');
                    images.set(block.attachmentId, block);
                }
            if (images.size > NOTE_LIMITS.images)
                fail('note_limit', '所选会话超过 128 张图片');
            let total = 0;
            for (const [attachmentId, image] of images) {
                signal.throwIfAborted();
                let asset;
                try {
                    asset = await this.conversation.attachment(request.sessionId, attachmentId, image.mediaType, signal, transcript.imageReferences?.get(attachmentId));
                }
                catch (e) {
                    signal.throwIfAborted();
                    missingAssetIds.push(attachmentId);
                    continue;
                }
                total += asset.bytes.length;
                if (total > NOTE_LIMITS.imageTotal)
                    fail('note_limit', '所选图片超过 20 MiB');
                // Storage failures stop the operation. Only attachment retrieval/validation
                // failures can produce an explicitly partial archive.
                assets[attachmentId] = (await this.repository.putAsset(asset.bytes, asset.mediaType, signal)).id;
            }
            const source = { version: 1, sessionId: request.sessionId, scope: request.scope, cut: journal.cut, messages, assets, missingAssetIds, textOnlyBlocks: [], complete: transcript.complete && !missingAssetIds.length, issues: [...transcript.issues, ...(missingAssetIds.length ? ['missing_assets'] : [])] };
            markTextOnlyImages(source);
            journal.sourceId = await this.repository.putSource(source, signal);
            await write(journal);
        }
        const source = await this.repository.getSource(journal.sourceId, signal);
        if (!journal.revision) {
            const notebookId = request.notebookId ?? (await this.repository.listNotebooks(signal)).find(book => book.isDefault).notebookId;
            journal.revision = createNoteRevision({ version: 1, noteId: journal.noteId, parents: [], recordedAt: journal.recordedAt, title: request.scope === 'session' ? '会话笔记' : '问答笔记', body: rawBody(source), summary: '', tags: [], notebookId, status: 'active', sourceId: journal.sourceId, assetIds: Object.values(source.assets) });
            await write(journal);
        }
        signal.throwIfAborted();
        if (!journal.finished) {
            await this.repository.importObjects({ version: 1, revisions: [journal.revision], notebooks: [] }, signal);
            journal.finished = true;
            await write(journal);
        }
        // Verify the original immutable revision even after receipt loss or user edits.
        const revision = await this.repository.getRevision(journal.noteId, journal.revision.revision, signal);
        return { note: materializeNote([revision], journal.noteId), sourceId: journal.sourceId, complete: source.complete, messageCount: source.messages.length, missingAssetIds: source.missingAssetIds, cut: source.cut, issues: source.issues, enrichmentJobId: null, enrichmentStatus: request.autoMetadata ? 'unavailable' : 'not-requested' };
    }
}
