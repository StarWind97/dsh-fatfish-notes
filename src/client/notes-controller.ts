import { api, type Api } from './api.js'
import type { NoteContent, NoteView, NoteListOptions, NoteListItem, NotebookView, NoteJobOverview, NoteRevision } from '../contracts/notes.js'

export const noteContent = (note: NoteView): NoteContent => ({ title: note.current.title, body: note.current.body, summary: note.current.summary, tags: [...note.current.tags], notebookId: note.effectiveNotebookId, status: note.current.status, sourceId: note.current.sourceId, assetIds: [...note.current.assetIds] })
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const errorCode = (e: unknown) => e instanceof Error && 'code' in e ? String(e.code) : 'request_failed'
interface DetailRequest { navigation: number; noteId: string; kind: 'open' | 'operation' | 'poll' | 'sync'; baseNote: NoteView | null }
function newId(): string {
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ', bytes = crypto.getRandomValues(new Uint8Array(16))
  let value = BigInt(Date.now()) << 80n
  for (let i = 0; i < 10; i++) value |= BigInt(bytes[i]!) << BigInt(8 * (9 - i))
  let result = ''; for (let i = 0; i < 26; i++) { result = alphabet[Number(value & 31n)]! + result; value >>= 5n }
  return result
}
export interface NotesState {
  section: 'notes' | 'settings'; items: NoteListItem[]; cursor: string | null; filter: NoteListOptions
  notebooks: NotebookView[]; loadingList: boolean; listError: boolean; loadingNote: boolean
  noteId: string | null; note: NoteView | null; draft: NoteContent | null; dirty: boolean
  editing: boolean; saving: boolean; composing: boolean; operation: boolean; error: string | null; conflict: NoteView | null
  jobs: NoteJobOverview[]; jobsError: boolean; jobsCursor: string | null
}
/** Lives with the plugin, not the mounted panel: changing DSH panels never drops
 * an active draft. Only explicit save writes it; navigation never commits edits. */
