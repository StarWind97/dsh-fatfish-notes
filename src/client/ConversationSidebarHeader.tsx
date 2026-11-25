import * as React from 'react'
import { BookPlus, SquarePen } from 'lucide-react'
import { WindowButton } from './WorkspaceNotice.js'
import { NoteTabBar, type useNoteTabs } from './paper/NoteTabs.js'
import type { NotesController, NotesState } from './notes-controller.js'
import type { NotesWorkspace } from './workspace.js'
import type { T } from './locale.js'

export function ConversationSidebarHeader({
  removed,
  operation,
  controller,
  state,
  noteTabs,
  workspace,
  t,
  onCreate,
  onSaveSession,
}: {
  showDetail?: boolean
  removed: boolean
  operation: boolean
  controller: NotesController
  state: NotesState
  noteTabs: ReturnType<typeof useNoteTabs>
  workspace: NotesWorkspace
  t: T
  onCreate: () => void
  onSaveSession: () => void
}) {
  return (
    <header className="conversation-top-bar">
      <div className="conversation-top-tabs">
        <NoteTabBar controller={controller} state={state} {...noteTabs} t={t} />
      </div>
      <div className="conversation-top-tools">
        <button disabled={removed || operation} title={t('notesNew')} aria-label={t('notesNew')} onClick={onCreate}>
          <SquarePen size={16} />
        </button>
        <button disabled={removed} title={t('sessionSave')} aria-label={t('sessionSave')} onClick={onSaveSession}>
          <BookPlus size={16} />
        </button>
        <WindowButton workspace={workspace} t={t} />
      </div>
    </header>
  )
}
