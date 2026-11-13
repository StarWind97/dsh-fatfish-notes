import {fromMarkdown} from 'mdast-util-from-markdown'
import type {Root,RootContent,PhrasingContent} from 'mdast'
import type {NoteContent} from '../../contracts/notes.js'
import {attachmentLinkId} from '../../contracts/note-links.js'
import {inlineImageType} from './file-input.js'

export interface ImagePresentation {from:number;to:number;original:string;url:string;label:string;image:boolean;reference:boolean;title:string|null}
const assetId=(url:string)=>/^\.\.\/assets\/([a-f0-9]{64}\.(?:png|jpg|gif|webp))$/.exec(url)?.[1]
/** Resolve only the chosen real Markdown occurrence, never code examples or arbitrary URLs. */
export function imagePresentations(body:string):ImagePresentation[]{
 const nodes:Array<Root|RootContent|PhrasingContent>=[fromMarkdown(body)],definitions=new Map<string,{url:string;title?:string|null|undefined}>()
 for(let i=0;i<nodes.length;i++){const n=nodes[i]!;if('children'in n)nodes.push(...n.children);if(n.type==='definition'&&!definitions.has(n.identifier.toUpperCase()))definitions.set(n.identifier.toUpperCase(),n)}
 const candidates:ImagePresentation[]=[]
 for(const n of nodes){
  if(!['image','link','imageReference','linkReference'].includes(n.type)||!n.position)continue
  const from=n.position.start.offset!,to=n.position.end.offset!
  const reference=n.type==='imageReference'||n.type==='linkReference',target='url'in n?n:'identifier'in n?definitions.get(n.identifier.toUpperCase()):undefined
  if(!target||!assetId(target.url)&&!attachmentLinkId(target.url))continue
  const original=body.slice(from,to),image=n.type==='image'||n.type==='imageReference'
  let depth=1,end=image?2:1;const start=end
  for(;end<original.length;end++){if(original[end]==='\\'){end++;continue}if(original[end]==='[')depth++;if(original[end]===']'&&!--depth)break}
  candidates.push({from,to,original,url:target.url,label:original.slice(start,end),image,reference,title:target.title??null})
 }
 return candidates
}
export function presentationAt(body:string,position:number):ImagePresentation|null{
 return imagePresentations(body).filter(n=>position>=n.from&&position<n.to).sort((a,b)=>(a.to-a.from)-(b.to-b.from))[0]??null
}
export function presentationChange(item:ImagePresentation,image:boolean,url=item.url){
 const insert=!item.reference&&url===item.url?(image?'!':'')+item.original.slice(item.image?1:0):`${image?'!':''}[${item.label}](<${url}>${item.title?' "'+item.title.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"':''})`
 return {from:item.from,to:item.to,insert}
}
export function presentationAvailable(item:ImagePresentation,content:Pick<NoteContent,'assetIds'|'attachments'>){
 const asset=assetId(item.url);if(asset)return content.assetIds.includes(asset)
 const file=content.attachments?.find(f=>f.id===attachmentLinkId(item.url))
 return !!file&&file.bytes<=20*1024*1024&&!!inlineImageType({name:file.name,type:''})
}
