import type {CaptureSource,NoteRevision,NoteView} from '../../contracts/notes.js'
import {omitMaterials} from '../material-markdown.js'
import {references} from '../portable-links.js'

/** Ephemeral projection of a verified revision. It is never saved as a revision. */
export interface ReadingSnapshot {kind:'reading';filename:string;note:NoteView;source:CaptureSource|null;assets:Record<string,string>}
export function readingProjection(note:NoteRevision,source:CaptureSource|null,assets:string[],files:string[],tags=true,summary=true):Omit<ReadingSnapshot,'filename'|'assets'> {
  const current={...note,body:omitMaterials(note.body,new Set(assets),new Set(files)),tags:tags?note.tags:[],summary:summary?note.summary:'',assetIds:assets,
    attachments:(note.attachments??[]).filter(f=>files.includes(f.id)),
    ...(note.supplements?{supplements:{assetIds:note.supplements.assetIds.filter(id=>assets.includes(id)),attachmentIds:note.supplements.attachmentIds.filter(id=>files.includes(id))}}:{})}
  const projected=source?{...source,assets:Object.fromEntries(Object.entries(source.assets).filter(([,id])=>assets.includes(id))),
    ...(source.archivedMaterials?{archivedMaterials:source.archivedMaterials.map(m=>{const copy={...m};if(copy.saved&&!files.includes(copy.saved.id))delete copy.saved;if(copy.assetId&&!assets.includes(copy.assetId))delete copy.assetId;return copy})}:{})}:null
  return {kind:'reading',note:{noteId:note.noteId,heads:[note.revision],current,conflicts:[],savedAt:note.recordedAt,effectiveNotebookId:note.notebookId},source:projected}
}
/** Card-only images and attachment originals are not decoded or read for a screenshot. */
export function readingImageIds(value:Pick<ReadingSnapshot,'note'|'source'>):string[]{
  const ids=references(value.note.current.body).filter(r=>r.used&&r.image&&r.url.startsWith('../assets/')).map(r=>r.url.slice(10)).filter(id=>value.note.current.assetIds.includes(id))
  if(value.source){ids.push(...Object.values(value.source.assets));ids.push(...(value.source.archivedMaterials??[]).flatMap(m=>(!m.imageId||!!m.saved)&&m.assetId?[m.assetId]:[]))}
  return [...new Set(ids)]
}
