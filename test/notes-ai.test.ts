import {revisionContent} from '../src/notes/conflicts.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { CaptureSource, NoteJob, NoteStage } from '../src/contracts/notes.js'
import type { SessionWireEvent } from '@deepseek-ai/dsh-api-session-controller'
import { NoteRepository } from '../src/notes/repository.js'
import { NoteCaptureService } from '../src/notes/capture.js'
import { NoteConversation } from '../src/host/note-conversation.js'
import { NoteEnrichment, type NoteModel } from '../src/notes/enrichment.js'
import { NoteModelBridge, inspectNoteTurns } from '../src/host/note-model.js'
import { planStages, stageResult } from '../src/notes/enrichment-plan.js'
import { fixture, request } from './fixtures/notes-capture.js'
import { canonical, digest } from '../src/notes/validation.js'

const signal = () => new AbortController().signal

test('metadata stages include archived delivery images once and exclude plain file paths',()=>{
  const asset='a'.repeat(64)+'.png'
  const source={messages:[{id:'one',seq:2,turn:1,role:'assistant',blocks:[{type:'text',text:'交付图片'}]}],assets:{},archivedMaterials:[{id:'d1',seq:3,turn:1,kind:'image',assetId:asset},{id:'d2',seq:5,kind:'image',assetId:asset},{id:'file',seq:6,kind:'file',name:'C:/private.txt'}]} as unknown as CaptureSource
  const stages=planStages(source,'a'.repeat(64));assert.deepEqual(stages[0]!.assetIds,[asset]);assert.doesNotMatch(stages[0]!.input,/private/)
  assert.throws(()=>stageResult({title:'标题',summary:'长'.repeat(201),tags:[]},stages[0]!,true))
  assert.throws(()=>stageResult({title:'标题',summary:'第一段\n第二段',tags:[]},stages[0]!,true))
  assert.equal(stageResult({title:'标题',summary:'简短摘要',tags:['资料']},stages[0]!,true).summary,'简短摘要')
})
class Model implements NoteModel {
  calls: Array<{ job: NoteJob; stage: NoteStage; prompt: string }> = []
  active = new Set<string>(); ended = new Set<string>(); fail = false
  async inspect(_session: string, ids: string[]) { return { active: ids.filter(id => this.active.has(id)), ended: ids.filter(id => this.ended.has(id)) } }
  async dispatch(job: NoteJob, stage: NoteStage, prompt: string) { this.calls.push(structuredClone({ job, stage, prompt })); if (this.fail) throw new Error('uncertain admission'); this.active.add(stage.requestId) }
}
async function setup(autoMetadata = true, body?: string, withNotebook = false) {
  const dir = await mkdtemp(join(tmpdir(), 'notes-ai-')), repo = new NoteRepository(dir), f = fixture()
  if (body !== undefined) f.events.splice(0, f.events.length, { type: 'user/message', seq: 0, time: 0, surfaceOp: 'append', data: { id: 'one', source: { kind: 'user' }, content: [{ type: 'text', text: body }] } })
  const notebook = withNotebook ? await repo.saveNotebook({ expectedHeads: [], title: '临时笔记本' }) : null
  const req = { ...request, autoMetadata, notebookId: notebook?.notebookId ?? null }, captured = await new NoteCaptureService(repo, new NoteConversation(() => f.controller)).capture(req)
  const model = new Model(), service = new NoteEnrichment(repo, model), job = await service.ensure(req, captured, signal())
  return { dir, repo, model, service, job, req, captured, notebook, close: () => rm(dir, { recursive: true, force: true }) }
}
const payload = (job: NoteJob, body?: string) => ({ jobId: job.jobId, requestId: job.stages.find(s => s.status !== 'done')!.requestId, sourceId: job.sourceId, baseRevision: job.baseRevision, title: '中文计划', summary: '根据保存素材', tags: ['计划','计划'], ...(body === undefined ? {} : { body }) })

