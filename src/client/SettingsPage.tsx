import * as React from 'react'
import { useEffect, useState } from 'react'
import { BookOpen, Folder, GitBranch, LockKeyhole } from 'lucide-react'
import { api, ApiError } from './api.js'
import { noteDateTime } from '../notes/date.js'
import { CaptureAppearance } from './CaptureAppearance.js'
import { DEFAULT_PRIVATE_REPO_NAME, type PersonalState, type PersonalPreview, type PersonalApiContract } from '../contracts/personal.js'
import type { LocaleKey, T } from './locale.js'

type Tools = PersonalApiContract['/personal/sync/tools']['response']
const setupErrors: Record<string, LocaleKey> = {
  notebook_previous_folder_unavailable:'resetLostFolder',
  notebook_move_changed:'moveChanged',notebook_move_failed:'moveChanged',notebook_unsynced:'resetPending',notebook_reset_target:'resetDifferent',notebook_dirty:'resetDirty',notebook_already_bound:'setupConnected',
  notebook_folder_invalid:'setupBadFolder', notebook_folder_bound:'setupBadFolder', note_path:'setupBadFolder',
  notebook_repo_missing:'setupMissingRepo', notebook_repo_exists:'setupNameTaken', personal_repository_unrelated:'setupNotNotebook',
  invalid_personal_manifest:'setupNotNotebook', note_sync_invalid:'setupInvalidData', note_version:'setupInvalidData',
  personal_repository_public:'setupNotPrivate', github_repository_forbidden:'setupForbidden', personal_account_changed:'setupIdentity',
  personal_repository_changed:'setupIdentity', personal_auth_required:'personalAuthHint', gh_unavailable:'setupMissingGh',
  git_unavailable:'setupMissingGit', invalid_request:'setupInvalidInput', github_login_failed:'setupLoginFailed'
}
const setupChanged = 'dsh-notebook-connected'

