import * as React from 'react'
import {useEffect,useRef,useState} from 'react'
import type {NoteCatalog} from '../contracts/notes.js'
import type {TagMode,TagPreview,TagReceipt,TagRequest} from '../contracts/tag-management.js'
import type {NotesController} from './notes-controller.js'
import type {T} from './locale.js'
import {PaperDialog} from './paper/PaperDialog.js'

export function TagManager({controller,t,close}:{controller:NotesController;t:T;close:()=>void}) {
  const [tags,setTags]=useState<NoteCatalog['tags']>([]),[find,setFind]=useState('')
  const [source,setSource]=useState(controller.getSnapshot().filter.tag??'')
  const [mode,setMode]=useState<TagMode|null>(null),[target,setTarget]=useState('')
  const [preview,setPreview]=useState<TagPreview|null>(null),[receipt,setReceipt]=useState<TagReceipt|null>(null)
  const [busy,setBusy]=useState(true),[error,setError]=useState(''),[ready,setReady]=useState(false)
  const live=useRef(false),working=useRef(false),library=useRef(controller.libraryEpoch)
  const valid=()=>live.current&&library.current===controller.libraryEpoch
  function message(e:unknown){
    const code=e&&typeof e==='object'&&'code' in e?e.code:''
    return t(code==='tag_changed'||code==='note_conflict'?'tagChanged':code==='note_edit_busy'||code==='note_edit_lost'?'windowEditBusy':code==='tag_pending'?'tagPending':'tagFailed')
  }
  async function reload(signal?:AbortSignal){
    const [catalog,result]=await Promise.all([controller.api('/notes/catalog',undefined,signal),controller.api('/notes/tags',{action:'status'},signal)])
    if(!valid()||signal?.aborted)return
    setTags(catalog.tags);setReceipt(result.receipt);setReady(true)
    setSource(old=>catalog.tags.some(x=>x.tag===old)?old:catalog.tags[0]?.tag??'')
    return result.receipt
  }
  useEffect(()=>{
    live.current=true
    const abort=new AbortController()
    void reload(abort.signal).catch(e=>{if(!abort.signal.aborted)setError(message(e))}).finally(()=>{if(!abort.signal.aborted)setBusy(false)})
    return ()=>{live.current=false;abort.abort()}
  },[controller])
  const pending=receipt?.phase==='applying'||receipt?.phase==='undoing'
  const completed=receipt?.rows.filter(r=>r.completed).length??0
  function select(tag:string){setSource(tag);setPreview(null);setMode(null);setTarget('');setError('')}
  async function run(request:TagRequest){
    if(working.current)return
    working.current=true;setBusy(true);setError('')
    try{
      if(request.action==='status'){await reload();return}
      const result=await controller.api('/notes/tags',request)
      if(!valid())return
      setReceipt(result.receipt)
      if(result.preview){setPreview(result.preview);return}
      setPreview(null);setMode(null)
      if(result.receipt){
        const r=result.receipt
        if(r.phase==='done'&&r.target){setSource(r.target);setFind('')}
        if(r.phase==='undone'){setSource(r.source);setFind('')}
        await controller.tagsChanged(r,request.action==='finish')
        if(!valid())return
      }
      await reload()
    }catch(e){
      if(!valid())return
      setError(message(e));setPreview(null)
      try{
        const recovered=await reload()
        if(recovered&&valid()&&request.action!=='preview'&&request.action!=='status'){
          if(request.action==='apply'||request.action==='resume'||request.action==='undo'){
            if(recovered.token===request.token){
              if(request.action==='undo'&&recovered.phase==='done')await controller.refresh(true,true)
              else await controller.tagsChanged(recovered,false)
            }
          }
        }
      }catch{if(valid())setReady(false)}
    }finally{working.current=false;if(valid())setBusy(false)}
  }
  const term=find.trim().toLocaleLowerCase()
  const labels={rename:t('tagRename'),merge:t('tagMerge'),remove:t('tagRemove')}
  const counts=tags.find(x=>x.tag===source)?.count??0
  return <PaperDialog className="tag-manager" title={t('tagManage')} closeLabel={t('tagReturn')} locked={busy} onClose={close}>
    <div className="paper-dialog-content">
      <p className="paper-dialog-sub">{t('tagScope')}</p>
      {error&&<p role="alert">{error} <button disabled={busy} onClick={()=>void run({action:'status'})}>{t('refresh')}</button></p>}
      {receipt&&receipt.phase!=='undone'&&<section className="tag-receipt" aria-live="polite">
        <strong>{t(pending?'tagProgress':'tagCompleted',{done:completed,total:receipt.rows.length})}</strong>
        <span>{labels[receipt.mode]} · {receipt.source}{receipt.target?' → '+receipt.target:''}</span>
        {pending&&<details><summary>{t('tagProgressDetails')}</summary><ul>{receipt.rows.map(r=><li key={r.noteId}>{r.title} · {t(r.completed?'tagWritten':'tagWaiting')}</li>)}</ul></details>}
        <div className="tag-actions">{pending?<><button disabled={busy} onClick={()=>void run({action:'resume',token:receipt.token})}>{t('tagResume')}</button>
          <button disabled={busy} onClick={()=>void run({action:'finish',token:receipt.token})}>{t('tagFinish')}</button></>:<button disabled={busy} onClick={()=>void run({action:'undo',token:receipt.token})}>{t('tagUndo')}</button>}</div>
      </section>}
      {receipt?.phase==='undone'&&<p role="status">{t('tagRestored',{count:receipt.rows.length})}</p>}
      {busy&&<p role="status">{t('loading')}</p>}
      <div className="tag-manager-grid"><section>
        <input type="search" aria-label={t('findTagName')} placeholder={t('findTagName')} value={find} onChange={e=>setFind(e.target.value)}/>
        <div className="tag-directory">{tags.filter(x=>x.tag.toLocaleLowerCase().includes(term)).map(x=>
          <button type="button" key={x.tag} disabled={busy} aria-pressed={source===x.tag} onClick={()=>select(x.tag)}><span>#{x.tag}</span><small>{x.count}</small></button>)}</div>
        {ready&&!tags.some(x=>x.tag.toLocaleLowerCase().includes(term))&&<small>{t(tags.length?'findNoTagMatch':'findNoTags')}</small>}
      </section><section>{source&&<><h3>#{source}</h3><p>{t('tagUse',{count:counts})}</p>
        {!mode&&<div className="tag-actions">{(['rename','merge','remove'] as const).map(m=><button key={m} disabled={busy||pending||!ready||(m==='merge'&&tags.length<2)} onClick={()=>{setMode(m);setTarget(m==='rename'?source:'');setError('')}}>{labels[m]}</button>)}</div>}
        {mode&&!preview&&<><label>{mode==='remove'?t('tagRemoveHint'):mode==='rename'?t('tagNewName'):t('tagKeep')}
          {mode==='rename'&&<input value={target} disabled={busy} onChange={e=>setTarget(e.target.value)}/>}
          {mode==='merge'&&<select value={target} disabled={busy} onChange={e=>setTarget(e.target.value)}><option value="">{t('tagSelect')}</option>{tags.filter(x=>x.tag!==source).map(x=><option key={x.tag}>{x.tag}</option>)}</select>}</label>
          {mode==='rename'&&target.trim()!==source&&tags.some(x=>x.tag===target.trim())&&<p>{t('tagCollision')}</p>}
          <div className="tag-actions"><button disabled={busy} onClick={()=>select(source)}>{t('cancel')}</button><button disabled={busy||pending||!ready||(mode!=='remove'&&(!target.trim()||target.trim()===source))} onClick={()=>void run({action:'preview',mode,source,target:mode==='remove'?null:target.trim()})}>{t('tagPreview')}</button></div></>}
        {preview&&<section className="tag-preview"><h4>{labels[preview.mode]} · {source}{preview.target?' → '+preview.target:''}</h4>
          <p>{t('tagImpact',{count:preview.rows.length,books:new Set(preview.rows.map(r=>r.notebookId)).size})} {preview.target&&t('tagOverlap',{count:preview.rows.filter(r=>r.before.includes(preview.target!)).length})}</p>
          {preview.mode==='remove'&&<p>{t('tagRemoveHint')}</p>}<ul>{preview.rows.map(r=><li key={r.noteId}><strong>{r.title}</strong><small>{r.book} · {r.before.join('、')} → {r.after.join('、')||t('tagNoLabel')}</small></li>)}</ul>
          <div className="tag-actions"><button disabled={busy} onClick={()=>setPreview(null)}>{t('cancel')}</button><button className="tag-confirm" disabled={busy} onClick={()=>void run({action:'apply',mode:mode!,source:preview.source,target:preview.target,token:preview.token})}>{t('tagConfirm',{action:labels[preview.mode]})}</button></div>
        </section>}</>}</section></div>
    </div><footer><button disabled={busy} onClick={close}>{t('tagReturn')}</button></footer>
  </PaperDialog>
}

