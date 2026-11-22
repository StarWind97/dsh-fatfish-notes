import {appearancePreferences} from './appearance-sync.js'
import './paper/appearance-boot.js'
import {TransferProgress} from './TransferProgress.js'
import * as React from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
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
import { dictionaries, NS, translator } from './locale.js'
import {resolveLanguage} from '../domain/localization.js'
import { NoteCaptureBridge } from './note-capture-bridge.js'
import { NoteCaptureAction, NoteCaptureOverlay } from './NoteCapture.js'
import { NoteTurnCheckbox, NoteCaptureDock } from './CaptureInline.js'
import {ConversationNotes} from './ConversationNotes.js'
import {BrandMark} from './Brand.js'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { captureCss } from './capture-style.js'

export const name = NS
export const inject = ['slots','locale','layout','sidebarRight','sidebarRightTabs','theme']
export function apply(ctx:Context): void {
  const kind=`${NS}-conversation`
  const toggleDshTheme = () => {
    const scheme = ctx.theme.getTheme().active.colorScheme
    ctx.theme.setTheme(scheme === 'dark' ? 'light' : 'dark')
  }
  notebookSync.start()
  ctx.effect(()=>ctx.locale.register(NS,dictionaries),'notebook dictionaries')
  const getT = () => translator(resolveLanguage(ctx.locale.getSnapshot().active))
  let storage: Storage | undefined
  try { storage = globalThis.localStorage } catch { /* browser policy may disable persistence */ }
  const workspace=new NotesWorkspace('embedded')
  const library = new NotesController(undefined,{startTab:'overview',editing:workspace,recoveryScope:workspace.recoveryScope,...(storage?{storage}:{}),onSettled:()=>{void notebookSync.request(true)}})
  workspace.bind(library);workspace.start()
  ctx.effect(()=>appearancePreferences.start('embedded',workspace.api,()=>workspace.ready()),'shared appearance')
  const notes = new NoteCaptureBridge(undefined, storage, async noteId => {
    ctx.layout.selectPanel(NS as MainPanelId)
    return library.open(noteId)
  })
  ctx.effect(()=>{
    const check=(event:Event)=>{const s=library.getSnapshot();if(s.dirty||s.saving||s.operation||library.importing)event.preventDefault()}
    const switched=()=>{notes.switched();library.switched()}
    const handbook=(event:Event)=>{const noteId=(event as CustomEvent<{noteId:string}>).detail.noteId;ctx.layout.selectPanel(NS as MainPanelId);void library.refresh().then(async()=>{if(await library.open(noteId))await library.revealCurrent(noteId)})}
    window.addEventListener('fatfish-notes-open-handbook',handbook)
    window.addEventListener('fatfish-notes-before-reset',check)
    window.addEventListener('fatfish-notes-switched',switched)
    return()=>{window.removeEventListener('fatfish-notes-before-reset',check);window.removeEventListener('fatfish-notes-switched',switched);window.removeEventListener('fatfish-notes-open-handbook',handbook)}
  },'notebook changes')
  ctx.effect(()=>{const unbind=bindLibraryLifecycle(library);return()=>{unbind();library.dispose();workspace.dispose();notebookSync.dispose()}},'notes library')
  ctx.effect(()=>()=>notes.dispose(),'note capture bridge')
  ctx.effect(()=>{
    const sheet=document.createElement('style')
    sheet.textContent=captureCss
    document.head.append(sheet)
    return ()=>sheet.remove()
  },'capture controls')
  ctx.effect(()=>ctx.slots.inject('shell.overlay',()=>ctx.slots.register({name:'shell.overlay',id:NS+'-progress',order:60,locale:NS},()=><TransferProgress bridge={notes} t={getT()}/>)),'file operation progress')
  ctx.effect(()=>ctx.sidebarRightTabs.register({id:kind,kind,title:()=>getT()('sessionNotes'),guide:[{id:kind,title:()=>getT()('sessionNotes'),description:()=>getT()('sessionPrivacy'),order:50}]}),'conversation notes tab')
  ctx.effect(()=>ctx.slots.inject('sidebar.right.pane.tab.title',()=>ctx.slots.register({name:'sidebar.right.pane.tab.title',key:kind,locale:NS},()=>getT()('sessionNotes'))),'conversation notes tab title')
  ctx.effect(()=>ctx.slots.inject('sidebar.right.pane.tab',()=>ctx.slots.register({name:'sidebar.right.pane.tab',key:kind,locale:NS},props=><Boundary t={getT()}><ConversationNotes key={props.sessionId} {...props} bridge={notes} t={getT()}/></Boundary>)),'conversation notes body')
  ctx.effect(()=>ctx.slots.inject('conversation.session.header.utilities',()=>ctx.slots.register({name:'conversation.session.header.utilities',id:kind,order:45,locale:NS},()=>{
    const label=getT()('sessionNotes')
    return <button className="capture-action" title={label} aria-label={label} onClick={()=>ctx.sidebarRight.openTab(kind)}><BrandMark size={17}/></button>
  })),'conversation notes entry')
  ctx.effect(()=>ctx.slots.inject('sidebar.panellist',()=>ctx.slots.register({name:'sidebar.panellist',id:NS,order:35,label:()=>getT()('nav'),locale:NS},props=><BrandMark size={props.size}/>)),'notebook sidebar')
  ctx.effect(()=>ctx.slots.inject('main',()=>ctx.slots.register({name:'main',key:NS,locale:NS},()=>{
    const t=getT()
    return <Boundary t={t}><SettingsPage t={t}><NotesPage t={t} controller={library} workspace={workspace} surface="embedded" onToggleDshTheme={toggleDshTheme}/></SettingsPage></Boundary>
  })),'notebook panel')
  ctx.effect(()=>ctx.slots.inject('conversation.chat.assistant-actions',()=>ctx.slots.register({name:'conversation.chat.assistant-actions',id:`${NS}-save`,order:35,locale:NS,inject:sessionId=>({sessionId,notes})},props=><NoteCaptureAction sessionId={props.sessionId} bridge={props.notes} openSetup={()=>ctx.layout.selectPanel(NS as MainPanelId)} messageId={props.messageId} t={getT()}/>)),'note reply action')
  ctx.effect(()=>ctx.slots.inject('conversation.chat.turnTail',()=>ctx.slots.register({name:'conversation.chat.turnTail',id:`${NS}-pick-turn`,order:35,locale:NS,inject:sessionId=>({sessionId,notes})},props=>props.turn.status==='closed' ? <NoteTurnCheckbox sessionId={props.sessionId} bridge={props.notes} seq={props.seq} t={getT()}/> : null)),'in-chat turn selection')
  ctx.effect(()=>ctx.slots.inject('conversation.input.dock',()=>ctx.slots.register({name:'conversation.input.dock',id:`${NS}-selection`,order:35,locale:NS,inject:sessionId=>({sessionId,notes})},props=><NoteCaptureDock sessionId={props.sessionId} bridge={props.notes} t={getT()}/>)),'in-chat selection bar')
  ctx.effect(()=>ctx.slots.inject('conversation.input.overlay',()=>ctx.slots.register({name:'conversation.input.overlay',id:`${NS}-capture`,order:35,locale:NS,inject:sessionId=>({sessionId,notes})},props=><Boundary t={getT()}><NoteCaptureOverlay sessionId={props.sessionId} bridge={props.notes} t={getT()}/></Boundary>)),'note capture selection')
  ctx.effect(()=>ctx.slots.inject('settings.section',()=>ctx.slots.register({name:'settings.section',id:NS,order:60,label:()=>getT()('settings'),locale:NS},()=><Boundary t={getT()}><SettingsPage t={getT()}/></Boundary>)),'notebook settings')
}