test('M4 independent raw/false does no model work and metadata ignores returned body byte-for-byte', async () => {
  const f = await setup(false)
  try { assert.equal(f.job, null); assert.equal(f.model.calls.length, 0) } finally { await f.close() }
  const g = await setup()
  try {
    const job = await g.service.drive(g.job!.jobId, signal()); await assert.rejects(g.service.submit(payload(job, 'model replacement'), request.sessionId, signal()), {code:'note_schema'}); await g.service.submit(payload(job), request.sessionId, signal())
    const note = await g.repo.get(job.noteId); assert.equal(note.current.body, g.captured.note.current.body); assert.equal(note.current.title, '中文计划'); assert.deepEqual(note.current.tags, ['计划'])
    const source = await g.repo.getSource(job.sourceId); assert.equal(digest(canonical(source)), job.sourceId)
  } finally { await g.close() }
})

test('a pre-MVP body job cannot dispatch or adopt after upgrade', async () => {
  const f = await setup()
  try {
    const retired = {...f.job!, mode:'organize', adoption:f.captured.note.current}
    await f.repo.files.write('jobs/'+retired.jobId+'.json',canonical({job:retired, checksum:digest(canonical(retired))}),false)
    assert.equal((await f.service.drive(retired.jobId,signal())).status,'cancelled')
    assert.equal(f.model.calls.length,0)
    assert.deepEqual((await f.repo.get(retired.noteId)).heads,f.captured.note.heads)
  } finally { await f.close() }
})

test('M4 any intervening human edit retains candidate; explicit adoption checks latest heads', async () => {
  const f = await setup()
  try {
    const job = await f.service.drive(f.job!.jobId, signal()), base = f.captured.note
    const { version: _v, noteId: _n, revision: _r, parents: _p, recordedAt: _t, ...content } = base.current
    const edited = await f.repo.save({ noteId: base.noteId, expectedHeads: base.heads, content: { ...content, title: '人工标题' } })
    await f.service.submit(payload(job), request.sessionId, signal()); assert.equal((await f.service.get(job.jobId)).status, 'candidate'); assert.equal((await f.repo.get(job.noteId)).current.title, '人工标题')
    await assert.rejects(f.service.adopt(job.jobId, base.heads, signal()), { code: 'note_conflict' })
    await f.service.adopt(job.jobId, edited.heads, signal()); assert.equal((await f.repo.get(job.noteId)).current.title, '中文计划')
  } finally { await f.close() }
})

test('M4 rejects wrong session/identity, unknown images, path injection, stale source and changed duplicate', async () => {
  const f = await setup()
  try {
    const job = await f.service.drive(f.job!.jobId, signal()), args = payload(job)
    for (const session of [undefined, 'other-session']) await assert.rejects(f.service.submit(args, session, signal()), { code: 'ai_stale' })
    await assert.rejects(f.service.submit({ ...args, sourceId: '0'.repeat(64) }, request.sessionId, signal()), { code: 'ai_stale' })
    await assert.rejects(f.service.submit({ ...args, repo: 'https://evil.example' }, request.sessionId, signal()), { code: 'note_schema' })
    await assert.rejects(f.service.submit({ ...args, body: '![x](../assets/' + 'a'.repeat(64) + '.png)' }, request.sessionId, signal()), { code: 'note_schema' })
    await assert.rejects(f.service.submit({ ...args, body: '![x](file:///private/secret)' }, request.sessionId, signal()), { code: 'note_schema' })
    await f.service.submit(args, request.sessionId, signal()); const adopted = await f.repo.get(job.noteId)
    await f.service.submit(args, request.sessionId, signal()); assert.deepEqual((await f.repo.get(job.noteId)).heads, adopted.heads)
    await assert.rejects(f.service.submit({ ...args, title: 'changed' }, request.sessionId, signal()), { code: 'ai_duplicate' })
    const { version: _v, noteId: _n, revision: _r, parents: _p, recordedAt: _t, ...content } = adopted.current
    await f.repo.save({ noteId: job.noteId, expectedHeads: adopted.heads, content: { ...content, sourceId: null } })
    await assert.rejects(f.service.submit(args, request.sessionId, signal()), { code: 'source_mismatch' })
  } finally { await f.close() }
})

