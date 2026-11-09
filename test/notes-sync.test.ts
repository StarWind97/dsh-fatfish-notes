import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'
import { createGitBackend, runGit, type GitRunner } from '../src/git/backend.js'
import { PrivateWorkspaceSync as PersonalSync } from '../src/private-workspace/sync.js'
import { NoteRepository } from '../src/notes/repository.js'
import { canonical, digest } from '../src/notes/validation.js'
import { NotebookError } from '../src/domain/errors.js'
import type { GitHubGateway, GitHubRepository } from '../src/onboarding/types.js'
import type { NoteContent, NoteView } from '../src/contracts/notes.js'
const content = (body: string): NoteContent => ({ title: body.slice(0, 20), body, summary: '', tags: [], notebookId: null, status: 'active', sourceId: null, assetIds: [] })
const change = (note: NoteView, body: string) => { const { revision: _r, version: _v, noteId: _id, parents: _p, recordedAt: _t, ...content } = note.current; return { noteId: note.noteId, expectedHeads: note.heads, content: { ...content, body } } }
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=', 'base64')
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'notes-sync-')), remote = join(dir, 'remote.git')
  await runGit(['init', '--bare', '--initial-branch=main', remote])
  const account = { login: 'Alice', id: 123 }
  let repository: GitHubRepository | null = null, runner: GitRunner = runGit
  const gateway: GitHubGateway = { available: async () => true, account: async () => account, repository: async () => repository, createPrivate: async () => repository = { id: 456, owner: 'Alice', ownerId: 123, name: 'private-data', visibility: 'private' } }
  const services: PersonalSync[] = []
  const backend = createGitBackend({ rootDir: join(dir, 'external'), remote: pathToFileURL(remote).href, allowLocal: true })
  async function instance(name: string, batchMs = 30000, retryMs?: number[]) {
    const root = join(dir, name), notes = new NoteRepository(root)
    const sync = new PersonalSync({ dir: root, notes, gateway, remoteForTest: () => pathToFileURL(remote).href, gitRunner: (a, o) => runner(a, o), batchMs, ...(retryMs?{retryMs}:{}) })
    await sync.load(); services.push(sync)
    return { root, notes, sync }
  }
  async function connect(sync: PersonalSync) { const p = await sync.preview({ repo: 'private-data', mode:repository?'existing':'create' }); await sync.connect({ previewId: p.preview.id, confirmPrivate: true }) }
  async function edit(files: Map<string, string | Uint8Array | null>) { await backend.exclusive(async () => { const snapshot = await backend.snapshot(); const commit = await backend.commit(snapshot, { files }, randomUUID()); await backend.push(commit, snapshot.revision) }) }
  const show = async (path: string) => (await runGit(['--git-dir', remote, 'show', `main:${path}`])).stdout
  return { dir, remote, gateway, account, backend, instance, connect, edit, show, set runner(value: GitRunner) { runner = value }, get repository() { return repository }, set repository(value: GitHubRepository | null) { repository = value }, async close() { await Promise.all(services.map(s => s.close())); await rm(dir, { recursive: true, force: true }) } }
}

test('permanent deletion and shared ordinary attachments converge with stale offline edits', async () => {
  const f = await fixture()
  try {
    const a = await f.instance('purge-a'); await f.connect(a.sync)
    const attachment = await a.notes.putAttachment(Buffer.from('pdf-or-video'), '附件.mp4')
    const first = await a.notes.save({ expectedHeads: [], content: { ...content('第一篇'), attachments: [attachment] } })
    const second = await a.notes.save({ expectedHeads: [], content: { ...content('第二篇'), attachments: [attachment] } })
    await a.sync.sync()
    const b = await f.instance('purge-b'); await f.connect(b.sync)
    assert.deepEqual(await b.notes.getAttachment(attachment.id), Buffer.from('pdf-or-video'))
    await b.notes.save(change(await b.notes.get(first.noteId), '离线编辑旧笔记'))
    const trashed = await a.notes.trash(first.noteId, first.heads)
    await a.notes.batch([{ noteId:first.noteId, expectedHeads:trashed.heads }], 'purge')
    await a.sync.sync(); await b.sync.sync(); await a.sync.sync()
    assert.deepEqual((await b.notes.list()).items.map(n=>n.noteId), [second.noteId])
    await assert.rejects(b.notes.get(first.noteId))
    assert.deepEqual(await b.notes.getAttachment(attachment.id), Buffer.from('pdf-or-video'))
    await assert.rejects(f.show(`notes/documents/${first.noteId}.md`))
    const last = await b.notes.trash(second.noteId, (await b.notes.get(second.noteId)).heads)
    await b.notes.batch([{noteId:last.noteId,expectedHeads:last.heads}], 'purge')
    await b.sync.sync(); await a.sync.sync()
    await assert.rejects(a.notes.getAttachment(attachment.id))
    await assert.rejects(f.show(`notes/attachments/${attachment.id}.bin`))
    assert.equal((await a.notes.list({status:'all'})).items.length, 0)
  } finally { await f.close() }
})

