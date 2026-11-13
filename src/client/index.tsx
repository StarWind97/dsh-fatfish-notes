import {TransferProgress} from './TransferProgress.js'
import * as React from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import {bindLibraryLifecycle} from './library-lifecycle.js'
import {NotesWorkspace} from './workspace.js'
import { NotesPage } from './NotesPage.js'
import { notebookSync } from './notebook-sync.js'
import { NotesController } from './notes-controller.js'
import { SettingsPage } from './SettingsPage.js'
import { Boundary } from './Boundary.js'
import { dictionaries, NS } from './locale.js'
import { NoteCaptureBridge } from './note-capture-bridge.js'
import { NoteCaptureAction, NoteCaptureOverlay } from './NoteCapture.js'
import { NoteTurnCheckbox, NoteCaptureDock } from './CaptureInline.js'
import {ConversationNotes} from './ConversationNotes.js'
import {BookOpen} from 'lucide-react'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { captureCss } from './capture-style.js'

export const name = NS
export const inject = ['slots','locale','layout','sidebarRight','sidebarRightTabs']
export function apply(ctx:Context): void {
  const kind=`${NS}-conversation`
  notebookSync.start()
  ctx.effect(()=>ctx.locale.register(NS,dictionaries),'notebook dictionaries')
  const t = ctx.locale.bind(NS)
  let storage: Storage | undefined
  try { storage = globalThis.localStorage } catch { /* browser policy may disable persistence */ }
  const workspace=new NotesWorkspace('embedded')
  const library = new NotesController(undefined,{editing:workspace,recoveryScope:workspace.recoveryScope,...(storage?{storage}:{}),onSettled:()=>{void notebookSync.request(true)}})
  workspace.bind(library);workspace.start()
  const notes = new NoteCaptureBridge(undefined, storage, async noteId => {
    ctx.layout.selectPanel(NS as MainPanelId)
    return library.open(noteId)
  })
  ctx.effect(()=>{
    const check=(event:Event)=>{const s=library.getSnapshot();if(s.dirty||s.saving||s.operation||library.importing)event.preventDefault()}
    const switched=()=>{notes.switched();library.switched()}
    window.addEventListener('fatfish-notes-before-reset',check)
    window.addEventListener('fatfish-notes-switched',switched)
    return()=>{window.removeEventListener('fatfish-notes-before-reset',check);window.removeEventListener('fatfish-notes-switched',switched)}
  },'notebook changes')
  ctx.effect(()=>{const unbind=bindLibraryLifecycle(library);return()=>{unbind();library.dispose();workspace.dispose();notebookSync.dispose()}},'notes library')
  ctx.effect(()=>()=>notes.dispose(),'note capture bridge')
  ctx.effect(()=>{
    const sheet=document.createElement('style')
    sheet.textContent=captureCss
    document.head.append(sheet)
    return ()=>sheet.remove()
  },'capture controls')
  ctx.effect(()=>ctx.slots.inject('shell.overlay',()=>ctx.slots.register({name:'shell.overlay',id:NS+'-progress',order:60,locale:NS},props=><TransferProgress bridge={notes} t={props.t}/>)),'file operation progress')
  ctx.effect(()=>ctx.sidebarRightTabs.register({id:kind,kind,title:()=>t('sessionNotes'),guide:[{id:kind,title:()=>t('sessionNotes'),description:()=>t('sessionPrivacy'),order:50}]}),'conversation notes tab')
  ctx.effect(()=>ctx.slots.inject('sidebar.right.pane.tab',()=>ctx.slots.register({name:'sidebar.right.pane.tab',key:kind,locale:NS},props=><Boundary t={props.t}><ConversationNotes key={props.sessionId} {...props} bridge={notes}/></Boundary>)),'conversation notes body')
  ctx.effect(()=>ctx.slots.inject('conversation.session.header.utilities',()=>ctx.slots.register({name:'conversation.session.header.utilities',id:kind,order:45,locale:NS},props=><button className="capture-action" title={props.t('sessionNotes')} aria-label={props.t('sessionNotes')} onClick={()=>ctx.sidebarRight.openTab(kind)}><BookOpen size={17}/></button>)),'conversation notes entry')
  ctx.effect(()=>ctx.slots.inject('sidebar.panellist',()=>ctx.slots.register({name:'sidebar.panellist',id:NS,order:35,label:()=>t('nav'),locale:NS},props=><svg width={props.size} height={props.size} viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M3 2h9a1 1 0 0 1 1 1v10H4a2 2 0 0 1-2-2V3a1 1 0 0 1 1-1Zm2 0v11"/></svg>)),'notebook sidebar')
  ctx.effect(()=>ctx.slots.inject('main',()=>ctx.slots.register({name:'main',key:NS,locale:NS},props=><Boundary t={props.t}><SettingsPage t={props.t}><NotesPage t={props.t} controller={library} workspace={workspace}/></SettingsPage></Boundary>)),'notebook panel')
  ctx.effect(()=>ctx.slots.inject('conversation.chat.assistant-actions',()=>ctx.slots.register({name:'conversation.chat.assistant-actions',id:`${NS}-save`,order:35,locale:NS,inject:sessionId=>({sessionId,notes})},props=><NoteCaptureAction sessionId={props.sessionId} bridge={props.notes} openSetup={()=>ctx.layout.selectPanel(NS as MainPanelId)} messageId={props.messageId} t={props.t}/>)),'note reply action')
  ctx.effect(()=>ctx.slots.inject('conversation.chat.turnTail',()=>ctx.slots.register({name:'conversation.chat.turnTail',id:`${NS}-pick-turn`,order:35,locale:NS,inject:sessionId=>({sessionId,notes})},props=>props.turn.status==='closed' ? <NoteTurnCheckbox sessionId={props.sessionId} bridge={props.notes} seq={props.seq} t={props.t}/> : null)),'in-chat turn selection')
  ctx.effect(()=>ctx.slots.inject('conversation.input.dock',()=>ctx.slots.register({name:'conversation.input.dock',id:`${NS}-selection`,order:35,locale:NS,inject:sessionId=>({sessionId,notes})},props=><NoteCaptureDock sessionId={props.sessionId} bridge={props.notes} t={props.t}/>)),'in-chat selection bar')
  ctx.effect(()=>ctx.slots.inject('conversation.input.overlay',()=>ctx.slots.register({name:'conversation.input.overlay',id:`${NS}-capture`,order:35,locale:NS,inject:sessionId=>({sessionId,notes})},props=><Boundary t={props.t}><NoteCaptureOverlay sessionId={props.sessionId} bridge={props.notes} t={props.t}/></Boundary>)),'note capture selection')
  ctx.effect(()=>ctx.slots.inject('settings.section',()=>ctx.slots.register({name:'settings.section',id:NS,order:60,label:()=>t('settings'),locale:NS},props=><Boundary t={props.t}><SettingsPage t={props.t}/></Boundary>)),'notebook settings')
}
