import type {NotesController} from './notes-controller.js'
/** App switching only checkpoints. Actual panel departure and page unload finish the edit. */
export function bindLibraryLifecycle(library:NotesController){
  const blur=()=>{void library.flush()}
  const hide=()=>{void library.leave()}
  const visibility=()=>{if(document.visibilityState==='hidden')blur()}
  const warn=(event:BeforeUnloadEvent)=>{if(library.needsExitWarning){event.preventDefault();event.returnValue=''}}
  document.addEventListener('visibilitychange',visibility)
  window.addEventListener('blur',blur)
  window.addEventListener('pagehide',hide);window.addEventListener('beforeunload',warn)
  return()=>{document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',blur);window.removeEventListener('pagehide',hide);window.removeEventListener('beforeunload',warn)}
}
