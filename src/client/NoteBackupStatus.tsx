import * as React from 'react'
import { useEffect, useState } from 'react'
import { api } from './api.js'
import type { PersonalSyncState } from '../contracts/personal.js'
import type { T, LocaleKey } from './locale.js'
import { notesStyles as s } from './notes-style.js'

export function NoteBackupStatus({t,onPulled,dirty,saving,revision}:{t:T;onPulled:()=>void;dirty:boolean;saving:boolean;revision?:string|undefined}) {
  const [sync,setSync]=useState<PersonalSyncState|null>(null)
  useEffect(()=>{
    const abort=new AbortController()
    let reading=false, last:string|null=null
    const read=async(pull=false)=>{
      if(reading)return
      reading=true
      try {
        let {sync:state}=await api('/personal',undefined,abort.signal)
        if(pull && state.ready && state.status!=='paused'){
          try{state=(await api('/personal/sync',{},abort.signal)).sync}
          catch{state=(await api('/personal',undefined,abort.signal)).sync}
        }
        if(!abort.signal.aborted){
          setSync(state)
          if(state.lastSuccessAt && state.lastSuccessAt!==last){last=state.lastSuccessAt;onPulled()}
        }
      }catch{/* The next local status read retries when the host becomes available. */}
      finally{reading=false}
    }
    void read(true)
    const online=()=>void read(true)
    window.addEventListener('online',online)
    const timer=setInterval(()=>{if(document.visibilityState!=='hidden')void read()},3000)
    return()=>{abort.abort();window.removeEventListener('online',online);clearInterval(timer)}
  },[onPulled])
  useEffect(()=>{
    const abort=new AbortController()
    if(!saving)void api('/personal',undefined,abort.signal).then(result=>{if(!abort.signal.aborted)setSync(result.sync)}).catch(()=>{})
    return()=>abort.abort()
  },[saving,revision])
  const attention=!!(sync?.pending||sync?.status==='error'||sync?.status==='paused')
  const key:LocaleKey=sync?.pending?'notesBackupPending':sync?.status==='error'||sync?.status==='paused'?'notesBackupFailed':!sync||sync.status==='syncing'?'notesBackupSyncing':'notesBackupSynced'
  return <p style={s.muted} data-attention={attention} role="status">{saving?t('notesSaving')+' · ':dirty?t('notesPending')+' · ':''}{t(key)}</p>
}