export class NotesController {
  private state: NotesState = this.emptyState()
  private emptyState():NotesState {return { section: 'notes', items: [], cursor: null, filter: {}, notebooks: [], loadingList: false, listError: false, loadingNote: false, noteId: null, note: null, draft: null, dirty: false, editing: false, saving: false, composing: false, operation: false, error: null, conflict: null, jobs: [], jobsError: false, jobsCursor: null }}
  switched(){++this.navigation;++this.listing;++this.jobGeneration;this.clearDraftImages();this.initialized=false;this.emit(this.emptyState());void this.initialize(null)}
  private listeners = new Set<() => void>()
  private saving: Promise<boolean> | null = null
  private navigation = 0
  private listing = 0
  private jobGeneration = 0
  private polling = false
  private bookSaving = false
  private disposed = false
  private readonly imageImports=new Set<Promise<void>>()
  private imageAbort=new AbortController()
  private readonly draftImages = new Map<string,string>()
  previewImage(id:string) { return this.draftImages.get(id) ?? null }
  rememberImage(id:string, source:Blob|string) {
    if (!this.draftImages.has(id)) this.draftImages.set(id,typeof source==='string' ? source : URL.createObjectURL(source))
  }
  private clearDraftImages() {
    for(const url of this.draftImages.values()) if(url.startsWith('blob:')) URL.revokeObjectURL(url)
    this.draftImages.clear()
  }
  get importing(){return this.imageImports.size>0}
  queueImageImport(work:(signal:AbortSignal)=>Promise<void>){
    const signal=this.imageAbort.signal
    const job=Promise.resolve().then(()=>work(signal)).finally(()=>{this.imageImports.delete(job)})
    this.imageImports.add(job)
    return job
  }
  constructor(private readonly call: Api = api) {}
  getSnapshot = () => this.state
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  private emit(patch: Partial<NotesState>) { if (this.disposed) return; this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()) }
  async refresh(reset = true, includeSelected = false) {
    const selected = includeSelected ? this.refreshSelected() : Promise.resolve()
    const generation = ++this.listing, filter = this.state.filter
    this.emit({ loadingList: true, listError: false })
    try {
      const [result, books] = await Promise.all([this.call('/notes', { order:'recent', ...filter, limit: 50, ...(!reset && this.state.cursor ? { cursor: this.state.cursor } : {}) }), this.call('/notes/notebooks', undefined)])
      if (generation !== this.listing) return
      const items = reset ? result.items : [...this.state.items, ...result.items.filter(x => !this.state.items.some(v => v.noteId === x.noteId))]
      this.emit({ items, cursor: result.cursor, notebooks: books.notebooks, loadingList: false })
    } catch { if (generation === this.listing) this.emit({ loadingList: false, listError: true }) }
    finally { await selected }
  }
  /** A pull may refresh a clean editor or expose a conflict, but never replace local work. */
  private async refreshSelected(): Promise<void> {
    const noteId = this.state.noteId
    if (!noteId || !this.state.note || this.state.section !== 'notes' || this.state.loadingNote || this.state.operation || this.state.saving) return
    const request = this.detailRequest('sync', noteId)
    try {
      const latest = (await this.call('/notes/get', { noteId })).note
      if (this.accept(latest, request)) return
      if (latest.noteId === noteId && this.ownsDetail(request) && !this.state.saving && !equal(latest.heads, request.baseNote?.heads)) {
        if(this.state.dirty)return
        if(!this.state.composing)this.accept(latest,request)
      }
    } catch { if (this.ownsDetail(request)) this.emit({ listError: true }) }
  }
  filter(filter: NoteListOptions) { this.emit({ filter }); return this.refresh() }
  async selectFilter(filter:NoteListOptions,selectFirst=true) {
    if(!this.canLeave())return
    const navigation=this.navigation
    await this.filter(filter)
    if(this.state.section!=='notes'||this.state.filter!==filter||this.navigation!==navigation||this.state.listError||this.state.loadingList)return
    if(this.state.items.some(item=>item.noteId===this.state.noteId))return
    const first=this.state.items[0]
    if(first&&selectFirst)await this.open(first.noteId);else await this.back()
  }
  private initialized=false
  async initialize(lastId:string|null, order:NoteListOptions['order']='recent') {
    if (!this.initialized) this.emit({filter:{...this.state.filter,order}})
    const restore=!this.initialized && !this.state.noteId
    this.initialized=true
    const navigation=this.navigation
    await this.refresh()
    if(!restore||navigation!==this.navigation||this.state.noteId||this.state.listError||this.disposed)return
    if(lastId && /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(lastId)){
      if(await this.open(lastId) && this.state.draft?.status==='active')return
      if(this.navigation!==navigation+1||this.disposed)return
    }
    const first=this.state.items[0]
    if(first)await this.open(first.noteId);else if(this.state.noteId)await this.back();else if(this.state.error==='note_not_found')this.emit({error:null})
  }
  update(patch: Partial<NoteContent>) {
    if (!this.state.draft || this.state.loadingNote || this.state.operation || this.state.draft.status === 'trashed') return
    this.emit({ draft: { ...this.state.draft, ...patch }, dirty: true, error: this.state.conflict ? 'note_conflict' : null })

  }
  composition(active: boolean) { this.emit({ composing: active }) }
  beginEdit() { this.emit({editing: true, error:null}) }
  async saveEdits() {
    if (!await this.flush()) return false
    this.clearDraftImages()
    this.emit({editing:false,error:null})
    return true
  }
  cancelEdits() {
    if (this.state.saving || this.state.operation || this.state.loadingNote) return
    this.imageAbort.abort()
    this.clearDraftImages()
    this.imageAbort = new AbortController()
    const note = this.state.conflict ?? this.state.note
    this.emit({editing:false, dirty:false, composing:false, error:null, conflict:note && note.heads.length > 1 ? note : null,
      note, noteId:note?.noteId ?? null, draft:note ? noteContent(note) : null})
  }
  private canLeave() {
    if (this.state.saving || this.state.operation || this.state.composing) return false
    if (!this.state.dirty && !this.importing) return true
    this.emit({error:'note_unsaved'})
    return false
  }
  flush(): Promise<boolean> {
    if (this.disposed) return Promise.resolve(false)
    if(this.imageImports.size)return Promise.allSettled([...this.imageImports]).then(()=>this.flush())
    if (this.saving) return this.saving
    if (this.state.composing || this.state.operation) return Promise.resolve(false)
    if (!this.state.dirty) return Promise.resolve(true)
    if (this.state.conflict) return Promise.resolve(false)
    this.saving = this.write().finally(() => { this.saving = null })
    return this.saving
  }
  /** Flush the exact selection and retain a navigation lease through asynchronous export. */
  async freezeExport(): Promise<{ note: NoteView; isCurrent: () => boolean } | null> {
    const navigation = this.navigation, noteId = this.state.noteId
    if (this.state.loadingNote || this.state.operation || this.state.conflict || !noteId) return null
    if (!this.canLeave() || navigation !== this.navigation || noteId !== this.state.noteId || this.state.loadingNote || this.state.operation || this.state.conflict || this.state.dirty || !this.state.note) return null
    const note = structuredClone(this.state.note)
    return { note, isCurrent: () => !this.disposed && navigation === this.navigation && this.state.section === 'notes' && !this.state.loadingNote && noteId === this.state.noteId && note.current.revision === this.state.note?.current.revision }
  }
  private async write(): Promise<boolean> {
    while (!this.disposed && this.state.dirty && !this.state.composing) {
      const { noteId, note, draft } = this.state
      if (!noteId || !draft) return false
      const sent = structuredClone(draft)
      this.emit({ saving: true, error: null })
      try {
        const result = await this.call('/notes/save', { noteId, expectedHeads: note?.heads ?? [], content: sent, keepBoth:true })
        if (this.disposed || this.state.noteId !== noteId) return false
        const canonical = noteContent(result.note), current = this.state.draft!
        // Reconcile only fields unchanged since dispatch. Later typing survives.
        const merged = { ...current }
        for (const key of Object.keys(sent) as Array<keyof NoteContent>) if (equal(current[key], sent[key])) Object.assign(merged, { [key]: canonical[key] })
        this.emit({ noteId:result.note.noteId,note: result.note, draft: merged, dirty: !equal(merged, canonical), saving: false })
      } catch (error) {
        if (this.disposed) return false
        this.emit({ saving: false, error: errorCode(error) })
        if (errorCode(error) === 'note_conflict') {
          try {
            const latest = (await this.call('/notes/get', { noteId })).note
            // A lost create/save receipt may be reconciled without creating a second note.
            if (equal(noteContent(latest), sent) && equal(this.state.draft, sent)) this.emit({ note: latest, draft: noteContent(latest), dirty: false, error: null })
            else this.emit({ conflict: latest })
          } catch { /* Keep text and original failure. */ }
        }
        return !this.state.dirty
      }
    }
    void this.refresh()
    return !this.state.dirty
  }
  private detailRequest(kind: DetailRequest['kind'], noteId: string): DetailRequest { return { navigation: this.navigation, noteId, kind, baseNote: this.state.note } }
  private ownsDetail(request: DetailRequest): boolean {
    if (this.disposed || request.navigation !== this.navigation) return false
    if (request.kind === 'open') return this.state.loadingNote && !this.state.operation
    if (this.state.noteId !== request.noteId || this.state.loadingNote) return false
    return request.kind === 'operation' ? this.state.operation : !this.state.operation && this.state.note === request.baseNote
  }
  /** Every full editor replacement belongs to the navigation/operation that
   * started it. An old A readback must never finish a pending open of B. */
  private accept(note: NoteView, request: DetailRequest): boolean {
    if (note.noteId !== request.noteId || !this.ownsDetail(request)) return false
    if (request.kind !== 'operation' && (this.state.dirty || this.state.composing || this.state.saving)) return false
    this.emit({ editing:request.kind === 'open' ? false : this.state.editing, noteId: note.noteId, note, draft: noteContent(note), dirty: false, error: null, conflict: note.heads.length > 1 ? note : null, loadingNote: false, jobs: [], jobsError: false, jobsCursor: null }); void this.refreshJobs()
    return true
  }
  async open(noteId: string): Promise<boolean> {
    if (this.disposed || !this.canLeave()) return false
    const generation = ++this.navigation
    this.emit({ section: 'notes', loadingNote: true, error: null })
    const request = this.detailRequest('open', noteId)
    try {
      const result = await this.call('/notes/get', { noteId })
      if (generation !== this.navigation) return false
      return this.accept(result.note, request)
    } catch (error) { if (this.ownsDetail(request)) this.emit({ loadingNote: false, error: errorCode(error) }); return false }
  }
  async create(): Promise<boolean> {
    if (this.state.loadingNote || !this.canLeave()) return false
    ++this.navigation
    this.emit({ section: 'notes', editing:true, noteId: newId(), note: null, draft: { title: '', body: '', summary: '', tags: [], notebookId: this.state.filter.notebookId ?? null, status: 'active', sourceId: null, assetIds: [] }, dirty: true, conflict: null, jobs: [], error: null })
    return true
  }
  async navigate(section: NotesState['section']): Promise<boolean> { if (!this.canLeave() || this.state.operation) return false; ++this.navigation; this.emit({ section, editing:false, loadingNote: false }); return true }
  async back(): Promise<boolean> { if (!this.canLeave() || this.state.operation) return false; ++this.navigation; this.emit({ editing:false, noteId: null, note: null, draft: null, loadingNote: false, jobs: [], error: null }); return true }
  async changeStatus(trashed: boolean) {
    if (this.state.loadingNote || !this.canLeave() || !this.state.note || this.state.operation || this.state.loadingNote) return false
    const note = this.state.note; this.emit({ operation: true })
    const request = this.detailRequest('operation', note.noteId)
    try { const accepted = this.accept((await this.call(trashed ? '/notes/trash' : '/notes/restore', { noteId: note.noteId, expectedHeads: note.heads })).note, request); if (accepted) void this.refresh(); return accepted }
    catch (e) { if (this.ownsDetail(request)) { this.emit({ error: errorCode(e) }); if (errorCode(e) === 'note_conflict') await this.loadConflict(request) }; return false }
    finally { if (this.ownsDetail(request)) this.emit({ operation: false }) }
  }
  private async loadConflict(request: DetailRequest) { try { const latest = await this.call('/notes/get', { noteId: request.noteId }); if (this.ownsDetail(request)) this.emit({ conflict: latest.note }) } catch { /* retain text */ } }
  async resolve(content?: NoteContent) {
    const conflict = this.state.conflict, draft = content ?? this.state.draft
    if (!conflict || !draft || this.state.operation || this.state.composing || this.state.loadingNote || this.disposed) return false
    this.emit({ operation: true })
    const request = this.detailRequest('operation', conflict.noteId)
    try { const accepted = this.accept((await this.call('/notes/save', { noteId: conflict.noteId, expectedHeads: conflict.heads, content: draft, resolve: true })).note, request); if (accepted) void this.refresh(); return accepted }
    catch (e) { if (this.ownsDetail(request)) { this.emit({ error: errorCode(e) }); if (errorCode(e) === 'note_conflict') await this.loadConflict(request) }; return false }
    finally { if (this.ownsDetail(request)) this.emit({ operation: false }) }
  }
  chooseRevision(revision: NoteRevision) {
    if (!this.state.conflict || this.state.operation || this.state.loadingNote || this.disposed) return
    const note = this.state.conflict
    this.emit({ draft: noteContent({ ...note, current: revision, effectiveNotebookId: this.state.notebooks.some(b => b.notebookId === revision.notebookId && b.current.status === 'active') ? revision.notebookId : null }), dirty: true })
  }
  async notebook(title: string, book?: NotebookView, remove = false) {
    if (this.bookSaving || this.state.loadingNote) return false
    this.bookSaving = true
    let started = false
    try {
      if (!this.canLeave() || this.state.operation || this.state.loadingNote) return false
      started = true
      this.emit({ operation: true })
      const result = await this.call('/notes/notebook', { title, expectedHeads: book?.heads ?? [], ...(book ? { notebookId: book.notebookId } : {}), remove })
      this.emit({ notebooks: result.notebooks, operation: false, error: null })
      if (remove && this.state.noteId) await this.open(this.state.noteId)
      if (remove && this.state.filter.notebookId === book?.notebookId) await this.filter({ ...this.state.filter, notebookId: null })
      else await this.refresh()
      return true
    } catch (e) { this.emit({ error: errorCode(e) }); return false }
    finally { this.bookSaving = false; if (started) this.emit({ operation: false }) }
  }
  async refreshJobs(more = false) {
    const noteId = this.state.noteId, generation = ++this.jobGeneration
    if (!noteId || !this.state.note) return
    try {
      const result = await this.call('/notes/jobs', { noteId, ...(more && this.state.jobsCursor ? { cursor: this.state.jobsCursor } : {}) })
      if (noteId === this.state.noteId && generation === this.jobGeneration) this.emit({ jobs: more ? [...this.state.jobs, ...result.jobs.filter(v => !this.state.jobs.some(j => j.jobId === v.jobId))] : result.jobs, jobsError: false, jobsCursor: result.cursor })
    } catch { if (noteId === this.state.noteId && generation === this.jobGeneration) this.emit({ jobsError: true }) }
  }
  async pollJobs() {
    if (this.polling || this.state.section !== 'notes' || this.state.operation || this.state.loadingNote || !this.state.noteId) return
    const noteId = this.state.noteId, generation = this.jobGeneration
    const request = this.detailRequest('poll', noteId)
    const active = this.state.jobs.filter(job => job.status === 'running').slice(0, 5)
    if (!active.length) return
    this.polling = true
    try {
      let completed = false
      for (const item of active) {
        const { job } = await this.call('/notes/job', { jobId: item.jobId })
        if (!this.ownsDetail(request) || generation !== this.jobGeneration) return
        this.emit({ jobs: this.state.jobs.map(v => v.jobId === job.jobId ? { jobId: job.jobId, noteId: job.noteId, status: job.status, error: job.error, candidate: job.candidate, stages: job.stages.map(stage => ({ status: stage.status })) } : v), jobsError: false })
        completed ||= job.status === 'completed'
      }
      if (completed && !this.state.dirty && !this.state.composing && !this.state.saving) {
        const latest = await this.call('/notes/get', { noteId })
        if (generation === this.jobGeneration) this.accept(latest.note, request)
      }
    } catch { if (this.ownsDetail(request) && generation === this.jobGeneration) this.emit({ jobsError: true }) }
    finally { this.polling = false }
  }
  async job(jobId: string, action: 'retry' | 'cancel' | 'adopt') {
    if (this.state.loadingNote || !this.canLeave() || !this.state.note || this.state.operation || this.state.loadingNote) return false
    const note = this.state.note; ++this.jobGeneration; this.emit({ operation: true })
    const request = this.detailRequest('operation', note.noteId)
    try {
      if (action === 'adopt') await this.call('/notes/candidate', { jobId, expectedHeads: note.heads })
      else await this.call(action === 'retry' ? '/notes/job/retry' : '/notes/job/cancel', { jobId })
      if (!this.ownsDetail(request)) return false
      const accepted = this.accept((await this.call('/notes/get', { noteId: note.noteId })).note, request); if (accepted) void this.refresh(); return accepted
    } catch (e) { if (this.ownsDetail(request)) { this.emit({ error: errorCode(e) }); if (errorCode(e) === 'note_conflict' || errorCode(e) === 'ai_stale') await this.loadConflict(request) }; return false }
    finally { if (this.ownsDetail(request)) { this.emit({ operation: false }); void this.refreshJobs() } }
  }
  dispose() { this.clearDraftImages(); this.disposed = true; this.imageAbort.abort(); ++this.navigation; ++this.listing; this.listeners.clear() }
}
