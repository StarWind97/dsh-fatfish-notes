import {bundleFiles} from './export-bundle.js'
import {exportFilename} from '../notes/export/markdown.js'
import type { ConversationExportFormat, ConversationExportRequest } from '../contracts/notes.js'
import type { ExportSnapshot } from '../notes/export/model.js'
import { ApiError, currentRepository } from './api.js'
import { downloadFilename, prepareImages, renderPages, type DownloadFile } from './note-export.js'

export interface ConversationFile extends DownloadFile {warnings:{partial:boolean;missing:number;linked:number}}
export async function downloadConversation(source:Pick<ConversationExportRequest,'sessionId'|'messageIds'|'throughSeq'|'materialIds'|'allowLarge'>, format:ConversationExportFormat, signal:AbortSignal):Promise<ConversationFile> {
  const repository=currentRepository()
  const request=async(options:Omit<ConversationExportRequest,keyof typeof source>)=>{
    signal.throwIfAborted()
    const response=await fetch('/dsh-fatfish-notes/notes/conversation-export',{method:'POST',credentials:'same-origin',signal,
      headers:{'content-type':'application/json',...(repository!==undefined?{'x-notebook-repository':String(repository)}:{})},
      body:JSON.stringify({...source,...options})})
    if(!response.ok)throw new ApiError((await response.json().catch(()=>null))?.code??'export_failed')
    return response
  }
  const initial=await request({format:format==='markdown'?'markdown':'snapshot'})
  const warnings=JSON.parse(initial.headers.get('x-export-warnings')??'null') as ConversationFile['warnings']|null
  if(!warnings || typeof warnings.partial!=='boolean' || !Number.isSafeInteger(warnings.missing) || !Number.isSafeInteger(warnings.linked))throw new ApiError('invalid_response')
  if(format==='markdown')return {blob:await initial.blob(),filename:downloadFilename(initial),warnings}
  const snapshot=await initial.json() as Pick<ExportSnapshot,'model'|'assets'|'filename'> & {snapshotHash:string;attachments?:Array<{id:string;materialId:string;name:string;bytes:number}>}
  const prepared=await prepareImages(snapshot,signal)
  if(format==='pdf'){
    if(prepared.convertedImages.reduce((n,image)=>n+Math.ceil(image.png.length*3/4),0)>1024*1024)throw new ApiError('export_conversion_budget')
    const file=await request({format:'pdf',snapshotHash:snapshot.snapshotHash,convertedImages:prepared.convertedImages})
    return {blob:await file.blob(),filename:downloadFilename(file),warnings}
  }
  const rendered=await renderPages(snapshot,prepared.images,{format,width:1080,pixelRatio:1,background:'light'},signal)
  if(!snapshot.attachments?.length)return {...rendered,warnings}
  const blob=await bundleFiles([new File([rendered.blob],rendered.filename,{type:rendered.blob.type})],snapshot.attachments.map(f=>({name:f.id.slice(0,16)+'-'+exportFilename(f.name),path:'/notes/conversation-file',body:{sessionId:source.sessionId,throughSeq:source.throughSeq,messageIds:source.messageIds,materialId:f.materialId,hash:f.id}})),signal,true)
  return {blob,filename:snapshot.filename+'.zip',warnings}
}
