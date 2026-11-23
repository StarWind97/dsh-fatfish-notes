import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { appearanceCss } from '../../src/client/paper/appearance-style.ts'
import { dialogCss } from '../../src/client/paper/dialog-style.ts'
import { captureOptionsCss } from '../../src/client/capture-options-style.ts'
import { captureCss } from '../../src/client/capture-style.ts'
import { organizationCss } from '../../src/client/organization-style.ts'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.FATFISH_PLAYWRIGHT || 'playwright')
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
  const measure = async (className, viewport, lateAppearance) => {
    await page.setViewportSize(viewport)
    await page.setContent(`<!doctype html>
      <style>${dialogCss + appearanceCss}</style>
      <style>${captureOptionsCss + captureCss + organizationCss}</style>
      <dialog class="paper-dialog ${className}" data-layout="soft">
        <header>保存选项</header>
        <section class="capture-save-body"><div>轮次</div><div>素材</div><div>信息</div></section>
        <footer>保存</footer>
      </dialog>
      ${lateAppearance ? `<aside><style>${appearanceCss}</style></aside>` : ''}`)
    return page.locator('dialog').evaluate(dialog => {
      dialog.showModal()
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
  assert.deepEqual(await measure(expanded, desktop, true), { width: 1280, height: 780, columns: 3 })
  assert.deepEqual(await measure(expanded, { width: 104, height: 120 }, true), {
    width: 92, height: 108, columns: 1,
  })

  await page.setViewportSize(desktop)
  await page.setContent(`<!doctype html>
    <style>${dialogCss + captureOptionsCss}</style>
    <dialog class="paper-dialog ${expanded}" data-layout="soft">
      <dialog class="paper-dialog" data-layout="soft">普通弹窗</dialog>
    </dialog>
    <style>${appearanceCss}</style>`)
  const nestedWidths = await page.locator('dialog').evaluateAll(dialogs => dialogs.map(dialog => {
    dialog.showModal()
    return dialog.getBoundingClientRect().width
  }))
  assert.deepEqual(nestedWidths, [1280, 680])
  console.log('Dialog sizes pass with late appearance styles, nested dialogs, and at 104 × 120 CSS px.')
} finally {
  await browser.close()
}
