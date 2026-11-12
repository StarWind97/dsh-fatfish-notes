import * as React from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Compartment, EditorState, Transaction } from '@codemirror/state'
import { EditorView, keymap, drawSelection } from '@codemirror/view'
import { history, historyField, historyKeymap, defaultKeymap, redo, isolateHistory } from '@codemirror/commands'
import { markdown, markdownKeymap, markdownLanguage } from '@codemirror/lang-markdown'
import { search, searchKeymap } from '@codemirror/search'
import type { NotesController,NotesState } from '../notes-controller.js'
import { resolveNoteImage } from '../NoteMarkdown.js'
import {api} from '../api.js'
import {uploadFile} from '../import-worker-client.js'
import {supplementMaterials,withoutSupplement,remainingSupplements} from '../../notes/note-materials.js'
import {bodyMaterials} from '../../notes/reference-materials.js'
import {setSupplements,supplementField,supplementHistory} from './supplement-history.js'
import {AttachmentDialog,Supplements,attachmentUrl} from '../NoteAttachments.js'
import {noteLinkId,markdownLabel} from '../../contracts/note-links.js'
import type {NoteListItem} from '../../contracts/notes.js'
import { safePublicUrl } from '../safe-url.js'
import type { T } from '../locale.js'
import { livePreview,refreshMedia } from './decorations.js'
import { ancestor,format,selectionFormat,type Format } from './format.js'
import { FormatBar,type Action } from './FormatBar.js'
import { archiveInput,clipboardImages,type ImageInput } from './image-input.js'
import { applyEditorChanges,editorOffset,editorText,sourceOffset } from './line-endings.js'
import type { WritingNavigation } from './use-outline.js'

