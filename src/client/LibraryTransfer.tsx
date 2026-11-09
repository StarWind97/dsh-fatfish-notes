import * as React from 'react'
import {useEffect,useRef,useState} from 'react'
import {Download,Upload,FolderOpen,FileArchive} from 'lucide-react'
import type {NotesController,NotesState} from './notes-controller.js'
import type {T} from './locale.js'
import {PaperDialog} from './paper/PaperDialog.js'
import {activeNotebook} from '../notes/notebooks.js'
import {api,currentRepository} from './api.js'
import {fileSize} from './NoteAttachments.js'
import {downloadFilename,startNoteDownload} from './note-export.js'
import {scanImport,unzipEntries,importNote,IMPORT_TOTAL,type ImportPlan,type ImportEntry} from './library-import.js'

export function LibraryTransfer({controller,state,t,close}:{controller:NotesController;state:NotesState;t:T;close:()=>void}){
  const [mode,setMode]=useState<'import'|'export'>('import'),[plan,setPlan]=useState<ImportPlan|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[report,setReport]=useState<string[]>([])
  const [book,setBook]=useState(state.filter.notebookId??state.notebooks.find(b=>b.isDefault)?.notebookId??''),[scope,setScope]=useState(state.filter.notebookId??''),[folders,setFolders]=useState(false),[remote,setRemote]=useState(false),[large,setLarge]=useState(false)
  const [selected,setSelected]=useState<Set<string>>(new Set()),[progress,setProgress]=useState({done:0,total:0})
  const input=useRef<HTMLInputElement>(null),folderInput=useRef<HTMLInputElement>(null),zipInput=useRef<HTMLInputElement>(null),abort=useRef<AbortController|null>(null),stop=useRef(false),books=useRef(new Map<string,string>())
  useEffect(()=>{folderInput.current?.setAttribute('webkitdirectory','');return()=>abort.current?.abort()},[mode])
  async function scan(files:File[],zip=false){
    setBusy(true);setPlan(null);setReport([]);setMessage('');setLarge(false);books.current.clear()
    try{await new Promise(resolve=>setTimeout(resolve,0));let entries:ImportEntry[],warnings:string[]=[]
      if(zip){if(!files[0]||files[0].size>IMPORT_TOTAL)throw new Error('limit');({entries,warnings}=unzipEntries(new Uint8Array(await files[0].arrayBuffer())))}
      else entries=files.map(f=>({path:f.webkitRelativePath?f.webkitRelativePath.split('/').slice(1).join('/'):f.name,bytes:f.size,read:async()=>new Uint8Array(await f.arrayBuffer())}))
      const next=await scanImport(entries,warnings);setPlan(next);setSelected(new Set(next.notes.map(n=>n.noteId)));setReport([...next.warnings,...next.notes.flatMap(n=>n.warnings.map(w=>n.path+': '+w))])
    }catch{setMessage(t('libraryFailed'))}finally{setBusy(false)}
  }
  async function runImport(){
    if(!plan||!await controller.saveEdits())return
    setBusy(true);setMessage('');stop.current=false
    const chosen=plan.notes.filter(n=>selected.has(n.noteId)&&!n.done);setProgress({done:0,total:chosen.length});let done=0,failed=0
    try{for(const note of chosen){if(stop.current)break
      try{let target=book
        if(folders&&note.path.includes('/')){const title=note.path.split('/')[0]!;target=books.current.get(title)??'';if(!target){const before=new Set((await api('/notes/notebooks',undefined)).notebooks.map(b=>b.notebookId)),created=await api('/notes/notebook',{title,expectedHeads:[]});target=created.notebooks.find(b=>!before.has(b.notebookId))?.notebookId??'';if(!target)throw new Error('book');books.current.set(title,target)}}
        const warnings=await importNote({...plan,notes:plan.notes.filter(n=>selected.has(n.noteId))},note,target,remote,api);done++;setReport(r=>[...r,...warnings.map(w=>note.path+': '+w)])
      }catch{failed++;setReport(r=>[...r,note.path+': 导入失败，可再次尝试；已完成的笔记不会重复导入'])}
      setProgress(p=>({...p,done:p.done+1}))
    }}finally{setMessage(t('libraryDone',{done,failed}));setBusy(false);await controller.refresh(true,true)}
  }
  async function runExport(){
    if(!await controller.saveEdits())return
    const job=new AbortController();abort.current=job;setBusy(true);setMessage('')
    try{const repo=currentRepository(),res=await fetch('/dsh-fatfish-notes/notes/library-export',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json',...(repo===undefined?{}:{'x-notebook-repository':String(repo)})},body:JSON.stringify(scope?{notebookId:scope}:{}),signal:job.signal});if(!res.ok)throw new Error('export');const blob=await res.blob();job.signal.throwIfAborted();startNoteDownload({blob,filename:downloadFilename(res)});setMessage(t('notesExportStarted'))}
    catch{if(!job.signal.aborted)setMessage(t('libraryFailed'))}finally{setBusy(false);abort.current=null}
  }
  const hasLarge=plan&&[...plan.entries.values()].some(e=>e.bytes>10*1024*1024)
  return <PaperDialog title={t('libraryTransfer')} closeLabel={t('paperClose')} onClose={close} locked={busy}><div className="paper-dialog-content">
    <div className="paper-transfer-actions"><button disabled={busy} aria-pressed={mode==='import'} onClick={()=>setMode('import')}><Upload size={16}/>{t('libraryImport')}</button><button disabled={busy} aria-pressed={mode==='export'} onClick={()=>setMode('export')}><Download size={16}/>{t('libraryExport')}</button></div>
    {mode==='import'?<><p>{t('libraryHint')}</p><p className="paper-hint">{t('attachmentLimits')}</p><div className="paper-transfer-actions"><button disabled={busy} onClick={()=>input.current?.click()}><Upload size={15}/>{t('libraryFiles')}</button><button disabled={busy} onClick={()=>folderInput.current?.click()}><FolderOpen size={15}/>{t('libraryFolder')}</button><button disabled={busy} onClick={()=>zipInput.current?.click()}><FileArchive size={15}/>{t('libraryZip')}</button></div>
      <input ref={input} hidden type="file" multiple accept=".md" onChange={e=>{void scan(Array.from(e.target.files??[]));e.target.value=''}}/>
      <input ref={folderInput} hidden type="file" multiple onChange={e=>{void scan(Array.from(e.target.files??[]));e.target.value=''}}/>
      <input ref={zipInput} hidden type="file" accept=".zip" onChange={e=>{void scan(Array.from(e.target.files??[]),true);e.target.value=''}}/>
      {plan&&<><p>{t('libraryPreview',{notes:plan.notes.length,files:plan.entries.size,size:fileSize(plan.bytes)})}</p><div className="paper-file-list">{plan.notes.map(n=><label key={n.noteId} className="paper-checkbox"><input type="checkbox" checked={selected.has(n.noteId)} disabled={busy||n.done} onChange={e=>setSelected(s=>{const next=new Set(s);e.target.checked?next.add(n.noteId):next.delete(n.noteId);return next})}/><span>{n.path}{n.done?' ✓':''}</span></label>)}</div>
        <label>{t('libraryTarget')}<select value={book} disabled={busy} onChange={e=>setBook(e.target.value)}>{state.notebooks.filter(activeNotebook).map(b=><option value={b.notebookId} key={b.notebookId}>{b.current.title}</option>)}</select></label>
        <label className="paper-checkbox"><input type="checkbox" checked={folders} disabled={busy} onChange={e=>setFolders(e.target.checked)}/>{t('libraryFolders')}</label>
        <label className="paper-checkbox"><input type="checkbox" checked={remote} disabled={busy} onChange={e=>setRemote(e.target.checked)}/>{t('libraryRemote')}</label>
        {hasLarge&&<label className="paper-checkbox"><input type="checkbox" checked={large} disabled={busy} onChange={e=>setLarge(e.target.checked)}/>{t('libraryLarge')}</label>}
      </>}
    </>:<><p>{t('libraryExportHint')}</p><select aria-label={t('libraryExport')} value={scope} disabled={busy} onChange={e=>setScope(e.target.value)}><option value="">{t('paperAll')}</option>{state.notebooks.filter(activeNotebook).map(b=><option key={b.notebookId} value={b.notebookId}>{b.current.title}</option>)}</select></>}
    {busy&&<p role="status">{mode==='import'&&progress.total?t('libraryProgress',progress):t('loading')}</p>}{message&&<p role="status">{message}</p>}
    {!!report.length&&<details open><summary>{t('libraryReport')} ({report.length})</summary><pre className="paper-transfer-report">{report.join('\n')}</pre></details>}
  </div><footer><button onClick={()=>{if(busy){stop.current=true;abort.current?.abort()}else close()}}>{busy?t('notesExportCancel'):t('paperClose')}</button><button className="paper-primary" disabled={busy||(mode==='import'&&(!plan||!book||!plan.notes.some(n=>selected.has(n.noteId)&&!n.done)||!!hasLarge&&!large))} onClick={()=>void(mode==='import'?runImport():runExport())}>{t(mode==='import'?'libraryConfirm':'libraryExportStart')}</button></footer></PaperDialog>
}
