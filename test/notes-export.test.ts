import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { inflateSync } from 'node:zlib'
import { unzipSync } from 'fflate'
import React from 'react'
import Markdown from 'react-markdown'
import { renderToStaticMarkup } from 'react-dom/server'
import { NoteRepository } from '../src/notes/repository.js'
import { NotesApplication } from '../src/host/notes.js'
import { noteDateTime } from '../src/notes/date.js'
import { createExport } from '../src/notes/export/service.js'
import { exportModel, exportTree, type ExportSnapshot } from '../src/notes/export/model.js'
import { checkPixels, layoutExport, wrapRuns } from '../src/notes/export/layout.js'
import { imageDimensions } from '../src/notes/export/image.js'
import { exportFontPath } from '../src/notes/export/pdf.js'
import type { NoteContent } from '../src/contracts/notes.js'

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')
const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
const content: NoteContent = { title: '中文 / 导出?', body: '# 正文\n\n**粗体**、*强调*、[链接](https://example.com/path)\n\n> 引用\n\n- 列表\n\n```ts\nconst x = "中文"\n```\n\n| 标题甲 | 标题乙 |\n| --- | --- |\n| 一 | 二 |\n\n结尾标志', summary: '摘要', tags: ['标签'], notebookId: null, status: 'active', sourceId: null, assetIds: [] }
async function fixture(t: { after(fn: () => Promise<void>): void }) { const dir = await mkdtemp(join(tmpdir(), 'notes-export-')); t.after(() => rm(dir, { recursive: true, force: true })); return new NoteRepository(dir) }
const measure = (text: string, size: number) => [...text].length * size * 0.6

test('final R1 duplicate references keep the first image and link in reading, snapshots, PDF and offline ZIP', async t => {
  const repo = await fixture(t), first = await repo.putAsset(png, 'image/png'), later = await repo.putAsset(gif, 'image/gif')
  const definitions = `[Pic Ref]: ../assets/${first.id}\n[Link Ref]: https://example.com/first`
  const shadow = `[pic  ref]: ../assets/${later.id}\n[link  ref]: https://example.com/later`
  for (const [kind, leading] of [['flat', definitions], ['quote', definitions.replace(/^/gm, '> ')], ['list', '- container\n\n' + definitions.replace(/^/gm, '  ')]] as const) {
    await t.test(kind, async () => {
      const body = `${leading}\n\n![selected][PIC REF] [destination][LINK REF]\n\n${shadow}`
      const note = await repo.save({ expectedHeads: [], content: { ...content, body, assetIds: [first.id, later.id] } }), request = { noteId: note.noteId, revision: note.current.revision }
      const reading = renderToStaticMarkup(React.createElement(Markdown, { children: body }))
      assert.ok(reading.includes(`src="../assets/${first.id}"`)); assert.ok(reading.includes('href="https://example.com/first"'))
      for (const format of ['snapshot', 'png-long', 'png-pages']) {
        const snapshot = JSON.parse((await createExport(repo, { ...request, format })).bytes.toString()) as ExportSnapshot
        assert.deepEqual(snapshot.model.assetIds, [first.id], format)
        assert.deepEqual(snapshot.model.blocks.filter(b => b.type === 'image').map(b => b.assetId), [first.id], format)
        assert.deepEqual(Object.keys(snapshot.assets), [first.id], format)
        assert.equal(snapshot.assets[first.id], `data:image/png;base64,${png.toString('base64')}`, format)
        assert.deepEqual(snapshot.model.blocks.flatMap(b => b.type === 'text' ? b.runs.flatMap(r => r.href ? [r.href] : []) : []), ['https://example.com/first'], format)
      }
      const files = unzipSync((await createExport(repo, { ...request, format: 'markdown-zip' })).bytes)
      assert.deepEqual(Object.keys(files).sort(), [`assets/${first.id}`, '中文 _ 导出_.md'].sort()); assert.deepEqual(Buffer.from(files[`assets/${first.id}`]!), png)
      const exported = renderToStaticMarkup(React.createElement(Markdown, { children: Buffer.from(files['中文 _ 导出_.md']!).toString('utf8') }))
      assert.ok(exported.includes(`src="assets/${first.id}"`)); assert.ok(exported.includes('href="https://example.com/first"')); assert.ok(!exported.includes(`src="assets/${later.id}"`))
      // The selected first PNG needs no GIF conversion; PDF consumes the same frozen selection.
      const pdf = await createExport(repo, { ...request, format: 'pdf' })
      assert.ok(pdf.bytes.toString('latin1').includes('/Subtype /Image')); assert.ok(pdf.bytes.toString('latin1').includes('/URI (https://example.com/first)'))
    })
  }
})

