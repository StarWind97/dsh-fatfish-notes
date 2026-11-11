import {materialsFor} from '../notes/capture-materials.js'
import {ATTACHMENT_LIMIT,ATTACHMENT_WARNING} from '../contracts/notes.js'
import { api, currentRepository, type Api } from './api.js'
import type { CaptureProgress, CaptureRequest, CaptureResult, ConversationExportFormat, NoteView, NoteJob } from '../contracts/notes.js'

import { indexCaptureTurns, type IndexedSelection } from './capture-turns.js'

export interface CaptureRecovery { request: CaptureRequest; error: string | null }
export interface NoteCaptureState {
  progress?:CaptureProgress; minimized?:boolean
  materialIds?:string[];allowLarge?:boolean
  workspace?:{id:string;title:string}|null
  exporting?: { dialog:boolean; range:'turn'|'custom'|'session'; format:ConversationExportFormat }
  sessionId: string; anchorMessageId?: string; scope: 'selection' | 'session'
  status: 'loading' | 'selecting' | 'saving' | 'failed' | 'cancelled' | 'saved'
  selection: IndexedSelection | null; detail: boolean; selected: string[]; request: CaptureRequest | null
  result: CaptureResult | null; openedNote: NoteView | null; error: string | null
  recoveries: CaptureRecovery[]
  autoMetadata: boolean; job: NoteJob | null; notebookId: string | null
}
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
/** Only pending operation identity/options are retained in browser storage; no
 * transcript, image, credential or note body is written there. */
