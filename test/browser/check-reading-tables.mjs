import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.FATFISH_PLAYWRIGHT || 'playwright')
const bundle = await build({
  entryPoints: ['src/client/note-reading-image.tsx'],
  bundle: true, write: false, format: 'iife', globalName: 'reading', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  alias: { 'decode-named-character-reference': require.resolve('decode-named-character-reference') },
})
const browser = await chromium.launch({
  executablePath: process.env.FATFISH_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, chromiumSandbox: true,
})
try {
  const page = await browser.newPage({ offline: true })
  await page.setContent('<!doctype html><html lang="en"><body></body></html>')
  await page.addScriptTag({ content: bundle.outputFiles[0].text })
  for (const [columns, width, expected] of [[2, 320, 'image/png'], [15, 320, 'export_reading_width'], [15, 1440, 'image/png']]) {
    const result = await page.evaluate(async ({ columns, width }) => {
      const cells = Array.from({ length: columns }, (_, i) => 'Column' + (i + 1))
      const body = [cells, cells.map(() => '---'), cells].map(row => '|' + row.join('|') + '|').join('\n')
      const current = { title: 'Table', summary: '', body, tags: [], assetIds: [], attachments: [] }
      const snapshot = { filename: 'table', note: { current }, source: null, assets: {} }
      try {
        const { blob } = await reading.readingImage(snapshot, { width, pixelRatio: 1, background: 'light' }, new AbortController().signal)
        return blob.size > 0 ? blob.type : 'empty image'
      } catch (error) {
        return error.code ?? error.message
      }
    }, { columns, width })
    assert.equal(result, expected, `${columns} columns at ${width}px`)
  }
  console.log('PNG export preserves fitting tables and rejects clipped columns.')
} finally {
  await browser.close()
}