type PageAction='check'|'login'|'preview'|'connect'|'sync'|'move'|'resume'
export function SettingsPage({t,children}:{t:T;children?:React.ReactNode}) {
  const [data,setData]=useState<PersonalState|null>(null),[tools,setTools]=useState<Tools|null>(null)
  const [manage,setManage]=useState<'bound'|'move'|'reset'>('bound')
  const [mode,setMode]=useState<'existing'|'create'>('existing'),[repo,setRepo]=useState<string>(DEFAULT_PRIVATE_REPO_NAME)
  const [custom,setCustom]=useState<string|null>(null),[editingFolder,setEditingFolder]=useState(false)
  const [preview,setPreview]=useState<PersonalPreview|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<LocaleKey|null>(null)
  const [recovery,setRecovery]=useState<{folder:string;intent?:'locate'|'new'}|null>(null)
  const [notice,setNotice]=useState<LocaleKey|null>(null)
  const request=React.useRef<AbortController|null>(null)
  const modeGroup=React.useId()
  const sync=data?.sync, resetting=manage==='reset', wizard=!!sync && (resetting || !sync.binding)
  const repoLabel=sync?.binding ? sync.binding.account.login+'/'+sync.binding.repo : ''
  const suggested=sync?.defaultFolder.replace(/[^/\\]+$/,()=>repo.trim()||DEFAULT_PRIVATE_REPO_NAME)??''
  function failed(e:unknown){
    if(resetting && e instanceof ApiError && e.previousFolder){
      const folder=e.previousFolder
      setPreview(null);setRecovery(previous=>previous??{folder})
    }
    setError(e instanceof ApiError ? setupErrors[e.code]??'personalFailed':'personalFailed')
  }
  useEffect(()=>{
    const job=new AbortController()
    const read=()=>void api('/personal',undefined,job.signal).then(setData).catch(e=>{if(!job.signal.aborted)failed(e)})
    read();window.addEventListener(setupChanged,read)
    return()=>{job.abort();request.current?.abort();window.removeEventListener(setupChanged,read)}
  },[])
  useEffect(()=>{
    if(!wizard)return
    const job=new AbortController()
    void api('/personal/sync/tools',{},job.signal).then(setTools).catch(e=>{if(!job.signal.aborted)failed(e)})
    return()=>job.abort()
  },[wizard])
  useEffect(()=>{
    if(tools?.login!=='waiting')return
    const job=new AbortController()
    const timer=setTimeout(()=>void api('/personal/sync/tools',{},job.signal).then(setTools).catch(e=>{if(!job.signal.aborted)failed(e)}),2000)
    return()=>{clearTimeout(timer);job.abort()}
  },[tools])
  useEffect(()=>{
    if(!sync?.binding || !sync.enabled || (sync.ready && !sync.pending && sync.status!=='syncing'))return
    const job=new AbortController()
    const timer=setInterval(()=>void api('/personal',undefined,job.signal).then(setData).catch(()=>{}),3000)
    return()=>{job.abort();clearInterval(timer)}
  },[!!sync?.binding,sync?.enabled,sync?.ready,sync?.pending,sync?.status])
  function leave(){request.current?.abort();setPreview(null);setCustom(null);setRecovery(null);setEditingFolder(false);setManage('bound');setError(null)}
  function changeTarget(){if(recovery){setRecovery(null);setCustom(null);setEditingFolder(false)}setError(null)}
  function chooseRecovery(intent:'locate'|'new'){
    if(!recovery)return
    setRecovery({...recovery,intent});setCustom(intent==='locate'?'':suggested);setError(null)
  }
  async function run(action:PageAction){
    if(request.current)return
    const job=new AbortController();request.current=job;setBusy(true);setError(null);setNotice(null)
    try{
      if(action==='check'){setData(await api('/personal',undefined,job.signal));setTools(await api('/personal/sync/tools',{},job.signal))}
      else if(action==='login'){await api('/personal/sync/login',{},job.signal);setTools(await api('/personal/sync/tools',{},job.signal))}
      else if(action==='preview' && sync){
        const form={mode,repo:repo.trim(),folder:custom?.trim()||''}
        const result=resetting && sync.binding
          ? await api('/personal/sync/reset-preview',{...form,repositoryId:sync.binding.repositoryId,...(recovery?.intent?{folderIntent:recovery.intent}:{})},job.signal)
          : await api('/personal/sync/preview',form,job.signal)
        setPreview(result.preview)
      }else if(action==='connect' && preview){
        const confirm={previewId:preview.id,confirmPrivate:true as const}
        if(resetting && sync?.binding && !window.dispatchEvent(new Event('dsh-notebook-before-reset',{cancelable:true})))throw new ApiError('notebook_dirty')
        const result=resetting && sync?.binding
          ? await api('/personal/sync/reset',{...confirm,repositoryId:sync.binding.repositoryId},job.signal)
          : await api('/personal/sync/connect',confirm,job.signal)
        setData(result);setManage('bound');setPreview(null)
        if(resetting)window.dispatchEvent(new Event('dsh-notebook-switched'))
        window.dispatchEvent(new Event(setupChanged))
      }else if(action==='move' && sync?.binding && custom?.trim()){
        const result=await api('/personal/sync/move',{repositoryId:sync.binding.repositoryId,folder:custom.trim()},job.signal)
        setData(result);setNotice(result.cleanupPending?'moveCleanup':'moveDone');setManage('bound');setCustom(null)
        window.dispatchEvent(new Event(setupChanged))
      }else if(action==='resume' && sync?.binding && !sync.enabled){
        const checked=await api('/personal/sync/preview',{mode:'existing',repo:sync.binding.repo,folder:sync.folder},job.signal)
        setData(await api('/personal/sync/connect',{previewId:checked.preview.id,confirmPrivate:true},job.signal))
        window.dispatchEvent(new Event(setupChanged))
      }else if(action==='sync'){
        setData(await api('/personal/sync',{},job.signal));window.dispatchEvent(new Event(setupChanged))
      }
    }catch(e){if(!job.signal.aborted)failed(e);void api('/personal',undefined).then(setData).catch(()=>{})}
    finally{request.current=null;setBusy(false)}
  }
  if(sync?.ready && children)return <>{children}</>
  const title=resetting?'resetTitle':manage==='move'?'moveTitle':sync?.ready?'setupConnected':'setupWelcome'
  return <main className="notes-setup" aria-busy={busy}><style>{setupCss}</style><div className="notes-setup-inner">
    <header><span className="setup-icon"><BookOpen size={22}/></span><div><small>{t('nav')}</small><h2>{t(title)}</h2></div></header>
    {!data&&!error&&<p role="status">{t('loading')}</p>}
    {wizard && (preview?<section className="setup-section"><strong>{t('setupReview')}</strong>
      {resetting&&<small>{t('resetFrom',{repo:repoLabel})}</small>}
      <strong><GitBranch size={16}/>{preview.account.login}/{preview.repo}</strong><small>{t(preview.exists?'personalExisting':'personalWillCreate')} · {t('personalPrivate')}</small>
      <strong><Folder size={16}/>{t(preview.reuseFolder?'resetFoundFolder':'setupFolder')}</strong><code>{preview.folder}</code><p>{t(preview.reuseFolder?'resetReuseHint':resetting?'resetHint':'notesBackupScope')}</p>
      <div className="setup-modes"><button disabled={busy} onClick={()=>{setPreview(null);setError(null)}}>{t('setupBack')}</button>
      <button className="setup-primary" disabled={busy} onClick={()=>void run('connect')}>{t(preview.reuseFolder?'resetReuseConfirm':resetting?'resetConfirm':preview.exists?'setupConnect':'setupCreateConfirm')}</button>
      {resetting&&<button onClick={leave}>{t('cancel')}</button>}</div></section>:<>
      <p>{t(resetting?'resetHint':'setupIntro')}</p>
      <section className="setup-section"><strong><LockKeyhole size={16}/>{t('setupAccount')}</strong>
        {tools&&<div className="setup-tools"><span>Git · {t(tools.git?'setupPresent':'setupMissing')}</span><span>GitHub CLI · {t(tools.gh?'setupPresent':'setupMissing')}</span></div>}
        {tools&&!tools.git&&<a href="https://git-scm.com/downloads" target="_blank" rel="noreferrer">{t('setupInstallGit')}</a>}
        {tools&&!tools.gh&&<a href="https://cli.github.com/" target="_blank" rel="noreferrer">{t('setupInstallGh')}</a>}
        {tools?.account&&<small>GitHub · {tools.account.login}</small>}
        {tools?.gh&&!tools.account&&(tools.login==='waiting'?<div role="status">{t('setupLoginWaiting')} {tools.deviceCode&&<b>{tools.deviceCode}</b>} <a href="https://github.com/login/device" target="_blank" rel="noreferrer">{t('setupDevicePage')}</a></div>:<button disabled={busy} onClick={()=>void run('login')}>{t('setupLogin')}</button>)}
        {tools?.login==='failed'&&!tools.account&&<small role="alert">{t('setupLoginFailed')}</small>}
        <button disabled={busy} onClick={()=>void run('check')}>{t('setupRecheck')}</button>
      </section>
      <fieldset disabled={busy||!tools?.git||!tools.account}><legend>{t('setupRepository')}</legend>
        <div className="setup-modes">{(['existing','create'] as const).map(value=><label className="setup-choice" key={value}><input type="radio" name={modeGroup} checked={mode===value} onChange={()=>{setMode(value);changeTarget()}}/>{t(value==='existing'?'setupExisting':'setupCreate')}</label>)}</div>
        <label>{t('personalRepoName')}<input value={repo} onChange={e=>{setRepo(e.target.value);changeTarget()}}/></label>
        {recovery?<div className="setup-folder"><strong>{t('resetLastFolder')}</strong><code>{recovery.folder}</code>
          <p>{t('resetLostFolder')}</p><div className="setup-modes">{(['locate','new'] as const).map(intent=><button type="button" key={intent} aria-pressed={recovery.intent===intent} onClick={()=>chooseRecovery(intent)}>{t(intent==='locate'?'resetLocate':'resetNewFolder')}</button>)}</div>
          {recovery.intent&&<label>{t(recovery.intent==='locate'?'resetLocatePath':'resetNewPath')}<input autoFocus value={custom??''} onChange={e=>setCustom(e.target.value)}/></label>}
        </div>:<div className="setup-folder"><strong><Folder size={16}/>{t('setupFolder')}</strong>
          {resetting&&mode==='existing'&&!custom&&<small>{t('resetLookupHint')}</small>}
          {editingFolder?<label>{t('setupPath')}<input autoFocus value={custom??''} placeholder={suggested} onChange={e=>setCustom(e.target.value)}/></label>:<><code>{custom||suggested}</code><button onClick={()=>setEditingFolder(true)}>{t('setupChange')}</button></>}
        </div>}<button className="setup-primary" disabled={!repo.trim()||!!(recovery&&(!recovery.intent||!custom?.trim()))} onClick={()=>void run('preview')}>{t('personalCheck')}</button>
      </fieldset>{resetting&&<button onClick={leave}>{t('cancel')}</button>}</>)}
    {sync?.binding && !wizard && (manage==='move'?<section className="setup-section">
      <p>{t('moveHint')}</p><small>{t('moveSource')}</small><code>{sync.folder}</code>
      <label>{t('moveTarget')}<input autoFocus value={custom??''} disabled={busy} onChange={e=>setCustom(e.target.value)}/></label>
      <div className="setup-modes"><button disabled={busy} onClick={leave}>{t('cancel')}</button><button className="setup-primary" disabled={busy||!custom?.trim()} onClick={()=>void run('move')}>{t('moveConfirm')}</button></div>
    </section>:<><p>{t(sync.ready?'setupConnectedHint':sync.enabled?'setupInitializing':'resumeBoundHint')}</p>
      <section className="setup-section"><strong><GitBranch size={16}/>{repoLabel}</strong><small>{t('personalPrivate')}</small></section>
      <section className="setup-section"><strong><Folder size={16}/>{t('setupFolder')}</strong><code>{sync.folder}</code>{sync.ready&&<button disabled={busy} onClick={()=>{setManage('move');setCustom('');setNotice(null);setError(null)}}>{t('moveTitle')}</button>}</section>
      {sync.lastSuccessAt&&<p>{t('personalLastSync')} · {noteDateTime(sync.lastSuccessAt)}</p>}
      {sync.pending&&<p role="status">{t('notesBackupPending')}</p>}
      {sync.error&&<p role="alert">{sync.error}</p>}
      <button disabled={busy} onClick={()=>void run(sync.enabled?'sync':'resume')}>{t(sync.enabled?'personalSyncNow':'resumeBound')}</button>
      <CaptureAppearance t={t}/>
      {sync.ready&&<footer className="setup-reset"><button disabled={busy||sync.pending} onClick={()=>{setManage('reset');setRepo(DEFAULT_PRIVATE_REPO_NAME);setMode('create');setCustom(null);setRecovery(null);setEditingFolder(false);setPreview(null);setError(null);setNotice(null)}}>{t('resetTitle')}</button><small>{t(sync.pending?'resetPending':'resetFoot')}</small></footer>}
    </>)}
    {busy&&<p role="status">{t('setupWorking')}</p>}
    {notice&&<p role="status">{t(notice)}</p>}
    {error&&(!recovery||error!=='resetLostFolder'||recovery.intent)&&<p role="alert">{t(recovery?.intent&&error==='resetLostFolder'?'resetLocateFailed':error)}</p>}
    {!data&&error&&<button onClick={()=>void run('check')}>{t('setupRecheck')}</button>}
  </div></main>
}
const setupCss = `
.notes-setup{box-sizing:border-box;min-height:0;width:100%;overflow:auto;padding:clamp(16px,4vw,48px);font:14px/1.55 'Segoe UI','Microsoft YaHei',sans-serif;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1)}
.notes-setup-inner{max-width:580px;margin:auto}.notes-setup header,.notes-setup strong{display:flex;align-items:center;gap:10px}.notes-setup header{gap:14px;margin-bottom:18px}
.setup-icon{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:var(--dsw-alias-bg-layer-2)}.notes-setup h2{font-size:24px;margin:0}
.notes-setup small,.notes-setup p,.notes-setup code{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}.notes-setup small{display:block}.notes-setup [role=alert]{color:var(--dsw-alias-label-primary);border-inline-start:3px solid currentColor;padding-inline-start:10px}
.notes-setup .setup-section,.notes-setup fieldset{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;margin:14px 0;padding:16px;display:grid;gap:9px;min-width:0}.notes-setup legend{padding:0 6px}.notes-setup p{margin:8px 0 14px}
.notes-setup button,.notes-setup input{font:inherit;line-height:1.45;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;padding:7px 12px;color:inherit;background:var(--dsw-alias-bg-layer-1)}
.notes-setup button{justify-self:start;cursor:pointer}.notes-setup button:disabled,.notes-setup fieldset:disabled{opacity:.58}.notes-setup label,.setup-folder{display:grid;gap:5px}.notes-setup input{min-width:0;box-sizing:border-box;width:100%}
.notes-setup .setup-primary,.setup-choice:has(input:checked){background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-1)}.setup-modes,.setup-tools{display:flex;gap:8px;flex-wrap:wrap}.setup-tools span{font-size:12px}.setup-folder{margin:6px 0}.notes-setup .setup-choice{display:flex;align-items:center;gap:7px;padding:6px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;cursor:pointer}.setup-choice input{width:auto;accent-color:currentColor}.setup-reset{display:grid;gap:7px;margin-top:32px;padding-top:18px;border-top:1px solid var(--dsw-alias-border-l2)}.notes-setup a{color:inherit;text-decoration:underline}
`
