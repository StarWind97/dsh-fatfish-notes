import type { PersonalSyncState } from '../contracts/personal.js'
import type { LocaleKey } from './locale.js'

export function syncPresentation(sync:PersonalSyncState|null,dirty=false,saving=false):{state:'checking'|'saving'|'saved'|'syncing'|'synced'|'error';label:LocaleKey;hint:LocaleKey;settings:boolean;network:boolean} {
  const code=sync?.errorCode??''
  const network=/network|offline|timeout/.test(code)||['github_account_unavailable','github_repository_unavailable'].includes(code)
  const account=/auth_required|account_changed|account_invalid|forbidden|permission/.test(code)
  const failed=sync?.status==='error'||sync?.status==='paused'
  const base={settings:!!failed&&!network,network}
  if(failed)return {...base,state:'error',label:code==='gh_unavailable'?'syncToolMissing':account?'notesBackupAccount':network?'notesBackupNetwork':'notesBackupFailed',hint:dirty||saving?'syncLocalSaving':'syncLocalSafe'}
  if(dirty||saving)return {...base,state:'saving',label:'notesSaving',hint:'syncLocalSaving'}
  if(!sync)return {...base,state:'checking',label:'syncChecking',hint:'syncCheckingHint'}
  if(sync.status==='syncing')return {...base,state:'syncing',label:'notesBackupSyncing',hint:'syncBothDirections'}
  if(sync.pending||!sync.enabled||!sync.lastSuccessAt)return {...base,state:'saved',label:'syncLocalSaved',hint:'syncWaiting'}
  return {...base,state:'synced',label:'notesBackupSynced',hint:'syncUpToDate'}
}
