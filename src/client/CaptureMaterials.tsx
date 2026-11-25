import * as React from 'react'
import { Image, Paperclip } from 'lucide-react'
import { ATTACHMENT_LIMIT, ATTACHMENT_WARNING, type CaptureMaterial } from '../contracts/notes.js'
import { materialsFor } from '../notes/capture-materials.js'
import type { NoteCaptureBridge, NoteCaptureState } from './note-capture-bridge.js'
import { fileSize } from './NoteAttachments.js'
import type { T } from './locale.js'
import { useStyleSheet } from './styles/inject.js'

export function captureMaterialAvailable(material: CaptureMaterial): boolean {
  return material.available && material.bytes !== null && material.bytes <= ATTACHMENT_LIMIT
}

function MaterialPreview({ material, src }: { material: CaptureMaterial; src?: string | undefined }) {
  const [failed, setFailed] = React.useState(false)
  React.useEffect(() => setFailed(false), [src])
  if (src && !failed) {
    return (
      <span className="capture-material-thumb-wrap" aria-hidden="true">
        <img className="capture-material-thumb" src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
      </span>
    )
  }
  return (
    <span className="capture-material-badge" data-kind={material.kind} data-broken={failed || undefined} aria-hidden="true">
      {material.kind === 'image' ? <Image size={16} /> : <Paperclip size={16} />}
    </span>
  )
}

export function CaptureMaterialList({ materials, selected, allowLarge, onSelect, onLarge, previewUrl, t }: {
  materials: CaptureMaterial[]; selected: ReadonlySet<string>; allowLarge: boolean
  onSelect: (ids: string[]) => void; onLarge: (value: boolean) => void
  previewUrl?: ((material: CaptureMaterial) => string | undefined) | undefined
  t: T
}) {
  useStyleSheet('capture-materials-list', listCss, 'components')
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
        const src = !refused && material.kind === 'image' ? previewUrl?.(material) : undefined
        return <label key={material.id}>
          <input type="checkbox" checked={!refused&&selected.has(material.id)} disabled={refused}
            onChange={event=>onSelect(event.target.checked?[...selected,material.id]:[...selected].filter(id=>id!==material.id))}/>
          <MaterialPreview material={material} src={src}/>
          <span>{material.name}<small>{t(material.origin==='upload'?'captureUpload':'captureDelivery')} · {material.bytes===null?'—':fileSize(material.bytes)} {refused&&t(material.available?'attachmentTooLarge':'captureMaterialMissing')}</small></span>
        </label>
      })}</section>
    })}</div>
    {kept.some(material=>Number(material.bytes)>ATTACHMENT_WARNING)&&<label className="capture-large-approval">
      <input type="checkbox" checked={allowLarge} onChange={event=>onLarge(event.target.checked)}/>{t('attachmentLarge')}
    </label>}
  </>
}

export function CaptureMaterials({state,bridge,t,messageIds,disabled=false}:{state:NoteCaptureState;bridge:NoteCaptureBridge;t:T;messageIds:string[];disabled?:boolean}){
  useStyleSheet('capture-materials-box', captureMaterialsBoxCss, 'components')
  const ids = new Set(messageIds)
  const materials=materialsFor(state.selection?.messages.filter(message=>ids.has(message.id))??[],state.selection?.materials??[])
  if(!materials.length)return null
  const selected=new Set(state.materialIds??materials.filter(captureMaterialAvailable).map(material=>material.id))
  const throughSeq = state.selection?.cut.throughSeq
  const previewUrl = throughSeq === undefined ? undefined : (material: CaptureMaterial) =>
    `/dsh-fatfish-notes/notes/capture-preview?sessionId=${encodeURIComponent(state.sessionId)}&throughSeq=${throughSeq}&materialId=${encodeURIComponent(material.id)}`
  return <fieldset className="capture-materials" disabled={disabled}><legend>{t('captureMaterials')}</legend>
    <p>{t('captureMaterialsHint')}</p>
    <p>{fileSize(materials.filter(material=>selected.has(material.id)).reduce((total,material)=>total+(material.bytes??0),0))}</p>
    <CaptureMaterialList materials={materials} selected={selected} allowLarge={state.allowLarge??false} onSelect={ids=>bridge.materials(ids)} onLarge={value=>bridge.large(value)} previewUrl={previewUrl} t={t}/>
  </fieldset>
}

const captureMaterialsBoxCss=`.capture-materials{border:1px solid var(--border,var(--rule));border-radius:8px;padding:12px;margin:14px 0;font-size:13px;min-width:0}.capture-materials p{font-size:12px;opacity:.7;margin:5px 0 10px}.capture-materials .capture-file-list{max-height:240px;overflow:auto}`

const listCss=`
.capture-file-actions{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px}.capture-file-actions button{white-space:nowrap;padding:4px 10px;font-size:12px}
.capture-file-list label,.capture-large-approval{display:flex;align-items:center;gap:10px;padding:7px 9px;margin:5px 0;border:1px solid var(--rule);border-radius:9px;background:var(--shelf,var(--base));overflow-wrap:anywhere}
.capture-material-thumb-wrap{display:inline-flex;align-items:center;justify-content:center;width:48px;height:36px;flex:none;border-radius:7px;overflow:hidden;border:1px solid var(--rule);background:var(--paper,var(--base))}
.capture-material-thumb{display:block;width:100%;height:100%;object-fit:cover}
.capture-material-badge{display:inline-grid;place-items:center;width:48px;height:36px;flex:none;border-radius:7px;background:var(--selected);color:var(--accent)}
.capture-material-badge[data-broken=true]{background:var(--chrome,var(--shelf));color:var(--muted);border:1px dashed var(--rule)}
.capture-file-list label span:last-child{min-width:0;flex:1}.capture-file-list label svg{flex:none}
.capture-file-list h4{font-size:12px;margin:8px 0 4px;font-weight:600;color:var(--muted)}.capture-file-list small{display:block;color:var(--muted);font-size:11px;margin-top:1px}
`
