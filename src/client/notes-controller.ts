import { api, currentRepository, type Api } from './api.js'
import { NoteRecovery, browserStorage, type RecoveryStorage, type RecoveryRecord } from './note-recovery.js'
import type { NoteContent, NoteView, NoteListOptions, NoteListItem, NotebookView, NoteJobOverview, NoteRevision, NoteManageRequest } from '../contracts/notes.js'
import { RecentNotes } from './recent-notes.js'

export const noteContent = (note: NoteView): NoteContent => ({ title: note.current.title, body: note.current.body, summary: note.current.summary, tags: [...note.current.tags], notebookId: note.effectiveNotebookId, status: note.current.status, sourceId: note.current.sourceId, assetIds: [...note.current.assetIds], ...(note.current.attachments ? { attachments: structuredClone(note.current.attachments) } : {}), ...(note.current.originPath !== undefined ? { originPath: note.current.originPath } : {}), ...(note.current.favorite!==undefined?{favorite:note.current.favorite}:{}), ...(note.current.sessionLinks!==undefined?{sessionLinks:[...note.current.sessionLinks]}:{}), ...(note.current.isTemplate!==undefined?{isTemplate:note.current.isTemplate}:{}) })
const comparable=(c:NoteContent)=>Object.fromEntries(Object.entries({...c,title:c.title.trim()||'无标题',summary:c.summary.trim(),tags:[...new Set(c.tags.map(t=>t.trim()))].sort(),assetIds:[...new Set(c.assetIds)].sort()}).sort(([a],[b])=>a.localeCompare(b)))
const sameContent=(a:NoteContent,b:NoteContent)=>JSON.stringify(comparable(a))===JSON.stringify(comparable(b))
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
  section: 'notes' | 'notebooks' | 'settings'; items: NoteListItem[]; cursor: string | null; filter: NoteListOptions
  notebooks: NotebookView[]; loadingList: boolean; listError: boolean; loadingNote: boolean
  noteId: string | null; note: NoteView | null; draft: NoteContent | null; dirty: boolean
  editing: boolean; saving: boolean; composing: boolean; operation: boolean; error: string | null; conflict: NoteView | null
  jobs: NoteJobOverview[]; jobsError: boolean; jobsCursor: string | null
}
export interface EditAccess { ready():Promise<void>; acquire(noteId:string):Promise<void>; release(noteId?:string):Promise<void>; writable(noteId:string):boolean }
/** Plugin-owned editor: local autosave continues across panel transitions. */
export class NotesController {
  private state: NotesState = this.emptyState()
  private emptyState():NotesState {return { section: 'notes', items: [], cursor: null, filter: {}, notebooks: [], loadingList: false, listError: false, loadingNote: false, noteId: null, note: null, draft: null, dirty: false, editing: false, saving: false, composing: false, operation: false, error: null, conflict: null, jobs: [], jobsError: false, jobsCursor: null }}
  switched(){this.editStart=null;++this.navigation;++this.listing;++this.jobGeneration;++this.booksGeneration;this.listAbort?.abort();this.detailAbort?.abort();this.booksReady=false;this.booksRequest=undefined;this.clearTimers();this.finishPending=false;this.recoveryProtected=false;this.recoveredHeads=[];this.clearDraftImages();this.initialized=false;this.emit(this.emptyState());void this.initialize(null)}
  private listeners = new Set<() => void>()
  private saving: Promise<boolean> | null = null
  private navigation = 0
  private listing = 0
  private jobGeneration = 0
  private polling = false
  private bookSaving = false
  private disposed = false
  private listAbort:AbortController|undefined
  private detailAbort:AbortController|undefined
  private booksReady=false
  private booksGeneration=0
  private booksRequest:Promise<void>|undefined
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
  private timer:ReturnType<typeof setTimeout>|undefined
  private deadline:ReturnType<typeof setTimeout>|undefined
  private finishPending=false
  private recoveryProtected=false
  private recoveredHeads:string[]=[]
  private creating=false
  private editStart:{noteId:string;content:NoteContent|null}|null=null
  get editChanged(){const start=this.editStart,draft=this.state.draft;return !!start&&!!draft&&(start.content?!sameContent(start.content,draft):!!this.state.note||!!(draft.title.trim()||draft.body.trim()||draft.summary.trim()||draft.tags.length||draft.assetIds.length||draft.attachments?.length))}
  imagePickerOpen=false
  private inFlight:RecoveryRecord['inFlight']
  private readonly recovery:NoteRecovery
  constructor(private readonly call:Api=api, private readonly options:{storage?:RecoveryStorage;repository?:()=>number|undefined;autosaveMs?:number;maxWaitMs?:number;onSettled?:()=>void;editing?:EditAccess;recoveryScope?:string;stableList?:boolean}={}){
    this.recovery=new NoteRecovery(options.storage??browserStorage(),options.repository??currentRepository,options.recoveryScope)
  }
  get api(){return this.call}
  occupiedCount=0
  private visits(){return new RecentNotes(this.options.storage??browserStorage(),this.options.repository??currentRepository)}
  recentIds(){return this.visits().read()}
  private inputPaused=false
  pauseInput(value:boolean){if(this.inputPaused===value)return;this.inputPaused=value;this.emit({})}
  get writable(){return !this.inputPaused&&(!this.state.noteId||!this.options.editing||this.options.editing.writable(this.state.noteId))}
  showError(code:string){this.emit({error:code})}
  private journal(){
    const {noteId,note,draft,dirty}=this.state
    if(!dirty||!noteId||!draft){if(noteId)this.recovery.clear();this.recoveryProtected=false;return}
    this.recoveryProtected=this.recovery.write({request:{noteId,expectedHeads:note?.heads??this.recoveredHeads,content:draft},...(this.inFlight?{inFlight:this.inFlight}:{})})
  }
  get needsExitWarning(){return this.importing||(this.state.dirty&&!this.recoveryProtected)}
  private clearTimers(){clearTimeout(this.timer);clearTimeout(this.deadline);this.timer=undefined;this.deadline=undefined}
  private schedule(){
    if(this.disposed||!this.state.dirty||this.state.composing)return
    clearTimeout(this.timer)
    const save=()=>{this.clearTimers();void this.flush()}
    this.timer=setTimeout(save,this.options.autosaveMs??800)
    this.deadline??=setTimeout(save,this.options.maxWaitMs??2500)
  }
  async leave(){this.finishPending=true;if(this.state.composing)return false;return this.saveEdits()}
  private async recover():Promise<string|null>{
    let record:RecoveryRecord|null
    try{record=this.recovery.read()}catch{this.emit({error:'note_recovery_failed'});return null}
    if(!record)return null
    const {request,inFlight}=record
    this.emit({loadingNote:true})
    try{
      await this.options.editing?.acquire(request.noteId)
      let latest:NoteView|null=null
      try{latest=(await this.call('/notes/get',{noteId:request.noteId})).note}catch(e){if(errorCode(e)!=='note_not_found')throw e}
      if(latest&&sameContent(noteContent(latest),request.content)){this.recovery.clear();return latest.noteId}
      if(latest&&inFlight&&sameContent(noteContent(latest),inFlight.content))request.expectedHeads=latest.heads
      const result=await this.call('/notes/save',{...request,keepBoth:true})
      this.recovery.clear();return result.note.noteId
    }catch(e){
      this.emit({noteId:request.noteId,note:null,draft:request.content,editing:true,dirty:true,error:errorCode(e)})
      this.recoveredHeads=request.expectedHeads
      this.recoveryProtected=true
      return null
    }finally{if(!this.state.dirty)await this.options.editing?.release(request.noteId);this.emit({loadingNote:false})}
  }
  getSnapshot = () => this.state
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  private emit(patch: Partial<NotesState>) { if (this.disposed) return; this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()) }
  private refreshBooks(force:boolean):Promise<void>{
    if(!force&&this.booksReady)return Promise.resolve()
    if(this.booksRequest&&!force)return this.booksRequest
    const generation=++this.booksGeneration
    const request=this.call('/notes/notebooks',undefined).then(books=>{
      if(generation!==this.booksGeneration)return
      this.booksReady=true;this.emit({notebooks:books.notebooks})
    }).catch(()=>{if(generation===this.booksGeneration){this.booksReady=false;this.emit({listError:true})}}).finally(()=>{if(this.booksRequest===request)this.booksRequest=undefined})
    this.booksRequest=request;return request
  }
  async refresh(reset = true, includeSelected = false, refreshBooks = true) {
    const selected = includeSelected ? this.refreshSelected() : Promise.resolve()
    const generation = ++this.listing, filter = this.state.filter
    this.listAbort?.abort();const abort=this.listAbort=new AbortController()
    this.emit({ loadingList: true, listError: false })
    // Start the useful list first. Slow notebook counts must not delay its display.
    const list=this.call('/notes', { order:'recent', ...filter, limit: 50, ...(!reset && this.state.cursor ? { cursor: this.state.cursor } : {}) },abort.signal)
    const books=this.refreshBooks(refreshBooks)
    try {
      const result = await list
      if(reset&&this.options.stableList){
        const count=this.state.items.length
        while(result.cursor&&result.items.length<count){const page=await this.call('/notes',{order:'recent',...filter,limit:50,cursor:result.cursor},abort.signal);result.items.push(...page.items);result.cursor=page.cursor}
        const order=new Map(this.state.items.map((n,i)=>[n.noteId,i]));result.items.sort((a,b)=>(order.get(a.noteId)??Infinity)-(order.get(b.noteId)??Infinity))
      }
      if (generation !== this.listing) return
      const items = reset ? result.items : [...this.state.items, ...result.items.filter(x => !this.state.items.some(v => v.noteId === x.noteId))]
      this.emit({ items, cursor: result.cursor, loadingList: false })
    } catch { if (generation === this.listing) this.emit({ loadingList: false, listError: true }) }
    finally { await Promise.all([selected,...(refreshBooks?[books]:[])]) }
  }
  /** Pulls refresh reading mode; an active editor keeps its original revision base. */
  private async refreshSelected(): Promise<void> {
    const noteId = this.state.noteId
    if (this.state.editing || !noteId || !this.state.note || this.state.section !== 'notes' || this.state.loadingNote || this.state.operation || this.state.saving) return
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
  filter(filter: NoteListOptions) { this.emit({ filter, ...(this.options.stableList&&!equal(filter,this.state.filter)?{items:[],cursor:null}:{}) }); return this.refresh(true,false,false) }
  async selectFilter(filter:NoteListOptions,selectFirst=true) {
    if(!await this.prepareLeave())return
    const navigation=this.navigation
    await this.filter(filter)
    if(this.state.section!=='notes'||this.state.filter!==filter||this.navigation!==navigation||this.state.listError||this.state.loadingList)return
    if(this.state.items.some(item=>item.noteId===this.state.noteId))return
    const first=this.state.items[0]
    if(first&&selectFirst)await this.open(first.noteId);else await this.back()
  }
  private initialized=false
  async initialize(lastId:string|null, order:NoteListOptions['order']='recent') {
    try{await this.options.editing?.ready()}catch{this.emit({error:'window_offline'});return}
    if (!this.initialized) this.emit({filter:{...this.state.filter,order}})
    const firstLoad=!this.initialized
    this.initialized=true
    if(firstLoad){const recovered=await this.recover();if(recovered)lastId=recovered;else if(this.state.error==='note_recovery_failed')return}
    const restore=firstLoad && !this.state.noteId
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
    if(!this.writable)return
    if (!this.state.draft || this.state.loadingNote || this.state.operation || this.state.draft.status === 'trashed') return
    this.emit({ draft: { ...this.state.draft, ...patch }, dirty: true, error: this.state.conflict ? 'note_conflict' : null })
    this.journal();this.schedule()
  }
  composition(active: boolean) { this.emit({ composing: active });if(!active){this.journal();this.schedule();if(this.finishPending)void this.leave()} }
  async beginEdit() {
    if(this.state.editing)return
    if(!this.options.editing){if(this.state.noteId)this.editStart={noteId:this.state.noteId,content:this.state.note?structuredClone(noteContent(this.state.note)):null};this.finishPending=false;this.emit({editing:true,error:null});return}
    if(!this.state.noteId)return
    const noteId=this.state.noteId
    try{
      await this.options.editing?.acquire(noteId)
      if(this.options.editing&&this.state.note&&!this.state.dirty){const latest=(await this.call('/notes/get',{noteId})).note;if(this.state.noteId!==noteId)return;this.emit({note:latest,draft:noteContent(latest)})}
      this.editStart={noteId,content:this.state.note?structuredClone(noteContent(this.state.note)):null}
      this.finishPending=false;this.emit({editing:true,error:null})
    }catch(e){this.emit({error:errorCode(e)})}
  }
  async saveEdits() {
    const changed=this.state.editing||this.state.dirty
    if (!await this.flush()) return false
    try{await this.options.editing?.release(this.state.noteId??undefined)}catch(e){this.occupiedCount=e&&typeof e==='object'&&'affectedCount' in e?Number(e.affectedCount)||0:0;this.emit({error:errorCode(e)});return false}
    this.finishPending=false
    this.editStart=null
    this.clearDraftImages()
    this.emit({editing:false,error:null,...(this.state.note?{draft:noteContent(this.state.note)}:{})})
    if(changed)this.options.onSettled?.()
    return true
  }
  async cancelEdits():Promise<boolean>{
    const start=this.editStart,noteId=this.state.noteId
    if(!start||start.noteId!==noteId||!this.state.editing||this.state.composing||this.state.operation||this.importing||!this.writable)return false
    this.clearTimers();this.emit({operation:true,error:null})
    try{
      if(this.saving&&!await this.saving)return false
      if(this.state.noteId!==noteId)throw new Error('changed note')
      const saved=this.state.note
      if(saved){
        const latest=(await this.call('/notes/get',{noteId})).note
        if(!equal(latest.heads,saved.heads)){this.emit({error:'note_conflict'});return false}
        if(start.content){
          const content={...noteContent(latest),...structuredClone(start.content)}
          for(const key of ['sessionLinks','favorite'] as const){delete content[key];if(latest.current[key]!==undefined)Object.assign(content,{[key]:latest.current[key]})}
          const result=sameContent(content,noteContent(latest))?latest:(await this.call('/notes/save',{noteId,expectedHeads:latest.heads,content})).note
          this.emit({note:result,draft:noteContent(result),dirty:false})
        }else{
          await this.call('/notes/trash',{noteId,expectedHeads:latest.heads})
          this.emit({noteId:null,note:null,draft:null,dirty:false})
        }
      }else this.emit({noteId:null,note:null,draft:null,dirty:false})
      await this.options.editing?.release(noteId??undefined)
      this.editStart=null;this.finishPending=false;this.clearDraftImages();this.recovery.clear();this.emit({editing:false,error:null,conflict:null})
      void this.refresh();this.options.onSettled?.();return true
    }catch(e){this.emit({error:errorCode(e)});return false}finally{this.emit({operation:false})}
  }
  private async prepareLeave(){
    if(this.state.operation||this.state.composing)return false
    const changed=this.state.editing||this.state.dirty
    if(!await this.flush())return false
    try{await this.options.editing?.release(this.state.noteId??undefined)}catch(e){this.emit({error:errorCode(e)});return false}
    this.editStart=null;this.emit({editing:false});if(changed)this.options.onSettled?.();return true
  }
  flush(): Promise<boolean> {
    this.clearTimers()
    if (this.disposed) return Promise.resolve(false)
    if(this.imageImports.size)return Promise.allSettled([...this.imageImports]).then(()=>this.flush())
    if (this.saving) return this.saving
    if (this.state.composing || this.state.operation) return Promise.resolve(false)
    if (!this.state.dirty) return Promise.resolve(true)
    if (this.state.conflict) return Promise.resolve(false)
    this.saving = this.write().finally(() => { this.saving = null;if(!this.disposed){this.inFlight=undefined;this.journal()} })
    return this.saving
  }
  /** Flush the exact selection and retain a navigation lease through asynchronous export. */
  async freezeExport(): Promise<{ note: NoteView; isCurrent: () => boolean } | null> {
    const navigation = this.navigation, noteId = this.state.noteId
    if (this.state.loadingNote || this.state.operation || this.state.conflict || !noteId) return null
    if (!await this.prepareLeave() || navigation !== this.navigation || noteId !== this.state.noteId || this.state.loadingNote || this.state.operation || this.state.conflict || this.state.dirty || !this.state.note) return null
    const note = structuredClone(this.state.note)
    return { note, isCurrent: () => !this.disposed && navigation === this.navigation && this.state.section === 'notes' && !this.state.loadingNote && noteId === this.state.noteId && note.current.revision === this.state.note?.current.revision }
  }
  private async write(): Promise<boolean> {
    while (!this.disposed && this.state.dirty && !this.state.composing) {
      const { noteId, note, draft } = this.state
      if (!noteId || !draft) return false
      if(this.options.editing&&!this.options.editing.writable(noteId)){this.emit({error:'note_edit_lost'});return false}
      const sent = structuredClone(draft)
      this.inFlight={noteId,expectedHeads:note?.heads??this.recoveredHeads,content:sent}
      this.journal()
      this.emit({ saving: true, error: null })
      try {
        const result = await this.call('/notes/save', { noteId, expectedHeads: note?.heads ?? this.recoveredHeads, content: sent, keepBoth:true })
        if (this.disposed || this.state.noteId !== noteId) return false
        const canonical = noteContent(result.note), current = this.state.draft!
        // Reconcile only fields unchanged since dispatch. Later typing survives.
        const merged = { ...current }
        for (const key of Object.keys(sent) as Array<keyof NoteContent>) if ((!this.state.editing||!['title','summary','tags'].includes(key)||(key==='title'&&result.note.noteId!==noteId))&&equal(current[key], sent[key])) Object.assign(merged, { [key]: canonical[key] })
        this.emit({ noteId:result.note.noteId,note: result.note, draft: merged, dirty: !sameContent(merged, canonical), saving: false })
        if(result.note.noteId!==noteId&&this.options.editing){await this.options.editing.release(noteId);await this.options.editing.acquire(result.note.noteId)}
        this.inFlight=undefined;this.recoveredHeads=[];this.journal()
      } catch (error) {
        if (this.disposed) return false
        this.emit({ saving: false, error: errorCode(error) })
        if (errorCode(error) === 'note_conflict') {
          try {
            const latest = (await this.call('/notes/get', { noteId })).note
            // A lost create/save receipt may be reconciled without creating a second note.
            if (sameContent(noteContent(latest), sent) && equal(this.state.draft, sent)) this.emit({ note: latest, draft: noteContent(latest), dirty: false, error: null })
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
    if (request.kind !== 'operation' && ((request.kind!=='open'&&this.state.editing) || this.state.dirty || this.state.composing || this.state.saving)) return false
    if(request.kind==='sync'&&equal(note,this.state.note))return true
    this.emit({ editing:request.kind === 'open' ? false : this.state.editing, noteId: note.noteId, note, draft: noteContent(note), dirty: false, error: null, conflict: note.heads.length > 1 ? note : null, loadingNote: false, jobs: [], jobsError: false, jobsCursor: null }); void this.refreshJobs()
    return true
  }
  async open(noteId: string): Promise<boolean> {
    if (this.disposed || !await this.prepareLeave()) return false
    const generation = ++this.navigation
    this.detailAbort?.abort();const abort=this.detailAbort=new AbortController()
    this.emit({ section: 'notes', loadingNote: true, error: null })
    const request = this.detailRequest('open', noteId)
    try {
      const result = await this.call('/notes/get', { noteId },abort.signal)
      if (generation !== this.navigation) return false
      const accepted=this.accept(result.note, request)
      if(accepted&&result.note.current.status==='active'&&!result.note.current.isTemplate)this.visits().visit(noteId)
      return accepted
    } catch (error) { if (this.ownsDetail(request)) this.emit({ loadingNote: false, error: errorCode(error) }); return false }
  }
  patchAssociation(note:NoteView,relation:NoteListItem['sessionRelation']) {
    const exclude=this.state.filter.relation==='linked'&&!relation
    this.emit({items:this.state.items.flatMap(item=>item.noteId!==note.noteId?[item]:exclude?[]:[{...item,heads:note.heads,sessionRelation:relation??null,savedAt:note.savedAt}])})
  }
  async create(options:{notebookId?:string|null;sessionId?:string}={}): Promise<boolean> {
    if(this.creating)return false
    this.creating=true
    try {
    if (this.state.loadingNote || !await this.prepareLeave()) return false
    const noteId=newId()
    try{await this.options.editing?.acquire(noteId)}catch(e){this.emit({error:errorCode(e)});return false}
    ++this.navigation
    this.editStart={noteId,content:null}
    this.emit({ section: 'notes', editing:true, noteId, note: null, draft: { title: '', body: '', summary: '', tags: [], ...(options.sessionId?{sessionLinks:[options.sessionId]}:{}), notebookId: options.notebookId ?? this.state.filter.notebookId ?? this.state.notebooks.find(b => b.isDefault)?.notebookId ?? null, status: 'active', sourceId: null, assetIds: [] }, dirty: false, conflict: null, jobs: [], error: null })
    return true
    }finally{this.creating=false}
  }
  async navigate(section: NotesState['section']): Promise<boolean> { if (!await this.prepareLeave() || this.state.operation) return false; ++this.navigation; this.emit({ section, editing:false, loadingNote: false }); return true }
  async back(): Promise<boolean> { if (!await this.prepareLeave() || this.state.operation) return false; ++this.navigation; this.emit({ editing:false, noteId: null, note: null, draft: null, loadingNote: false, jobs: [], error: null }); return true }
  async changeStatus(trashed: boolean) {
    if (this.state.loadingNote || !await this.prepareLeave() || !this.state.note || this.state.operation || this.state.loadingNote) return false
    const note = this.state.note; this.emit({ operation: true })
    const request = this.detailRequest('operation', note.noteId)
    try { const accepted = this.accept((await this.call(trashed ? '/notes/trash' : '/notes/restore', { noteId: note.noteId, expectedHeads: note.heads })).note, request); if (accepted) void this.refresh(); return accepted }
    catch (e) { if (this.ownsDetail(request)) { this.emit({ error: errorCode(e) }); if (errorCode(e) === 'note_conflict') await this.loadConflict(request) }; return false }
    finally { if (this.ownsDetail(request)) this.emit({ operation: false }) }
  }
  async matching(filter: NoteListOptions = this.state.filter) {
    const items: NoteListItem[] = []; let cursor: string | null = null
    do { const page: {items:NoteListItem[];cursor:string|null} = await this.call('/notes', {...filter, limit:100, ...(cursor ? {cursor} : {})}); items.push(...page.items); cursor=page.cursor } while(cursor)
    return items
  }
  async batch(notes: Array<{noteId:string;expectedHeads:string[]}>, action:'trash'|'restore'|'purge') {
    if (!await this.prepareLeave() || this.state.operation) return false
    this.emit({operation:true,error:null})
    try {
      await this.call('/notes/batch',{notes,action})
      if(notes.some(n=>n.noteId===this.state.noteId)) {
        if(action==='purge')this.emit({noteId:null,note:null,draft:null,editing:false})
        else { const note=(await this.call('/notes/get',{noteId:this.state.noteId!})).note; this.emit({note,draft:noteContent(note)}) }
      }
      return true
    }catch(e){this.occupiedCount=e&&typeof e==='object'&&'affectedCount' in e?Number(e.affectedCount)||0:0;this.emit({error:errorCode(e)});return false}
    finally{this.emit({operation:false});await this.refresh();this.options.onSettled?.()}
  }
  async manage(input:NoteManageRequest):Promise<boolean> {
    if(this.state.operation||this.state.loadingNote||!await this.prepareLeave())return false
    const copy=['duplicate','template','instantiate','revision-copy'].includes(input.action)
    this.emit({operation:true,error:null});let created:string|undefined
    try {
      const result=await this.call('/notes/manage',{...input,...(copy&&!input.targetId?{targetId:newId()}: {})})
      if(copy)created=result.note?.noteId
      else if(input.notes.some(n=>n.noteId===this.state.noteId)) {
        const note=(await this.call('/notes/get',{noteId:this.state.noteId!})).note
        this.emit({note,draft:noteContent(note)})
      }
    }catch(e){this.occupiedCount=e&&typeof e==='object'&&'affectedCount' in e?Number(e.affectedCount)||0:0;this.emit({error:errorCode(e)});return false}
    finally{this.emit({operation:false});await this.refresh();this.options.onSettled?.()}
    if(created){await this.filter({order:'recent',...(input.action==='template'?{templates:true}:{})});await this.open(created);if(input.action==='instantiate')await this.beginEdit()}
    return true
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
  async notebook(title: string, book?: NotebookView, remove = false, options: { makeDefault?: boolean; removal?: 'move' | 'trash'; expectedNoteCount?: number } = {}) {
    if (this.bookSaving || this.state.loadingNote) return false
    this.bookSaving = true
    let started = false
    try {
      if (!await this.prepareLeave() || this.state.operation || this.state.loadingNote) return false
      started = true
      this.emit({ operation: true })
      const result = await this.call('/notes/notebook', { title, expectedHeads: book?.heads ?? [], ...(book ? { notebookId: book.notebookId } : {}), remove, ...options })
      this.emit({ notebooks: result.notebooks, operation: false, error: null })
      if (remove && this.state.noteId) {
        const request = this.detailRequest('sync', this.state.noteId)
        this.accept((await this.call('/notes/get', { noteId: request.noteId })).note, request)
      }
      if (remove && this.state.filter.notebookId === book?.notebookId) {
        const { notebookId: _notebookId, ...rest } = this.state.filter
        await this.filter(rest)
      }
      else await this.refresh()
      return true
    } catch (e) { this.occupiedCount=e&&typeof e==='object'&&'affectedCount' in e?Number(e.affectedCount)||0:0;this.emit({ error: errorCode(e) }); return false }
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
    if (this.state.loadingNote || !await this.prepareLeave() || !this.state.note || this.state.operation || this.state.loadingNote) return false
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
  dispose() { this.clearTimers();if(this.state.dirty)this.journal();this.clearDraftImages(); this.disposed = true; this.imageAbort.abort();this.listAbort?.abort();this.detailAbort?.abort(); ++this.navigation; ++this.listing;++this.booksGeneration; this.listeners.clear() }
}
