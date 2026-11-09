import type {NotesController} from './notes-controller.js'
/** Both surfaces save on departure; focus must not finish a newly started edit. */
export function bindLibraryLifecycle(library:NotesController){
  let awayNote:string|null=null
  const blur=()=>{const s=library.getSnapshot();awayNote=s.editing&&!library.imagePickerOpen?s.noteId:null;void library.flush()}
  const focus=()=>{const id=awayNote;awayNote=null;if(id&&library.getSnapshot().editing&&library.getSnapshot().noteId===id)void library.leave()}
  const hide=()=>{void library.leave()}
  const visibility=()=>{if(document.visibilityState==='hidden'&&!library.imagePickerOpen)hide()}
  const warn=(event:BeforeUnloadEvent)=>{if(library.needsExitWarning){event.preventDefault();event.returnValue=''}}
  document.addEventListener('visibilitychange',visibility)
  window.addEventListener('blur',blur);window.addEventListener('focus',focus)
  window.addEventListener('pagehide',hide);window.addEventListener('beforeunload',warn)
  return()=>{document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',blur);window.removeEventListener('focus',focus);window.removeEventListener('pagehide',hide);window.removeEventListener('beforeunload',warn)}
}
