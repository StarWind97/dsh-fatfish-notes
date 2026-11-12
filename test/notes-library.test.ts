import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { NotesController, noteContent } from '../src/client/notes-controller.js'
import { NoteMarkdown, resolveNoteImage } from '../src/client/NoteMarkdown.js'
import { NoteCaptureBridge } from '../src/client/note-capture-bridge.js'
import { ApiError, createApi, type Api } from '../src/client/api.js'
import type { NoteContent, NoteView, NoteSaveInput, NoteDraftRequest, CaptureRequest, NoteListItem } from '../src/contracts/notes.js'
import { createNoteRevision, createNotebookRevision, materializeNote } from '../src/notes/revisions.js'

const a = '01K00000000000000000000000', b = '01K00000000000000000000001'
const content = (body = 'original'): NoteContent => ({ title: 'Title', body, summary: '', tags: [], status: 'active', notebookId: null, sourceId: null, assetIds: [] })
function note(noteId = a, body = 'original') { return materializeNote([createNoteRevision({ version: 1, noteId, parents: [], recordedAt: '2026-11-01T00:00:00.000Z', ...content(body) })], noteId) }
function saved(input: NoteSaveInput): NoteView {
  const row = createNoteRevision({ version: 1, noteId: input.noteId!, parents: input.expectedHeads, recordedAt: '2026-11-01T00:00:01.000Z', ...input.content })
  return { noteId: row.noteId, heads: [row.revision], current: row, conflicts: [], savedAt: row.recordedAt, effectiveNotebookId: row.notebookId }
}
function deferred<T>() { let resolve!: (v: T) => void; const promise = new Promise<T>(done => { resolve = done }); return { promise, resolve } }
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0))

test('cancel editing discards persisted draft and leaves the current formal version unchanged',async()=>{
  const f=fixture(),c=new NotesController(f.call,{autosaveMs:100000})
  try{await c.open(a);await c.beginEdit();c.update({body:'草稿修改'});await c.flush();assert.equal(f.writes.length,0)
    f.rows.set(a,note(a,'远端的最新内容'));assert.equal(await c.cancelEdits(),true);assert.equal(c.getSnapshot().draft?.body,'远端的最新内容');assert.equal(f.writes.length,0)
    await c.create();c.update({body:'新建草稿'});await c.flush();assert.equal(await c.cancelEdits(),true);assert.equal(c.getSnapshot().noteId,null);assert.equal(f.writes.length,0)
  }finally{c.dispose()}
})

test('sidebar new draft associates its first save and preserves the chosen notebook; empty exit writes nothing',async()=>{
  const f=fixture(),c=new NotesController(f.call)
  try{
    await c.create({notebookId:b,sessionId:'current-session'});await c.leave();assert.equal(f.writes.length,0)
    await c.create({notebookId:b,sessionId:'current-session'});c.update({title:'侧栏新建',body:'正文'});await c.leave()
    assert.deepEqual(f.writes.at(-1)?.content.sessionLinks,['current-session']);assert.equal(f.writes.at(-1)?.content.notebookId,b)
  }finally{c.dispose()}
})

