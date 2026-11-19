import * as React from 'react'
import {useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore} from 'react'
import {ChevronDown, Plus, X} from 'lucide-react'
import {createPortal} from 'react-dom'
import {RowMenu} from '../RowMenu.js'
import type {NotesController, NotesState} from '../notes-controller.js'
import type {T} from '../locale.js'
import {noteTabs, overviewTabId, type ReadingTab} from './note-tabs.js'
import {useAppearance, useAppearanceProps} from './appearance.js'
import {useNoteTabDrag} from './use-note-tab-drag.js'

export function useNoteTabs(controller: NotesController, state: NotesState, root: React.RefObject<HTMLElement>, onSelected?: (id: string) => void) {
  const selected = useRef(onSelected)
  selected.current = onSelected
  const session = noteTabs(controller)
  const tabs = useSyncExternalStore(session.subscribe, session.getSnapshot)
  const previous = useRef<string | null>(null)
  const lastPane = useRef<HTMLElement | null>(null)
  useLayoutEffect(() => {
    const reconcile = () => session.reconcile(id => selected.current?.(id))
    reconcile()
    return controller.subscribe(reconcile)
  }, [session, controller])
  useLayoutEffect(() => {
    const id = state.noteId
    const pane = root.current?.querySelector<HTMLElement>('.paper-pane')
    if (state.loadingNote || !id || !pane) return
    if (previous.current !== id || lastPane.current !== pane) {
      pane.scrollTop = session.positions.get(id) ?? 0
      previous.current = id
      lastPane.current = pane
    }
    const remember = () => {
      if (session.getSnapshot().some(tab => tab.id === id)) session.positions.set(id, pane.scrollTop)
    }
    pane.addEventListener('scroll', remember, {passive: true})
    return () => {
      // A pane removed by opening the overview reports scrollTop 0 as it unmounts.
      if (pane.isConnected && pane.getClientRects().length) remember()
      pane.removeEventListener('scroll', remember)
    }
  })
  useEffect(() => {
    const el = root.current
    if (!el) return
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== 'Tab' || !event.ctrlKey || event.altKey || event.metaKey ||
          event.isComposing || (event.target as HTMLElement).closest('dialog,[role=dialog],[role=menu]')) return
      const state = controller.getSnapshot()
      const tabs = session.getSnapshot()
      if (tabs.length < 2 || state.composing || state.operation || controller.importing) return
      event.preventDefault()
      event.stopPropagation()
      if (state.loadingNote || event.repeat) return
      const index = tabs.findIndex(tab => tab.id === session.activeId)
      const next = index < 0 ? tabs[event.shiftKey ? tabs.length - 1 : 0]
        : tabs[(index + (event.shiftKey ? tabs.length - 1 : 1)) % tabs.length]
      if (next) void session.select(next.id).then(ok => { if (ok) selected.current?.(next.id) })
    }
    el.addEventListener('keydown', key)
    return () => el.removeEventListener('keydown', key)
  }, [controller, session, root])
  useLayoutEffect(() => {
    const row = root.current?.querySelector<HTMLElement>('.paper-row[aria-current],.conversation-note-row[aria-current]')
    row?.scrollIntoView({block: 'nearest', inline: 'nearest'})
  }, [state.noteId, state.items, root])
  return {session, tabs, scope: root}
}

type TabBarProps = ReturnType<typeof useNoteTabs> & {
  controller: NotesController
  state: NotesState
  t: T
  onSelect?: (id: string) => void
  beforeSelect?: () => void
  onEmpty?: () => void
}

