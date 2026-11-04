import { fileBase64 } from './file-base64.js'
import { api } from '../api.js'
import { safePublicUrl } from '../safe-url.js'

export type ImageInput={file:File;label:string}|{url:string;label:string}
export function clipboardImages(data:DataTransfer):ImageInput[]{
  const files=Array.from(data.files)
  if(!files.length)for(const entry of Array.from(data.items)){if(entry.kind==='file'){const f=entry.getAsFile();if(f)files.push(f)}}
  if(files.length)return files.map(file=>({file,label:file.name}))
  const html=data.getData('text/html')
  if(html){
    const template=document.createElement('template');template.innerHTML=html
    const images=template.content.querySelectorAll('img'),img=images[0]
    if(images.length===1&&img&&!template.content.textContent?.trim()){
      const url=safePublicUrl(img.getAttribute('src')??'')
      if(url)return [{url,label:img.alt}]
    }
  }
  const raw=(data.getData('text/plain')||data.getData('text/uri-list').split(/\r?\n/).find(line=>line&&!line.startsWith('#'))||'').trim()
  const url=/^https:\/\/\S+$/i.test(raw)?safePublicUrl(raw):null
  return url&&(/\.(png|jpe?g|gif|webp)$/i.test(new URL(url).pathname)||/[?&](?:format|fm)=(?:png|jpe?g|gif|webp)(?:&|$)/i.test(url))?[{url,label:''}]:[]
}
export async function archiveInput(noteId:string,input:ImageInput,signal:AbortSignal,draft:boolean){
  if('url' in input)return (await api('/notes/image',{noteId,draft,url:input.url},signal)).asset
  const {file}=input
  if(!file.size||file.size>5*1024*1024)throw new Error('image_limit')
  const suffix=file.name.split('.').pop()?.toLowerCase()??''
  const mediaType=file.type||({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif'} as Record<string,string>)[suffix]
  if(!mediaType||!['image/png','image/jpeg','image/webp','image/gif'].includes(mediaType))throw new Error('image_type')
  return (await api('/notes/image',{noteId,draft,mediaType,base64:await fileBase64(file)},signal)).asset
}
