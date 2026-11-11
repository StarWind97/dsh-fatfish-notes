import * as React from 'react'
import type {PropsRuntime} from '@deepseek-ai/dsh-client-ui-slots'
import type {InputState} from '@deepseek-ai/dsh-client-ui-conversation/client'
import {Quote,LoaderCircle} from 'lucide-react'
import type {NotesController} from './notes-controller.js'
import {PaperDialog} from './paper/PaperDialog.js'
import {NoteMaterialChoices,noteMaterials} from './NoteMaterialChoices.js'
import type {T} from './locale.js'
export function NoteReference({controller,inputActions,useInput,sessionId,visible,t}:{controller:NotesController;visible:boolean;t:T}&Pick<PropsRuntime<'sidebar.right.pane.tab'>,'inputActions'|'useInput'|'sessionId'>){
  const input=useInput((s:InputState)=>s),[open,setOpen]=React.useState(false),[busy,setBusy]=React.useState(false),[message,setMessage]=React.useState(''),[selected,setSelected]=React.useState<string[]>([])
  const active=React.useRef<AbortController|null>(null),current=React.useRef({visible,sessionId});current.current={visible,sessionId}
  React.useEffect(()=>()=>active.current?.abort(),[])
  React.useEffect(()=>{if(!visible){active.current?.abort();setOpen(false)}},[visible])
  async function prepare(){if(!inputActions)return;setMessage('');const s=controller.getSnapshot();setSelected(noteMaterials(s.note?.current).map(m=>m.id));setOpen(true)}
  async function run(){
    if(!inputActions||!input)return
    const span=inputActions.captureInsertion(),at={...span,start:span.end},abort=new AbortController();active.current=abort;setBusy(true);let taskId:string|undefined;let heartbeat:ReturnType<typeof setInterval>|undefined
    try{
      const frozen=await controller.freezeExport();if(!frozen)throw Error('save')
      taskId=(await controller.api('/notes/import-task',{action:'begin'},abort.signal)).taskId
      heartbeat=setInterval(()=>{if(taskId)void controller.api('/notes/import-task',{action:'heartbeat',taskId}).catch(()=>abort.abort())},20000)
      const result=await controller.api('/notes/reference',{sessionId,noteId:frozen.note.noteId,revision:frozen.note.current.revision,assetIds:frozen.note.current.assetIds.filter(id=>selected.includes('image:'+id)),attachmentIds:(frozen.note.current.attachments??[]).filter(a=>selected.includes('file:'+a.id)).map(a=>a.id)},abort.signal)
      abort.signal.throwIfAborted()
      if(!current.current.visible||current.current.sessionId!==sessionId||!frozen.isCurrent()||!inputActions.insertText(result.instruction,at)){setMessage(t('referenceChanged'));return}
      inputActions.persistDraft();setMessage(t('referenceInserted'));setOpen(false)
    }catch{if(!abort.signal.aborted)setMessage(t('referenceFailed'))}finally{clearInterval(heartbeat);if(taskId)await controller.api('/notes/import-task',{action:'end',taskId}).catch(()=>{});if(active.current===abort){active.current=null;setBusy(false)}}
  }
  function close(){active.current?.abort();setOpen(false)}
  return <><div className="conversation-reference"><button disabled={!inputActions||!input||input.phase!=='plain'||busy} onClick={()=>void prepare()}><Quote size={15}/>{t('referenceTitle')}</button>{message&&<p role="status">{message}</p>}</div>{open&&<PaperDialog title={t('referenceTitle')} closeLabel={t('paperClose')} onClose={close}><div className="paper-dialog-content"><p>{t('referenceHint')}</p><NoteMaterialChoices rows={noteMaterials(controller.getSnapshot().note?.current)} selected={selected} change={setSelected} disabled={busy} t={t}/>{busy&&<p role="status"><LoaderCircle size={16}/>{t('referencePreparing')}</p>}{message&&<p role="alert">{message}</p>}</div><footer><button onClick={close}>{t('cancel')}</button><button className="paper-primary" disabled={busy} onClick={()=>void run()}>{t('referenceInsert')}</button></footer></PaperDialog>}</>
}
