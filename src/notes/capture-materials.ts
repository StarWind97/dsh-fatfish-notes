import type {CaptureMaterial,CaptureMessage,CaptureBlock,ArchivedMaterial} from '../contracts/notes.js'
import {changeReferences,references} from './portable-links.js'
import {markdownLabel} from '../contracts/note-links.js'
import {translator,type T} from '../domain/localization.js'
const localTarget=(value:string)=>{try{value=decodeURIComponent(value)}catch{};return value.replace(/^file:\/\/\/?/i,'').replace(/\\/g,'/').replace(/^\.\//,'')}
/** A file card has an explicit identity. Plain text and legacy sources never guess one. */
export function capturedFile(block:CaptureBlock,message:Pick<CaptureMessage,'id'|'seq'>,materials?:ArchivedMaterial[],t:T=translator('zh')){
  if(block.type!=='text'||block.materialId===undefined||materials===undefined)return null
  const matches=materials.filter(m=>m.id===block.materialId)
  const material=matches.length===1?matches[0]:undefined
  if(!material||material.origin!=='upload'||material.kind!=='file'||material.messageId!==message.id||material.seq!==message.seq||!new RegExp(`^upload:${message.seq}:[0-9]+$`).test(material.id)||material.saved&&!/^[a-f0-9]{64}$/.test(material.saved.id))return {label:t('artifactFileLinkUnavailable'),markdown:t('artifactFileLinkUnavailable'),material:undefined}
  const label=material.name.replace(/[\r\n]/g,' '),safe=label.replace(/[\\`*_[\]<>]/g,'\\$&')
  const status=!material.available?'artifactFileUnavailable':material.saved?null:'artifactMaterialOmitted'
  return {material,label:status?t(status,{name:label}):label,markdown:status?t(status,{name:safe}):`[${safe}](../attachments/${material.saved!.id}.bin)`}
}
/** Match only actual local Markdown destinations to known selected materials. No disk search. */
export function captureLinks(messages:CaptureMessage[],materials:CaptureMaterial[],paths:ReadonlyMap<string,string>=new Map()){
  const result=new Map<string,Array<{url:string;image:boolean}>>()
  for(const m of messages)for(const b of m.blocks)if(b.type==='text')for(const ref of references(b.text)){
    if(!ref.used||/^(?:https?:|data:|fatfish-note:|#)/i.test(ref.url))continue
    const target=localTarget(ref.url),matches=materials.filter(file=>{
      const path=paths.get(file.id),normalized=path&&localTarget(path)
      return target===file.name||!!normalized&&(target===normalized||/^[a-z]:\//i.test(target)&&target.toLowerCase()===normalized.toLowerCase())
    })
    if(matches.length===1){const id=matches[0]!.id;result.set(id,[...(result.get(id)??[]),{url:ref.url,image:ref.image}])}
  }
  return result
}
export function capturedText(body:string,materials:ArchivedMaterial[]=[],externalImagesAsLinks=true){
  return changeReferences(body,ref=>{
    if(!ref.used)return undefined
    const material=materials.find(m=>m.bodyLinks?.includes(ref.url))
    if(!material){if(externalImagesAsLinks&&ref.image&&/^https?:\/\//i.test(ref.url)){ref.image=false;return ref.url}return undefined}
    if(material.assetId)return '../assets/'+material.assetId
    if(material.saved){ref.image=false;return '../attachments/'+material.saved.id+'.bin'}
    return undefined
  })
}
export function supplementMarkdown(materials:{assetIds:string[];attachmentIds:string[]},files:{id:string;name:string}[]=[],t:T=translator('zh')){
  const rows=[...materials.assetIds.map((id,i)=>`[${t('artifactSupplementImage',{index:i+1})}](../assets/${id})`),...materials.attachmentIds.map(id=>`[${markdownLabel(files.find(f=>f.id===id)?.name??t('artifactAttachment'))}](../attachments/${id}.bin)`)]
  return rows.length?`\n\n## ${t('supplementTitle')}\n\n`+rows.join('\n\n'):''
}
/** A delivery belongs to a turn; an upload belongs to its visible message. */
export function materialsFor(messages:CaptureMessage[],materials:CaptureMaterial[]):CaptureMaterial[]{
  const ids=new Set(messages.map(m=>m.id)),turns=new Set(messages.flatMap(m=>m.turn===undefined?[]:[m.turn]))
  return materials.filter(m=>m.messageId?ids.has(m.messageId):m.turn!==undefined&&turns.has(m.turn))
}
export function materialMarkdown(materials:ArchivedMaterial[],t:T=translator('zh')):string{
  if(!materials.length)return ''
  const label=(s:string)=>s.replace(/[\\\[\]<>]/g,'\\$&')
  return `\n\n## ${t('artifactFilesImages')}\n\n`+materials.map(m=>m.assetId?`![${label(m.name)}](../assets/${m.assetId})`:m.saved?`[${label(m.name)}](../attachments/${m.saved.id}.bin)`:t('artifactMaterialNotSelected',{name:label(m.name)})).join('\n\n')
}
