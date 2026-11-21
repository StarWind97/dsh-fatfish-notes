import * as React from 'react'
import { Image, Paperclip } from 'lucide-react'
import { ATTACHMENT_LIMIT, ATTACHMENT_WARNING, type CaptureMaterial } from '../contracts/notes.js'
import { materialsFor } from '../notes/capture-materials.js'
import type { NoteCaptureBridge, NoteCaptureState } from './note-capture-bridge.js'
import { fileSize } from './NoteAttachments.js'
import type { T } from './locale.js'

export function captureMaterialAvailable(material: CaptureMaterial): boolean {
  return material.available && material.bytes !== null && material.bytes <= ATTACHMENT_LIMIT
}

export function CaptureMaterialList({ materials, selected, allowLarge, onSelect, onLarge, t }: {
  materials: CaptureMaterial[]; selected: ReadonlySet<string>; allowLarge: boolean
  onSelect: (ids: string[]) => void; onLarge: (value: boolean) => void; t: T
}) {
  const available = materials.filter(captureMaterialAvailable), kept = available.filter(material => selected.has(material.id))
  if (!materials.length) return <p className="capture-no-materials">{t('captureNoMaterials')}</p>
  return <>
    <div className="capture-file-actions">
      <button type="button" disabled={!available.length} onClick={()=>onSelect(available.map(material=>material.id))}>{t('materialsSelectAll')}</button>
      <button type="button" disabled={!kept.length} onClick={()=>onSelect([])}>{t('materialsClear')}</button>
    </div>
    <div className="capture-file-list">{(['body','supplement'] as const).map(placement=>{
      const rows=materials.filter(material=>(material.imageId||material.placement==='body'?'body':'supplement')===placement)
      if (!rows.length) return null
      return <section key={placement}><h4>{t(placement==='body'?'bodyMaterials':'supplementTitle')}</h4>{rows.map(material=>{
        const refused = !captureMaterialAvailable(material)
        return <label key={material.id}>
          <input type="checkbox" checked={!refused&&selected.has(material.id)} disabled={refused}
            onChange={event=>onSelect(event.target.checked?[...selected,material.id]:[...selected].filter(id=>id!==material.id))}/>
          {material.kind==='image'?<Image size={16} aria-hidden="true"/>:<Paperclip size={16} aria-hidden="true"/>}
          <span>{material.name}<small>{t(material.origin==='upload'?'captureUpload':'captureDelivery')} · {material.bytes===null?'—':fileSize(material.bytes)} {refused&&t(material.available?'attachmentTooLarge':'captureMaterialMissing')}</small></span>
        </label>
      })}</section>
    })}</div>
    {kept.some(material=>Number(material.bytes)>ATTACHMENT_WARNING)&&<label className="capture-large-approval">
      <input type="checkbox" checked={allowLarge} onChange={event=>onLarge(event.target.checked)}/>{t('attachmentLarge')}
    </label>}
    <style>{listCss}</style>
  </>
}

export function CaptureMaterials({state,bridge,t,messageIds,disabled=false}:{state:NoteCaptureState;bridge:NoteCaptureBridge;t:T;messageIds:string[];disabled?:boolean}){
  const ids = new Set(messageIds)
  const materials=materialsFor(state.selection?.messages.filter(message=>ids.has(message.id))??[],state.selection?.materials??[])
  if(!materials.length)return null
  const selected=new Set(state.materialIds??materials.filter(captureMaterialAvailable).map(material=>material.id))
  return <fieldset className="capture-materials" disabled={disabled}><legend>{t('captureMaterials')}</legend>
    <p>{t('captureMaterialsHint')}</p>
    <p>{fileSize(materials.filter(material=>selected.has(material.id)).reduce((total,material)=>total+(material.bytes??0),0))}</p>
    <CaptureMaterialList materials={materials} selected={selected} allowLarge={state.allowLarge??false} onSelect={ids=>bridge.materials(ids)} onLarge={value=>bridge.large(value)} t={t}/>
    <style>{`.capture-materials{border:1px solid var(--border,var(--rule));border-radius:8px;padding:12px;margin:14px 0;font-size:13px;min-width:0}.capture-materials p{font-size:12px;opacity:.7;margin:5px 0 10px}.capture-materials .capture-file-list{max-height:240px;overflow:auto}`}</style>
  </fieldset>
}

const listCss=`
.capture-file-actions{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px}
.capture-file-list label,.capture-large-approval{display:flex;align-items:center;gap:8px;padding:6px 0;overflow-wrap:anywhere}
.capture-file-list label span{min-width:0}.capture-file-list label svg{flex:none}
.capture-file-list h4{font-size:12px;margin:8px 0 4px;font-weight:600}.capture-file-list small{display:block;opacity:.7;font-size:11px}
`
