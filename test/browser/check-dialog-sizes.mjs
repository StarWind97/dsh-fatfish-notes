import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import { notesCss } from '../../src/client/notes-style.ts'
import { appearanceCss } from '../../src/client/paper/appearance-style.ts'
import { dialogCss } from '../../src/client/paper/dialog-style.ts'
import { captureOptionsCss } from '../../src/client/capture-options-style.ts'
import { captureCss } from '../../src/client/capture-style.ts'
import { organizationCss } from '../../src/client/organization-style.ts'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.FATFISH_PLAYWRIGHT || 'playwright')
const bundle = await build({
  entryPoints: ['src/client/styles/inject.ts'], bundle: true, write: false,
  format: 'iife', globalName: 'styles', define: { 'process.env.NODE_ENV': '"production"' },
})
const browser = await chromium.launch({
  executablePath: process.env.FATFISH_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  chromiumSandbox: true,
})

const desktop = { width: 1540, height: 960 }
const expanded = 'capture-save capture-save-expanded'
const modes = [
  ['', 680],
  ['capture-save capture-save-compact', 556],
  [expanded, 1280],
  ['capture-save capture-save-review', 680],
  ['paper-history-dialog', 940],
  ['chat-export', 560],
]

try {
  const page = await browser.newPage({ offline: true, viewport: desktop })
  const render = async (markup, viewport, lateAppearance) => {
    await page.setViewportSize(viewport)
    await page.setContent('<!doctype html>' + markup)
    await page.addScriptTag({ content: bundle.outputFiles[0].text })
    const sheets = [
      ['notes-base', notesCss, 'base'], ['paper-dialog', dialogCss, 'components'],
      ['capture-base', captureCss, 'components'], ['capture-options', captureOptionsCss, 'components'],
      ['organization', organizationCss, 'components'],
    ]
    const appearance = ['appearance', appearanceCss, 'themes']
    if (lateAppearance) sheets.push(appearance)
    else sheets.unshift(appearance)
    await page.evaluate(entries => {
      for (const args of entries) styles.acquireStyleSheet(...args)
      for (const dialog of document.querySelectorAll('dialog')) dialog.showModal()
    }, sheets)
  }
  const measure = async (className, viewport, lateAppearance, rows = 1) => {
    const turns = Array.from({ length: rows }, (_, i) => `<p>轮次 ${i + 1}</p>`).join('')
    await render(`<dialog class="paper-dialog ${className}" data-layout="soft">
      <header><h2>保存选项</h2></header>
      <div class="notes-surface capture-panel capture-save-panel">
        <div class="capture-save-body">
          <section class="capture-save-range"><div class="capture-column-scroll">${turns}</div></section>
          <section class="capture-save-files">素材</section>
          <section class="capture-save-details">信息</section>
        </div>
        <footer class="capture-foot capture-save-foot"><button>保存</button></footer>
      </div></dialog>`, viewport, lateAppearance)
    return page.locator('dialog').evaluate(dialog => {
      const { width, height } = dialog.getBoundingClientRect()
      const body = dialog.querySelector('.capture-save-body')
      const columns = getComputedStyle(body).gridTemplateColumns
      return { width, height, columns: columns === 'none' ? 1 : columns.split(' ').length }
    })
  }

  for (const [className, width] of modes) {
    const original = await measure(className, desktop, false)
    assert.equal(original.width, width, className)
    assert.deepEqual(await measure(className, desktop, true), original, className)
  }
  const expandedShort = await measure(expanded, desktop, true)
  assert.equal(expandedShort.width, 1280)
  assert.equal(expandedShort.columns, 3)
  const expandedLong = await measure(expanded, desktop, true, 80)
  assert.ok(expandedShort.height > 0 && expandedShort.height + 100 < expandedLong.height,
    `expected the dialog to grow with its content, got ${expandedShort.height} and ${expandedLong.height}`)
  assert.ok(expandedLong.height <= 780)
  const column = page.locator('.capture-column-scroll')
  assert.ok(await column.evaluate(el => { el.scrollTop = el.scrollHeight; return el.scrollTop > 0 }))
  const save = page.getByRole('button', { name: '保存' })
  const hitTest = el => {
    const r = el.getBoundingClientRect()
    return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === el
  }
  assert.ok(await save.evaluate(hitTest), 'save stays reachable while the long column scrolls')
  const expandedTiny = await measure(expanded, { width: 104, height: 120 }, true, 80)
  assert.equal(expandedTiny.width, 92)
  assert.equal(expandedTiny.columns, 1)
  assert.ok(expandedTiny.height > 0 && expandedTiny.height <= 108, `tiny viewport height: ${expandedTiny.height}`)

  await save.scrollIntoViewIfNeeded()
  assert.ok(await save.evaluate(hitTest), 'save can be reached in the tiny viewport')
  await render(`<dialog class="paper-dialog ${expanded}" data-layout="soft">
      <dialog class="paper-dialog" data-layout="soft">普通弹窗</dialog>
    </dialog>`, desktop, true)
  const nestedWidths = await page.locator('dialog').evaluateAll(dialogs => dialogs.map(dialog => dialog.getBoundingClientRect().width))
  assert.deepEqual(nestedWidths, [1280, 680])
  console.log(`Dialog sizes pass: short ${expandedShort.height}px, long ${expandedLong.height}px, nested ${nestedWidths.join('/')}, tiny ${expandedTiny.width}×${expandedTiny.height}. Save is reachable.`)
} finally {
  await browser.close()
}
