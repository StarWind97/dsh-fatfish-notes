import { mediaTypeFor } from '../notes/assets.js';
import { fail, object } from '../notes/validation.js';
import { stageResult, AI_LIMITS } from '../notes/enrichment-plan.js';
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
/** Auxiliary requests use the Host's configured model and frozen note assets.
 * No prompt(), tools, hidden session or current conversation messages are used. */
export class NoteModelBridge {
    provider;
    repository;
    services;
    auxiliary = true;
    constructor(provider, repository, services = {}) {
        this.provider = provider;
        this.repository = repository;
        this.services = services;
    }
    async inspect() { return { active: [], ended: [] }; }
    async selection(sessionId, signal) {
        const controller = this.provider();
        if (!controller?.follow)
            fail('ai_unavailable');
        const stop = new AbortController(), iterator = controller.follow({ address: { kind: 'session', sessionId: sessionId }, maxMessages: 1 }, AbortSignal.any([signal, stop.signal]))[Symbol.asyncIterator]();
        try {
            const first = await iterator.next();
            if (first.done || first.value.type !== 'snapshot' || first.value.header.id !== sessionId)
                fail('ai_session');
            const projection = object(first.value.projections.values.modelSelection ?? {}), chosen = object(projection.next ?? projection.lastUsed ?? {});
            if (typeof chosen.provider === 'string' && typeof chosen.model === 'string')
                return { provider: chosen.provider, model: chosen.model };
            const fallback = (await controller.modelCatalog?.())?.default;
            if (!fallback)
                fail('ai_unavailable');
            return { provider: fallback.provider, model: fallback.model };
        }
        finally {
            stop.abort();
            await iterator.return?.();
        }
    }
    async dispatch(job, stage, prompt, signal) {
        const llm = this.services.llm?.();
        if (!llm)
            fail('ai_unavailable', '后台模型服务不可用，原文已保存');
        const selected = await this.selection(job.sessionId, signal), images = [];
        if (stage.assetIds.length) {
            const store = this.services.attachments?.();
            if (!store)
                fail('ai_image_budget');
            const limits = store.imageLimits;
            let total = 0;
            if (stage.assetIds.length > limits.maxImagesPerMessage)
                fail('ai_image_budget');
            for (const asset of stage.assetIds) {
                const bytes = await this.repository.getAsset(asset, signal), mediaType = mediaTypeFor(asset);
                total += bytes.length;
                if (bytes.length > limits.maxImageBytes || total > limits.maxMessageImageBytes || !limits.mediaTypes.includes(mediaType))
                    fail('ai_image_budget');
                signal.throwIfAborted();
                images.push({ type: 'image', attachment: await store.saveImage({ data: bytes, mediaType, name: asset }) });
            }
        }
        // One bounded correction for malformed/overlong metadata; network failures do not replay.
        for (let attempt = 0; attempt < 2; attempt++) {
            const prepared = await llm.prepareCall({ ...selected, maxTokens: 1600 }, signal);
            const message = { role: 'user', content: [{ type: 'text', text: prompt + (attempt ? '\n上次格式未通过校验。仅输出 JSON；摘要必须单段且不超过200个字符，禁止逐条复述。' : '') }, ...images] };
            let output = '', finished = false;
            for await (const chunk of prepared.stream({ ...prepared.config, messages: [message], tools: [], purpose: 'fatfish-notes-metadata', signal })) {
                signal.throwIfAborted();
                if (chunk.type === 'text-delta') {
                    output += chunk.text;
                    if (Buffer.byteLength(output) > AI_LIMITS.resultBytes)
                        fail('ai_budget');
                }
                if (chunk.type === 'finish') {
                    if (chunk.reason.kind !== 'stop')
                        fail('ai_no_candidate');
                    finished = true;
                }
            }
            if (!finished)
                fail('ai_no_candidate');
            try {
                return stageResult(JSON.parse(output.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')), stage, true);
            }
            catch {
                if (attempt)
                    fail('ai_no_candidate', '未得到简短有效的建议，原文仍已保存');
            }
        }
        fail('ai_no_candidate');
    }
}
