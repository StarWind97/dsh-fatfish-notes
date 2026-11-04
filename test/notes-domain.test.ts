import test from 'node:test'
import assert from 'node:assert/strict'
import { createNoteRevision, mergeNoteRevisions, materializeNote, validateNoteRevision, validateDag, createNotebookRevision, mergeNotebookRevisions } from '../src/notes/revisions.js'
import { parseNoteMarkdown, serializeNoteMarkdown } from '../src/notes/markdown.js'
import { canonical, relativePath } from '../src/notes/validation.js'
import { validateBodyAssets, sourceBytes } from '../src/notes/assets.js'
import { conflictRevisions } from '../src/notes/conflicts.js'
import { searchNotes } from '../src/notes/search.js'
import { NOTE_LIMITS } from '../src/notes/types.js'
import type { NoteContent, NoteRevision } from '../src/notes/types.js'

const noteId = '01ARZ3NDEKTSV4RRFFQ69G5FAV'
const otherId = '01ARZ3NDEKTSV4RRFFQ69G5FAW'
const content: NoteContent = { title: '同步样例', body: '原文', summary: '', tags: [], notebookId: null, status: 'active', sourceId: null, assetIds: [] }
const revision = (parents: string[] = [], body = '原文', patch: Partial<NoteRevision> = {}): NoteRevision => createNoteRevision({ version: 1, noteId, parents, recordedAt: '2026-11-01T00:00:00.000Z', ...content, body, ...patch })

test('both modification-time orders paginate the entire filtered list consistently',()=>{
  const views = Array.from({length:103},(_,i)=>{
    const key = '01ARZ3NDEKTSV4RRFFQ69G5'+String(i).padStart(3,'0')
    return materializeNote([revision([], '正文', {noteId:key,recordedAt:new Date(1793500000000+(i%53)*1000).toISOString()})],key)
  })
  for(const order of ['recent','oldest'] as const){
    const ids:string[]=[]
    let cursor:string|null=null
    do {
      const page=searchNotes(views,{order,limit:50,query:'正文',...(cursor?{cursor}:{})})
      ids.push(...page.items.map(x=>x.noteId));cursor=page.cursor
    } while(cursor)
    const expected=[...views].sort((a,b)=>(order==='oldest'?1:-1)*a.savedAt.localeCompare(b.savedAt)||a.noteId.localeCompare(b.noteId))
    assert.deepEqual(ids,expected.map(v=>v.noteId))
  }
})
test('notes canonical JSON/hash ignores key/parent/tag order but preserves exact body', () => {
  const a = revision([], '\r\n 原文  \r\n', { title: '  ', tags: ['二', '一', '二'] })
  assert.equal(a.title, '无标题'); assert.deepEqual(a.tags, ['一', '二'])
  const { revision: _hash, ...data } = a
  const reordered = Object.fromEntries(Object.entries(data).reverse()) as Omit<NoteRevision, 'revision'>
  assert.deepEqual(createNoteRevision(reordered), a)
  assert.notEqual(revision([], '\n 原文  \n').revision, a.revision)
  assert.notEqual(revision([], '原文').revision, revision([], '原文\n').revision)
  const base = revision(), left = revision([base.revision], '左'), right = revision([base.revision], '右')
  assert.equal(revision([left.revision, right.revision], '解').revision, revision([right.revision, left.revision, left.revision], '解').revision)
})

test('notes DAG union is commutative, associative and idempotent with all concurrent heads', () => {
  const base = revision(), a = revision([base.revision], '甲'), b = revision([base.revision], '乙'), c = revision([a.revision], '丙')
  const x = [base, a], y = [base, b], z = [base, a, c], merge = mergeNoteRevisions
  assert.deepEqual(merge(x, y), merge(y, x))
  assert.deepEqual(merge(merge(x, y), z), merge(x, merge(y, z)))
  const union = merge(x, y); assert.deepEqual(merge(union, union), union)
  assert.deepEqual(materializeNote(union, noteId).heads, [a.revision, b.revision].sort())
  assert.equal(materializeNote(merge(union, z), noteId).heads.length, 2)
})

test('notes backward clocks never win over ancestry; unrelated time does not select a head', () => {
  const a = revision(), b = revision([a.revision], '更新', { recordedAt: '2000-01-01T00:00:00.000Z' })
  assert.equal(materializeNote([a, b], noteId).current.body, '更新')
  const c = revision([a.revision], '另一版', { recordedAt: '2099-01-01T00:00:00.000Z' })
  assert.equal(materializeNote([a, b, c], noteId).current.revision, [b.revision, c.revision].sort()[0])
})