test('sidebar association refresh retains loaded pages and order, while a different filter resets them',async()=>{
  const rows:NoteListItem[]=Array.from({length:120},(_,i)=>({noteId:String(i),heads:['old'],title:String(i),summary:'',tags:[],notebookId:null,status:'active',savedAt:'2026-11-11',conflicted:false,sessionRelation:null}));let ordered=[...rows]
  const c=new NotesController(async(path,input)=>{
    if(path==='/notes/notebooks')return {ok:true,notebooks:[]} as never
    if(path==='/notes'){const v=input as {cursor?:string};const offset=Number(v.cursor??0);return {ok:true,items:ordered.slice(offset,offset+50),cursor:offset+50<ordered.length?String(offset+50):null} as never}
    throw new Error(path)
  },{stableList:true})
  try{
    await c.filter({sessionId:'s',relation:'browse'});await c.refresh(false);const ids=c.getSnapshot().items.map(n=>n.noteId)
    c.patchAssociation({...note(),noteId:'72',heads:['linked'],savedAt:'new'},'manual');assert.equal(c.getSnapshot().items[72]?.sessionRelation,'manual')
    ordered=[{...rows[72]!,heads:['linked'],sessionRelation:'manual'} as typeof rows[number],...rows.filter(n=>n.noteId!=='72')]
    await c.refresh();assert.deepEqual(c.getSnapshot().items.map(n=>n.noteId),ids);assert.equal(c.getSnapshot().cursor,'100')
    await c.filter({sessionId:'s',relation:'linked'});assert.equal(c.getSnapshot().items.length,50);assert.equal(c.getSnapshot().items[0]?.noteId,'72')
  }finally{c.dispose()}
})
test('navigation waits for a pending pasted image and automatically saves it',async()=>{
  const f=fixture(),c=new NotesController(f.call),gate=deferred<void>()
  try{
    await c.open(a)
    const pending=c.queueImageImport(async()=>{await gate.promise;c.update({body:'imported picture'})})
    const navigation=c.open(b)
    await tick();assert.equal(c.getSnapshot().noteId,a)
    gate.resolve();await pending;assert.equal(await navigation,true)
    assert.equal(f.writes.at(-1)?.content.body,'imported picture')
    assert.equal(c.getSnapshot().noteId,b)
  }finally{c.dispose()}
})
function fixture(intercept?: (path: string, input: unknown) => Promise<unknown> | undefined) {
  const rows = new Map([[a, note(a)], [b, note(b, 'second')]]), writes: Array<NoteSaveInput & { resolve?: boolean }> = []
  const checkpoints:NoteSaveInput[]=[]
  const call: Api = async (path, input) => {
    if(path==='/notes/draft-recovery')return {ok:true,recovered:[],failed:[]} as never
    if(path==='/notes/session-context')return {ok:true,workspace:null,notebookId:null} as never
    if(path==='/notes/capture-progress')return {ok:true,progress:null} as never
    const handled = intercept?.(path, input); if (handled) return await handled as never
    if(path==='/notes/draft'){
      const v=input as NoteDraftRequest
      if(v.action==='discard')return {ok:true,state:'discarded',note:null} as never
      if(v.action==='save'){checkpoints.push(v.request);return {ok:true,state:'editing',note:null} as never}
      const old=rows.get(v.request.noteId),c=v.request.content
      if(!old&&!c.title&&!c.body&&!c.summary&&!c.assetIds.length&&!c.attachments?.length)return {ok:true,state:'finished',note:null} as never
      if(old&&JSON.stringify(noteContent(old))===JSON.stringify(c))return {ok:true,state:'finished',note:old} as never
      const result=await call('/notes/save',v.request)
      return {...result,state:'finished'} as never
    }
    if (path === '/notes/get') return { ok: true, note: rows.get((input as { noteId: string }).noteId) } as never
    if (path === '/notes/jobs') return { ok: true, jobs: [], cursor: null } as never
    if (path === '/notes/notebooks') return { ok: true, notebooks: [] } as never
    if (path === '/notes') return { ok: true, items: [], cursor: null } as never
    if (path === '/notes/save') { const v = input as NoteSaveInput; writes.push(v); const result = saved(v); rows.set(result.noteId, result); return { ok: true, note: result } as never }
    throw new Error(`unexpected ${path}`)
  }
  return { rows, writes, checkpoints, call }
}

test('notebooks tab keeps filters and selection, flushes edits and blocks switching when saving fails', async () => {
  let fail = true
  const f = fixture(path => path === '/notes/save' && fail ? Promise.reject(new ApiError('network')) : undefined), c = new NotesController(f.call)
  try {
    const filter = { notebookId: b, query: '资料', tag: '标签', order: 'oldest' as const }
    await c.filter(filter); await c.open(a); c.beginEdit(); c.update({ body: '切页前的最后输入' })
    assert.equal(await c.navigate('notebooks'), false)
    assert.equal(c.getSnapshot().section, 'notes'); assert.equal(c.getSnapshot().editing, true)
    assert.equal(c.getSnapshot().draft!.body, '切页前的最后输入')
    fail = false; assert.equal(await c.navigate('notebooks'), true)
    assert.equal(f.rows.get(a)!.current.body, '切页前的最后输入'); assert.equal(c.getSnapshot().editing, false)
    await c.navigate('notes')
    assert.deepEqual(c.getSnapshot().filter, filter); assert.equal(c.getSnapshot().noteId, a)
    assert.equal(c.getSnapshot().draft!.body, '切页前的最后输入'); assert.equal(c.getSnapshot().dirty, false)
  } finally { c.dispose() }
})

