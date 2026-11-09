import * as React from 'react'
import {useSyncExternalStore} from 'react'
import {ExternalLink,X} from 'lucide-react'
import type {NotesWorkspace} from './workspace.js'
import type {T} from './locale.js'

export function WindowButton({workspace,t}:{workspace:NotesWorkspace;t:T}){
  const s=useSyncExternalStore(workspace.subscribe,workspace.getSnapshot)
  if(workspace.surface!=='embedded'||!s.server?.available)return null
  return <button disabled={s.message==='windowOpening'} title={t('windowOpen')} aria-label={t('windowOpen')} onClick={()=>void workspace.open()}><ExternalLink size={17}/></button>
}
export function WorkspaceNotice({workspace,t}:{workspace:NotesWorkspace;t:T}){
  const s=useSyncExternalStore(workspace.subscribe,workspace.getSnapshot),server=s.server
  const h=server?.handoff,command=server?.command
  const owner=server?.owner
  const disconnected=!s.connected&&s.registered
  const content=s.busy?t('windowSavingHandoff'):h?t(h.incoming?'windowAwaitInput':'windowAwaitHandoff'):disconnected?t(s.restart?'windowRestart':'windowOffline'):s.message?t(s.message as Parameters<T>[0]):owner?t(owner==='embedded'?'windowOwnerEmbedded':'windowOwnerStandalone'):null
  return <>{content&&<aside className="paper-window-notice" role="status"><span>{content}</span>
    {h&&!s.busy&&<button onClick={()=>void workspace.cancel()}>{t('cancel')}</button>}
    {owner&&!h&&!disconnected&&<button onClick={()=>void workspace.handoff()}>{t('windowContinueHere')}</button>}
    {s.message==='windowLeaseLost'&&!disconnected&&<button onClick={()=>void workspace.resume()}>{t('windowRecover')}</button>}
    {s.restart&&<button onClick={()=>location.reload()}>{t('refresh')}</button>}
    {s.message&&!disconnected&&!h&&!owner&&s.message!=='windowLeaseLost'&&<button aria-label={t('cancel')} onClick={()=>workspace.dismiss()}><X size={14}/></button>}
  </aside>}
  {command&&workspace.surface==='standalone'&&<aside className="paper-window-notice" role="status"><span>{t('windowSwitchRequested')}</span><button onClick={()=>void workspace.openCommand(true)}>{t('windowSaveSwitch')}</button><button onClick={()=>void workspace.openCommand(false)}>{t('windowKeepHere')}</button></aside>}
  <style>{`.paper-window-notice{display:flex;flex:0 0 auto;align-items:center;flex-wrap:wrap;gap:8px 12px;padding:10px 24px;background:var(--shelf);border-bottom:1px solid var(--rule);font-size:13px}.paper-window-notice span{flex:1;min-width:180px}.paper-window-notice button{font:inherit;color:inherit;background:transparent;border:1px solid var(--rule);border-radius:5px;padding:4px 8px;cursor:pointer}`}</style></>
}