test('notes concurrent edit/delete survives search and explicit all-head resolution', () => {
  const base = revision(), edit = revision([base.revision], '不能丢失的正文'), deletion = revision([base.revision], base.body, { status: 'trashed' })
  const rows = mergeNoteRevisions([base, edit], [base, deletion]), view = materializeNote(rows, noteId)
  assert.equal(view.conflicts.length, 1)
  assert.equal(searchNotes([view], { query: '不能丢失' }).items.length, 1)
  assert.equal(searchNotes([view], { status: 'trashed' }).items.length, 1)
  const resolution = revision(view.heads, '合并并恢复')
  assert.deepEqual(materializeNote([...rows, resolution], noteId).heads, [resolution.revision])
})

test('notes reject hash changes, unknown fields, missing/cross-note parents and actual graph cycles', () => {
  const a = revision()
  assert.throws(() => validateNoteRevision({ ...a, body: '篡改' }), /校验失败/)
  assert.throws(() => validateNoteRevision({ ...a, future: true }), /字段/)
  assert.throws(() => mergeNoteRevisions([revision(['0'.repeat(64)])], []), /父修订/)
  const foreign = revision([a.revision], '跨笔记', { noteId: otherId })
  assert.throws(() => mergeNoteRevisions([a, foreign], []), /父修订/)
  assert.throws(() => validateDag([{ revision: 'a', parents: ['b'] }, { revision: 'b', parents: ['a'] }], () => noteId), /环/)
  assert.throws(() => validateDag([{ revision: 'a', parents: ['a'] }], () => noteId), /环/)
})

test('notes long linear DAG uses iterative validation', () => {
  const rows = Array.from({ length: 20_000 }, (_, i) => ({ revision: String(i), parents: i ? [String(i - 1)] : [] }))
  assert.doesNotThrow(() => validateDag(rows, () => noteId))
})

test('notes enforce actual UTF-8 body limits and reject unpaired surrogate ambiguity', () => {
  const body = '中'.repeat(Math.floor(NOTE_LIMITS.body / 3)) + 'a'
  assert.equal(Buffer.byteLength(body), NOTE_LIMITS.body)
  assert.equal(revision([], body).body, body)
  assert.throws(() => revision([], body + 'a'), /UTF-8/)
  assert.throws(() => revision([], '\ud800'), /UTF-8/)
  assert.throws(() => canonical({ text: '\udfff' }))
  assert.doesNotThrow(() => revision([], '😀'))
})

test('notes source snapshot limit is UTF-8 bytes including its JSON envelope', () => {
  const value = { text: 'a'.repeat(NOTE_LIMITS.source - 11) }
  assert.equal(sourceBytes(value).length, NOTE_LIMITS.source)
  assert.throws(() => sourceBytes({ text: value.text + '中' }), /20 MiB/)
})

test('notes Markdown roundtrip preserves every body byte and frontmatter-like body', () => {
  for (const body of ['', '\n', '\r\n 原文  \r\n\r\n', '---\nhello: "world"\n---\n', '\uFEFF# 标题\n😀']) {
    const r = revision([], body), markdown = serializeNoteMarkdown(r), parsed = parseNoteMarkdown(markdown)
    assert.equal(parsed.changed, false); assert.deepEqual(parsed.revision, r)
    assert.deepEqual(Buffer.from(parsed.revision.body), Buffer.from(body))
  }
})

test('notes Markdown external edits retain declared parent and reject malformed or extra metadata', () => {
  const a = revision(), md = serializeNoteMarkdown(a), parsed = parseNoteMarkdown(md + '\r\n外部编辑 ')
  assert.equal(parsed.declaredRevision, a.revision); assert.equal(parsed.changed, true)
  assert.equal(parsed.revision.body, '原文\r\n外部编辑 ')
  assert.throws(() => parseNoteMarkdown(md.replace('---\n', '---\nfoo: true\n')), /字段/)
  assert.throws(() => parseNoteMarkdown(md.replace('---\n', '---\ntitle: "重复"\n')))
  assert.throws(() => parseNoteMarkdown('---\ntitle: !!js/function evil\n---\n原文'))
})

test('notes paths are identity-based and reject Windows/device/encoded/traversal paths', () => {
  assert.equal(relativePath(`documents/${noteId}.md`), `documents/${noteId}.md`)
  for (const path of ['../outside', 'C:\\Windows\\file', '/absolute', 'documents/CON.md', 'documents/%2e%2e/file.md', `documents/${noteId}.md:evil`, `documents\\${noteId}.md`, `documents/${noteId}.md `]) assert.throws(() => relativePath(path), /路径/)
  assert.equal(revision([], '正文', { title: '中文 / CON: <标题>? *' }).title, '中文 / CON: <标题>? *')
})

