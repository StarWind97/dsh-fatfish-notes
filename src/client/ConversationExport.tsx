import * as React from 'react'
import { Download, MessageSquare, MessagesSquare, ListChecks } from 'lucide-react'
import type { ConversationExportFormat } from '../contracts/notes.js'
import { downloadConversation, type ConversationFile } from './conversation-download.js'
import { startNoteDownload } from './note-export.js'
import { PaperDialog } from './paper/PaperDialog.js'
import type { T, LocaleKey } from './locale.js'
import type { NoteCaptureBridge, NoteCaptureState } from './note-capture-bridge.js'

const formats:Array<[ConversationExportFormat,string]>=[['markdown','Markdown'],['pdf','PDF'],['png-long',''],['png-pages','']]
export function ConversationExportDialog({state,bridge,t}:{state:NoteCaptureState;bridge:NoteCaptureBridge;t:T}) {
  const options=state.exporting!, selection=state.selection
  const [busy,setBusy]=React.useState(false), [error,setError]=React.useState<LocaleKey|null>(null)
  const [partial,setPartial]=React.useState<ConversationFile|null>(null)
  const active=React.useRef<AbortController|null>(null)
  React.useLayoutEffect(()=>()=>active.current?.abort(),[])
  const ids=selection ? options.range==='session'?selection.messages.map(m=>m.id):options.range==='turn'?selection.defaultMessageIds:state.selected : []
  const reset=()=>{setPartial(null);setError(null)}
  function close(){active.current?.abort();bridge.close()}
  async function run(){
    if(!selection || !ids.length || active.current)return
    if(partial){startNoteDownload(partial);close();return}
    const job=new AbortController();active.current=job;setBusy(true);reset()
    try{
      const file=await downloadConversation({sessionId:state.sessionId,throughSeq:selection.cut.throughSeq,messageIds:ids},options.format,job.signal)
      job.signal.throwIfAborted()
      if(file.warnings.partial || file.warnings.missing || file.warnings.linked)setPartial(file)
      else {startNoteDownload(file);close()}
    }catch(e){
      if(job.signal.aborted)return
      const code=e instanceof Error && 'code' in e ? String(e.code) : ''
      setError(code==='export_overflow'?'chatExportOverflow':code.startsWith('export_table')?'notesExportTableFailed':
        code==='export_conversion_budget'||code==='request_too_large'?'notesExportConversionBudget':
        code.startsWith('export_image')?'notesExportImageFailed':'notesExportFailed')
    }finally{active.current=null;if(!job.signal.aborted)setBusy(false)}
  }
  return <PaperDialog className="chat-export" title={t('chatExportTitle')} closeLabel={t('paperClose')} onClose={close}>
    <div className="chat-export-body">
      {state.status==='loading'?<p role="status">{t('noteLoadingHistory')}</p>:!selection?<p role="alert">{t('chatExportUnavailable')}</p>:<>
        <fieldset disabled={busy}><legend>{t('chatExportRange')}</legend><div className="chat-export-ranges">
          {([['turn','chatExportTurn',MessageSquare],['session','captureWhole',MessagesSquare],['custom','chatExportCustom',ListChecks]] as const).map(([range,label,Icon])=>
            <button type="button" key={range} aria-pressed={options.range===range} onClick={()=>{reset();bridge.exportRange(range)}}><Icon size={15} aria-hidden="true"/>{t(label)}</button>)}
        </div></fieldset>
        <span className="chat-export-count">{t('noteSelectionCount',{count:ids.length})}</span>
        <label>{t('notesExportFormat')}<select value={options.format} disabled={busy} onChange={e=>{reset();bridge.exportFormat(e.target.value as ConversationExportFormat)}}>
          {formats.map(([value,label])=><option key={value} value={value}>{label||t(value==='png-long'?'notesExportLong':'notesExportPages')}</option>)}
        </select></label>
        <p className="chat-export-hint">{t(options.format==='markdown'?'chatExportMarkdownHint':'chatExportFileHint')}</p>
        {!selection.complete && <p role="alert">{t('chatExportPartial')}</p>}
        {partial && <div role="alert">{partial.warnings.missing>0 && <p>{t('chatExportMissing',{count:partial.warnings.missing})}</p>}
          {partial.warnings.linked>0 && <p>{t('chatExportLinked',{count:partial.warnings.linked})}</p>}
          {partial.warnings.partial && selection.complete && <p>{t('chatExportPartial')}</p>}</div>}
        {error && <p role="alert">{t(error)}</p>}
      </>}
    </div><footer><button type="button" onClick={close}>{t('cancel')}</button>
      {state.status==='failed'?<button type="button" onClick={()=>void bridge.openExport(state.sessionId,state.anchorMessageId!)}>{t('noteRetry')}</button>:
      <button type="button" className="chat-export-primary" disabled={busy||!ids.length} onClick={()=>void run()}><Download size={15} aria-hidden="true"/>{t(busy?'notesExportWorking':partial?'chatExportAnyway':'chatExportDownload')}</button>}
    </footer>
  </PaperDialog>
}
