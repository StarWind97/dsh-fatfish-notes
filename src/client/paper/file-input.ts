import {ATTACHMENT_WARNING} from '../../contracts/notes.js'

/** Chromium exposes Explorer file copies and screenshots through the same transfer API. */
export function transferFiles(data:DataTransfer):File[]{
  const files=Array.from(data.files)
  if(files.length)return files
  return Array.from(data.items).flatMap(item=>{const file=item.kind==='file'?item.getAsFile():null;return file?[file]:[]})
}
export function inlineImageType(file:Pick<File,'type'|'name'>):string|undefined{
  const type=file.type||({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp'} as Record<string,string>)[file.name.split('.').pop()?.toLowerCase()??'']
  return type&&['image/png','image/jpeg','image/gif','image/webp'].includes(type)?type:undefined
}
export const needsFileConfirmation=(files:readonly Pick<File,'size'>[])=>files.some(file=>file.size>ATTACHMENT_WARNING)