test('default notebook, chosen destination and notebook removal synchronize across real clones', async () => {
  const f = await fixture()
  try {
    const a = await f.instance('default-a'); await f.connect(a.sync)
    const seed = (await a.notes.listNotebooks()).find(b => b.isDefault)!
    const book = await a.notes.saveNotebook({ title: '工作资料', expectedHeads: [], makeDefault: true })
    const note = await a.notes.save({ expectedHeads: [], content: content('跨端保留的正文') })
    await a.sync.sync()
    const b = await f.instance('default-b'); await f.connect(b.sync)
    assert.equal((await b.notes.listNotebooks()).find(b => b.isDefault)?.notebookId, book.notebookId)
    assert.equal((await b.notes.listNotebooks()).length, 2)
    assert.equal((await b.notes.get(note.noteId)).current.notebookId, book.notebookId)
    await a.notes.saveNotebook({ notebookId: seed.notebookId, title: '收件箱', expectedHeads: seed.heads, makeDefault: true })
    await a.sync.sync(); await b.sync.sync()
    await b.notes.deleteNotebook(book.notebookId, (await b.notes.listNotebooks()).find(v => v.notebookId === book.notebookId)!.heads, undefined, { removal: 'trash', expectedNoteCount: 1 })
    await b.sync.sync(); await a.sync.sync()
    const trashed = await a.notes.get(note.noteId)
    assert.equal(trashed.current.status, 'trashed'); assert.equal(trashed.current.notebookId, seed.notebookId)
    await a.notes.restore(note.noteId, trashed.heads); await a.sync.sync(); await b.sync.sync()
    assert.equal((await b.notes.get(note.noteId)).current.status, 'active')
    assert.equal((await b.notes.listNotebooks()).find(v => v.isDefault)?.current.title, '收件箱')
    const before = await f.show('notes/manifest.json')
    await b.sync.sync(); assert.equal(await f.show('notes/manifest.json'), before)
  } finally { await f.close() }
})

