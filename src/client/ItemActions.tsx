import * as React from 'react'
import {useEffect,useState} from 'react'
import type {NotebookView,NoteListItem,NoteSelection,NoteView} from '../contracts/notes.js'
import {noteContent,type NotesController,type NotesState} from './notes-controller.js'
import {currentRepository} from './api.js'
import type {RowAction} from './RowMenu.js'
import type {T} from './locale.js'
import {PaperDialog} from './paper/PaperDialog.js'
import {NoteExport} from './NoteExport.js'
import {LibraryTransfer} from './LibraryTransfer.js'
import {TransientNotice} from './TransientNotice.js'
import {operationError} from './NoteTools.js'
import {sameNamedNotebook,NOTEBOOK_NAME_TAKEN} from '../notes/notebooks.js'

type Edit={kind:'rename'|'move'|'trash'|'purge';note:NoteListItem}|{kind:'book-rename'|'book-remove';book:NotebookView}
/** Shared row actions keep the existing revision, edit-lease and deletion checks. */
export function useItemActions(controller:NotesController,state:NotesState,t:T,open:(id:string)=>Promise<unknown>,created?:()=>void){
  const [edit,setEdit]=useState<Edit|null>(null),[value,setValue]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[confirmed,setConfirmed]=useState(false)
  const [exporting,setExporting]=useState<{note:NoteView;repository:number|undefined}|null>(null),[exportBook,setExportBook]=useState<string|null>(null),[undo,setUndo]=useState<NoteSelection|null>(null)
  const duplicate=edit?.kind==='book-rename'&&!!sameNamedNotebook(state.notebooks,value,edit.book.notebookId)
  useEffect(()=>{setUndo(null)},[state.section,state.filter,state.noteId])
  function begin(next:Edit,text=''){setEdit(next);setValue(text);setError('');setConfirmed(false)}
  async function run(work:()=>Promise<boolean>){setBusy(true);setError('');try{if(await work()){setEdit(null);return true}setError(controller.getSnapshot().error==='notebook_name_taken'?NOTEBOOK_NAME_TAKEN:operationError(controller,t));return false}catch{setError(t('sessionOperationFailed'));return false}finally{setBusy(false)}}
  async function trash(note:NoteListItem,purge:boolean){const ok=await run(()=>controller.batch([{noteId:note.noteId,expectedHeads:note.heads}],purge?'purge':'trash'));if(ok&&!purge){const latest=await controller.api('/notes/get',{noteId:note.noteId});setUndo({noteId:note.noteId,expectedHeads:latest.note.heads})}}
  function noteActions(note:NoteListItem):RowAction[]{
    const notes=[{noteId:note.noteId,expectedHeads:note.heads}],locked=busy||state.operation
    if(note.status==='trashed')return [{label:t('notesRestore'),disabled:locked,run:()=>void run(()=>controller.batch(notes,'restore'))},{label:t('batchPurge'),disabled:locked,danger:true,run:()=>begin({kind:'purge',note})}]
    return [
      {label:'重命名',run:()=>begin({kind:'rename',note},note.title)},
      {label:t(note.favorite?'findUnfavorite':'findFavorite'),run:()=>void run(()=>controller.manage({notes,action:note.favorite?'unfavorite':'favorite'}))},
      {label:t('organizeMove'),run:()=>begin({kind:'move',note},note.notebookId??'')},
      {label:'创建副本',run:()=>void run(async()=>{const ok=await controller.manage({notes,action:'duplicate'});if(ok)created?.();return ok})},
      {label:t('notesExport'),run:()=>void run(async()=>{const repository=currentRepository();const target=state.noteId===note.noteId?(await controller.freezeExport())?.note:(await controller.api('/notes/get',{noteId:note.noteId})).note;if(!target||currentRepository()!==repository)return false;setExporting({note:target,repository});return true})},
      {label:t('notesTrashAction'),danger:true,run:()=>begin({kind:'trash',note})},
    ].map(a=>({...a,disabled:locked}))
  }
  function bookActions(book:NotebookView):RowAction[]{return [
    {label:t('notesNew'),run:()=>void controller.create({notebookId:book.notebookId}).then(ok=>{if(ok)created?.()})},
    {label:t('notesRenameBook'),run:()=>begin({kind:'book-rename',book},book.current.title)},
    {label:'设为全局默认笔记本',disabled:book.isDefault,run:()=>void run(()=>controller.notebook(book.current.title,book,false,{makeDefault:true}))},
    {label:'导出此笔记本',run:()=>setExportBook(book.notebookId)},
    {label:t('notesRemoveBook'),disabled:book.isDefault,danger:true,run:()=>begin({kind:'book-remove',book},'move')},
  ].map(a=>({...a,disabled:a.disabled||busy||state.operation}))}
  async function accept(){
    if(!edit||duplicate)return
    if('note' in edit){const notes=[{noteId:edit.note.noteId,expectedHeads:edit.note.heads}];if(edit.kind==='trash'||edit.kind==='purge')await trash(edit.note,edit.kind==='purge');else await run(()=>controller.manage({notes,action:edit.kind==='rename'?'rename':'move',...(edit.kind==='rename'?{title:value.trim()}:{notebookId:value})}))}
    else await run(()=>controller.notebook(edit.kind==='book-rename'?value.trim():edit.book.current.title,edit.book,edit.kind==='book-remove',edit.kind==='book-remove'?{removal:value as 'move'|'trash',expectedNoteCount:edit.book.noteCount??0}:{}))
  }
  const danger=edit?.kind==='purge'||edit?.kind==='book-remove'&&value==='trash'
  const dialogs=<>{exporting&&<NoteExport controller={controller} state={{...state,noteId:exporting.note.noteId,note:exporting.note,draft:noteContent(exporting.note),loadingNote:false,operation:false,composing:false,conflict:null}} t={t} onClose={()=>setExporting(null)} freeze={async()=>({note:exporting.note,isCurrent:()=>currentRepository()===exporting.repository})}/>} {exportBook&&<LibraryTransfer controller={controller} state={state} t={t} close={()=>setExportBook(null)} initialExport={exportBook}/>}
    {edit&&<PaperDialog title={edit.kind==='book-remove'?t('notesRemoveBook'):edit.kind==='trash'?t('notesTrashAction'):edit.kind==='purge'?t('batchPurge'):edit.kind==='move'?t('organizeMove'):'重命名'} closeLabel={t('paperClose')} locked={busy} onClose={()=>setEdit(null)}><div className="paper-dialog-content paper-reuse-fields">
      <p title={'note' in edit?edit.note.title:edit.book.current.title} style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{'note' in edit?edit.note.title:edit.book.current.title}</p>
      {(edit.kind==='rename'||edit.kind==='book-rename')&&<label>名称<input autoFocus maxLength={240} aria-invalid={duplicate||undefined} value={value} onChange={e=>{setValue(e.target.value);setError('')}}/></label>}
      {duplicate&&<p role="alert">{NOTEBOOK_NAME_TAKEN}</p>}
      {edit.kind==='book-rename'&&<p>此笔记本在所有使用它的界面和工作区中都会显示新名称。</p>}
      {edit.kind==='move'&&<label>{t('notesNotebook')}<select value={value} onChange={e=>setValue(e.target.value)}>{state.notebooks.filter(b=>b.current.status==='active').map(b=><option key={b.notebookId} value={b.notebookId}>{b.current.title}</option>)}</select></label>}
      {edit.kind==='trash'&&<p>移到回收站后可以恢复。</p>}
      {edit.kind==='purge'&&<p>{t('batchPurgeConfirm',{count:1})}</p>}
      {edit.kind==='book-remove'&&<><p>{t('notesBookCount',{count:edit.book.noteCount??0})}</p><label><input type="radio" checked={value==='move'} onChange={()=>{setValue('move');setConfirmed(false)}}/> 笔记移入默认笔记本</label><label><input type="radio" checked={value==='trash'} onChange={()=>setValue('trash')}/> 笔记随笔记本移入回收站</label></>}
      {danger&&<label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> {edit.kind==='purge'?'我确认永久删除笔记及不再被引用的附件，无法恢复':'我确认将此笔记本内全部笔记移入回收站'}</label>}{error&&<p role="alert">{error}</p>}
    </div><footer><button disabled={busy} onClick={()=>setEdit(null)}>{t('cancel')}</button><button className={danger?'paper-danger':'paper-primary'} disabled={busy||duplicate||danger&&!confirmed||(['rename','book-rename','move'].includes(edit.kind)&&!value.trim())} onClick={()=>void accept()}>{t(busy?'loading':edit.kind==='trash'?'notesTrashAction':'organizeApply')}</button></footer></PaperDialog>}
    {error&&!edit&&<p role="alert">{error} <button onClick={()=>setError('')}>{t('paperClose')}</button></p>}
    {undo&&<TransientNotice identity={undo.noteId+undo.expectedHeads.join()} message={error||t('paperMoved')} close={()=>setUndo(null)} busy={busy} paused={!!error} action={()=>void run(()=>controller.batch([undo],'restore')).then(ok=>{if(ok)setUndo(null)})}/>}
  </>
  return {noteActions,bookActions,dialogs,exportBook:(id:string)=>setExportBook(id)}
}
