import { useEffect, useLayoutEffect } from 'react'

const useIsoLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect

export type StyleLayer = 'base' | 'layout' | 'components' | 'themes' | 'overrides'

const LAYER_ORDER = '@layer base, layout, components, themes, overrides;'

interface Entry {
  count: number
  css: string
  el: HTMLStyleElement
}

const registry = new Map<string, Entry>()
let layerOrderEl: HTMLStyleElement | null = null

function ensureLayerOrder() {
  if (typeof document === 'undefined' || !document.head) return
  if (layerOrderEl && layerOrderEl.isConnected) return
  const existing = document.head.querySelector<HTMLStyleElement>('style[data-fatfish-layers]')
  if (existing) {
    layerOrderEl = existing
    return
  }
  const el = document.createElement('style')
  el.dataset.fatfishLayers = '1'
  el.textContent = LAYER_ORDER
  document.head.prepend(el)
  layerOrderEl = el
}

function formatCss(css: string, layer?: StyleLayer): string {
  return layer ? `@layer ${layer} {\n${css}\n}` : css
}

export function acquireStyleSheet(id: string, css: string, layer?: StyleLayer): () => void {
  if (typeof document === 'undefined' || !document.head) return () => {}
  ensureLayerOrder()
  const key = layer ? `${layer}:${id}` : id
  const text = formatCss(css, layer)
  let entry = registry.get(key)
  if (!entry) {
    const el = document.createElement('style')
    el.dataset.fatfishStyle = key
    el.textContent = text
    document.head.append(el)
    entry = { count: 0, css: text, el }
    registry.set(key, entry)
  } else if (entry.css !== text) {
    entry.css = text
    entry.el.textContent = text
  }
  entry.count++
  let released = false
  return () => {
    if (released) return
    released = true
    const current = registry.get(key)
    if (!current) return
    current.count--
    if (current.count <= 0) {
      current.el.remove()
      registry.delete(key)
    }
  }
}

/** Mounts a deduplicated stylesheet once in document.head across all plugin views. */
export function useStyleSheet(id: string, css: string, layer?: StyleLayer): void {
  useIsoLayoutEffect(() => acquireStyleSheet(id, css, layer), [id, css, layer])
}

/** Exposed for tests to inspect currently mounted singleton style sheets. */
export function mountedStyleSheetCount(): number {
  return registry.size
}
