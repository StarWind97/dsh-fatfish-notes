import {posix} from 'node:path'
import {zipSync} from 'fflate'
import type {NoteRepository} from '../repository.js'
import {exportFilename} from './markdown.js'
import {changeReferences} from '../portable-links.js'
import {noteLinkId,attachmentLinkId} from '../../contracts/note-links.js'
import {object,id} from '../validation.js'
import {materializeNote} from '../revisions.js'
import type {ExportFile} from './service.js'

export async function exportLibrary(repository:NoteRepository,input:unknown,signal?:AbortSignal):Promise<ExportFile>{
  const v=object(input),bookId=v.notebookId===undefined?undefined:id(v.notebookId),books=await repository.listNotebooks(signal),snapshot=await repository.exportObjects(signal)
  const rows=[...new Set(snapshot.revisions.map(r=>r.noteId))].map(id=>materializeNote(snapshot.revisions.filter(r=>r.noteId===id),id).current).filter(r=>r.status==='active'&&(!bookId||r.notebookId===bookId))
  const files:Record<string,Uint8Array>={},bookPaths=new Map<string,string>(),notePaths=new Map<string,string>(),used=new Set<string>(),warnings:string[]=[]
  function unique(value:string,extension=''){let path=value+extension,n=2;while(used.has(path.toLocaleLowerCase()))path=`${value} (${n++})${extension}`;used.add(path.toLocaleLowerCase());return path}
  used.add('assets');used.add('attachments')
  for(const b of books)bookPaths.set(b.notebookId,unique(exportFilename(b.current.title)))
  for(const r of rows)notePaths.set(r.noteId,unique(`${bookPaths.get(r.notebookId??'')??'默认笔记本'}/${exportFilename(r.title)}`,'.md'))
  for(const r of rows){
    signal?.throwIfAborted();const path=notePaths.get(r.noteId)!,folder=posix.dirname(path),attachmentPaths=new Map<string,string>()
    for(const a of r.attachments??[]){const target=`attachments/${a.id.slice(0,16)}-${exportFilename(a.name)}`;attachmentPaths.set(a.id,target);files[target]=await repository.getAttachment(a.id,signal)}
    for(const asset of r.assetIds)files[`assets/${asset}`]=await repository.getAsset(asset,signal)
    const relative=(target:string)=>posix.relative(folder,target).split('/').map(encodeURIComponent).join('/')
    const body=changeReferences(r.body,ref=>{
      const targetId=noteLinkId(ref.url),file=attachmentLinkId(ref.url)
      if(targetId){const target=notePaths.get(targetId);if(target)return relative(target);warnings.push(`${path}: 链接目标未包含在此次导出中 (${targetId})`);return undefined}
      if(file&&attachmentPaths.has(file))return relative(attachmentPaths.get(file)!)
      if(ref.url.startsWith('../assets/')&&r.assetIds.includes(ref.url.slice(10)))return relative('assets/'+ref.url.slice(10))
      return undefined
    })
    const fields={title:r.title,tags:r.tags,summary:r.summary,updated:r.recordedAt,notebook:books.find(b=>b.notebookId===r.notebookId)?.current.title??'默认笔记本',...(r.originPath?{source_path:r.originPath}:{})}
    const missing=(r.attachments??[]).filter(a=>!r.body.includes('../attachments/'+a.id+'.bin'))
    files[path]=Buffer.from('---\n'+Object.entries(fields).map(([k,value])=>k+': '+JSON.stringify(value)).join('\n')+'\n---\n\n'+body+(missing.length?'\n\n## 附件\n\n'+missing.map(a=>`[${a.name.replace(/[\\[\]]/g,'\\$&')}](<${relative(attachmentPaths.get(a.id)!)}>)`).join('\n\n'):'')+'\n')
  }
  if(warnings.length)files['导出说明.txt']=Buffer.from(warnings.join('\n'))
  return {bytes:Buffer.from(zipSync(files,{level:0})),filename:`${bookId?exportFilename(books.find(b=>b.notebookId===bookId)?.current.title??'笔记本'):'肥鱼笔记'}-Markdown.zip`,mediaType:'application/zip'}
}
