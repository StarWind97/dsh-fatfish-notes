import {PaperDialog} from './paper/PaperDialog.js'
import {CaptureMaterials} from './CaptureMaterials.js'
import {CaptureNotebook} from './CaptureNotebook.js'
import {CaptureMetadata} from './CaptureMetadata.js'
import {conversationNotesCss} from './ConversationNotes.js'
import * as React from 'react'
import { useSyncExternalStore, useEffect, useRef } from 'react'
import { BookPlus, CheckCircle2, LoaderCircle, X } from 'lucide-react'
import { CaptureGlyph, useCaptureAppearance } from './CaptureAppearance.js'
import { inChatSelection } from './CaptureInline.js'
import { CaptureSelection } from './CaptureSelection.js'
import { ConversationExportDialog } from './ConversationExport.js'
import { api } from './api.js'
import { noteDateTime } from '../notes/date.js'
import type { NoteCaptureBridge } from './note-capture-bridge.js'
import type { T } from './locale.js'
import { notesStyles as s, notesCss } from './notes-style.js'

export function NoteCaptureAction({ bridge, sessionId, messageId, openSetup, t, exporting=false }: { bridge: NoteCaptureBridge; sessionId: string; messageId: string; openSetup: () => void; t: T; exporting?:boolean }) {
  const appearance=useCaptureAppearance()
  const active = useSyncExternalStore(bridge.subscribe,()=>{const state=bridge.getSnapshot();return state?.sessionId===sessionId&&['loading','selecting','saving'].includes(state.status)},()=>false)
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
  const [bookValid,setBookValid]=React.useState(false)
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
  if (!state || state.sessionId !== sessionId || state.minimized ) return null
  if (inline) return null
  if(state.exporting?.dialog)return <ConversationExportDialog state={state} bridge={bridge} t={t}/>
  const busy = state.status === 'loading' || state.status === 'saving'
  const count=state.scope==='session' ? state.selection?.messages.length??0 : state.selected.length
  return <PaperDialog className="capture-dialog" title={t(state.exporting?'captureFine':'captureOptions')} closeLabel={t('paperClose')} onClose={()=>busy?bridge.cancel():state.status==='selecting'?bridge.showDetail(false):bridge.close()}><div className="notes-surface notes-capture capture-panel" ref={dialog} tabIndex={-1} aria-label={t(state.exporting?'captureFine':'noteCaptureReply')} onKeyDown={event => {
    if (event.key === 'Escape' && !event.nativeEvent.isComposing && !event.defaultPrevented) { if(state.status==='selecting')bridge.showDetail(false);else if(busy)bridge.cancel();else bridge.close();event.preventDefault();event.stopPropagation() }
    if (event.key === 'Tab') {
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary,a[href]')), first = controls[0], last = controls.at(-1)
      if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) { event.preventDefault(); first?.focus() }
    }
  }}>
    <style>{notesCss+conversationNotesCss+captureDialogCss}</style>
    <div className={`capture-scroll${state.status==='selecting'?' capture-selecting':''}`}>
    {state.status==='selecting' && state.selection && <>
      <div className="capture-preview"><CaptureSelection state={state} selection={state.selection} bridge={bridge} t={t}/>{state.exporting&&<CaptureMaterials state={state} bridge={bridge} t={t} messageIds={state.scope==='session'?state.selection.messages.map(m=>m.id):state.selected}/>}</div>
      {state.recoveries.length>0 && <p role="note">{t('noteNewSaveWarning')}</p>}
      {!state.exporting && <div className="capture-options"><CaptureNotebook value={state.notebookId} choose={id=>bridge.notebook(id)} onValid={setBookValid} t={t}/>
      <CaptureMetadata state={state} bridge={bridge}/><CaptureMaterials state={state} bridge={bridge} t={t} messageIds={state.scope==='session'?state.selection.messages.map(m=>m.id):state.selected}/></div>}
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
      <button type="button" style={s.button} className="notes-primary" disabled={!count||!state.exporting&&(!bookValid||state.suggesting||!state.metadata?.title.trim())} onClick={()=>state.exporting?bridge.exportDialog():void bridge.save()}>{t(state.exporting?'chatExportContinue':'noteCaptureReply')}</button>
    </footer>}
  </div></PaperDialog>
}

const captureDialogCss=`
.paper-dialog.capture-dialog{width:min(1220px,calc(100vw - 48px));max-width:calc(100vw - 32px);max-height:calc(100dvh - 48px)}
.capture-dialog .capture-panel{position:static;inset:auto;width:100%;max-width:none;max-height:none;border:0;border-radius:0;box-shadow:none;display:flex;flex:1;flex-direction:column;min-height:0;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#222)}
.capture-dialog .capture-scroll{padding:20px;overflow:auto;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 320px;align-items:start;gap:20px}
.capture-dialog .capture-preview{min-width:0}.capture-dialog .capture-options{margin:0;padding:0 0 0 20px;border:0;border-left:1px solid var(--dsw-alias-border-l2,#ddd);display:flex;flex-direction:column;gap:14px;position:sticky;top:0}.capture-dialog .capture-foot{flex:none;padding:14px 20px;background:var(--dsw-alias-bg-layer-1,#fff)}
.capture-dialog .capture-scroll>:not(.capture-preview):not(.capture-options){grid-column:1/-1}
.capture-dialog .capture-message-body{max-height:none;overflow:visible}.capture-dialog .capture-options select{color-scheme:inherit}
.capture-dialog .capture-selecting{overflow:hidden;grid-template-rows:minmax(0,1fr)}.capture-dialog .capture-selecting .capture-preview,.capture-dialog .capture-selecting .capture-options{overflow:auto;min-height:0;max-height:100%;align-self:stretch}.capture-dialog .capture-options{position:static}.capture-dialog .capture-options .capture-materials{margin:0}.capture-dialog .capture-options .capture-materials>div{max-height:none;overflow:visible}
@media(max-width:850px){.capture-dialog .capture-scroll{display:flex;flex-direction:column;overflow:auto;padding:16px}.capture-dialog .capture-selecting .capture-options,.capture-dialog .capture-selecting .capture-preview{overflow:visible;max-height:none;flex:none}.capture-dialog .capture-options{order:-1;border-left:0;border-bottom:1px solid var(--dsw-alias-border-l2,#ddd);padding:0 0 16px;margin:0 0 8px}}
`
