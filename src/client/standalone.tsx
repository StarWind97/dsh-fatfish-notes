import {appearancePreferences} from './appearance-sync.js'
import './paper/appearance-boot.js'
import {TransferProgress} from './TransferProgress.js'
import * as React from 'react'
import {createRoot} from 'react-dom/client'
import {NotesPage} from './NotesPage.js'
import {NotesController} from './notes-controller.js'
import {bindLibraryLifecycle} from './library-lifecycle.js'
import {NotesWorkspace} from './workspace.js'
import {SettingsPage} from './SettingsPage.js'
import {Boundary} from './Boundary.js'
import {translate} from './locale.js'
import {notebookSync} from './notebook-sync.js'

const workspace=new NotesWorkspace('standalone')
const library=new NotesController(undefined,{startTab:'overview',editing:workspace,recoveryScope:workspace.recoveryScope,onSettled:()=>{void notebookSync.request(true)}})
workspace.bind(library);workspace.start();notebookSync.start()
const stopAppearance=appearancePreferences.start('standalone',workspace.api,()=>workspace.ready())
window.addEventListener('pagehide',stopAppearance)
bindLibraryLifecycle(library)
window.addEventListener('fatfish-notes-before-reset',event=>{const s=library.getSnapshot();if(s.dirty||s.saving||s.operation||library.importing)event.preventDefault()})
window.addEventListener('fatfish-notes-switched',()=>location.reload())
window.addEventListener('fatfish-notes-open-handbook',event=>{const noteId=(event as CustomEvent<{noteId:string}>).detail.noteId;void library.refresh().then(async()=>{if(await library.open(noteId))await library.revealCurrent(noteId)})})
createRoot(document.getElementById('app')!).render(<Boundary t={translate}><SettingsPage t={translate}><NotesPage controller={library} workspace={workspace} surface="standalone" t={translate}/></SettingsPage><TransferProgress t={translate}/></Boundary>)
