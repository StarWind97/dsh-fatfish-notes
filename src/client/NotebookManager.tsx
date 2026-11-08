import * as React from 'react'
import { useState } from 'react'
import { BookOpen, Pencil, Star, Trash2 } from 'lucide-react'
import type { NotebookView, NotebookRemoval } from '../contracts/notes.js'
import { activeNotebook } from '../notes/notebooks.js'
import type { NotesController, NotesState } from './notes-controller.js'
import { PaperDialog } from './paper/PaperDialog.js'
import type { T } from './locale.js'

export function NotebookManager({ controller, state, t, onClose }: { controller: NotesController; state: NotesState; t: T; onClose: () => void }) {
  const [title, setTitle] = useState(''), [editing, setEditing] = useState<NotebookView>(), [removing, setRemoving] = useState<NotebookView>()
  const [removal, setRemoval] = useState<NotebookRemoval>('move'), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const books = state.notebooks.filter(activeNotebook), selected = books.find(b => b.isDefault)
  const close = () => { if (!busy) { if (removing) { setRemoving(undefined); setError('') } else onClose() } }
  async function run(work: () => Promise<boolean>, done: () => void) {
    if (busy) return
    setBusy(true); setError('')
    try {
      if (await work()) done()
      else {
        const code = controller.getSnapshot().error
        setError(code === 'notebook_default' ? t('notesDefaultProtected') : code === 'notebook_contents_changed' || code === 'note_conflict' ? t('notesBookChanged') : t('notesBookFailed'))
        await controller.refresh()
      }
    } finally { setBusy(false) }
  }
  return <PaperDialog title={t(removing ? 'notesRemoveBook' : 'notesManageBooks')} closeLabel={t('paperClose')} locked={busy} onClose={close} className="paper-books-dialog">
    <div className="paper-dialog-content">
      {removing ? <>
        <p className="paper-book-removal-name" title={removing.current.title}>{removing.current.title}</p>
        <p>{t('notesRemoveBookCount', { count: removing.noteCount ?? 0 })}</p>
        <fieldset className="paper-book-choices" disabled={busy}><legend>{t('notesRemoveBookChoice')}</legend>
          <label data-selected={removal === 'move'}><input type="radio" name="book-removal" value="move" checked={removal === 'move'} onChange={() => setRemoval('move')}/><span><strong>{t('notesKeepBookNotes')}</strong><small>{t('notesMoveBookNotesHint', { title: selected?.current.title ?? t('notesDefaultBook') })}</small></span></label>
          <label data-selected={removal === 'trash'}><input type="radio" name="book-removal" value="trash" checked={removal === 'trash'} onChange={() => setRemoval('trash')}/><span><strong>{t('notesTrashBookNotes')}</strong><small>{t('notesTrashBookNotesHint')}</small></span></label>
        </fieldset>
        {removal === 'trash' && <p className="paper-book-danger-hint">{t('notesTrashBookWarning', { count: removing.noteCount ?? 0 })}</p>}
      </> : <>
        <form className="paper-book-form" onSubmit={event => { event.preventDefault(); void run(() => controller.notebook(title, editing), () => { setTitle(''); setEditing(undefined) }) }}>
          <label htmlFor="notebook-name">{t(editing ? 'notesRenameBook' : 'notesNewBook')}</label>
          <div><input id="notebook-name" autoComplete="off" value={title} disabled={busy} maxLength={240} placeholder={t('notesBookName')} onChange={event => setTitle(event.target.value)}/><button disabled={busy || !title.trim()} type="submit">{t(editing ? 'notesRenameBook' : 'notesNewBook')}</button>{editing && <button type="button" disabled={busy} onClick={() => { setEditing(undefined); setTitle('') }}>{t('cancel')}</button>}</div>
        </form>
        <div className="paper-book-list">{books.map(book => <div className="paper-book-entry" key={book.notebookId}>
          <BookOpen size={17}/><div className="paper-book-name"><strong title={book.current.title}>{book.current.title}</strong><small>{t('notesBookCount', { count: book.noteCount ?? 0 })}{book.isDefault && <span className="paper-book-badge">{t('notesDefaultBadge')}</span>}</small></div>
          <button disabled={busy} title={t('notesRenameBook')} aria-label={t('notesRenameBookNamed', { title: book.current.title })} onClick={() => { setEditing(book); setTitle(book.current.title); setError('') }}><Pencil size={15}/></button>
          <button disabled={busy || book.isDefault} title={t(book.isDefault ? 'notesDefaultBadge' : 'notesMakeDefault')} aria-label={t('notesMakeDefaultNamed', { title: book.current.title })} onClick={() => void run(() => controller.notebook(book.current.title, book, false, { makeDefault: true }), () => {})}><Star size={15} fill={book.isDefault ? 'currentColor' : 'none'}/></button>
          <button disabled={busy || book.isDefault} title={t(book.isDefault ? 'notesDefaultProtected' : 'notesRemoveBook')} aria-label={t('notesRemoveBookNamed', { title: book.current.title })} onClick={() => { setRemoving(book); setRemoval('move'); setError('') }}><Trash2 size={15}/></button>
        </div>)}</div>
        <p className="paper-book-help">{t('notesDefaultBookHint')}</p>
      </>}
      {error && <p role="alert">{error}</p>}
    </div>
    <footer><button disabled={busy} onClick={close}>{t(removing ? 'cancel' : 'paperClose')}</button>{removing && <button disabled={busy || !!error} className={removal === 'trash' ? 'paper-book-danger' : 'paper-primary'} onClick={() => void run(() => controller.notebook(removing.current.title, removing, true, { removal, expectedNoteCount: removing.noteCount ?? 0 }), () => { setRemoving(undefined); setEditing(undefined); setTitle('') })}>{t(busy ? 'notesBookWorking' : removal === 'trash' ? 'notesConfirmTrashBook' : 'notesConfirmMoveBook')}</button>}</footer>
  </PaperDialog>
}

