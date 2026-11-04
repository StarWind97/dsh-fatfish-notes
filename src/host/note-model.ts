import type { SessionController, SessionWireEvent, PromptContentPart } from '@deepseek-ai/dsh-api-session-controller'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type { NoteJob, NoteStage } from '../contracts/notes.js'
import type { NoteModel } from '../notes/enrichment.js'
import type { NoteRepository } from '../notes/repository.js'
import { mediaTypeFor } from '../notes/assets.js'
import { fail, object } from '../notes/validation.js'
import type { NoteConversationController } from './note-conversation.js'
import { readNoteHistory } from './note-history.js'

export type NoteModelController = NoteConversationController & Partial<Pick<SessionController, 'prompt'>>

export function inspectNoteTurns(events: readonly SessionWireEvent[], requestIds: string[]): { active: string[]; ended: string[] } {
  const wanted = new Set(requestIds), ended = new Set<string>(), current = new Set<string>(), inbox = new Map<string, string[]>()
  let turn: number | null = null
  const rpc = (value: unknown): string => { const v = object(value), source = object(v.source); return typeof source.rpcId === 'string' ? source.rpcId : '' }
  for (const event of events) {
    const data = object(event.data)
    if (event.type === 'turn/start') { current.clear(); turn = Number(data.turn) }
    else if (event.type === 'user/message') { const id = rpc(data); if (wanted.has(id)) current.add(id) }
    else if (event.type === 'agent/inbox/spliced') {
      const target = String(data.target), list = inbox.get(target) ?? [], inserted = Array.isArray(data.inserted) ? data.inserted.map(rpc) : []
      const removed = list.splice(Number(data.start), Number(data.removedCount ?? 0), ...inserted); inbox.set(target, list)
      for (const id of removed) if (wanted.has(id)) { if (data.outcome === 'canceled') ended.add(id); else if (turn !== null) current.add(id) }
    } else if (event.type === 'turn/end' && Number(data.turn) === turn) { for (const id of current) ended.add(id); current.clear(); turn = null }
  }
  return { active: turn === null ? [] : [...current], ended: [...ended] }
}

/** Uses only official Host prompt and frozen local image bytes; never reads a
 * path/URL supplied by source text or the model. */
export class NoteModelBridge implements NoteModel {
  constructor(private readonly provider: () => NoteModelController | undefined, private readonly repository: NoteRepository) {}
  private controller(): NoteModelController { const controller = this.provider(); if (!controller?.follow || !controller.page || !controller.prompt) fail('ai_unavailable', '当前会话模型服务不可用，原文已保存'); return controller }
  private async opening(sessionId: string, signal: AbortSignal) {
    const stop = new AbortController(), iterator = this.controller().follow({ address: { kind: 'session', sessionId: sessionId as SessionId }, maxMessages: 1 }, AbortSignal.any([signal, stop.signal]))[Symbol.asyncIterator]()
    try { const first = await iterator.next(); if (first.done || first.value.type !== 'snapshot' || first.value.header.id !== sessionId) fail('ai_session'); return first.value }
    finally { stop.abort(); await iterator.return?.() }
  }
  async inspect(sessionId: string, requestIds: string[], signal: AbortSignal) {
    const opening = await this.opening(sessionId, signal)
    return inspectNoteTurns(await readNoteHistory(this.controller(), sessionId, opening.cursor, signal), requestIds)
  }
  async dispatch(job: NoteJob, stage: NoteStage, prompt: string, signal: AbortSignal): Promise<void> {
    const controller = this.controller(), content: PromptContentPart[] = [{ type: 'text', text: prompt }]
    if (stage.assetIds.length) {
      const limits = (await this.opening(job.sessionId, signal)).projections.values.imageLimits
      if (!limits || stage.assetIds.length > limits.maxImagesPerMessage) fail('ai_image_budget', '图片超过当前模型请求上限，原始图片已保存')
      let total = 0
      for (const asset of stage.assetIds) {
        const bytes = await this.repository.getAsset(asset, signal), mediaType = mediaTypeFor(asset); total += bytes.length
        if (bytes.length > limits.maxImageBytes || total > limits.maxMessageImageBytes || !limits.mediaTypes.includes(mediaType)) fail('ai_image_budget')
        content.push({ type: 'image', mediaType, data: bytes.toString('base64'), name: asset })
      }
    }
    signal.throwIfAborted()
    await controller.prompt!({ requestId: stage.requestId as Parameters<SessionController['prompt']>[0]['requestId'], sessionId: job.sessionId as SessionId, mode: 'queue', content }, signal)
  }
}
