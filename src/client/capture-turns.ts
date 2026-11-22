import type { CaptureMessage, CaptureSelection } from '../contracts/notes.js'
import type {T} from './locale.js'

export function captureRangeLabel(t:T,turns:number,messages:number):string {
  return t('capturePicked',{turns:t('captureTurnCount',{count:turns}),messages:t('captureMessageCount',{count:messages})})
}

/** Map the host's finalized-answer sequence to the same exchange shown in fine selection. */
export function indexCaptureTurns(selection: CaptureSelection) {
  const turns: CaptureMessage[][] = []
  const byAnswerSeq = new Map<number,number>()
  for (const message of selection.messages) {
    if (!turns.length || message.role === 'user') turns.push([])
    const index = turns.length - 1
    turns[index]!.push(message)
    if (message.role === 'assistant') byAnswerSeq.set(message.seq,index)
  }
  return { ...selection, turns, byAnswerSeq }
}

export type IndexedSelection = ReturnType<typeof indexCaptureTurns>

export function toggleCaptureMessages(selected: ReadonlySet<string>, ids: readonly string[]): Set<string> {
  const next = new Set(selected)
  const remove = ids.every(id => selected.has(id))
  for (const id of ids) {
    if (remove) next.delete(id)
    else next.add(id)
  }
  return next
}
