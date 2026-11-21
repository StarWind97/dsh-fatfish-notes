import * as React from 'react'
import type { NoteCaptureBridge, NoteCaptureState } from './note-capture-bridge.js'
import type { T } from './locale.js'
import { notesStyles } from './notes-style.js'

export function CaptureRecoveries({ state, bridge, t, disabled = false }: {
  state: NoteCaptureState; bridge: NoteCaptureBridge; t: T; disabled?: boolean
}) {
  if (!state.recoveries.some(item => item.request.requestId !== state.request?.requestId)) return null
  return <section aria-label={t('noteRecoveries')}>
    <p>{t('noteRecoveryNotice')}</p>
    {state.recoveries.map((item, index) => item.request.requestId === state.request?.requestId ? null :
      <button key={item.request.requestId} type="button" style={notesStyles.button} disabled={disabled}
        onClick={() => void bridge.resume(item.request.requestId)}>
        {t(item.request.scope === 'session' ? 'noteRecoverSession' : 'noteRecoverSelection', { index: index + 1 })}
      </button>)}
  </section>
}
