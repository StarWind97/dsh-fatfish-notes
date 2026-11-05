import * as React from 'react'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { NotesController, NotesState } from './notes-controller.js'
import { NoteBackupStatus } from './NoteBackupStatus.js'
import { noteDateTime } from '../notes/date.js'
import { NoteEditor } from './NoteEditor.js'
import { SettingsPage } from './SettingsPage.js'
import { FeedbackLink, feedbackCss } from './FeedbackLink.js'
import { notesStyles as s, notesCss } from './notes-style.js'
import { BookOpen, ChevronDown, SquarePen, Search, SlidersHorizontal, ArrowDownUp, Trash2, ArrowLeft, X } from 'lucide-react'
import { PaperColumns,readPreference,writePreference } from './paper/layout.js'
import { paperCss } from './paper/style.js'
import type { OutlineSession } from './paper/use-outline.js'
import type { T } from './locale.js'

export function NotesPage({ controller, t }: { controller: NotesController; t: T }) {
  const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot)
  const [query,setQuery]=useState(state.filter.query??''),[tag,setTag]=useState(state.filter.tag??'')
  const [booksOpen,setBooksOpen]=useState(false),[bookName,setBookName]=useState(''),[editingBook,setEditingBook]=useState<string|null>(null)
  const [full,setFull]=useState(()=>readPreference('width')==='full')
  const app=useRef<HTMLDivElement>(null)
  const outlineSession=useRef<OutlineSession>({wide:null,open:false})
  const choose=(filter:NotesState['filter'])=>controller.selectFilter(filter,(app.current?.clientWidth??560)>=560)
  const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined)
  useEffect(()=>{void controller.initialize(readPreference('last'),readPreference('order')==='oldest'?'oldest':'recent');return()=>{clearTimeout(timer.current);void controller.leave()}},[controller])
  useEffect(()=>{if(state.note?.current.status==='active')writePreference('last',state.note.noteId)},[state.note?.noteId,state.note?.current.status])
  useEffect(()=>{setQuery(state.filter.query??'');setTag(state.filter.tag??'')},[state.filter.query,state.filter.tag])
  useEffect(()=>{
    if(!state.noteId||state.section!=='notes')return
    const id=setInterval(()=>{if(document.visibilityState!=='hidden')void controller.pollJobs()},2500)
    return()=>clearInterval(id)
  },[controller,state.noteId,state.section])
  const pulled=useCallback(()=>{void controller.refresh(true,true)},[controller])
  const activeBooks=state.notebooks.filter(b=>b.current.status==='active')
  function search(value:string){setQuery(value);clearTimeout(timer.current);timer.current=setTimeout(()=>void choose({...controller.getSnapshot().filter,query:value}),220)}
  function filterTag(value?:string) {
    clearTimeout(timer.current)
    const {tag:previous,...rest}=controller.getSnapshot().filter
    void choose({...rest,query,...(value && value!==previous ? {tag:value} : {})})
  }
  async function create(){clearTimeout(timer.current);await controller.create()}
  const inTrash=state.filter.status==='trashed'
  const previousFilter=useRef<NotesState['filter']>({})
  function toggleTrash() {
    clearTimeout(timer.current);setBooksOpen(false)
    if(!inTrash)previousFilter.current=state.filter
    const order=state.filter.order??'recent'
    void choose(inTrash?{...previousFilter.current,order}:{status:'trashed',order})
  }
  const list=<><div className="paper-list-scroll"><div className="paper-list-head">{inTrash?<strong className="paper-trash-title">{t('notesTrash')}</strong>:<label className="paper-picker"><select aria-label={t('notesNotebook')} value={state.filter.notebookId===undefined?'all':state.filter.notebookId??''} onChange={e=>{
    clearTimeout(timer.current);const option=e.target.value,{notebookId:ignored,...rest}=state.filter
    void choose(option==='all'?{...rest,query}:{...rest,query,notebookId:option||null})
  }}><option value="all">{t('paperAll')}</option><option value="">{t('notesUnfiled')}</option>{activeBooks.map(book=><option key={book.notebookId} value={book.notebookId}>{book.current.title}</option>)}</select><ChevronDown size={14}/></label>}
      {!inTrash&&<button title={t('notesNew')} aria-label={t('notesNew')} disabled={state.loadingNote||state.saving||state.operation||(state.loadingList&&!state.items.length)} onClick={()=>void create()}><SquarePen size={17}/></button>}</div>
    <div className="paper-search"><Search size={16}/><input aria-label={t('notesSearch')} type="search" placeholder={t('notesSearch')} value={query} onChange={e=>search(e.target.value)}/>
      <button aria-label={t('paperFilter')} title={t('paperFilter')} aria-expanded={booksOpen} onClick={()=>setBooksOpen(!booksOpen)}><SlidersHorizontal size={15}/></button></div>
    {state.filter.tag&&<button className="paper-filter-chip" aria-label={t('notesClearTag',{tag:state.filter.tag})} onClick={()=>filterTag()}>
      <span>{t('notesFilterTag',{tag:state.filter.tag})}</span><X size={13} aria-hidden="true"/>
    </button>}
    <label className="paper-order"><ArrowDownUp size={14}/><select aria-label={t('paperSort')} value={state.filter.order??'recent'} onChange={e=>{
      const order=e.target.value==='oldest'?'oldest':'recent'
      clearTimeout(timer.current);writePreference('order',order);void choose({...state.filter,query,order})
    }}><option value="recent">{t('paperRecent')}</option><option value="oldest">{t('paperOldest')}</option></select></label>
    {booksOpen&&<div className="paper-controls"><form onSubmit={e=>{e.preventDefault();void choose({...state.filter,query,tag})}}><label>{t('notesTag')}<input value={tag} onChange={e=>setTag(e.target.value)}/></label><button>{t('notesSearchAction')}</button></form>
      <button onClick={()=>void controller.refresh(true,true)}>{t('refresh')}</button></div>}
        {booksOpen && !inTrash && <section style={s.card}><form onSubmit={e => { e.preventDefault(); void controller.notebook(bookName, state.notebooks.find(b => b.notebookId === editingBook)).then(ok => { if (ok) { setBookName(''); setEditingBook(null) } }) }}><label style={s.label}>{t('notesBookName')}<input style={s.input} value={bookName} onChange={e => setBookName(e.target.value)} /></label><button type="submit" style={s.button} disabled={!bookName.trim()}>{t(editingBook ? 'notesRenameBook' : 'notesNewBook')}</button>{editingBook && <button type="button" style={s.button} onClick={() => { setEditingBook(null); setBookName('') }}>{t('cancel')}</button>}</form>{activeBooks.map(book => <div key={book.notebookId} style={{ ...s.row, marginTop: 8 }}><span>{book.current.title}</span><button type="button" style={s.button} onClick={() => { setEditingBook(book.notebookId); setBookName(book.current.title) }}>{t('notesRenameBook')}</button><button type="button" style={s.button} onClick={() => void controller.notebook(book.current.title, book, true)}>{t('notesRemoveBook')}</button></div>)}<p style={s.muted}>{t('notesRemoveBookHint')}</p></section>}
    {state.listError&&<p role="alert">{t('notesListFailed')}</p>}
    {!state.loadingList&&!state.items.length&&<p className="paper-hint">{t(state.filter.status==='trashed'?'notesEmptyTrash':'notesEmpty')}</p>}
    <div className="paper-rows">{state.items.map((item,i)=>{
      const date=noteDateTime(item.savedAt).slice(0,10),showDate=!i||noteDateTime(state.items[i-1]!.savedAt).slice(0,10)!==date
      return <React.Fragment key={item.noteId}>{showDate&&<p className="paper-date">{date}</p>}<button className="paper-row" aria-current={item.noteId===state.noteId?'true':undefined} onClick={()=>{clearTimeout(timer.current);void controller.open(item.noteId)}}>
        <strong>{item.title||t('notesUntitled')}</strong>{(item.excerpt||item.summary)&&<span>{item.excerpt||item.summary}</span>}<small>{item.conflicted?t('notesConflict'):activeBooks.find(b=>b.notebookId===item.notebookId)?.current.title??t('notesUnfiled')}</small>
      </button></React.Fragment>
    })}</div>{state.cursor&&<button disabled={state.loadingList} onClick={()=>void controller.refresh(false)}>{t('notesMore')}</button>}</div><footer className="paper-list-foot"><button onClick={toggleTrash}>{inTrash?<ArrowLeft size={16}/>:<Trash2 size={16}/>} {t(inTrash?'paperBackLibrary':'notesTrash')}</button></footer></>
  return <div ref={app} className="paper-app" data-full={full}><style>{notesCss+paperCss+feedbackCss}</style>
    <header className="paper-top"><strong><BookOpen size={20}/>{t('nav')}</strong><nav aria-label={t('notesNavigation')}>{(['notes','settings'] as const).map(section=><button key={section} aria-pressed={state.section===section} onClick={()=>{clearTimeout(timer.current);void controller.navigate(section)}}>{t(section==='notes'?'notesLibrary':'notesSettings')}</button>)}</nav>
    {state.section==='notes'&&<><div className="paper-width" role="group" aria-label={t('paperWidth')}>{[false,true].map(value=><button key={String(value)} aria-pressed={full===value} onClick={()=>{setFull(value);writePreference('width',value?'full':'standard')}}>{t(value?'paperFull':'paperStandard')}</button>)}</div><div className="paper-backup"><NoteBackupStatus onSettings={()=>void controller.navigate('settings')} t={t} onPulled={pulled} dirty={state.dirty} saving={state.saving} revision={state.note?.current.revision}/></div></>}<FeedbackLink t={t}/></header>
    {state.section==='settings'?<div className="paper-other" style={s.page}><h2>{t('notesSettings')}</h2><SettingsPage t={t} showFeedback={false}/></div>:
    <PaperColumns t={t} selected={!!state.draft} list={list}>
      {state.draft?<NoteEditor outlineSession={outlineSession} onTagClick={filterTag} key={state.noteId} state={state} controller={controller} t={t}/>:<div className="paper-empty"><BookOpen size={32}/><h2>{t(inTrash?'notesTrash':'notesWelcome')}</h2><p>{t(inTrash?'notesEmptyTrash':'notesEmptyHint')}</p>{!inTrash&&<button className="paper-primary" onClick={()=>void create()}>{t('notesNew')}</button>}</div>}
      {(state.loadingNote||state.listError||(!state.draft&&state.error))&&<p role="status">{t(state.loadingNote?'loading':'notesOpenFailed')}</p>}
    </PaperColumns>}
  </div>
}
