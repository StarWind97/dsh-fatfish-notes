import type { CaptureMessage, CaptureRequest, NoteStage, NoteStageResult } from '../contracts/notes.js'
import { selectMessages } from '../notes/capture.js'
import { attemptId, stagePrompt } from '../notes/enrichment-plan.js'
import { fail } from '../notes/validation.js'
import type { NoteConversation } from './note-conversation.js'
import type { NoteModelBridge } from './note-model.js'
import {translator,type T} from '../domain/localization.js'

const inputLimit = 8_000
const sampledMessages = 24

function excerpt(text: string, limit: number): string {
  if (text.length <= limit) return text
  const tail = Math.floor((limit - 3) / 3), head = limit - 3 - tail
  return text.slice(0, head).replace(/[\uD800-\uDBFF]$/, '') + '\n…\n' + text.slice(-tail).replace(/^[\uDC00-\uDFFF]/, '')
}

function suggestionInput(messages: CaptureMessage[]): string {
  const entries = messages.flatMap(message => {
    const text = message.blocks.flatMap(block => block.type === 'text' && !block.materialId ? [block.text] : []).join('\n').trim()
    return text ? [`${message.role}:\n${text}`] : []
  })
  if (!entries.length) fail('ai_no_text')
  if (entries.reduce((size, entry) => size + entry.length + 2, 0) <= inputLimit) return entries.join('\n\n')

  // Spread the sample across the frozen selection, including its first and last messages.
  const count = Math.min(sampledMessages, entries.length)
  const limit = Math.floor(inputLimit / count) - 2
  return Array.from({ length: count }, (_, index) => {
    const sourceIndex = Math.floor(index * (entries.length - 1) / Math.max(1, count - 1))
    return excerpt(entries[sourceIndex]!, limit)
  }).join('\n\n')
}

/** Read only the fixed selection. The model receives text without opening any attachment. */
export async function suggestMetadata(
  request: CaptureRequest, conversation: Pick<NoteConversation, 'readTranscript'>,
  model: Pick<NoteModelBridge, 'dispatch'>, signal: AbortSignal,t:T=translator('zh'),
): Promise<NoteStageResult> {
  if (!request.cut) fail('capture_request')
  const transcript = await conversation.readTranscript(request.sessionId, request.cut, signal)
  const messages = selectMessages(transcript.messages, request)
  if (!messages.length) fail('capture_request')
  const stage: NoteStage = {
    kind: 'final', input: suggestionInput(messages), assetIds: [], attempt: 1,
    requestId: attemptId(request.requestId, 0, 1), status: 'ready', result: null, error: null,
  }
  signal.throwIfAborted()
  const job = { sessionId: request.sessionId }
  const outputLanguage=t.language==='en'?'Write the title, summary and tags in English.':'标题、摘要和标签使用简体中文。'
  const prompt=outputLanguage+'\n'+stagePrompt(job, stage).replace('已保存素材', '所选文字')
  return model.dispatch(job, stage, prompt, signal,t)
}