test('M4 uncertain admission reuses attempt across restart; known ended model failure requires explicit new attempt', async () => {
  const f = await setup()
  try {
    f.model.fail = true; const first = await f.service.drive(f.job!.jobId, signal()), originalId = first.stages[0]!.requestId
    const restarted = new NoteEnrichment(new NoteRepository(f.dir), f.model)
    await restarted.drive(first.jobId, signal()); assert.deepEqual(f.model.calls.map(c => c.stage.requestId), [originalId,originalId])
    f.model.fail = false; f.model.ended.add(originalId)
    assert.equal((await restarted.drive(first.jobId, signal())).status, 'failed'); assert.equal(f.model.calls.length, 2)
    const retry = await restarted.retry(first.jobId, signal()); assert.notEqual(retry.stages[0]!.requestId, originalId); await restarted.drive(first.jobId, signal())
    await assert.rejects(restarted.submit(payload(first), request.sessionId, signal()), { code: 'ai_stale' })
    await restarted.submit(payload(retry), request.sessionId, signal()); assert.equal((await restarted.get(first.jobId)).status, 'completed')
    assert.equal((await f.repo.list()).items.length, 1)
  } finally { await f.close() }
})

test('M4 cancellation is durable, rejects late result and retry supersedes the attempt without cancelling other session work', async () => {
  const f = await setup()
  try {
    const job = await f.service.drive(f.job!.jobId, signal()); await f.service.cancel(job.jobId)
    const restarted = new NoteEnrichment(new NoteRepository(f.dir), f.model)
    assert.equal((await restarted.drive(job.jobId, signal())).status, 'cancelled'); assert.equal(f.model.calls.length, 1)
    await assert.rejects(restarted.submit(payload(job), request.sessionId, signal()), { code: 'ai_stale' })
    const retry = await restarted.retry(job.jobId, signal()); assert.notEqual(retry.stages[0]!.requestId, job.stages[0]!.requestId)
    await restarted.drive(job.jobId, signal()); await restarted.submit(payload(retry), request.sessionId, signal())
    assert.equal((await restarted.get(job.jobId)).status, 'completed')
  } finally { await f.close() }
})

test('M4 multi-stage restart keeps completed segment and final aggregation uses saved segment summaries', async () => {
  const f = await setup(true, ['first '.repeat(3000), 'second '.repeat(3000), 'third '.repeat(3000)].join('\n\n'))
  try {
    let job = await f.service.drive(f.job!.jobId, signal()); assert.equal(job.stages.length, 4)
    await f.service.submit(payload(job), request.sessionId, signal())
    const restarted = new NoteEnrichment(new NoteRepository(f.dir), f.model)
    for (let i = 1; i < 4; i++) { job = await restarted.drive(job.jobId, signal()); await restarted.submit(payload(job), request.sessionId, signal()) }
    assert.equal(f.model.calls.length, 4); assert.match(f.model.calls[3]!.prompt, /根据保存素材/); assert.ok(!f.model.calls[3]!.prompt.includes('first first'))
    assert.equal((await f.repo.get(job.noteId)).current.body, f.captured.note.current.body)
  } finally { await f.close() }
})

test('M4 budget failures preserve the complete saved original and do not dispatch', async () => {
  const body = '```text\n' + 'x'.repeat(33_000) + '\n```', f = await setup(true, body)
  try { assert.equal(f.job!.status, 'failed'); assert.equal(f.job!.error, 'ai_budget'); assert.ok(f.captured.note.current.body.includes(body)); await f.service.drive(f.job!.jobId, signal()); assert.equal(f.model.calls.length, 0) } finally { await f.close() }
  const source = { messages: Array.from({ length: 33 }, (_,i) => ({ id: String(i), seq: i, role: 'user', blocks: [{ type: 'text', text: 'x'.repeat(31_999) }] })), assets: {} } as CaptureSource
  assert.throws(() => planStages(source, 'a'.repeat(64)), { code: 'ai_budget' })
})

