import {materialsFor} from '../capture-materials.js'
import {ATTACHMENT_LIMIT,ATTACHMENT_WARNING,type CaptureMaterial} from '../../contracts/notes.js'
import {validateAsset} from '../assets.js'
import type {ImageMediaType} from '../../contracts/media.js'
import type { PhrasingContent, Root, RootContent } from 'mdast'
import type { NoteConversation } from '../../host/note-conversation.js'
import { selectMessages } from '../capture.js'
import { NOTE_LIMITS } from '../types.js'
import { digest, fail, object, sortedStrings, text } from '../validation.js'
import { IMAGE_EXTENSIONS } from '../../media/images.js'
import { mediaTypeFor } from '../assets.js'
import { definitionLabel, exportFilename, rewriteMarkdown } from './markdown.js'
import { exportLink, exportModel, exportTree, ExportError } from './model.js'
import {zippedFile,type ZipEntry} from './zip.js'
import { renderPdfFile, renderImageBudget, type ExportFile } from './service.js'

// An image typed into a chat message is a reference. Only DSH attachment blocks
// supply local image bytes. Keep ordinary web image links readable offline.
function messageText(body:string, prefix:string) {
  const tree=exportTree(body), definitions=new Map<string,string>()
  const refs:Array<{start:number;end:number;url?:string;identifier?:string;alt:string}>=[]
  const edits:Array<{start:number;end:number;value:string}>=[]
  const labels=new Map<string,string>()
  function label(identifier:string) {
    if(!labels.has(identifier))labels.set(identifier,prefix+'-'+(labels.size+1))
    return labels.get(identifier)!
  }
  function visit(node:Root|RootContent|PhrasingContent) {
    if(node.type==='definition' && node.position){
      if(!definitions.has(node.identifier))definitions.set(node.identifier,node.url)
      const start=node.position.start.offset!
      edits.push({start,end:start+definitionLabel(body.slice(start)).length,value:'['+label(node.identifier)+']:'})
    }
    if(node.type==='linkReference' && node.position && node.children.length){
      const endOfCaption=node.children.at(-1)!.position!.end.offset!
      edits.push({start:endOfCaption,end:node.position.end.offset!,value:']['+label(node.identifier)+']'})
    }
    if((node.type==='image'||node.type==='imageReference') && node.position) {
      refs.push({start:node.position.start.offset!,end:node.position.end.offset!,alt:node.alt??'',
        ...(node.type==='image'?{url:node.url}:{identifier:node.identifier})})
    }
    if('children' in node)node.children.forEach(visit)
  }
  visit(tree)
  for(const ref of refs){
    const url=exportLink(ref.url??definitions.get(ref.identifier??'')??'')
    const alt=(ref.alt||'图片链接').replace(/[\\[\]<>*_@]/g,'\\$&')
    edits.push({start:ref.start,end:ref.end,value:url?'['+alt+'](<'+url.replace(/>/g,'%3E')+'>)':alt})
  }
  for(const edit of edits.sort((a,b)=>b.start-a.start))body=body.slice(0,edit.start)+edit.value+body.slice(edit.end)
  return {text:rewriteMarkdown(body,true),linked:refs.length}
}

