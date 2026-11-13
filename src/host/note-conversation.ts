import {ConversationFiles,materialName,type ConversationFileServices,type MaterialReference} from './conversation-files.js'
import {captureLinks} from '../notes/capture-materials.js'
import type {FileAttachmentRef} from '@deepseek-ai/dsh-attachment'
import type {CaptureMaterial} from '../contracts/notes.js'
import type { SessionController, SessionWireEvent } from '@deepseek-ai/dsh-api-session-controller'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type { AttachmentId, ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import type { CaptureCut, CaptureMessage } from '../contracts/notes.js'
import type { CaptureRead } from '../notes/capture.js'
import { NOTE_LIMITS } from '../notes/types.js'
import { fail, object, text } from '../notes/validation.js'
import { readNoteHistory } from './note-history.js'
import { validateAsset } from '../notes/assets.js'
import type { ImageMediaType } from '../contracts/media.js'
import { NotebookError } from '../domain/errors.js'

export type NoteConversationController = Pick<SessionController, 'follow' | 'page' | 'attachment'>
// Known events with no effect on archived human text. Unknown required events
// must remain a completeness warning; a plugin may own a human-visible mutation.
const nonTranscript = new Set(`agent-preset/selected agent/inbox/spliced approval/asked approval/decided approval/policy assistant/attempt command/done command/run compaction/end compaction/prune compaction/start compaction/summary deliverables/presented developer/message feedback/message-delete feedback/message-put feedback/record goal/change hook/invoked hook/result image/offload job/registered job/settled llm/retry llm/retry-started model/selection permission/preset plan/mode request/context request/header sandbox/mode schedule/change session-log-deepseek/delivery-accepted session/end-seed session/title session/title-llm-request step/end step/start subagent/catalog subagent/descriptor subagent/model-selection-policy system/message team/member team/message/delivered team/message/queued team/task todo/write tool-workflow/agent-end tool-workflow/agent-start tool-workflow/run-end tool-workflow/run-start tool/call tool/ptc-dispatch tool/ptc-dispatch-start tool/result turn/end turn/start web/deepseek-search-llm-request working-directory/change workspace/changes`.split(' '))

/** Archive append-origin text, rather than the model-compaction replacement. */
export function projectTranscript(events: readonly SessionWireEvent[]): CaptureRead {
  const messages: CaptureMessage[] = [], issues = new Set<string>(), ids = new Set<string>()
  const materials:CaptureMaterial[]=[],materialReferences=new Map<string,MaterialReference>();let turn:number|undefined
  const imageReferences = new Map<string, ImageAttachmentRef>()
  for (const event of events) {
    const eventData=object(event.data)
    if(event.type==='turn/start'&&typeof eventData.turn==='number')turn=eventData.turn
    if(event.type==='deliverables/presented'&&Array.isArray(eventData.files)){
      for(const [i,raw]of eventData.files.entries()){
        const file=object(raw);if(typeof file.path!=='string')continue
        const id=`delivery:${event.seq}:${i}`,name=materialName(file.path),ext=name.split('.').at(-1)?.toLowerCase()
        materials.push({id,kind:['png','jpg','jpeg','gif','webp'].includes(ext??'')?'image':'file',origin:'delivery',name,bytes:null,seq:event.seq,...(typeof eventData.turn==='number'?{turn:eventData.turn}:turn===undefined?{}:{turn}),available:true})
        materialReferences.set(id,{kind:'delivery',path:file.path})
      }
    }
    if (event.type === 'tool/ptc-dispatch') {
      const content = object(event.data).content
      if (Array.isArray(content) && content.some(b => object(b).type === 'image')) issues.add('unsupported_tool_images')
    }
    const toolImages = event.type === 'tool/result'
    if (event.type !== 'user/message' && event.type !== 'assistant/message' && !toolImages) {
      if (!nonTranscript.has(event.type) && event.ignorable !== true) issues.add('unknown_required_event')
      continue
    }
    if (event.surfaceOp !== 'append') {
      if (!event.surfaceOp || typeof event.surfaceOp !== 'object' || Array.isArray(event.surfaceOp) || event.surfaceOp.op !== 'replace') issues.add('unknown_surface_operation')
      continue
    }
    const data = object(event.data)
    if (event.type === 'user/message' && object(data.source).kind !== 'user') continue
    const message = event.type === 'user/message' ? data : object(data.message)
    const messageId = text(message.id, 512)
    if (!Array.isArray(message.content)) fail('capture_protocol')
    const blocks: CaptureMessage['blocks'] = []
    for (const [index,raw] of message.content.entries()) {
      const block = object(raw)
      if (block.type === 'text' && !toolImages) blocks.push({ type: 'text', text: text(block.text, NOTE_LIMITS.body) })
      else if(block.type==='file'&&!toolImages){
        const ref=object(block.attachment),id=`upload:${event.seq}:${index}`,name=typeof ref.name==='string'?materialName(ref.name):'附件'
        const valid=typeof ref.attachmentId==='string'&&/^sha256:[a-f0-9]{64}$/.test(ref.attachmentId)&&Number.isSafeInteger(ref.bytes)&&Number(ref.bytes)>=0
        materials.push({id,kind:'file',origin:'upload',name,bytes:valid?Number(ref.bytes):null,seq:event.seq,...(turn===undefined?{}:{turn}),messageId,available:valid})
        if(valid)materialReferences.set(id,{kind:'upload',ref:ref as unknown as FileAttachmentRef})
        blocks.push({type:'text',text:`[上传文件：${name}]`,materialId:id})
      }
      else if (block.type === 'image') {
        const attachment = object(block.attachment), attachmentId = text(attachment.attachmentId, 512), mediaType = text(attachment.mediaType, 100)
        blocks.push({ type: 'image', attachmentId, mediaType })
        if (['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(mediaType) &&
          [attachment.bytes, attachment.width, attachment.height].every(v => typeof v === 'number' && Number.isSafeInteger(v) && v > 0)) {
          imageReferences.set(attachmentId, { attachmentId: attachmentId as AttachmentId, mediaType: mediaType as ImageMediaType,
            bytes: attachment.bytes as number, width: attachment.width as number, height: attachment.height as number })
        }
        const ref=imageReferences.get(attachmentId),id=`image:${event.seq}:${index}`
        materials.push({id,kind:'image',origin:event.type==='user/message'?'upload':'delivery',name:typeof attachment.name==='string'?materialName(attachment.name):`会话图片.${mediaType.split('/')[1]??'png'}`,bytes:ref?.bytes??null,seq:event.seq,...(turn===undefined?{}:{turn}),messageId,imageId:attachmentId,available:!!ref})
        if(ref)materialReferences.set(id,{kind:'image',ref})
      }
      else if (!toolImages && !['reasoning', 'tool-call'].includes(String(block.type))) issues.add('unsupported_content')
    }
    if (!blocks.length) continue
    if (ids.has(messageId)) { issues.add('duplicate_message_identity'); continue }
    ids.add(messageId); messages.push({ id: messageId, seq: event.seq, ...(typeof data.turn==='number'?{turn:data.turn}:turn===undefined?{}:{turn}), role: event.type === 'user/message' ? 'user' : 'assistant', blocks })
    if (messages.length > NOTE_LIMITS.messages) fail('note_limit', '会话超过 20,000 条可见消息，未保存为完整笔记')
  }
  const links=captureLinks(messages,materials,new Map([...materialReferences].flatMap(([id,ref])=>ref.kind==='delivery'?[[id,ref.path] as const]:[])))
  const uploads=new Set(messages.flatMap(m=>m.blocks.flatMap(b=>b.type==='text'&&b.materialId?[b.materialId]:[])))
  for(const material of materials)material.placement=material.imageId||links.has(material.id)||uploads.has(material.id)?'body':'supplement'
  return { messages, complete: !issues.size, issues: [...issues], imageReferences,materials,materialReferences }
}

export class NoteConversation {
  private files:ConversationFiles
  constructor(private readonly provider: () => NoteConversationController | undefined,services:ConversationFileServices={}) {this.files=new ConversationFiles(services)}
  private controller(): NoteConversationController {
    const value = this.provider()
    if (!value?.follow || !value.page) throw new NotebookError('conversation_unavailable', '宿主未提供完整会话读取服务', 503)
    return value
  }
  async open(sessionId: string, signal: AbortSignal): Promise<CaptureCut> {
    signal.throwIfAborted()
    const controller = new AbortController(), combined = AbortSignal.any([signal, controller.signal])
    const iterator = this.controller().follow({ address: { kind: 'session', sessionId: sessionId as SessionId }, maxMessages: 40 }, combined)[Symbol.asyncIterator]()
    try {
      // Once an opening arrived, let the caller persist its cut even if a cancel
      // races with this frame. It checks cancellation before subsequent paging.
      const first = await iterator.next()
      if (first.done || first.value.type !== 'snapshot' || first.value.header.id !== sessionId || !Number.isSafeInteger(first.value.cursor) || first.value.cursor < -1) fail('capture_protocol')
      return { throughSeq: first.value.cursor, capturedAt: new Date().toISOString(), isSeeded: first.value.header.isSeeded }
    } finally { controller.abort(); await iterator.return?.() }
  }
  async read(sessionId: string, cut: Pick<CaptureCut,'throughSeq'>, signal: AbortSignal): Promise<CaptureRead> {
    const result=projectTranscript(await readNoteHistory(this.controller(), sessionId, cut.throughSeq, signal))
    for(const material of result.materials??[]){const ref=result.materialReferences?.get(material.id);if(ref)await this.files.describe(sessionId,material,ref,signal)}
    return result
  }
  material(sessionId:string,material:CaptureMaterial,reference:MaterialReference,signal:AbortSignal,progress?:(bytes:number)=>void){return this.files.read(sessionId,material,reference,signal,progress)}
  async attachment(sessionId: string, attachmentId: string, mediaType: string, signal: AbortSignal, reference?: ImageAttachmentRef): Promise<{ bytes: Buffer; mediaType: ImageMediaType }> {
    signal.throwIfAborted()
    if (!reference || reference.attachmentId !== attachmentId || reference.mediaType !== mediaType || reference.bytes > NOTE_LIMITS.image) fail('capture_attachment')
    const result = await this.controller().attachment({ sessionId: sessionId as SessionId, attachment: reference })
    signal.throwIfAborted()
    if (result.attachment.attachmentId !== attachmentId || result.attachment.mediaType !== mediaType || !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(mediaType)) fail('capture_attachment')
    const bytes = Buffer.from(result.data, 'base64')
    if (bytes.length !== result.attachment.bytes || bytes.length > NOTE_LIMITS.image) fail('capture_attachment')
    validateAsset(bytes, mediaType as ImageMediaType)
    return { bytes, mediaType: mediaType as ImageMediaType }
  }
}
