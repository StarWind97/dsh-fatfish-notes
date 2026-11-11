import {TransientNotice} from './TransientNotice.js'
import {PaperDialog} from './paper/PaperDialog.js'
import {DocumentTools} from './paper/DocumentTools.js'
import { activeNotebook } from '../notes/notebooks.js'
import * as React from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Notebook, LockKeyhole, Pencil, ArrowLeft, Download, RotateCcw, Check, ListTree, Trash2, Star, History, Copy, BookTemplate, Search } from 'lucide-react'
import {Backlinks,Highlight,HistoryDialog,ReuseDialog,TagSuggestions} from './NoteTools.js'
import type { CaptureSource, NoteView } from '../contracts/notes.js'
import type { NotesController, NotesState } from './notes-controller.js'
import { api } from './api.js'
import { noteDateTime } from '../notes/date.js'
import { NoteMarkdown, noteAssetUrl } from './NoteMarkdown.js'
import { validCaptureSource } from './notes-validation.js'
import { notesStyles as s } from './notes-style.js'
import type { T } from './locale.js'
import { NoteActions, type NoteAction } from './paper/NoteActions.js'
import { TrashAction } from './paper/TrashAction.js'
import {AttachmentList} from './NoteAttachments.js'
import { NoteExport } from './NoteExport.js'
import { PaperWriting,type UndoSnapshot } from './paper/PaperWriting.js'
import { ChapterOutline } from './paper/ChapterOutline.js'
import { useOutline, type WritingNavigation, type OutlineSession } from './paper/use-outline.js'