test('M4 official turn fold identifies consumed no-step failure and queued cancellation without misattributing another turn', () => {
  const events: SessionWireEvent[] = [], add = (type: string, data: unknown) => events.push({ type, seq: events.length, time: 0, data: data as never })
  add('agent/inbox/spliced', { target: 'next-turn', start: 0, inserted: [{ source: { kind: 'user', rpcId: 'n1' } },{ source: { kind: 'user', rpcId: 'n2' } }] })
  add('turn/start', { turn: 1 }); add('agent/inbox/spliced', { target: 'next-turn', start: 0, removedCount: 1, inserted: [] }); add('turn/end', { turn: 1, reason: 'error' })
  add('agent/inbox/spliced', { target: 'next-turn', start: 0, removedCount: 1, inserted: [], outcome: 'canceled' })
  add('turn/start', { turn: 2 }); add('user/message', { source: { kind: 'user', rpcId: 'other' } })
  assert.deepEqual(inspectNoteTurns(events, ['n1','n2']), { active: [], ended: ['n1','n2'] })
  add('user/message', { source: { kind: 'user', rpcId: 'n3' } }); assert.deepEqual(inspectNoteTurns(events, ['n3']), { active: ['n3'], ended: [] })
})

test('auxiliary image metadata uses frozen bytes, the selected model and no conversation prompt', async () => {
  const f=await setup()
  try {
    const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5xkAAAAASUVORK5CYII=','base64'),asset=await f.repo.putAsset(bytes,'image/png'),received:unknown[]=[],images:unknown[]=[]
    const controller={...fixture().controller,async *follow(){yield {type:'snapshot',header:{id:request.sessionId},projections:{values:{modelSelection:{next:{provider:'chosen',model:'vision'}}}}}},prompt(){assert.fail('must not write conversation')}}
    const llm={async prepareCall(config:unknown){return {config,async *stream(options:unknown){received.push(options);yield {type:'text-delta',text:JSON.stringify({title:'观测记录',summary:'保留图文观测资料，便于下次继续整理。',tags:['观测']})};yield {type:'finish',reason:{kind:'stop'}}}}}}
    const attachments={imageLimits:{maxImagesPerMessage:2,maxImageBytes:1000,maxMessageImageBytes:2000,mediaTypes:['image/png']},async saveImage(input:unknown){images.push(input);return {attachmentId:'frozen'}}}
    const bridge=new NoteModelBridge(()=>controller as never,f.repo,{llm:()=>llm as never,attachments:()=>attachments as never}),stage={...f.job!.stages[0]!,assetIds:[asset.id]}
    const result=await bridge.dispatch(f.job!,stage,'source',signal());assert.equal(result.title,'观测记录')
    const req=received[0] as any;assert.equal(req.provider,'chosen');assert.equal(req.model,'vision');assert.deepEqual(req.tools,[]);assert.equal(req.purpose,'fatfish-notes-metadata');assert.equal(req.messages[0].content[1].attachment.attachmentId,'frozen');assert.deepEqual((images[0] as any).data,bytes)
    await assert.rejects(bridge.dispatch(f.job!,{...stage,assetIds:[asset.id,asset.id,asset.id]},'',signal()),{code:'ai_image_budget'});assert.equal(received.length,1)
  }finally{await f.close()}
})

test('auxiliary jobs are nonblocking, preserve human edits and never resume old prompt jobs',async()=>{
  const f=await setup(false);let resolve!:(v:any)=>void
  const service=new NoteEnrichment(f.repo,{auxiliary:true,inspect:async()=>({active:[],ended:[]}),dispatch:(_j,_s,_p,active)=>new Promise((r,reject)=>{resolve=r;active.addEventListener('abort',()=>reject(active.reason),{once:true})})})
  try{
    const job=(await service.ensure({...f.req,autoMetadata:true},f.captured,signal()))!;await service.drive(job.jobId,signal())
    assert.equal((await service.get(job.jobId)).status,'running')
    const edited=await f.repo.save({noteId:job.noteId,expectedHeads:f.captured.note.heads,content:{...revisionContent(f.captured.note.current),title:'手工改名'}})
    resolve({title:'AI建议',summary:'一段简短摘要。',tags:['资料']});await service.drain()
    assert.equal((await service.get(job.jobId)).status,'candidate');assert.equal((await f.repo.get(job.noteId)).current.title,edited.current.title)
    const {transport:_transport,...old}=job;await f.repo.files.write(`jobs/${job.jobId}.json`,canonical({job:old,checksum:digest(canonical(old))}),false)
    assert.equal((await service.drive(job.jobId,signal())).status,'cancelled')
  }finally{await service.close();await f.close()}
})

