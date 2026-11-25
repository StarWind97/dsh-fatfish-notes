import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { QuickSwitcher } from '../../../src/client/QuickSwitcher.js'
import { ConversationNotes } from '../../../src/client/ConversationNotes.js'
import { NoteCaptureOverlay } from '../../../src/client/NoteCapture.js'
import { NoteCaptureBridge } from '../../../src/client/note-capture-bridge.js'
import { NotesController } from '../../../src/client/notes-controller.js'
import { emptyNotesState } from '../../../src/client/notes-controller-helpers.js'
import { translator } from '../../../src/domain/localization.js'
import type { Api } from '../../../src/client/api.js'
import type { NoteListItem } from '../../../src/contracts/notes.js'

const t = translator('en')
const results: NoteListItem[] = ['Alpha','Beta'].map((title,i) => ({
  noteId: String(i+1), title, notebookId: null, summary: '', tags: [], status: 'active',
  savedAt: '', heads: [], pinned: false, conflicted: false,
}))
const tags = Array.from({ length: 61 }, (_, i) => ({ tag: 'tag-' + i, count: 1 }))
export const requests: string[] = []
export let finishSlow: (() => void) | undefined
const search: Api = (async (path, body) => {
  if (path === '/notes/catalog') return { ok: true, tags }
  const { query } = body as { query: string }
  requests.push(query)
  if (query === 'slow') await new Promise<void>(resolve => { finishSlow = resolve })
  if (query === 'budget.xlsx') return { ok: true, items: [results[1]] }
  return { ok: true, items: ['slow','body-only','Alpha'].includes(query) ? [results[0]] : [] }
}) as Api
const controller = new NotesController(search)
const state = { ...emptyNotesState(), items: results }
const bridge = new NoteCaptureBridge()
const nothing = () => {}
export const actions: string[] = []
function Switcher() {
  const [open, setOpen] = React.useState(false)
  return <><button id="open" onClick={() => setOpen(true)}>Open</button>
    <QuickSwitcher controller={controller} state={state} books={[]} t={t} open={open} onClose={() => setOpen(false)}
      onOpenNote={id => actions.push('note:' + id)} onFilterTag={tag => actions.push(tag)}
      onCreate={nothing} onToggleTheme={nothing} onSync={nothing} onOpenBook={nothing} onNavigate={nothing}/></>
}
const root = createRoot(document.getElementById('root')!)
export function mountSwitcher() { flushSync(() => root.render(<Switcher/>)) }

// The slots provide these hooks even when the sidebar tab is in the background.
const slot = { sessionId: 'fixture', useTabInfo: () => ({ tab: { id: 'test', visible: false } }),
  useSession: () => false, useInput: () => null } as unknown as React.ComponentProps<typeof ConversationNotes>
export function mountSlots(sidebar: boolean, overlay: boolean) {
  flushSync(() => root.render(<>
    {sidebar && <ConversationNotes {...slot} bridge={bridge} t={t}/>}
    {overlay && <NoteCaptureOverlay sessionId="fixture" bridge={bridge} t={t}/>}
  </>))
}
