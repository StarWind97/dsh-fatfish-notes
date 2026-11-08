import { activeNotebook } from '../notes/notebooks.js'
import * as React from 'react'
import { useSyncExternalStore, useEffect, useRef, useState } from 'react'
import { BookPlus, CheckCircle2, LoaderCircle, X } from 'lucide-react'
import { CaptureGlyph, useCaptureAppearance } from './CaptureAppearance.js'
import { inChatSelection } from './CaptureInline.js'
import { CaptureSelection } from './CaptureSelection.js'
import { ConversationExportDialog } from './ConversationExport.js'
import { api } from './api.js'
import { noteDateTime } from '../notes/date.js'
import type { NotebookView } from '../contracts/notes.js'
import type { NoteCaptureBridge } from './note-capture-bridge.js'
import type { T } from './locale.js'
import { notesStyles as s, notesCss } from './notes-style.js'

export function NoteCaptureAction({ bridge, sessionId, messageId, openSetup, t, exporting=false }: { bridge: NoteCaptureBridge; sessionId: string; messageId: string; openSetup: () => void; t: T; exporting?:boolean }) {
  const appearance=useCaptureAppearance()
  const active = useSyncExternalStore(bridge.subscribe,()=>bridge.getSnapshot()?.sessionId===sessionId,()=>false)
  const button=useRef<HTMLButtonElement>(null), started=useRef(false)
  React.useLayoutEffect(()=>{
    if (!active && started.current) {
      started.current=false
      if (document.activeElement===document.body) button.current?.focus({preventScroll:true})
    }
  },[active])
  async function open() {
    try { if (!(await api('/personal',undefined)).sync.ready) { openSetup(); return } }
    catch { openSetup(); return }
    started.current=true
    if(exporting)await bridge.openExport(sessionId,messageId)
    else await bridge.open(sessionId,messageId)
  }
  return <span className="capture-action-wrap" hidden={active}><button ref={button} type="button" className="capture-action" aria-label={t(exporting?'chatExport':'noteCaptureReply')} onClick={() => void open()}>
    <CaptureGlyph appearance={appearance} t={t} exporting={exporting}/>
  </button><span className="capture-tip" aria-hidden="true">{t(exporting?'chatExportTitle':'captureHint')}</span></span>
}
export function NoteCaptureOverlay({ bridge, sessionId, t }: { bridge: NoteCaptureBridge; sessionId: string; t: T }) {
  const state = useSyncExternalStore(bridge.subscribe, bridge.getSnapshot, bridge.getSnapshot), dialog = useRef<HTMLDivElement>(null)
  const [notebooks, setNotebooks] = useState<NotebookView[]>([]), [booksFailed, setBooksFailed] = useState(false)
  useEffect(() => {
    if (state?.status !== 'selecting' || !state.detail || state.exporting || state.sessionId !== sessionId) return
    const controller = new AbortController(); setBooksFailed(false)
    void api('/notes/notebooks', undefined, controller.signal).then(result => setNotebooks(result.notebooks.filter(activeNotebook))).catch(() => { if (!controller.signal.aborted) setBooksFailed(true) })
    return () => controller.abort()
  }, [state?.status, state?.detail, state?.sessionId, !!state?.exporting, sessionId])
  const inline=inChatSelection(state,sessionId)
  useEffect(() => {
    if (state?.sessionId !== sessionId || inline) return
    const trigger=document.activeElement, panel=dialog.current
    panel?.focus()
    return () => {
      if (trigger instanceof HTMLElement && trigger.isConnected && trigger.getClientRects().length &&
          (document.activeElement===document.body || panel?.contains(document.activeElement))) trigger.focus({preventScroll:true})
    }
  }, [bridge, inline, state?.sessionId, sessionId])
  useEffect(() => {
    if (!state?.result?.enrichmentJobId || state.sessionId !== sessionId || state.job && state.job.status !== 'running') return
    const timer = setInterval(() => { void bridge.refreshJob() }, 2500)
    return () => clearInterval(timer)
  }, [bridge, sessionId, state?.result?.enrichmentJobId, state?.job?.status])
  if (!state || state.sessionId !== sessionId) return null
  if (inline) return null
  if(state.exporting?.dialog)return <ConversationExportDialog state={state} bridge={bridge} t={t}/>
  const busy = state.status === 'loading' || state.status === 'saving'
  const count=state.scope==='session' ? state.selection?.messages.length??0 : state.selected.length
  return <div className="notes-surface notes-capture capture-panel" ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={t(state.exporting?'captureFine':'noteCaptureReply')} onKeyDown={event => {
    if (event.key === 'Escape') { if(state.status==='selecting')bridge.showDetail(false);else if(busy)bridge.cancel();else bridge.close();event.preventDefault();event.stopPropagation() }
    if (event.key === 'Tab') {
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,a[href]')), first = controls[0], last = controls.at(-1)
      if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) { event.preventDefault(); first?.focus() }
    }
  }}>
    <style>{notesCss}</style>
    <header className="capture-head"><strong><BookPlus size={18} aria-hidden="true"/>{t(state.status==='selecting'?'captureFine':'noteCaptureReply')}</strong>
      <button type="button" aria-label={t(busy?'cancel':'noteClose')} onClick={()=>busy?bridge.cancel():bridge.close()}><X size={17} aria-hidden="true"/></button>
    </header>
    <div className="capture-scroll">
    {state.status==='selecting' && state.selection && <>
      <CaptureSelection state={state} selection={state.selection} bridge={bridge} t={t}/>
      {state.recoveries.length>0 && <p role="note">{t('noteNewSaveWarning')}</p>}
      {!state.exporting && <div className="capture-options"><label>{t('notesNotebook')}<select value={state.notebookId??notebooks.find(b=>b.isDefault)?.notebookId??''} onChange={e=>bridge.notebook(e.target.value||null)}>
        <option value="" disabled hidden>{t('notesDefaultBook')}</option>{notebooks.map(book=><option key={book.notebookId} value={book.notebookId}>{book.current.title}{book.isDefault?` · ${t('notesDefaultBadge')}`:''}</option>)}
      </select>{booksFailed && <small role="alert">{t('notesBooksFailed')}</small>}</label>
      <label><input type="checkbox" checked={state.autoMetadata} onChange={e=>bridge.options(e.target.checked)}/>{t('noteAutoMetadata')}</label>
      {state.autoMetadata && <small>{t('noteAiDisclosure')}</small>}</div>}
    </>}
    {busy && <p className="capture-progress" role="status"><LoaderCircle size={18} aria-hidden="true"/>{t(state.status==='loading'?'noteLoadingHistory':'noteSaving')}</p>}
    {(state.status === 'failed' || state.status === 'cancelled') && <><p role="alert">{t(state.error === 'note_limit' ? 'noteLimitRecovery' : state.status === 'cancelled' ? 'noteCancelled' : 'noteFailed')}</p><button type="button" style={s.button} onClick={() => state.request ? void bridge.save() : void bridge.reselect()}>{t(state.request ? 'noteRetryOriginal' : 'noteRetry')}</button>{state.request && <button type="button" style={s.button} onClick={() => void bridge.reselect()}>{t('noteReselect')}</button>}</>}
    {state.recoveries.some(item=>item.request.requestId!==state.request?.requestId) && <section aria-label={t('noteRecoveries')}><p>{t('noteRecoveryNotice')}</p>{state.recoveries.map((recovery, index) => recovery.request.requestId === state.request?.requestId ? null : <button key={recovery.request.requestId} type="button" style={s.button} disabled={busy} onClick={() => void bridge.resume(recovery.request.requestId)}>{t(recovery.request.scope === 'session' ? 'noteRecoverSession' : 'noteRecoverSelection', { index: index + 1 })}</button>)}</section>}
    {state.result && <><p className="capture-result" role="status"><CheckCircle2 size={20} aria-hidden="true"/>{t(state.result.complete ? 'noteSaved' : 'noteSavedPartial', { count: state.result.messageCount, missing: state.result.missingAssetIds.length })}</p><p style={s.muted}>{t('noteCut', { time: noteDateTime(state.result.cut.capturedAt) })}</p><button type="button" style={s.button} className="notes-primary" onClick={() => void bridge.openNote()}>{t('noteOpen')}</button></>}
    {state.result?.issues.includes('image_links_kept_as_text') && <p>{t('noteTextOnlyImages')}</p>}
    {state.job && <section aria-label={t('noteAiTask')}><p role="status">{t('noteAiProgress', { done: state.job.stages.filter(stage => stage.status === 'done').length, total: state.job.stages.length })} · {t(state.job.status === 'completed' ? 'noteAiCompleted' : state.job.status === 'candidate' ? 'noteAiCandidate' : state.job.status === 'cancelled' ? 'noteAiCancelled' : state.job.status === 'failed' || state.job.error ? 'noteAiFailed' : 'noteAiRunning')}</p>
      {(state.job.error || state.error) && <p role="alert">{t(['ai_budget','ai_image_budget'].includes(state.job.error ?? '') ? 'noteAiBudget' : 'noteAiFailureHint')}</p>}
      {state.job.status === 'running' && <button type="button" style={s.button} onClick={() => void bridge.refreshJob('cancel')}>{t('noteAiCancel')}</button>}
      {state.job.stages.length > 0 && (state.job.status === 'failed' || state.job.status === 'cancelled' || state.job.error) && <button type="button" style={s.button} onClick={() => void bridge.refreshJob('retry')}>{t('noteAiRetry')}</button>}
      {state.job.candidate && <details><summary>{t('noteAiInspect')}</summary><h3>{state.job.candidate.title}</h3><p>{state.job.candidate.summary}</p><p>{state.job.candidate.tags.join(' · ')}</p></details>}
      {state.job.status === 'candidate' && <><p>{t('noteAiConflict')}</p><button type="button" style={s.button} onClick={() => void bridge.refreshJob('adopt')}>{t(state.openedNote ? 'noteAiAdopt' : 'noteAiReadCurrent')}</button></>}
    </section>}
    {state.openedNote && <><h3>{state.openedNote.current.title}</h3><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{state.openedNote.current.body}</pre></>}
    </div>
    {state.status==='selecting' && <footer className="capture-foot"><span aria-live="polite">{t('noteSelectionCount',{count})}</span>
      <button type="button" className="capture-back" onClick={()=>bridge.showDetail(false)}>{t('captureBack')}</button>
      <button type="button" style={s.button} className="notes-primary" disabled={!count} onClick={()=>state.exporting?bridge.exportDialog():void bridge.save()}>{t(state.exporting?'chatExportContinue':state.autoMetadata?'noteSaveWithAi':'noteCaptureReply')}</button>
    </footer>}
  </div>
}
