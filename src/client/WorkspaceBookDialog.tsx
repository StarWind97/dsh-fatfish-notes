import * as React from 'react'
import {useState} from 'react'
import {PaperDialog} from './paper/PaperDialog.js'
import {importId} from './library-import.js'
import {notebookSync} from './notebook-sync.js'
import type {NotesController,NotesState} from './notes-controller.js'
import type {T} from './locale.js'

export function WorkspaceBookDialog({mode,workspace,mapped,initialSelected,controller,state,t,close,changed}:{mode:'new'|'workspace';workspace:{id:string;title:string}|null;mapped:string|null;initialSelected?:string|null;controller:NotesController;state:NotesState;t:T;close:()=>void;changed:(id:string|null)=>void}){
  const [create,setCreate]=useState(mode==='new'||!mapped&&!initialSelected),[bind,setBind]=useState(mode==='workspace'),[title,setTitle]=useState(mode==='workspace'?workspace?.title??'':''),[selected,setSelected]=useState(initialSelected??mapped??state.notebooks.find(b=>b.isDefault)?.notebookId??''),[busy,setBusy]=useState(false),[error,setError]=useState(false)
  async function save(unbind=false){setBusy(true);setError(false);try{
    let id=selected
    if(create&&!unbind){id=importId();await controller.api('/notes/notebook',{notebookId:id,title:title.trim(),expectedHeads:[]});setSelected(id);setCreate(false)}
    if(workspace&&(bind||unbind)){await controller.api('/notes/workspace-book',{workspaceId:workspace.id,notebookId:unbind?null:id});changed(unbind?null:id);window.dispatchEvent(new Event('fatfish-workspace-book'))}
    await controller.refresh(true,true);void notebookSync.request(true);close()
  }catch{setError(true)}finally{setBusy(false)}}
  return <PaperDialog title={mode==='new'?t('notesNewNotebook'):'工作区笔记本'} closeLabel={t('paperClose')} onClose={close} locked={busy}><div className="paper-dialog-content paper-reuse-fields">
    {mode==='workspace'&&<><p>为“{workspace?.title}”选择默认保存位置。笔记仍可存入其他笔记本；同一本可以用于多个工作区。</p><label><input type="radio" checked={create} onChange={()=>setCreate(true)}/> 新建笔记本</label><label><input type="radio" checked={!create} onChange={()=>setCreate(false)}/> 选择已有笔记本</label></>}
    {create?<label>笔记本名称<input autoFocus maxLength={240} value={title} onChange={e=>setTitle(e.target.value)}/></label>:<label>{t('notesNotebook')}<select value={selected} onChange={e=>setSelected(e.target.value)}>{state.notebooks.filter(b=>b.current.status==='active').map(b=><option key={b.notebookId} value={b.notebookId}>{b.current.title}</option>)}</select></label>}
    {mode==='new'&&workspace&&<label><input type="checkbox" checked={bind} onChange={e=>setBind(e.target.checked)}/> 用作当前工作区“{workspace.title}”的默认笔记本</label>}
    {bind&&mapped&&<p>将替换当前默认的“{state.notebooks.find(b=>b.notebookId===mapped)?.current.title}”。已有笔记不会移动，其他工作区不受影响。</p>}
    {error&&<p role="alert">操作未完成，请重试。已创建的笔记本会保留。</p>}
  </div><footer>{mode==='workspace'&&mapped&&<button disabled={busy} onClick={()=>void save(true)}>解除工作区关联</button>}<button disabled={busy} onClick={close}>{t('cancel')}</button><button className="paper-primary" disabled={busy||!(create?title.trim():selected)} onClick={()=>void save()}>{t(busy?'loading':create?'create':'organizeApply')}</button></footer></PaperDialog>
}