export class NoteCaptureBridge {
  private state: NoteCaptureState | null = null
  private readonly listeners = new Set<() => void>()
  private controller: AbortController | null = null
  private generation = 0
  private readonly recoveries = new Map<string, CaptureRecovery[]>()
  constructor(private readonly call: Api = api, private readonly storage?: StorageLike, private readonly navigateNote?: (noteId: string) => Promise<boolean>) {}
  getSnapshot = () => this.state
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private emit(state: NoteCaptureState | null) { this.state = state; for (const listener of this.listeners) listener() }
  private key(sessionId: string) {
    return `fatfish-notes-private:capture:${currentRepository() ?? 'unbound'}:${sessionId}`
  }
  switched(){this.close();this.recoveries.clear()}
  private pending(sessionId: string): CaptureRecovery[] {
    const cached = this.recoveries.get(sessionId)
    if (cached) return structuredClone(cached)
    const records: CaptureRecovery[] = []
    try {
      const raw = this.storage?.getItem(this.key(sessionId))
      if (raw) {
        const value = JSON.parse(raw) as { version?: number; requests?: CaptureRecovery[] } & CaptureRequest
        const entries = value.version === 1 && Array.isArray(value.requests) ? value.requests : []
        for (const entry of entries) {
          const request = entry?.request
          if (request?.sessionId === sessionId && typeof request.requestId === 'string' && ['session','selection','turn'].includes(request.scope) && request.mode === 'raw' && typeof request.autoMetadata === 'boolean' && !records.some(r => r.request.requestId === request.requestId)) records.push({ request, error: typeof entry.error === 'string' ? entry.error : null })
        }
      }
    } catch { /* In-memory recovery remains available if browser storage is disabled. */ }
    this.recoveries.set(sessionId, records)
    return structuredClone(records)
  }
  private persist(sessionId: string, records: CaptureRecovery[]): CaptureRecovery[] {
    this.recoveries.set(sessionId, structuredClone(records))
    try { if (records.length) this.storage?.setItem(this.key(sessionId), JSON.stringify({ version: 1, requests: records })); else this.storage?.removeItem(this.key(sessionId)) } catch { /* Never discard an in-memory recovery when browser storage fails. */ }
    return structuredClone(records)
  }
  private retain(request: CaptureRequest, error: string | null): CaptureRecovery[] {
    const records = this.pending(request.sessionId), existing = records.find(r => r.request.requestId === request.requestId)
    if (existing) existing.error = error
    else records.push({ request: structuredClone(request), error })
    return this.persist(request.sessionId, records)
  }
  async open(sessionId: string, anchorMessageId?: string) { return this.loadSelection(sessionId, anchorMessageId, false) }
  async openExport(sessionId:string,anchorMessageId:string) { return this.loadSelection(sessionId,anchorMessageId,false,{dialog:true,range:'turn',format:'markdown'}) }
  private async loadSelection(sessionId: string, anchorMessageId: string | undefined, fresh: boolean, exporting?:NoteCaptureState['exporting']) {
    if(this.state?.status==='saving'){this.minimize();return}
    this.controller?.abort(); const generation = ++this.generation, controller = this.controller = new AbortController()
    const recoveries = exporting?[]:this.pending(sessionId), pending = fresh ? undefined : recoveries.at(-1)
    const state: NoteCaptureState = { sessionId, ...(anchorMessageId ? { anchorMessageId } : {}), scope: pending ? pending.request.scope === 'session' ? 'session' : 'selection' : anchorMessageId ? 'selection' : 'session', status: pending ? 'cancelled' : 'loading', selection: null, detail: fresh || !anchorMessageId, selected: [], request: pending?.request ?? null, result: null, openedNote: null, error: pending?.error ?? null, recoveries, autoMetadata: pending?.request.autoMetadata ?? false, job: null, notebookId: pending?.request.notebookId ?? null }
    if(exporting)state.exporting=exporting
    this.emit(state)
    if (pending) return
    try {
      const [selection,context] = await Promise.all([this.call('/notes/selection', { sessionId, ...(anchorMessageId ? { anchorMessageId } : {}) }, controller.signal),this.call('/notes/session-context',{sessionId},controller.signal).catch(()=>null)])
      if (generation === this.generation) this.emit({ ...state,workspace:context?.workspace??null,notebookId:context?.notebookId??null, selection: indexCaptureTurns(selection), selected: selection.defaultMessageIds,...(selection.materials?{materialIds:selection.materials.filter(m=>m.available&&m.bytes!==null&&m.bytes<=ATTACHMENT_LIMIT).map(m=>m.id)}:{}), status: 'selecting' })
    } catch (error) { if (generation === this.generation) this.emit({ ...state, status: controller.signal.aborted ? 'cancelled' : 'failed', error: error instanceof Error && 'code' in error ? String(error.code) : 'request_failed' }) }
  }
  /** Explicit new-save path. Old requests remain individually recoverable. */
  async reselect() {
    const state = this.state
    if (!state || state.status === 'loading' || state.status === 'saving') return
    return this.loadSelection(state.sessionId, state.anchorMessageId, true)
  }
  async resume(requestId: string) {
    const state = this.state
    if (!state || state.status === 'loading' || state.status === 'saving') return
    const recovery = this.pending(state.sessionId).find(r => r.request.requestId === requestId)
    if (!recovery) return
    this.emit({ ...state, scope: recovery.request.scope === 'session' ? 'session' : 'selection', request: recovery.request, error: recovery.error, status: 'cancelled', result: null, openedNote: null, job: null, autoMetadata: recovery.request.autoMetadata, notebookId: recovery.request.notebookId })
    return this.save()
  }
  showDetail(detail: boolean) {
    if (this.state?.status === 'selecting') this.emit({ ...this.state, detail })
  }
  exportFormat(format:ConversationExportFormat) {
    const state=this.state
    if(state?.exporting)this.emit({...state,exporting:{...state.exporting,format}})
  }
  exportRange(range:'turn'|'custom'|'session') {
    const state=this.state
    if(!state?.exporting || !state.selection)return
    // Custom picks survive switching between the current turn and the full session.
    this.emit({...state,detail:false,scope:range==='session'?'session':'selection',
      exporting:{...state.exporting,range,dialog:range!=='custom'}})
  }
  exportDialog() {
    const state=this.state
    if(state?.exporting)this.emit({...state,detail:false,exporting:{...state.exporting,range:state.scope==='session'?'session':'custom',dialog:true}})
  }
  setScope(scope: NoteCaptureState['scope']) {
    if (this.state?.status === 'selecting') this.emit({ ...this.state, scope })
  }
  toggleMessages(ids: string[]) {
    if (this.state?.status !== 'selecting') return
    const state = this.state
    const selected = new Set(state.selected)
    const remove = ids.every(id => selected.has(id))
    for (const id of ids) {
      if (remove) selected.delete(id)
      else selected.add(id)
    }
    this.emit({ ...state, scope: 'selection', selected: [...selected] })
  }
  toggle(id: string) { this.toggleMessages([id]) }
  options(autoMetadata: boolean) { if (this.state?.status === 'selecting') this.emit({ ...this.state, autoMetadata }) }
  notebook(notebookId: string | null) { if (this.state?.status === 'selecting') this.emit({ ...this.state, notebookId }) }
  materials(ids:string[]){if(this.state?.status==='selecting')this.emit({...this.state,materialIds:ids,allowLarge:false})}
  large(allowLarge:boolean){if(this.state?.status==='selecting')this.emit({...this.state,allowLarge})}
  async save() {
    const state = this.state
    if (!state || state.exporting || !['selecting','failed','cancelled'].includes(state.status)) return
    if (!state.request && (!state.selection || !(state.scope === 'session' ? state.selection.messages.length : state.selected.length))) return
    const request: CaptureRequest = state.request ?? { requestId: crypto.randomUUID(), sessionId: state.sessionId, scope: state.scope, ...(state.scope === 'selection' ? { messageIds: [...state.selected] } : {}), mode: 'raw', autoMetadata: state.autoMetadata, notebookId: state.notebookId,...(state.selection?{cut:state.selection.cut}:{}),...(state.materialIds?{materialIds:materialsFor(state.selection!.messages.filter(m=>state.scope==='session'||state.selected.includes(m.id)),state.selection!.materials??[]).filter(m=>state.materialIds!.includes(m.id)).map(m=>m.id),allowLarge:state.allowLarge??false}:{}) }
    if(state.selection?.materials?.some(m=>request.materialIds?.includes(m.id)&&Number(m.bytes)>ATTACHMENT_WARNING)&&!request.allowLarge){this.emit({...state,detail:true});return}
    const recoveries = this.retain(request, null)
    const controller = this.controller = new AbortController(), generation = ++this.generation
    this.emit({ ...state, request, status: 'saving', error: null, recoveries, minimized:true })
    const progress=setInterval(()=>{void this.call('/notes/capture-progress',{requestId:request.requestId},controller.signal).then(r=>{if(r.progress&&generation===this.generation&&this.state)this.emit({...this.state,progress:r.progress})}).catch(()=>{})},500)
    try {
      const result = await this.call('/notes/capture', request, controller.signal)
      if(result.note&&typeof window!=='undefined')window.dispatchEvent(new CustomEvent('fatfish-notes-captured',{detail:{sessionId:state.sessionId,noteId:result.note.noteId}}))
      if (generation !== this.generation) return
      const remaining = result.enrichmentJobId ? this.retain(request, 'ai_pending') : this.persist(state.sessionId, this.pending(state.sessionId).filter(r => r.request.requestId !== request.requestId))
      this.emit({ ...state, minimized:true, request, result, status: 'saved', error: null, recoveries: remaining })
      if (result.enrichmentJobId) await this.refreshJob()
    } catch (error) {
      const code = controller.signal.aborted ? 'aborted' : error instanceof Error && 'code' in error ? String(error.code) : 'request_failed'
      const retained = this.retain(request, code)
      if (generation === this.generation) this.emit({ ...state, request, status: controller.signal.aborted ? 'cancelled' : 'failed', error: code, recoveries: retained })
    }finally{clearInterval(progress)}
  }
  minimize(){if(this.state)this.emit({...this.state,minimized:true})}
  expand(){if(this.state)this.emit({...this.state,minimized:false})}
  cancel() { this.controller?.abort() }
  close() { this.controller?.abort(); this.generation++; this.emit(null) }
  async refreshJob(action: 'get' | 'retry' | 'cancel' | 'adopt' = 'get') {
    const state = this.state, jobId = state?.result?.enrichmentJobId, generation = this.generation
    if (!state || !jobId) return
    try {
      let response: { job: NoteJob }
      if (action === 'adopt') {
        const note = state.openedNote
        if (!note) {
          const latest=await this.call('/notes/get',{noteId:state.result!.note.noteId})
          if(generation===this.generation)this.emit({...state,openedNote:latest.note})
          return
        }
        response = await this.call('/notes/candidate', { jobId, expectedHeads: note.heads })
      } else response = await this.call(action === 'get' ? '/notes/job' : action === 'retry' ? '/notes/job/retry' : '/notes/job/cancel', { jobId })
      if (generation !== this.generation || !this.state) return
      const job = response.job
      const recoveries = job.status === 'completed' ? this.persist(state.sessionId, this.pending(state.sessionId).filter(r => r.request.requestId !== state.request?.requestId)) : this.pending(state.sessionId)
      this.emit({ ...this.state, job, recoveries, error: null })
    } catch (error) { if (generation === this.generation && this.state) this.emit({ ...this.state, error: error instanceof Error && 'code' in error ? String(error.code) : 'request_failed' }) }
  }
  async openNote() {
    const state = this.state
    if (!state?.result) return
    const generation = this.generation
    if (this.navigateNote) { if (await this.navigateNote(state.result.note.noteId) && generation === this.generation) this.close(); return }
    try { const result = await this.call('/notes/get', { noteId: state.result.note.noteId }); if (generation === this.generation) this.emit({ ...state, openedNote: result.note }) }
    catch { if (generation === this.generation) this.emit({ ...state, error: 'request_failed' }) }
  }
  dispose() { this.close(); this.listeners.clear() }
}
