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
    await page.mouse.move(4, 4)
    await open.click()
    await page.waitForFunction(() => document.activeElement?.matches('input[type=search]'))
  }
  async function settleFrames() {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  }
  async function hoverLocator(locator) {
    const box = await locator.boundingBox()
    assert.ok(box, 'expected bounding box for hover target')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  }
  async function activeState() {
    return page.evaluate(() => {
      const active = document.activeElement
      const list = document.querySelector('.paper-cmd-list')
      const selectedEls = [...document.querySelectorAll('[role=option][aria-selected=true]')]
      const highlightedEls = [...document.querySelectorAll('[role=option][data-active=true]')]
      const selectedEl = selectedEls[0] ?? null
      const lr = list?.getBoundingClientRect() ?? null
      const ar = selectedEl?.getBoundingClientRect() ?? null
      return {
        tag: active?.tagName ?? null,
        role: active?.getAttribute('role') ?? null,
        id: active?.id ?? '',
        itemId: active?.getAttribute('data-item-id') ?? null,
        text: active?.textContent?.trim() ?? '',
        isInput: Boolean(active?.matches('input[type=search]')),
        selected: selectedEls.map(el => el.textContent?.trim()),
        selectedIds: selectedEls.map(el => el.getAttribute('data-item-id')),
        highlighted: highlightedEls.map(el => el.textContent?.trim()),
        highlightedIds: highlightedEls.map(el => el.getAttribute('data-item-id')),
        scrollTop: list?.scrollTop ?? null,
        selectedVisibleInList: Boolean(lr && ar && ar.top >= lr.top - 1 && ar.bottom <= lr.bottom + 1),
        bounds: lr && ar ? { itemTop: ar.top, itemBottom: ar.bottom, listTop: lr.top, listBottom: lr.bottom } : null,
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

  // 2. Normal mouse move hover + click works without unexpected scrolling.
  await show()
  await hoverLocator(options.nth(1))
  await settleFrames()
  let st = await activeState()
  assert.equal(st.scrollTop, 0)
  assert.deepEqual(st.selectedIds, ['note:2'])
  assert.deepEqual(st.highlightedIds, ['note:2'])
  await options.nth(1).click()
  await input.waitFor({ state: 'hidden' })
  assert.deepEqual(await page.evaluate(() => fixture.actions), ['note:2'])
  await page.evaluate(() => fixture.clearActions())

  // 3. R2: ArrowUp from 1st item wraps to 24th item and scrolls it into the visible list viewport while input keeps focus; ArrowDown wraps back to 1st item.
  await show()
  await input.press('ArrowUp')
  await settleFrames()
  st = await activeState()
  assert.equal(st.isInput, true)
  assert.deepEqual(st.selectedIds, ['note:item-22'])
  assert.ok(st.scrollTop > 0, `expected list scrolled down, got scrollTop=${st.scrollTop}`)
  assert.equal(st.selectedVisibleInList, true, `24th option should scroll into list viewport on ArrowUp: ${JSON.stringify(st.bounds)}`)
  await input.press('ArrowDown')
  await settleFrames()
  st = await activeState()
  assert.equal(st.isInput, true)
  assert.deepEqual(st.selectedIds, ['note:1'])
  assert.equal(st.selectedVisibleInList, true, `1st option should scroll back into list viewport on ArrowDown: ${JSON.stringify(st.bounds)}`)
  await input.press('Escape')
  await input.waitFor({ state: 'hidden' })

  // 4. R1 (no pointer inside list): real Tab to Beta, late pairkey Gamma inserts ahead -> focus, highlight, aria-selected, Enter all stay on Beta.
  await show()
  await input.fill('pairkey')
  await page.waitForFunction(() => fixture.requests.includes('pairkey'))
  assert.equal(await options.count(), 2)
  await page.keyboard.press('Tab') // Close
  await page.keyboard.press('Tab') // Alpha
  await page.keyboard.press('Tab') // Beta
  await page.evaluate(() => fixture.finishQuery('pairkey'))
  await options.filter({ hasText: 'pairkey Gamma' }).waitFor()
  await settleFrames()
  assert.equal(await options.count(), 3)
  st = await activeState()
  assert.equal(st.itemId, 'note:2')
  assert.deepEqual(st.selectedIds, ['note:2'])
  assert.deepEqual(st.highlightedIds, ['note:2'])
  await page.keyboard.press('Enter')
  await input.waitFor({ state: 'hidden' })
  assert.deepEqual(await page.evaluate(() => fixture.actions), ['note:2'])

  // 5. Mixed #1 (P1): search pairkey, stationary pointer on Alpha, real Tab x3 to Beta, late Gamma arrives -> focus, highlight, aria-selected, Enter all stay on Beta.
  await page.evaluate(() => fixture.clearActions())
  await show()
  await input.fill('pairkey')
  await page.waitForFunction(() => fixture.requests.filter(q => q === 'pairkey').length >= 2)
  assert.equal(await options.count(), 2)
  await hoverLocator(options.nth(0)) // stationary pointer on Alpha
  await page.keyboard.press('Tab') // Close
  await page.keyboard.press('Tab') // Alpha
  await page.keyboard.press('Tab') // Beta
  st = await activeState()
  assert.equal(st.itemId, 'note:2')
  assert.deepEqual(st.selectedIds, ['note:2'])
  await page.evaluate(() => fixture.finishQuery('pairkey'))
  await options.filter({ hasText: 'pairkey Gamma' }).waitFor()
  await settleFrames()
  st = await activeState()
  assert.equal(st.itemId, 'note:2', `Mixed #1 focus must stay on Beta: ${JSON.stringify(st)}`)
  assert.deepEqual(st.selectedIds, ['note:2'], `Mixed #1 aria-selected must stay on Beta, not Gamma: ${JSON.stringify(st)}`)
  assert.deepEqual(st.highlightedIds, ['note:2'], `Mixed #1 highlight must stay on Beta: ${JSON.stringify(st)}`)
  await page.keyboard.press('Enter')
  await input.waitFor({ state: 'hidden' })
  assert.deepEqual(await page.evaluate(() => fixture.actions), ['note:2'])

  // 6. Mixed #2 (P1): same-count reorder [Alpha, Beta] -> [Beta, Alpha] with stationary pointer AND keyboard focus on Beta -> focus, highlight, aria-selected, Enter stay on Beta.
  await page.evaluate(() => fixture.clearActions())
  await show()
  await input.fill('reorder')
  await page.waitForFunction(() => fixture.requests.includes('reorder'))
  assert.equal(await options.count(), 2)
  await hoverLocator(options.nth(1)) // stationary pointer on Beta
  await page.keyboard.press('Tab') // Close
  await page.keyboard.press('Tab') // Alpha
  await page.keyboard.press('Tab') // Beta
  st = await activeState()
  assert.equal(st.itemId, 'note:2')
  await page.evaluate(() => fixture.finishQuery('reorder'))
  await page.waitForFunction(() => document.querySelectorAll('[role=option]')[0]?.getAttribute('data-item-id') === 'note:2')
  await settleFrames()
  assert.equal(await options.count(), 2)
  st = await activeState()
  assert.equal(st.itemId, 'note:2', `Mixed #2 focus must stay on Beta: ${JSON.stringify(st)}`)
  assert.deepEqual(st.selectedIds, ['note:2'], `Mixed #2 aria-selected must stay on Beta, not Alpha: ${JSON.stringify(st)}`)
  assert.deepEqual(st.highlightedIds, ['note:2'], `Mixed #2 highlight must stay on Beta: ${JSON.stringify(st)}`)
  await page.keyboard.press('Enter')
  await input.waitFor({ state: 'hidden' })
  assert.deepEqual(await page.evaluate(() => fixture.actions), ['note:2'])

  // 7. Mixed #3 (P1 regression): 24-item list, input focused, stationary pointer on Alpha, ArrowUp wraps to 24th item (note:item-22), settle 2 frames, Enter must open note:item-22 (not note:item-9).
  await page.evaluate(() => fixture.clearActions())
  await show()
  assert.equal(await options.count(), 24)
  await hoverLocator(options.nth(0)) // stationary pointer on Alpha
  await input.press('ArrowUp')
  await settleFrames()
  st = await activeState()
  assert.equal(st.isInput, true)
  assert.deepEqual(st.selectedIds, ['note:item-22'], `Mixed #3 ArrowUp with stationary pointer must keep note:item-22 selected: ${JSON.stringify(st)}`)
  assert.deepEqual(st.highlightedIds, ['note:item-22'])
  assert.equal(st.selectedVisibleInList, true, `Mixed #3 24th item must be visible in list: ${JSON.stringify(st.bounds)}`)
  await input.press('Enter')
  await input.waitFor({ state: 'hidden' })
  assert.deepEqual(await page.evaluate(() => fixture.actions), ['note:item-22'])

  // 8. Mixed #4 (P2 eviction visibility, both Enter and Esc): search crowd, Shift+Tab to 24th item, late crowd-top evicts it -> focus returns to input, crowd-top scrolled into view; test Enter AND Esc.
  for (const ending of ['Enter', 'Escape']) {
    await page.evaluate(() => fixture.clearActions())
    await show()
    const beforeCrowdReqs = await page.evaluate(() => fixture.requests.filter(q => q === 'crowd').length)
    await input.fill('crowd')
    await page.waitForFunction(n => fixture.requests.filter(q => q === 'crowd').length > n, beforeCrowdReqs)
    assert.equal(await options.count(), 24)
    await page.keyboard.press('Shift+Tab')
    st = await activeState()
    assert.equal(st.itemId, 'note:item-24')
    await page.evaluate(() => fixture.finishQuery('crowd'))
    await options.filter({ hasText: 'crowd-top' }).waitFor()
    await settleFrames()
    assert.equal(await options.count(), 24)
    st = await activeState()
    assert.equal(st.isInput, true, `Mixed #4 (${ending}) focus must recover to input: ${JSON.stringify(st)}`)
    assert.deepEqual(st.selectedIds, ['note:crowd-top'])
    assert.deepEqual(st.highlightedIds, ['note:crowd-top'])
    assert.equal(st.selectedVisibleInList, true, `Mixed #4 (${ending}) evicted fallback 1st item must be visible in list: ${JSON.stringify(st.bounds)}`)
    if (ending === 'Enter') {
      await input.press('Enter')
      await input.waitFor({ state: 'hidden' })
      assert.deepEqual(await page.evaluate(() => fixture.actions), ['note:crowd-top'])
    } else {
      await input.press('Escape')
      await input.waitFor({ state: 'hidden' })
      await page.waitForFunction(() => document.activeElement?.id === 'open')
      assert.deepEqual(await page.evaluate(() => fixture.actions), [])
    }
  }

  // 9. Mixed #5 (P2 typing after ArrowUp to bottom): input focused, ArrowUp to last item, type 'crowd' key-by-key -> 1st item (note:item-1) must scroll into list viewport and Enter opens note:item-1.
  await page.evaluate(() => fixture.clearActions())
  await show()
  await input.press('ArrowUp')
  await settleFrames()
  st = await activeState()
  assert.deepEqual(st.selectedIds, ['note:item-22'])
  assert.ok(st.scrollTop > 0)
  await page.keyboard.type('crowd')
  await settleFrames()
  st = await activeState()
  assert.equal(st.isInput, true)
  assert.deepEqual(st.selectedIds, ['note:item-1'], `Mixed #5 typed query must select first matching item: ${JSON.stringify(st)}`)
  assert.deepEqual(st.highlightedIds, ['note:item-1'])
  assert.equal(st.selectedVisibleInList, true, `Mixed #5 first item after typing from bottom must be visible in list: ${JSON.stringify(st.bounds)}`)
  await input.press('Enter')
  await input.waitFor({ state: 'hidden' })
  assert.deepEqual(await page.evaluate(() => fixture.actions), ['note:item-1'])

  // 10. Reopen first-frame check (B): input is synchronously focused before component rAF with empty query and fresh 24 items.
  await show()
  await input.fill('budget.xlsx')
  await options.filter({ hasText: 'Beta' }).waitFor()
  await input.press('Escape')
  await input.waitFor({ state: 'hidden' })
  const firstFrame = await page.evaluate(() => new Promise(resolve => {
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

  // 11. Existing coverage: stale slow query ignored, attachment-only & body-only matches, dedupe, 60+ tag catalog, ArrowDown.
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

  // 12. Sidebar & capture overlay mount/unmount orders keep styles intact.
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

  // 13. Empty-list multi-select visibility in ConversationNotes (sidebar) and NoteBatch (main/standalone).
  const head = 'a'.repeat(64)
  const bookId = '01K00000000000000000000000'
  const browseNotes = [
    { noteId: '01K00000000000000000000001', heads: [head], title: 'Alpha Note', summary: 'first', tags: [], notebookId: bookId, status: 'active', savedAt: '2026-11-27T00:00:00Z', conflicted: false, sessionRelation: null },
    { noteId: '01K00000000000000000000002', heads: [head], title: 'Beta Note', summary: 'second', tags: [], notebookId: bookId, status: 'active', savedAt: '2026-11-27T00:00:00Z', conflicted: false, sessionRelation: null },
  ]
  await page.route('**/dsh-fatfish-notes/**', async route => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace(/^\/dsh-fatfish-notes/, '')
    const raw = route.request().postData()
    const body = raw ? JSON.parse(raw) : {}
    const ok = data => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, ...data }) })
    if (path === '/workspace/register' || path === '/workspace/state') {
      return ok({ serviceEpoch: 'e1', changeSeq: 1, available: false, owned: null, handoff: null, repositoryId: 1 })
    }
    if (path === '/notes/session-context') return ok({ workspace: null, notebookId: null })
    if (path === '/notes/notebooks') {
      return ok({ notebooks: [{ notebookId: bookId, heads: [head], current: { version: 1, notebookId: bookId, title: 'Default', status: 'active', recordedAt: '2026-11-27T00:00:00Z', parents: [], revision: head }, conflicts: [], isDefault: true, noteCount: 2 }] })
    }
    if (path === '/notes/catalog') return ok({ tags: [] })
    if (path === '/notes') {
      if (body.relation === 'linked') return ok({ items: [], cursor: null })
      const q = String(body.query ?? '').trim().toLowerCase()
      const items = q ? browseNotes.filter(n => n.title.toLowerCase().includes(q)) : browseNotes
      return ok({ items, cursor: null })
    }
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false}' })
  })

  await page.evaluate(() => fixture.mountVisibleSidebar())
  const sidebar = page.locator('.conversation-notes')
  await sidebar.locator('.conversation-empty').waitFor()
  // Empty linked tab: neither selection bar nor Select button should render.
  assert.equal(await sidebar.locator('.conversation-selection-bar').count(), 0)
  assert.equal(await sidebar.getByRole('button', { name: 'Select notes', exact: true }).count(), 0)

  // Switch to Find notes with 2 matching notes: status + Select button appear.
  await sidebar.getByRole('button', { name: 'Find notes', exact: true }).click()
  await sidebar.locator('.conversation-note-row').first().waitFor()
  assert.equal(await sidebar.locator('.conversation-selection-bar').count(), 1)
  assert.equal(await sidebar.getByRole('button', { name: 'Select notes', exact: true }).count(), 1)

  // Narrow Find notes to 0 hits: status remains visible while Select button hides.
  const findBox = sidebar.getByRole('searchbox')
  await findBox.fill('no-such-note-xyz')
  await sidebar.locator('.conversation-empty').waitFor()
  assert.equal(await sidebar.locator('.conversation-selection-bar .paper-search-status').count(), 1)
  assert.equal(await sidebar.getByRole('button', { name: 'Select notes', exact: true }).count(), 0)

  // Clear query -> Select button returns; enter multi-select, check a note, switch back to empty Linked notes tab.
  await findBox.fill('')
  await sidebar.locator('.conversation-note-row').first().waitFor()
  await sidebar.getByRole('button', { name: 'Select notes', exact: true }).click()
  await sidebar.getByRole('checkbox').first().check()
  await sidebar.getByRole('button', { name: 'Linked notes', exact: true }).click()
  await sidebar.locator('.conversation-empty').waitFor()
  // Active cross-tab selection keeps the selection bar and Exit selection accessible.
  assert.equal(await sidebar.locator('.conversation-selection-bar[data-selecting=true]').count(), 1)
  await sidebar.getByRole('button', { name: 'Exit selection', exact: true }).click()
  assert.equal(await sidebar.locator('.conversation-selection-bar').count(), 0)

  // Main/standalone NoteBatch: empty active & empty trash hide .paper-batch; trashing last note hides Select but keeps Undo toast.
  await page.evaluate(() => fixture.mountBatchHarness('empty'))
  await page.locator('[data-batch-harness]').waitFor()
  assert.equal(await page.locator('.paper-batch').count(), 0)
  await page.locator('#switch-trash').click()
  await settleFrames()
  assert.equal(await page.locator('.paper-batch').count(), 0)

  await page.evaluate(() => fixture.mountBatchHarness('one-trashed'))
  await page.locator('[data-batch-rows] span').waitFor()
  assert.equal(await page.getByRole('button', { name: 'Select notes', exact: true }).count(), 1)
  assert.equal(await page.getByRole('button', { name: 'Empty trash', exact: true }).count(), 1)

  await page.evaluate(() => fixture.mountBatchHarness('one-active'))
  await page.locator('[data-batch-rows] span').waitFor()
  assert.equal(await page.getByRole('button', { name: 'Select notes', exact: true }).count(), 1)
  await page.getByRole('button', { name: 'Select notes', exact: true }).click()
  await page.locator('[data-batch-rows] input[type=checkbox]').check()
  await page.getByRole('button', { name: 'Move to trash', exact: true }).click()
  const confirmDialog = page.getByRole('dialog', { name: 'Move to trash', exact: true })
  await confirmDialog.getByRole('button', { name: 'Move to trash', exact: true }).click()
  await page.waitForFunction(() => document.querySelectorAll('[data-batch-rows] span').length === 0)
  // List is now empty: Select button is gone, but Undo toast stays visible inside .paper-batch.
  assert.equal(await page.getByRole('button', { name: 'Select notes', exact: true }).count(), 0)
  const undoBtn = page.locator('.paper-batch').getByRole('button', { name: 'Undo', exact: true })
  await undoBtn.waitFor()
  await undoBtn.click()
  await page.locator('[data-batch-rows] span').waitFor()
  assert.equal(await page.getByRole('button', { name: 'Select notes', exact: true }).count(), 1)

  assert.deepEqual(errors, [])
  console.log('Switcher search, mixed pointer/keyboard focus alignment, scroll visibility, sidebar/overlay mount orders, and empty-list selection controls passed.')
} finally {
  await browser.close()
}
