import {RowMenu} from './RowMenu.js'
import {useItemActions} from './ItemActions.js'
import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { BookOpen, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import type { NotebookView, NotebookRemoval } from '../contracts/notes.js'
import { activeNotebook, sameNamedNotebook, NOTEBOOK_NAME_TAKEN } from '../notes/notebooks.js'
import type { NotesController, NotesState } from './notes-controller.js'
import { PaperDialog } from './paper/PaperDialog.js'
import type { T } from './locale.js'

export function NotebookManager({ controller, state, t, onOpen }: { controller: NotesController; state: NotesState; t: T; onOpen: (notebookId: string) => Promise<void> }) {
  const [title, setTitle] = useState(''), [editing, setEditing] = useState<NotebookView>(), [removing, setRemoving] = useState<NotebookView>()
  const [formOpen, setFormOpen] = useState(false), input = useRef<HTMLInputElement>(null)
  const [removal, setRemoval] = useState<NotebookRemoval>('move'), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const actions=useItemActions(controller,state,t,id=>controller.open(id))
  const books = state.notebooks.filter(activeNotebook), selected = books.find(b => b.isDefault)
  const duplicate=!!sameNamedNotebook(books,title,editing?.notebookId)
  useEffect(() => { if (formOpen) { input.current?.focus(); input.current?.select() } }, [formOpen, editing])
  const closeForm = () => { setFormOpen(false); setTitle(''); setEditing(undefined); setError('') }
  const closeRemoval = () => { if (!busy) { setRemoving(undefined); setError('') } }
  async function run(work: () => Promise<boolean>, done: () => void) {
    if (busy) return
    setBusy(true); setError('')
    try {
      if (await work()) done()
      else {
        const code = controller.getSnapshot().error
        setError(code==='notebook_name_taken'?NOTEBOOK_NAME_TAKEN:code==='note_edit_busy'?t('windowBatchBusy',{count:controller.occupiedCount||1}):code === 'notebook_default' ? t('notesDefaultProtected') : code === 'notebook_contents_changed' || code === 'note_conflict' ? t('notesBookChanged') : t('notesBookFailed'))
        await controller.refresh()
      }
    } finally { setBusy(false) }
  }
  return <section className="paper-other paper-books-page" aria-labelledby="paper-books-title">
    {actions.dialogs}<div className="paper-books-content">
      <header className="paper-books-heading"><div><h2 id="paper-books-title">{t('notesNotebooks')}</h2><p>{t('notesBooksHint')}</p></div>
        <button className="paper-primary" disabled={busy} onClick={() => { setEditing(undefined); setTitle(''); setError(''); setFormOpen(true); input.current?.focus() }}><Plus size={16}/>{t('notesNewBook')}</button>
      </header>
      {formOpen && <form className="paper-book-form" onSubmit={event => { event.preventDefault(); if(!duplicate&&title.trim())void run(() => controller.notebook(title, editing), closeForm) }} onKeyDown={event => { if(event.key === 'Escape' && !busy) { event.preventDefault(); closeForm() } }}>
        <label htmlFor="notebook-name">{t(editing ? 'notesRenameBook' : 'notesNewBook')}</label>
        <div><input ref={input} id="notebook-name" aria-invalid={duplicate||undefined} aria-describedby={duplicate?'notebook-name-error':undefined} autoComplete="off" value={title} disabled={busy} maxLength={240} placeholder={t('notesBookName')} onChange={event => {setTitle(event.target.value);setError('')}}/><button className="paper-primary" disabled={busy || duplicate || !title.trim()} type="submit">{t(editing ? 'notesRenameBook' : 'notesNewBook')}</button><button type="button" disabled={busy} onClick={closeForm}>{t('cancel')}</button></div>
        {duplicate&&<p id="notebook-name-error" role="alert">{NOTEBOOK_NAME_TAKEN}</p>}
      </form>}
      {state.listError && <p role="alert">{t('notesListFailed')} <button disabled={busy || state.loadingList} onClick={() => void controller.refresh()}>{t('refresh')}</button></p>}
      <div className="paper-book-list">{books.map(book => <div className="paper-book-entry" key={book.notebookId}><RowMenu label={book.current.title+' · 操作'} actions={actions.bookActions(book)}>
        <button className="paper-book-open" disabled={busy} title={book.current.title} onClick={() => void onOpen(book.notebookId)}><BookOpen size={21}/><span className="paper-book-name"><strong>{book.current.title}</strong><span className="paper-book-details">{t('notesBookCount', { count: book.noteCount ?? 0 })}{book.isDefault && <span className="paper-book-badge">{t('notesDefaultBadge')}</span>}</span></span></button>
        <div className="paper-book-actions">
          <button disabled={busy} title={t('notesRenameBook')} aria-label={t('notesRenameBookNamed', { title: book.current.title })} onClick={() => { setEditing(book); setTitle(book.current.title); setError(''); setFormOpen(true) }}><Pencil size={16}/></button>
          <button disabled={busy || book.isDefault} title={t(book.isDefault ? 'notesDefaultBadge' : 'notesMakeDefault')} aria-label={t('notesMakeDefaultNamed', { title: book.current.title })} onClick={() => void run(() => controller.notebook(book.current.title, book, false, { makeDefault: true }), () => {})}><Star size={16} fill={book.isDefault ? 'currentColor' : 'none'}/></button>
          <button disabled={busy || book.isDefault} title={t(book.isDefault ? 'notesDefaultProtected' : 'notesRemoveBook')} aria-label={t('notesRemoveBookNamed', { title: book.current.title })} onClick={() => { setRemoving(book); setRemoval('move'); setError('') }}><Trash2 size={16}/></button>
        </div></RowMenu>
      </div>)}</div>
      <p className="paper-book-help">{t('notesDefaultBookHint')}</p>
      {error && !removing && <p role="alert">{error}</p>}
    </div>
    {removing && <PaperDialog title={t('notesRemoveBook')} closeLabel={t('paperClose')} locked={busy} onClose={closeRemoval} className="paper-books-dialog">
      <div className="paper-dialog-content">
        <p className="paper-book-removal-name" title={removing.current.title}>{removing.current.title}</p>
        <p>{t('notesRemoveBookCount', { count: removing.noteCount ?? 0 })}</p>
        <fieldset className="paper-book-choices" disabled={busy}><legend>{t('notesRemoveBookChoice')}</legend>
          <label data-selected={removal === 'move'}><input type="radio" name="book-removal" value="move" checked={removal === 'move'} onChange={() => setRemoval('move')}/><span><strong>{t('notesKeepBookNotes')}</strong><small>{t('notesMoveBookNotesHint', { title: selected?.current.title ?? t('notesDefaultBook') })}</small></span></label>
          <label data-selected={removal === 'trash'}><input type="radio" name="book-removal" value="trash" checked={removal === 'trash'} onChange={() => setRemoval('trash')}/><span><strong>{t('notesTrashBookNotes')}</strong><small>{t('notesTrashBookNotesHint')}</small></span></label>
        </fieldset>
        {removal === 'trash' && <p className="paper-book-danger-hint">{t('notesTrashBookWarning', { count: removing.noteCount ?? 0 })}</p>}
        {error && <p role="alert">{error}</p>}
      </div>
      <footer><button disabled={busy} onClick={closeRemoval}>{t('cancel')}</button><button disabled={busy || !!error} className={removal === 'trash' ? 'paper-book-danger' : 'paper-primary'} onClick={() => void run(() => controller.notebook(removing.current.title, removing, true, { removal, expectedNoteCount: removing.noteCount ?? 0 }), () => { setRemoving(undefined); closeForm() })}>{t(busy ? 'notesBookWorking' : removal === 'trash' ? 'notesConfirmTrashBook' : 'notesConfirmMoveBook')}</button></footer>
    </PaperDialog>}
  </section>
}

export const notebookManagerCss = `
.paper-book-entry>.paper-menu-row{flex:1;min-width:0}
.paper-books-content{width:100%;max-width:880px;margin:0 auto;padding:32px clamp(20px,4cqw,48px) 48px}
.paper-books-page button.paper-primary:not(:disabled):hover{background:var(--accent)}
.paper-books-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:28px}.paper-books-heading h2{font:650 28px/1.4 var(--serif);margin:0 0 5px}.paper-books-heading p{margin:0;font-size:13px;color:var(--muted)}.paper-books-heading>button{flex:none}
:is(.paper-books-page,.paper-books-dialog) button{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:0;border-radius:6px;padding:7px 10px;background:transparent;color:var(--ink);font:inherit;cursor:pointer}:is(.paper-books-page,.paper-books-dialog) button:not(:disabled):hover{background:var(--shelf)}:is(.paper-books-page,.paper-books-dialog) button:disabled{opacity:.35;cursor:default}:is(.paper-books-page,.paper-books-dialog) button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.paper-books-page button.paper-primary{background:var(--ink);color:var(--base)}
.paper-book-form{padding:16px;margin:0 0 20px;background:var(--base);border:1px solid var(--rule);border-radius:9px}.paper-book-form label{font-size:13px;color:var(--muted)}.paper-book-form>div{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}.paper-book-form input{flex:1;min-width:140px;border:1px solid var(--rule);border-radius:6px;padding:8px 10px;background:var(--paper);color:var(--ink)}
.paper-book-list{margin:18px 0}.paper-book-entry{display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--rule)}.paper-books-page button.paper-book-open{min-width:0;flex:1;justify-content:flex-start;text-align:left;padding:10px 8px;gap:16px}.paper-book-open>svg{flex:none;color:var(--accent)}.paper-book-name{min-width:0;flex:1}.paper-book-name strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:16px;font-weight:500}.paper-book-details{display:flex;align-items:center;gap:8px;margin-top:4px;color:var(--muted);font-size:12px}.paper-book-badge{color:var(--accent);background:var(--shelf);border-radius:4px;padding:0 5px}.paper-book-actions{display:flex;gap:4px;flex:none}.paper-book-actions button{padding:8px}
.paper-book-help{font-size:12px;color:var(--muted);line-height:1.8;margin-top:22px}.paper-book-removal-name{font-size:17px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0}
.paper-book-choices{border:0;padding:0;margin:18px 0}.paper-book-choices legend{font-size:13px;color:var(--muted);margin-bottom:8px}.paper-book-choices label{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--rule);padding:12px;border-radius:8px;margin:8px 0;cursor:pointer}.paper-book-choices label[data-selected=true]{border-color:var(--accent);background:var(--paper)}.paper-book-choices input{margin-top:5px;accent-color:var(--accent)}.paper-book-choices strong{font-size:14px;font-weight:500}.paper-book-choices small{display:block;color:var(--muted);margin-top:3px;overflow-wrap:anywhere}.paper-book-danger-hint{color:light-dark(#ad3434,#f3a4a4);font-size:13px}.paper-books-dialog footer .paper-book-danger{background:light-dark(#b83232,#b83e3e);color:#fff}.paper-books-dialog footer .paper-primary{background:var(--ink);color:var(--base)}
@container paper (width < 560px){.paper-books-heading{flex-wrap:wrap;margin-bottom:20px}.paper-books-heading h2{font-size:25px}.paper-book-entry{gap:4px}.paper-books-page button.paper-book-open{gap:10px;padding-inline:0}.paper-book-actions{gap:0}.paper-book-actions button{padding:7px}}
`
