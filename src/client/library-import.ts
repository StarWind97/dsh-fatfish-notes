import {unzipSync} from 'fflate'
import {parseDocument} from 'yaml'
import {exportTree} from '../notes/export/model.js'
import {changeReferences,references} from '../notes/portable-links.js'
import {markdownLabel} from '../contracts/note-links.js'
import type {NoteContent,NoteAttachment} from '../contracts/notes.js'
import {ATTACHMENT_LIMIT,SINGLE_TRANSFER_LIMIT} from '../contracts/notes.js'
import type {Root,RootContent,PhrasingContent} from 'mdast'
import type {Api} from './api.js'
export interface ImportEntry {path:string;bytes:number;read:()=>Promise<Uint8Array>;chunks?:()=>AsyncIterable<Uint8Array>}
export interface ImportNote {path:string;noteId:string;content:NoteContent;warnings:string[];done?:boolean}
export interface ImportPlan {entries:Map<string,ImportEntry>;notes:ImportNote[];warnings:string[];bytes:number}
export function portablePath(value:string):string|null{
  if(/^[a-z]:|^[\\/]|[\x00-\x1f]/i.test(value))return null
  const parts:string[]=[];for(const part of value.replace(/\\/g,'/').split('/')){if(part==='..'){if(!parts.length)return null;parts.pop()}else if(part&&part!=='.')parts.push(part.normalize('NFC'))}
  return parts.length?parts.join('/'):null
}
export function importId(){let n=BigInt(Date.now())<<80n;for(const [i,b] of crypto.getRandomValues(new Uint8Array(10)).entries())n|=BigInt(b)<<BigInt((9-i)*8);let id='';for(let i=0;i<26;i++){id='0123456789ABCDEFGHJKMNPQRSTVWXYZ'[Number(n&31n)]+id;n>>=5n}return id}
export function unzipEntries(bytes:Uint8Array):{entries:ImportEntry[];warnings:string[]}{
  const warnings:string[]=[],names=new Set<string>();let total=0,count=0
  const files=unzipSync(bytes,{filter(file){
    if(++count>10000)throw new Error('Too many files')
    const path=portablePath(file.name)
    if(file.name.endsWith('/')||!path||path.split('/').some(s=>s.startsWith('.'))){if(!file.name.endsWith('/'))warnings.push(`${file.name}: 未导入隐藏文件或不安全路径`);return false}
    if(names.has(path.toLowerCase()))throw new Error('Duplicate archive path');names.add(path.toLowerCase())
    if(file.originalSize>ATTACHMENT_LIMIT){warnings.push(`${path}: 超过 100 MiB，已跳过`);return false}
    total+=file.originalSize
    return true
  }})
  const entries=Object.entries(files).map(([path,content])=>({path:portablePath(path)!,bytes:content.length,read:async()=>content}))
  return {entries,warnings}
}
export function parseImportNote(path:string,text:string):ImportNote{
  let body=text.replace(/^\uFEFF/,''),data:Record<string,unknown>={},warnings:string[]=[]
  const front=/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(body)
  if(front){
    if(front[1]!.length>128*1024)throw new Error('Frontmatter too large')
    try{const parsed=parseDocument(front[1]!,{schema:'core',uniqueKeys:true});if(parsed.errors.length)throw new Error('YAML');const value:unknown=parsed.toJS({maxAliasCount:30});if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('YAML');data=value as Record<string,unknown>;body=body.slice(front[0].length);if(parsed.warnings.length)warnings.push('部分 YAML 扩展语法未识别')}
    catch{warnings.push('YAML 属性未识别，已作为原文保留')}
  }
  const title=typeof data.title==='string'?data.title.trim():path.split('/').at(-1)!.replace(/\.md$/i,'')
  const tags=Array.isArray(data.tags)?data.tags.filter((v):v is string=>typeof v==='string'):typeof data.tags==='string'?data.tags.split(/[,，\s]+/):[]
  const summary=typeof data.summary==='string'?data.summary:typeof data.description==='string'?data.description:''
  return {path,noteId:importId(),warnings,content:{title,summary,tags:[...new Set(tags.map(t=>t.replace(/^#/,'')))].filter(Boolean),body,notebookId:null,status:'active',sourceId:null,assetIds:[],originPath:path}}
}
export async function scanImport(entries:ImportEntry[],warnings:string[]=[],signal?:AbortSignal,progress?:(path:string)=>void):Promise<ImportPlan>{
  const map=new Map<string,ImportEntry>(),notes:ImportNote[]=[];let bytes=0
  for(const entry of entries){signal?.throwIfAborted();progress?.(entry.path);const path=portablePath(entry.path);if(!path||path.split('/').some(p=>p.startsWith('.'))){warnings.push(`${entry.path}: 跳过配置或不安全路径`);continue}
    if(entry.bytes>ATTACHMENT_LIMIT){warnings.push(`${path}: 超过 100 MiB，已跳过`);continue}
    if(map.has(path))throw new Error('Duplicate path');map.set(path,{...entry,path});bytes+=entry.bytes
    if(map.size>10000)throw new Error('Import exceeds limit')
    if(/\.md$/i.test(path)){try{if(entry.bytes>10*1024*1024)throw new Error('Markdown over 10 MiB');notes.push(parseImportNote(path,new TextDecoder('utf-8',{fatal:true}).decode(await entry.read())))}catch{warnings.push(`${path}: 无法读取 UTF-8 Markdown 或内容过大`)}}
  }
  if(notes.length>5000)throw new Error('Too many notes')
  return {entries:map,notes,warnings,bytes}
}
function resolveEntry(plan:ImportPlan,from:string,url:string,wiki=false):string|undefined{
  let value:string;try{value=decodeURIComponent(url.split('#')[0]!)}catch{return undefined}
  if(!value||/^[a-z][a-z\d+.-]*:|^\/\//i.test(value))return undefined
  const parent=from.split('/').slice(0,-1).join('/'),direct=portablePath((parent?parent+'/':'')+value),root=portablePath(value)
  const candidates=wiki?[root,direct]:[direct,root]
  for(const key of candidates)if(key){if(plan.entries.has(key))return key;if(plan.entries.has(key+'.md'))return key+'.md'}
  const matches=[...plan.entries.keys()].filter(k=>k.split('/').at(-1)===value||k.split('/').at(-1)===value+'.md')
  return matches.length===1?matches[0]:undefined
}
/** Only text nodes are rewritten; code examples and raw HTML keep their original bytes. */
export function convertWiki(body:string,resolve:(url:string,image:boolean)=>string|undefined):string{
  const changes:Array<{start:number;end:number;text:string}>=[]
  const visit=(node:Root|RootContent|PhrasingContent)=>{
    if(['code','inlineCode','html','link','image','definition'].includes(node.type))return
    if(node.type==='text'&&node.position){const start=node.position.start.offset as number,raw=body.slice(start,node.position.end.offset)
      for(const match of raw.matchAll(/(!?)\[\[([^\]\n]+)\]\]/g)){if(match.index&&raw[match.index-1]==='\\')continue;const [url,label]=match[2]!.split('|'),image=match[1]==='!',target=resolve(url!,image);if(target)changes.push({start:start+match.index!,end:start+match.index!+match[0].length,text:`${image?'!':''}[${markdownLabel(label||url!)}](<${target}>)`})}
    }
    if('children'in node)node.children.forEach(visit)
  };visit(exportTree(body))
  for(const edit of changes.sort((a,b)=>b.start-a.start))body=body.slice(0,edit.start)+edit.text+body.slice(edit.end)
  return body
}
function encoded(bytes:Uint8Array){let value='';for(let at=0;at<bytes.length;at+=32768)value+=String.fromCharCode(...bytes.subarray(at,at+32768));return btoa(value)}
export async function importNote(plan:ImportPlan,note:ImportNote,notebookId:string,remote:boolean,api:Api,signal?:AbortSignal,progress?:(bytes:number,total:number,path:string)=>void):Promise<string[]> {
  const warnings=[...note.warnings],content=structuredClone(note.content),assetIds=new Set<string>(),attachments=new Map<string,NoteAttachment>(),resolved=new Map<string,string>()
  content.notebookId=notebookId
  let body=convertWiki(content.body,(url,image)=>{
    const path=resolveEntry(plan,note.path,url,true),target=plan.notes.find(n=>n.path===path)
    if(target&&!image){if(url.includes('#'))warnings.push(`${url}: 已转为整篇笔记链接，章节/块定位未转换`);return 'fatfish-note:'+target.noteId}
    if(target&&image){warnings.push(`${url}: 暂不支持笔记嵌入，保留原文`);return undefined}
    if(path)return 'fatfish-import:'+encodeURIComponent(path)
    warnings.push(`${url}: 无法唯一定位 Wiki 链接，保留原文`);return undefined
  })
  for(const ref of references(body)){
    signal?.throwIfAborted();if(resolved.has(ref.url))continue
    const local=ref.url.startsWith('fatfish-import:')?decodeURIComponent(ref.url.slice(15)):resolveEntry(plan,note.path,ref.url)
    const linked=plan.notes.find(n=>n.path===local)
    if(linked&&!ref.image){resolved.set(ref.url,'fatfish-note:'+linked.noteId);if(ref.url.includes('#'))warnings.push(`${ref.url}: 已转为整篇笔记链接`);continue}
    if(local&&/\.md$/i.test(local)){warnings.push(`${ref.url}: 目标笔记未选中或是笔记嵌入，保留链接`);continue}
    try{
      if(/^https?:\/\//i.test(ref.url)){if(!ref.image||!remote)continue;const {asset}=await api('/notes/image',{noteId:note.noteId,draft:true,url:ref.url},signal);assetIds.add(asset.id);resolved.set(ref.url,'../assets/'+asset.id);continue}
      if(!local){if(!/^fatfish-note:|^#/i.test(ref.url))warnings.push(`${ref.url}: 引用文件未包含或存在歧义，保留链接`);continue}
      const entry=plan.entries.get(local);if(!entry)continue
      progress?.(0,entry.bytes,local)
      const imageType=/\.(png|jpe?g|gif|webp)$/i.exec(local)?.[1]?.toLowerCase()
      let result:Awaited<ReturnType<typeof transferEntry>>
      try{result=await transferEntry(entry,{noteId:note.noteId,draft:true,...(ref.image&&imageType?{mediaType:'image/'+(imageType==='jpg'?'jpeg':imageType)}:{})},api,signal,progress)}catch(error){if(!ref.image||!/image_limit|invalid_asset/.test(String(error)))throw error;warnings.push(`${local}: 图片按原图附件保存，不在正文解码`);result=await transferEntry(entry,{noteId:note.noteId,draft:true},api,signal,progress)}
      if(result.asset){assetIds.add(result.asset.id);resolved.set(ref.url,'../assets/'+result.asset.id)}
      else if(result.attachment){attachments.set(result.attachment.id,result.attachment);resolved.set(ref.url,'../attachments/'+result.attachment.id+'.bin')}

    }catch(error){signal?.throwIfAborted();throw Error(`${ref.url}: 文件未能转存，本篇尚未保存。请检查后重试。`)}
  }
  body=changeReferences(body,ref=>{
    const url=resolved.get(ref.url)
    if(ref.image&&(!url||url.startsWith('../attachments/'))&&!/^https?:\/\//i.test(ref.url))ref.image=false
    return url??(ref.url.startsWith('fatfish-import:')?decodeURIComponent(ref.url.slice(15)):ref.image?undefined:ref.url)
  })
  // Failed reference-style images keep the destination as a normal link.
  const definitions=new Map<string,string>(),tree=exportTree(body),nodes:Array<Root|RootContent|PhrasingContent>=[]
  const collect=(n:Root|RootContent|PhrasingContent)=>{nodes.push(n);if(n.type==='definition'&&!definitions.has(n.identifier.toUpperCase()))definitions.set(n.identifier.toUpperCase(),n.url);if('children'in n)n.children.forEach(collect)};collect(tree)
  const removeBang=nodes.filter(n=>n.type==='imageReference'&&!/^(?:https?:\/\/|\.\.\/assets\/)/i.test(definitions.get(n.identifier.toUpperCase())??'')).map(n=>n.position?.start.offset).filter((n):n is number=>n!==undefined).sort((a,b)=>b-a)
  for(const at of removeBang)body=body.slice(0,at)+body.slice(at+1)
  content.body=body;content.assetIds=[...assetIds];if(attachments.size)content.attachments=[...attachments.values()]
  try{await api('/notes/save',{noteId:note.noteId,expectedHeads:[],content},signal)}catch(error){
    // A response lost after a successful write must not create another note on retry.
    const saved=await api('/notes/get',{noteId:note.noteId},signal).catch(()=>null)
    if(!saved||saved.note.current.body!==content.body||saved.note.current.originPath!==content.originPath)throw error
  }
  note.done=true;return warnings
}

export async function transferEntry(entry:ImportEntry,options:{noteId:string;draft:boolean;mediaType?:string;editId?:string},api:Api,signal?:AbortSignal,progress?:(bytes:number,total:number,path:string)=>void){
  if(options.editId&&entry.bytes>0&&entry.bytes<=SINGLE_TRANSFER_LIMIT){
    signal?.throwIfAborted();const bytes=await entry.read();signal?.throwIfAborted()
    if(bytes.length!==entry.bytes)throw Error('transfer_incomplete')
    const result=await api('/notes/transfer',{action:'single',...options,name:entry.path.split('/').at(-1)!,size:entry.bytes,base64:encoded(bytes)},signal)
    progress?.(entry.bytes,entry.bytes,entry.path);return result
  }
  const {uploadId}=await api('/notes/transfer',{action:'begin',...options,name:entry.path.split('/').at(-1)!,size:entry.bytes},signal)
  if(!uploadId)throw Error('Missing upload')
  let finished=false,offset=0
  try{
    const fallback=async function*(){const bytes=await entry.read();for(let at=0;at<bytes.length;at+=1024*1024)yield bytes.subarray(at,at+1024*1024)}
    for await(const part of entry.chunks?.()??fallback()){
      for(let at=0;at<part.length;at+=1024*1024){signal?.throwIfAborted();const bytes=part.subarray(at,at+1024*1024);await api('/notes/transfer',{action:'chunk',noteId:options.noteId,uploadId,offset,base64:encoded(bytes)},signal);offset+=bytes.length;progress?.(offset,entry.bytes,entry.path)}
    }
    const result=await api('/notes/transfer',{action:'finish',noteId:options.noteId,uploadId},signal);finished=true;return result
  }finally{if(!finished)await api('/notes/transfer',{action:'cancel',noteId:options.noteId,uploadId}).catch(()=>{})}
}
