import * as React from 'react'
import {useState,useSyncExternalStore} from 'react'
import {LoaderCircle,ChevronDown,ChevronUp,X} from 'lucide-react'
import {importJob} from './import-job.js'
import type {NoteCaptureBridge} from './note-capture-bridge.js'
import {fileSize} from './NoteAttachments.js'
import type {T} from './locale.js'

const emptySubscribe=()=>()=>{},emptySnapshot=()=>null
/** A live operation badge, mounted outside the current panel or session. */
export function TransferProgress({bridge,t}:{bridge?:NoteCaptureBridge;t:T}){
  const job=useSyncExternalStore(importJob.subscribe,importJob.getSnapshot)
  const capture=useSyncExternalStore(bridge?.subscribe??emptySubscribe,bridge?.getSnapshot??emptySnapshot)
  const [small,setSmall]=useState(false),[dismissed,setDismissed]=useState('')
  const importVisible=job.busy||!!job.message&&job.message!==dismissed
  const failed=!importVisible&&!!capture?.request&&['failed','cancelled'].includes(capture.status),saving=capture?.status==='saving',receipt=!importVisible&&capture?.minimized&&capture.result
  if(!saving&&!receipt&&!failed&&!importVisible)return null
  const p=saving?capture.progress:job.progress,done=saving?capture.progress?.done:job.done,count=saving?capture.progress?.count:job.total
  const title=failed?t('noteFailed'):saving?t('noteSaving'):receipt?t('transferSaved'):job.busy?t('libraryImport'):t('libraryReport')
  return <aside className="fatfish-transfer-progress" role="status" aria-label={title}>
    <style>{`.fatfish-transfer-progress{pointer-events:auto;position:fixed;bottom:20px;right:24px;z-index:1200;width:300px;max-width:calc(100vw - 48px);border:1px solid var(--dsw-alias-border-l2,#aaa5);border-radius:12px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#222);box-shadow:0 6px 24px #0002;padding:12px 14px;font:13px/1.5 system-ui}.fatfish-transfer-progress header{display:flex;align-items:center;gap:8px}.fatfish-transfer-progress strong{flex:1}.fatfish-transfer-progress button{color:inherit;background:transparent;border:0;cursor:pointer;border-radius:4px;padding:4px 7px}.fatfish-transfer-progress button:hover{background:#8882}.fatfish-transfer-progress p{margin:6px 0;overflow-wrap:anywhere}.fatfish-transfer-progress progress{width:100%;height:4px}`}</style>
    <header>{(saving||job.busy)&&<LoaderCircle size={16}/>}<strong>{title}</strong><button title={t(small?'libraryShowProgress':'libraryMinimize')} onClick={()=>setSmall(!small)}>{small?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</button>{!saving&&!job.busy&&<button aria-label={t('paperClose')} onClick={()=>{if(receipt||failed)bridge?.close();setDismissed(job.message)}}><X size={16}/></button>}</header>
    {!small&&<>{(saving||job.busy)&&<><p>{p&&'file' in p?p.file:job.progress.path}</p><p>{count?`${done??0} / ${count} · `:''}{p?.total?`${fileSize(p.bytes)} / ${fileSize(p.total)}`:t('loading')}</p><progress {...(p?.total?{value:p.bytes,max:p.total}:{})}/><button onClick={()=>saving?bridge?.cancel():importJob.cancel()}>{t('cancel')}</button></>}
      {failed&&<><p>{t(capture?.status==='cancelled'?'noteCancelled':'noteFailed')}</p><button onClick={()=>void bridge?.save()}>{t('noteRetryOriginal')}</button></>}
      {receipt&&<><p>{t('transferSavedHint')}</p><button onClick={()=>void bridge?.openNote()}>{t('noteOpen')}</button></>}
      {!saving&&!receipt&&!failed&&!job.busy&&<p>{job.message}</p>}</>}
  </aside>
}
