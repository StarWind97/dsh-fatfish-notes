import * as React from 'react'
import { Maximize2, Minimize2, RotateCcw } from 'lucide-react'
import { ATTACHMENT_WARNING } from '../contracts/notes.js'
import { materialsFor } from '../notes/capture-materials.js'
import { CaptureMaterialList, captureMaterialAvailable } from './CaptureMaterials.js'
import { CaptureMetadata } from './CaptureMetadata.js'
import { CaptureNotebook } from './CaptureNotebook.js'
import { CaptureRecoveries } from './CaptureRecoveries.js'
import { CaptureTurnList } from './CaptureSelection.js'
import { fileSize } from './NoteAttachments.js'
import { captureCss } from './capture-style.js'
import { captureOptionsCss } from './capture-options-style.js'
import { toggleCaptureMessages, type IndexedSelection } from './capture-turns.js'
import type { T } from './locale.js'
import type { NoteCaptureBridge, NoteCaptureState } from './note-capture-bridge.js'
import { notesCss, notesStyles } from './notes-style.js'
import { PaperDialog } from './paper/PaperDialog.js'

const expandedViewport = '(min-width: 1180px) and (min-height: 720px)'
function subscribeViewport(notify: () => void) {
  const media = window.matchMedia(expandedViewport)
  media.addEventListener('change', notify)
  return () => media.removeEventListener('change', notify)
}
const viewportIsExpanded = () => window.matchMedia(expandedViewport).matches

type Review = { kind: 'range'; ids: ReadonlySet<string> } | { kind: 'files'; ids: ReadonlySet<string>; allowLarge: boolean }

