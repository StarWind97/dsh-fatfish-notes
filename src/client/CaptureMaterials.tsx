import * as React from 'react'
import {Image,Paperclip} from 'lucide-react'
import {ATTACHMENT_LIMIT,ATTACHMENT_WARNING} from '../contracts/notes.js'
import {materialsFor} from '../notes/capture-materials.js'
import type {NoteCaptureBridge,NoteCaptureState} from './note-capture-bridge.js'
import {fileSize} from './NoteAttachments.js'
import type {T} from './locale.js'
export function CaptureMaterials({state,bridge,t,messageIds,disabled=false}:{state:NoteCaptureState;bridge:NoteCaptureBridge;t:T;messageIds:string[];disabled?:boolean}){
  const materials=materialsFor(state.selection?.messages.filter(m=>messageIds.includes(m.id))??[],state.selection?.materials??[])
  if(!materials.length)return null
  const selected=state.materialIds??materials.map(m=>m.id)
  return <fieldset className="capture-materials" disabled={disabled}><legend>{t('captureMaterials')}</legend><p>{t('captureMaterialsHint')}</p><p><button type="button" onClick={()=>bridge.materials(materials.filter(m=>m.available&&m.bytes!==null&&m.bytes<=ATTACHMENT_LIMIT).map(m=>m.id))}>{t('materialsSelectAll')}</button> · <button type="button" onClick={()=>bridge.materials([])}>{t('materialsClear')}</button> · {fileSize(materials.filter(m=>selected.includes(m.id)).reduce((n,m)=>n+(m.bytes??0),0))}</p><div>{(['body','supplement'] as const).map(placement=><React.Fragment key={placement}>{materials.some(m=>(m.imageId||m.placement==='body'?'body':'supplement')===placement)&&<h4>{t(placement==='body'?'bodyMaterials':'supplementTitle')}</h4>}{materials.filter(m=>(m.imageId||m.placement==='body'?'body':'supplement')===placement).map(m=>{
    const refused=!m.available||m.bytes===null||m.bytes>ATTACHMENT_LIMIT
    return <label key={m.id}><input type="checkbox" checked={!refused&&selected.includes(m.id)} disabled={refused} onChange={e=>bridge.materials(e.target.checked?[...selected,m.id]:selected.filter(id=>id!==m.id))}/>{m.kind==='image'?<Image size={16}/>:<Paperclip size={16}/>}<span>{m.name}<small>{t(m.origin==='upload'?'captureUpload':'captureDelivery')} · {m.bytes===null?'—':fileSize(m.bytes)} {refused&&t(m.available?'attachmentTooLarge':'captureMaterialMissing')}</small></span></label>
  })}</React.Fragment>)}</div>{materials.some(m=>selected.includes(m.id)&&Number(m.bytes)>ATTACHMENT_WARNING)&&<label><input type="checkbox" checked={state.allowLarge??false} onChange={e=>bridge.large(e.target.checked)}/>{t('attachmentLarge')}</label>}<style>{`.capture-materials{border:1px solid var(--border,var(--rule));border-radius:8px;padding:12px;margin:14px 0;font-size:13px;min-width:0}.capture-materials p{font-size:12px;opacity:.7;margin:5px 0 10px}.capture-materials>div{max-height:240px;overflow:auto}.capture-materials label{display:flex;align-items:center;gap:8px;padding:6px 0;overflow-wrap:anywhere}.capture-materials label span{min-width:0}.capture-materials h4{font-size:12px;margin:12px 0 4px;font-weight:600}.capture-materials small{display:block;opacity:.65;font-size:11px}`}</style></fieldset>
}
