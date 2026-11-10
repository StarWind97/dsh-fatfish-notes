import * as React from 'react'
import {useEffect,useState} from 'react'
import type {NoteListItem,NoteSelection} from '../contracts/notes.js'
import type {NotesController,NotesState} from './notes-controller.js'
import type {T} from './locale.js'
import {PaperDialog} from './paper/PaperDialog.js'
import {TagSuggestions,operationError} from './NoteTools.js'

export function useNoteSelection(controller:NotesController,state:NotesState,t:T) {
  const [selecting,setSelecting]=useState(false),[selected,setSelected]=useState<NoteListItem[]>([])
  const [confirm,setConfirm]=useState<{notes:NoteSelection[];purge:boolean}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const [undo,setUndo]=useState<NoteSelection[]>([])
  const [organize,setOrganize]=useState<'move'|'add-tags'|'remove-tags'|null>(null),[book,setBook]=useState(''),[tags,setTags]=useState('')
  useEffect(()=>{setSelected([]);setSelecting(false)},[state.filter,state.section])
  function toggle(item:NoteListItem){setSelected(items=>items.some(n=>n.noteId===item.noteId)?items.filter(n=>n.noteId!==item.noteId):[...items,item])}
  async function all(clear=false){setBusy(true);setError('');try{const items=await controller.matching(clear?{status:'trashed'}:state.filter);if(clear)setConfirm({notes:items.map(n=>({noteId:n.noteId,expectedHeads:n.heads})),purge:true});else setSelected(items)}catch{setError(t('notesListFailed'))}finally{setBusy(false)}}
  async function run(){if(!confirm)return;setBusy(true);setError('');const request=confirm
    try{if(!await controller.batch(request.notes,request.purge?'purge':'trash')){setError(controller.getSnapshot().error==='note_edit_busy'?t('windowBatchBusy',{count:controller.occupiedCount||1}):t('batchChanged'));return}
      if(!request.purge){const ids=new Set(request.notes.map(n=>n.noteId));setUndo((await controller.matching({status:'trashed'})).filter(n=>ids.has(n.noteId)).map(n=>({noteId:n.noteId,expectedHeads:n.heads})))}
      setConfirm(null);setSelected([]);setSelecting(false)
    }catch{setError(t('batchChanged'))}finally{setBusy(false)}}
  async function arrange(){if(!organize)return;setBusy(true);setError('');try{
    const result=await controller.manage({notes:selected.map(n=>({noteId:n.noteId,expectedHeads:n.heads})),action:organize,...(organize==='move'?{notebookId:book}:{tags:tags.split(/[,，\n]/).map(v=>v.trim()).filter(Boolean)})})
    if(result){setOrganize(null);setSelected([]);setSelecting(false)}else setError(operationError(controller,t))
  }finally{setBusy(false)}}
  const controls=<div className="paper-batch">
    {selecting?<><span>{t('batchSelected',{count:selected.length})}</span><button disabled={busy} onClick={()=>void all()}>{t('batchAll')}</button><button disabled={!selected.length||busy||state.operation} onClick={()=>setConfirm({notes:selected.map(n=>({noteId:n.noteId,expectedHeads:n.heads})),purge:state.filter.status==='trashed'})}>{t(state.filter.status==='trashed'?'batchPurge':'notesTrashAction')}</button><button disabled={busy} onClick={()=>{setSelecting(false);setSelected([])}}>{t('cancel')}</button></>:<button disabled={busy} onClick={()=>setSelecting(true)}>{t('batchSelect')}</button>}
    {selecting&&state.filter.status!=='trashed'&&<select aria-label={t('organizeBatch')} value="" disabled={!selected.length||busy||state.operation} onChange={e=>{setError('');setBook(state.notebooks.find(b=>b.isDefault)?.notebookId??'');setTags('');setOrganize(e.target.value as 'move'|'add-tags'|'remove-tags')}}><option value="">{t('organizeBatch')}</option>{!state.filter.templates&&<option value="move">{t('organizeMove')}</option>}<option value="add-tags">{t('organizeAddTags')}</option><option value="remove-tags">{t('organizeRemoveTags')}</option></select>}
    {!selecting&&state.filter.status==='trashed'&&<button disabled={busy} onClick={()=>void all(true)}>{t('batchEmpty')}</button>}
    {!!undo.length&&<button disabled={busy} onClick={async()=>{setBusy(true);if(await controller.batch(undo,'restore'))setUndo([]);else setError(t('batchChanged'));setBusy(false)}}>{t('paperUndoMove')}</button>}
    {error&&!confirm&&!organize&&<p role="alert">{error}</p>}
  </div>
  const dialog=organize?<PaperDialog title={t(organize==='move'?'organizeMove':organize==='add-tags'?'organizeAddTags':'organizeRemoveTags')} closeLabel={t('paperClose')} onClose={()=>{setOrganize(null);setError('')}} locked={busy}><div className="paper-dialog-content paper-reuse-fields"><p>{t('batchSelected',{count:selected.length})}</p>{organize==='move'?<label>{t('notesNotebook')}<select value={book} disabled={busy} onChange={e=>setBook(e.target.value)}>{state.notebooks.filter(b=>b.current.status==='active').map(b=><option key={b.notebookId} value={b.notebookId}>{b.current.title}</option>)}</select></label>:<><label>{t('notesTag')}<input disabled={busy} placeholder={t('organizeTagHint')} value={tags} onChange={e=>setTags(e.target.value)}/></label><TagSuggestions value="" selected={tags.split(/[,，]/).map(v=>v.trim())} choose={tag=>setTags(v=>v?v+', '+tag:tag)} t={t}/><p className="paper-hint">{t('organizeTagKeep')}</p></>}{error&&<p role="alert">{error}</p>}</div><footer><button disabled={busy} onClick={()=>{setOrganize(null);setError('')}}>{t('cancel')}</button><button className="paper-primary" disabled={busy||!(organize==='move'?book:tags.trim())} onClick={()=>void arrange()}>{t('organizeApply')}</button></footer></PaperDialog>:confirm&&<PaperDialog title={t(confirm.purge?'batchPurge':'notesTrashAction')} closeLabel={t('paperClose')} onClose={()=>{setConfirm(null);setError('')}} locked={busy}><div className="paper-dialog-content">
    <p>{t(confirm.purge?'batchPurgeConfirm':'batchTrashConfirm',{count:confirm.notes.length})}</p>
    {confirm.purge&&<p className="paper-hint">{t('batchHistory')}</p>}{error&&<p role="alert">{error}</p>}
  </div><footer><button disabled={busy} onClick={()=>setConfirm(null)}>{t('cancel')}</button><button className={confirm.purge?'paper-danger':'paper-primary'} disabled={busy||!confirm.notes.length} onClick={()=>void run()}>{t(busy?'loading':confirm.purge?'batchPurge':'notesTrashAction')}</button></footer></PaperDialog>
  return {selecting,selected,toggle,controls,dialog,purge:(note:NoteSelection)=>setConfirm({notes:[note],purge:true})}
}