export function CaptureOptions({ state, selection, bridge, t }: {
  state: NoteCaptureState; selection: IndexedSelection; bridge: NoteCaptureBridge; t: T
}) {
  const autoExpanded = React.useSyncExternalStore(subscribeViewport, viewportIsExpanded, () => false)
  const [layout, setLayout] = React.useState<boolean | null>(null)
  const [review, setReview] = React.useState<Review | null>(null)
  const [bookValid, setBookValid] = React.useState(false)
  const reviewBody = React.useRef<HTMLDivElement>(null)
  const opener = React.useRef<HTMLButtonElement | null>(null)
  const layoutButton = React.useRef<HTMLButtonElement>(null)
  const expanded = layout ?? autoExpanded

  const committed = React.useMemo(() => new Set(state.scope==='session' ? selection.messages.map(message=>message.id) : state.selected),
    [selection, state.scope, state.selected])
  const materials = React.useMemo(() => materialsFor(selection.messages.filter(message=>committed.has(message.id)),selection.materials??[]),
    [selection, committed])
  const committedFiles = React.useMemo(() => new Set(state.materialIds??materials.filter(captureMaterialAvailable).map(material=>material.id)),
    [materials, state.materialIds])
  const selected = review?.kind==='range' ? review.ids : committed
  const selectedFiles = review?.kind==='files' ? review.ids : committedFiles
  const allowLarge = review?.kind==='files' ? review.allowLarge : state.allowLarge??false
  const kept = materials.filter(material=>selectedFiles.has(material.id)&&captureMaterialAvailable(material))
  const needsLarge = kept.some(material=>Number(material.bytes)>ATTACHMENT_WARNING)
  const rangeLabel = t('capturePicked', {turns:selection.turns.filter(turn=>turn.some(message=>selected.has(message.id))).length, messages:selected.size})
  const fileLabel = materials.length ? t('captureFileCount', {
    count:kept.length,total:materials.length,size:fileSize(kept.reduce((size,material)=>size+(material.bytes??0),0)),
  }) : t('captureNoMaterials')

  React.useLayoutEffect(() => {
    if (review) reviewBody.current?.focus({preventScroll:true})
    else if (opener.current) {
      const button = opener.current
      const target = button.isConnected&&button.getClientRects().length?button:layoutButton.current
      target?.focus({preventScroll:true})
      opener.current = null
    }
  }, [review?.kind])

  function toggle(ids: string[]) {
    if (review?.kind==='range') setReview({...review, ids:toggleCaptureMessages(review.ids,ids)})
    else bridge.toggleMessages(ids)
  }
  function chooseFiles(ids: string[]) {
    const current = new Set(selectedFiles)
    for (const material of materials) current.delete(material.id)
    for (const id of ids) current.add(id)
    if (review?.kind==='files') setReview({...review, ids:current, allowLarge:false})
    else bridge.materials([...current])
  }
  function approveLarge(value: boolean) {
    if (review?.kind==='files') setReview({...review, allowLarge:value})
    else bridge.large(value)
  }
  function finishReview(apply: boolean) {
    if (apply && review?.kind==='range') bridge.chooseMessages(review.ids)
    if (apply && review?.kind==='files') bridge.materials([...review.ids],review.allowLarge)
    setReview(null)
  }
  function close() {
    if (review) finishReview(false)
    else bridge.showDetail(false)
  }

  const turns = () => <CaptureTurnList selection={selection} selected={selected} anchorMessageId={state.anchorMessageId} toggle={toggle} t={t}/>
  const files = () => <CaptureMaterialList materials={materials} selected={selectedFiles} allowLarge={allowLarge} onSelect={chooseFiles} onLarge={approveLarge} t={t}/>
  const layoutLabel = t(expanded?'captureLayoutCompact':'captureLayoutExpand')
  const autoLabel = t('captureLayoutAuto')
  const LayoutIcon = expanded ? Minimize2 : Maximize2
  const headerActions = !review && <>
    {layout!==null && <button type="button" aria-label={autoLabel} title={autoLabel} onClick={()=>setLayout(null)}>
      <span className="capture-layout-label">{autoLabel}</span>
      <RotateCcw className="capture-layout-icon" size={17} aria-hidden="true"/>
    </button>}
    <button type="button" ref={layoutButton} aria-label={layoutLabel} title={layoutLabel} onClick={()=>setLayout(!expanded)}>
      <span className="capture-layout-label">{layoutLabel}</span>
      <LayoutIcon className="capture-layout-icon" size={17} aria-hidden="true"/>
    </button>
  </>

  return <PaperDialog className={`capture-save ${review?'capture-save-review':expanded?'capture-save-expanded':'capture-save-compact'}`}
    title={t(review?.kind==='range'?'captureTurns':review?.kind==='files'?'captureMaterials':'captureOptions')}
    closeLabel={t(review?'cancel':'paperClose')} onClose={close} headerActions={headerActions}>
    <div className="notes-surface capture-panel capture-save-panel">
      <style>{notesCss+captureCss+captureOptionsCss}</style>
      {!selection.complete && <p className="capture-save-warning" role="alert">{t('notePartialSource')}</p>}
      {!review && state.recoveries.length>0 && <p className="capture-save-warning" role="note">{t('noteNewSaveWarning')}</p>}
      <div className="capture-save-body" hidden={!!review}>
        <section className="capture-save-range" aria-label={t('captureRange')}>
          <div className="capture-scope" role="group" aria-label={t('captureRange')}>
            {(['selection','session'] as const).map(scope=><button key={scope} type="button" aria-pressed={state.scope===scope} onClick={()=>bridge.setScope(scope)}>
              {t(scope==='session'?'captureWhole':'captureTurns')}
            </button>)}
          </div>
          <div className="capture-save-summary">
            <span aria-live="polite">{rangeLabel}</span>
            <div className="capture-save-actions">
              {!expanded && <button type="button" onClick={event=>{opener.current=event.currentTarget;setReview({kind:'range', ids:committed})}}>{t('captureReview')}</button>}
              <button type="button" className="capture-return" onClick={()=>bridge.showDetail(false)}>{t('captureBackSelect')}</button>
            </div>
          </div>
          {expanded&&!review && <div className="capture-column-scroll">{turns()}</div>}
        </section>
        <section className="capture-save-files" aria-label={t('captureMaterials')}>
          <div className="capture-save-summary">
            <div><strong>{t('captureMaterials')}</strong><small aria-live="polite">{fileLabel}</small></div>
            {!expanded && <button type="button" aria-label={t('captureReviewFiles')} disabled={!materials.length}
              onClick={event=>{opener.current=event.currentTarget;setReview({kind:'files', ids:committedFiles, allowLarge})}}>{t('captureReview')}</button>}
          </div>
          {!expanded&&needsLarge && <label className="capture-large-approval"><input type="checkbox" checked={allowLarge} onChange={event=>approveLarge(event.target.checked)}/>{t('attachmentLarge')}</label>}
          {expanded&&!review && <>{materials.length>0&&<p className="capture-file-hint">{t('captureMaterialsHint')}</p>}<div className="capture-column-scroll">{files()}</div></>}
        </section>
        <section className="capture-save-details">
          <CaptureNotebook value={state.notebookId} choose={id=>bridge.notebook(id)} onValid={setBookValid} t={t}/>
          <CaptureMetadata state={state} bridge={bridge} t={t}/>
          <CaptureRecoveries state={state} bridge={bridge} t={t} disabled={state.suggesting??false}/>
        </section>
      </div>
      {review && <div className="capture-save-review-body" ref={reviewBody} tabIndex={-1}>
        {review.kind==='range'?turns():<><p className="capture-file-hint">{t('captureMaterialsHint')}</p>{files()}</>}
      </div>}
      <footer className="capture-foot capture-save-foot">
        {review ? <><span aria-live="polite">{review.kind==='range'?rangeLabel:fileLabel}</span>
          <button type="button" onClick={()=>finishReview(false)}>{t('cancel')}</button>
          <button type="button" style={notesStyles.button} className="notes-primary" onClick={()=>finishReview(true)}>{t('captureApply')}</button></>
          : <button type="button" className="notes-primary" style={notesStyles.button}
            disabled={!committed.size||!bookValid||state.suggesting||!state.metadata?.title.trim()||needsLarge&&!allowLarge}
            onClick={()=>void bridge.save()}>{t('noteCaptureReply')}</button>}
      </footer>
    </div>
  </PaperDialog>
}
