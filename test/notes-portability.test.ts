import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NoteRepository } from '../src/notes/repository.js'
import { revisionContent } from '../src/notes/conflicts.js'
import type { NoteContent } from '../src/contracts/notes.js'
import {unzipSync,zipSync} from 'fflate'
import {exportLibrary} from '../src/notes/export/library.js'
import {createExport} from '../src/notes/export/service.js'
import {scanImport,importNote,unzipEntries,convertWiki,portablePath} from '../src/client/library-import.js'
import {NotesApplication} from '../src/host/notes.js'
import type {Api} from '../src/client/api.js'
import {digest,canonical} from '../src/notes/validation.js'
const content: NoteContent = { title: '迁移测试', body: '正文', summary: '', tags: [], notebookId: null, status: 'active', sourceId: null, assetIds: [] }
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=', 'base64')
async function fixture(t: { after(fn: () => Promise<void>): void }) {
  const dir = await mkdtemp(join(tmpdir(), 'fatfish-portability-')); t.after(() => rm(dir, { recursive: true, force: true }))
  return { dir, repo: new NoteRepository(dir) }
}
test('ordinary attachments retain filenames and bytes through save, edit and restart', async t => {
  const { dir, repo } = await fixture(t), bytes = Buffer.from('video-binary-placeholder'), file = await repo.putAttachment(bytes, '视频.mp4')
  const note = await repo.save({ expectedHeads: [], content: { ...content, attachments: [file], body: `[视频](../attachments/${file.id}.bin)` } })
  const reopened = new NoteRepository(dir)
  assert.deepEqual((await reopened.get(note.noteId)).current.attachments, [file])
  assert.deepEqual(await reopened.getAttachment(file.id), bytes)
  await assert.rejects(repo.putAttachment(Buffer.alloc(50*1024*1024+1), 'too-big.mp4'))
  await assert.rejects(repo.save({ expectedHeads: [], content: { ...content, attachments: [{ ...file, bytes: file.bytes+1 }] } }))
})
test('permanent deletion retains shared attachments and removes originals, revisions and exclusive files', async t => {
  const { repo } = await fixture(t), shared = await repo.putAttachment(Buffer.from('shared'), '资料.pdf'), exclusive = await repo.putAttachment(Buffer.from('only-one'), '语音.mp3')
  const image = await repo.putAsset(png, 'image/png'), sourceId = await repo.putSource({ version: 1, assets: { first: image.id }, messages: [] })
  let a = await repo.save({ expectedHeads: [], content: { ...content, attachments: [shared, exclusive], sourceId, assetIds: [image.id] } })
  let b = await repo.save({ expectedHeads: [], content: { ...content, attachments: [shared] } })
  const old = await repo.exportObjects()
  a = await repo.trash(a.noteId, a.heads)
  await repo.batch([{ noteId: a.noteId, expectedHeads: a.heads }], 'purge')
  await assert.rejects(repo.get(a.noteId), (e: any) => e.code === 'note_deleted')
  assert.deepEqual(await repo.getAttachment(shared.id), Buffer.from('shared'))
  await assert.rejects(repo.getAttachment(exclusive.id)); await assert.rejects(repo.getSource(sourceId)); await assert.rejects(repo.getAsset(image.id))
  const paths = (await repo.files.scan()).paths
  assert.ok(paths.includes(`deleted/${a.noteId}.json`)); assert.ok(!paths.some(p => p.startsWith(`revisions/${a.noteId}/`)))
  assert.ok(!paths.includes(`documents/${a.noteId}.md`))
  // A stale replica's objects cannot resurrect the deleted identity, even with missing attachments.
  await repo.importObjects(old)
  assert.equal((await repo.list()).items.length, 1)
  b = await repo.get(b.noteId)
  b = await repo.trash(b.noteId, b.heads)
  await repo.batch([{ noteId: b.noteId, expectedHeads: b.heads }], 'purge')
  await assert.rejects(repo.getAttachment(shared.id))
})
test('batch deletion rechecks every selected revision before changing any note', async t => {
  const { repo } = await fixture(t)
  const a = await repo.save({ expectedHeads: [], content }), b = await repo.save({ expectedHeads: [], content })
  await repo.save({ noteId: b.noteId, expectedHeads: b.heads, content: { ...revisionContent(b.current), body: '新编辑' } })
  await assert.rejects(repo.batch([a,b].map(n => ({ noteId:n.noteId, expectedHeads:n.heads })), 'trash'))
  assert.equal((await repo.get(a.noteId)).current.status, 'active')
  await assert.rejects(repo.batch([{ noteId:a.noteId, expectedHeads:a.heads }], 'purge'))
})
test('library export roundtrips notebook folders, links, YAML, binary files and images',async t=>{
  const {repo}=await fixture(t),book=await repo.saveNotebook({title:'工作 / 资料',expectedHeads:[]}),image=await repo.putAsset(png,'image/png'),file=await repo.putAttachment(Buffer.from('ordinary video'),'会议 记录.mp4')
  const b=await repo.save({expectedHeads:[],content:{...content,title:'重复标题',notebookId:book.notebookId,body:'## 目标章节\n\n原样正文'}})
  const a=await repo.save({expectedHeads:[],content:{...content,title:'重复标题',notebookId:book.notebookId,summary:'摘要：中文',tags:['测试'],assetIds:[image.id],attachments:[file],body:`[另一篇](fatfish-note:${b.noteId})\n\n![图](../assets/${image.id})\n\n[视频](../attachments/${file.id}.bin)\n\n\`[代码链接](fatfish-note:${b.noteId})\``}})
  const trashed=await repo.save({expectedHeads:[],content:{...content,title:'不可导出回收站'}});await repo.trash(trashed.noteId,trashed.heads)
  const output=await exportLibrary(repo,{}),files=unzipSync(output.bytes),md=Object.keys(files).filter(p=>p.endsWith('.md'))
  assert.equal(md.length,2);assert.ok(md.every(p=>p.startsWith('工作 _ 资料/')));assert.equal(new Set(md).size,2)
  const exported=md.map(p=>new TextDecoder().decode(files[p])).find(body=>body.includes('摘要：中文'))!
  assert.ok(exported.includes('[另一篇](<'));assert.ok(exported.includes(encodeURIComponent('重复标题')));assert.ok(exported.includes(`\`[代码链接](fatfish-note:${b.noteId})\``));assert.ok(exported.includes('../attachments/'));assert.ok(exported.includes('summary: "摘要：中文"'))
  const single=unzipSync((await createExport(repo,{noteId:a.noteId,revision:a.current.revision,format:'markdown-zip'})).bytes)
  assert.ok(Object.keys(single).some(p=>p.endsWith('.mp4')))
  const dest=await fixture(t),app=new NotesApplication(dest.dir,()=>undefined);t.after(()=>app.close())
  const api:Api=(async(path:string,body:unknown)=>path==='/notes/image'?app.image(body):path==='/notes/attachment'?app.attachment(body):path==='/notes/get'?app.get(body):app.save(body)) as Api
  const plan=await scanImport(unzipEntries(output.bytes).entries),target=(await app.repository.listNotebooks())[0]!.notebookId
  for(const note of plan.notes){const report=await importNote(plan,note,target,false,api);assert.deepEqual(report,[])}
  const imported=(await app.repository.list()).items,read=(await Promise.all(imported.map(n=>app.repository.get(n.noteId)))).find(n=>n.current.summary==='摘要：中文')!
  assert.equal(imported.length,2);assert.deepEqual(read.current.tags,['测试']);assert.equal(read.current.attachments?.[0]?.name.endsWith('.mp4'),true);assert.deepEqual(await app.repository.getAttachment(read.current.attachments![0]!.id),Buffer.from('ordinary video'))
  assert.ok(read.current.body.includes('fatfish-note:'+plan.notes.find(n=>n.noteId!==read.noteId)!.noteId));assert.equal(read.current.assetIds[0],image.id)
})
test('import preserves code, reports missing/ambiguous references and never interprets hidden ZIP paths',async t=>{
  assert.equal(portablePath('../../escape.md'),null);assert.equal(portablePath('C:\\private.md'),null)
  const packed=zipSync({'../escape.md':Buffer.from('no'),'.obsidian/plugins/code.js':Buffer.from('no'),'本子/正文.md':Buffer.from('---\ntitle: 正文\ntags:\n - 资料\nsummary: 内容摘要\n---\n[[目标|跳转]]\n\n![[图.png]]\n\n![missing][gone]\n\n[gone]: absent.png\n\n[音频](../audio.mp3)\n\n`[[目标]]`\n\n```md\n![[图.png]]\n```'),'本子/目标.md':Buffer.from('目标'), '本子/图.png':png,'audio.mp3':Buffer.from('audio')})
  const extracted=unzipEntries(packed);assert.equal(extracted.entries.length,4);assert.equal(extracted.warnings.length,2)
  const plan=await scanImport(extracted.entries),note=plan.notes.find(n=>n.content.title==='正文')!,{dir}=await fixture(t),app=new NotesApplication(dir,()=>undefined);t.after(()=>app.close())
  const api:Api=(async(path:string,body:unknown)=>path==='/notes/image'?app.image(body):path==='/notes/attachment'?app.attachment(body):path==='/notes/get'?app.get(body):app.save(body)) as Api
  const target=(await app.repository.listNotebooks())[0]!.notebookId,report=await importNote(plan,note,target,false,api),saved=(await app.get({noteId:note.noteId})).note.current
  assert.ok(report.some(w=>w.includes('absent.png')));assert.ok(saved.body.includes('[missing][gone]'));assert.ok(!saved.body.includes('![missing]'));assert.ok(saved.body.includes('`[[目标]]`'));assert.ok(saved.body.includes('```md\n![[图.png]]\n```'));assert.equal(saved.assetIds.length,1);assert.equal(saved.attachments?.length,1);assert.ok(saved.body.includes('fatfish-note:'))
  assert.equal(convertWiki('`[[x]]`\n\n```md\n[[x]]\n```',()=>'/changed'),'`[[x]]`\n\n```md\n[[x]]\n```')
})
test('purge removes capture envelopes while keeping files used by another note history',async t=>{
  const {repo}=await fixture(t),image=await repo.putAsset(png,'image/png')
  let a=await repo.save({expectedHeads:[],content:{...content,assetIds:[image.id]}}),b=await repo.save({expectedHeads:[],content:{...content,assetIds:[image.id]}})
  b=await repo.save({noteId:b.noteId,expectedHeads:b.heads,content:{...revisionContent(b.current),assetIds:[]}})
  const journal={noteId:a.noteId},path=`captures/${digest('capture')}.json`;await repo.files.write(path,canonical({hash:digest(canonical(journal)),data:journal}),false)
  a=await repo.trash(a.noteId,a.heads);await repo.batch([{noteId:a.noteId,expectedHeads:a.heads}],'purge')
  assert.ok(!(await repo.files.scan()).paths.includes(path));assert.deepEqual(await repo.getAsset(image.id),png)
})
test('unarchived remote image URLs remain exportable as Markdown without fetching them',async t=>{
  const {repo}=await fixture(t),note=await repo.save({expectedHeads:[],content:{...content,body:'![保留引用](https://example.com/missing.png)'}})
  const file=await createExport(repo,{noteId:note.noteId,revision:note.current.revision,format:'markdown'})
  assert.ok(file.bytes.toString().includes('https://example.com/missing.png'))
  await assert.rejects(createExport(repo,{noteId:note.noteId,revision:note.current.revision,format:'pdf'}),{code:'export_image_unarchived'})
})
