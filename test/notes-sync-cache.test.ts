import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {NoteRepository} from '../src/notes/repository.js'
import {NotesSyncModule} from '../src/notes/sync.js'
import {VerifiedSnapshotFiles} from '../src/notes/sync-cache.js'
import type {GitBackend} from '../src/git/backend.js'
import type {GitSnapshot} from '../src/git/types.js'

const entry=(bytes:Buffer)=>({sha:createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),type:'blob',mode:'100644'})

test('remote snapshot reuses only verified unchanged Git objects and invalidates failures, roots and repositories',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'fatfish-sync-cache-')),repo=new NoteRepository(dir),sync=new NotesSyncModule(repo,()=>{})
  t.after(async()=>{sync.close();repo.close();await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100})})
  const attachment=await repo.putAttachment(Buffer.from('remote attachment'),'remote.txt')
  const note=await repo.save({expectedHeads:[],content:{title:'缓存验证',body:'原正文',summary:'',tags:[],notebookId:null,status:'active',sourceId:null,assetIds:[],attachments:[attachment]}})
  const data=new Map<string,Buffer>()
  for(const path of (await repo.files.scan()).paths)data.set('notes/'+path,await repo.files.read(path))
  let reads:string[]=[]
  const snapshot:GitSnapshot={revision:'a'.repeat(40),treeSha:'b'.repeat(40),entries:new Map([...data].map(([p,b])=>[p,entry(b)]))}
  const backend={directory:join(dir,'git'),target:{key:'private@main',remote:'file:private'},
    async readBytes(s:GitSnapshot,path:string,limit:number){const e=s.entries.get(path);if(!e||e.type!=='blob'||!['100644','100755'].includes(e.mode))throw Error('invalid Git entry');const bytes=data.get(path)!;assert.ok(bytes.length<=limit);reads.push(path);return Buffer.from(bytes)},
    async readBatch(s:GitSnapshot,paths:Map<string,number>){const result=new Map<string,Buffer>();for(const [p,max]of paths)result.set(p,await this.readBytes(s,p,max));return result}
  }
  const first=await sync.readSnapshot(backend as unknown as GitBackend,snapshot);assert.ok(reads.length>3);reads=[]
  const again=await sync.readSnapshot(backend as unknown as GitBackend,snapshot)
  assert.equal(reads.length,0,'Unchanged remote objects must not be reread from Git')
  const manifest=first.files.get('notes/manifest.json');assert.ok(Buffer.isBuffer(manifest));manifest.fill(0)
  again.objects.revisions[0]!.body='caller mutation'
  const unchanged=await sync.readSnapshot(backend as unknown as GitBackend,snapshot);assert.equal(unchanged.objects.revisions[0]!.body,'原正文')
  const document=`notes/documents/${note.noteId}.md`,changed=Buffer.from(data.get(document)!.toString().replace(/原正文$/,'外部编辑'))
  data.set(document,changed);const next={...snapshot,entries:new Map(snapshot.entries).set(document,entry(changed))};reads=[]
  assert.ok((await sync.readSnapshot(backend as unknown as GitBackend,next)).objects.revisions.some(r=>r.body==='外部编辑'))
  assert.deepEqual(reads,[document],'Only the changed Git object needs reading')
  const binary=`notes/attachments/${attachment.id}.bin`,missing={...next,entries:new Map(next.entries)};missing.entries.delete(binary)
  await assert.rejects(sync.readSnapshot(backend as unknown as GitBackend,missing));reads=[]
  await sync.readSnapshot(backend as unknown as GitBackend,next);assert.ok(reads.includes(binary),'A failed snapshot clears reuse receipts')
  const unsafe={...next,entries:new Map(next.entries).set(binary,{...next.entries.get(binary)!,mode:'120000'})}
  await assert.rejects(sync.readSnapshot(backend as unknown as GitBackend,unsafe));await sync.readSnapshot(backend as unknown as GitBackend,next)
  backend.target.key='different@main';reads=[];await sync.readSnapshot(backend as unknown as GitBackend,next);assert.ok(reads.includes(binary))
  repo.useDirectory(join(dir,'new-root'));reads=[];await sync.readSnapshot(backend as unknown as GitBackend,next);assert.ok(reads.includes(binary))
  const abort=new AbortController();abort.abort();await assert.rejects(sync.readSnapshot(backend as unknown as GitBackend,next,abort.signal))
})

test('verified Git cache bounds retained bytes and entries and never shares mutable buffers',()=>{
  const small=Buffer.from('small'),large=Buffer.alloc(100),binary=Buffer.alloc(1000)
  const entries=new Map([['notes/revisions/a',entry(small)],['notes/revisions/b',entry(large)],['notes/attachments/c.bin',entry(binary)],['notes/revisions/d',entry(small)]])
  const snapshot:GitSnapshot={revision:null,treeSha:null,entries},cache=new VerifiedSnapshotFiles(10,2)
  cache.remember(snapshot,'notes/revisions/a',small);cache.remember(snapshot,'notes/revisions/b',large);cache.remember(snapshot,'notes/attachments/c.bin',binary);cache.remember(snapshot,'notes/revisions/d',small)
  small.fill(0);const result=cache.get(snapshot,'notes/revisions/a',10)!;assert.equal(result.bytes!.toString(),'small');result.bytes!.fill(0)
  assert.equal(cache.get(snapshot,'notes/revisions/a',10)!.bytes!.toString(),'small')
  assert.equal(cache.get(snapshot,'notes/revisions/b',100),undefined);assert.equal(cache.get(snapshot,'notes/revisions/d',10),undefined)
  assert.deepEqual(cache.get(snapshot,'notes/attachments/c.bin',1000),{length:1000})
  assert.throws(()=>cache.get(snapshot,'notes/attachments/c.bin',999),{code:'note_limit'})
})
