import * as React from 'react'
import { ArrowLeft, BookPlus, SquarePen } from 'lucide-react'
import { BrandMark } from './Brand.js'
import { WindowButton } from './WorkspaceNotice.js'
import { NoteTabBar, type useNoteTabs } from './paper/NoteTabs.js'
import { conversationListTabId } from './paper/note-tabs.js'
import type { NotesController, NotesState } from './notes-controller.js'
import type { NotesWorkspace } from './workspace.js'
import type { T } from './locale.js'

export function ConversationSidebarHeader({
  showDetail,
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
  showDetail: boolean
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
  if (showDetail) {
    return (
      <div className="conversation-detail-bar">
        <button
          className="conversation-detail-back"
          title={t('notesBack')}
          aria-label={t('notesBack')}
          onClick={() => void noteTabs.session.select(conversationListTabId)}
        >
          <ArrowLeft size={16} />
        </button>
        <div className="conversation-detail-tabs">
          <NoteTabBar controller={controller} state={state} {...noteTabs} t={t} />
        </div>
        <div className="conversation-detail-tools">
          <WindowButton workspace={workspace} t={t} />
        </div>
      </div>
    )
  }
  return (
    <>
      <header className="conversation-notes-head">
        <strong>
          <BrandMark size={17} color />
          <span>{t('sessionNotes')}</span>
        </strong>
        <span>
          <button disabled={removed || operation} title={t('notesNew')} aria-label={t('notesNew')} onClick={onCreate}>
            <SquarePen size={17} />
          </button>
          <button disabled={removed} title={t('sessionSave')} aria-label={t('sessionSave')} onClick={onSaveSession}>
            <BookPlus size={17} />
          </button>
          <WindowButton workspace={workspace} t={t} />
        </span>
      </header>
      <NoteTabBar controller={controller} state={state} {...noteTabs} t={t} />
    </>
  )
}
