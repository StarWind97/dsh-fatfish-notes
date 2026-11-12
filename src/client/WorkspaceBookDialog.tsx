import * as React from 'react'
import {useId,useRef,useState} from 'react'
import {Check,LoaderCircle,Pencil,Notebook,X} from 'lucide-react'
import {PaperDialog} from './paper/PaperDialog.js'
import {importId} from './library-import.js'
import {notebookSync} from './notebook-sync.js'
import {activeNotebook,sameNamedNotebook,NOTEBOOK_NAME_TAKEN} from '../notes/notebooks.js'
import type {NotesController,NotesState} from './notes-controller.js'
import type {T} from './locale.js'

type Choice='new'|'existing'|'rename'|null
export function WorkspaceBookDialog({mode,workspace,mapped,initialSelected,controller,state,t,close,changed}:{mode:'new'|'workspace';workspace:{id:string;title:string}|null;mapped:string|null;initialSelected?:string|null;controller:NotesController;state:NotesState;t:T;close:()=>void;changed:(id:string|null)=>void}){
  const current=state.notebooks.find(b=>b.notebookId===mapped),fieldId=useId()
  const workspaceNameTaken=!!sameNamedNotebook(state.notebooks,workspace?.title??'')
  const [choice,setChoice]=useState<Choice>(mode==='new'?'new':initialSelected?'existing':null)
  const [bind,setBind]=useState(mode==='workspace'),[title,setTitle]=useState(mode==='workspace'&&!workspaceNameTaken?workspace?.title??'':'')
  const [selected,setSelected]=useState(initialSelected??mapped??state.notebooks.find(b=>b.isDefault)?.notebookId??'')
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  const submitting=useRef(false),origin=useRef<HTMLButtonElement|null>(null),renameButton=useRef<HTMLButtonElement>(null)
  const duplicate=(choice==='new'||choice==='rename')&&!!sameNamedNotebook(state.notebooks,title,choice==='rename'?mapped??undefined:undefined)
  function reset(){
    setChoice(null);setError('');setTitle('')
    requestAnimationFrame(()=>{const button=origin.current?.isConnected?origin.current:renameButton.current;button?.focus()})
  }
  function cancel(){if(submitting.current)return;if(mode==='new')close();else reset()}
  function choose(next:Exclude<Choice,null>,button:HTMLButtonElement){
    if(submitting.current)return
    origin.current=button;setError('');setChoice(next)
    setTitle(next==='rename'?current?.current.title??'':workspaceNameTaken?'':workspace?.title??'')
    setSelected(mapped??state.notebooks.find(b=>b.isDefault)?.notebookId??'')
  }
  async function save(unbind=false){
    if(submitting.current||(!unbind&&(duplicate||!choice||!(choice==='existing'?selected:title.trim()))))return
    submitting.current=true;setBusy(true);setError('')
    let created=false
    try{
      if(choice==='rename'&&!unbind){
        if(!current||!await controller.notebook(title.trim(),current))throw Object.assign(Error('rename'),{code:controller.getSnapshot().error})
        reset();return
      }
      let id=selected
      if(choice==='new'&&!unbind){
        id=importId();await controller.api('/notes/notebook',{notebookId:id,title:title.trim(),expectedHeads:[]})
        // A failed binding retries this existing book instead of creating a duplicate.
        created=true;setSelected(id);setChoice('existing');await controller.refresh(true,true)
      }
      if(workspace&&(bind||unbind)){
        await controller.api('/notes/workspace-book',{workspaceId:workspace.id,notebookId:unbind?null:id})
        changed(unbind?null:id)
      }
      await controller.refresh(true,true);void notebookSync.request(true)
      if(mode==='new')close();else reset()
    }catch(e){setError(e&&typeof e==='object'&&'code'in e&&e.code==='notebook_name_taken'?NOTEBOOK_NAME_TAKEN:created?'笔记本已创建，工作区关联未完成。请重试。':'操作未完成，请重试。')}
    finally{submitting.current=false;setBusy(false)}
  }
  const acceptLabel=choice==='rename'?'保存名称':choice==='existing'?'确认选用':bind&&workspace?'创建并关联工作区':'创建笔记本'
  const cancelLabel=choice==='rename'?'取消改名':choice==='existing'?'取消选用':'取消新建'
  const controls=<span className="workspace-book-inline-actions">
    <button type="submit" className="workspace-book-accept" title={acceptLabel} aria-label={acceptLabel} disabled={busy||duplicate||!(choice==='existing'?selected:title.trim())}>{busy?<LoaderCircle className="workspace-book-spinner" size={17}/>:<Check size={18}/>}</button>
    <button type="button" title={cancelLabel} aria-label={cancelLabel} disabled={busy} onClick={cancel}><X size={18}/></button>
  </span>
  const keys=(e:React.KeyboardEvent)=>{if(e.nativeEvent.isComposing&&(e.key==='Enter'||e.key==='Escape')){e.preventDefault();e.stopPropagation()}}
  const submit=(e:React.FormEvent)=>{e.preventDefault();void save()}
  return <PaperDialog title={mode==='new'?t('notesNewNotebook'):'工作区笔记本设置'} closeLabel={t('paperClose')} onClose={close} onCancel={()=>choice?cancel():close()} locked={busy} className="workspace-book-dialog">
    <style>{workspaceBookCss}</style><div className="paper-dialog-content workspace-book-fields">
      {mode==='workspace'&&<>
        {current&&<div className="workspace-book-current"><Notebook size={17} aria-hidden="true"/>
          {choice==='rename'?<form className="workspace-book-inline" onSubmit={submit} onKeyDown={keys}><input aria-label="修改笔记本名称" aria-invalid={duplicate||undefined} aria-describedby={duplicate?fieldId+'-error':undefined} autoFocus maxLength={240} disabled={busy} value={title} onChange={e=>{setTitle(e.target.value);setError('')}}/>{controls}</form>:<><strong title={current.current.title}>{current.current.title}</strong><button ref={renameButton} disabled={busy} title="重命名笔记本" aria-label="重命名笔记本" onClick={e=>choose('rename',e.currentTarget)}><Pencil size={16}/></button></>}
        </div>}
        {choice==='rename'&&duplicate&&<p id={fieldId+'-error'} role="alert">{NOTEBOOK_NAME_TAKEN}</p>}
        <div className="workspace-book-choices" role="group" aria-label="选择笔记本方式">
          <button disabled={busy} aria-expanded={choice==='existing'} onClick={e=>choose('existing',e.currentTarget)}>选用其他笔记本</button>
          <button disabled={busy} aria-expanded={choice==='new'} onClick={e=>choose('new',e.currentTarget)}>新建笔记本</button>
        </div>
      </>}
      {(choice==='new'||choice==='existing')&&<form className="workspace-book-entry" onSubmit={submit} onKeyDown={keys}>
        <label htmlFor={fieldId}>{choice==='new'?'笔记本名称':'选择笔记本'}</label>
        <div className="workspace-book-inline">
          {choice==='new'?<input id={fieldId} placeholder="填写新名称" aria-invalid={duplicate||undefined} aria-describedby={duplicate?fieldId+'-error':undefined} autoFocus maxLength={240} disabled={busy} value={title} onChange={e=>{setTitle(e.target.value);setError('')}}/>:<select id={fieldId} autoFocus disabled={busy} value={selected} onChange={e=>setSelected(e.target.value)}>{state.notebooks.filter(activeNotebook).map(b=><option key={b.notebookId} value={b.notebookId}>{b.current.title}</option>)}</select>}
          {controls}
        </div>
        {choice==='new'&&duplicate&&<p id={fieldId+'-error'} role="alert">{NOTEBOOK_NAME_TAKEN}</p>}
        {choice==='new'&&mode==='workspace'&&workspaceNameTaken&&!title.trim()&&<p className="paper-hint">已有名为“{workspace?.title}”的笔记本，可选用已有的，或填写新名称。</p>}
        {mode==='new'&&workspace&&<label className="workspace-book-bind"><input type="checkbox" disabled={busy} checked={bind} onChange={e=>setBind(e.target.checked)}/> 用作当前工作区的默认笔记本</label>}
      </form>}
      <p className="paper-hint">{choice==='rename'?'改名后，其他工作区和界面也会显示新名称。':bind&&mapped&&choice==='existing'&&selected!==mapped?'替换当前默认本，已有笔记不会移动。':'用于预选保存位置，仍可保存到其他笔记本。'}</p>
      {error&&<p role="alert">{error}</p>}
    </div><footer>{mode==='workspace'&&mapped&&!choice&&<button className="workspace-book-unbind" disabled={busy} onClick={()=>void save(true)}>解除工作区关联</button>}<button disabled={busy} onClick={close}>{t('paperClose')}</button></footer>
  </PaperDialog>
}
const workspaceBookCss=`
.workspace-book-fields{display:grid;gap:14px}.workspace-book-fields p,.workspace-book-fields label{margin:0}.workspace-book-fields [role=alert]{font-size:12px;color:light-dark(#a63232,#ffb4ab)}
.workspace-book-current{display:flex;align-items:center;gap:9px;min-height:50px;padding:8px 10px;background:var(--shelf);border-radius:7px}.workspace-book-current>svg{flex-shrink:0}.workspace-book-current strong{min-width:0;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px}.workspace-book-current>button{padding:7px}
.workspace-book-choices{display:flex;gap:6px;flex-wrap:wrap}.workspace-book-choices button{font-size:12px;padding:7px 10px}.workspace-book-choices [aria-expanded=true]{background:var(--selected);font-weight:600}
.workspace-book-entry{display:grid;gap:8px}.workspace-book-entry>label{font-size:12px;color:var(--muted)}.workspace-book-inline{display:flex;align-items:center;gap:8px;min-width:0;flex:1;margin:0}.workspace-book-inline input,.workspace-book-inline select{min-width:0;flex:1;width:0;box-sizing:border-box;border:1px solid var(--rule);border-radius:6px;background:var(--base);color:var(--ink);font:inherit;padding:8px 10px}.workspace-book-inline input:focus-visible,.workspace-book-inline select:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.workspace-book-inline-actions{display:inline-flex;flex-shrink:0;gap:2px}.workspace-book-dialog .workspace-book-inline-actions button{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;gap:0}.workspace-book-inline-actions svg{flex-shrink:0;width:18px;height:18px}.workspace-book-inline-actions .workspace-book-accept{color:var(--accent)}.workspace-book-inline-actions button:disabled{opacity:.45}
.workspace-book-bind{display:flex!important;align-items:center;gap:7px;font-size:12px}.workspace-book-bind input{width:auto;margin:0}.workspace-book-unbind{margin-right:auto;color:var(--muted)!important}.workspace-book-spinner{animation:workspace-book-spin 1s linear infinite}@keyframes workspace-book-spin{to{transform:rotate(360deg)}}
`