export async function createConversationExport(conversation:Pick<NoteConversation,'read'|'attachment'> & Partial<Pick<NoteConversation,'material'>>, input:unknown, signal:AbortSignal,streaming=false):Promise<ExportFile & {warnings:string}> {
  const v=object(input), sessionId=text(v.sessionId,512), format=v.format
  if(!sessionId || Object.keys(v).some(k=>!['sessionId','throughSeq','messageIds','format','snapshotHash','convertedImages','materialIds','allowLarge'].includes(k)) ||
    typeof v.throughSeq!=='number' || !Number.isSafeInteger(v.throughSeq) || v.throughSeq<0 ||
    !['markdown','snapshot','pdf'].includes(String(format)))throw new ExportError('export_request')
  const ids=sortedStrings(v.messageIds,NOTE_LIMITS.messages,x=>text(x,512))
  if(!ids.length)throw new ExportError('export_request')
  const transcript=await conversation.read(sessionId,{throughSeq:v.throughSeq},signal)
  const messages=selectMessages(transcript.messages,{scope:'selection',messageIds:ids})
  const titleText=messages.flatMap(m=>m.blocks).find(b=>b.type==='text' && b.text.trim())
  const title=Array.from(titleText?.type==='text'?titleText.text.trim().split(/\r?\n/)[0]!:'会话记录').slice(0,56).join('')
  const filename=exportFilename(title), sections:string[]=[], deliveryImages:string[]=[], model=exportModel('会话记录','',[])
  const attachments=new Map<string,{type:string;id:string|null}>(), images:Record<string,Buffer>={}
  const files:Array<{material:CaptureMaterial;id:string;name:string;bytes:number;read:()=>Promise<Buffer>}>=[],imageReaders=new Map<string,()=>Promise<Buffer>>()
  const renderBudget=renderImageBudget()
  const picked=v.materialIds===undefined?null:new Set(sortedStrings(v.materialIds,256,x=>text(x,512)))
  if(picked){
    const candidates=materialsFor(messages,transcript.materials??[])
    if([...picked].some(id=>!candidates.some(m=>m.id===id)))throw new ExportError('source_mismatch')
    for(const material of candidates.filter(m=>picked.has(m.id))){
      if(!material.available||material.bytes===null)throw new ExportError('capture_file_missing')
      if(material.bytes>ATTACHMENT_LIMIT)throw new ExportError('attachment_limit')
      if(material.bytes>ATTACHMENT_WARNING&&v.allowLarge!==true)throw new ExportError('attachment_large')
      const ref=transcript.materialReferences?.get(material.id);if(!ref||!conversation.material)throw new ExportError('capture_file_missing')
      const read=()=>conversation.material!(sessionId,material,ref,signal),data=await read(),sha=digest(data)
      const immutable=async()=>{const value=await read();if(digest(value)!==sha)throw new ExportError('source_mismatch');return value}
      let imageId:string|undefined
      if(material.kind==='image'&&data.length<=NOTE_LIMITS.image){
        const ext=material.name.split('.').at(-1)?.toLowerCase(),type=material.imageId?transcript.imageReferences?.get(material.imageId)?.mediaType:ext==='jpg'||ext==='jpeg'?'image/jpeg':`image/${ext}`
        try{imageId=validateAsset(data,type as ImageMediaType).id}catch{signal.throwIfAborted()}
      }
      if(imageId){
        if(imageReaders.size>=128&&!imageReaders.has(imageId))throw new ExportError('note_limit')
        if(format!=='markdown'){if(!images[imageId])renderBudget(data);images[imageId]=data}imageReaders.set(imageId,immutable)
        if(material.imageId)attachments.set(material.imageId,{type:transcript.imageReferences?.get(material.imageId)?.mediaType??'',id:imageId})
        else deliveryImages.push(`![${material.name.replace(/[\\[\]]/g,'\\$&')}](../assets/${imageId})`)
      }else{if(files.length>=128)throw new ExportError('note_limit');files.push({material,id:sha,name:material.name,bytes:data.length,read:immutable})}
    }
  }
  let missing=0,linked=0,total=0
  for(const message of messages){
    const role=message.role==='user'?'用户':'AI'
    const paragraphs=['## '+role]
    for(const [index,block] of message.blocks.entries()){
      signal.throwIfAborted()
      if(block.type==='text'){
        const part=messageText(block.text,'chat-'+message.seq+'-'+index)
        paragraphs.push(part.text);linked+=part.linked
        continue
      }
      if(picked&&!attachments.has(block.attachmentId)){paragraphs.push('[图片未包含在正文中；已选择的大图作为附件保存]');continue}
      let entry=attachments.get(block.attachmentId)
      if(!entry){
        if(attachments.size>=NOTE_LIMITS.images)fail('note_limit')
        entry={type:block.mediaType,id:null}
        try{
          const image=await conversation.attachment(sessionId,block.attachmentId,block.mediaType,signal,transcript.imageReferences?.get(block.attachmentId))
          entry.id=digest(image.bytes)+'.'+IMAGE_EXTENSIONS[image.mediaType]
          images[entry.id]=image.bytes
          const frozen=image.bytes;imageReaders.set(entry.id,async()=>frozen)
          total+=image.bytes.length
        }catch{signal.throwIfAborted();missing++}
        attachments.set(block.attachmentId,entry)
      }
      if(entry.type!==block.mediaType)throw new ExportError('export_request')
      paragraphs.push(entry.id?'![会话图片](../assets/'+entry.id+')':'[图片未能读取]')
    }
    const section=paragraphs.join('\n\n')
    sections.push(section)
  }
  if(deliveryImages.length)sections.push('## 交付图片\n\n'+deliveryImages.join('\n\n'))
  const attachmentNames=new Map(files.map(f=>[f.id,f.id.slice(0,16)+'-'+exportFilename(f.name)]))
  if(files.length)sections.push('## 文件附件\n\n'+files.map(f=>`[${f.name.replace(/[\\[\]]/g,'\\$&')}](<attachments/${encodeURIComponent(attachmentNames.get(f.id)!)}>)`).join('\n\n'))
  if(picked){const omitted=materialsFor(messages,transcript.materials??[]).filter(m=>!picked.has(m.id));if(omitted.length)sections.push('未包含：'+omitted.map(m=>m.name).join('、'))}
  model.assetIds=[...imageReaders.keys()]
  const warnings=JSON.stringify({partial:!transcript.complete,missing,linked})
  const entries:ZipEntry[]=[...new Map(files.map(f=>[f.id,{path:'attachments/'+attachmentNames.get(f.id)!,read:f.read}])).values()]
  if(format==='markdown'){
    const markdown='# 会话记录\n\n'+sections.map(s=>rewriteMarkdown(s,true)).join('\n\n---\n\n')+'\n'
    if(model.assetIds.length||files.length){entries.unshift({path:filename+'.md',read:async()=>Buffer.from(markdown)});for(const [id,read]of imageReaders)entries.push({path:'assets/'+id,read});return {...await zippedFile(filename,entries,signal,streaming),warnings}}
    return {bytes:Buffer.from(markdown),filename:filename+'.md',mediaType:'text/markdown; charset=utf-8',warnings}
  }
  if(!picked){const budget=renderImageBudget();for(const data of Object.values(images))budget(data)}
  const rendered=exportModel('会话记录',sections.join('\n\n---\n\n'),model.assetIds);model.blocks=rendered.blocks
  if(files.length)model.blocks.push({type:'text',kind:'meta',runs:[{text:'普通附件原件与生成文件一同打包。'}]})
  const snapshotHash=digest(JSON.stringify([model,warnings,files.map(f=>({id:f.id,name:f.name,bytes:f.bytes}))]))
  if(format==='pdf'){
    if(snapshotHash!==v.snapshotHash)throw new ExportError('source_mismatch')
    const pdf=await renderPdfFile(filename,model,images,v.convertedImages,signal);if(!files.length)return {...pdf,warnings};entries.unshift({path:pdf.filename,read:async()=>pdf.bytes});return {...await zippedFile(filename,entries,signal,streaming),warnings}
  }
  const assets=Object.fromEntries(Object.entries(images).map(([id,bytes])=>[id,'data:'+mediaTypeFor(id)+';base64,'+bytes.toString('base64')]))
  return {bytes:Buffer.from(JSON.stringify({filename,model,assets,snapshotHash,attachments:files.map(f=>({id:f.id,name:f.name,bytes:f.bytes,materialId:f.material.id}))})),mediaType:'application/json; charset=utf-8',filename:filename+'.json',warnings}
}

export async function conversationFile(conversation:Pick<NoteConversation,'read'|'material'>,input:unknown,signal:AbortSignal):Promise<ExportFile>{
  const v=object(input),sessionId=text(v.sessionId,512),throughSeq=Number(v.throughSeq)
  if(!Number.isSafeInteger(throughSeq)||throughSeq<0)throw new ExportError('export_request')
  const transcript=await conversation.read(sessionId,{throughSeq},signal),messages=selectMessages(transcript.messages,{scope:'selection',messageIds:sortedStrings(v.messageIds,NOTE_LIMITS.messages,x=>text(x,512))})
  const material=materialsFor(messages,transcript.materials??[]).find(m=>m.id===v.materialId),ref=material&&transcript.materialReferences?.get(material.id)
  if(!material||!ref)throw new ExportError('source_mismatch')
  const bytes=await conversation.material(sessionId,material,ref,signal)
  if(digest(bytes)!==text(v.hash,64))throw new ExportError('source_mismatch')
  return {bytes,filename:exportFilename(material.name),mediaType:'application/octet-stream'}
}