export function NoteTabBar({controller, state, session, tabs, scope, t, onSelect, beforeSelect, onEmpty}: TabBarProps) {
  const appearance = useAppearance()
  const appearanceProps = useAppearanceProps()
  const root = useRef<HTMLElement>(null)
  const overflow = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [width, setWidth] = useState(0)
  const [more, setMore] = useState(false)
  const [at, setAt] = useState({top: 0, right: 0})
  const [announcement, setAnnouncement] = useState('')
  const shown = appearance.tabs && tabs.length > 0
  const busy = state.operation || state.composing || state.loadingNote || controller.importing
  const activeId = session.activeId
  const available = width - 16 - (session.hasOverview ? 34 : 0)
  const tabWidth = 144
  const needsMore = tabs.length * tabWidth > available
  const count = Math.max(1, Math.floor((available - (needsMore ? 44 : 0)) / tabWidth))
  const visible = tabs.slice(0, count)
  const active = tabs.find(tab => tab.id === activeId)
  if (active && !visible.includes(active)) visible[visible.length - 1] = active
  const rest = tabs.filter(tab => !visible.includes(tab))
  const showOverflow = more && rest.length > 0

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const measure = () => {
      setWidth(el.clientWidth)
      setMore(false)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [shown])
  useLayoutEffect(() => {
    if (showOverflow) overflow.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({preventScroll: true})
  }, [showOverflow])
  useEffect(() => {
    if (!showOverflow) return
    const outside = (event: PointerEvent) => {
      const target = event.target as HTMLElement
      if (overflow.current?.contains(target) || trigger.current?.contains(target) || target.closest('[role=menu]')) return
      if (root.current?.contains(target) && target.closest('[data-tab-drag]')) return
      setMore(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [showOverflow])

  function title(tab: ReadingTab) {
    return tab.kind === 'overview' ? t('notesOverviewTab')
      : tab.title + (tab.trashed ? ' · ' + t('notesTrash') : '')
  }
  function focusTab(id: string | null) {
    requestAnimationFrame(() => {
      const bar = scope.current?.querySelector<HTMLElement>('.paper-note-tabs')
      const button = Array.from(bar?.querySelectorAll<HTMLButtonElement>('[role=tab]') ?? [])
        .find(el => el.dataset.tabId === id)
      const hidden = Array.from(overflow.current?.querySelectorAll<HTMLButtonElement>('button[data-tab-id]') ?? [])
        .find(el => el.dataset.tabId === id)
      const fallback = bar?.querySelector<HTMLButtonElement>('.paper-tabs-more') ??
        bar?.querySelector<HTMLButtonElement>('[aria-selected=true]')
      const target = button ?? hidden ?? fallback
      target?.focus({preventScroll: true})
    })
  }
  async function select(id: string, focus = false) {
    beforeSelect?.()
    if (!await session.select(id)) return
    setMore(false)
    onSelect?.(id)
    if (focus) focusTab(id)
  }
  async function close(id?: string) {
    beforeSelect?.()
    if (!await (id ? session.close(id) : session.closeAll())) return
    setMore(false)
    const state = session.getSnapshot()
    if (onEmpty && (!state.length || (state.length === 1 && session.activeId === overviewTabId))) onEmpty()
    else focusTab(session.activeId)
  }
  async function closeOthers(id: string) {
    beforeSelect?.()
    if (!await session.closeOthers(id)) return
    setMore(false)
    onSelect?.(id)
    focusTab(id)
  }
  function move(id: string, target: string | null, side: 'before' | 'after') {
    if (busy || !session.move(id, target, side)) return
    const order = session.getSnapshot()
    const index = order.findIndex(tab => tab.id === id)
    setAnnouncement(t('notesTabMoved', {title: title(order[index]!), position: index + 1, count: order.length}))
    focusTab(id)
  }
  const drag = useNoteTabDrag(root, overflow, move)

  function actions(id: string) {
    const index = tabs.findIndex(tab => tab.id === id)
    const left = tabs[index - 1]
    const right = tabs[index + 1]
    return [
      {label: t('notesCloseThisTab'), disabled: busy || !session.canClose(id), run: () => void close(id)},
      {label: t('notesCloseOtherTabs'), disabled: busy || tabs.length < 2, run: () => void closeOthers(id)},
      {label: t(session.hasOverview ? 'notesCloseAllNoteTabs' : 'notesCloseAllTabs'),
        disabled: busy || !tabs.some(tab => tab.kind === 'note'), run: () => void close()},
      {label: t('notesMoveTabLeft'), disabled: busy || !left, run: () => { if (left) move(id, left.id, 'before') }},
      {label: t('notesMoveTabRight'), disabled: busy || !right, run: () => { if (right) move(id, right.id, 'after') }},
    ]
  }

  function cancelDrag(event: React.KeyboardEvent) {
    if (!drag.moving()) return false
    drag.end()
    event.preventDefault()
    event.stopPropagation()
    setAnnouncement(t('notesTabDragCanceled'))
    return true
  }
  function keys(event: React.KeyboardEvent) {
    if (event.key === 'Escape' && cancelDrag(event)) return
    if (!(event.target instanceof HTMLButtonElement) || event.target.getAttribute('role') !== 'tab') return
    const buttons = [...(root.current?.querySelectorAll<HTMLButtonElement>('[role=tab]:not(:disabled)') ?? [])]
    const index = buttons.indexOf(event.target)
    if (index < 0) return
    const next = event.key === 'ArrowRight' ? (index + 1) % buttons.length
      : event.key === 'ArrowLeft' ? (index - 1 + buttons.length) % buttons.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : null
    if (next !== null) {
      event.preventDefault()
      buttons[next]?.focus()
    }
  }

  if (!shown) return null
  const label = t('notesOpenTabs')
  const moreLabel = t('notesOtherOpenTabsCount', {count: rest.length})
  const addLabel = t('notesOpenOverviewTab')
  const draggable = !busy && tabs.length > 1

  return <nav ref={root} className="paper-note-tabs" aria-label={label} onKeyDown={keys} {...drag.events}>
    <div className="paper-tabs-list" role="tablist" aria-label={label}>
      {visible.map((tab, index) => {
        const selected = activeId === tab.id
        const name = title(tab)
        return <div className="paper-note-tab" key={tab.id} data-reading-tab-id={tab.id} data-active={selected}>
          <RowMenu triggerVisible={false} label={t('notesTabActions', {title: name})} actions={actions(tab.id)}>
            <button type="button" role="tab" tabIndex={selected || (!active && index === 0) ? 0 : -1}
              aria-selected={selected} aria-haspopup="menu" title={name} disabled={busy}
              data-tab-id={tab.id} data-tab-drag={draggable ? tab.id : undefined} onClick={() => void select(tab.id)}>
              {name}
            </button>
            {session.canClose(tab.id) && <button type="button" className="paper-tab-close"
              aria-label={t('notesCloseNamedTab', {title: name})} title={t('notesCloseTab')}
              disabled={busy} onClick={() => void close(tab.id)}><X size={12} aria-hidden="true"/></button>}
          </RowMenu>
        </div>
      })}
    </div>
    {session.hasOverview && <button type="button" className="paper-tabs-add" aria-label={addLabel} title={addLabel}
      disabled={busy} onClick={() => void select(overviewTabId, true)}><Plus size={17} aria-hidden="true"/></button>}
    {!!rest.length && <button ref={trigger} type="button" className="paper-tabs-more" aria-label={moreLabel}
      title={moreLabel} aria-expanded={showOverflow} aria-haspopup="dialog" onClick={() => {
        const rect = trigger.current!.getBoundingClientRect()
        setAt({top: rect.bottom + 4, right: Math.max(8, innerWidth - rect.right)})
        setMore(!showOverflow)
      }}><ChevronDown size={16} aria-hidden="true"/><small aria-hidden="true">{rest.length}</small></button>}
    <span className="paper-tab-announcement" role="status">{announcement}</span>
    {showOverflow && createPortal(<div ref={overflow} className="paper-tabs-overflow" role="dialog"
      aria-label={t('notesOtherOpenTabs')} style={{...appearanceProps.style, ...at}} onKeyDown={event => {
        if (event.key !== 'Escape' || cancelDrag(event)) return
        event.preventDefault()
        event.stopPropagation()
        setMore(false)
        trigger.current?.focus()
      }}>
      <header>{t('notesOtherOpenTabs')}</header>
      {rest.map(tab => <RowMenu key={tab.id} triggerVisible={false} label={t('notesTabActions', {title: title(tab)})} actions={actions(tab.id)}>
        <button type="button" disabled={busy} title={title(tab)} aria-haspopup="menu" data-reading-tab-id={tab.id}
          data-tab-id={tab.id} data-tab-drag={draggable ? tab.id : undefined} onClick={() => void select(tab.id, true)}>
          {title(tab)}
        </button>
      </RowMenu>)}
    </div>, document.body)}
  </nav>
}
