import type {CaptureSource} from '../../contracts/notes.js'
import {readingProjection,readingImageIds,type ReadingSnapshot} from './reading.js'
import {currentMaterials,supplementMaterials} from '../note-materials.js'
import {supplementMarkdown} from '../capture-materials.js'
import {omitMaterials} from '../material-markdown.js'
import {changeReferences} from '../portable-links.js'
import {attachmentLinkId} from '../../contracts/note-links.js'
import { noteDateTime } from '../date.js'
import type { NoteRepository } from '../repository.js'
import { object, id, hash, text, sortedStrings, assetId } from '../validation.js'
import { validateAsset, mediaTypeFor, sourceAttachments } from '../assets.js'
import { ExportError, exportModel, type ExportBlock, type ExportModel, type ExportSnapshot } from './model.js'
import { exportFilename, exportMarkdown, sourceMarkdown } from './markdown.js'
import { zippedFile,type ZipEntry } from './zip.js'
import { exportPdf } from './pdf.js'
import { EXPORT_LIMITS } from './layout.js'
import { imageDimensions } from './image.js'

/** Rendering needs decoded images in memory; this never limits Markdown or stored originals. */
export function renderImageBudget(){let bytes=0,pixels=0;return (value:Buffer)=>{const size=imageDimensions(value);bytes+=value.length;pixels+=size.width*size.height;if(bytes>128*1024*1024||pixels>128_000_000)throw new ExportError('export_image_budget')}}
export interface ExportFile { bytes: Buffer; mediaType: string; filename: string;stream?:()=>AsyncIterable<Uint8Array> }
export async function createExport(repository: NoteRepository, input: unknown, signal?: AbortSignal,streaming=false): Promise<ExportFile> {
  const v = object(input), format = text(v.format, 30)
  if (Object.keys(v).some(key => !['noteId','revision','format','includeSource','includeTags','includeSummary','convertedImages','assetId','assetIds','attachmentIds'].includes(key))) throw new ExportError('export_request')
  if (!['markdown','markdown-zip','pdf','png-long','png-pages','snapshot','original'].includes(format)) throw new ExportError('export_request')
  for (const flag of [v.includeSource,v.includeTags,v.includeSummary]) {
    if (flag !== undefined && typeof flag !== 'boolean') throw new ExportError('export_request')
  }
  const note = await repository.getRevision(id(v.noteId), hash(v.revision), signal), filename = exportFilename(note.title)
  if (format === 'original') {
    const asset = text(v.assetId, 80)
    if (!note.assetIds.includes(asset)) throw new ExportError('export_image_missing')
    return { bytes: await repository.getAsset(asset, signal), mediaType: mediaTypeFor(asset), filename: `${filename}-${asset.slice(0, 10)}.${asset.split('.')[1]}` }
  }
  const original=v.includeSource===true&&note.sourceId?await repository.getSource(note.sourceId,signal):null
  const rawSource=original?sourceMarkdown(original):null
  const active=currentMaterials(note),supplement=supplementMaterials(note)
  const allAssets=[...new Set([...active.assetIds,...(rawSource?.assets??[])])]
  const allFiles=[...new Map([...(note.attachments??[]).filter(f=>active.attachmentIds.includes(f.id)),...(original?sourceAttachments(original):[])].map(a=>[a.id,a])).values()]
  const selectedAssets=v.assetIds===undefined?allAssets:sortedStrings(v.assetIds,128,assetId),selectedFiles=v.attachmentIds===undefined?allFiles.map(a=>a.id):sortedStrings(v.attachmentIds,128,hash)
  if(selectedAssets.some(a=>!allAssets.includes(a))||selectedFiles.some(a=>!allFiles.some(f=>f.id===a)))throw new ExportError('export_request')
  const chosenFiles=allFiles.filter(a=>selectedFiles.includes(a.id))
  if(format==='png-long'||format==='png-pages'){
    const projection=readingProjection(note,original as unknown as CaptureSource|null,selectedAssets,selectedFiles,v.includeTags!==false,v.includeSummary!==false)
    const assets:Record<string,string>={},budget=renderImageBudget()
    for(const asset of readingImageIds(projection)){signal?.throwIfAborted();const bytes=await repository.getAsset(asset,signal);budget(bytes);assets[asset]=`data:${mediaTypeFor(asset)};base64,${bytes.toString('base64')}`}
    const snapshot:ReadingSnapshot={...projection,filename,assets}
    return {bytes:Buffer.from(JSON.stringify(snapshot)),mediaType:'application/json; charset=utf-8',filename:filename+'.json'}
  }

  const extra=supplementMarkdown({assetIds:supplement.assetIds.filter(id=>selectedAssets.includes(id)),attachmentIds:supplement.attachmentIds.filter(id=>selectedFiles.includes(id))},note.attachments)
  const body = omitMaterials(note.body,new Set(selectedAssets),new Set(selectedFiles))+extra, markdownOnly = format === 'markdown' || format === 'markdown-zip'
  const model = exportModel(note.title, body, selectedAssets, markdownOnly)
  let appendix: string | undefined
  if (rawSource) {
    const sourceBody=omitMaterials(rawSource.body,new Set(selectedAssets),new Set(selectedFiles)), sourceModel=exportModel('',sourceBody,selectedAssets,markdownOnly)
    appendix = sourceBody
    model.blocks.push(...sourceModel.blocks.slice(1)) // The appendix supplies its own heading.
    model.assetIds = [...new Set([...model.assetIds, ...sourceModel.assetIds])]
  }
  const header = { title:note.title, modified:noteDateTime(note.recordedAt),
    tags:v.includeTags === false ? [] : note.tags, summary:v.includeSummary === false ? '' : note.summary }
  const details:ExportBlock[] = [{type:'text',kind:'meta',runs:[{text:header.modified}]}]
  if (header.tags.length) details.push({type:'text',kind:'meta',runs:[{text:header.tags.map(tag=>'#'+tag).join(' · ')}]})
  if (header.summary) details.push({type:'text',kind:'quote',runs:[{text:header.summary}]},{type:'rule'})
  model.blocks.splice(1,0,...details)
  const missingFiles=chosenFiles.filter(a=>!(body+(appendix??'')).includes('../attachments/'+a.id+'.bin'))
  const images: Record<string, Buffer> = {},budget=renderImageBudget()
  if(!markdownOnly)for (const asset of model.assetIds) { signal?.throwIfAborted(); const data=await repository.getAsset(asset, signal);budget(data);images[asset]=data }
  if (format === 'snapshot') {
    const snapshot: ExportSnapshot = { noteId: note.noteId, revision: note.revision, filename, model, attachments:chosenFiles, assets: Object.fromEntries(Object.entries(images).map(([asset, bytes]) => [asset, `data:${mediaTypeFor(asset)};base64,${bytes.toString('base64')}`])) }
    return { bytes: Buffer.from(JSON.stringify(snapshot)), mediaType: 'application/json; charset=utf-8', filename: `${filename}.json` }
  }
  const attachmentNames=new Map(chosenFiles.map(a=>[a.id,a.id.slice(0,16)+'-'+exportFilename(a.name)]))
  if(appendix)appendix=changeReferences(appendix,ref=>{const file=attachmentLinkId(ref.url);return file&&attachmentNames.has(file)?'attachments/'+encodeURIComponent(attachmentNames.get(file)!):!ref.image&&ref.url.startsWith('../assets/')?'assets/'+ref.url.slice(10):undefined})
  const portableBody=changeReferences(body,ref=>{const file=attachmentLinkId(ref.url);return file&&attachmentNames.has(file)?'attachments/'+encodeURIComponent(attachmentNames.get(file)!):!ref.image&&ref.url.startsWith('../assets/')?'assets/'+ref.url.slice(10):undefined})+(missingFiles.length?'\n\n## 补充附件\n\n'+missingFiles.map(a=>`[${a.name.replace(/[\\[\]]/g,'\\$&')}](<attachments/${encodeURIComponent(attachmentNames.get(a.id)!)}>)`).join('\n\n'):'')
  const entries:ZipEntry[]=chosenFiles.map(a=>({path:'attachments/'+attachmentNames.get(a.id)!,read:()=>repository.getAttachment(a.id,signal)}))
  if (format === 'markdown') return { bytes: Buffer.from(exportMarkdown(header, portableBody, appendix)), mediaType: 'text/markdown; charset=utf-8', filename: `${filename}.md` }
  if (markdownOnly){for(const asset of selectedAssets)entries.push({path:'assets/'+asset,read:()=>repository.getAsset(asset,signal)});entries.unshift({path:filename+'.md',read:async()=>Buffer.from(exportMarkdown(header,portableBody,appendix))});return zippedFile(filename,entries,signal,streaming)}
  return renderPdfFile(filename, model, images, v.convertedImages, signal)

}

