import * as React from 'react'
import {LoaderCircle, Sparkles} from 'lucide-react'
import type {NoteCaptureBridge, NoteCaptureState} from './note-capture-bridge.js'

/** Suggestions stay in this form until the user explicitly saves the capture. */
export function CaptureMetadata({state,bridge}:{state:NoteCaptureState;bridge:NoteCaptureBridge}){
  const metadata=state.metadata??{title:'',summary:'',tags:[]}
  const [confirm,setConfirm]=React.useState(false),[tags,setTags]=React.useState(metadata.tags.join('，'))
  const lastTags=React.useRef(JSON.stringify(metadata.tags))
  React.useEffect(()=>{const value=JSON.stringify(metadata.tags);if(value!==lastTags.current){lastTags.current=value;setTags(metadata.tags.join('，'))}},[metadata.tags])
  const generate=()=>{setConfirm(false);void bridge.suggest()}
  return <section className="capture-metadata" aria-label="笔记信息">
    <div className="capture-metadata-heading"><strong>笔记信息</strong>{state.suggesting?<button type="button" onClick={()=>bridge.cancelSuggestion()}>停止生成</button>:<button type="button" className="capture-suggest" onClick={()=>state.metadataTouched?setConfirm(true):generate()}><Sparkles size={14}/>AI 建议</button>}</div>
    {confirm&&<div className="capture-replace" role="alert">替换已填写的标题、摘要和标签？<div><button type="button" onClick={()=>setConfirm(false)}>取消</button><button type="button" onClick={generate}>生成并替换</button></div></div>}
    {state.suggesting&&<p role="status" className="capture-suggest-status"><LoaderCircle size={14}/>正在生成建议，可停止或离开；尚未保存笔记。</p>}
    {!state.suggesting&&state.suggestionError&&<p role="alert">未能生成建议。已填写的内容仍保留，可以重试或直接保存。</p>}
    {!state.suggesting&&state.suggestionStale&&<small>转存范围已更改，请检查笔记信息，或重新生成建议。</small>}
    <label>标题 <span aria-hidden="true">*</span><input aria-label="笔记标题" value={metadata.title} required maxLength={200} disabled={state.suggesting} onChange={e=>bridge.metadata({title:e.target.value})}/></label>
    {!metadata.title.trim()&&<small className="capture-required">填写标题后即可保存。</small>}
    <label>摘要 <small>选填</small><textarea aria-label="笔记摘要" rows={3} maxLength={1000} value={metadata.summary} disabled={state.suggesting} placeholder="用一两句话概括，方便以后查找" onChange={e=>bridge.metadata({summary:e.target.value})}/></label>
    <label>标签 <small>选填，以逗号分隔</small><input aria-label="笔记标签" value={tags} disabled={state.suggesting} placeholder="例如：工作，参考资料" onChange={e=>{setTags(e.target.value);const next=[...new Set(e.target.value.split(/[,，\n]/).map(s=>s.trim()).filter(Boolean))].slice(0,20);lastTags.current=JSON.stringify(next);bridge.metadata({tags:next})}}/></label>
    <small>AI 会建议标题、简短摘要和标签，使用宿主模型额度。正文保持原样；生成后仍可修改。</small>
    <style>{`.capture-metadata{display:flex;flex-direction:column;gap:10px}.capture-metadata-heading{display:flex;align-items:center;justify-content:space-between;gap:8px}.capture-metadata button{display:inline-flex;align-items:center;justify-content:center;gap:5px;background:transparent;border:1px solid var(--dsw-alias-border-l2,#ddd);color:inherit;padding:5px 8px;border-radius:6px;cursor:pointer}.capture-metadata .capture-suggest{background:var(--dsw-alias-bg-layer-2,#f5f4f2)}.capture-metadata label{display:block}.capture-metadata input,.capture-metadata textarea{display:block;width:100%;box-sizing:border-box;margin-top:5px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:6px;background:var(--dsw-alias-bg-layer-1,#fff);color:inherit;font:inherit}.capture-metadata textarea{resize:vertical;min-height:72px}.capture-metadata small{font-size:11px;line-height:1.6;opacity:.7}.capture-metadata label small{margin-left:4px}.capture-replace{padding:10px;background:var(--dsw-alias-bg-layer-2,#f5f4f2);border-radius:6px;font-size:12px}.capture-replace>div{display:flex;justify-content:flex-end;gap:6px;margin-top:8px}.capture-suggest-status{display:flex;gap:6px;font-size:12px}.capture-suggest-status svg{flex-shrink:0;animation:capture-spin 1s linear infinite}@keyframes capture-spin{to{transform:rotate(360deg)}}`}</style>
  </section>
}
