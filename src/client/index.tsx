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
import { NotesPage } from './NotesPage.js'
import { notebookSync } from './notebook-sync.js'
import { NotesController } from './notes-controller.js'
import { SettingsPage } from './SettingsPage.js'
import { Boundary } from './Boundary.js'
import { dictionaries, NS } from './locale.js'
import { NoteCaptureBridge } from './note-capture-bridge.js'
import { NoteCaptureAction, NoteCaptureOverlay } from './NoteCapture.js'
import { NoteTurnCheckbox, NoteCaptureDock } from './CaptureInline.js'
import { captureCss } from './capture-style.js'

export const name = NS
export const inject = ['slots','locale','layout']
export function apply(ctx:Context): void {
  notebookSync.start()
  ctx.effect(()=>ctx.locale.register(NS,dictionaries),'notebook dictionaries')
  const t = ctx.locale.bind(NS)
  let storage: Storage | undefined
  try { storage = globalThis.localStorage } catch { /* browser policy may disable persistence */ }
  const library = new NotesController(undefined,{...(storage?{storage}:{}),onSettled:()=>{void notebookSync.request(true)}})
  const notes = new NoteCaptureBridge(undefined, storage, async noteId => {
    ctx.layout.selectPanel(NS as MainPanelId)
    return library.open(noteId)
  })
  const warnUnsaved = (event: BeforeUnloadEvent) => { if (library.needsExitWarning) { event.preventDefault(); event.returnValue = '' } }
  ctx.effect(()=>{
    const check=(event:Event)=>{const s=library.getSnapshot();if(s.dirty||s.saving||s.operation||library.importing)event.preventDefault()}
    const switched=()=>{notes.switched();library.switched()}
    window.addEventListener('fatfish-notes-before-reset',check)
    window.addEventListener('fatfish-notes-switched',switched)
    return()=>{window.removeEventListener('fatfish-notes-before-reset',check);window.removeEventListener('fatfish-notes-switched',switched)}
  },'notebook changes')
  ctx.effect(() => {
    let away=false,focusTimer:ReturnType<typeof setTimeout>|undefined
    const blur=()=>{away=!library.imagePickerOpen;void library.flush()}
    const focus=()=>{if(away){away=false;focusTimer=setTimeout(()=>{void library.leave()},100)}}
    const hide=()=>{void library.leave()}
    const visibility=()=>{if(document.visibilityState==='hidden'&&!library.imagePickerOpen)hide()}
    document.addEventListener('visibilitychange',visibility)
    globalThis.addEventListener('beforeunload',warnUnsaved)
    globalThis.addEventListener('pagehide',hide)
    globalThis.addEventListener('blur',blur)
    globalThis.addEventListener('focus',focus)
    return()=>{clearTimeout(focusTimer);document.removeEventListener('visibilitychange',visibility);globalThis.removeEventListener('beforeunload',warnUnsaved);globalThis.removeEventListener('pagehide',hide);globalThis.removeEventListener('blur',blur);globalThis.removeEventListener('focus',focus);library.dispose();notebookSync.dispose()}
  },'notes library')
  ctx.effect(()=>()=>notes.dispose(),'note capture bridge')
  ctx.effect(()=>{
    const sheet=document.createElement('style')
    sheet.textContent=captureCss
    document.head.append(sheet)
    return ()=>sheet.remove()
  },'capture controls')
  ctx.effect(()=>ctx.slots.inject('sidebar.panellist',()=>ctx.slots.register({name:'sidebar.panellist',id:NS,order:35,label:()=>t('nav'),locale:NS},props=><svg width={props.size} height={props.size} viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M3 2h9a1 1 0 0 1 1 1v10H4a2 2 0 0 1-2-2V3a1 1 0 0 1 1-1Zm2 0v11"/></svg>)),'notebook sidebar')
  ctx.effect(()=>ctx.slots.inject('main',()=>ctx.slots.register({name:'main',key:NS,locale:NS},props=><Boundary t={props.t}><SettingsPage t={props.t}><NotesPage t={props.t} controller={library}/></SettingsPage></Boundary>)),'notebook panel')
  ctx.effect(()=>ctx.slots.inject('conversation.chat.assistant-actions',()=>ctx.slots.register({name:'conversation.chat.assistant-actions',id:`${NS}-save`,order:35,locale:NS,inject:sessionId=>({sessionId,notes})},props=><NoteCaptureAction sessionId={props.sessionId} bridge={props.notes} openSetup={()=>ctx.layout.selectPanel(NS as MainPanelId)} messageId={props.messageId} t={props.t}/>)),'note reply action')
  ctx.effect(()=>ctx.slots.inject('conversation.chat.assistant-actions',()=>ctx.slots.register({name:'conversation.chat.assistant-actions',id:`${NS}-export`,order:36,locale:NS,inject:sessionId=>({sessionId,notes})},props=><NoteCaptureAction exporting sessionId={props.sessionId} bridge={props.notes} openSetup={()=>ctx.layout.selectPanel(NS as MainPanelId)} messageId={props.messageId} t={props.t}/>)),'conversation export action')
  ctx.effect(()=>ctx.slots.inject('conversation.chat.turnTail',()=>ctx.slots.register({name:'conversation.chat.turnTail',id:`${NS}-pick-turn`,order:35,locale:NS,inject:sessionId=>({sessionId,notes})},props=>props.turn.status==='closed' ? <NoteTurnCheckbox sessionId={props.sessionId} bridge={props.notes} seq={props.seq} t={props.t}/> : null)),'in-chat turn selection')
  ctx.effect(()=>ctx.slots.inject('conversation.input.dock',()=>ctx.slots.register({name:'conversation.input.dock',id:`${NS}-selection`,order:35,locale:NS,inject:sessionId=>({sessionId,notes})},props=><NoteCaptureDock sessionId={props.sessionId} bridge={props.notes} t={props.t}/>)),'in-chat selection bar')
  ctx.effect(()=>ctx.slots.inject('conversation.input.overlay',()=>ctx.slots.register({name:'conversation.input.overlay',id:`${NS}-capture`,order:35,locale:NS,inject:sessionId=>({sessionId,notes})},props=><Boundary t={props.t}><NoteCaptureOverlay sessionId={props.sessionId} bridge={props.notes} t={props.t}/></Boundary>)),'note capture selection')
  ctx.effect(()=>ctx.slots.inject('settings.section',()=>ctx.slots.register({name:'settings.section',id:NS,order:60,label:()=>t('settings'),locale:NS},props=><Boundary t={props.t}><SettingsPage t={props.t}/></Boundary>)),'notebook settings')
}