test('removing a notebook refreshes the selected note and removed filter without leaving the notebooks tab', async () => {
  const revision = createNotebookRevision({ version: 1, notebookId: b, parents: [], title: '普通本', recordedAt: '2026-11-09T00:00:00.000Z', status: 'active' })
  const book = { notebookId: b, heads: [revision.revision], current: revision, conflicts: [], noteCount: 1, isDefault: false }
  const f = fixture(path => {
    if (path !== '/notes/notebook') return undefined
    const previous = f.rows.get(a)!
    f.rows.set(a, saved({ noteId: a, expectedHeads: previous.heads, content: { ...noteContent(previous), body: '移除后保留的正文' } }))
    return Promise.resolve({ ok: true, notebooks: [] })
  }), c = new NotesController(f.call)
  try {
    await c.open(a); await c.filter({ notebookId: b, order: 'oldest' }); await c.navigate('notebooks')
    assert.equal(await c.notebook(book.current.title, book, true, { removal: 'move', expectedNoteCount: 1 }), true)
    assert.equal(c.getSnapshot().section, 'notebooks')
    assert.equal(c.getSnapshot().noteId, a); assert.equal(c.getSnapshot().draft!.body, '移除后保留的正文')
    assert.deepEqual(c.getSnapshot().filter, { order: 'oldest' })
    await c.navigate('notes'); assert.equal(c.getSnapshot().draft!.body, '移除后保留的正文')
  } finally { c.dispose() }
})

test('M7 export freezes after pending writes and invalidates ownership on navigation or new persisted revision', async () => {
  const f = fixture(), c = new NotesController(f.call)
  try {
    await c.open(a); c.update({ body: '最新编辑' })
    const frozen = await c.freezeExport(); assert.ok(frozen); assert.equal(frozen.note.current.body, '最新编辑'); assert.equal(f.writes.length, 1); assert.equal(frozen.isCurrent(), true)
    c.update({ body: '后续编辑' }); assert.equal(frozen.note.current.body, '最新编辑'); await c.saveEdits(); assert.equal(frozen.isCurrent(), false)
    const second = await c.freezeExport(); assert.ok(second); await c.open(b); assert.equal(second.isCurrent(), false)
    await c.open(a); assert.equal(second.isCurrent(), false, 'returning to A must not revive a stale download')
  } finally { c.dispose() }
})
test('M7 export cannot bypass composition, failed save, conflict or a newer pending selection', async () => {
  let fail = false, hold = false; const gate = deferred<unknown>()
  const f = fixture((path, input) => path === '/notes/save' && fail ? Promise.reject(new ApiError('network')) : path === '/notes/get' && hold && (input as { noteId: string }).noteId === b ? gate.promise : undefined), c = new NotesController(f.call)
  try {
    await c.open(a); c.composition(true); c.update({ body: '输入中' }); assert.equal(await c.freezeExport(), null)
    c.composition(false); fail = true; assert.equal(await c.freezeExport(), null); assert.equal(c.getSnapshot().draft!.body, '输入中')
    fail = false; await c.saveEdits(); const frozen = await c.freezeExport(); assert.ok(frozen)
    hold = true; const pending = c.open(b); await tick(); assert.equal(frozen.isCurrent(), false); assert.equal(await c.freezeExport(), null)
    gate.resolve({ ok: true, note: note(b) }); await pending
  } finally { c.dispose() }
})
test('editing automatically saves all fields and navigation returns to reading',async()=>{
  const f=fixture(),c=new NotesController(f.call,{autosaveMs:10,maxWaitMs:25})
  try{
    await c.open(a);c.beginEdit()
    const edits={title:'手改标题',summary:'手改摘要',tags:['手工'],body:'新正文'}
    c.update(edits);await new Promise(r=>setTimeout(r,40))
    assert.equal(c.getSnapshot().editing,true);assert.equal(c.getSnapshot().dirty,false)
    assert.equal(f.writes.length,0);assert.equal(f.checkpoints.at(-1)?.content.summary,edits.summary)
    c.update({body:'离开前的最后输入'});await c.open(b)
    assert.equal(f.rows.get(a)!.current.body,'离开前的最后输入');assert.equal(c.getSnapshot().editing,false)
    await c.create();await c.back();assert.equal(f.writes.length,1,'empty new notes do not create revisions')
  }finally{c.dispose()}
})

test('local checkpoint serializes newer typing without creating formal revisions',async()=>{
  const gate=deferred<unknown>();let held=false
  const f=fixture((path,input)=>{if(path==='/notes/draft'&&(input as NoteDraftRequest).action==='save'&&!held){held=true;return gate.promise}return undefined}),c=new NotesController(f.call)
  try{await c.open(a);await c.beginEdit();c.update({body:'第一段',title:'标题 '});const writing=c.flush();await tick();c.update({body:'第一段，后来输入'});gate.resolve({ok:true,state:'editing',note:null})
    assert.equal(await writing,true);assert.equal(c.getSnapshot().draft?.title,'标题 ');assert.equal(f.checkpoints.at(-1)?.content.body,'第一段，后来输入');assert.equal(f.writes.length,0)
    await c.saveEdits();assert.equal(f.rows.get(a)?.current.body,'第一段，后来输入');assert.equal(f.writes.length,1)
  }finally{c.dispose()}
})

