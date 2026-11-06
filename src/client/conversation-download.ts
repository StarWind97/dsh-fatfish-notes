import type { ConversationExportFormat, ConversationExportRequest } from '../contracts/notes.js'
import type { ExportSnapshot } from '../notes/export/model.js'
import { ApiError, currentRepository } from './api.js'
import { downloadFilename, prepareImages, renderPages, type DownloadFile } from './note-export.js'

export interface ConversationFile extends DownloadFile {warnings:{partial:boolean;missing:number;linked:number}}
export async function downloadConversation(source:Pick<ConversationExportRequest,'sessionId'|'messageIds'|'throughSeq'>, format:ConversationExportFormat, signal:AbortSignal):Promise<ConversationFile> {
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
  const snapshot=await initial.json() as Pick<ExportSnapshot,'model'|'assets'|'filename'> & {snapshotHash:string}
  const prepared=await prepareImages(snapshot,signal)
  if(format==='pdf'){
    if(prepared.convertedImages.reduce((n,image)=>n+Math.ceil(image.png.length*3/4),0)>1024*1024)throw new ApiError('export_conversion_budget')
    const file=await request({format:'pdf',snapshotHash:snapshot.snapshotHash,convertedImages:prepared.convertedImages})
    return {blob:await file.blob(),filename:downloadFilename(file),warnings}
  }
  return {...await renderPages(snapshot,prepared.images,{format,width:1080,pixelRatio:1,background:'light'},signal),warnings}
}