test('auxiliary formatting correction is bounded and cancellation preserves the saved original',async()=>{
 const f=await setup(false);let calls=0
 const controller={...fixture().controller,async *follow(){yield {type:'snapshot',header:{id:request.sessionId},projections:{values:{modelSelection:{next:{provider:'p',model:'m'}}}}}}}
 const llm={async prepareCall(){return {config:{},async *stream(){calls++;yield {type:'text-delta',text:JSON.stringify({title:'建议',summary:'过长'.repeat(201),tags:[]})};yield {type:'finish',reason:{kind:'stop'}}}}}}
 const bridge=new NoteModelBridge(()=>controller as never,f.repo,{llm:()=>llm as never})
 const service=new NoteEnrichment(f.repo,{auxiliary:true,inspect:async()=>({active:[],ended:[]}),dispatch:(_j,_s,_p,active)=>new Promise((_resolve,reject)=>active.addEventListener('abort',()=>reject(active.reason),{once:true}))})
 try{
   const stages=planStages(await f.repo.getSource(f.captured.sourceId) as unknown as CaptureSource, 'a'.repeat(64))
   await assert.rejects(bridge.dispatch({sessionId:request.sessionId} as NoteJob,stages[0]!,'',signal()),{code:'ai_no_candidate'});assert.equal(calls,2)
   const job=(await service.ensure({...f.req,autoMetadata:true},f.captured,signal()))!;await service.drive(job.jobId,signal());await service.cancel(job.jobId);await service.drain()
   assert.equal((await service.get(job.jobId)).status,'cancelled');assert.equal((await f.repo.get(job.noteId)).current.body,f.captured.note.current.body)
 }finally{await service.close();await f.close()}
})

test('M4 unknown/corrupt job journals fail closed and preserve bytes', async () => {
  const f = await setup()
  try {
    const job = f.job!, changed = { ...job, version: 2 }, raw = canonical({ job: changed, checksum: digest(canonical(changed)) })
    await f.repo.files.write(`jobs/${job.jobId}.json`, raw, false)
    await assert.rejects(f.service.drive(job.jobId, signal()), { code: 'note_version' }); assert.equal((await f.repo.files.read(`jobs/${job.jobId}.json`)).toString(), raw); assert.equal(f.model.calls.length, 0)
  } finally { await f.close() }
})

test('M4 adopted revision survives interrupted projection/receipt and is not duplicated after restart', async () => {
  const f = await setup()
  try {
    let fail = true
    const repository = new NoteRepository(f.dir, { beforeWrite: path => { if (fail && path.startsWith('documents/')) { fail = false; throw new Error('power interrupted after revision') } } })
    const service = new NoteEnrichment(repository, f.model), job = await service.drive(f.job!.jobId, signal())
    await assert.rejects(service.submit(payload(job), request.sessionId, signal()), /power interrupted/)
    const journal = await service.get(job.jobId); assert.ok(journal.adoption); assert.equal(journal.status, 'running')
    const restarted = new NoteEnrichment(new NoteRepository(f.dir), f.model)
    assert.equal((await restarted.drive(job.jobId, signal())).status, 'completed')
    const saved = await f.repo.get(job.noteId); assert.equal(saved.current.revision, journal.adoption.revision)
    assert.equal((await f.repo.files.scan()).paths.filter(p => p.startsWith('revisions/')).length, 2)
    await restarted.drive(job.jobId, signal()); assert.equal(f.model.calls.length, 1)
  } finally { await f.close() }
})

test('M4 cancel aborts only the owned admission wait, then durably stops the job', async () => {
  const f = await setup()
  try {
    let entered!: () => void; const waiting = new Promise<void>(resolve => { entered = resolve })
    const model: NoteModel = { inspect: async () => ({ active: [], ended: [] }), dispatch: async (_job,_stage,_prompt,active) => { entered(); await new Promise<void>((_resolve,reject) => active.addEventListener('abort', () => reject(active.reason), { once: true })) } }
    const service = new NoteEnrichment(f.repo, model), running = service.drive(f.job!.jobId, signal()); void running.catch(() => {})
    await waiting; const cancelled = await service.cancel(f.job!.jobId); await assert.rejects(running); assert.equal(cancelled.status, 'cancelled')
    assert.equal((await new NoteEnrichment(new NoteRepository(f.dir), f.model).get(cancelled.jobId)).status, 'cancelled')
  } finally { await f.close() }
})