test('two real clones merge independent notes, binary/source objects, concurrent edits, trash and external Markdown', async () => {
  const f = await fixture()
  try {
    const a = await f.instance('a'); await f.connect(a.sync)
    const asset = await a.notes.putAsset(png, 'image/png'), sourceId = await a.notes.putSource({ text: 'original', assets: { image: asset.id } })
    const note = await a.notes.save({ expectedHeads: [], content: { ...content(`![x](../assets/${asset.id})`), sourceId, assetIds: [asset.id] } })
    await a.sync.sync()
    const b = await f.instance('b'); await f.connect(b.sync)
    assert.equal((await b.notes.list()).items.length, 1)
    await b.sync.sync()
    assert.deepEqual(await b.notes.getAsset(asset.id), png)
    assert.deepEqual(await b.notes.getSource(sourceId), { text: 'original', assets: { image: asset.id } })
    await a.notes.save({ expectedHeads: [], content: content('independent A') })
    await b.notes.save({ expectedHeads: [], content: content('independent B') })
    await a.notes.save(change(await a.notes.get(note.noteId), 'edit A'))
    await b.notes.save(change(await b.notes.get(note.noteId), 'edit B'))
    await a.sync.sync(); await b.sync.sync(); await a.sync.sync()
    const rows=(await a.notes.list()).items
    assert.equal(rows.length,4)
    const siblings=rows.filter(row=>row.title.includes('冲突版本'))
    assert.equal(siblings.length,2)
    const first=await a.notes.get(siblings[0]!.noteId), second=await a.notes.get(siblings[1]!.noteId)
    assert.deepEqual([first.current.body,second.current.body].sort(),['edit A','edit B'])
    assert.equal(first.heads.length,1);assert.equal(second.heads.length,1)
    await a.notes.save(change(first,'edited independent copy'));await a.sync.sync();await b.sync.sync()
    assert.equal((await b.notes.list()).items.length,4)
    assert.equal((await b.notes.get(second.noteId)).current.body,second.current.body)
    const original=await a.notes.get(note.noteId)
    await a.notes.save(change(original,'resolved'));await a.sync.sync();await b.sync.sync()
    const localPath = join(a.notes.files.root, `documents/${note.noteId}.md`)
    await writeFile(localPath, (await readFile(localPath, 'utf8')).replace(/resolved$/, 'local file edit'))
    await a.sync.sync(); await b.sync.sync()
    assert.equal((await b.notes.get(note.noteId)).current.body, 'local file edit')
    const path = `notes/documents/${note.noteId}.md`, markdown = await f.show(path)
    await f.edit(new Map([[path, markdown.replace(/local file edit$/, 'external edit')]]))
    await a.notes.save(change(await a.notes.get(note.noteId), 'local concurrent'))
    await a.sync.sync(); await b.sync.sync()
    assert.equal((await b.notes.get(note.noteId)).heads.length, 1)
    assert.deepEqual((await a.notes.exportObjects()).revisions, (await b.notes.exportObjects()).revisions)
    const tree = (await runGit(['--git-dir', f.remote, 'ls-tree', '-r', '--name-only', 'main'])).stdout.split('\n')
    assert.equal(tree.filter(p => p === `notes/assets/${asset.id}`).length, 1)
    assert.equal(tree.some(p => /notes\/(captures|jobs|quarantine)\//.test(p)), false)
    const before = (await runGit(['--git-dir', f.remote, 'rev-parse', 'main'])).stdout
    await a.sync.sync(); assert.equal((await runGit(['--git-dir', f.remote, 'rev-parse', 'main'])).stdout, before)
  } finally { await f.close() }
})

test('a lost push race retries against the new tip before installing any speculative fork',async()=>{
  const f=await fixture()
  try{
    const a=await f.instance('race-a'),b=await f.instance('race-b');await f.connect(a.sync)
    const original=await a.notes.save({expectedHeads:[],content:content('base')});await a.sync.sync();await f.connect(b.sync)
    const a1=await a.notes.save(change(original,'A1'));await a.sync.sync()
    await b.notes.save(change(original,'B'))
    let raced=false
    f.runner=async(args,options)=>{
      if(args[0]==='push'&&!raced){
        raced=true;await a.notes.save(change(a1,'A2'));await a.sync.sync()
      }
      return runGit(args,options)
    }
    await b.sync.sync();await a.sync.sync();await b.sync.sync()
    assert.ok(raced)
    for(const repo of [a.notes,b.notes]){
      const items=(await repo.list()).items
      assert.deepEqual((await Promise.all(items.map(async n=>(await repo.get(n.noteId)).current.body))).sort(),['A2','B'])
    }
  }finally{await f.close()}
})

test('lost push receipt reconciles identities and edits during a blocked push stay pending without blocking local saves', async () => {
  const f = await fixture()
  try {
    const a = await f.instance('a'); await f.connect(a.sync); await a.sync.sync()
    let release!: () => void, entered!: () => void
    const gate = new Promise<void>(resolve => release = resolve), waiting = new Promise<void>(resolve => entered = resolve)
    f.runner = async (args, options) => { if (args[0] === 'push') { entered(); await gate } return runGit(args, options) }
    const note = await a.notes.save({ expectedHeads: [], content: content('sent') }), pending = a.sync.sync()
    await waiting
    try { await a.notes.save(change(note, 'changed during flight')) } finally { release() }
    await pending
    assert.equal(a.sync.state().notesPending, true)
    let lost = false, pushes = 0
    f.runner = async (args, options) => { const result = await runGit(args, options); if (args[0] === 'push') { pushes++; if (!lost) { lost = true; throw new NotebookError('git_failed', 'lost receipt', 502) } } return result }
    await a.sync.sync(); assert.equal(pushes, 1); assert.equal(a.sync.state().notesPending, false)
    assert.match(await f.show(`notes/documents/${note.noteId}.md`), /changed during flight/)
    f.runner = async (args, options) => { if (args[0] === 'push') throw new NotebookError('git_failed', 'offline', 502); return runGit(args, options) }
    await a.notes.save({ expectedHeads: [], content: content('saved offline') })
    await assert.rejects(a.sync.sync(), { code: 'git_failed' }); assert.equal(a.sync.state().status, 'error')
    assert.equal(a.sync.state().lastFailure?.code,'git_failed')
    assert.ok(Number.isFinite(Date.parse(a.sync.state().lastFailure!.at)))
    assert.equal((await a.notes.list()).items.length, 2)
    f.runner = runGit; await a.sync.sync(); assert.equal(a.sync.state().notesPending, false)
  } finally { await f.close() }
})

test('unsupported format, identity and integrity failures never overwrite notes', async () => {
  const f = await fixture()
  try {
    const a = await f.instance('a'); await f.connect(a.sync); await a.sync.sync()
    const note = await a.notes.save({ expectedHeads: [], content: content('safe') }); await a.sync.sync()
    const original = await f.show('notebook.json'), unsupported = JSON.parse(original); unsupported.modules.notes = 99
    await f.edit(new Map([['notebook.json', JSON.stringify(unsupported)]]))
    await assert.rejects(a.sync.sync(), { code: 'note_version' })
    assert.equal(a.sync.state().status, 'paused')
    await a.sync.close(); const restarted = await f.instance('a'); assert.equal(restarted.sync.state().errorCode, 'note_version')
    await f.edit(new Map([['notebook.json', original]])); await restarted.sync.sync()
    const before = (await runGit(['--git-dir', f.remote, 'rev-parse', 'main'])).stdout
    f.repository = { ...f.repository!, visibility: 'public' }; await assert.rejects(restarted.sync.sync(), { code: 'personal_repository_public' })
    f.repository = { ...f.repository!, visibility: 'private' }; f.account.id = 321; await assert.rejects(restarted.sync.sync(), { code: 'personal_account_changed' }); f.account.id = 123
    f.gateway.account = async () => { throw new NotebookError('personal_auth_required', 'login expired') }; await assert.rejects(restarted.sync.sync(), { code: 'personal_auth_required' }); f.gateway.account = async () => f.account
    assert.equal((await runGit(['--git-dir', f.remote, 'rev-parse', 'main'])).stdout, before)
    await f.edit(new Map([[`notes/revisions/${note.noteId}/${note.current.revision}.json`, '{}']]))
    await assert.rejects(restarted.sync.sync(), { code: 'note_sync_invalid' })
    assert.equal((await restarted.notes.get(note.noteId)).current.body, 'safe')
    assert.equal(await f.show(`notes/revisions/${note.noteId}/${note.current.revision}.json`), '{}')
  } finally { await f.close() }
})

test('bounded real Git binary reads preserve invalid UTF8 bytes and sources over the old 16 MiB cap', async () => {
  const f = await fixture()
  try {
    const a = await f.instance('a'); await f.connect(a.sync)
    const source = { text: 'x'.repeat(16 * 1024 * 1024 + 8), assets: {} }, sourceId = await a.notes.putSource(source)
    await a.notes.save({ expectedHeads: [], content: { ...content('large source'), sourceId } }); await a.sync.sync()
    const b = await f.instance('b'); await f.connect(b.sync); await b.sync.sync()
    assert.equal(digest(canonical(await b.notes.getSource(sourceId))), sourceId)
    const bytes = Buffer.from([0, 255, 128, 254, 0, 13, 10]); await f.edit(new Map([['opaque.bin', bytes]]))
    await f.backend.exclusive(async () => {
      const snapshot = await f.backend.snapshot()
      assert.deepEqual(await f.backend.readBytes(snapshot, 'opaque.bin', bytes.length), bytes)
      await assert.rejects(f.backend.readBytes(snapshot, 'opaque.bin', bytes.length - 1), { code: 'note_limit' })
    })
  } finally { await f.close() }
})
test('setup requires explicit repository intent and refuses ordinary private repositories without writing',async()=>{
  const f=await fixture()
  try{
    const a=await f.instance('a'), name={repo:'private-data'}
    await assert.rejects(a.sync.preview(name),{code:'invalid_request'})
    await assert.rejects(a.sync.preview({...name,mode:'existing'}),{code:'notebook_repo_missing'})
    const p=await a.sync.preview({...name,mode:'create'})
    f.repository={id:456,name:'private-data',owner:'Alice',ownerId:123,visibility:'private'}
    await assert.rejects(a.sync.connect({previewId:p.preview.id,confirmPrivate:true}),{code:'notebook_repo_exists'})
    await assert.rejects(a.sync.preview({...name,mode:'existing'}),{code:'personal_repository_unrelated'})
    await f.edit(new Map([['README.md','ordinary data']]))
    const tip=async()=>(await runGit(['--git-dir',f.remote,'rev-parse','main'])).stdout, initial=await tip()
    await assert.rejects(a.sync.preview({...name,mode:'create'}),{code:'notebook_repo_exists'})
    await assert.rejects(a.sync.preview({...name,mode:'existing'}),{code:'personal_repository_unrelated'})
    assert.equal(await tip(),initial);assert.equal(a.sync.state().ready,false)
    assert.equal(await f.show('README.md'),'ordinary data')
  }finally{await f.close()}
})

test('fresh folder excludes old unbound documents and offline saves retry automatically after restarting',async()=>{
  const f=await fixture()
  try{
    const initial=await f.instance('first'), folder=join(f.dir,'我的笔记','private-data'), mode='create',repo='private-data'
    const legacy=await initial.notes.save({expectedHeads:[],content:content('before upgrade')})
    await assert.rejects(initial.sync.preview({repo,mode,folder:f.dir}),{code:'notebook_folder_invalid'})
    await assert.rejects(initial.sync.preview({repo,mode,folder:f.remote}),{code:'notebook_folder_invalid'})
    const p=await initial.sync.preview({repo,mode,folder})
    await initial.sync.connect({previewId:p.preview.id,confirmPrivate:true});assert.equal(initial.sync.ready,true)
    assert.equal(initial.notes.files.root,join(folder,'notes'))
    assert.match(await readFile(join(initial.root,'notes','documents',legacy.noteId+'.md'),'utf8'),/before upgrade/)
    assert.equal((await initial.notes.list()).items.length,0)
    const asset=await initial.notes.putAsset(png,'image/png')
    f.runner=async(args,options)=>{if(args.includes('ls-remote'))throw new NotebookError('git_failed','offline',502);return runGit(args,options)}
    const offline=await initial.notes.save({expectedHeads:[],content:{...content('saved offline'),assetIds:[asset.id]}})
    await assert.rejects(initial.sync.sync(),{code:'git_failed'})
    assert.equal(initial.sync.state().ready,true);assert.equal(initial.sync.state().pending,true)
    await initial.sync.close()
    const b=await f.instance('first',30,[40])
    assert.equal(b.sync.ready,true);assert.equal(b.sync.state().folder,folder)
    assert.equal((await b.notes.get(offline.noteId)).current.body,'saved offline')
    assert.deepEqual(await readFile(join(folder,'notes','assets',asset.id)),png)
    const until=async(check:()=>boolean)=>{const end=Date.now()+15000;while(!check()){if(Date.now()>end)assert.fail('automatic retry timeout');await new Promise(r=>setTimeout(r,30))}}
    await until(()=>b.sync.state().status==='error')
    f.runner=runGit
    await until(()=>!b.sync.state().pending)
    assert.match(await f.show('notes/documents/'+offline.noteId+'.md'),/saved offline/)
    const other=await f.instance('other');await assert.rejects(other.sync.preview({repo,mode:'existing',folder}),{code:'notebook_folder_occupied'})
    await f.connect(other.sync);assert.equal((await other.notes.get(offline.noteId)).current.title,'saved offline')
  }finally{await f.close()}
})

test('first sync must finish before admission; retry only initializes a confirmed new empty repository',async()=>{
  const f=await fixture()
  try {
    const a=await f.instance('retry')
    let p=await a.sync.preview({mode:'create',repo:'private-data'})
    const create=f.gateway.createPrivate
    f.gateway.createPrivate=async(owner,repo)=>{await create(owner,repo);throw new Error('unknown result')}
    await assert.rejects(a.sync.connect({previewId:p.preview.id,confirmPrivate:true}),{code:'personal_repository_unrelated'})
    assert.equal(a.sync.ready,false);assert.equal((await runGit(['--git-dir',f.remote,'show-ref'],{allowFailure:true})).stdout,'')
    f.repository=null;f.gateway.createPrivate=create
    p=await a.sync.preview({mode:'create',repo:'private-data'})
    f.runner=async(args,options)=>{if(args[0]==='push')throw new NotebookError('git_failed','offline',502);return runGit(args,options)}
    await assert.rejects(a.sync.connect({previewId:p.preview.id,confirmPrivate:true}),{code:'git_failed'})
    assert.equal(a.sync.ready,false);assert.equal(a.sync.state().pending,true)
    await a.sync.close();f.runner=runGit
    const resumed=await f.instance('retry');assert.equal(resumed.sync.ready,false)
    await resumed.sync.sync();assert.equal(resumed.sync.ready,true);assert.equal(JSON.parse(await f.show('notebook.json')).repositoryId,456)
  } finally {await f.close()}
})
