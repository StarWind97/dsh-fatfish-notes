import * as React from 'react'
import {useEffect,useRef,useState,useSyncExternalStore} from 'react'
import {Download,Upload,FolderOpen,FileArchive} from 'lucide-react'
import type {NotesController,NotesState} from './notes-controller.js'
import type {T} from './locale.js'
import {PaperDialog} from './paper/PaperDialog.js'
import {activeNotebook} from '../notes/notebooks.js'
import {api,currentRepository} from './api.js'
import {fileSize} from './NoteAttachments.js'
import {downloadFilename,startNoteDownload} from './note-export.js'
import {importJob} from './import-job.js'

export function LibraryTransfer({controller,state,t,close,initialExport}:{initialExport?:string;controller:NotesController;state:NotesState;t:T;close:()=>void}){
  const job=useSyncExternalStore(importJob.subscribe,importJob.getSnapshot),plan=job.plan
  const [mode,setMode]=useState<'import'|'export'>(initialExport?'export':'import'),[exportBusy,setExportBusy]=useState(false),[exportMessage,setExportMessage]=useState(''),[minimized,setMinimized]=useState(false),[page,setPage]=useState(0)
  const busy=job.busy||exportBusy,message=mode==='import'?job.message:exportMessage,report=job.report,progress={done:job.done,total:job.total}
  const [book,setBook]=useState(state.filter.notebookId??state.notebooks.find(b=>b.isDefault)?.notebookId??''),[scope,setScope]=useState(initialExport??state.filter.notebookId??''),[folders,setFolders]=useState(false),[remote,setRemote]=useState(false),[large,setLarge]=useState(false)
  const [selected,setSelected]=useState<Set<string>>(new Set(plan?.notes.map(n=>n.noteId)??[]))
  const input=useRef<HTMLInputElement>(null),folderInput=useRef<HTMLInputElement>(null),zipInput=useRef<HTMLInputElement>(null),abort=useRef<AbortController|null>(null)
  useEffect(()=>{if(!book){const initial=state.notebooks.find(b=>b.isDefault)?.notebookId;if(initial)setBook(initial)}},[state.notebooks,book])
  useEffect(()=>{folderInput.current?.setAttribute('webkitdirectory','');return()=>abort.current?.abort()},[mode,minimized])
  useEffect(()=>{setPage(0);if(plan)setSelected(new Set(plan.notes.filter(n=>!n.done).map(n=>n.noteId)))},[plan])
  async function scan(files:File[],zip=false){setLarge(false);await importJob.scan(files,zip,controller.api)}
  async function runImport(){if(!await controller.saveEdits())return;await importJob.run([...selected],book,folders,remote);await controller.refresh(true,true)}
  async function runExport(){
    if(!await controller.saveEdits())return
    const job=new AbortController();abort.current=job;setExportBusy(true);setExportMessage('')
    try{const repo=currentRepository(),res=await fetch('/dsh-fatfish-notes/notes/library-export',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json',...(repo===undefined?{}:{'x-notebook-repository':String(repo)})},body:JSON.stringify(scope?{notebookId:scope}:{}),signal:job.signal});if(!res.ok)throw new Error('export');const blob=await res.blob();job.signal.throwIfAborted();startNoteDownload({blob,filename:downloadFilename(res)});setExportMessage(t('notesExportStarted'))}
    catch{if(!job.signal.aborted)setExportMessage(t('libraryFailed'))}finally{setExportBusy(false);abort.current=null}
  }
  const hasLarge=plan&&plan.entries.some(e=>e.bytes>50*1024*1024)
  if(minimized)return <aside className="paper-import-progress" role="status" style={{position:'fixed',bottom:16,right:20,zIndex:1000,padding:12,border:'1px solid var(--rule)',borderRadius:8,background:'var(--base)',maxWidth:340,boxShadow:'0 4px 16px #0002'}}><strong>{busy?t('libraryProgress',progress):t('libraryTransfer')}</strong><p style={{fontSize:12,margin:'4px 0',overflowWrap:'anywhere'}}>{busy?job.progress.path:message}</p><button onClick={()=>setMinimized(false)}>{t('libraryShowProgress')}</button>{job.busy&&<button onClick={()=>importJob.cancel()}>{t('cancel')}</button>}</aside>
  return <PaperDialog title={t('libraryTransfer')} closeLabel={t('paperClose')} onClose={()=>busy?setMinimized(true):close()}><div className="paper-dialog-content">
    <div className="paper-transfer-actions"><button disabled={busy} aria-pressed={mode==='import'} onClick={()=>setMode('import')}><Upload size={16}/>{t('libraryImport')}</button><button disabled={busy} aria-pressed={mode==='export'} onClick={()=>setMode('export')}><Download size={16}/>{t('libraryExport')}</button></div>
    {mode==='import'?<><p>{t('libraryHint')}</p><p className="paper-hint">{t('attachmentLimits')}</p><div className="paper-transfer-actions"><button disabled={busy} onClick={()=>input.current?.click()}><Upload size={15}/>{t('libraryFiles')}</button><button disabled={busy} onClick={()=>folderInput.current?.click()}><FolderOpen size={15}/>{t('libraryFolder')}</button><button disabled={busy} onClick={()=>zipInput.current?.click()}><FileArchive size={15}/>{t('libraryZip')}</button></div>
      <input ref={input} hidden type="file" multiple accept=".md" onChange={e=>{void scan(Array.from(e.target.files??[]));e.target.value=''}}/>
      <input ref={folderInput} hidden type="file" multiple onChange={e=>{void scan(Array.from(e.target.files??[]));e.target.value=''}}/>
      <input ref={zipInput} hidden type="file" accept=".zip" onChange={e=>{void scan(Array.from(e.target.files??[]),true);e.target.value=''}}/>
      {plan&&<><p>{t('libraryPreview',{notes:plan.notes.length,files:plan.entries.length,size:fileSize(plan.bytes)})}</p><div className="paper-file-list">{plan.notes.slice(page*100,(page+1)*100).map(n=><label key={n.noteId} className="paper-checkbox"><input type="checkbox" checked={selected.has(n.noteId)} disabled={busy||n.done} onChange={e=>setSelected(s=>{const next=new Set(s);e.target.checked?next.add(n.noteId):next.delete(n.noteId);return next})}/><span>{n.path}{n.done?' ✓':''}</span></label>)}</div>
        <div className="paper-transfer-actions"><button disabled={busy} onClick={()=>setSelected(new Set(plan.notes.filter(n=>!n.done).map(n=>n.noteId)))}>{t('materialsSelectAll')}</button><button disabled={busy} onClick={()=>setSelected(new Set())}>{t('materialsClear')}</button>{plan.notes.length>100&&<><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>←</button><span>{page+1} / {Math.ceil(plan.notes.length/100)}</span><button disabled={(page+1)*100>=plan.notes.length} onClick={()=>setPage(p=>p+1)}>→</button></>}</div>
        <label>{t('libraryTarget')}<select value={book} disabled={busy} onChange={e=>setBook(e.target.value)}>{state.notebooks.filter(activeNotebook).map(b=><option value={b.notebookId} key={b.notebookId}>{b.current.title}</option>)}</select></label>
        <label className="paper-checkbox"><input type="checkbox" checked={folders} disabled={busy} onChange={e=>setFolders(e.target.checked)}/>{t('libraryFolders')}</label>
        <label className="paper-checkbox"><input type="checkbox" checked={remote} disabled={busy} onChange={e=>setRemote(e.target.checked)}/>{t('libraryRemote')}</label>
        {hasLarge&&<label className="paper-checkbox"><input type="checkbox" checked={large} disabled={busy} onChange={e=>setLarge(e.target.checked)}/>{t('libraryLarge')}</label>}
      </>}
    </>:<><p>{t('libraryExportHint')}</p><select aria-label={t('libraryExport')} value={scope} disabled={busy} onChange={e=>setScope(e.target.value)}><option value="">{t('paperAll')}</option>{state.notebooks.filter(activeNotebook).map(b=><option key={b.notebookId} value={b.notebookId}>{b.current.title}</option>)}</select></>}
    {busy&&<p role="status">{mode==='import'?`${job.progress.path} · ${progress.total?t('libraryProgress',progress):t('loading')}${job.progress.total?' · '+fileSize(job.progress.bytes)+' / '+fileSize(job.progress.total):''}`:t('loading')}</p>}{message&&<p role="status">{message}</p>}
    {!!report.length&&<details open><summary>{t('libraryReport')} ({report.length})</summary><pre className="paper-transfer-report">{report.join('\n')}</pre></details>}
  </div><footer>{busy&&<button onClick={()=>setMinimized(true)}>{t('libraryMinimize')}</button>}<button onClick={()=>{if(busy){importJob.cancel();abort.current?.abort()}else close()}}>{busy?t('notesExportCancel'):t('paperClose')}</button><button className="paper-primary" disabled={busy||(mode==='import'&&(job.cancelled||!plan||!book||!plan.notes.some(n=>selected.has(n.noteId)&&!n.done)||!!hasLarge&&!large))} onClick={()=>void(mode==='import'?runImport():runExport())}>{t(mode==='import'?'libraryConfirm':'libraryExportStart')}</button></footer></PaperDialog>
}
