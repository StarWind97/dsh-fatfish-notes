import type {NotesController, NotesState} from '../notes-controller.js'

export const overviewTabId = 'overview'
export const conversationListTabId = 'conversation-list'
type StartTab = {id: NonNullable<NotesController['startTab']>; kind: 'start'}
interface NoteTab {id: string; kind: 'note'; title: string; book: string | null; trashed: boolean}
export type ReadingTab = NoteTab | StartTab

/** Per controller/window memory: no localStorage and no extra detail readers. */
export class NoteTabs {
  private tabs: ReadingTab[]
  private listeners = new Set<() => void>()
  private generation = 0
  private epoch: number
  private previous: NotesState
  private handledRemoval: NotesState['removal']
  private choosingAfterRemoval: NotesState['removal']
  private overviewInTrash = false
  readonly startTab?: StartTab
  readonly positions = new Map<string, number>()

  constructor(private readonly controller: NotesController) {
    this.epoch = controller.libraryEpoch
    this.previous = controller.getSnapshot()
    const id = controller.startTab
    if (id) this.startTab = {id, kind: 'start'}
    this.tabs = this.startTab && !this.previous.noteId ? [this.startTab] : []
  }

  get activeId() {
    const state = this.controller.getSnapshot()
    const start = this.startTab
    return state.noteId ?? (start && this.wantsStartTab(state) && this.tabs.includes(start) ? start.id : null)
  }
  getSnapshot = () => this.tabs
  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }
  private emit(tabs: ReadingTab[]) {
    this.tabs = tabs
    for (const fn of this.listeners) fn()
  }
  private wantsStartTab(state: NotesState) {
    return !state.noteId && (this.startTab?.id === conversationListTabId ||
      state.filter.status !== 'trashed' || this.overviewInTrash)
  }
  private get blocked() {
    const {composing, operation} = this.controller.getSnapshot()
    return composing || operation || this.controller.importing
  }

  reconcile = () => {
    const state = this.controller.getSnapshot()
    const previous = this.previous
    this.previous = state
    let tabs = this.tabs
    const start = this.startTab
    let replaceStart = !!start && this.wantsStartTab(previous) && tabs.includes(start) && !state.openedFromTab
    if (state.noteId || previous.filter.status !== state.filter.status) this.overviewInTrash = false
    if (this.epoch !== this.controller.libraryEpoch) {
      this.epoch = this.controller.libraryEpoch
      ++this.generation
      this.positions.clear()
      this.choosingAfterRemoval = undefined
      this.overviewInTrash = false
      tabs = []
      replaceStart = false
    }

    const removal = state.removal
    let neighbors: ReadingTab[] = []
    if (removal && removal !== this.handledRemoval) {
      this.handledRemoval = removal
      const ids = new Set(removal.ids)
      const index = tabs.findIndex(tab => tab.id === removal.activeId)
      if (index >= 0) {
        neighbors = [...tabs.slice(index + 1), ...tabs.slice(0, index).reverse()].filter(tab => !ids.has(tab.id))
        if (neighbors.length) this.choosingAfterRemoval = removal
      }
      for (const id of ids) this.positions.delete(id)
      tabs = tabs.filter(tab => !ids.has(tab.id))
    }

    const items = new Map(state.items.map(item => [item.noteId, item]))
    tabs = tabs.filter(tab => !this.controller.removedIds.has(tab.id)).map(tab => {
      if (tab.kind === 'start' || tab.id === state.noteId) return tab
      const item = items.get(tab.id)
      if (!item) return tab
      const title = item.title || '无标题'
      const trashed = item.status === 'trashed'
      if (tab.title === title && tab.book === item.notebookId && tab.trashed === trashed) return tab
      return {...tab, title, book: item.notebookId, trashed}
    })
    for (const id of this.controller.removedIds) this.positions.delete(id)

    if (state.draft && state.noteId && !state.loadingNote) {
      const next: NoteTab = {kind: 'note', id: state.noteId, title: state.draft.title || '无标题',
        book: state.draft.notebookId, trashed: state.draft.status === 'trashed'}
      const old = tabs.find(tab => tab.id === next.id)
      if (old?.kind === 'note') {
        if (replaceStart) tabs = tabs.filter(tab => tab !== start)
        if (old.title !== next.title || old.book !== next.book || old.trashed !== next.trashed) {
          tabs = tabs.map(tab => tab === old ? next : tab)
        }
      } else {
        tabs = replaceStart ? tabs.map(tab => tab === start ? next : tab) : [...tabs, next]
      }
    } else if (start && !state.noteId && !tabs.includes(start) &&
        (!tabs.length || (this.wantsStartTab(state) && !state.loadingNote && !this.choosingAfterRemoval))) {
      tabs = [...tabs, start]
    }

    if (tabs.length !== this.tabs.length || tabs.some((tab, index) => tab !== this.tabs[index])) this.emit(tabs)
    if (neighbors.length) {
      void this.selectAfterRemoval(neighbors).finally(() => {
        if (this.choosingAfterRemoval !== removal) return
        this.choosingAfterRemoval = undefined
        this.reconcile()
      })
    }
  }

  private missing() {
    const error = this.controller.getSnapshot().error
    return error === 'note_deleted' || error === 'note_not_found'
  }
  private async selectAfterRemoval(neighbors: ReadingTab[]) {
    for (const tab of neighbors) {
      const generation = this.generation + 1
      if (await this.select(tab.id, tab.kind === 'note' && !tab.trashed)) return
      const state = this.controller.getSnapshot()
      if (this.generation !== generation || state.noteId || state.loadingNote || !this.missing()) return
    }
  }

  private async leaveNote() {
    const epoch = this.controller.libraryEpoch
    const generation = ++this.generation
    return await this.controller.back() && epoch === this.controller.libraryEpoch &&
      generation === this.generation && !this.controller.getSnapshot().noteId
  }

  private async selectStartTab(start: StartTab) {
    if (this.controller.getSnapshot().loadingNote) return false
    if (this.activeId === start.id) return true
    if (!await this.leaveNote()) return false
    this.overviewInTrash = this.controller.getSnapshot().filter.status === 'trashed'
    this.emit(this.tabs.includes(start) ? [...this.tabs] : [...this.tabs, start])
    return true
  }

  async select(id: string, activeOnly = false) {
    if (this.blocked) return false
    if (this.startTab?.id === id) return this.selectStartTab(this.startTab)
    const reveal = this.startTab?.id !== conversationListTabId
    const {noteId, loadingNote, editing} = this.controller.getSnapshot()
    if (noteId === id && !loadingNote) {
      if (reveal && !editing) await this.controller.revealCurrent(id)
      return true
    }
    const generation = ++this.generation
    if (!await this.controller.open(id, activeOnly, 'tab') || generation !== this.generation) {
      if (generation === this.generation && this.missing()) this.remove(id)
      return false
    }
    this.reconcile()
    if (reveal) await this.controller.revealCurrent(id)
    return generation === this.generation && this.controller.getSnapshot().noteId === id
  }

  canClose(id: string) { return id !== this.startTab?.id || this.tabs.length > 1 }

  private remove(id: string) {
    this.positions.delete(id)
    const rest = this.tabs.filter(tab => tab.id !== id)
    if (rest.length !== this.tabs.length) this.emit(!rest.length && this.startTab ? [this.startTab] : rest)
  }

  async close(id: string) {
    if (this.blocked || !this.canClose(id)) return false
    const index = this.tabs.findIndex(tab => tab.id === id)
    if (index < 0) return true
    const epoch = this.controller.libraryEpoch
    if (this.activeId === id) {
      const next = this.tabs[index + 1] ?? this.tabs[index - 1]
      const target = next?.id ?? this.startTab?.id
      if (!(target ? await this.select(target) : await this.leaveNote())) return false
    }
    if (epoch !== this.controller.libraryEpoch || this.activeId === id) return false
    this.remove(id)
    return true
  }

  async closeOthers(id: string) {
    if (!this.tabs.some(tab => tab.id === id) || !await this.select(id)) return false
    for (const key of this.positions.keys()) if (key !== id) this.positions.delete(key)
    this.emit(this.tabs.filter(tab => tab.id === id))
    return true
  }

  async closeAll() {
    if (this.blocked || this.controller.getSnapshot().loadingNote || !await this.leaveNote()) return false
    this.positions.clear()
    this.overviewInTrash = this.startTab?.id === overviewTabId && this.controller.getSnapshot().filter.status === 'trashed'
    this.emit(this.startTab ? [this.startTab] : [])
    return true
  }

  /** A null target places the tab after all tabs, including those in the dropdown. */
  move(id: string, target: string | null, side: 'before' | 'after' = 'before') {
    if (id === target) return false
    const origin = this.tabs.findIndex(tab => tab.id === id)
    const anchor = target === null ? this.tabs.length : this.tabs.findIndex(tab => tab.id === target)
    if (origin < 0 || anchor < 0) return false
    const insertion = anchor + (target !== null && side === 'after' ? 1 : 0)
    const destination = insertion > origin ? insertion - 1 : insertion
    if (destination === origin) return false
    const tabs = [...this.tabs]
    const [tab] = tabs.splice(origin, 1)
    tabs.splice(destination, 0, tab!)
    this.emit(tabs)
    return true
  }
}

const sessions = new WeakMap<NotesController, NoteTabs>()
export function noteTabs(controller: NotesController) {
  let value = sessions.get(controller)
  if (!value) {
    value = new NoteTabs(controller)
    sessions.set(controller, value)
  }
  return value
}