test('notes image references support inline/reference Markdown while refusing unknown/local paths', () => {
  const asset = `${'a'.repeat(64)}.png`
  assert.doesNotThrow(() => validateBodyAssets(`![图](../assets/${asset})\n![别名][a]\n\n[a]: ../assets/${asset}`, [asset]))
  assert.doesNotThrow(() => validateBodyAssets('![外链](https://example.com/a.png)\n`![代码](C:/private.png)`', []))
  for (const url of ['../assets/' + 'b'.repeat(64) + '.png', 'file:///C:/private.png', 'C:/private.png', '../../outside.png', 'data:image/png;base64,aaa', '../assets/%2e%2e/secret']) assert.throws(() => validateBodyAssets(`![图](${url})`, [asset]))
})

test('final R1 image validation uses the first normalized definition in document order', async t => {
  const asset = `${'a'.repeat(64)}.png`, first = (url: string) => `[Pic Ref]: ${url}`, later = (url: string) => `[pic  ref]: ${url}`
  const layouts = {
    flat: (a: string, b: string) => `${a}\n\n![selected][PIC REF]\n\n${b}`,
    'earlier quote': (a: string, b: string) => `> ${a}\n\n![selected][PIC REF]\n\n${b}`,
    'earlier list': (a: string, b: string) => `- container\n\n  ${a}\n\n![selected][PIC REF]\n\n${b}`,
    'later quote': (a: string, b: string) => `${a}\n\n![selected][PIC REF]\n\n> ${b}`,
  }
  for (const [kind, body] of Object.entries(layouts)) await t.test(kind, () => {
    assert.throws(() => validateBodyAssets(body(first('<>'), ''), []), { code: 'note_asset' })
    assert.throws(() => validateBodyAssets(body(first('<>'), later('https://example.com/harmless.png')), []), { code: 'note_asset' })
    assert.throws(() => validateBodyAssets(body(first('file:///C:/private.png'), later('https://example.com/harmless.png')), []), { code: 'note_asset' })
    // An unused later file path cannot replace the valid selected archive reference.
    assert.doesNotThrow(() => validateBodyAssets(body(first(`../assets/${asset}`), later('file:///C:/unused.png')), [asset]))
    assert.doesNotThrow(() => validateBodyAssets(body(first('https://example.com/first.png'), later(`../assets/${asset}`)), []))
    assert.throws(() => validateBodyAssets(body(first(`../assets/${asset}`), later('https://example.com/harmless.png')), []), { code: 'note_asset' })
  })
})

test('notes notebook revisions preserve concurrent rename/delete and canonical hash checks', () => {
  const base = createNotebookRevision({ version: 1, notebookId: otherId, parents: [], title: '组', status: 'active', recordedAt: '2026-11-01T00:00:00.000Z' })
  const { revision: _revision, ...data } = base
  const a = createNotebookRevision({ ...data, parents: [base.revision], title: '重命名' }), b = createNotebookRevision({ ...data, parents: [base.revision], status: 'trashed' })
  assert.equal(mergeNotebookRevisions([base, a], [base, b]).length, 3)
  assert.throws(() => mergeNotebookRevisions([{ ...a, title: '篡改' }], []))
})

test('notes search searches only title/summary/tags/body and returns bounded metadata pages', () => {
  const a = materializeNote([revision([], '正文词', { title: '标题词', summary: '摘要词', tags: ['标签词'] })], noteId)
  const b = materializeNote([revision([], '第二篇', { noteId: otherId })], otherId)
  for (const query of ['标题词', '摘要词', '标签词', '正文词']) assert.equal(searchNotes([a, b], { query }).items.length, 1)
  assert.equal(searchNotes([a], { query: noteId }).items.length, 0)
  const page = searchNotes([b, a], { limit: 1 }); assert.equal(page.cursor, noteId); assert.ok(!('body' in page.items[0]!))
  assert.equal(searchNotes([b, a], { cursor: page.cursor!, limit: 1 }).items[0]?.noteId, otherId)
  assert.throws(() => searchNotes([a], { limit: 101 }))
})

test('overlapping three-device splits converge without duplicating the shared branch',()=>{
  const root=createNoteRevision({noteId:'01G00000000000000000000001',version:1,parents:[],recordedAt:'2026-11-03T02:00:00.000Z',title:'Note',body:'base',summary:'',tags:[],notebookId:null,sourceId:null,status:'active',assetIds:[]})
  const {revision,...content}=root
  const [a,b,c]=['A','B','C'].map(body=>createNoteRevision({...content,body,parents:[revision]})) as [typeof root,typeof root,typeof root]
  const all=[root,a,b,c,...conflictRevisions([root,a,b]),...conflictRevisions([root,c,b])]
  const unique=[...new Map(all.map(r=>[r.revision,r])).values()]
  const resolved=[...unique,...conflictRevisions(unique)]
  assert.equal(new Set(resolved.map(r=>r.noteId)).size,3)
  assert.deepEqual(conflictRevisions(resolved),[])
})
