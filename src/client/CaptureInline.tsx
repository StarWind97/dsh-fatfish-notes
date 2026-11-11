import * as React from 'react'
import { ListChecks, LoaderCircle } from 'lucide-react'
import type { T } from './locale.js'
import type { NoteCaptureBridge, NoteCaptureState } from './note-capture-bridge.js'
import type { IndexedSelection } from './capture-turns.js'

export function NoteTurnCheckbox({bridge, sessionId, seq, t}: {bridge:NoteCaptureBridge; sessionId:string; seq:number; t:T}) {
  const state = React.useSyncExternalStore(bridge.subscribe,bridge.getSnapshot,bridge.getSnapshot)
  if (state?.sessionId!==sessionId || state.status!=='selecting' || !state.selection || state.detail || state.exporting?.dialog) return null
  const index = state.selection.byAnswerSeq.get(seq)
  if (index===undefined) return null
  const ids = state.selection.turns[index]!.map(m=>m.id)
  const count = ids.filter(id=>state.selected.includes(id)).length
  const whole = state.scope==='session'
  return <label className="capture-inline-turn" data-picked={whole || count>0}>
    <input type="checkbox" aria-label={t('captureTurn',{n:index+1})} checked={whole || count===ids.length}
      ref={box=>{if(box)box.indeterminate=!whole && count>0 && count<ids.length}} disabled={whole}
      onChange={()=>bridge.toggleMessages(ids)}/>
    <span>{t('capturePickTurn')}</span>
  </label>
}

export function inChatSelection(state:NoteCaptureState | null,sessionId:string) {
  return state?.sessionId===sessionId && !state.detail && !state.exporting?.dialog && (state.status==='loading' || state.status==='selecting')
}
export function NoteCaptureDock({bridge,sessionId,t}: {bridge:NoteCaptureBridge; sessionId:string; t:T}) {
  const state=React.useSyncExternalStore(bridge.subscribe,bridge.getSnapshot,bridge.getSnapshot)
  const ref=React.useRef<HTMLDivElement>(null), active=inChatSelection(state,sessionId)
  React.useEffect(()=>{
    if(!active)return
    ref.current?.focus({preventScroll:true})
    const cancel=(event:KeyboardEvent)=>{
      if(event.isComposing || event.key!=='Escape' || event.defaultPrevented || !ref.current?.getClientRects().length ||
        (event.target instanceof Element && event.target.closest('dialog[open],[role="dialog"]')))return
      event.preventDefault();bridge.close()
    }
    window.addEventListener('keydown',cancel)
    return ()=>window.removeEventListener('keydown',cancel)
  },[active,bridge])
  if(!active || !state)return null
  return <div ref={ref} className="capture-bar-wrap" tabIndex={-1}>
    {state.selection ? <CaptureBar state={state} selection={state.selection} bridge={bridge} t={t}/> :
      <div className="capture-bar capture-bar-row"><strong role="status"><LoaderCircle size={16} aria-hidden="true"/>{t('noteLoadingHistory')}</strong>
        <span className="capture-bar-space"/><button type="button" onClick={()=>bridge.close()}>{t('cancel')}</button></div>}
  </div>
}

function CaptureBar({state,selection,bridge,t}: {state:NoteCaptureState; selection:IndexedSelection; bridge:NoteCaptureBridge; t:T}) {
  const selected = new Set(state.selected), whole = state.scope==='session'
  const turns = whole ? selection.turns.length : selection.turns.filter(group=>group.some(m=>selected.has(m.id))).length
  const count = whole ? selection.messages.length : selected.size
  return <div className="capture-bar" role="region" aria-label={t(state.exporting?'chatExportTitle':'noteCaptureReply')}>
    <div className="capture-bar-row">
      <button type="button" className="capture-picked" onClick={()=>bridge.showDetail(true)} aria-live="polite"><ListChecks size={16} aria-hidden="true"/>{t('capturePicked',{turns,messages:count})}</button>
      <button type="button" aria-pressed={whole} onClick={()=>bridge.setScope(whole?'selection':'session')}>{t('captureWhole')}</button>
      <button type="button" title={t(state.exporting?'captureFine':'captureFineHint')} onClick={()=>bridge.showDetail(true)}>{t(state.exporting?'captureFine':'captureOptions')}{!!selection.materials?.length&&` · ${selection.materials.length}`}</button>
      <button type="button" className="capture-bar-space" aria-label={t('captureOptions')} onClick={()=>bridge.showDetail(true)}/>
      <button type="button" onClick={()=>bridge.close()}>{t('cancel')}</button>
      <button type="button" className="capture-bar-save" disabled={!count} onClick={()=>state.exporting?bridge.exportDialog():bridge.showDetail(true)}>{t(state.exporting?'chatExportContinue':'captureNext')}</button>
    </div>
    {!selection.complete && <small role="alert">{t(state.exporting?'chatExportPartial':'notePartialSource')}</small>}
    {state.autoMetadata && <small>{t('noteAutoMetadata')}</small>}
  </div>
}
