import * as React from 'react'
import { useEffect, useSyncExternalStore } from 'react'
import { CircleCheck, LoaderCircle, CloudOff, CloudAlert } from 'lucide-react'
import { notebookSync } from './notebook-sync.js'
import type { T, LocaleKey } from './locale.js'

export function NoteBackupStatus({t,onPulled,onSettings,dirty,saving,revision}:{t:T;onPulled:()=>void;onSettings:()=>void;dirty:boolean;saving:boolean;revision?:string|undefined}) {
  const sync=useSyncExternalStore(notebookSync.subscribe,notebookSync.getSnapshot,notebookSync.getSnapshot)
  useEffect(()=>{
    const visibility=()=>notebookSync.foreground(document.visibilityState!=='hidden')
    const online=()=>{void notebookSync.request(true)}
    visibility();document.addEventListener('visibilitychange',visibility);window.addEventListener('online',online)
    return()=>{notebookSync.foreground(false);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('online',online)}
  },[])
  useEffect(()=>{if(sync?.lastSuccessAt)onPulled()},[sync?.lastSuccessAt,onPulled])
  useEffect(()=>{if(!saving)void notebookSync.read()},[saving,revision])
  useEffect(()=>{if(dirty||saving)notebookSync.localChanged()},[dirty,saving])
  const failed=sync?.status==='error'||sync?.status==='paused'
  const network=!!sync?.errorCode&&(/network|offline|timeout/.test(sync.errorCode)||['github_account_unavailable','github_repository_unavailable'].includes(sync.errorCode))
  const account=!!sync?.errorCode&&/auth_required|account_changed|account_invalid|forbidden|permission|gh_unavailable/.test(sync.errorCode)
  const busy=!failed&&(!sync||sync.status==='syncing'||sync.pending||dirty||saving)
  const key:LocaleKey=failed?(account?'notesBackupAccount':network?'notesBackupNetwork':'notesBackupFailed'):busy?'notesBackupSyncing':'notesBackupSynced'
  const Icon=failed?(network?CloudOff:CloudAlert):busy?LoaderCircle:CircleCheck
  return <button className="paper-sync-status" data-attention={failed} data-state={failed?'error':busy?'syncing':'synced'} onClick={onSettings} title={t('notesBackupDetails')}>
    <Icon size={15} aria-hidden="true"/><span role="status">{t(key)}</span>
  </button>
}
