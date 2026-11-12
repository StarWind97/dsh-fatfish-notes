import type {NoteContent,NoteSupplements} from '../contracts/notes.js'
import {bodyMaterials} from './reference-materials.js'

type Materials=Pick<NoteContent,'body'|'assetIds'|'attachments'|'supplements'>
/** Legacy revisions are read without rewriting their Markdown or hashes. */
export function supplementMaterials(note:Materials):NoteSupplements {
  if(note.supplements)return {assetIds:[...note.supplements.assetIds],attachmentIds:[...note.supplements.attachmentIds]}
  const used=bodyMaterials(note.body)
  const hashes=new Set([...used.assetIds.map(id=>id.slice(0,64)),...used.attachmentIds])
  return {assetIds:note.assetIds.filter(id=>!hashes.has(id.slice(0,64))&&!note.body.includes(id)),attachmentIds:(note.attachments??[]).filter(f=>!hashes.has(f.id)).map(f=>f.id)}
}
/** Persist this when editing: a later deletion from the body must not resurrect a supplement. */
export function remainingSupplements(note:Materials):NoteSupplements {
  const extra=supplementMaterials(note),ids=[...extra.assetIds.map(id=>id.slice(0,64)),...extra.attachmentIds]
  // Most typing has no relevant resource URL; avoid Markdown parsing on that path.
  if(!ids.some(id=>note.body.includes(id)))return extra
  const used=bodyMaterials(note.body),hashes=new Set([...used.assetIds.map(id=>id.slice(0,64)),...used.attachmentIds])
  return {assetIds:extra.assetIds.filter(id=>!hashes.has(id.slice(0,64))),attachmentIds:extra.attachmentIds.filter(id=>!hashes.has(id))}
}
export function currentMaterials(note:Materials):NoteSupplements {
  const used=bodyMaterials(note.body),extra=supplementMaterials(note)
  return {assetIds:[...new Set([...used.assetIds,...extra.assetIds])].filter(id=>note.assetIds.includes(id)),attachmentIds:[...new Set([...used.attachmentIds,...extra.attachmentIds])].filter(id=>note.attachments?.some(f=>f.id===id))}
}
export function withoutSupplement(note:Materials,id:string):NoteSupplements {
  const extra=supplementMaterials(note)
  return {assetIds:extra.assetIds.filter(a=>a.slice(0,64)!==id.slice(0,64)),attachmentIds:extra.attachmentIds.filter(a=>a!==id.slice(0,64))}
}