test('M7 fix1 Markdown ZIP rewrites actual destinations while preserving repeated alt, title and reference semantics', async t => {
  const repo = await fixture(t), asset = await repo.putAsset(png, 'image/png'), path = `../assets/${asset.id}`, encoded = path.replace('.png', '&#46;png')
  const body = `![${path}](${path} "title &amp; text")\n\n![entity](${encoded})\n\n![first][label]\n\n![second][label]\n\n[label]: <${encoded}> 'reference &amp; title'\n\n![escaped][a\\]]\n\n[a\\]]: ${encoded}\n\n![path-reference][${path}]\n\n[${path}]: ${path}\n\n![entity-label][a&#93;]\n\n[a&#93;]: ${encoded}`
  const note = await repo.save({ expectedHeads: [], content: { ...content, body, assetIds: [asset.id] } })
  const result = await createExport(repo, { noteId: note.noteId, revision: note.current.revision, format: 'markdown-zip' }), files = unzipSync(result.bytes), markdown = Buffer.from(files['中文 _ 导出_.md']!).toString('utf8')
  const tree = exportTree(markdown), images = tree.children.flatMap(n => n.type === 'paragraph' ? n.children.filter(c => c.type === 'image') : []), refs = tree.children.filter(n => n.type === 'definition')
  assert.equal(images[0]?.alt, path); assert.equal(images[0]?.url, `assets/${asset.id}`); assert.equal(images[0]?.title, 'title & text')
  assert.equal(images[1]?.url, `assets/${asset.id}`)
  assert.deepEqual(refs.map(n => [n.identifier, n.url, n.title]), [['label', `assets/${asset.id}`, 'reference & title'], ['a\\]', `assets/${asset.id}`, null], [path, `assets/${asset.id}`, null], ['a&#93;', `assets/${asset.id}`, null]])
  const references = tree.children.flatMap(n => n.type === 'paragraph' ? n.children.filter(c => c.type === 'imageReference') : [])
  assert.equal(references.length, 5); assert.ok(references.every(n => refs.some(d => d.identifier === n.identifier)))
  assert.deepEqual(Buffer.from(files[`assets/${asset.id}`]!), png)
})
test('M7 fix1 unfinished backtick/tilde note fences cannot consume explicit original messages or source-only images', async t => {
  const repo = await fixture(t), asset = await repo.putAsset(png, 'image/png'), sourceText = 'SOURCE-TEXT\n```inner\nverbatim'
  const sourceId = await repo.putSource({ version: 1, sessionId: 'PRIVATE-SESSION', assets: { photo: asset.id }, messages: [{ id: 'PRIVATE-MESSAGE', role: 'user', blocks: [{ type: 'text', text: sourceText }, { type: 'image', attachmentId: 'photo' }] }] })
  for (const body of ['```ts\nNOTE-UNFINISHED\n','~~~js\nNOTE-UNFINISHED\n','````js\nNOTE-UNFINISHED\n','```ts\nNOTE-UNFINISHED\n```','~~~js\nNOTE-UNFINISHED\n~~~']) {
    const note = await repo.save({ expectedHeads: [], content: { ...content, body, sourceId } }), request = { noteId: note.noteId, revision: note.current.revision, includeSource: true }
    for (const format of ['snapshot','png-long','png-pages']) {
      const result = JSON.parse((await createExport(repo, { ...request, format })).bytes.toString()) as ExportSnapshot
      assert.deepEqual(result.model.assetIds, [asset.id]); assert.ok(result.model.blocks.some(b => b.type === 'image' && b.assetId === asset.id)); assert.ok(result.model.blocks.some(b => b.type === 'text' && b.kind === 'code' && b.runs.map(r => r.text).join('') === 'NOTE-UNFINISHED'))
      assert.ok(result.model.blocks.some(b => b.type === 'text' && b.runs.map(r => r.text).join('') === sourceText)); assert.ok(result.assets[asset.id]?.startsWith('data:image/png;base64,'))
    }
    const zip = unzipSync((await createExport(repo, { ...request, format: 'markdown-zip' })).bytes), exported = Buffer.from(zip['中文 _ 导出_.md']!).toString('utf8'), tree = exportTree(exported)
    assert.deepEqual(Buffer.from(zip[`assets/${asset.id}`]!), png)
    assert.ok(tree.children.some(n => n.type === 'code' && n.value === 'NOTE-UNFINISHED')); assert.ok(tree.children.some(n => n.type === 'code' && n.value === sourceText))
    assert.ok(tree.children.some(n => n.type === 'paragraph' && n.children.some(c => c.type === 'image' && c.url === `assets/${asset.id}`)))
    assert.ok(!exported.includes('PRIVATE-SESSION')); assert.ok(!exported.includes('PRIVATE-MESSAGE'))
    const pdf = await createExport(repo, { ...request, format: 'pdf' }); assert.ok(pdf.bytes.toString('latin1').includes('/Subtype /Image'))
    const noSource = JSON.parse((await createExport(repo, { ...request, includeSource: false, format: 'snapshot' })).bytes.toString()) as ExportSnapshot
    assert.deepEqual(noSource.model.assetIds, []); assert.ok(!JSON.stringify(noSource).includes('SOURCE-TEXT'))
  }
})

