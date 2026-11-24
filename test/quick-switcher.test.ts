import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { filterQuickItems, QuickSwitcher, type QuickItem } from '../src/client/QuickSwitcher.js'
import { acquireStyleSheet, mountedStyleSheetCount } from '../src/client/styles/inject.js'
import { translator } from '../src/domain/localization.js'
import type { NotesController, NotesState } from '../src/client/notes-controller.js'

test('QuickSwitcher filters and ranks 1,200 cached items in under 50ms', () => {
  const noop = () => {}
  const items: QuickItem[] = Array.from({ length: 1200 }, (_, i) => ({
    id: `note:${i}`,
    group: 'notes',
    title: i === 777 ? '窗边工作台的图像记录' : `工程笔记 ${i} · API 设计与测试`,
    meta: i % 2 === 0 ? '开发手册' : '默认笔记本',
    keywords: i === 777 ? '图像记录 图片复核' : 'markdown sync',
    run: noop,
  }))
  items.push({ id: 'cmd:theme', group: 'commands', title: '切换浅色 / 深色模式', run: noop })

  const samples: number[] = []
  let ranked: QuickItem[] = []
  for (let i = 0; i < 7; i++) {
    const start = performance.now()
    ranked = filterQuickItems(items, '窗边 图像', 24)
    samples.push(performance.now() - start)
  }
  samples.sort((a, b) => a - b)
  const median = samples[Math.floor(samples.length / 2)]!
  assert.equal(ranked[0]?.id, 'note:777')
  assert.ok(median < 50, `expected median < 50ms, got ${median.toFixed(2)}ms`)

  const exact = filterQuickItems(items, '浅色 深色', 10)
  assert.equal(exact[0]?.id, 'cmd:theme')
})

test('QuickSwitcher renders localized Chinese and English dialog markup cleanly', () => {
  const controller = { api: async () => ({ ok: true, items: [], tags: [] }) } as unknown as NotesController
  const state = { items: [], notebooks: [], filter: {}, section: 'notes' } as unknown as NotesState
  for (const [lang, expected] of [
    ['zh', '快速切换与命令面板'],
    ['en', 'Quick switcher and command palette'],
  ] as const) {
    const html = renderToStaticMarkup(
      createElement(QuickSwitcher, {
        open: true,
        onClose: () => {},
        controller,
        state,
        books: [],
        t: translator(lang),
        onOpenNote: () => {},
        onOpenBook: () => {},
        onFilterTag: () => {},
        onCreate: () => {},
        onToggleTheme: () => {},
        onSync: () => {},
        onNavigate: () => {},
      }),
    )
    assert.ok(html.includes(expected), lang)
  }
})

test('singleton stylesheet manager deduplicates mounts with @layer and cleans up on last release', () => {
  const appended: Array<{ dataset: Record<string, string>; textContent: string; isConnected: boolean; remove: () => void }> = []
  const fakeHead = {
    querySelector: () => null,
    prepend: (el: (typeof appended)[number]) => {
      el.isConnected = true
      appended.unshift(el)
    },
    append: (el: (typeof appended)[number]) => {
      el.isConnected = true
      appended.push(el)
    },
  }
  const previous = globalThis.document
  ;(globalThis as unknown as { document: unknown }).document = {
    head: fakeHead,
    createElement: () => {
      const node = {
        dataset: {} as Record<string, string>,
        textContent: '',
        isConnected: false,
        remove() {
          node.isConnected = false
          const idx = appended.indexOf(node)
          if (idx >= 0) appended.splice(idx, 1)
        },
      }
      return node
    },
  }
  try {
    const releaseA = acquireStyleSheet('demo', '.a{color:red}', 'components')
    const releaseB = acquireStyleSheet('demo', '.a{color:red}', 'components')
    assert.equal(mountedStyleSheetCount(), 1)
    assert.ok(appended.some(n => n.textContent.includes('@layer components')))
    releaseA()
    assert.equal(mountedStyleSheetCount(), 1)
    releaseB()
    assert.equal(mountedStyleSheetCount(), 0)
  } finally {
    ;(globalThis as unknown as { document: unknown }).document = previous
  }
})
