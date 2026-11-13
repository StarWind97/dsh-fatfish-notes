import {uploadFile} from '../import-worker-client.js'
import { api, type Api } from '../api.js'
import { safePublicUrl } from '../safe-url.js'
import {transferFiles,inlineImageType} from './file-input.js'

export type ImageInput={file:File;label:string}|{url:string;label:string}
export function clipboardImages(data:DataTransfer):ImageInput[]{
  const files=transferFiles(data)
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
export async function archiveInput(noteId:string,input:ImageInput,signal:AbortSignal,draft:boolean,call:Api=api,editId?:string){
  if('url' in input)return (await call('/notes/image',{noteId,draft,url:input.url},signal)).asset
  const {file}=input
  if(!file.size||file.size>20*1024*1024)throw new Error('image_limit')
  const mediaType=inlineImageType(file)
  if(!mediaType)throw new Error('image_type')
  const result=await uploadFile(file,{noteId,draft,mediaType,...(editId?{editId}:{})},call,signal);if(!result.asset)throw new Error('image_limit');return result.asset
}