test('reading and export timestamps are local, zero-padded and minute-precise',()=>{
  assert.equal(noteDateTime(new Date(2026,0,3,0,7,59).toISOString()),'2026-01-03 00:07')
  assert.equal(noteDateTime(new Date(2026,10,3,18,21).toISOString()),'2026-11-03 18:21')
})

test('the same selected fields reach Markdown, its ZIP and the rendered export models',async t=>{
  const repo=await fixture(t)
  const tag='独立标签', summary='独立摘要', body='正文起点'
  const note=await repo.save({expectedHeads:[],content:{...content,title:'图文手记',body,summary,tags:[tag]}})
  const request={noteId:note.noteId,revision:note.current.revision}, modified=noteDateTime(note.savedAt)
  for(const includeTags of [true,false]) for(const includeSummary of [true,false]){
    const options={...request,includeTags,includeSummary}
    const md=(await createExport(repo,{...options,format:'markdown'})).bytes.toString()
    const zip=unzipSync((await createExport(repo,{...options,format:'markdown-zip'})).bytes)
    assert.equal(Buffer.from(zip['图文手记.md']!).toString(),md)
    const end=md.indexOf('\n---\n\n'), fields=md.slice(4,end)
    assert.ok(fields.includes('updated: '+JSON.stringify(modified)))
    assert.equal(fields.includes('tags:'),includeTags);assert.equal(fields.includes('summary:'),includeSummary)
    assert.equal(md.includes(tag),includeTags);assert.equal(md.includes(summary),includeSummary)
    const rows=['# 图文手记',modified,...(includeTags?['#'+tag]:[]),...(includeSummary?['> '+summary,'---']:[]),body]
    const shown=md.slice(end+6).trimEnd()
    assert.equal(shown,rows.join('\n\n'))
    for(const format of ['snapshot','png-long','png-pages']){
      const snap=JSON.parse((await createExport(repo,{...options,format})).bytes.toString()) as ExportSnapshot
      assert.deepEqual(snap.model.blocks.map(b=>b.type==='text'?b.runs.map(r=>r.text).join(''):b.type),
        ['图文手记',modified,...(includeTags?['#'+tag]:[]),...(includeSummary?[summary,'rule']:[]),body])
    }
  }
  for(const key of ['includeTags','includeSummary'])await assert.rejects(createExport(repo,{...request,format:'markdown',[key]:'false'}),{code:'export_request'})
})

