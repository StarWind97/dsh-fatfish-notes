import * as React from 'react'
import {LoaderCircle, Sparkles} from 'lucide-react'
import type {NoteCaptureBridge, NoteCaptureState} from './note-capture-bridge.js'
import type {T} from './locale.js'

/** Suggestions stay in this form until the user explicitly saves the capture. */
type MetadataState=Pick<NoteCaptureState,'metadata'|'metadataTouched'|'suggesting'|'suggestionError'|'suggestionStale'>
export function CaptureMetadata({state,bridge,t}:{state:MetadataState;bridge:NoteCaptureBridge;t:T}){
  const metadata=state.metadata??{title:'',summary:'',tags:[]}
  const [confirm,setConfirm]=React.useState(false),[tags,setTags]=React.useState(metadata.tags.join('，'))
  const lastTags=React.useRef(JSON.stringify(metadata.tags))
  React.useEffect(()=>{const value=JSON.stringify(metadata.tags);if(value!==lastTags.current){lastTags.current=value;setTags(metadata.tags.join('，'))}},[metadata.tags])
  const generate=()=>{setConfirm(false);void bridge.suggest()}
  return <section className="capture-metadata" aria-label={t('captureMetadata')}>
    <div className="capture-metadata-heading"><strong>{t('captureMetadata')}</strong>{state.suggesting?<button type="button" onClick={()=>bridge.cancelSuggestion()}>{t('captureStopSuggestion')}</button>:<button type="button" className="capture-suggest" onClick={()=>state.metadataTouched?setConfirm(true):generate()}><Sparkles size={14}/>{t('captureAiSuggest')}</button>}</div>
    {confirm&&<div className="capture-replace" role="alert">{t('captureConfirmReplace')}<div><button type="button" onClick={()=>setConfirm(false)}>{t('cancel')}</button><button type="button" onClick={generate}>{t('captureGenerateReplace')}</button></div></div>}
    {state.suggesting&&<p role="status" className="capture-suggest-status"><LoaderCircle size={14}/>{t('captureSuggesting')}</p>}
    {!state.suggesting&&state.suggestionError&&<p role="alert">{state.suggestionError==='ai_no_text'?t('captureSuggestNoText'):state.suggestionError==='ai_timeout'?t('captureSuggestTimeout'):t('captureSuggestFailed')}</p>}
    {!state.suggesting&&state.suggestionStale&&<small>{t('captureSuggestStale')}</small>}
    <label>{t('notesTitle')}<span aria-hidden="true">*</span><input aria-label={t('captureNoteTitle')} value={metadata.title} required maxLength={200} disabled={state.suggesting} onChange={e=>bridge.metadata({title:e.target.value})}/></label>
    {!metadata.title.trim()&&<small className="capture-required">{t('captureTitleRequired')}</small>}
    <label>{t('notesSummary')}<small>{t('fieldOptional')}</small><textarea aria-label={t('captureNoteSummary')} rows={3} maxLength={1000} value={metadata.summary} disabled={state.suggesting} placeholder={t('captureSummaryPlaceholder')} onChange={e=>bridge.metadata({summary:e.target.value})}/></label>
    <label>{t('notesTag')}<small>{t('captureTagsOptional')}</small><input aria-label={t('captureNoteTags')} value={tags} disabled={state.suggesting} placeholder={t('captureTagPlaceholder')} onChange={e=>{setTags(e.target.value);const next=[...new Set(e.target.value.split(/[,，\n]/).map(s=>s.trim()).filter(Boolean))].slice(0,20);lastTags.current=JSON.stringify(next);bridge.metadata({tags:next})}}/></label>
    <small>{t('captureSuggestExplanation')}</small>
    <style>{`.capture-metadata{display:flex;flex-direction:column;gap:10px}.capture-metadata-heading{display:flex;align-items:center;justify-content:space-between;gap:8px}.capture-metadata button{display:inline-flex;align-items:center;justify-content:center;gap:5px;background:transparent;border:1px solid var(--dsw-alias-border-l2,#ddd);color:inherit;padding:5px 8px;border-radius:6px;cursor:pointer}.capture-metadata .capture-suggest{background:var(--dsw-alias-bg-layer-2,#f5f4f2)}.capture-metadata label{display:block}.capture-metadata input,.capture-metadata textarea{display:block;width:100%;box-sizing:border-box;margin-top:5px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:6px;background:var(--dsw-alias-bg-layer-1,#fff);color:inherit;font:inherit}.capture-metadata textarea{resize:vertical;min-height:72px}.capture-metadata small{font-size:11px;line-height:1.6;opacity:.7}.capture-metadata label small{margin-left:4px}.capture-replace{padding:10px;background:var(--dsw-alias-bg-layer-2,#f5f4f2);border-radius:6px;font-size:12px}.capture-replace>div{display:flex;justify-content:flex-end;gap:6px;margin-top:8px}.capture-suggest-status{display:flex;gap:6px;font-size:12px}.capture-suggest-status svg{flex-shrink:0;animation:capture-spin 1s linear infinite}@keyframes capture-spin{to{transform:rotate(360deg)}}`}</style>
  </section>
}
