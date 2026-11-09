import * as React from 'react'
import {useEffect,useState} from 'react'
import type {NoteListItem,NoteSelection} from '../contracts/notes.js'
import type {NotesController,NotesState} from './notes-controller.js'
import type {T} from './locale.js'
import {PaperDialog} from './paper/PaperDialog.js'

export function useNoteSelection(controller:NotesController,state:NotesState,t:T) {
  const [selecting,setSelecting]=useState(false),[selected,setSelected]=useState<NoteListItem[]>([])
  const [confirm,setConfirm]=useState<{notes:NoteSelection[];purge:boolean}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const [undo,setUndo]=useState<NoteSelection[]>([])
  useEffect(()=>{setSelected([]);setSelecting(false)},[state.filter,state.section])
  function toggle(item:NoteListItem){setSelected(items=>items.some(n=>n.noteId===item.noteId)?items.filter(n=>n.noteId!==item.noteId):[...items,item])}
  async function all(clear=false){setBusy(true);setError('');try{const items=await controller.matching(clear?{status:'trashed'}:state.filter);if(clear)setConfirm({notes:items.map(n=>({noteId:n.noteId,expectedHeads:n.heads})),purge:true});else setSelected(items)}catch{setError(t('notesListFailed'))}finally{setBusy(false)}}
  async function run(){if(!confirm)return;setBusy(true);setError('');const request=confirm
    try{if(!await controller.batch(request.notes,request.purge?'purge':'trash')){setError(controller.getSnapshot().error==='note_edit_busy'?t('windowBatchBusy',{count:controller.occupiedCount||1}):t('batchChanged'));return}
      if(!request.purge){const ids=new Set(request.notes.map(n=>n.noteId));setUndo((await controller.matching({status:'trashed'})).filter(n=>ids.has(n.noteId)).map(n=>({noteId:n.noteId,expectedHeads:n.heads})))}
      setConfirm(null);setSelected([]);setSelecting(false)
    }catch{setError(t('batchChanged'))}finally{setBusy(false)}}
  const controls=<div className="paper-batch">
    {selecting?<><span>{t('batchSelected',{count:selected.length})}</span><button disabled={busy} onClick={()=>void all()}>{t('batchAll')}</button><button disabled={!selected.length||busy||state.operation} onClick={()=>setConfirm({notes:selected.map(n=>({noteId:n.noteId,expectedHeads:n.heads})),purge:state.filter.status==='trashed'})}>{t(state.filter.status==='trashed'?'batchPurge':'notesTrashAction')}</button><button disabled={busy} onClick={()=>{setSelecting(false);setSelected([])}}>{t('cancel')}</button></>:<button disabled={busy} onClick={()=>setSelecting(true)}>{t('batchSelect')}</button>}
    {!selecting&&state.filter.status==='trashed'&&<button disabled={busy} onClick={()=>void all(true)}>{t('batchEmpty')}</button>}
    {!!undo.length&&<button disabled={busy} onClick={async()=>{setBusy(true);if(await controller.batch(undo,'restore'))setUndo([]);else setError(t('batchChanged'));setBusy(false)}}>{t('paperUndoMove')}</button>}
    {error&&!confirm&&<p role="alert">{error}</p>}
  </div>
  const dialog=confirm&&<PaperDialog title={t(confirm.purge?'batchPurge':'notesTrashAction')} closeLabel={t('paperClose')} onClose={()=>{setConfirm(null);setError('')}} locked={busy}><div className="paper-dialog-content">
    <p>{t(confirm.purge?'batchPurgeConfirm':'batchTrashConfirm',{count:confirm.notes.length})}</p>
    {confirm.purge&&<p className="paper-hint">{t('batchHistory')}</p>}{error&&<p role="alert">{error}</p>}
  </div><footer><button disabled={busy} onClick={()=>setConfirm(null)}>{t('cancel')}</button><button className={confirm.purge?'paper-danger':'paper-primary'} disabled={busy||!confirm.notes.length} onClick={()=>void run()}>{t(busy?'loading':confirm.purge?'batchPurge':'notesTrashAction')}</button></footer></PaperDialog>
  return {selecting,selected,toggle,controls,dialog,purge:(note:NoteSelection)=>setConfirm({notes:[note],purge:true})}
}
