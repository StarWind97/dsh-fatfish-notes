import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import type { NotesController, NotesState } from './notes-controller.js'
import { createNoteDownload, startNoteDownload, type ExportFormat, type ExportOptions } from './note-export.js'
import { PaperDialog } from './paper/PaperDialog.js'
import { notesStyles as s } from './notes-style.js'
import type { T } from './locale.js'

export function NoteExport({ controller, state, t, onClose }: { controller: NotesController; state: NotesState; t: T; onClose:()=>void }) {
  const [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [format, setFormat] = useState<ExportFormat>(state.draft?.assetIds.length?'markdown-zip':'markdown'), [includeSource, setIncludeSource] = useState(false), [width, setWidth] = useState(1080), [pixelRatio, setRatio] = useState(1), [background, setBackground] = useState<ExportOptions['background']>('light'), [assetId, setAssetId] = useState('')
  const [includeTags,setIncludeTags]=useState(true),[includeSummary,setIncludeSummary]=useState(true)
  const hasTags=!!state.draft?.tags.length, hasSummary=!!state.draft?.summary
  const hasImages=!!state.draft?.assetIds.length||(includeSource&&!!state.note?.current.sourceId)
  const group=format.startsWith('markdown')?'markdown':format==='pdf'?'pdf':format==='original'?'original':'png'
  const active = useRef<AbortController | null>(null)
  useEffect(() => { active.current?.abort(); setBusy(false); setStatus(''); setIncludeSource(false); setIncludeTags(true); setIncludeSummary(true); setAssetId('') }, [state.noteId])
  useEffect(() => () => active.current?.abort(), [])
  async function run() {
    if (active.current) active.current.abort()
    const job = new AbortController(); active.current = job; setBusy(true); setStatus('')
    try {
      const frozen = await controller.freezeExport(); job.signal.throwIfAborted()
      if (!frozen) { setStatus('notesExportSaveFirst'); return }
      const file = await createNoteDownload({ noteId: frozen.note.noteId, revision: frozen.note.current.revision }, { format, includeSource, includeTags:hasTags&&includeTags, includeSummary:hasSummary&&includeSummary, width, pixelRatio, background, ...(assetId ? { assetId } : {}) }, job.signal)
      job.signal.throwIfAborted()
      if (!frozen.isCurrent()) { setStatus('notesExportChanged'); return }
      startNoteDownload(file); setStatus('notesExportStarted')
    } catch (error) {
      if (job.signal.aborted) return
      const code = error instanceof Error && 'code' in error ? String(error.code) : ''
      setStatus(code === 'export_overflow' ? 'notesExportOverflow' : code === 'export_conversion_budget' || code === 'request_too_large' ? 'notesExportConversionBudget' : code === 'export_image_unarchived' ? 'notesExportUnarchived' : code.startsWith('export_image') || code === 'note_asset' ? 'notesExportImageFailed' : code.startsWith('export_table') ? 'notesExportTableFailed' : 'notesExportFailed')
    } finally { if (active.current === job) { active.current = null; setBusy(false) } }
  }
  function close() { active.current?.abort(); onClose() }
  return <PaperDialog title={t('paperExportTitle')} closeLabel={t('paperClose')} onClose={close}><div className="paper-dialog-content notes-transfer">
    <p style={s.muted}>{t('notesExportHint')}</p>
    <label style={s.label}>{t('notesExportFormat')}<select style={s.input} value={group} disabled={busy} onChange={e=>{const choice=e.target.value;setFormat(choice==='markdown'?(hasImages?'markdown-zip':'markdown'):choice==='png'?'png-long':choice==='original'?'original':'pdf')}}>
      <option value="markdown">Markdown</option><option value="pdf">PDF</option><option value="png">{t('notesPictures')}</option>{!!state.draft?.assetIds.length&&<option value="original">{t('notesExportOriginal')}</option>}</select></label>
    {(group==='markdown'||group==='png')&&<label style={s.label}>{t('notesExportContents')}<select style={s.input} value={format} disabled={busy} onChange={e=>setFormat(e.target.value as ExportFormat)}>
      {group==='markdown'?<><option value="markdown">{t('notesExportMarkdown')}</option><option value="markdown-zip">{t('notesExportZip')}</option></>:<><option value="png-long">{t('notesExportLong')}</option><option value="png-pages">{t('notesExportPages')}</option></>}</select></label>}
    {format === 'markdown' && <p>{t('notesExportMarkdownHint')}</p>}
    {format !== 'original' && <div className="paper-export-fields">
      <label className="paper-checkbox"><input type="checkbox" checked={hasTags&&includeTags} disabled={busy||!hasTags} onChange={e=>setIncludeTags(e.target.checked)}/>{t('exportIncludeTags')}</label>
      <label className="paper-checkbox"><input type="checkbox" checked={hasSummary&&includeSummary} disabled={busy||!hasSummary} onChange={e=>setIncludeSummary(e.target.checked)}/>{t('exportIncludeSummary')}</label>
    </div>}
    {format === 'original' ? <label style={s.label}>{t('notesExportOriginal')}<select style={s.input} value={assetId} disabled={busy} onChange={e => setAssetId(e.target.value)}><option value="">{t('notesExportChooseImage')}</option>{state.note?.current.assetIds.map((id, index) => <option value={id} key={id}>{t('notesExportImageNumber', { index: index + 1 })} · {id.split('.')[1]}</option>)}</select></label> : state.note?.current.sourceId && <label className="paper-checkbox"><input type="checkbox" checked={includeSource} disabled={busy || !state.note?.current.sourceId} onChange={e => {setIncludeSource(e.target.checked);if(e.target.checked&&format==='markdown')setFormat('markdown-zip')}} />{t('notesExportIncludeSource')}</label>}
    {format.startsWith('png-') && <><label style={s.label}>{t('notesExportWidth')}<select style={s.input} value={width} disabled={busy} onChange={e => setWidth(Number(e.target.value))}>{[720,1080,1440,2160].map(n => <option key={n} value={n}>{n} px</option>)}</select></label><label style={s.label}>{t('notesExportRatio')}<select style={s.input} value={pixelRatio} disabled={busy} onChange={e => setRatio(Number(e.target.value))}><option value={1}>1×</option><option value={2}>2×</option></select></label><label style={s.label}>{t('notesExportBackground')}<select style={s.input} value={background} disabled={busy} onChange={e => setBackground(e.target.value as ExportOptions['background'])}><option value="light">{t('notesExportLight')}</option><option value="dark">{t('notesExportDark')}</option><option value="transparent">{t('notesExportTransparent')}</option></select></label></>}
    {status && <p role="status">{t(status as Parameters<T>[0])}</p>}
  </div><footer><button type="button" onClick={close}>{t(busy?'notesExportCancel':'cancel')}</button><button type="button" className="paper-primary" disabled={busy || state.loadingNote || state.operation || state.composing || !!state.conflict || format === 'original' && !assetId} onClick={() => void run()}>{t(busy ? 'notesExportWorking' : 'notesExportDownload')}</button></footer></PaperDialog>
}