export const notebookManagerCss = `
.paper-books-dialog .paper-dialog-content{padding:20px 24px}
.paper-books-dialog button{border:0;border-radius:6px;padding:7px 10px;background:transparent;color:var(--ink);font:inherit;cursor:pointer}.paper-books-dialog button:not(:disabled):hover{background:var(--shelf)}.paper-books-dialog button:disabled{opacity:.35;cursor:default}.paper-books-dialog button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.paper-books-dialog .paper-book-form button[type=submit]{background:var(--ink);color:var(--base)}
.paper-book-form label{font-size:13px;color:var(--muted)}.paper-book-form>div{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}.paper-book-form input{flex:1;min-width:140px;border:1px solid var(--rule);border-radius:6px;padding:8px 10px;background:var(--paper);color:var(--ink)}
.paper-book-list{margin:18px 0}.paper-book-entry{display:flex;gap:10px;align-items:center;padding:12px 0;border-bottom:1px solid var(--rule)}.paper-book-entry>svg{flex:none;color:var(--muted)}.paper-book-entry>button{padding:6px!important;flex:none}.paper-book-name{min-width:0;flex:1}.paper-book-name strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500}.paper-book-name small{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:12px}.paper-book-badge{color:var(--accent);background:var(--shelf);border-radius:4px;padding:0 5px}
.paper-book-help{font-size:12px;color:var(--muted)}.paper-book-removal-name{font-size:17px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0}
.paper-book-choices{border:0;padding:0;margin:18px 0}.paper-book-choices legend{font-size:13px;color:var(--muted);margin-bottom:8px}.paper-book-choices label{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--rule);padding:12px;border-radius:8px;margin:8px 0;cursor:pointer}.paper-book-choices label[data-selected=true]{border-color:var(--accent);background:var(--paper)}.paper-book-choices input{margin-top:5px;accent-color:var(--accent)}.paper-book-choices strong{font-size:14px;font-weight:500}.paper-book-choices small{display:block;color:var(--muted);margin-top:3px;overflow-wrap:anywhere}.paper-book-danger-hint{color:light-dark(#ad3434,#f3a4a4);font-size:13px}.paper-books-dialog footer .paper-book-danger{background:light-dark(#b83232,#b83e3e);color:#fff}.paper-books-dialog footer .paper-primary{background:var(--ink);color:var(--base)}
`
