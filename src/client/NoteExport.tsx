import {readingAppearance} from './note-reading-image.js'
import type {CaptureSource} from '../contracts/notes.js'
import {NoteMaterialChoices,noteMaterials} from './NoteMaterialChoices.js'
import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import type { NotesController, NotesState } from './notes-controller.js'
import { createNoteDownload, startNoteDownload, type ExportFormat, type ExportOptions } from './note-export.js'
import { PaperDialog } from './paper/PaperDialog.js'
import { notesStyles as s } from './notes-style.js'
import type { T } from './locale.js'

export function NoteExport({ controller, state, t, onClose, onDownloaded, freeze,readingElement,allTags=false }: { controller: NotesController; state: NotesState; t: T; onClose:()=>void;onDownloaded:()=>void; readingElement?:HTMLElement|null;allTags?:boolean;freeze?:()=>ReturnType<NotesController['freezeExport']> }) {
  const [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [format, setFormat] = useState<ExportFormat>((state.draft?.assetIds.length||state.draft?.attachments?.length)?'markdown-zip':'markdown'), [includeSource, setIncludeSource] = useState(false), [width, setWidth] = useState(readingElement?0:740), [pixelRatio, setRatio] = useState(1), [background, setBackground] = useState<ExportOptions['background']>('current'), [assetId, setAssetId] = useState('')
  const [includeTags,setIncludeTags]=useState(true),[includeSummary,setIncludeSummary]=useState(true)
  const [selected,setSelected]=useState(()=>noteMaterials(state.draft??undefined).map(m=>m.id))
  const [source,setSource]=useState<CaptureSource|null>(null),[sourceFailed,setSourceFailed]=useState(false)
  useEffect(()=>{setSource(null);setSourceFailed(false);if(!includeSource||!state.note?.current.sourceId)return;let live=true;void controller.api('/notes/source',{sourceId:state.note.current.sourceId}).then(r=>{if(!live)return;const value=r.source as unknown as CaptureSource;setSource(value);setSelected(old=>[...new Set([...old,...Object.values(value.assets??{}).map(id=>'image:'+id),...(value.archivedMaterials??[]).flatMap(m=>m.assetId?['image:'+m.assetId]:m.saved?['file:'+m.saved.id]:[])])])}).catch(()=>{if(live)setSourceFailed(true)});return()=>{live=false}},[includeSource,state.noteId,state.note?.current.sourceId])
  const materials=[...new Map([...noteMaterials(state.draft??undefined),...(includeSource&&source?noteMaterials({...state.draft!,supplements:{assetIds:Object.values(source.assets),attachmentIds:source.archivedMaterials?.flatMap(m=>m.saved?[m.saved.id]:[])??[]},assetIds:[...new Set([...Object.values(source.assets),...(source.archivedMaterials??[]).flatMap(m=>m.assetId?[m.assetId]:[])])],attachments:source.archivedMaterials?.flatMap(m=>m.saved?[m.saved]:[])??[]}):[])].map(m=>[m.id,m])).values()]
  const activeImages=materials.filter(m=>m.image).map(m=>m.id.slice(6))
  const hasTags=!!state.draft?.tags.length, hasSummary=!!state.draft?.summary
  const hasImages=!!state.draft?.attachments?.length||!!state.draft?.assetIds.length||(includeSource&&!!state.note?.current.sourceId)
  const group=format.startsWith('markdown')?'markdown':format==='pdf'?'pdf':format==='original'?'original':'png'
  const hasReadingWidth=!!readingElement?.isConnected&&readingElement.getClientRects().length>0
  const exportWidth=width===0&&!hasReadingWidth?740:width
  const active = useRef<AbortController | null>(null)
  useEffect(() => { active.current?.abort(); setBusy(false); setStatus(''); setIncludeSource(false); setIncludeTags(true); setIncludeSummary(true); setAssetId('');setSelected(noteMaterials(state.draft??undefined).map(m=>m.id)) }, [state.noteId])
  useEffect(() => () => active.current?.abort(), [])
  async function run() {
    if (active.current) return
    const job = new AbortController(); active.current = job; setBusy(true); setStatus('')
    try {
      const appearance=readingAppearance(readingElement,allTags),contentWidth=exportWidth||readingElement?.getBoundingClientRect().width||740
      const frozen = await (freeze?freeze():controller.freezeExport()); job.signal.throwIfAborted()
      if (!frozen) { setStatus('notesExportSaveFirst'); return }
      const file = await createNoteDownload({ noteId: frozen.note.noteId, revision: frozen.note.current.revision }, { format:format.startsWith('markdown')?(selected.length||includeSource?'markdown-zip':'markdown'):format,assetIds:materials.filter(m=>m.image&&selected.includes(m.id)).map(m=>m.id.slice(6)),attachmentIds:materials.filter(m=>!m.image&&selected.includes(m.id)).map(m=>m.id.slice(5)), includeSource, includeTags:hasTags&&includeTags, includeSummary:hasSummary&&includeSummary, width:contentWidth, pixelRatio, background,appearance, ...(assetId ? { assetId } : {}) }, job.signal)
      job.signal.throwIfAborted()
      if (!frozen.isCurrent()) { setStatus('notesExportChanged'); return }
      startNoteDownload(file); active.current = null; onDownloaded()
    } catch (error) {
      if (job.signal.aborted) return
      const code = error instanceof Error && 'code' in error ? String(error.code) : ''
      setStatus(code === 'export_reading_width' ? 'notesExportReadingWidth' : code==='notebook_changed' ? 'notesExportChanged' : code === 'export_overflow' ? 'notesExportOverflow' : code === 'export_conversion_budget' || code === 'request_too_large' ? 'notesExportConversionBudget' : code === 'export_image_unarchived' ? 'notesExportUnarchived' : code.startsWith('export_image') || code === 'note_asset' ? 'notesExportImageFailed' : code.startsWith('export_table') ? 'notesExportTableFailed' : 'notesExportFailed')
    } finally { if (active.current === job) { active.current = null; setBusy(false) } }
  }
  function close() { active.current?.abort(); onClose() }
  return <PaperDialog title={t('paperExportTitle')} closeLabel={t('paperClose')} onClose={close}><div className="paper-dialog-content notes-transfer">
    <p style={s.muted}>{t('notesExportHint')}</p>
    <label style={s.label}>{t('notesExportFormat')}<select style={s.input} value={group} disabled={busy} onChange={e=>{const choice=e.target.value;setFormat(choice==='markdown'?(hasImages?'markdown-zip':'markdown'):choice==='png'?'png-long':choice==='original'?'original':'pdf')}}>
      <option value="markdown">Markdown</option><option value="png">{t('notesPictures')}</option><option value="pdf">PDF</option>{!!activeImages.length&&<option value="original">{t('notesExportOriginal')}</option>}</select></label>
    {group==='markdown'&&<p>{t('exportAutoBundle')}</p>}
    {format!=='original'&&<><NoteMaterialChoices rows={materials} selected={selected} change={setSelected} disabled={busy} t={t}/><p>{t(group==='markdown'?'exportFilesBundle':'exportVisualFiles')}</p></>}
    {format !== 'original' && <div className="paper-export-fields">
      <label className="paper-checkbox"><input type="checkbox" checked={hasTags&&includeTags} disabled={busy||!hasTags} onChange={e=>setIncludeTags(e.target.checked)}/>{t('exportIncludeTags')}</label>
      <label className="paper-checkbox"><input type="checkbox" checked={hasSummary&&includeSummary} disabled={busy||!hasSummary} onChange={e=>setIncludeSummary(e.target.checked)}/>{t('exportIncludeSummary')}</label>
    </div>}
    {format === 'original' ? <label style={s.label}>{t('notesExportOriginal')}<select style={s.input} value={assetId} disabled={busy} onChange={e => setAssetId(e.target.value)}><option value="">{t('notesExportChooseImage')}</option>{activeImages.map((id, index) => <option value={id} key={id}>{t('notesExportImageNumber', { index: index + 1 })} · {id.split('.')[1]}</option>)}</select></label> : state.note?.current.sourceId && <label className="paper-checkbox"><input type="checkbox" checked={includeSource} disabled={busy || !state.note?.current.sourceId} onChange={e => {setIncludeSource(e.target.checked);if(e.target.checked&&format==='markdown')setFormat('markdown-zip')}} />{t('notesExportIncludeSource')}</label>}
    {format==='png-long' && <><label style={s.label}>{t('notesExportWidth')}<select style={s.input} value={exportWidth} disabled={busy} onChange={e => setWidth(Number(e.target.value))}>{hasReadingWidth&&<option value={0}>{t('notesExportCurrentWidth')}</option>}<option value={740}>{t('notesExportDefaultWidth')}</option>{[720,1080,1440,2160].map(n => <option key={n} value={n}>{n} px</option>)}</select></label><label style={s.label}>{t('notesExportRatio')}<select style={s.input} value={pixelRatio} disabled={busy} onChange={e => setRatio(Number(e.target.value))}><option value={1}>1×</option><option value={2}>2×</option></select></label><label style={s.label}>{t('notesExportBackground')}<select style={s.input} value={background} disabled={busy} onChange={e => setBackground(e.target.value as ExportOptions['background'])}><option value="current">{t('notesExportCurrentTheme')}</option><option value="light">{t('notesExportLight')}</option><option value="dark">{t('notesExportDark')}</option><option value="transparent">{t('notesExportTransparent')}</option></select></label></>}
    {group==='png'&&<p>{t('notesExportScreenshotHint')}</p>}
    {sourceFailed&&<p role="alert">{t('notesExportFailed')}</p>}
    {status && <p role="status">{t(status as Parameters<T>[0])}</p>}
  </div><footer><button type="button" onClick={close}>{t(busy?'notesExportCancelGeneration':'cancel')}</button><button type="button" className="paper-primary" disabled={busy || (includeSource&&!source) || state.loadingNote || state.operation || state.composing || !!state.conflict || format === 'original' && !assetId} onClick={() => void run()}>{t(busy ? 'notesExportWorking' : 'notesExportDownload')}</button></footer></PaperDialog>
}
