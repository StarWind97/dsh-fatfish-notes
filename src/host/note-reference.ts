import {bodyMaterials} from '../notes/reference-materials.js'
import type {ReferencePlan} from '../contracts/notes.js'
import type {AttachmentStore} from '@deepseek-ai/dsh-attachment'
import type {NoteRepository} from '../notes/repository.js'
import {id,hash,object,text,sortedStrings,assetId} from '../notes/validation.js'
import {NotebookError} from '../domain/errors.js'
import {changeReferences} from '../notes/portable-links.js'
import {attachmentLinkId,noteLinkId} from '../contracts/note-links.js'
import {exportFilename} from '../notes/export/markdown.js'
import type {NoteConversation} from './note-conversation.js'

export async function previewReference(repository:NoteRepository,input:unknown,signal:AbortSignal):Promise<{ok:true;plan:ReferencePlan}>{
  const note=await repository.get(id(object(input).noteId),signal),current=note.current
  if(current.status!=='active'||note.heads.length!==1)throw new NotebookError('reference_changed','笔记已变化，请重新选择')
  const required=bodyMaterials(current.body)
  if(required.assetIds.some(a=>!current.assetIds.includes(a))||required.attachmentIds.some(a=>!current.attachments?.some(f=>f.id===a)))throw new NotebookError('note_asset','正文资源不完整')
  return {ok:true,plan:{noteId:note.noteId,revision:current.revision,title:current.title,required,supplements:[
    ...current.assetIds.filter(a=>!required.assetIds.includes(a)).map((a,i)=>({id:'image:'+a,name:`补充图片 ${i+1} · ${a.slice(0,8)}.${a.split('.')[1]}`,image:true,bytes:null})),
    ...(current.attachments??[]).filter(a=>!required.attachmentIds.includes(a.id)).map(a=>({id:'file:'+a.id,name:a.name,image:false,bytes:a.bytes}))
  ]}}
}

export async function referenceNote(repository:NoteRepository,store:AttachmentStore|undefined,conversation:Pick<NoteConversation,'open'>,input:unknown,signal:AbortSignal){
  if(!store?.saveFileStream||!store.fileHostPath)throw new NotebookError('reference_unavailable','当前宿主暂不能保存引用副本')
  const v=object(input),sessionId=text(v.sessionId,512)
  await conversation.open(sessionId,signal)
  const current=await repository.get(id(v.noteId),signal)
  if(current.heads.length!==1||current.current.status!=='active'||current.current.revision!==hash(v.revision))throw new NotebookError('reference_changed','笔记已变化，请重新选择')
  const note=current.current,required=bodyMaterials(note.body)
  const images=[...new Set([...required.assetIds,...sortedStrings(v.assetIds,128,assetId)])],files=[...new Set([...required.attachmentIds,...sortedStrings(v.attachmentIds,128,hash)])]
  if(images.some(a=>!note.assetIds.includes(a))||files.some(a=>!note.attachments?.some(f=>f.id===a)))throw new NotebookError('note_asset','文件不属于选定的笔记')
  const paths=new Map<string,string>(),names:string[]=[]
  async function save(name:string,bytes:Uint8Array){
    signal.throwIfAborted()
    async function* data(){for(let p=0;p<bytes.length;p+=256*1024){signal.throwIfAborted();yield bytes.subarray(p,p+256*1024)}}
    const ref=await store!.saveFileStream({name,data:data(),signal}),path=store!.fileHostPath(ref)
    if(!path)throw new NotebookError('reference_unavailable','当前宿主没有可供会话读取的本机文件位置')
    return path.replace(/\\/g,'/')
  }
  for(const image of images){paths.set('../assets/'+image,await save(image,await repository.getAsset(image,signal)));names.push(image)}
  for(const file of files){const f=note.attachments!.find(a=>a.id===file)!;paths.set('../attachments/'+file+'.bin',await save(f.name,await repository.getAttachment(file,signal)));names.push(f.name)}
  const body=changeReferences(note.body,ref=>{
    if(paths.has(ref.url))return paths.get(ref.url)!
    if(ref.url.startsWith('../assets/')||attachmentLinkId(ref.url)||noteLinkId(ref.url))return '#未包含在此次引用'
    return undefined
  })
  const attached=(note.attachments??[]).filter(f=>files.includes(f.id)&&!required.attachmentIds.includes(f.id))
  const extraImages=images.filter(a=>!required.assetIds.includes(a))
  const supplements=[...extraImages.map((a,i)=>`![补充图片 ${i+1}](<${paths.get('../assets/'+a)}>)`),...attached.map(f=>`[${f.name.replace(/[\\\[\]]/g,'\\$&')}](<${paths.get('../attachments/'+f.id+'.bin')}>)`)]
  const markdown=`# ${note.title}\n\n${note.summary?'> '+note.summary.replace(/\n/g,'\n> ')+'\n\n':''}${body}`+(supplements.length?'\n\n## 补充附件\n\n'+supplements.join('\n\n'):'')
  const path=await save(exportFilename(note.title)+'.md',Buffer.from(markdown))
  return {ok:true as const,instruction:`\n\n请先读取这份笔记：@"${path}"。如有需要，再读取笔记中明确链接的图片和附件；不要搜索其他目录。图片请实际查看。以下是我的要求：\n`,files:names.length+1,path}
}
