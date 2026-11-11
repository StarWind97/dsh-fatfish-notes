import {omitMaterials} from '../notes/material-markdown.js'
import type {AttachmentStore} from '@deepseek-ai/dsh-attachment'
import type {NoteRepository} from '../notes/repository.js'
import {id,hash,object,text,sortedStrings,assetId} from '../notes/validation.js'
import {NotebookError} from '../domain/errors.js'
import {changeReferences} from '../notes/portable-links.js'
import {attachmentLinkId,noteLinkId} from '../contracts/note-links.js'
import {exportFilename} from '../notes/export/markdown.js'
import type {NoteConversation} from './note-conversation.js'

export async function referenceNote(repository:NoteRepository,store:AttachmentStore|undefined,conversation:Pick<NoteConversation,'open'>,input:unknown,signal:AbortSignal){
  if(!store?.saveFileStream||!store.fileHostPath)throw new NotebookError('reference_unavailable','当前宿主暂不能保存引用副本')
  const v=object(input),sessionId=text(v.sessionId,512)
  await conversation.open(sessionId,signal)
  const note=await repository.getRevision(id(v.noteId),hash(v.revision),signal)
  const images=sortedStrings(v.assetIds,128,assetId),files=sortedStrings(v.attachmentIds,128,hash)
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
  const body=changeReferences(omitMaterials(note.body,new Set(images),new Set(files)),ref=>{
    if(paths.has(ref.url))return paths.get(ref.url)!
    if(ref.url.startsWith('../assets/')||attachmentLinkId(ref.url)||noteLinkId(ref.url))return '#未包含在此次引用'
    return undefined
  })
  const attached=(note.attachments??[]).filter(f=>files.includes(f.id)&&!note.body.includes('../attachments/'+f.id+'.bin'))
  const markdown=`# ${note.title}\n\n${note.summary?'> '+note.summary.replace(/\n/g,'\n> ')+'\n\n':''}${body}`+(attached.length?'\n\n## 附件\n\n'+attached.map(f=>`[${f.name.replace(/[\\\[\]]/g,'\\$&')}](<${paths.get('../attachments/'+f.id+'.bin')}>)`).join('\n\n'):'')
  const path=await save(exportFilename(note.title)+'.md',Buffer.from(markdown))
  return {ok:true as const,instruction:`\n\n请先读取这份笔记：@"${path}"。如有需要，再读取笔记中明确链接的图片和附件；不要搜索其他目录。图片请实际查看。以下是我的要求：\n`,files:names.length+1}
}
