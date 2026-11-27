import test from 'node:test'
import assert from 'node:assert/strict'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { useNoteSelection } from '../src/client/NoteBatch.js'
import { NotesController, type NotesState } from '../src/client/notes-controller.js'
import { emptyNotesState } from '../src/client/notes-controller-helpers.js'
import { translator } from '../src/domain/localization.js'
import type { Api } from '../src/client/api.js'
import type { NoteListItem } from '../src/contracts/notes.js'

const t = translator('zh')
const noopApi = (async () => ({ ok: true })) as unknown as Api
const sampleNote: NoteListItem = {
  noteId: '01K00000000000000000000001',
  heads: ['a'.repeat(64)],
  title: '示例笔记',
  summary: '摘要',
  tags: [],
  notebookId: null,
  status: 'active',
  savedAt: '2026-11-27T00:00:00Z',
  conflicted: false,
}

function renderBatch(state: NotesState): string {
  const controller = new NotesController(noopApi)
  function Harness() {
    const { controls } = useNoteSelection(controller, state, t)
    return React.createElement(React.Fragment, null, controls)
  }
  const html = renderToStaticMarkup(React.createElement(Harness))
  controller.dispose()
  return html
}

test('NoteBatch hides batch controls on empty active list, empty trash, and list errors', () => {
  const emptyActive = renderBatch({ ...emptyNotesState(), items: [] })
  assert.equal(emptyActive, '')

  const emptyTrash = renderBatch({ ...emptyNotesState(), filter: { status: 'trashed' }, items: [] })
  assert.equal(emptyTrash, '')

  const errored = renderBatch({ ...emptyNotesState(), items: [sampleNote], listError: true })
  assert.equal(errored, '')
})

test('NoteBatch renders select button when active items exist and empty-trash button when trashed items exist', () => {
  const activeHtml = renderBatch({ ...emptyNotesState(), items: [sampleNote] })
  assert.match(activeHtml, /class="paper-batch"/)
  assert.match(activeHtml, />多选</)
  assert.doesNotMatch(activeHtml, /清空回收站/)

  const trashHtml = renderBatch({
    ...emptyNotesState(),
    filter: { status: 'trashed' },
    items: [{ ...sampleNote, status: 'trashed' }],
  })
  assert.match(trashHtml, />多选</)
  assert.match(trashHtml, />清空回收站</)
})
