import type {KeyboardEvent} from 'react'

/** Reading navigation belongs to this scroll pane, never to inputs or menus. */
export function readingKey(event:KeyboardEvent<HTMLElement>,editing:boolean):void {
  if(editing||event.defaultPrevented||event.nativeEvent.isComposing||event.altKey||event.shiftKey||event.metaKey)return
  if(!['Home','End','PageUp','PageDown'].includes(event.key)||(event.ctrlKey&&!['Home','End'].includes(event.key)))return
  if((event.target as HTMLElement).closest('input,textarea,select,[contenteditable=true],.cm-editor,dialog,[role=menu],[role=listbox]'))return
  const pane=event.currentTarget,step=Math.max(40,pane.clientHeight-48)
  const top=event.key==='Home'?0:event.key==='End'?pane.scrollHeight:pane.scrollTop+(event.key==='PageDown'?step:-step)
  event.preventDefault();pane.scrollTo({top,behavior:'instant'})
}