for (const timing of ['before-candidate','during-adoption'] as const) test(`M4 P2 normalized adoption identity survives notebook removal ${timing} and post-revision failure`, async () => {
  const f = await setup(true, undefined, true)
  try {
    let deleted = false, fault = true
    const removeNotebook = async () => { await f.repo.deleteNotebook(f.notebook!.notebookId, f.notebook!.heads); deleted = true }
    if (timing === 'before-candidate') await removeNotebook()
    const repository = new NoteRepository(f.dir, { beforeWrite: async path => {
      if (fault && path.startsWith('documents/')) { fault = false; throw new Error('post-revision failure') }
    } })
    const get = repository.get.bind(repository); let reads = 0
    repository.get = async (...args) => {
      const view = await get(...args)
      // Callback validation, finish check, then adoption's last view. Removing
      // the notebook after that snapshot must still be normalized atomically.
      if (++reads === 3 && !deleted) await removeNotebook()
      return view
    }
    const service = new NoteEnrichment(repository, f.model), job = await service.drive(f.job!.jobId, signal())
    const candidate = await service.submit(payload(job), request.sessionId, signal())
    assert.equal(candidate.status, 'candidate'); assert.equal(deleted, true)
    await assert.rejects(service.adopt(job.jobId, (await f.repo.get(job.noteId)).heads, signal()), /post-revision failure/)
    const journal = await service.get(job.jobId), actual = await f.repo.get(job.noteId)
    assert.ok(journal.adoption); assert.equal(journal.adoption.revision, actual.current.revision)
    assert.equal(journal.adoption.notebookId, (await f.repo.listNotebooks()).find(b => b.isDefault)!.notebookId)
    const restarted = new NoteEnrichment(new NoteRepository(f.dir), f.model)
    assert.equal((await restarted.drive(job.jobId, signal())).status, 'completed')
    assert.equal((await f.repo.files.scan()).paths.filter(p => p.startsWith('revisions/')).length, 3)
    assert.equal((await f.repo.get(job.noteId)).current.revision, journal.adoption.revision)
  } finally { await f.close() }
})

test('M4 P2 cancellation prevents an already queued second drive from admitting work or delaying cancellation', async () => {
  const f = await setup(), cleanup = new AbortController()
  let entered!: () => void, dispatches = 0, afterCancel = false, cancelRequested = false
  const firstEntered = new Promise<void>(resolve => { entered = resolve })
  const model: NoteModel = { inspect: async () => ({ active: [], ended: [] }), dispatch: async (_job,_stage,_prompt,active) => {
    dispatches++; if (cancelRequested) afterCancel = true
    if (dispatches === 1) entered()
    await new Promise<void>((_resolve,reject) => active.addEventListener('abort', () => reject(active.reason), {once:true}))
  } }
  const service = new NoteEnrichment(f.repo, model), first = service.drive(f.job!.jobId, cleanup.signal)
  void first.catch(() => {}); await firstEntered
  const second = service.drive(f.job!.jobId, cleanup.signal); void second.catch(() => {})
  const staleRetry = service.retry(f.job!.jobId, cleanup.signal); void staleRetry.catch(() => {})
  cancelRequested = true; const cancelled = service.cancel(f.job!.jobId)
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const done = await Promise.race([cancelled.then(() => true), new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(false), 500) })])
    assert.equal(done, true, 'cancel must complete without another pending admission')
    assert.equal(dispatches, 1); assert.equal(afterCancel, false)
    assert.equal((await cancelled).status, 'cancelled')
    await assert.rejects(staleRetry, {code:'ai_stale'})
    await assert.rejects(service.submit(payload(f.job!), request.sessionId, signal()), {code:'ai_stale'})
    assert.equal((await new NoteEnrichment(new NoteRepository(f.dir), f.model).get(f.job!.jobId)).status, 'cancelled')
    const retry = await service.retry(f.job!.jobId, signal()); assert.equal(retry.status, 'running'); assert.equal(retry.stages[0]!.attempt, 2)
    await service.cancel(f.job!.jobId)
  } finally { if (timer) clearTimeout(timer); cleanup.abort(); await Promise.allSettled([first,second,staleRetry,cancelled]); await f.close() }
})