const undoHistory=(state:EditorState)=>state.field(historyField)
export interface UndoSnapshot{body:string;history:ReturnType<typeof undoHistory>}
interface Props{controller:NotesController;state:NotesState;t:T;start:number;anchorY:number|undefined;undo:React.MutableRefObject<UndoSnapshot|null>;complete:React.MutableRefObject<(()=>void)|null>;navigation?:React.Ref<WritingNavigation>;done:(pos:number,y:number)=>void}
interface LinkFields{from:number;to:number;label:string;url:string}
function writingEdge(pane:HTMLElement){
  return pane.getBoundingClientRect().top+parseFloat(getComputedStyle(pane).paddingTop)
    +(pane.querySelector('.paper-formatbar')?.getBoundingClientRect().height??0)+16
}
export function PaperWriting(props:Props){
  const {controller,state,t}=props, mount=useRef<HTMLDivElement>(null),editor=useRef<EditorView|null>(null),picker=useRef<HTMLInputElement>(null)
  const latest=useRef(props);latest.current=props
  const [formatTick,refreshTools]=React.useReducer((n:number)=>n+1,0)
  const [info,setInfo]=useState(''),[link,setLink]=useState<LinkFields|null>(null)
  const active=useRef<AbortController|null>(null)
  const pending=useRef(new Set<{from:number;to:number}>())
  const raw=useRef(state.draft!.body)
  const editability=useRef(new Compartment())
  const linkRange=useRef<{from:number;to:number;original:string}|null>(null)
  const attachmentPicker=useRef<HTMLInputElement>(null),attachmentAt=useRef<{from:number;to:number}|null>(null)
  const fileDestination=useRef<'body'|'supplement'>('body'),uploadedFiles=useRef(new Map<string,File>())
  const [attachmentFiles,setAttachmentFiles]=useState<File[]>([]),[noteQuery,setNoteQuery]=useState(''),[noteResults,setNoteResults]=useState<NoteListItem[]>([]),[noteSearch,setNoteSearch]=useState(false)
  useEffect(()=>{if(!link||!noteSearch)return;const abort=new AbortController(),timer=setTimeout(()=>{void api('/notes',{query:noteQuery,limit:30},abort.signal).then(page=>setNoteResults(page.items.filter(n=>n.noteId!==noteId))).catch(()=>{})},180);return()=>{clearTimeout(timer);abort.abort()}},[link!==null,noteSearch,noteQuery])
  const [remote,setRemote]=useState('')
  const known=useRef(new Set(state.draft!.assetIds)), keep=useRef(new Set(state.draft!.assetIds.filter(id=>!state.draft!.body.includes('../assets/'+id))))
  const noteId=state.noteId!
  const body=state.draft!.body
  function openLink(){
    const v=editor.current;if(!v)return
    const {from,to}=v.state.selection.main,n=ancestor(v.state,['Link','Autolink']),url=n?.getChild('URL')
    const left=n?.firstChild,right=n?.getChildren('LinkMark')[1]
    const a=n?.from??from,b=n?.to??to
    linkRange.current={from:a,to:b,original:v.state.sliceDoc(a,b)}
    setLink({from:a,to:b,label:left&&right?v.state.sliceDoc(left.to,right.from):v.state.sliceDoc(from,to),url:url?v.state.sliceDoc(url.from,url.to).replace(/^<|>$/g,''):''})
  }
  async function importPictures(inputs:ImageInput[],view:EditorView){
    if(!inputs.length)return
    const {from,to}=view.state.selection.main,original=view.state.sliceDoc(from,to),at={from,to}
    pending.current.add(at);setInfo(t('paperImporting'))
    const inserts:string[]=[],fallback:File[]=[];let failed=false
    return controller.queueImageImport(async signal=>{
    try{
      for(const input of inputs){
        try{
          const asset=await archiveInput(noteId,input,signal,!controller.getSnapshot().note,controller.api);signal.throwIfAborted()
          known.current.add(asset.id)
          if('file' in input)controller.rememberImage(asset.id,input.file)
          else if('preview' in asset&&asset.preview)controller.rememberImage(asset.id,asset.preview)
          const alt=(input.label||t('noteImage')).replace(/[\[\]\\\r\n]/g,' ')
          inserts.push('!['+alt+'](../assets/'+asset.id+')')
        }catch(error){signal.throwIfAborted();failed=true;if('file' in input&&/image_limit|image_type/.test(String(error)))fallback.push(input.file);if('url' in input)inserts.push(input.url)}
      }
      if(controller.getSnapshot().noteId!==noteId)return
      if(inserts.length){
        if(view!==editor.current){
          const draft=controller.getSnapshot().draft
          if(draft){const value=draft.body+'\n\n'+inserts.join('\n\n');controller.update({body:value,assetIds:[...new Set([...draft.assetIds,...[...known.current].filter(id=>value.includes('../assets/'+id))])]})}
          return
        }
        const end=view.state.sliceDoc(at.from,at.to)===original?at.to:at.from
        const insert=(at.from?'\n\n':'')+inserts.join('\n\n')+'\n\n'
        const follow=view.state.selection.main.from===at.from&&view.state.selection.main.to===end
        const draft=controller.getSnapshot().draft!,nextBody=view.state.doc.sliceString(0,at.from)+insert+view.state.doc.sliceString(end)
        view.dispatch({changes:{from:at.from,to:end,insert},effects:setSupplements.of(remainingSupplements({...draft,body:nextBody})),annotations:isolateHistory.of('full'),...(follow?{selection:{anchor:at.from+insert.length}}:{}),userEvent:'input.paste'})
      }
      if(fallback.length)chooseAttachments(fallback)
      setInfo(t(fallback.length?'imageAsFile':failed?'paperImageFail':'paperImported'))
    }catch{if(editor.current===view)setInfo(t('paperImageFail'))}
    finally{pending.current.delete(at)}
    })
  }
  function chooseAttachments(files:File[],destination:'body'|'supplement'='body'){
    const v=editor.current;if(!v)return
    fileDestination.current=destination;const {from,to}=v.state.selection.main,at={from,to};attachmentAt.current=at;pending.current.add(at);setAttachmentFiles(files)
  }
  function closeAttachments(){if(attachmentAt.current)pending.current.delete(attachmentAt.current);attachmentAt.current=null;setAttachmentFiles([]);editor.current?.focus()}
  async function attachFiles(files:File[],cancel:AbortSignal,progress:(value:{bytes:number;total:number;path:string})=>void){
    return controller.queueImageImport(async queueSignal=>{
      const signal=AbortSignal.any([queueSignal,cancel]);let failed=false
      for(const file of files){try{
        const draft=controller.getSnapshot().draft!
        const {attachment}=await uploadFile(file,{noteId,draft:!controller.getSnapshot().note},controller.api,signal,progress)
        if(!attachment)throw new Error('attachment_failed')
        signal.throwIfAborted()
        const current=controller.getSnapshot().draft!,attachments=[...(current.attachments??[]).filter(a=>a.id!==attachment.id),attachment]
        uploadedFiles.current.set(attachment.id,file)
        const extra=supplementMaterials(current),used=bodyMaterials(current.body)
        const supplements=fileDestination.current==='supplement'&&!used.attachmentIds.includes(attachment.id)?{...extra,attachmentIds:[...new Set([...extra.attachmentIds,attachment.id])]}:withoutSupplement(current,attachment.id)
        if(fileDestination.current==='supplement'){controller.update({attachments,supplements});continue}
        controller.update({attachments})
        const insert='\n['+markdownLabel(attachment.name)+'](../attachments/'+attachment.id+'.bin)\n',v=editor.current,at=attachmentAt.current
        if(v&&at)v.dispatch({changes:{from:at.from,insert},effects:setSupplements.of(supplements),annotations:isolateHistory.of('full'),userEvent:'input.paste'})
        else controller.update({body:current.body+insert,supplements})
      }catch{signal.throwIfAborted();failed=true}}
      setInfo(failed?t('attachmentFailed'):'')
    })
  }
  async function insertSupplement(id:string,image:boolean){
    const v=editor.current;if(!v||!controller.writable)return
    const {from,to}=v.state.selection.main,at={from,to};pending.current.add(at)
    await controller.queueImageImport(async signal=>{
      try{
        const current=controller.getSnapshot(),file=current.draft?.attachments?.find(f=>f.id===id)
        let target=image?'../assets/'+id:'../attachments/'+id+'.bin',inline=image,label=file?.name||t('noteImage')
        if(!image&&file&&/\.(png|jpe?g|gif|webp)$/i.test(file.name)&&file.bytes<=20*1024*1024){
          let original=uploadedFiles.current.get(id)
          if(!original){
            if(!current.note?.current.attachments?.some(f=>f.id===id))throw Error('attachment_unavailable')
            const response=await fetch(attachmentUrl(current.note,id),{signal});if(!response.ok)throw Error('attachment_unavailable')
            original=new File([await response.blob()],file.name)
          }
          try{
            const asset=await archiveInput(noteId,{file:original,label:file.name},signal,!current.note,controller.api)
            known.current.add(asset.id);controller.rememberImage(asset.id,original);target='../assets/'+asset.id;inline=true
          }catch(error){signal.throwIfAborted();if(!/image_limit|image_type|invalid_asset|image_decode|export_image/.test(String(error)))throw error;setInfo(t('supplementImageFallback'))}
        }
        signal.throwIfAborted();if(editor.current!==v||controller.getSnapshot().noteId!==noteId)throw Error('editor_changed')
        const draft=controller.getSnapshot().draft!
        const extra=supplementMaterials(draft)
        if(!(image?extra.assetIds:extra.attachmentIds).includes(id))return
        const insert=`\n\n${inline?'!':''}[${markdownLabel(label)}](${target})\n\n`
        keep.current.delete(id)
        v.dispatch({changes:{from:at.from,insert},effects:setSupplements.of(withoutSupplement(draft,id)),selection:{anchor:at.from+insert.length},annotations:isolateHistory.of('full'),userEvent:'input.paste'});v.focus()
      }catch(error){if(!signal.aborted)setInfo(t('attachmentFailed'))}
      finally{pending.current.delete(at)}
    })
  }
  function run(action:Action){
    if(!controller.writable&&action!=='find')return
    const v=editor.current;if(!v)return
    if(action==='attachment'){fileDestination.current='body';controller.imagePickerOpen=true;attachmentPicker.current?.click();return}
    if(action==='picture'){controller.imagePickerOpen=true;picker.current?.click();return}
    if(action==='link'){openLink();return}
    format(v,action,t('paperText'));if(action!=='find')v.focus()
  }
  useLayoutEffect(()=>{
    const el=mount.current!,abort=new AbortController();active.current=abort
    const image=(path:string)=>{
      const note=latest.current.state.note
      return (note&&resolveNoteImage(path,note))||(/^\.\.\/assets\/([a-f0-9]{64}\.(?:png|jpg|gif|webp))$/.test(path)?controller.previewImage(path.slice(10)):null)
    }
    const shortcuts=Object.entries({'Mod-b':'bold','Mod-i':'italic','Mod-k':'link',Tab:'indent','Shift-Tab':'outdent'} as const).map(([key,action])=>({key,run:(v:EditorView)=>action==='link'?(openLink(),true):format(v,action,t('paperText'))}))
    const doc=editorText(body),start=editorOffset(body,Math.min(props.start,body.length))
    const view=new EditorView({parent:el,state:EditorState.create({doc,selection:{anchor:start},extensions:[
      markdown({base:markdownLanguage}),history(),supplementHistory,supplementField.init(()=>supplementMaterials(state.draft!)),...(props.undo.current?.body===body?[historyField.init(()=>props.undo.current!.history)]:[]),editability.current.of([]),search({top:true}),keymap.of([...shortcuts,{key:'Mod-Shift-z',run:redo},...searchKeymap,...markdownKeymap,...defaultKeymap,...historyKeymap]),drawSelection(),EditorView.lineWrapping,
      EditorState.phrases.of(t('paperDone')==='完成'?{Find:'查找',Replace:'替换',next:'下一个',previous:'上一个',all:'全选匹配',replace:'替换','replace all':'全部替换','match case':'区分大小写',regexp:'正则表达式','by word':'全词',close:'关闭'}:{}),
      EditorView.contentAttributes.of({'aria-label':t('notesBody'),'aria-multiline':'true',spellcheck:'false'}),livePreview(image,t('paperTask'),[t('documentCopyCode'),t('documentCopied'),t('documentCopyFailed')]),
      EditorView.domEventHandlers({paste(event,v){
        const data=event.clipboardData;if(!data)return false
        const ordinary=Array.from(data.files).filter(f=>!/^image\/(png|jpeg|gif|webp)$/.test(f.type));if(ordinary.length){event.preventDefault();chooseAttachments(ordinary);return true}
        const inputs=clipboardImages(data)
        if(!inputs.length){
          const plain=data.getData('text/plain').trim()
          if(/^(?:[a-z]:[\\/]|file:\/\/).+\.(?:png|jpe?g|webp|gif)"?$/i.test(plain.replace(/^"/,'')))setInfo(t('paperPathOnly'))
          setRemote(/^https:\/\/\S+$/i.test(plain)&&!ancestor(v.state,['FencedCode','CodeBlock','InlineCode'])?plain:'');return false
        }
        const only=inputs.length===1?inputs[0]:undefined
        if(only&&'url' in only){
          if(ancestor(v.state,['FencedCode','CodeBlock','InlineCode']))return false
          if(!v.state.selection.main.empty&&!only.label&&!/\.(png|jpe?g|gif|webp)$/i.test(new URL(only.url).pathname))return false
        }
        event.preventDefault();void importPictures(inputs,v);return true
      },dragover(e){if(e.dataTransfer?.types.includes('Files')){e.preventDefault();return true}return false},drop(e,v){
        const files=Array.from(e.dataTransfer?.files??[]);if(!files.length)return false
        e.preventDefault();const pos=v.posAtCoords({x:e.clientX,y:e.clientY});if(pos!==null)v.dispatch({selection:{anchor:pos}})
        const images=files.filter(f=>/^image\/(png|jpeg|gif|webp)$/.test(f.type)),ordinary=files.filter(f=>!images.includes(f));if(images.length)void importPictures(images.map(file=>({file,label:file.name})),v);if(ordinary.length)chooseAttachments(ordinary);return true
      }}),
      EditorView.updateListener.of(u=>{
        // React may flush layout effects synchronously after an async image import.
        // Finish the CodeMirror transaction (and capture its text) before rerendering tools.
        if(u.selectionSet||u.docChanged)queueMicrotask(()=>{if(editor.current===u.view)refreshTools()})
        if(!u.docChanged)return
        for(const p of pending.current){p.from=u.changes.mapPos(p.from,1);p.to=Math.max(p.from,u.changes.mapPos(p.to,-1))}
        const r=linkRange.current;if(r){r.from=u.changes.mapPos(r.from,1);r.to=Math.max(r.from,u.changes.mapPos(r.to,-1))}
        if(u.transactions.some(tr=>tr.annotation(Transaction.remote)))return
        const supplements=u.state.field(supplementField),value=applyEditorChanges(raw.current,u.changes),assetIds=[...known.current].filter(id=>supplements.assetIds.includes(id)||keep.current.has(id)||value.includes('../assets/'+id))
        raw.current=value
        controller.update({body:value,assetIds,supplements})
      })
    ]})});editor.current=view;view.focus();refreshTools()
    const pane=el.closest<HTMLElement>('.paper-pane'),y=props.anchorY
    const frame=requestAnimationFrame(()=>{if(pane&&y!==undefined){const coords=view.coordsAtPos(start);if(coords)pane.scrollTop+=coords.top-y}})
    return ()=>{controller.imagePickerOpen=false;cancelAnimationFrame(frame);abort.abort();props.undo.current={body:raw.current,history:undoHistory(view.state)};view.destroy();editor.current=null;if(controller.getSnapshot().composing)controller.composition(false)}
  },[controller,noteId])
  useLayoutEffect(()=>{const disabled=state.loadingNote||state.operation||!controller.writable;editor.current?.dispatch({effects:editability.current.reconfigure([EditorState.readOnly.of(disabled),EditorView.editable.of(!disabled)])})},[state.loadingNote,state.operation,controller.writable])
  useLayoutEffect(()=>{
    const v=editor.current;if(!v)return
    if(body!==raw.current && !state.composing){raw.current=body;state.draft?.assetIds.forEach(id=>known.current.add(id));v.dispatch({changes:{from:0,to:v.state.doc.length,insert:editorText(body)},annotations:[Transaction.remote.of(true),Transaction.addToHistory.of(false)]})}
  },[body,state.composing,state.draft?.assetIds])
  useLayoutEffect(()=>{const v=editor.current,extra=state.draft?.supplements;if(v&&extra&&JSON.stringify(v.state.field(supplementField))!==JSON.stringify(extra))v.dispatch({effects:setSupplements.of(extra),annotations:[Transaction.remote.of(true),Transaction.addToHistory.of(false)]})},[state.draft?.supplements])
  useEffect(()=>{editor.current?.dispatch({effects:refreshMedia.of()})},[state.note?.current.revision])
  useEffect(()=>{const input=picker.current,attachment=attachmentPicker.current;if(!input)return;const cancel=()=>{controller.imagePickerOpen=false};input.addEventListener('cancel',cancel);attachment?.addEventListener('cancel',cancel);return()=>{input.removeEventListener('cancel',cancel);attachment?.removeEventListener('cancel',cancel)}},[controller])
  const ctx=React.useMemo(()=>editor.current?selectionFormat(editor.current.state):{active:new Set<Format>(),heading:undefined},[formatTick])
  function done(){
    const v=editor.current, pane=mount.current?.closest<HTMLElement>('.paper-pane');if(!v||!pane)return
    const rect=v.contentDOM.getBoundingClientRect(),y=Math.max(rect.top+4,writingEdge(pane)+2)
    const pos=v.posAtCoords({x:rect.left+6,y},false)
    props.done(sourceOffset(raw.current,pos),v.coordsAtPos(pos)?.top??y)
  }
  React.useImperativeHandle(props.complete,()=>()=>{if(!state.composing)done()})
  React.useImperativeHandle(props.navigation,()=>({
    jump(position){
      const v=editor.current,pane=mount.current?.closest<HTMLElement>('.paper-pane');if(!v||!pane)return
      const pos=editorOffset(raw.current,Math.min(position,raw.current.length))
      const margin=writingEdge(pane)-pane.getBoundingClientRect().top
      v.dispatch({selection:{anchor:pos},effects:EditorView.scrollIntoView(pos,{y:'start',yMargin:margin})})
      v.focus()
      // Re-measure after live preview reveals the selected heading's Markdown.
      v.requestMeasure({read:view=>view.documentTop+view.lineBlockAt(pos).top,write:top=>{pane.scrollTop+=top-pane.getBoundingClientRect().top-margin}})
    },
    topPosition(){
      const v=editor.current,pane=mount.current?.closest<HTMLElement>('.paper-pane');if(!v||!pane)return null
      const rect=v.contentDOM.getBoundingClientRect()
      const y=writingEdge(pane)+2
      if(y<rect.top)return -1
      const pos=v.posAtCoords({x:rect.left+4,y:Math.min(y,rect.bottom-1)},false)
      return sourceOffset(raw.current,pos)
    }
  }))
  return <>{attachmentFiles.length>0&&<AttachmentDialog files={attachmentFiles} t={t} close={closeAttachments} add={attachFiles}/>}<input ref={attachmentPicker} type="file" hidden multiple onChange={e=>{controller.imagePickerOpen=false;chooseAttachments(Array.from(e.target.files??[]),fileDestination.current);e.target.value=''}}/><FormatBar t={t} run={run} active={ctx.active} heading={ctx.heading}/>
    <input hidden ref={picker} type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple onChange={e=>{controller.imagePickerOpen=false;const files=Array.from(e.target.files??[]);if(editor.current)void importPictures(files.map(file=>({file,label:file.name})),editor.current);e.target.value=''}}/>
    {info&&<p className="paper-hint" role="status">{info}</p>}
    {remote&&<button type="button" onClick={()=>{const v=editor.current;if(!v)return;const range=v.state.selection.main,at=range.head-remote.length;if(at>=0&&v.state.sliceDoc(at,range.head)===remote)v.dispatch({selection:{anchor:at,head:range.head}});void importPictures([{url:remote,label:''}],v);setRemote('')}}>{t('paperImportUrl')}</button>}
    {link&&<form className="paper-link-form" onSubmit={e=>{e.preventDefault();const url=noteLinkId(link.url)?link.url:safePublicUrl(link.url),v=editor.current;if(!url||!v){setInfo(t('paperBadUrl'));return}
      const r=linkRange.current;if(!r||v.state.sliceDoc(r.from,r.to)!==r.original){setLink(null);linkRange.current=null;v.focus();return}
      const label=(link.label||url).replace(/[\\\[\]]/g,'\\$&'),insert='['+label+'](<'+url.replace(/[<>]/g,encodeURIComponent)+'>)'
      linkRange.current=null;v.dispatch({changes:{from:r.from,to:r.to,insert},selection:{anchor:r.from+insert.length},userEvent:'input'});setLink(null);v.focus()}}>
      <label>{t('paperLinkText')}<input value={link.label} onChange={e=>setLink({...link,label:e.target.value})}/></label>
      <label>{t('paperLinkUrl')}<input autoFocus required value={link.url} onChange={e=>setLink({...link,url:e.target.value})}/></label>
      <button type="button" aria-expanded={noteSearch} onClick={()=>setNoteSearch(!noteSearch)}>{t('linkNote')}</button>{noteSearch&&<div><input aria-label={t('linkSearch')} placeholder={t('linkSearch')} value={noteQuery} onChange={e=>setNoteQuery(e.target.value)}/><div className="paper-note-results">{noteResults.map(n=><button type="button" key={n.noteId} onClick={()=>{setLink({...link,label:n.title,url:'fatfish-note:'+n.noteId});setNoteSearch(false)}}>{n.title}</button>)}</div></div>}<button type="submit">{t('paperLinkApply')}</button><button type="button" onClick={()=>{setLink(null);editor.current?.focus()}}>{t('cancel')}</button></form>}
    <div className="paper-writing" ref={mount} onCompositionStart={()=>controller.composition(true)} onCompositionEnd={()=>controller.composition(false)}/>
    <Supplements content={state.draft!} note={state.note} t={t} edit={{disabled:!controller.writable||state.operation||state.loadingNote,add:()=>{fileDestination.current='supplement';controller.imagePickerOpen=true;attachmentPicker.current?.click()},insert:(id,image)=>void insertSupplement(id,image),remove:id=>{keep.current.delete(id);controller.update({supplements:withoutSupplement(controller.getSnapshot().draft!,id)})}}}/>
  </>
}
