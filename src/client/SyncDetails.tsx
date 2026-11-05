import * as React from 'react'
import { CircleCheck, Circle, LoaderCircle, CloudOff, CloudAlert } from 'lucide-react'
import type { PersonalSyncState } from '../contracts/personal.js'
import type { T } from './locale.js'
import { noteDateTime } from '../notes/date.js'
import { syncPresentation } from './sync-presentation.js'

export function SyncSymbol({state,network}:{state:string;network:boolean}){const Icon=state==='syncing'?LoaderCircle:state==='synced'?CircleCheck:state==='error'?(network?CloudOff:CloudAlert):Circle;return <Icon size={15} aria-hidden="true"/>}
export function SyncDetails({sync,t,dirty=false,saving=false}:{sync:PersonalSyncState|null;t:T;dirty?:boolean;saving?:boolean}){
  const view=syncPresentation(sync,dirty,saving)
  return <div className="notebook-sync-details"><strong className="notebook-sync-line" data-state={view.state}><SyncSymbol {...view}/><span role="status">{t(view.label)}</span></strong>
    <p>{t(view.hint)}</p>
    {sync?.lastSuccessAt&&<small>{t('personalLastSync')} · {noteDateTime(sync.lastSuccessAt)}</small>}
    {view.state==='error'&&sync?.lastFailure&&<small>{t('syncLastAttempt')} · {noteDateTime(sync.lastFailure.at)}</small>}
  </div>
}
export const syncCss=`
.notebook-sync-line{display:flex;align-items:center;gap:6px}.notebook-sync-line[data-state=synced] svg{color:light-dark(#26834a,#80c995)}.notebook-sync-line[data-state=syncing] svg{animation:notebook-spin 1s linear infinite}@keyframes notebook-spin{to{transform:rotate(360deg)}}
.notebook-sync-details{font-size:13px;line-height:1.6}.notebook-sync-details p{margin:7px 0;color:var(--dsw-alias-label-secondary)}.notebook-sync-details small{display:block;color:var(--dsw-alias-label-secondary);font-size:12px}
.notebook-sync-anchor{position:relative}.notebook-sync-popover{position:absolute;right:0;top:100%;padding-top:8px;width:280px;max-width:calc(100vw - 40px);z-index:60}.notebook-sync-card{white-space:normal;padding:15px 17px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 8px 28px #0002;color:var(--dsw-alias-label-primary)}.notebook-sync-card footer{display:flex;gap:10px;margin-top:12px}.notebook-sync-card footer button{font-size:12px}
`
