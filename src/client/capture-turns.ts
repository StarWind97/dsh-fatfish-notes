import type { CaptureMessage, CaptureSelection } from '../contracts/notes.js'

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
