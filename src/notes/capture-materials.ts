import type {CaptureMaterial,CaptureMessage,ArchivedMaterial} from '../contracts/notes.js'
import {changeReferences,references} from './portable-links.js'
import {markdownLabel} from '../contracts/note-links.js'
const localTarget=(value:string)=>{try{value=decodeURIComponent(value)}catch{};return value.replace(/^file:\/\/\/?/i,'').replace(/\\/g,'/').replace(/^\.\//,'')}
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
export function supplementMarkdown(materials:{assetIds:string[];attachmentIds:string[]},files:{id:string;name:string}[]=[]){
  const rows=[...materials.assetIds.map((id,i)=>`[补充图片 ${i+1}](../assets/${id})`),...materials.attachmentIds.map(id=>`[${markdownLabel(files.find(f=>f.id===id)?.name??'附件')}](../attachments/${id}.bin)`)]
  return rows.length?'\n\n## 补充附件\n\n'+rows.join('\n\n'):''
}
/** A delivery belongs to a turn; an upload belongs to its visible message. */
export function materialsFor(messages:CaptureMessage[],materials:CaptureMaterial[]):CaptureMaterial[]{
  const ids=new Set(messages.map(m=>m.id)),turns=new Set(messages.flatMap(m=>m.turn===undefined?[]:[m.turn]))
  return materials.filter(m=>m.messageId?ids.has(m.messageId):m.turn!==undefined&&turns.has(m.turn))
}
export function materialMarkdown(materials:ArchivedMaterial[]):string{
  if(!materials.length)return ''
  const label=(s:string)=>s.replace(/[\\\[\]<>]/g,'\\$&')
  return '\n\n## 文件与图片\n\n'+materials.map(m=>m.assetId?`![${label(m.name)}](../assets/${m.assetId})`:m.saved?`[${label(m.name)}](../attachments/${m.saved.id}.bin)`:`${label(m.name)}（未选择归档）`).join('\n\n')
}