function Source({ note, t }: { note: NoteView; t: T }) {
  const [source, setSource] = useState<CaptureSource | null>(null), [failed, setFailed] = useState(false)
  useEffect(() => {
    const controller = new AbortController(); setSource(null); setFailed(false)
    if (note.current.sourceId) void api('/notes/source', { sourceId: note.current.sourceId }, controller.signal).then(result => {
      const v = result.source
      if (!validCaptureSource(v)) throw new Error()
      setSource(v as unknown as CaptureSource)
    }).catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => controller.abort()
  }, [note.current.sourceId])
  if (failed) return <p role="alert">{t('notesSourceFailed')}</p>
  if (!source) return <p role="status">{t('loading')}</p>
  return <section aria-label={t('notesSource')}><p style={s.muted}>{t(source.complete ? 'notesSourceComplete' : 'notePartialSource')}</p>{source.messages.map(message => <article key={message.id} style={s.card}><strong>{message.role === 'user' ? t('messageUser') : 'AI'}</strong>{message.blocks.map((block, index) => block.type === 'text' ? <pre key={index} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', font: 'inherit' }}>{block.text}</pre> : source.assets[block.attachmentId] ? <img key={index} alt={t('noteImage')} src={noteAssetUrl(note, source.assets[block.attachmentId]!, note.current.sourceId!)} style={{ display: 'block', maxWidth: '100%', maxHeight: 500 }} /> : <p key={index}>{t('notesMissingImage')}</p>)}</article>)}{source.archivedMaterials?.filter(m=>!m.imageId||!!m.saved).map(m=><article key={m.id} style={s.card}>{m.assetId?<img loading="lazy" alt={m.name} src={noteAssetUrl(note,m.assetId,note.current.sourceId!)} style={{maxWidth:'100%'}}/>:m.saved?<AttachmentList note={{...note,current:{...note.current,attachments:[m.saved]}}} t={t}/>:<p>{m.name} · {t('materialOmitted')}</p>}</article>)}</section>
}

export function NoteEditor({controller,state,t,onTagClick,outlineSession,onNoteLink,onReturn,onPurge}:{onNoteLink:(id:string)=>void;onReturn:(()=>void)|undefined;onPurge:()=>void;controller:NotesController;state:NotesState;t:T;onTagClick:(tag:string)=>void;outlineSession:React.MutableRefObject<OutlineSession>}) {
  const mode=state.editing?'edit':'read'
  const [panel,setPanel]=useState<'export'|'history'|'template'|null>(null),[tag,setTag]=useState('')
  const [allTags,setAllTags]=useState(false)
  const root=useRef<HTMLElement>(null),anchor=useRef<{pos:number;y:number}|null>(null)
  const [sourceOpen,setSourceOpen]=useState(false),[sourceVisited,setSourceVisited]=useState(false)
  const [moved,setMoved]=useState(false)
  const [cancelOpen,setCancelOpen]=useState(false)
  useEffect(()=>setMoved(false),[state.section,state.filter,state.noteId])
  const scroll=useRef({body:0,source:0}), switching=useRef(false)
  const complete=useRef<(()=>void)|null>(null)
  const writing=useRef<WritingNavigation|null>(null)
  const outline=useOutline({root,body:state.draft?.body??'',editing:state.editing,composing:state.composing,sourceOpen,writing,session:outlineSession})
  useLayoutEffect(()=>{
    if(!switching.current)return
    const pane=root.current?.closest<HTMLElement>('.paper-pane')
    if(pane)pane.scrollTop=sourceOpen?scroll.current.source:scroll.current.body
    switching.current=false
  },[sourceOpen])
  const undo=useRef<UndoSnapshot|null>(null)
  const {draft,note}=state
  const hit=useRef(-1)
  useEffect(()=>{hit.current=-1},[state.filter.query,state.noteId])
  function nextHit(){const marks=root.current?.querySelectorAll<HTMLElement>('.paper-reading mark');if(!marks?.length)return;hit.current=(hit.current+1)%marks.length;marks[hit.current]?.scrollIntoView({block:'center',behavior:'smooth'})}
  useLayoutEffect(()=>{
    if(mode!=='read'||!anchor.current||!root.current)return
    const pane=root.current.closest<HTMLElement>('.paper-pane'),point=anchor.current
    const block=Array.from(root.current.querySelectorAll<HTMLElement>('[data-md-pos]')).reverse().find(el=>Number(el.dataset.mdPos)<=point.pos)
    if(pane && block)pane.scrollTop+=block.getBoundingClientRect().top-point.y
    anchor.current=null
  },[mode])
  if(!draft)return null
  const editable=draft.status==='active'&&!state.loadingNote&&!state.operation&&(!state.editing||controller.writable)
  const status=state.error&&state.error!=='note_unsaved'?'notesSaveFailed':state.saving?'notesSaving':state.dirty?'notesPending':'paperSaved'
  const book=draft.isTemplate?t('reuseTemplates'):state.notebooks.find(b=>b.notebookId===draft.notebookId)?.current.title??state.notebooks.find(b=>b.isDefault)?.current.title??t('notesDefaultBook')
  function edit(target?:HTMLElement){
    if(!root.current||!editable)return
    const pane=root.current.closest<HTMLElement>('.paper-pane')!
    const edge=pane.getBoundingClientRect().top+12
    const block=target?.closest<HTMLElement>('[data-md-pos]')??Array.from(root.current.querySelectorAll<HTMLElement>('[data-md-pos]')).find(el=>el.getBoundingClientRect().bottom>edge)
    anchor.current=block&&pane.scrollTop>5?{pos:Number(block.dataset.mdPos),y:block.getBoundingClientRect().top}:target&&block?{pos:Number(block.dataset.mdPos),y:block.getBoundingClientRect().top}:null
    setPanel(null);controller.beginEdit()
  }
  async function finish(pos:number,y:number){
    if(tag.trim()) addTag()
    // saveEdits publishes read mode before its promise resolves; set the anchor first.
    anchor.current=root.current?.closest<HTMLElement>('.paper-pane')?.scrollTop?{pos,y}:null
    if(!await controller.saveEdits()){anchor.current=null;return}
    setPanel(null);setTag('')
  }
  function addTag() {
    const value=tag.trim(), current=controller.getSnapshot().draft
    if(value && current) controller.update({tags:[...new Set([...current.tags,value])]})
    setTag('')
  }
  function showSource(next:boolean) {
    if(next===sourceOpen)return
    const pane=root.current?.closest<HTMLElement>('.paper-pane')
    if(pane)scroll.current[sourceOpen?'source':'body']=pane.scrollTop
    if(next)setSourceVisited(true)
    switching.current=true;setSourceOpen(next);setPanel(null)
  }
  async function move(trashed:boolean) {
    if(await controller.changeStatus(trashed)) {
      setMoved(trashed);setPanel(null)
      if(!trashed && state.filter.status==='trashed')await controller.selectFilter({order:state.filter.order??'recent'})
    }
  }
  const actions:NoteAction[]=[]
  if(!sourceOpen && editable) {
    if(state.editing) actions.push(
      {label:t('paperSave'),icon:Check,disabled:state.composing,run:()=>complete.current?.()},
      {label:t('cancel'),icon:RotateCcw,disabled:state.composing||controller.importing,run:()=>{if(controller.editChanged)setCancelOpen(true);else void controller.cancelEdits()}})
    else actions.push({label:t('notesEdit'),icon:Pencil,run:()=>edit()})
  }
  if(note && !sourceOpen && !state.editing) actions.push(
    {label:t('notesExport'),icon:Download,run:()=>setPanel('export')},
    ...(draft.status==='active'?[
      {label:t('organizeHistory'),icon:History,menuOnly:true,disabled:state.operation,run:()=>setPanel('history')},
      {label:t('organizeDuplicate'),icon:Copy,menuOnly:true,disabled:state.operation,run:()=>void controller.manage({notes:[{noteId:note.noteId,expectedHeads:note.heads}],action:'duplicate'})},
      ...(!draft.isTemplate?[{label:t('reuseSaveTemplate'),icon:BookTemplate,menuOnly:true,disabled:state.operation,run:()=>setPanel('template')}]:[])
    ]:[]),
    ...(draft.status==='trashed'?[{label:t('notesRestore'),icon:RotateCcw,secondary:true,disabled:state.loadingNote||state.operation||state.saving||!!state.conflict,run:()=>void move(false)}]:[]))
  return <div className="paper-document" data-loading={state.loadingNote} aria-busy={state.loadingNote} data-outline={outline.open&&!sourceOpen?(outline.wide?'pinned':'floating'):'closed'}
    onKeyDown={e=>{if(e.key==='Escape'&&!e.defaultPrevented&&outline.open&&!sourceOpen&&!(e.target as HTMLElement).closest('dialog')){e.preventDefault();outline.close()}}}>
    <header className="paper-doc-head"><div className="paper-command-row"><span className="paper-book"><button className="paper-back" aria-label={t('notesBack')} onClick={()=>void controller.back()}><ArrowLeft size={16}/></button><Notebook size={15}/>{book}</span>
      <>{onReturn&&<button title={t('linkReturn')} aria-label={t('linkReturn')} onClick={onReturn}><ArrowLeft size={16}/></button>}</><NoteActions actions={actions} t={t}>{note&&!sourceOpen&&!state.editing&&draft.status==='active'&&<TrashAction t={t} disabled={state.loadingNote||state.operation||state.saving||!!state.conflict} confirm={()=>move(true)}/>}
        {note&&!sourceOpen&&!state.editing&&draft.status==='trashed'&&<button title={t('batchPurge')} aria-label={t('batchPurge')} onClick={onPurge}><Trash2 size={16}/></button>}{!sourceOpen&&<button ref={outline.trigger} type="button" className="paper-outline-toggle" aria-label={t('paperOutline')} title={t('paperOutline')} aria-expanded={outline.open} aria-controls="paper-chapter-outline" onClick={outline.toggle}><ListTree size={17}/></button>}
        {note&&!sourceOpen&&!state.editing&&draft.status==='active'&&!draft.isTemplate&&<button title={t(draft.favorite?'findUnfavorite':'findFavorite')} aria-label={t(draft.favorite?'findUnfavorite':'findFavorite')} aria-pressed={!!draft.favorite} disabled={state.operation} className="paper-favorite" onClick={()=>void controller.manage({notes:[{noteId:note.noteId,expectedHeads:note.heads}],action:draft.favorite?'unfavorite':'favorite'})}><Star size={16} fill={draft.favorite?'currentColor':'none'}/></button>}
      </NoteActions></div>
      {note?.current.sourceId&&<nav className="paper-views" aria-label={t('paperViews')}>
        <button aria-pressed={!sourceOpen} onClick={()=>showSource(false)}>{t('paperBody')}</button>
        <button aria-pressed={sourceOpen} onClick={()=>showSource(true)}>{t('notesSource')}</button></nav>}
    </header>
    <div className="paper-document-body">
    <div className="paper-pane">
    <section ref={root} className="paper-leaf" aria-label={t('notesDetail')}>
    {cancelOpen&&<PaperDialog title="放弃本次编辑？" closeLabel={t('paperClose')} locked={state.operation} onClose={()=>setCancelOpen(false)}><div className="paper-dialog-content"><p>恢复进入本次编辑前的内容。新建且已保存的笔记将移入回收站，可以恢复。</p></div><footer><button disabled={state.operation} onClick={()=>setCancelOpen(false)}>继续编辑</button><button className="paper-primary" disabled={state.operation} onClick={()=>void controller.cancelEdits().then(ok=>{if(ok){setCancelOpen(false);setTag('');undo.current=null}})}>放弃修改</button></footer></PaperDialog>}
    {panel==='export'&&note&&<NoteExport controller={controller} state={state} t={t} onClose={()=>setPanel(null)}/>}
    {panel==='history'&&note&&<HistoryDialog note={note} controller={controller} t={t} close={()=>setPanel(null)}/>}
    {panel==='template'&&note&&<ReuseDialog mode="template" state={state} controller={controller} t={t} close={()=>setPanel(null)}/>}
    {draft.isTemplate&&<p className="paper-notice">{t('reuseEditingTemplate')}</p>}
    <div hidden={sourceOpen}>
    {mode==='edit'?<input disabled={!editable} className="paper-title-input" aria-label={t('notesTitle')} placeholder={t('notesUntitled')} value={draft.title} onCompositionStart={()=>controller.composition(true)} onCompositionEnd={()=>controller.composition(false)} onChange={e=>controller.update({title:e.target.value})}/>:<h1><Highlight value={draft.title||t('notesUntitled')} query={state.filter.query}/></h1>}
    <div className="paper-meta">
      <span className="paper-stamp"><LockKeyhole size={13}/>{t('paperPrivate')}
        {note&&<time dateTime={note.savedAt} title={t('noteModifiedAt')}>{noteDateTime(note.savedAt)}</time>}
        {state.editing&&<span role="status">{t(status)}</span>}
      </span>
      {!state.editing && draft.tags.length>0&&<div className="paper-tags">
        {(allTags?draft.tags:draft.tags.slice(0,3)).map(value=><button key={value} aria-pressed={state.filter.tag===value} onClick={()=>onTagClick(value)}>#{value}</button>)}
        {draft.tags.length>3&&<button aria-expanded={allTags} onClick={()=>setAllTags(!allTags)}>{allTags?'−':'+'+(draft.tags.length-3)}</button>}
      </div>}
    </div>
    {state.editing&&<aside className="paper-metadata" onCompositionStart={()=>controller.composition(true)} onCompositionEnd={()=>controller.composition(false)}>
      {!draft.isTemplate&&<label style={s.label}>{t('notesNotebook')}<select value={draft.notebookId ?? state.notebooks.find(b=>b.isDefault)?.notebookId ?? ''} disabled={!editable} onChange={e => controller.update({ notebookId: e.target.value || null })}>{state.notebooks.filter(activeNotebook).map(book => <option key={book.notebookId} value={book.notebookId}>{book.current.title}{book.isDefault?` · ${t('notesDefaultBadge')}`:''}</option>)}</select></label>}
      <div className="paper-tag-editor"><span>{t('notesTag')}</span><div className="paper-tag-items">
        {draft.tags.map(value=><button type="button" disabled={!editable} key={value} aria-label={t('notesRemoveTag',{tag:value})} onClick={()=>controller.update({tags:draft.tags.filter(tag=>tag!==value)})}>#{value} ×</button>)}
        <form onSubmit={event=>{event.preventDefault();if(!state.composing)addTag()}}>
          <input value={tag} aria-label={t('notesAddTag')} placeholder={t('notesAddTag')} disabled={!editable} onChange={event=>setTag(event.target.value)} onBlur={event=>{if(!state.composing && tag.trim()&&!(event.relatedTarget as HTMLElement)?.closest('.paper-tag-suggestions'))addTag()}}/>
          <button type="submit" disabled={!editable||!tag.trim()||state.composing}>{t('notesAddTag')}</button>
        </form></div>{editable&&<TagSuggestions value={tag} selected={draft.tags} choose={value=>{controller.update({tags:[...new Set([...draft.tags,value])]});setTag('')}} t={t}/>}</div>
    </aside>}
    {(mode==='edit'||draft.summary)&&<section className="paper-summary" aria-label={t('notesSummary')}>
      <label><span>{t('notesSummary')}</span>{mode==='edit'?<textarea disabled={!editable} aria-label={t('notesSummary')} rows={2} value={draft.summary} placeholder={t('paperSummaryHint')} onCompositionStart={()=>controller.composition(true)} onCompositionEnd={()=>controller.composition(false)} onChange={e=>controller.update({summary:e.target.value})}/>:<p><Highlight value={draft.summary} query={state.filter.query}/></p>}</label>
    </section>}
    {moved&&draft.status==='trashed'&&<TransientNotice identity={state.noteId??'moved'} message={t('paperMoved')} close={()=>setMoved(false)} busy={state.operation} paused={!!state.error} action={()=>void move(false)}/>}
    {draft.status==='trashed'&&<p className="paper-notice">{t('linkTrashed')}</p>}
    {state.error&&<p role="alert" style={s.error}>{t(['note_edit_busy','note_edit_lost','window_expired','notebook_busy'].includes(state.error)?'windowEditBusy':['note_deleted','note_not_found'].includes(state.error)?'linkDeleted':state.error==='note_unsaved'?'paperLeaveDraft':state.error==='note_conflict'?'notesConflictHint':state.error==='note_asset'?'notesImageHint':state.error==='note_limit'?'notesLimit':'notesSaveFailureHint')}</p>}
    {state.conflict && <section style={s.card} aria-label={t('notesConflict')}><h3>{t('notesConflict')}</h3><p>{t('notesConflictHint')}</p>{[state.conflict.current, ...state.conflict.conflicts].map((revision, i) => <details key={revision.revision}><summary>{t('notesVersion', { index: i + 1 })} · {revision.title} · {t(revision.status === 'trashed' ? 'notesTrash' : 'notesActive')}</summary><p>{revision.summary}</p><p>{revision.tags.join(' · ')}</p><pre style={s.markdown}>{revision.body}</pre><button type="button" style={s.button} disabled={state.operation || state.loadingNote} onClick={() => { controller.chooseRevision(revision); controller.beginEdit() }}>{t('notesUseVersion')}</button></details>)}<p>{t('notesResolveHint')}</p><button type="button" style={s.button} disabled={state.operation || state.loadingNote || state.composing} onClick={() => void controller.resolve()}>{t('notesResolve')}</button></section>}
    {mode==='edit'&&draft.status==='active'?<PaperWriting controller={controller} state={state} t={t} start={anchor.current?.pos??0} anchorY={anchor.current?.y} undo={undo} complete={complete} navigation={writing} done={(pos,y)=>void finish(pos,y)}/>
      :<article className="paper-reading" onDoubleClick={e=>{if(!(e.target as HTMLElement).closest('a,button,input'))edit(e.target as HTMLElement)}}>
      {state.filter.query&&<button className="paper-search-jump" onClick={nextHit}><Search size={14}/>{t('findNextMatch')}</button>}
      {note?<NoteMarkdown t={t} body={draft.body} note={note} onNoteLink={onNoteLink} query={state.filter.query}/>:<p>{draft.body}</p>}
      {note&&<AttachmentList note={note} t={t}/>}
      {note&&!draft.isTemplate&&<Backlinks note={note} t={t} open={onNoteLink}/>}
      {editable&&<button onClick={()=>edit()}><Pencil size={14}/> {t('notesEdit')}</button>}</article>}
    </div>
    {sourceVisited&&note&&<div hidden={!sourceOpen} className="paper-source"><h1>{draft.title||t('notesUntitled')}</h1><Source note={note} t={t}/></div>}
  </section>
  </div>
  {outline.open&&!sourceOpen&&<ChapterOutline headings={outline.headings} active={outline.active} onJump={outline.jump} panel={outline.panel} busy={outline.busy} t={t}/>}
  {!sourceOpen&&<button ref={outline.edge} type="button" className="paper-outline-edge" aria-label={t(outline.open?'paperOutlineClose':'paperOutlineOpen')} title={t(outline.open?'paperOutlineClose':'paperOutlineOpen')} aria-expanded={outline.open} aria-controls="paper-chapter-outline" onClick={outline.open?outline.close:outline.toggle}>
    <svg width="16" height="44" viewBox="0 0 16 44" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M1 1 7 22 1 43 M9 1 15 22 9 43"/></svg>
  </button>}
  </div>
  {!sourceOpen&&<DocumentTools body={draft.body} t={t}/>}
  </div>
}