export async function renderPdfFile(filename:string, model:ExportModel, images:Record<string,Buffer>, convertedImages:unknown, signal?:AbortSignal):Promise<ExportFile> {
  const conversions = convertedImages === undefined ? [] : convertedImages
  if (!Array.isArray(conversions)) throw new ExportError('export_conversion')
  const seen = new Set<string>(); let bytesTotal = 0
  for (const conversion of conversions) {
    const item = object(conversion), asset = text(item.assetId, 80), base64 = text(item.png, 2 * 1024 * 1024)
    if (Object.keys(item).some(key => !['assetId','png'].includes(key))) throw new ExportError('export_conversion')
    if (seen.has(asset) || !model.assetIds.includes(asset) || !/\.(gif|webp)$/.test(asset) || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw new ExportError('export_conversion')
    seen.add(asset)
    const bytes = Buffer.from(base64, 'base64'); bytesTotal += bytes.length
    if (bytesTotal > 1024 * 1024) throw new ExportError('export_conversion_budget')
    try{validateAsset(bytes,'image/png')}catch(e){if(e instanceof Error&&'code'in e&&e.code==='image_limit')throw new ExportError('export_image_budget');throw e}
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20)
    if (!width || !height || width > EXPORT_LIMITS.side || height > EXPORT_LIMITS.side || width * height > EXPORT_LIMITS.imagePixels) throw new ExportError('export_image_budget')
    const original = imageDimensions(images[asset]!)
    if (width !== original.width || height !== original.height) throw new ExportError('export_conversion')
    images[asset] = bytes
  }
  if (model.assetIds.some(asset => /\.(gif|webp)$/.test(asset) && !seen.has(asset))) throw new ExportError('export_conversion_required')
  return { bytes: await exportPdf(model, images, signal), mediaType: 'application/pdf', filename: `${filename}.pdf` }
}
