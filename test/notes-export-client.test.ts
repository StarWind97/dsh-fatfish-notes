import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareImages, exportRequest } from '../src/client/note-export.js'
import { imageDimensions } from '../src/notes/export/image.js'
import type { ExportSnapshot } from '../src/notes/export/model.js'
import fixtures from './fixtures/export-images.json' with { type: 'json' }

test('M7 browser preparation retains distinct PNG data URLs without query-cache fetching', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'Image'), seen: string[] = []
  const a = 'a'.repeat(64) + '.png', b = 'b'.repeat(64) + '.png'
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'), other = Buffer.concat([png, Buffer.from('distinct')])
  Object.defineProperty(globalThis, 'Image', { configurable: true, value: class { naturalWidth = 1; naturalHeight = 1; src = ''; async decode() { seen.push(this.src) } } })
  try {
    const snapshot: ExportSnapshot = { noteId: 'n', revision: 'r', filename: 'f', model: { title: '', blocks: [], assetIds: [a,b] }, assets: { [a]: 'data:image/png;base64,' + png.toString('base64'), [b]: 'data:image/png;base64,' + other.toString('base64') } }
    const result = await prepareImages(snapshot, new AbortController().signal)
    assert.deepEqual(seen, [snapshot.assets[a],snapshot.assets[b]]); assert.notEqual(result.images[a]!.dataUrl, result.images[b]!.dataUrl); assert.equal(result.convertedImages.length, 0)
    await assert.rejects(prepareImages({ ...snapshot, assets: { [a]: snapshot.assets[a]! } }, new AbortController().signal), { code: 'export_image_missing' })
    await assert.rejects(prepareImages({ ...snapshot, assets: { ...snapshot.assets, [a]: 'http://localhost/private' } }, new AbortController().signal), { code: 'export_image_missing' })
  } finally { if (original) Object.defineProperty(globalThis, 'Image', original); else Reflect.deleteProperty(globalThis, 'Image') }
})
test('M7 local animated GIF/WebP conversion explicitly decodes frame zero and cleans resources on cancellation', async () => {
  const keys = ['Image','ImageDecoder','document'] as const, originals = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key)), frames: number[] = [], types: string[] = []; let closed = 0
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='
  Object.defineProperty(globalThis, 'Image', { configurable: true, value: class { naturalWidth = 64; naturalHeight = 40; src = ''; async decode() {} } })
  Object.defineProperty(globalThis, 'ImageDecoder', { configurable: true, value: class { constructor(options: { type: string }) { types.push(options.type) }; async decode(options: { frameIndex: number }) { frames.push(options.frameIndex); return { image: { close() { closed++ } } } }; close() { closed++ } } })
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage() {} }), toDataURL: () => 'data:image/png;base64,' + png }) } })
  try {
    const ids = ['a'.repeat(64) + '.gif','b'.repeat(64) + '.webp'], assets = { [ids[0]!]: 'data:image/gif;base64,' + fixtures.gif.base64, [ids[1]!]: 'data:image/webp;base64,' + fixtures.webp.base64 }
    const snapshot: ExportSnapshot = { noteId: 'n', revision: 'r', filename: 'f', model: { title: '', blocks: [], assetIds: ids }, assets }
    const result = await prepareImages(snapshot, new AbortController().signal)
    assert.deepEqual(frames, [0,0]); assert.deepEqual(types, ['image/gif','image/webp']); assert.equal(closed, 4); assert.deepEqual(result.convertedImages.map(i => i.assetId), ids)
    for (const data of Object.values(fixtures)) assert.deepEqual(imageDimensions(Buffer.from(data.base64, 'base64')), { width: 64, height: 40 })
    const abort = new AbortController(); abort.abort(); await assert.rejects(prepareImages(snapshot, abort.signal), { name: 'AbortError' }); assert.equal(frames.length, 2)
  } finally { keys.forEach((key, index) => { const original = originals[index]; if (original) Object.defineProperty(globalThis, key, original); else Reflect.deleteProperty(globalThis, key) }) }
})
test('M7 cancelled HTTP export never consumes a late successful body; stable server code only', async () => {
  const abort = new AbortController()
  await assert.rejects(exportRequest({ noteId: 'n', revision: 'r' }, { format: 'pdf' }, abort.signal, async () => { abort.abort(); return new Response('%PDF-') }), { name: 'AbortError' })
  await assert.rejects(exportRequest({ noteId: 'n', revision: 'r' }, { format: 'pdf' }, new AbortController().signal, async () => new Response(JSON.stringify({ code: 'export_conversion_budget', error: 'C:/private/path' }), { status: 400 })), (error: unknown) => error instanceof Error && 'code' in error && error.code === 'export_conversion_budget' && !error.message.includes('private'))
})
test('M7 fix1 cancellation during decoder resolution closes both the returned frame and decoder', async () => {
  const keys = ['Image','ImageDecoder'] as const, originals = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key)), abort = new AbortController(); let frameClosed = 0, decoderClosed = 0
  Object.defineProperty(globalThis, 'Image', { configurable: true, value: class { naturalWidth = 64; naturalHeight = 40; src = ''; async decode() {} } })
  Object.defineProperty(globalThis, 'ImageDecoder', { configurable: true, value: class { async decode() { abort.abort(); return { image: { close() { frameClosed++ } } } }; close() { decoderClosed++ } } })
  try {
    const id = 'a'.repeat(64) + '.gif', value: ExportSnapshot = { noteId: 'n', revision: 'r', filename: 'f', model: { title: '', blocks: [], assetIds: [id] }, assets: { [id]: 'data:image/gif;base64,' + fixtures.gif.base64 } }
    await assert.rejects(prepareImages(value, abort.signal), { name: 'AbortError' })
    assert.equal(frameClosed, 1); assert.equal(decoderClosed, 1)
  } finally { keys.forEach((key, index) => { const original = originals[index]; if (original) Object.defineProperty(globalThis, key, original); else Reflect.deleteProperty(globalThis, key) }) }
})
