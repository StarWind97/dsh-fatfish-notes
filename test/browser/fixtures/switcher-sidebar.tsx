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
const makeNote = (id: string, title: string): NoteListItem => ({
  noteId: id, title, notebookId: null, summary: '', tags: [], status: 'active',
  savedAt: '', heads: [], pinned: false, conflicted: false,
})
const results: NoteListItem[] = [
  makeNote('1', 'Alpha'),
  makeNote('2', 'Beta'),
  ...Array.from({ length: 24 }, (_, i) => makeNote(`item-${i + 1}`, `Item ${String(i + 1).padStart(2, '0')} crowd`)),
]
const lateGamma = makeNote('3', 'pairkey Gamma')
const lateCrowdTop = makeNote('crowd-top', 'crowd-top')
const tags = Array.from({ length: 61 }, (_, i) => ({ tag: 'tag-' + i, count: 1 }))

export const requests: string[] = []
const resolvers = new Map<string, () => void>()
export function finishQuery(query: string) {
  const fn = resolvers.get(query)
  if (!fn) throw new Error(`No pending resolver for query "${query}"`)
  resolvers.delete(query)
  fn()
}
export function finishSlow() { finishQuery('slow') }

const waitFor = (query: string) => new Promise<void>(resolve => { resolvers.set(query, resolve) })

const search: Api = (async (path, body) => {
  if (path === '/notes/catalog') return { ok: true, tags }
  const { query } = body as { query: string }
  requests.push(query)
  if (query === 'slow') {
    await waitFor('slow')
    return { ok: true, items: [results[0]!] }
  }
  if (query === 'pairkey') {
    await waitFor('pairkey')
    // Late body match inserts pairkey Gamma at top, shifting Alpha & Beta down.
    return { ok: true, items: [lateGamma, results[0]!, results[1]!] }
  }
  if (query === 'reorder') {
    await waitFor('reorder')
    // Same-count reorder: swap Beta before Alpha with equal match count.
    return { ok: true, items: [results[1]!, results[0]!] }
  }
  if (query === 'crowd') {
    await waitFor('crowd')
    // Late exact-prefix/higher-ranked match pushes item-24 out of the 24-item slice.
    return { ok: true, items: [lateCrowdTop] }
  }
  if (query === 'budget.xlsx') return { ok: true, items: [results[1]!] }
  return { ok: true, items: ['body-only', 'Alpha'].includes(query) ? [results[0]!] : [] }
}) as Api

const controller = new NotesController(search)
const initialItems: NoteListItem[] = [
  { ...results[0]!, summary: 'pairkey reorder' },
  { ...results[1]!, summary: 'pairkey reorder' },
  ...results.slice(2),
]
const state = { ...emptyNotesState(), items: initialItems }
const bridge = new NoteCaptureBridge()
const nothing = () => {}
export const actions: string[] = []
export function clearActions() { actions.length = 0 }

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
