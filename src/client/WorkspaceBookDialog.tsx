import * as React from 'react'
import {useState} from 'react'
import {Pencil,Notebook} from 'lucide-react'
import {PaperDialog} from './paper/PaperDialog.js'
import {importId} from './library-import.js'
import {notebookSync} from './notebook-sync.js'
import type {NotesController,NotesState} from './notes-controller.js'
import type {T} from './locale.js'

export function WorkspaceBookDialog({mode,workspace,mapped,initialSelected,controller,state,t,close,changed}:{mode:'new'|'workspace';workspace:{id:string;title:string}|null;mapped:string|null;initialSelected?:string|null;controller:NotesController;state:NotesState;t:T;close:()=>void;changed:(id:string|null)=>void}){
  const current=state.notebooks.find(b=>b.notebookId===mapped)
  const [choice,setChoice]=useState<'new'|'existing'|'rename'>(mode==='new'||!mapped&&!initialSelected?'new':'existing'),[bind,setBind]=useState(mode==='workspace'),[title,setTitle]=useState(mode==='workspace'?workspace?.title??'':''),[selected,setSelected]=useState(initialSelected??mapped??state.notebooks.find(b=>b.isDefault)?.notebookId??''),[busy,setBusy]=useState(false),[error,setError]=useState(false)
  async function save(unbind=false){setBusy(true);setError(false);try{
    let id=selected
    if(choice==='rename'&&!unbind){if(!current||!await controller.notebook(title.trim(),current))throw Error('rename');close();return}
    if(choice==='new'&&!unbind){id=importId();await controller.api('/notes/notebook',{notebookId:id,title:title.trim(),expectedHeads:[]});setSelected(id);setChoice('existing')}
    if(workspace&&(bind||unbind)){await controller.api('/notes/workspace-book',{workspaceId:workspace.id,notebookId:unbind?null:id});changed(unbind?null:id);window.dispatchEvent(new Event('fatfish-workspace-book'))}
    await controller.refresh(true,true);void notebookSync.request(true);close()
  }catch{setError(true)}finally{setBusy(false)}}
  const replacing=bind&&mapped&&choice==='existing'&&selected!==mapped
  return <PaperDialog title={mode==='new'?t('notesNewNotebook'):'工作区笔记本设置'} closeLabel={t('paperClose')} onClose={close} locked={busy}><style>{workspaceBookCss}</style><div className="paper-dialog-content paper-reuse-fields workspace-book-fields">
    {mode==='workspace'&&<><p className="workspace-book-caption">{workspace?.title}</p>{current&&<div className="workspace-book-current"><Notebook size={17}/><strong title={current.current.title}>{current.current.title}</strong><button title="重命名笔记本" aria-label="重命名笔记本" onClick={()=>{setChoice('rename');setTitle(current.current.title)}}><Pencil size={15}/></button></div>}
    <div className="workspace-book-choices" role="group" aria-label="选择笔记本方式"><button aria-pressed={choice==='existing'} onClick={()=>setChoice('existing')}>使用已有笔记本</button><button aria-pressed={choice==='new'} onClick={()=>{setChoice('new');setTitle(workspace?.title??'')}}>新建笔记本</button></div></>}
    {choice!=='existing'?<label>{choice==='rename'?'修改笔记本名称':'笔记本名称'}<input autoFocus maxLength={240} value={title} onChange={e=>setTitle(e.target.value)}/></label>:<label>{t('notesNotebook')}<select value={selected} onChange={e=>setSelected(e.target.value)}>{state.notebooks.filter(b=>b.current.status==='active').map(b=><option key={b.notebookId} value={b.notebookId}>{b.current.title}</option>)}</select></label>}
    {choice==='rename'?<p className="paper-hint">此笔记本在其他工作区和界面也会显示新名称。</p>:mode==='new'&&workspace?<label><input type="checkbox" checked={bind} onChange={e=>setBind(e.target.checked)}/> 用作当前工作区的默认笔记本</label>:<p className="paper-hint">用于预选保存位置，仍可保存到其他笔记本。</p>}
    {replacing&&<p className="paper-hint">替换当前默认本，已有笔记不会移动。</p>}
    {error&&<p role="alert">操作未完成，请重试。已创建的笔记本会保留。</p>}
  </div><footer>{mode==='workspace'&&mapped&&choice!=='rename'&&<button className="workspace-book-unbind" disabled={busy} onClick={()=>void save(true)}>解除关联</button>}<button disabled={busy} onClick={close}>{t('cancel')}</button><button className="paper-primary" disabled={busy||!(choice==='existing'?selected:title.trim())} onClick={()=>void save()}>{t(busy?'loading':choice==='new'?'create':'organizeApply')}</button></footer></PaperDialog>
}
const workspaceBookCss=`.workspace-book-fields{display:grid;gap:14px}.workspace-book-fields p,.workspace-book-fields label{margin:0}.workspace-book-caption{font-size:12px;color:var(--muted)}.workspace-book-current{display:flex;align-items:center;gap:9px;padding:10px 12px;background:var(--shelf);border-radius:7px}.workspace-book-current strong{min-width:0;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px}.workspace-book-current button{padding:5px}.workspace-book-choices{display:flex;gap:4px;border-bottom:1px solid var(--rule);padding-bottom:8px}.workspace-book-choices button{font-size:12px;padding:6px 10px}.workspace-book-choices [aria-pressed=true]{background:var(--selected);font-weight:600}.workspace-book-unbind{margin-right:auto;color:var(--muted)!important}`
