import {useLayoutEffect, useRef, type MouseEvent, type PointerEvent, type RefObject} from 'react'

interface Destination {
  element: HTMLElement
  id: string | null
  side: 'before' | 'after'
}

interface TabDrag {
  source: HTMLButtonElement
  pointerId: number
  x: number
  y: number
  moving: boolean
  destination: Destination | null
}

export function useNoteTabDrag(
  root: RefObject<HTMLElement>,
  overflow: RefObject<HTMLDivElement>,
  move: (id: string, target: string | null, side: Destination['side']) => void,
) {
  const gesture = useRef<TabDrag | null>(null)
  const suppressClick = useRef(false)

  function end() {
    const drag = gesture.current
    if (!drag) return
    gesture.current = null
    delete drag.source.dataset.dragging
    if (drag.destination) delete drag.destination.element.dataset.tabDrop
    const bar = root.current
    if (bar?.hasPointerCapture(drag.pointerId)) bar.releasePointerCapture(drag.pointerId)
    if (drag.source.hasPointerCapture(drag.pointerId)) drag.source.releasePointerCapture(drag.pointerId)
    suppressClick.current = drag.moving
  }
  useLayoutEffect(() => () => end(), [])

  function destination(x: number, y: number): Destination | null {
    const bar = root.current
    const hit = document.elementFromPoint(x, y)
    if (!bar || !hit || (!bar.contains(hit) && !overflow.current?.contains(hit))) return null
    const list = bar.querySelector<HTMLElement>('.paper-tabs-list')
    const add = bar.querySelector<HTMLElement>('.paper-tabs-add')
    if (add?.contains(hit) || (hit === bar && list && x >= list.getBoundingClientRect().right)) {
      return {element: add ?? bar, id: null, side: 'after'}
    }
    const item = hit.closest<HTMLElement>('[data-reading-tab-id]')
    if (item && item.dataset.readingTabId !== gesture.current?.source.dataset.tabDrag) {
      const rect = item.getBoundingClientRect()
      const before = overflow.current?.contains(item) ? y < (rect.top + rect.bottom) / 2 : x < (rect.left + rect.right) / 2
      return {element: item, id: item.dataset.readingTabId!, side: before ? 'before' : 'after'}
    }
    if (hit === list) {
      const next = [...list.querySelectorAll<HTMLElement>('[data-reading-tab-id]')]
        .find(tab => tab.getBoundingClientRect().left > x)
      if (next && next.dataset.readingTabId !== gesture.current?.source.dataset.tabDrag) {
        return {element: next, id: next.dataset.readingTabId!, side: 'before'}
      }
    }
    return null
  }

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (!event.isPrimary || event.button !== 0) return
    suppressClick.current = false
    const source = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-tab-drag]')
    if (!source || source.disabled || gesture.current) return
    gesture.current = {source, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moving: false, destination: null}
    source.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const drag = gesture.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (!drag.moving) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) return
      drag.moving = true
      event.currentTarget.setPointerCapture(event.pointerId)
      drag.source.dataset.dragging = 'true'
    }
    const next = destination(event.clientX, event.clientY)
    if (drag.destination?.element === next?.element && drag.destination?.side === next?.side) return
    if (drag.destination) delete drag.destination.element.dataset.tabDrop
    if (next) next.element.dataset.tabDrop = next.id === null ? 'end' : next.side
    drag.destination = next
  }

  function onPointerUp(event: PointerEvent<HTMLElement>) {
    const drag = gesture.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const target = drag.moving ? destination(event.clientX, event.clientY) : null
    end()
    if (target) move(drag.source.dataset.tabDrag!, target.id, target.side)
  }

  function onPointerCancel(event: PointerEvent<HTMLElement>) {
    if (gesture.current?.pointerId === event.pointerId) end()
  }

  function onLostPointerCapture(event: PointerEvent<HTMLElement>) {
    // Starting the drag moves capture from the title button to the tab bar.
    if (event.target === event.currentTarget || !gesture.current?.moving) onPointerCancel(event)
  }

  function onClickCapture(event: MouseEvent<HTMLElement>) {
    if (!suppressClick.current || event.detail === 0) return
    suppressClick.current = false
    event.stopPropagation()
    event.preventDefault()
  }

  return {end, moving: () => !!gesture.current?.moving,
    events: {onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture, onClickCapture}}
}
