import type { PhrasingContent, Root, RootContent } from 'mdast'
import type { NoteConversation } from '../../host/note-conversation.js'
import { selectMessages } from '../capture.js'
import { NOTE_LIMITS } from '../types.js'
import { digest, fail, object, sortedStrings, text } from '../validation.js'
import { IMAGE_EXTENSIONS } from '../../media/images.js'
import { mediaTypeFor } from '../assets.js'
import { definitionLabel, exportFilename, rewriteMarkdown } from './markdown.js'
import { exportLink, exportModel, exportTree, ExportError } from './model.js'
import { exportZip } from './zip.js'
import { renderPdfFile, type ExportFile } from './service.js'

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

export async function createConversationExport(conversation:Pick<NoteConversation,'read'|'attachment'>, input:unknown, signal:AbortSignal):Promise<ExportFile & {warnings:string}> {
  const v=object(input), sessionId=text(v.sessionId,512), format=v.format
  if(!sessionId || Object.keys(v).some(k=>!['sessionId','throughSeq','messageIds','format','snapshotHash','convertedImages'].includes(k)) ||
    typeof v.throughSeq!=='number' || !Number.isSafeInteger(v.throughSeq) || v.throughSeq<0 ||
    !['markdown','snapshot','pdf'].includes(String(format)))throw new ExportError('export_request')
  const ids=sortedStrings(v.messageIds,NOTE_LIMITS.messages,x=>text(x,512))
  if(!ids.length)throw new ExportError('export_request')
  const transcript=await conversation.read(sessionId,{throughSeq:v.throughSeq},signal)
  const messages=selectMessages(transcript.messages,{scope:'selection',messageIds:ids})
  const titleText=messages.flatMap(m=>m.blocks).find(b=>b.type==='text' && b.text.trim())
  const title=Array.from(titleText?.type==='text'?titleText.text.trim().split(/\r?\n/)[0]!:'会话记录').slice(0,56).join('')
  const filename=exportFilename(title), sections:string[]=[], model=exportModel('会话记录','',[])
  const attachments=new Map<string,{type:string;id:string|null}>(), images:Record<string,Buffer>={}
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
      let entry=attachments.get(block.attachmentId)
      if(!entry){
        if(attachments.size>=NOTE_LIMITS.images)fail('note_limit')
        entry={type:block.mediaType,id:null}
        try{
          const image=await conversation.attachment(sessionId,block.attachmentId,block.mediaType,signal,transcript.imageReferences?.get(block.attachmentId))
          entry.id=digest(image.bytes)+'.'+IMAGE_EXTENSIONS[image.mediaType]
          images[entry.id]=image.bytes
          total+=image.bytes.length
        }catch{signal.throwIfAborted();missing++}
        if(total>NOTE_LIMITS.imageTotal)fail('note_limit')
        attachments.set(block.attachmentId,entry)
      }
      if(entry.type!==block.mediaType)throw new ExportError('export_request')
      paragraphs.push(entry.id?'![会话图片](../assets/'+entry.id+')':'[图片未能读取]')
    }
    const section=paragraphs.join('\n\n')
    if(sections.length)model.blocks.push({type:'rule'})
    if(format!=='markdown'){
      const rendered=exportModel('',section,Object.keys(images))
      model.blocks.push(...rendered.blocks.slice(1))
    }
    sections.push(section)
  }
  model.assetIds=Object.keys(images)
  const warnings=JSON.stringify({partial:!transcript.complete,missing,linked})
  if(format==='markdown'){
    const markdown='# 会话记录\n\n'+sections.map(s=>rewriteMarkdown(s,true)).join('\n\n---\n\n')+'\n'
    if(model.assetIds.length)return {bytes:exportZip(filename,markdown,images),filename:filename+'.zip',mediaType:'application/zip',warnings}
    return {bytes:Buffer.from(markdown),filename:filename+'.md',mediaType:'text/markdown; charset=utf-8',warnings}
  }
  const snapshotHash=digest(JSON.stringify([model,warnings]))
  if(format==='pdf'){
    if(snapshotHash!==v.snapshotHash)throw new ExportError('source_mismatch')
    return {...await renderPdfFile(filename,model,images,v.convertedImages,signal),warnings}
  }
  const assets=Object.fromEntries(Object.entries(images).map(([id,bytes])=>[id,'data:'+mediaTypeFor(id)+';base64,'+bytes.toString('base64')]))
  return {bytes:Buffer.from(JSON.stringify({filename,model,assets,snapshotHash})),mediaType:'application/json; charset=utf-8',filename:filename+'.json',warnings}
}
