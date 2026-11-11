import type {CaptureRequest,CaptureSource,NoteStageResult,ArchivedMaterial} from '../contracts/notes.js'
import type {CaptureConversation} from '../notes/capture.js'
import {selectMessages} from '../notes/capture.js'
import {materialsFor} from '../notes/capture-materials.js'
import {planStages,stagePrompt} from '../notes/enrichment-plan.js'
import {validateAsset} from '../notes/assets.js'
import {NOTE_LIMITS} from '../notes/types.js'
import {fail} from '../notes/validation.js'
import type {ImageMediaType} from '../contracts/media.js'
import type {ConversationFileServices} from './conversation-files.js'
import type {NoteModelBridge} from './note-model.js'

/** Preview reads the frozen selection only. No note, source or capture journal is written. */
export async function suggestMetadata(request:CaptureRequest,conversation:CaptureConversation,model:NoteModelBridge,services:ConversationFileServices,signal:AbortSignal):Promise<NoteStageResult>{
  if(!request.cut)fail('capture_request')
  const transcript=await conversation.read(request.sessionId,request.cut,signal),messages=selectMessages(transcript.messages,request)
  if(!messages.length)fail('capture_request')
  const available=materialsFor(messages,transcript.materials??[]),selected=new Set(request.materialIds??available.map(m=>m.id))
  if([...selected].some(id=>!available.some(m=>m.id===id)))fail('source_mismatch')
  const images=new Map<string,Buffer>(),assets:Record<string,string>={},archivedMaterials:ArchivedMaterial[]=[],limits=services.attachments?.()?.imageLimits
  let total=0
  const add=(bytes:Buffer,type:ImageMediaType)=>{total+=bytes.length;if(!limits||bytes.length>limits.maxImageBytes||total>limits.maxMessageImageBytes||images.size>=limits.maxImagesPerMessage||!limits.mediaTypes.includes(type))fail('ai_image_budget');const asset=validateAsset(bytes,type);images.set(asset.id,bytes);return asset.id}
  if(transcript.materials){
    for(const material of available.filter(m=>selected.has(m.id))){
      signal.throwIfAborted();const archived:ArchivedMaterial={...material};archivedMaterials.push(archived)
      if(material.kind!=='image'||material.bytes!==null&&material.bytes>NOTE_LIMITS.image)continue
      if(!limits||material.bytes!==null&&(material.bytes>limits.maxImageBytes||total+material.bytes>limits.maxMessageImageBytes)||images.size>=limits.maxImagesPerMessage)fail('ai_image_budget')
      const ref=transcript.materialReferences?.get(material.id);if(!ref||!conversation.material)fail('capture_file_missing')
      const ext=material.name.split('.').at(-1)?.toLowerCase(),block=messages.flatMap(m=>m.blocks).find(b=>b.type==='image'&&b.attachmentId===material.imageId)
      const type=block?.type==='image'?block.mediaType:ext==='jpg'||ext==='jpeg'?'image/jpeg':`image/${ext}`
      if(!['image/png','image/jpeg','image/gif','image/webp'].includes(type))continue
      archived.assetId=add(await conversation.material(request.sessionId,material,ref,signal),type as ImageMediaType);assets[material.imageId??material.id]=archived.assetId
    }
  }else for(const block of messages.flatMap(m=>m.blocks))if(block.type==='image'&&!assets[block.attachmentId]){
    if(!limits||images.size>=limits.maxImagesPerMessage)fail('ai_image_budget')
    const image=await conversation.attachment(request.sessionId,block.attachmentId,block.mediaType,signal,transcript.imageReferences?.get(block.attachmentId));assets[block.attachmentId]=add(image.bytes,image.mediaType)
  }
  const files=archivedMaterials.filter(m=>!m.assetId).map(m=>m.name)
  const source:CaptureSource={version:1,sessionId:request.sessionId,scope:request.scope,cut:request.cut,messages:[...messages,...(files.length?[{id:'metadata-file-names',seq:request.cut.throughSeq,role:'user' as const,blocks:[{type:'text' as const,text:'所选附件名称（未分析文件内容）：'+files.join('、')}]}]:[])],assets,archivedMaterials,missingAssetIds:[],textOnlyBlocks:[],complete:transcript.complete,issues:transcript.issues}
  const stages=planStages(source,request.requestId),job={sessionId:request.sessionId};let result:NoteStageResult|undefined
  for(const stage of stages){signal.throwIfAborted();if(stage.kind==='final'&&stages.length>1)stage.input=stages.slice(0,-1).map(s=>s.result!.summary).join('\n\n');result=await model.dispatch(job,stage,stagePrompt(job,stage).replace('已保存素材','所选素材'),signal,images);stage.result=result}
  if(!result)fail('ai_no_candidate');return result
}
