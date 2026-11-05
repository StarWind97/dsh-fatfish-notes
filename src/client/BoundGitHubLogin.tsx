import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, UserRound } from 'lucide-react'
import { api, ApiError } from './api.js'
import { notebookSync } from './notebook-sync.js'
import type { PersonalApiContract, PersonalSyncState } from '../contracts/personal.js'
import type { LocaleKey, T } from './locale.js'

type Tools = PersonalApiContract['/personal/sync/tools']['response']

/** Reuses the setup authorization flow without changing an existing binding. */
export function BoundGitHubLogin({sync,t}:{sync:PersonalSyncState;t:T}) {
  const [tools,setTools]=useState<Tools|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<LocaleKey|null>(null)
  const lifetime=useRef<AbortController|null>(null),authorizing=useRef(false),resumed=useRef(false)
  const binding=sync.binding!,matching=tools?.account?.id===binding.account.id,waiting=tools?.login==='waiting'
  const report=(e:unknown)=>{if(lifetime.current?.signal.aborted)return;setError(e instanceof ApiError&&e.code==='gh_unavailable'?'setupMissingGh':'setupNetwork')}
  const read=async(signal:AbortSignal)=>{const next=await api('/personal/sync/tools',{},signal);if(!signal.aborted){setTools(next);setError(null);if(next.login==='waiting')authorizing.current=true}}
  useEffect(()=>{
    const job=new AbortController();lifetime.current=job
    void read(job.signal).catch(report)
    return()=>job.abort()
  },[binding.repositoryId])
  useEffect(()=>{
    if(!waiting)return
    const job=new AbortController(),timer=setTimeout(()=>void read(job.signal).catch(report),2000)
    return()=>{clearTimeout(timer);job.abort()}
  },[tools])
  useEffect(()=>{
    if(tools?.login!=='idle'||!matching||resumed.current)return
    const authError=['personal_auth_required','personal_account_changed'].includes(sync.errorCode??'')
    if(!authorizing.current&&!authError)return
    resumed.current=true;authorizing.current=false
    void notebookSync.request(true)
  },[tools,matching,waiting,sync.errorCode])
  async function act(login:boolean){
    const signal=lifetime.current?.signal;if(!signal||signal.aborted||busy)return
    setBusy(true);setError(null)
    try{
      if(login){authorizing.current=true;resumed.current=false;await api('/personal/sync/login',{},signal)}
      await read(signal)
    }catch(e){report(e)}finally{if(!signal.aborted)setBusy(false)}
  }
  return <section className="setup-section setup-bound-account" aria-label={t('boundLoginTitle')}>
    <strong><UserRound size={16}/>{t('boundLoginTitle')}</strong>
    {tools?.account?<div className={matching?'setup-complete':''} role="status">{matching&&<CheckCircle2 size={16}/>}<span>{t('setupSignedIn',{account:tools.account.login})}</span></div>:<small>{t(waiting?'setupLoginWaiting':tools?'boundLoginMissing':error?'boundLoginCheckFailed':'boundLoginChecking')}</small>}
    <small>{t(matching?'boundLoginReadyHint':tools?.account?'boundLoginMismatch':'boundLoginHint',{account:binding.account.login})}</small>
    <div className="setup-modes">
      <button disabled={busy||waiting||!tools?.gh||sync.status==='syncing'} onClick={()=>void act(true)}>{t(matching?'boundLoginAgain':'setupLogin')}</button>
      <button disabled={busy||waiting} onClick={()=>void act(false)}>{t('setupRecheck')}</button>
    </div>
    {waiting&&<div className="setup-note" role="status">{tools?.deviceCode&&<b>{tools.deviceCode}</b>} <a href="https://github.com/login/device" target="_blank" rel="noreferrer">{t('setupDevicePage')}</a></div>}
    {tools&&!tools.gh&&<small>{t('setupLoginNeedsTool')} <a href="https://cli.github.com/" target="_blank" rel="noreferrer">GitHub CLI</a></small>}
    {tools?.login==='failed'&&<small role="alert">{t('setupLoginFailed')}</small>}
    {error&&<small role="alert">{t(error)}</small>}
  </section>
}
