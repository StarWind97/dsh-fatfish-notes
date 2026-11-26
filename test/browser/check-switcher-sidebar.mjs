import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.FATFISH_PLAYWRIGHT || 'playwright')
const bundle = await build({
  entryPoints: ['test/browser/fixtures/switcher-sidebar.tsx'],
  bundle: true, write: false, format: 'iife', globalName: 'fixture', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  alias: { 'decode-named-character-reference': require.resolve('decode-named-character-reference') },
})
const browser = await chromium.launch({
  executablePath: process.env.FATFISH_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, chromiumSandbox: true,
})
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.route('**/*', route => route.request().isNavigationRequest()
    ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><div id="root"></div>' })
    : route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false}' }))
  await page.goto('http://localhost/fixture')
  await page.addScriptTag({ content: bundle.outputFiles[0].text })
  await page.evaluate(() => fixture.mountSwitcher())
  const open = page.locator('#open'), input = page.getByRole('searchbox')
  const options = page.getByRole('option')
  async function show() {
    await open.click()
    await page.waitForFunction(() => document.activeElement?.matches('input[type=search]'))
  }
  async function settleFrames() {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  }
  async function activeState() {
    return page.evaluate(() => {
      const active = document.activeElement
      const selected = [...document.querySelectorAll('[role=option][aria-selected=true]')].map(el => el.textContent?.trim())
      const highlighted = [...document.querySelectorAll('[role=option][data-active=true]')].map(el => el.textContent?.trim())
      return {
        tag: active?.tagName ?? null,
        role: active?.getAttribute('role') ?? null,
        id: active?.id ?? '',
        text: active?.textContent?.trim() ?? '',
        isInput: Boolean(active?.matches('input[type=search]')),
        selected,
        highlighted,
      }
    })
  }

  // 1. 24-item cap + Tab to Close button + Enter closes without triggering any result.
  await show()
  assert.equal(await options.count(), 24)
  await input.press('Tab')
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Close')
  await page.keyboard.press('Enter')
  await input.waitFor({ state: 'hidden' })
  assert.deepEqual(await page.evaluate(() => fixture.actions), [])

  // 2. R2: ArrowUp from 1st item wraps to 24th item and scrolls it into the visible list viewport while input keeps focus; ArrowDown wraps back to 1st item and scrolls it back into view.
  await show()
  await input.press('ArrowUp')
  await settleFrames()
  const wrappedEnd = await page.evaluate(() => {
    const list = document.querySelector('.paper-cmd-list')
    const active = document.querySelector('[role=option][aria-selected=true]')
    const lr = list.getBoundingClientRect(), ar = active.getBoundingClientRect()
    return {
      isInput: document.activeElement?.matches('input[type=search]'),
      text: active.textContent.trim(),
      scrollTop: list.scrollTop,
      visibleInList: ar.top >= lr.top - 1 && ar.bottom <= lr.bottom + 1,
    }
  })
  assert.equal(wrappedEnd.isInput, true)
  assert.match(wrappedEnd.text, /Item 22 crowd/)
  assert.ok(wrappedEnd.scrollTop > 0, `expected list scrolled down, got scrollTop=${wrappedEnd.scrollTop}`)
  assert.equal(wrappedEnd.visibleInList, true, '24th option should scroll into list viewport on ArrowUp')
  await input.press('ArrowDown')
  await settleFrames()
  const wrappedStart = await page.evaluate(() => {
    const list = document.querySelector('.paper-cmd-list')
    const active = document.querySelector('[role=option][aria-selected=true]')
    const lr = list.getBoundingClientRect(), ar = active.getBoundingClientRect()
    return {
      isInput: document.activeElement?.matches('input[type=search]'),
      text: active.textContent.trim(),
      visibleInList: ar.top >= lr.top - 1 && ar.bottom <= lr.bottom + 1,
    }
  })
  assert.equal(wrappedStart.isInput, true)
  assert.match(wrappedStart.text, /Alpha/)
  assert.equal(wrappedStart.visibleInList, true, '1st option should scroll back into list viewport on ArrowDown')
  await input.press('Escape')
  await input.waitFor({ state: 'hidden' })

  // 3. R1 (insertion shifts indices): real Tab to 2nd result (Beta), then late body search inserts pairkey Gamma ahead -> focus, highlight, aria-selected, and Enter all stay on Beta.
  await show()
  await input.fill('pairkey')
  await page.waitForFunction(() => fixture.requests.includes('pairkey'))
  assert.equal(await options.count(), 2)
  await page.keyboard.press('Tab') // Close
  await page.keyboard.press('Tab') // Alpha
  await page.keyboard.press('Tab') // Beta
  let st = await activeState()
  assert.match(st.text, /Beta/)
  assert.equal(st.selected.length, 1)
  assert.match(st.selected[0], /Beta/)
  await page.evaluate(() => fixture.finishQuery('pairkey'))
  await options.filter({ hasText: 'pairkey Gamma' }).waitFor()
  await settleFrames()
  assert.equal(await options.count(), 3)
  st = await activeState()
  assert.equal(st.role, 'option')
  assert.match(st.text, /Beta/)
  assert.deepEqual(st.selected, st.highlighted)
  assert.match(st.selected[0], /Beta/, `expected aria-selected on Beta after late insert, got ${JSON.stringify(st)}`)
  await page.keyboard.press('Enter')
  await input.waitFor({ state: 'hidden' })
  assert.deepEqual(await page.evaluate(() => fixture.actions), ['note:2'])

  // 4. R1 (same-count reorder): real Tab to Beta in [Alpha, Beta], late response swaps to [Beta, Alpha] -> focus, highlight, aria-selected, and Enter stay on Beta.
  await page.evaluate(() => fixture.clearActions())
  await show()
  await input.fill('reorder')
  await page.waitForFunction(() => fixture.requests.includes('reorder'))
  assert.equal(await options.count(), 2)
  await page.keyboard.press('Tab') // Close
  await page.keyboard.press('Tab') // Alpha
  await page.keyboard.press('Tab') // Beta
  st = await activeState()
  assert.match(st.text, /Beta/)
  await page.evaluate(() => fixture.finishQuery('reorder'))
  await settleFrames()
  assert.equal(await options.count(), 2)
  assert.match(await options.nth(0).innerText(), /Beta/)
  st = await activeState()
  assert.equal(st.role, 'option')
  assert.match(st.text, /Beta/)
  assert.deepEqual(st.selected, st.highlighted)
  assert.match(st.selected[0], /Beta/, `expected aria-selected on Beta after same-count reorder, got ${JSON.stringify(st)}`)
  await page.keyboard.press('Enter')
  await input.waitFor({ state: 'hidden' })
  assert.deepEqual(await page.evaluate(() => fixture.actions), ['note:2'])

  // 5. R1 (full 24 items, Shift+Tab to last item, late top match evicts it): focus returns to input/valid control inside modal, highlight stays synced, Esc closes modal and restores opener focus.
  await page.evaluate(() => fixture.clearActions())
  await show()
  await input.fill('crowd')
  await page.waitForFunction(() => fixture.requests.includes('crowd'))
  assert.equal(await options.count(), 24)
  await page.keyboard.press('Shift+Tab')
  st = await activeState()
  assert.equal(st.role, 'option')
  assert.match(st.text, /Item 24 crowd/)
  assert.match(st.selected[0], /Item 24 crowd/)
  await page.evaluate(() => fixture.finishQuery('crowd'))
  await options.filter({ hasText: 'crowd-top' }).waitFor()
  await settleFrames()
  assert.equal(await options.count(), 24)
  st = await activeState()
  assert.equal(st.tag !== 'BODY', true, `focus must not escape to BODY after eviction: ${JSON.stringify(st)}`)
  assert.equal(st.isInput, true, `expected focus recovered to input after 24th item eviction, got ${JSON.stringify(st)}`)
  assert.deepEqual(st.selected, st.highlighted)
  assert.match(st.selected[0], /crowd-top/)
  await page.keyboard.press('Escape')
  await input.waitFor({ state: 'hidden' })
  await page.waitForFunction(() => document.activeElement?.id === 'open')

  // 6. Reopen first-frame check (B): input is synchronously focused before rAF with empty query and fresh 24 items.
  await show()
  await input.fill('budget.xlsx')
  await options.filter({ hasText: 'Beta' }).waitFor()
  await input.press('Escape')
  await input.waitFor({ state: 'hidden' })
  const firstFrame = await page.evaluate(() => new Promise(resolve => {
    // Queue probe BEFORE click so a component using rAF-deferred focus would still be unfocused here.
    requestAnimationFrame(() => {
      const el = document.querySelector('input[type=search]')
      const opts = [...document.querySelectorAll('[role=option]')]
      resolve({
        focusedBeforeComponentRaf: document.activeElement === el,
        queryValue: el?.value ?? null,
        count: opts.length,
        firstText: opts[0]?.textContent?.trim() ?? '',
        firstSelected: opts[0]?.getAttribute('aria-selected') ?? null,
      })
    })
    document.querySelector('#open').click()
  }))
  assert.equal(firstFrame.focusedBeforeComponentRaf, true, `expected synchronous layout-effect focus before first paint: ${JSON.stringify(firstFrame)}`)
  assert.equal(firstFrame.queryValue, '', `expected cleared query on reopen: ${JSON.stringify(firstFrame)}`)
  assert.equal(firstFrame.count, 24)
  assert.match(firstFrame.firstText, /Alpha/)
  assert.equal(firstFrame.firstSelected, 'true')
  await input.press('Escape')
  await input.waitFor({ state: 'hidden' })

  // 7. Existing coverage: stale slow query ignored, attachment-only & body-only matches, dedupe, 60+ tag catalog, ArrowDown.
  await page.evaluate(() => fixture.clearActions())
  await show()
  await input.fill('slow')
  await page.waitForFunction(() => fixture.requests.includes('slow'))
  await input.fill('budget.xlsx')
  await options.filter({ hasText: 'Beta' }).waitFor()
  await page.evaluate(async () => {
    fixture.finishSlow()
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
  assert.equal(await options.count(), 1)
  assert.match(await options.first().innerText(), /Beta/)
  await input.press('Enter')
  await show()
  await input.fill('body-only')
  await options.filter({ hasText: 'Alpha' }).waitFor()
  assert.equal(await options.count(), 1)
  await input.press('Enter')
  await show()
  await input.fill('Alpha')
  await page.waitForFunction(() => fixture.requests.includes('Alpha'))
  assert.equal(await options.count(), 1)
  await input.press('Escape')
  await show()
  await input.fill('tag-')
  assert.equal(await options.count(), 24)
  await input.fill('#tag-60')
  await page.getByRole('option', { name: /#tag-60/ }).click()
  assert.deepEqual(await page.evaluate(() => fixture.actions), ['note:2', 'note:1', 'tag-60'])
  await show()
  await input.press('ArrowDown')
  assert.match(await page.locator('[role=option][aria-selected=true]').innerText(), /Beta/)
  await input.press('Escape')
  await page.waitForFunction(() => document.activeElement?.id === 'open')

  // 8. Sidebar & capture overlay mount/unmount orders keep styles intact.
  async function slots(sidebar, overlay) {
    return page.evaluate(([side, capture]) => {
      fixture.mountSlots(side, capture)
      const browse = document.querySelector('.conversation-browse')
      return {
        browse: browse ? getComputedStyle(browse).display : null,
        base: !!document.querySelector('style[data-fatfish-style="components:conversation-notes"]'),
      }
    }, [sidebar, overlay])
  }
  assert.deepEqual(await slots(true, false), { browse: 'flex', base: true })
  assert.deepEqual(await slots(true, true), { browse: 'flex', base: true })
  assert.deepEqual(await slots(true, false), { browse: 'flex', base: true })
  await slots(false, false)
  assert.deepEqual(await slots(false, true), { browse: null, base: true })
  assert.deepEqual(await slots(true, true), { browse: 'flex', base: true })
  assert.deepEqual(await slots(false, true), { browse: null, base: true })
  assert.deepEqual(await slots(false, false), { browse: null, base: false })
  assert.deepEqual(errors, [])
  console.log('Switcher search, async focus alignment, off-screen scroll and sidebar/overlay mount orders passed.')
} finally {
  await browser.close()
}
