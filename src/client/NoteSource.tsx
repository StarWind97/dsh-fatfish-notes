import * as React from 'react'
import {useEffect,useState} from 'react'
import {Paperclip} from 'lucide-react'
import type {CaptureSource,NoteView} from '../contracts/notes.js'
import {capturedFile} from '../notes/capture-materials.js'
import {api} from './api.js'
import {validCaptureSource} from './notes-validation.js'
import {noteAssetUrl} from './NoteMarkdown.js'
import {AttachmentList,attachmentUrl} from './NoteAttachments.js'
import {notesStyles as s} from './notes-style.js'
import type {T} from './locale.js'

/** Shared read-only source presentation; all file cards retain message identity. */
export function SourceContent({source,note,t,assetUrl,staticView=false}:{source:CaptureSource;note:NoteView;t:T;staticView?:boolean;assetUrl?:(id:string)=>string}){
  const inline=new Set(source.messages.flatMap(message=>message.blocks.flatMap(block=>{const file=capturedFile(block,message,source.archivedMaterials);return file?.material?[file.material.id]:[]})))
  const image=(id:string)=>assetUrl?assetUrl(id):noteAssetUrl(note,id,note.current.sourceId!)
  return <section aria-label={t('notesSource')}><p style={s.muted}>{t(source.complete?'notesSourceComplete':'notePartialSource')}</p>
    {source.messages.map(message=><article key={message.id} style={s.card}><strong>{message.role==='user'?t('messageUser'):'AI'}</strong>{message.blocks.map((block,index)=>{
      const file=capturedFile(block,message,source.archivedMaterials)
      if(file)return <p key={index}>{file.material?.saved&&file.material.available?<a className="paper-file-link" href={attachmentUrl(note,file.material.saved.id)} download={file.material.name}><Paperclip size={14}/>{file.label}</a>:file.label}</p>
      if(block.type==='text')return <pre key={index} style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',font:'inherit'}}>{block.text}</pre>
      return source.assets[block.attachmentId]?<img key={index} alt={t('noteImage')} src={image(source.assets[block.attachmentId]!)} style={{display:'block',maxWidth:'100%',maxHeight:500}}/>:<p key={index}>{t('notesMissingImage')}</p>
    })}</article>)}
    {source.archivedMaterials?.filter(m=>(!m.imageId||!!m.saved)&&!inline.has(m.id)).map(m=><article key={m.id} style={s.card}>{m.assetId?<img alt={m.name} src={image(m.assetId)} style={{maxWidth:'100%'}}/>:m.saved?<AttachmentList note={{...note,current:{...note.current,attachments:[m.saved]}}} t={t} staticView={staticView}/>:<p>{m.name} · {t('materialOmitted')}</p>}</article>)}
  </section>
}
export function NoteSource({note,t}:{note:NoteView;t:T}){
  const [source,setSource]=useState<CaptureSource|null>(null),[failed,setFailed]=useState(false)
  useEffect(()=>{const controller=new AbortController();setSource(null);setFailed(false)
    if(note.current.sourceId)void api('/notes/source',{sourceId:note.current.sourceId},controller.signal).then(result=>{if(!validCaptureSource(result.source))throw Error();setSource(result.source as unknown as CaptureSource)}).catch(()=>{if(!controller.signal.aborted)setFailed(true)})
    return()=>controller.abort()
  },[note.current.sourceId])
  return failed?<p role="alert">{t('notesSourceFailed')}</p>:!source?<p role="status">{t('loading')}</p>:<SourceContent source={source} note={note} t={t}/>
}
