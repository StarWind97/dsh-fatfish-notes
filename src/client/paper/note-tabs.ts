import type {NotesController, NotesState} from '../notes-controller.js'
export interface NoteTab {id:string;title:string;book:string|null;trashed:boolean}
/** Per controller/window memory: no localStorage and no extra detail readers. */
export class NoteTabs {
  private tabs:NoteTab[]=[]
  private listeners=new Set<()=>void>()
  private generation=0
  private epoch:number
  private handledRemoval: NotesState['removal']
  readonly positions=new Map<string,number>()
  constructor(private readonly controller:NotesController){this.epoch=controller.libraryEpoch}
  getSnapshot=()=>this.tabs
  subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn)}}
  private emit(tabs:NoteTab[]){this.tabs=tabs;for(const fn of this.listeners)fn()}
  reconcile=(onAutomaticSelect?:(id:string)=>void)=>{
    if(this.epoch!==this.controller.libraryEpoch){this.epoch=this.controller.libraryEpoch;++this.generation;this.positions.clear();this.emit([])}
    const state=this.controller.getSnapshot(),items=new Map(state.items.map(item=>[item.noteId,item]))
    const removal = state.removal
    if (removal && removal !== this.handledRemoval) {
      this.handledRemoval = removal
      const ids = new Set(removal.ids)
      const index = this.tabs.findIndex(tab => tab.id === removal.activeId)
      const neighbors = index < 0 ? [] : [...this.tabs.slice(index+1), ...this.tabs.slice(0,index).reverse()]
      for (const id of ids) this.positions.delete(id)
      this.emit(this.tabs.filter(tab => !ids.has(tab.id)))
      if (neighbors.length) void this.selectAfterRemoval(neighbors.filter(tab => !ids.has(tab.id)), onAutomaticSelect)
    }
    const metadata=this.tabs.filter(tab=>!this.controller.removedIds.has(tab.id)).map(tab=>{if(tab.id===state.noteId&&state.draft)return tab;const item=items.get(tab.id);return item?{...tab,title:item.title||'无标题',book:item.notebookId,trashed:item.status==='trashed'}:tab})
    for(const id of this.controller.removedIds)this.positions.delete(id)
    if(JSON.stringify(metadata)!==JSON.stringify(this.tabs))this.emit(metadata)
    if(!state.draft||!state.noteId||state.loadingNote)return
    const next:NoteTab={id:state.noteId,title:state.draft.title||'无标题',book:state.draft.notebookId,trashed:state.draft.status==='trashed'}
    const old=this.tabs.find(t=>t.id===next.id)
    if(old&&JSON.stringify(old)===JSON.stringify(next))return
    this.emit(old?this.tabs.map(t=>t.id===next.id?next:t):[...this.tabs,next])
  }
  private missing() {
    const error = this.controller.getSnapshot().error
    return error === 'note_deleted' || error === 'note_not_found'
  }
  private async selectAfterRemoval(neighbors: NoteTab[], onSelected?: (id:string)=>void) {
    for (const tab of neighbors) {
      const generation = this.generation+1
      if (await this.select(tab.id, !tab.trashed)) {
        onSelected?.(tab.id)
        return
      }
      const state = this.controller.getSnapshot()
      if (this.generation !== generation || state.noteId || state.loadingNote || !this.missing()) return
    }
  }
  async select(id:string, activeOnly=false){
    if(this.controller.getSnapshot().composing||this.controller.getSnapshot().operation||this.controller.importing)return false
    if(this.controller.getSnapshot().noteId===id&&!this.controller.getSnapshot().loadingNote){if(!this.controller.getSnapshot().editing)await this.controller.revealCurrent(id);return true}
    const generation=++this.generation
    if(!await this.controller.open(id,activeOnly)||generation!==this.generation){
      if(generation===this.generation&&this.missing()){this.positions.delete(id);this.emit(this.tabs.filter(t=>t.id!==id))}
      return false
    }
    this.reconcile();await this.controller.revealCurrent(id)
    return generation===this.generation&&this.controller.getSnapshot().noteId===id
  }
  async close(id:string){
    if(this.controller.getSnapshot().composing||this.controller.getSnapshot().operation||this.controller.importing)return false
    const index=this.tabs.findIndex(t=>t.id===id);if(index<0)return true
    if(this.controller.getSnapshot().noteId===id){
      const next=this.tabs[index+1]??this.tabs[index-1]
      if(next?!await this.select(next.id):!await this.controller.back())return false
    }
    this.positions.delete(id);this.emit(this.tabs.filter(t=>t.id!==id));return true
  }
  async closeOthers(id:string){
    if(!this.tabs.some(t=>t.id===id)||!await this.select(id))return false
    for(const key of this.positions.keys())if(key!==id)this.positions.delete(key)
    this.emit(this.tabs.filter(t=>t.id===id));return true
  }
  async closeAll(){
    const {composing, operation, loadingNote} = this.controller.getSnapshot()
    if (composing || operation || loadingNote || this.controller.importing) return false
    const epoch = this.controller.libraryEpoch
    if (!await this.controller.back() || epoch !== this.controller.libraryEpoch) return false
    ++this.generation
    this.positions.clear()
    this.emit([])
    return true
  }
}
const sessions=new WeakMap<NotesController,NoteTabs>()
export function noteTabs(controller:NotesController){let value=sessions.get(controller);if(!value){value=new NoteTabs(controller);sessions.set(controller,value)}return value}