test('M7 frozen revision exports only public metadata, two distinct local assets and no implicit source', async t => {
  const repo = await fixture(t), a = await repo.putAsset(png, 'image/png'), b = await repo.putAsset(gif, 'image/gif')
  const sourceId = await repo.putSource({ version: 1, sessionId: 'PRIVATE-SESSION', assets: {}, messages: [{ id: 'PRIVATE-MESSAGE', role: 'user', blocks: [{ type: 'text', text: 'PRIVATE-SOURCE-CONTENT' }] }] })
  const body = `${content.body}\n\n![蓝图](../assets/${a.id})\n\n![另一图][second]\n\n[second]: ../assets/${b.id}\n\n\`../assets/${a.id}\``
  const old = await repo.save({ expectedHeads: [], content: { ...content, body, sourceId, assetIds: [a.id, b.id] } })
  await repo.save({ noteId: old.noteId, expectedHeads: old.heads, content: { ...content, body: 'NEWER-VERSION' } })
  const request = { noteId: old.noteId, revision: old.current.revision }
  const single = await createExport(repo, { ...request, format: 'markdown' }), text = single.bytes.toString('utf8')
  assert.equal(single.filename, '中文 _ 导出_.md'); assert.ok(text.includes('title: "中文 / 导出?"')); assert.ok(text.includes(`![蓝图](assets/${a.id})`)); assert.ok(text.includes(`\`../assets/${a.id}\``))
  for (const secret of [sourceId, old.noteId, old.current.revision, 'PRIVATE-SESSION','PRIVATE-MESSAGE','PRIVATE-SOURCE-CONTENT','NEWER-VERSION']) assert.ok(!text.includes(secret), secret)
  const zip = await createExport(repo, { ...request, format: 'markdown-zip' }), files = unzipSync(zip.bytes)
  assert.deepEqual(Object.keys(files).sort(), [`assets/${a.id}`,`assets/${b.id}`,'中文 _ 导出_.md'].sort()); assert.deepEqual(Buffer.from(files[`assets/${a.id}`]!), png); assert.deepEqual(Buffer.from(files[`assets/${b.id}`]!), gif)
  const withSource = await createExport(repo, { ...request, format: 'markdown-zip', includeSource: true }), sourceText = Buffer.from(unzipSync(withSource.bytes)['中文 _ 导出_.md']!).toString('utf8')
  assert.ok(sourceText.includes('PRIVATE-SOURCE-CONTENT')); assert.ok(!sourceText.includes('PRIVATE-SESSION')); assert.ok(!sourceText.includes('PRIVATE-MESSAGE'))
  const snap = JSON.parse((await createExport(repo, { ...request, format: 'png-long' })).bytes.toString()) as ExportSnapshot
  assert.equal(snap.revision, old.current.revision); assert.notEqual(snap.assets[a.id], snap.assets[b.id]); assert.equal(Object.keys(snap.assets).length, 2)
  assert.deepEqual((await createExport(repo, { ...request, format: 'original', assetId: b.id })).bytes, gif)
})
test('M7 raw HTML is literal; unsafe links and external/unknown images never trigger fetching', () => {
  const model = exportModel('标题', '<script>alert(1)</script>\n\n[bad](javascript:alert(1)) [good](https://example.com)', [])
  assert.ok(model.blocks.some(b => b.type === 'text' && b.runs.some(r => r.text.includes('<script>'))))
  const links = model.blocks.flatMap(b => b.type === 'text' ? b.runs.filter(r => r.href).map(r => r.href) : [])
  assert.deepEqual(links, ['https://example.com/'])
  for (const url of ['http://127.0.0.1/private', 'file:///C:/secret', '../assets/' + 'a'.repeat(64) + '.png']) assert.throws(() => exportModel('', `![image](${url})`, []), { code: 'export_image_unarchived' })
})
test('M7 exact wrapped code and long table cells survive pagination; each continuation repeats a full header', () => {
  const code = Array.from({ length: 80 }, (_, i) => `LINE${String(i).padStart(3, '0')}:${'长代码'.repeat(i === 10 ? 200 : 5)}`).join('\n')
  const cell = Array.from({ length: 100 }, (_, i) => `CELL${i}-中文`).join(' '), body = '```\n' + code + '\n```\n\n| HEADER | H2 |\n|---|---|\n| ' + cell + ' | 第二格 |\n| FINAL | END |'
  const model = exportModel('标题', body, []), pages = layoutExport(model, {}, measure, 1080, 1527)
  assert.ok(pages.length > 2)
  const all = pages.flatMap(p => p.items).filter(i => i.type === 'text').map(i => i.runs.map(r => r.text).join('')).join('')
  assert.ok(all.includes(code.replace(/\n/g, '')))
  // Compare each unique marker exactly once, even when it wrapped across positioned lines.
  const firstColumn = pages.flatMap(p => p.items).flatMap(i => i.type === 'text' && i.x === 57 ? [i.runs.map(r => r.text).join('')] : []).join('').replaceAll('HEADER', '')
  assert.ok(firstColumn.includes(cell)); assert.equal((all.match(/FINAL/g) ?? []).length, 1); assert.ok(all.endsWith('FINALEND'))
  const tablePages = pages.filter(p => p.items.some(i => i.type === 'text' && i.runs.some(r => r.text.includes('HEADER'))))
  assert.ok(tablePages.length > 1)
  for (const p of tablePages.slice(1)) assert.equal(p.items.find(i => i.type === 'text')?.runs.map(r => r.text).join(''), 'HEADER')
  for (const p of pages) for (const item of p.items) assert.ok(item.y + item.height <= p.height - 47, `${item.y} ${item.height}`)
})
test('M7 long-image overflow is rejected without paginating or scaling; explicit resolution controls pixel budget', () => {
  const body = Array.from({ length: 1500 }, (_, i) => `段落${i}正文`).join('\n\n'), model = exportModel('长图', body, [])
  const long = layoutExport(model, {}, measure, 1080, null); assert.equal(long.length, 1)
  assert.throws(() => checkPixels(1080, long[0]!.height, 1), { code: 'export_overflow' })
  assert.doesNotThrow(() => checkPixels(1080, 20000, 1)); assert.throws(() => checkPixels(1080, 20000, 2), { code: 'export_overflow' })
  assert.throws(() => checkPixels(NaN, 100, 1), { code: 'export_dimensions' })
  assert.equal(wrapRuns([{ text: '中文\n\n结束' }], 200, 24, measure).map(l => l.map(r => r.text).join('')).join('\n'), '中文\n\n结束')
})
test('M7 valid static conversions are bounded to required GIF/WebP assets and original bytes remain untouched', async t => {
  const repo = await fixture(t), asset = await repo.putAsset(gif, 'image/gif'), other = await repo.putAsset(png, 'image/png')
  const note = await repo.save({ expectedHeads: [], content: { ...content, body: `![动图](../assets/${asset.id})`, assetIds: [asset.id] } }), request = { noteId: note.noteId, revision: note.current.revision, format: 'pdf' }
  await assert.rejects(createExport(repo, request), { code: 'export_conversion_required' })
  const conversion = { assetId: asset.id, png: png.toString('base64') }
  for (const convertedImages of [[conversion, conversion], [{ ...conversion, assetId: other.id }], [{ ...conversion, png: gif.toString('base64') }]]) await assert.rejects(createExport(repo, { ...request, convertedImages }))
  const huge = Buffer.from(png); huge.writeUInt32BE(32000, 16); huge.writeUInt32BE(32000, 20)
  await assert.rejects(createExport(repo, { ...request, convertedImages: [{ ...conversion, png: huge.toString('base64') }] }), { code: 'export_image_budget' })
  const pdf = await createExport(repo, { ...request, convertedImages: [conversion] }); assert.equal(pdf.bytes.subarray(0, 5).toString(), '%PDF-'); assert.deepEqual(await repo.getAsset(asset.id), gif)
})
test('M7 PDF embeds shipped Chinese font, selectable Unicode text, clickable links, real images and multiple pages', async t => {
  const repo = await fixture(t), asset = await repo.putAsset(png, 'image/png')
  const note = await repo.save({ expectedHeads: [], content: { ...content, body: Array.from({ length: 8 }, (_, i) => `${content.body}\n\nEND-${i}\n\n![图](../assets/${asset.id})`).join('\n\n'), assetIds: [asset.id] } })
  const pdf = await createExport(repo, { noteId: note.noteId, revision: note.current.revision, format: 'pdf' }), latin = pdf.bytes.toString('latin1')
  assert.equal(latin.slice(0, 5), '%PDF-'); assert.ok(latin.endsWith('%%EOF\n')); assert.ok((latin.match(/\/Type \/Page\b/g) ?? []).length > 1); assert.ok(latin.includes('/ToUnicode')); assert.ok(latin.includes('/FontFile3')); assert.ok(latin.includes('/Subtype /Image')); assert.ok(latin.includes('/URI (https://example.com/path)'))
  let decoded = ''
  for (const match of latin.matchAll(/stream\r?\n/g)) { const start = match.index! + match[0].length, end = latin.indexOf('\nendstream', start); if (end < 0) continue; try { decoded += inflateSync(pdf.bytes.subarray(start, end)).toString('utf8') } catch { /* Not all PDF streams are flate. */ } }
  assert.ok(decoded.includes('4e2d'), 'Chinese 中 has an embedded Unicode mapping'); assert.ok(decoded.includes('6587'), 'Chinese 文 has an embedded Unicode mapping')
  const hash = createHash('sha256').update(await readFile(exportFontPath)).digest('hex'); assert.equal(hash, '2c76254f6fc379fddfce0a7e84fb5385bb135d3e399294f6eeb6680d0365b74b')
})
test('M7 unsafe original-image request and cancelled export never return successful bytes', async t => {
  const repo = await fixture(t), note = await repo.save({ expectedHeads: [], content })
  await assert.rejects(createExport(repo, { noteId: note.noteId, revision: note.current.revision, format: 'original', assetId: '../../secret' }), { code: 'export_image_missing' })
  const controller = new AbortController(); controller.abort()
  await assert.rejects(createExport(repo, { noteId: note.noteId, revision: note.current.revision, format: 'pdf' }, controller.signal))
  assert.deepEqual(imageDimensions(png), { width: 1, height: 1 }); assert.deepEqual(imageDimensions(gif), { width: 1, height: 1 }); assert.throws(() => imageDimensions(Buffer.from('broken')), { code: 'export_image_decode' })
})
test('M7 facade sanitizes decoder errors and keeps Markdown as fallback for table images', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'notes-export-facade-')); t.after(() => rm(dir, { recursive: true, force: true })); const app = new NotesApplication(dir, () => undefined); t.after(() => app.close())
  const asset = await app.repository.putAsset(png, 'image/png'), note = (await app.save({ expectedHeads: [], content: { ...content, body: `| 图 |\n|---|\n| ![图](../assets/${asset.id}) |`, assetIds: [asset.id] } })).note, request = { noteId: note.noteId, revision: note.current.revision }
  await assert.rejects(app.export({ ...request, format: 'pdf' }), { code: 'export_table_image' })
  const zip = await app.export({ ...request, format: 'markdown-zip' }); const chunks:Buffer[]=[];if(zip.stream)for await(const c of zip.stream())chunks.push(Buffer.from(c));assert.deepEqual(Buffer.from(unzipSync(zip.stream?Buffer.concat(chunks):zip.bytes)[`assets/${asset.id}`]!), png)
})