test('M5 persistent failure blocks navigation and retains the draft until explicit retry succeeds', async () => {
  let fail = true
  const f = fixture(path => path === '/notes/save' && fail ? Promise.reject(new ApiError('network')) : undefined), c = new NotesController(f.call)
  try {
    await c.open(a); c.update({ body: 'unsaved' })
    assert.equal(await c.open(b), false); assert.equal(c.getSnapshot().noteId, a); assert.equal(c.getSnapshot().draft!.body, 'unsaved'); assert.equal(c.editChanged, true)
    assert.equal(await c.navigate('settings'), false); assert.equal(c.getSnapshot().section, 'notes')
    fail = false; assert.equal(await c.saveEdits(),true); assert.equal(await c.open(b), true); assert.equal(f.rows.get(a)!.current.body, 'unsaved'); assert.equal(c.getSnapshot().draft!.body, 'second')
  } finally { c.dispose() }
})
test('M5 IME composition delays writes and switching; repeated new clicks create one identity', async () => {
  const f = fixture(), c = new NotesController(f.call)
  try {
    await c.open(a); c.composition(true); c.update({ body: '拼音输入' }); await new Promise(resolve => setTimeout(resolve, 10))
    assert.equal(f.writes.length, 0); assert.equal(await c.open(b), false)
    c.composition(false); assert.equal(await c.saveEdits(), true); assert.equal(f.writes.length, 1)
    await Promise.all([c.create(), c.create(), c.create()]); assert.equal(f.writes.length, 1); assert.notEqual(c.getSnapshot().noteId, a); await c.back();assert.equal(c.getSnapshot().noteId,null)
  } finally { c.dispose() }
})
test('M5 stale reads cannot replace the last selected note; no writes on read or panel switch', async () => {
  const gate = deferred<unknown>(), f = fixture((path, input) => path === '/notes/get' && (input as { noteId: string }).noteId === a ? gate.promise : undefined), c = new NotesController(f.call)
  try {
    const earlier = c.open(a); await tick(); await c.open(b); gate.resolve({ ok: true, note: note(a) }); await earlier
    assert.equal(c.getSnapshot().noteId, b); await c.navigate('settings'); await c.navigate('notes'); assert.equal(f.writes.length, 0)
  } finally { c.dispose() }
})
test('M5 concurrent edit retains local text and requires explicit heads-aware confirmation', async () => {
  let concurrent = false
  const latest = saved({ noteId: a, expectedHeads: note().heads, content: content('external') })
  const f = fixture((path, input) => {
    if (path === '/notes/get' && concurrent) return Promise.resolve({ ok: true, note: latest })
    if (path === '/notes/save' && !(input as { resolve?: boolean }).resolve) return Promise.reject(new ApiError('note_conflict'))
    return undefined
  }), c = new NotesController(f.call)
  try {
    await c.open(a); c.update({ body: 'my text' }); concurrent = true; assert.equal(await c.saveEdits(), false)
    assert.equal(c.getSnapshot().draft!.body, 'my text'); assert.equal(c.getSnapshot().conflict!.current.body, 'external')
    assert.equal(await c.open(b), false); assert.equal(f.writes.length, 0)
    assert.equal(await c.resolve(), true); assert.deepEqual(f.writes[0]!.expectedHeads, latest.heads); assert.equal(f.writes[0]!.resolve, true); assert.equal(c.getSnapshot().draft!.body, 'my text')
  } finally { c.dispose() }
})
test('M5 deleted notebook effective membership is used without a write on opening', async () => {
  const v = note(); v.current.notebookId = b; v.effectiveNotebookId = null
  const f = fixture(path => path === '/notes/get' ? Promise.resolve({ ok: true, note: v }) : undefined), c = new NotesController(f.call)
  try { await c.open(a); assert.equal(c.getSnapshot().draft!.notebookId, null); assert.equal(f.writes.length, 0); c.update({ body: 'edit' }); await c.saveEdits(); assert.equal(f.writes[0]!.content.notebookId, null) } finally { c.dispose() }
})
test('M5 capture passes selected notebook and navigates to the saved library note', async () => {
  let request: CaptureRequest | undefined, opened: string | undefined
  const call: Api = async (path, input) => {
    if(path==='/notes/session-context')return {ok:true,workspace:null,notebookId:null} as never
    if(path==='/notes/capture-progress')return {ok:true,progress:null} as never
    if (path === '/notes/selection') return { ok: true, defaultMessageIds: ['m1'], messages: [{id:'m1',seq:1,role:'assistant',blocks:[{type:'text',text:'saved answer'}]}], cut: {throughSeq:1,capturedAt:'2026-11-01T00:00:01.000Z',isSeeded:false}, complete: true, issues: [] } as never
    if (path === '/notes/capture') { request = input as CaptureRequest; return { ok: true, note: note(), enrichmentJobId: null } as never }
    throw new Error('unexpected')
  }
  const bridge = new NoteCaptureBridge(call, undefined, async noteId => { opened = noteId; return true })
  try { await bridge.open('session'); bridge.notebook(b); await bridge.save(); assert.equal(request!.notebookId, b); await bridge.openNote(); assert.equal(opened, a); assert.equal(bridge.getSnapshot(), null) } finally { bridge.dispose() }
})
test('M5 note Markdown renders safe text and verified asset route, never arbitrary media requests', () => {
  const v = note(), asset = 'a'.repeat(64) + '.png'; v.current.assetIds = [asset]
  const url = resolveNoteImage(`../assets/${asset}`, v); assert.match(url!, /notes\/asset\?noteId=/); assert.ok(url!.includes(v.current.revision))
  for (const unsafe of ['../assets/' + 'b'.repeat(64) + '.png', '/notes/asset', 'file:///C:/secret', 'http://127.0.0.1:9000/private.png', 'https://example.com/remote.png']) assert.equal(resolveNoteImage(unsafe, v), null)
  const html = renderToStaticMarkup(createElement(NoteMarkdown, { note: v, body: `<script>evil()</script>\n\n![local](../assets/${asset})\n![remote](https://example.com/a.png)\n[video](http://127.0.0.1/a.mp4)\n[bad](javascript:alert(1))` }))
  assert.match(html, /notes\/asset/); assert.doesNotMatch(html, /<script|<video|src="https:|src="http:|href="javascript:/)
})
test('M5 client rejects mismatched note and durable task identities', async () => {
  const call = createApi(async () => new Response(JSON.stringify({ ok: true, note: note(b) }), { status: 200 }))
  await assert.rejects(call('/notes/get', { noteId: a }), { code: 'invalid_response' })
  assert.equal(noteContent(note()).body, 'original')
})
test('M5 visible AI polling reports completion without overwriting typing started during the request', async () => {
  const gate = deferred<unknown>(), jobId = 'b'.repeat(64)
  const f = fixture(path => path === '/notes/jobs' ? Promise.resolve({ ok: true, jobs: [{ jobId, noteId: a, status: 'running', error: null, candidate: null, stages: [{ status: 'waiting' }] }], cursor: null }) : path === '/notes/job' ? gate.promise : undefined), c = new NotesController(f.call)
  try {
    await c.open(a); await tick(); const polling = c.pollJobs(); await tick()
    c.update({ body: 'still typing' }); gate.resolve({ ok: true, job: { jobId, noteId: a, status: 'completed', error: null, candidate: null, stages: [{ status: 'done' }] } }); await polling
    assert.equal(c.getSnapshot().jobs[0]!.status, 'completed'); assert.equal(c.getSnapshot().draft!.body, 'still typing'); assert.equal(c.getSnapshot().dirty, true)
  } finally { c.dispose() }
})
test('M5 disposal during an admitted save never starts another write or updates the disposed editor', async () => {
  const gate = deferred<unknown>(); let input: NoteSaveInput | null = null, calls = 0
  const f = fixture((path, body) => { if (path === '/notes/save') { calls++; input = body as NoteSaveInput; return gate.promise } return undefined }), c = new NotesController(f.call)
  await c.open(a); c.update({ body: 'admitted' }); const writing = c.saveEdits(); await tick(); c.update({ body: 'later' }); c.dispose()
  gate.resolve({ ok: true, note: saved(input!) }); assert.equal(await writing, false); assert.equal(calls, 1); assert.equal(await c.saveEdits(), false)
})
test('M5 stale list results cannot replace a newer filter and pagination deduplicates repeated items', async () => {
  const gate = deferred<unknown>()
  const item = { noteId: b, heads: note(b).heads, title: 'new', summary: '', tags: [], notebookId: null, status: 'active', savedAt: '', conflicted: false }
  const f = fixture((path, input) => path === '/notes' ? (input as { query?: string }).query === 'older' ? gate.promise : Promise.resolve({ ok: true, items: [item], cursor: b }) : undefined), c = new NotesController(f.call)
  try {
    const earlier = c.filter({ query: 'older' }); await c.filter({ query: 'newer' }); gate.resolve({ ok: true, items: [], cursor: null }); await earlier
    assert.equal(c.getSnapshot().items[0]!.noteId, b); await c.refresh(false); assert.equal(c.getSnapshot().items.length, 1)
  } finally { c.dispose() }
})
test('M5 P2 loading B rejects manual AI actions on A and never reopens A for typing', async () => {
  const loadingB = deferred<unknown>(); let mutations = 0
  const f = fixture((path, input) => {
    if (path === '/notes/get' && (input as { noteId: string }).noteId === b) return loadingB.promise
    if (path === '/notes/job/cancel') { mutations++; return Promise.resolve({ ok: true, job: {} }) }
    return undefined
  }), c = new NotesController(f.call)
  try {
    await c.open(a); const opening = c.open(b); await tick(); assert.equal(c.getSnapshot().loadingNote, true)
    const cancelled = await c.job('b'.repeat(64), 'cancel')
    c.update({ body: 'UNSAVED HUMAN EDIT' })
    const during = c.getSnapshot()
    loadingB.resolve({ ok: true, note: note(b, 'second note') }); await opening
    assert.equal(cancelled, false); assert.equal(mutations, 0)
    assert.equal(during.loadingNote, true); assert.equal(during.draft!.body, 'original')
    assert.equal(c.getSnapshot().noteId, b); c.update({ body: 'B human edit' }); assert.equal(c.getSnapshot().draft!.body, 'B human edit')
  } finally { c.dispose() }
})
test('M5 P2 completed AI poll readback from A cannot clear the pending B load or erase later edits', async () => {
  const loadingA = deferred<unknown>(), loadingB = deferred<unknown>(), jobId = 'b'.repeat(64); let aReads = 0
  const f = fixture((path, input) => {
    if (path === '/notes/jobs') return Promise.resolve({ ok: true, jobs: [{ jobId, noteId: a, status: 'running', error: null, candidate: null, stages: [{ status: 'waiting' }] }], cursor: null })
    if (path === '/notes/job') return Promise.resolve({ ok: true, job: { jobId, noteId: a, status: 'completed', error: null, candidate: null, stages: [{ status: 'done' }] } })
    if (path === '/notes/get') {
      if ((input as { noteId: string }).noteId === b) return loadingB.promise
      if (++aReads > 1) return loadingA.promise
    }
    return undefined
  }), c = new NotesController(f.call)
  try {
    await c.open(a); await tick(); const polling = c.pollJobs(); await tick(); assert.equal(aReads, 2)
    const opening = c.open(b); await tick()
    loadingA.resolve({ ok: true, note: note(a, 'AI completed A') }); await polling
    c.update({ body: 'UNSAVED HUMAN EDIT' }); const during = c.getSnapshot()
    loadingB.resolve({ ok: true, note: note(b, 'second note') }); await opening
    assert.equal(during.loadingNote, true); assert.equal(during.draft!.body, 'original')
    assert.equal(c.getSnapshot().noteId, b); c.update({ body: 'B human edit' }); assert.equal(c.getSnapshot().draft!.body, 'B human edit')
  } finally { c.dispose() }
})
test('M5 P2 an admitted manual AI action owns its readback and blocks a competing open', async () => {
  const action = deferred<unknown>(); let bReads = 0
  const f = fixture((path, input) => {
    if (path === '/notes/job/cancel') return action.promise
    if (path === '/notes/get' && (input as { noteId: string }).noteId === b) bReads++
    return undefined
  }), c = new NotesController(f.call)
  try {
    await c.open(a); const cancelling = c.job('b'.repeat(64), 'cancel'); await tick()
    assert.equal(await c.open(b), false); assert.equal(bReads, 0)
    action.resolve({ ok: true, job: {} }); assert.equal(await cancelling, true)
    assert.equal(c.getSnapshot().noteId, a); assert.equal(c.getSnapshot().operation, false)
    c.update({ body: 'kept after AI action' }); assert.equal(await c.saveEdits(), true); assert.equal(f.rows.get(a)!.current.body, 'kept after AI action')
  } finally { c.dispose() }
})
test('M5 P2 pending open also blocks old trash, conflict selection and resolution paths', async () => {
  const loadingB = deferred<unknown>(), conflicted = note(); conflicted.heads.push('b'.repeat(64)); let mutations = 0
  const f = fixture((path, input) => {
    if (path === '/notes/get') return (input as { noteId: string }).noteId === b ? loadingB.promise : Promise.resolve({ ok: true, note: conflicted })
    if (path === '/notes/trash' || path === '/notes/save') { mutations++; return Promise.resolve({ ok: true, note: note() }) }
    return undefined
  }), c = new NotesController(f.call)
  try {
    await c.open(a); const opening = c.open(b); await tick()
    assert.equal(await c.changeStatus(true), false); assert.equal(await c.resolve(), false)
    c.chooseRevision(note(a, 'chosen stale revision').current)
    assert.equal(c.getSnapshot().draft!.body, 'original'); assert.equal(c.getSnapshot().loadingNote, true); assert.equal(mutations, 0)
    loadingB.resolve({ ok: true, note: note(b) }); assert.equal(await opening, true)
  } finally { c.dispose() }
})

// Pull readback uses the same opted-in refresh entry as NotesPage.
const refreshAfterSync = (controller: NotesController): Promise<void> => controller.refresh(true, true)
test('M6 fix1 pull refreshes the selected note after settings with no AI tasks', async () => {
  const f = fixture(), c = new NotesController(f.call)
  try {
    await c.open(a); await c.navigate('settings')
    const updated = saved({ noteId: a, expectedHeads: note().heads, content: content('pulled remote edit') }); f.rows.set(a, updated)
    await c.navigate('notes'); await refreshAfterSync(c)
    assert.equal(c.getSnapshot().jobs.length, 0)
    assert.equal(c.getSnapshot().draft!.body, 'pulled remote edit')
    assert.deepEqual(c.getSnapshot().note!.heads, updated.heads)
    assert.equal(c.getSnapshot().dirty, false); assert.equal(f.writes.length, 0)
  } finally { c.dispose() }
})

for (const guard of ['dirty', 'composition', 'saving', 'navigation', 'newer-save'] as const) test(`M6 fix1 pull readback preserves ${guard} ownership`, async () => {
  const reading = deferred<unknown>(), writing = deferred<unknown>(); let readStarted = false, getCount = 0, sent: NoteSaveInput | undefined
  const f = fixture((path, input) => {
    if (path === '/notes/get' && (input as { noteId: string }).noteId === a && ++getCount > 1) { readStarted = true; return reading.promise }
    if (path === '/notes/save') { sent = structuredClone(input as NoteSaveInput); return writing.promise }
    return undefined
  }), c = new NotesController(f.call)
  try {
    await c.open(a)
    const pulling = refreshAfterSync(c); await tick()
    assert.equal(readStarted, true, 'sync must actually request selected detail')
    let saving: Promise<boolean> | undefined
    if (guard === 'navigation') await c.open(b)
    else if (guard === 'composition') c.composition(true)
    else {
      c.update({ body: 'human edit' })
      if (guard === 'saving' || guard === 'newer-save') { saving = c.saveEdits(); await tick() }
      if (guard === 'newer-save') { writing.resolve({ ok: true, note: saved(sent!) }); await saving }
    }
    const remote = saved({ noteId: a, expectedHeads: note().heads, content: content('remote edit') })
    reading.resolve({ ok: true, note: remote }); await pulling
    if (guard === 'navigation') { assert.equal(c.getSnapshot().noteId, b); assert.equal(c.getSnapshot().draft!.body, 'second') }
    else if (guard === 'composition') { assert.equal(c.getSnapshot().draft!.body, 'original'); assert.equal(c.getSnapshot().composing, true); assert.equal(c.getSnapshot().conflict, null) }
    else {
      assert.equal(c.getSnapshot().draft!.body, 'human edit')
      if (guard === 'dirty') { assert.equal(c.getSnapshot().dirty, true); assert.equal(c.getSnapshot().conflict, null) }
      if (guard === 'saving') { assert.equal(c.getSnapshot().operation, true); assert.equal(c.getSnapshot().conflict, null); writing.resolve({ ok: true, note: saved(sent!) }); await saving }
      if (guard === 'newer-save') { assert.deepEqual(c.getSnapshot().note!.heads, saved(sent!).heads); assert.equal(c.getSnapshot().conflict, null) }
    }
  } finally { c.dispose(); writing.resolve({ ok: true, note: note() }); reading.resolve({ ok: true, note: note() }) }
})

function memoryStorage(){
  const rows=new Map<string,string>()
  return {getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>{rows.set(k,v)},removeItem:(k:string)=>{rows.delete(k)},rows}
}
test('autosave recovery survives immediate disposal and restores latest text in reading mode',async()=>{
  const f=fixture(),storage=memoryStorage(),options={storage,repository:()=>123,autosaveMs:5000}
  const first=new NotesController(f.call,options)
  await first.open(a);first.beginEdit();first.update({body:'最后一个字',summary:'摘要',tags:['标签']})
  assert.equal(first.needsExitWarning,false);first.dispose();assert.equal(f.writes.length,0)
  const restored=new NotesController(f.call,options)
  try{await restored.initialize(a);assert.equal(restored.getSnapshot().draft!.body,'最后一个字');assert.equal(restored.getSnapshot().editing,false);assert.equal(storage.rows.has('fatfish-notes-recovery:1:123'),false);assert.deepEqual(restored.recentIds(),[a]);assert.equal(f.writes.length,1)}finally{restored.dispose()}
})
test('recovery is isolated by repository and reconciles a lost save receipt',async()=>{
  const f=fixture(),storage=memoryStorage(),options={storage,repository:()=>123}
  const first=new NotesController(f.call,options)
  await first.open(a);first.update({body:'最后修改'});first.dispose()
  const other=new NotesController(f.call,{storage,repository:()=>456})
  try{await other.initialize(a);assert.equal(f.writes.length,0);assert.equal(storage.rows.has('fatfish-notes-recovery:1:123'),true);assert.equal(storage.rows.has('fatfish-notes-recovery:1:456'),false)}finally{other.dispose()}
  const record=JSON.parse(storage.rows.get('fatfish-notes-recovery:1:123')!) as {request:NoteSaveInput}
  f.rows.set(a,saved(record.request))
  const next=new NotesController(f.call,options)
  try{await next.initialize(a);assert.equal(next.getSnapshot().draft!.body,'最后修改');assert.equal(f.writes.length,0);assert.equal(storage.rows.has('fatfish-notes-recovery:1:123'),false);assert.deepEqual(next.recentIds(),[a])}finally{next.dispose()}
})
test('continuous typing is saved within the maximum interval; IME and metadata whitespace are preserved',async()=>{
  const f=fixture(),c=new NotesController(f.call,{autosaveMs:50,maxWaitMs:65})
  try{
    await c.open(a);c.beginEdit()
    for(let i=0;i<6;i++){c.update({body:'typing '+i,title:'title '});await new Promise(r=>setTimeout(r,20))}
    assert.ok(f.checkpoints.length>=1);assert.equal(f.writes.length,0);assert.equal(c.getSnapshot().draft!.title,'title ')
    await c.flush();const count=f.checkpoints.length;c.composition(true);c.update({body:'中文输入'})
    await new Promise(r=>setTimeout(r,90));assert.equal(f.checkpoints.length,count)
    const leaving=c.leave();assert.equal(await leaving,false);c.composition(false)
    await new Promise(r=>setTimeout(r,10));assert.equal(c.getSnapshot().editing,false);assert.equal(f.rows.get(a)!.current.body,'中文输入')
  }finally{c.dispose()}
})
test('a synced clean editor is not replaced by a remote pull, and storage failure warns on exit',async()=>{
  const f=fixture(),c=new NotesController(f.call,{storage:{getItem:()=>null,setItem:()=>{throw Error('quota')},removeItem:()=>{}},repository:()=>123})
  try{
    await c.open(a);c.beginEdit();f.rows.set(a,note(a,'remote'))
    await c.refresh(true,true);assert.equal(c.getSnapshot().draft!.body,'original')
    c.update({body:'my edit'});assert.equal(c.needsExitWarning,true)
    await c.flush();assert.equal(c.needsExitWarning,false)
  }finally{c.dispose()}
})

test('autosave preserves the conflict-copy title and does not create a follow-up revision to strip it',async()=>{
  const f=fixture(path=>path==='/notes/save'?Promise.resolve({ok:true,note:saved({noteId:b,expectedHeads:[],content:{...content('my edit'),title:'Title（冲突版本）'}}),forkedFrom:a}):undefined)
  const c=new NotesController(f.call)
  try{await c.open(a);c.beginEdit();c.update({body:'my edit'});assert.equal(await c.saveEdits(),true);assert.equal(c.getSnapshot().draft!.title,'Title（冲突版本）');assert.equal(c.getSnapshot().dirty,false)}finally{c.dispose()}
})
