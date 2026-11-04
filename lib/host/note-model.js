import { mediaTypeFor } from '../notes/assets.js';
import { fail, object } from '../notes/validation.js';
import { readNoteHistory } from './note-history.js';
export function inspectNoteTurns(events, requestIds) {
    const wanted = new Set(requestIds), ended = new Set(), current = new Set(), inbox = new Map();
    let turn = null;
    const rpc = (value) => { const v = object(value), source = object(v.source); return typeof source.rpcId === 'string' ? source.rpcId : ''; };
    for (const event of events) {
        const data = object(event.data);
        if (event.type === 'turn/start') {
            current.clear();
            turn = Number(data.turn);
        }
        else if (event.type === 'user/message') {
            const id = rpc(data);
            if (wanted.has(id))
                current.add(id);
        }
        else if (event.type === 'agent/inbox/spliced') {
            const target = String(data.target), list = inbox.get(target) ?? [], inserted = Array.isArray(data.inserted) ? data.inserted.map(rpc) : [];
            const removed = list.splice(Number(data.start), Number(data.removedCount ?? 0), ...inserted);
            inbox.set(target, list);
            for (const id of removed)
                if (wanted.has(id)) {
                    if (data.outcome === 'canceled')
                        ended.add(id);
                    else if (turn !== null)
                        current.add(id);
                }
        }
        else if (event.type === 'turn/end' && Number(data.turn) === turn) {
            for (const id of current)
                ended.add(id);
            current.clear();
            turn = null;
        }
    }
    return { active: turn === null ? [] : [...current], ended: [...ended] };
}
/** Uses only official Host prompt and frozen local image bytes; never reads a
 * path/URL supplied by source text or the model. */
export class NoteModelBridge {
    provider;
    repository;
    constructor(provider, repository) {
        this.provider = provider;
        this.repository = repository;
    }
    controller() { const controller = this.provider(); if (!controller?.follow || !controller.page || !controller.prompt)
        fail('ai_unavailable', '当前会话模型服务不可用，原文已保存'); return controller; }
    async opening(sessionId, signal) {
        const stop = new AbortController(), iterator = this.controller().follow({ address: { kind: 'session', sessionId: sessionId }, maxMessages: 1 }, AbortSignal.any([signal, stop.signal]))[Symbol.asyncIterator]();
        try {
            const first = await iterator.next();
            if (first.done || first.value.type !== 'snapshot' || first.value.header.id !== sessionId)
                fail('ai_session');
            return first.value;
        }
        finally {
            stop.abort();
            await iterator.return?.();
        }
    }
    async inspect(sessionId, requestIds, signal) {
        const opening = await this.opening(sessionId, signal);
        return inspectNoteTurns(await readNoteHistory(this.controller(), sessionId, opening.cursor, signal), requestIds);
    }
    async dispatch(job, stage, prompt, signal) {
        const controller = this.controller(), content = [{ type: 'text', text: prompt }];
        if (stage.assetIds.length) {
            const limits = (await this.opening(job.sessionId, signal)).projections.values.imageLimits;
            if (!limits || stage.assetIds.length > limits.maxImagesPerMessage)
                fail('ai_image_budget', '图片超过当前模型请求上限，原始图片已保存');
            let total = 0;
            for (const asset of stage.assetIds) {
                const bytes = await this.repository.getAsset(asset, signal), mediaType = mediaTypeFor(asset);
                total += bytes.length;
                if (bytes.length > limits.maxImageBytes || total > limits.maxMessageImageBytes || !limits.mediaTypes.includes(mediaType))
                    fail('ai_image_budget');
                content.push({ type: 'image', mediaType, data: bytes.toString('base64'), name: asset });
            }
        }
        signal.throwIfAborted();
        await controller.prompt({ requestId: stage.requestId, sessionId: job.sessionId, mode: 'queue', content }, signal);
    }
}
