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
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.route('**/*', route => route.request().isNavigationRequest()
    ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><div id="root"></div>' })
    : route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false}' }))
  await page.goto('http://localhost/fixture')
  await page.addScriptTag({ content: bundle.outputFiles[0].text })
  await page.evaluate(() => fixture.mountSwitcher())
  const open = page.locator('#open'), input = page.getByRole('searchbox')
  async function show() {
    await open.click()
    await page.waitForFunction(() => document.activeElement?.matches('input[type=search]'))
  }
  const options = page.getByRole('option')
  await show()
  assert.equal(await options.count(), 24)
  await input.press('Tab')
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Close')
  await page.keyboard.press('Enter')
  await input.waitFor({ state: 'hidden' })
  assert.deepEqual(await page.evaluate(() => fixture.actions), [])
  await show()
  await options.nth(1).focus()
  assert.equal(await options.nth(1).getAttribute('aria-selected'), 'true')
  assert.equal(await options.nth(0).getAttribute('aria-selected'), 'false')
  await page.keyboard.press('Enter')
  assert.deepEqual(await page.evaluate(() => fixture.actions), ['note:2'])
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
  assert.deepEqual(await page.evaluate(() => fixture.actions), ['note:2','note:2','note:1','tag-60'])
  await show()
  await input.press('ArrowDown')
  assert.match(await page.locator('[role=option][aria-selected=true]').innerText(), /Beta/)
  await input.press('Escape')
  await page.waitForFunction(() => document.activeElement?.id === 'open')

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
  assert.deepEqual(await slots(true,false), {browse:'flex',base:true})
  assert.deepEqual(await slots(true,true), {browse:'flex',base:true})
  assert.deepEqual(await slots(true,false), {browse:'flex',base:true})
  await slots(false,false)
  assert.deepEqual(await slots(false,true), {browse:null,base:true})
  assert.deepEqual(await slots(true,true), {browse:'flex',base:true})
  assert.deepEqual(await slots(false,true), {browse:null,base:true})
  assert.deepEqual(await slots(false,false), {browse:null,base:false})
  assert.deepEqual(errors, [])
  console.log('Switcher search, keyboard focus and sidebar/overlay mount orders passed.')
} finally {
  await browser.close()
}
