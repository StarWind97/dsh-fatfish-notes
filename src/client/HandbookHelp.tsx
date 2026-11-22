import * as React from 'react'
import {useState} from 'react'
import {BookOpen} from 'lucide-react'
import {api} from './api.js'
import type {T} from './locale.js'

export function HandbookHelp({t}:{t:T}){
  const [busy,setBusy]=useState(false),[missing,setMissing]=useState(false),[error,setError]=useState(false)
  const running=React.useRef(false)
  React.useEffect(()=>{setMissing(false);setError(false)},[t.language])
  async function open(add=false){
    if(running.current)return
    running.current=true;setBusy(true);setError(false)
    try{
      const result=await api('/notes/handbook',{action:add?'add':'open'})
      if(result.noteId){setMissing(false);window.dispatchEvent(new CustomEvent('fatfish-notes-open-handbook',{detail:{noteId:result.noteId}}))}
      else setMissing(true)
    }catch{setError(true)}finally{running.current=false;setBusy(false)}
  }
  return <section className="setup-section" aria-label={t('handbookTitle')}>
    <strong><BookOpen size={17}/>{t('handbookTitle')}</strong>
    <p>{t('handbookHelpIntro')}</p>
    {!missing&&<button disabled={busy} onClick={()=>void open()}>{busy?t('handbookOpening'):t('handbookOpen')}</button>}
    {missing&&<><p>{t('handbookMissing')}</p><button disabled={busy} onClick={()=>void open(true)}>{busy?t('handbookAdding'):t('handbookAdd')}</button></>}
    {error&&<p role="alert">{t('handbookOpenFailed')}</p>}
  </section>
}
