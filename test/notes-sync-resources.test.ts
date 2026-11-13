import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm,readFile,writeFile,stat,utimes} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {NoteRepository} from '../src/notes/repository.js'
import {NotesSyncModule} from '../src/notes/sync.js'
import {digest} from '../src/notes/validation.js'
import {createNoteRevision} from '../src/notes/revisions.js'
import {ulid} from '../src/domain/id.js'
import {DraftFiles} from '../src/notes/drafts.js'
import type {NoteContent,NoteRevision} from '../src/contracts/notes.js'

const content:NoteContent={title:'同步资源',body:'原正文',summary:'',tags:[],notebookId:null,status:'active',sourceId:null,assetIds:[]}
const next=(note:NoteRevision,attachments:NonNullable<NoteContent['attachments']>)=>{const {revision,...rest}=note;return createNoteRevision({...rest,parents:[revision],attachments,recordedAt:'2026-11-13T08:00:00.000Z'})}
async function fixture(t:{after(fn:()=>Promise<void>):void},count=12){
 const dir=await mkdtemp(join(tmpdir(),'fatfish-sync-resources-'));t.after(()=>rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100}))
 const repo=new NoteRepository(dir),sync=new NotesSyncModule(repo,()=>{});t.after(async()=>sync.close())
 const files=new Map<string,Buffer>(),attachments=[]
 for(let i=0;i<count;i++){const bytes=Buffer.from('resource '+i),file=await repo.putAttachment(bytes,`file-${i}.txt`);attachments.push(file);files.set(`notes/attachments/${file.id}.bin`,bytes)}
 const note=await repo.save({expectedHeads:[],content:{...content,attachments}}),objects=await repo.exportObjects()
 return {dir,repo,sync,note,objects,files}
}

test('unchanged sync install reuses checked resources without loading Git bodies or scanning per file',async t=>{
 const {repo,sync,objects,files}=await fixture(t);let scans=0,loads=0
 const scan=repo.files.scan.bind(repo.files);repo.files.scan=async()=>{scans++;return scan()}
 const remote={objects,files:new Map([...files].map(([p,b])=>[p,{length:b.length,load:async()=>{loads++;return b}}]))}
 await sync.install(remote,objects)
 assert.equal(loads,0,'Already validated local resources must not reload Git bodies during installation')
 assert.ok(scans<=6,`Expected a bounded number of whole-library scans, got ${scans}`)
})

test('old tombstones without remaining cleanup do not invalidate a warm sync snapshot',async t=>{
 const {repo,sync,note}=await fixture(t,1),trashed=await repo.trash(note.noteId,note.heads)
 await repo.batch([{noteId:note.noteId,expectedHeads:trashed.heads}],'purge');const objects=await repo.exportObjects();let scans=0
 const scan=repo.files.scan.bind(repo.files);repo.files.scan=async()=>{scans++;return scan()}
 await sync.install({objects,files:new Map()},objects)
 assert.ok(scans<=4,`No pending cleanup should force an extra full validation: ${scans}`)
})

test('unchanged sync does not republish documents; missing and stale documents still recover',async t=>{
 const {repo,sync,note,objects,files}=await fixture(t,1),document=`documents/${note.noteId}.md`,original=await repo.files.read(document)
 const write=repo.files.write.bind(repo.files);let writes=0;repo.files.write=async(...args)=>{writes++;return write(...args)}
 await sync.install({objects,files},objects);assert.equal(writes,0)
 await rm(repo.files.path(document));await sync.install({objects,files},objects);assert.deepEqual(await repo.files.read(document),original)
 const newer=await repo.save({noteId:note.noteId,expectedHeads:note.heads,content:{...content,body:'新版本',attachments:note.current.attachments!}}),latest=await repo.exportObjects()
 await writeFile(repo.files.path(document),original);await sync.install({objects:latest,files},latest)
 assert.equal((await repo.get(note.noteId)).current.revision,newer.current.revision);assert.match((await repo.files.read(document)).toString(),/新版本/)
})

test('unchanged remote install imports external Markdown and preserves newer local revisions',async t=>{
 const {repo,sync,note,objects,files}=await fixture(t,1),document=repo.files.path(`documents/${note.noteId}.md`)
 await writeFile(document,(await readFile(document,'utf8')).replace(/原正文$/,'外部编辑'))
 await sync.install({objects,files},objects);const changed=await repo.get(note.noteId);assert.equal(changed.current.body,'外部编辑')
 const local=await repo.save({noteId:note.noteId,expectedHeads:changed.heads,content:{...content,body:'同步途中本机新编辑',attachments:note.current.attachments!}})
 await sync.install({objects,files},objects);assert.deepEqual((await repo.get(note.noteId)).heads,local.heads)
 assert.match(await readFile(document,'utf8'),/同步途中本机新编辑/)
})

test('missing resources load outside the repository queue and are published in bounded batches',async t=>{
 const {repo,sync,note,objects}=await fixture(t,0),files=new Map<string,Buffer>(),attachments=[]
 for(let i=0;i<13;i++){const b=Buffer.from('new resource '+i),id=digest(b);files.set(`notes/attachments/${id}.bin`,b);attachments.push({id,name:`new-${i}.txt`,bytes:b.length})}
 const revision=next(note.current,attachments)
 const incoming={...objects,revisions:[...objects.revisions,revision]};let entered!:()=>void,release!:()=>void,readStarted=false
 const ready=new Promise<void>(r=>entered=r),gate=new Promise<void>(r=>release=r),remote={objects:incoming,files:new Map([...files].map(([p,b])=>[p,{length:b.length,load:async()=>{if(!readStarted){readStarted=true;entered();await gate}return b}}]))}
 let scans=0,writes=0,foreground:Promise<void>|undefined,observed=-1
 const scan=repo.files.scan.bind(repo.files),write=repo.files.write.bind(repo.files)
 repo.files.scan=async()=>{scans++;return scan()}
 repo.files.write=async(p,...args)=>{if(p.startsWith('attachments/')){writes++;if(writes===1)foreground=repo.coordinate(()=>{observed=writes})}return write(p,...args)}
 const installing=sync.install(remote,incoming);await ready
 assert.equal((await repo.get(note.noteId)).current.title,content.title);release();await installing;await foreground
 assert.ok(observed>0&&observed<=4,`Foreground request waited for ${observed} file writes`)
 assert.ok(scans<=8,`New resources must not scan per file: ${scans}`)
 assert.equal((await repo.get(note.noteId)).current.attachments?.length,13)
})

test('cached resources detect same-size external changes with restored mtime and keep damaged bytes',async t=>{
 const {repo,sync,objects,files}=await fixture(t,1),[path,bytes]=[...files][0]!,local=repo.files.path(path.slice(6)),before=await stat(local)
 await writeFile(local,Buffer.alloc(bytes.length));await utimes(local,before.atime,before.mtime)
 await assert.rejects(sync.install({objects,files},objects));assert.deepEqual(await readFile(local),Buffer.alloc(bytes.length))
})

test('cancelled or relocated installs cannot publish fetched resources or formal revisions',async t=>{
 for(const relocate of [false,true]){
  const {repo,sync,note,objects,dir}=await fixture(t,0),bytes=Buffer.from('late '+relocate),id=digest(bytes)
  const row=next(note.current,[{id,name:'late.txt',bytes:bytes.length}]),incoming={...objects,revisions:[...objects.revisions,row]}
  let enter!:()=>void,release!:()=>void;const ready=new Promise<void>(r=>enter=r),gate=new Promise<void>(r=>release=r),abort=new AbortController()
  const pending=sync.install({objects:incoming,files:new Map([[`notes/attachments/${id}.bin`,{length:bytes.length,load:async()=>{enter();await gate;return bytes}}]])},incoming,abort.signal)
  await ready;if(relocate)repo.useDirectory(join(dir,'other'));else abort.abort();release();await assert.rejects(pending)
  const original=new NoteRepository(dir);assert.deepEqual((await original.get(note.noteId)).heads,note.heads);await assert.rejects(original.getAttachment(id));if(relocate)await assert.rejects(repo.getAttachment(id))
 }
})

test('draft discard during resource fetch retains shared incoming bytes until successful merge',async t=>{
 const {repo,sync,note,objects,dir}=await fixture(t,0),editId=ulid(),first=Buffer.from('shared draft'),second=Buffer.from('new dependency')
 await repo.draft({action:'save',editId,sequence:0,request:{noteId:note.noteId,expectedHeads:note.heads,content}})
 const shared=await repo.putDraftFile(note.noteId,editId,first,'shared.txt');assert.ok('attachment' in shared)
 const extra={id:digest(second),name:'extra.txt',bytes:second.length},row=next(note.current,[shared.attachment,extra]),incoming={...objects,revisions:[...objects.revisions,row]}
 let enter!:()=>void,release!:()=>void;const ready=new Promise<void>(r=>enter=r),gate=new Promise<void>(r=>release=r)
 const files:Parameters<NotesSyncModule['install']>[0]['files']=new Map();files.set(`notes/attachments/${shared.attachment.id}.bin`,first);files.set(`notes/attachments/${extra.id}.bin`,{length:second.length,load:async()=>{enter();await gate;return second}})
 const pending=sync.install({objects:incoming,files},incoming);await ready;await repo.draft({action:'discard',editId,noteId:note.noteId});release();await pending
 assert.deepEqual(await repo.getAttachment(shared.attachment.id),first)
 assert.equal((await repo.get(note.noteId)).current.attachments?.length,2)
 assert.deepEqual((await new DraftFiles(join(dir,'local-drafts')).read(editId))?.files,[])
})

test('failed fetch releases draft cleanup reservations and a retry can finish',async t=>{
 const {repo,sync,note,objects,dir}=await fixture(t,0),editId=ulid(),first=Buffer.from('discard then fail'),second=Buffer.from('retry dependency')
 await repo.draft({action:'save',editId,sequence:0,request:{noteId:note.noteId,expectedHeads:note.heads,content}})
 const shared=await repo.putDraftFile(note.noteId,editId,first,'shared.txt');assert.ok('attachment'in shared)
 const extra={id:digest(second),name:'extra.txt',bytes:second.length},incoming={...objects,revisions:[...objects.revisions,next(note.current,[shared.attachment,extra])]}
 let enter!:()=>void,release!:()=>void;const ready=new Promise<void>(r=>enter=r),gate=new Promise<void>(r=>release=r)
 const files:Parameters<NotesSyncModule['install']>[0]['files']=new Map();files.set(`notes/attachments/${shared.attachment.id}.bin`,first);files.set(`notes/attachments/${extra.id}.bin`,{length:second.length,load:async()=>{enter();await gate;throw Error('fetch failed')}})
 const failed=sync.install({objects:incoming,files},incoming);await ready;await repo.draft({action:'discard',editId,noteId:note.noteId});release();await assert.rejects(failed,/fetch failed/)
 await assert.rejects(repo.getAttachment(shared.attachment.id));assert.deepEqual((await new DraftFiles(join(dir,'local-drafts')).read(editId))?.files,[])
 files.set(`notes/attachments/${extra.id}.bin`,second);await sync.install({objects:incoming,files},incoming);assert.deepEqual(await repo.getAttachment(shared.attachment.id),first)
})

test('purge during install retains shared incoming resources and deletion still wins',async t=>{
 const {repo,sync,note,objects,files}=await fixture(t,1),extra=Buffer.from('held fetch'),id=digest(extra),newId=ulid()
 const {revision:_revision,...base}=note.current,row=createNoteRevision({...base,noteId:newId,parents:[],attachments:[...note.current.attachments!,{id,name:'extra.txt',bytes:extra.length}]})
 const incoming={...objects,revisions:[...objects.revisions,row]};let enter!:()=>void,release!:()=>void;const ready=new Promise<void>(r=>enter=r),gate=new Promise<void>(r=>release=r)
 const remoteFiles:Parameters<NotesSyncModule['install']>[0]['files']=new Map(files);remoteFiles.set(`notes/attachments/${id}.bin`,{length:extra.length,load:async()=>{enter();await gate;return extra}})
 const pending=sync.install({objects:incoming,files:remoteFiles},incoming);await ready
 const trashed=await repo.trash(note.noteId,note.heads);await repo.batch([{noteId:note.noteId,expectedHeads:trashed.heads}],'purge');release();await pending
 await assert.rejects(repo.get(note.noteId));assert.equal((await repo.get(newId)).current.attachments?.length,2)
 const last=await repo.trash(newId,(await repo.get(newId)).heads);await repo.batch([{noteId:newId,expectedHeads:last.heads}],'purge');await assert.rejects(repo.getAttachment(note.current.attachments![0]!.id))
})

test('final validation catches a resource modified between install batches',async t=>{
 const {repo,sync,note,objects,files}=await fixture(t,1),extra=Buffer.from('hold for tamper'),id=digest(extra),incoming={...objects,revisions:[...objects.revisions,next(note.current,[...note.current.attachments!,{id,name:'extra.txt',bytes:extra.length}])]}
 const [path,bytes]=[...files][0]!;let enter!:()=>void,release!:()=>void;const ready=new Promise<void>(r=>enter=r),gate=new Promise<void>(r=>release=r)
 const remoteFiles:Parameters<NotesSyncModule['install']>[0]['files']=new Map(files);remoteFiles.set(`notes/attachments/${id}.bin`,{length:extra.length,load:async()=>{enter();await gate;return extra}})
 const pending=sync.install({objects:incoming,files:remoteFiles},incoming);await ready;await writeFile(repo.files.path(path.slice(6)),Buffer.alloc(bytes.length));release();await assert.rejects(pending)
 assert.equal((await repo.files.read(`revisions/${note.noteId}/${note.current.revision}.json`)).includes(Buffer.from(note.current.revision)),true)
 await assert.rejects(repo.files.read(`revisions/${note.noteId}/${incoming.revisions.at(-1)!.revision}.json`))
})

test('source and image resources reuse complete checks; large resource batches respect byte budget',async t=>{
 const {repo,sync,note}=await fixture(t,0),png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'),asset=await repo.putAsset(png,'image/png')
 const sourceId=await repo.putSource({text:'source',assets:{image:asset.id}}),saved=await repo.save({noteId:note.noteId,expectedHeads:note.heads,content:{...content,sourceId,assetIds:[asset.id],body:`![x](../assets/${asset.id})`}}),objects=await repo.exportObjects()
 const source=await repo.files.read(`sources/${sourceId}.json`),files:Parameters<NotesSyncModule['install']>[0]['files']=new Map([[`notes/sources/${sourceId}.json`,source]]);let imageLoads=0
 files.set(`notes/assets/${asset.id}`,{length:png.length,load:async()=>{imageLoads++;return png}});await sync.install({objects,files},objects);assert.equal(imageLoads,0)
 const large=[Buffer.alloc(5*1024*1024,1),Buffer.alloc(5*1024*1024,2)],attachments=large.map((b,i)=>({id:digest(b),name:`large-${i}`,bytes:b.length})),incoming={...objects,revisions:[...objects.revisions,next(saved.current,attachments)]}
 for(const [i,b]of large.entries())files.set(`notes/attachments/${attachments[i]!.id}.bin`,b)
 let writes=0,observed=-1,foreground:Promise<void>|undefined;const write=repo.files.write.bind(repo.files)
 repo.files.write=async(p,...args)=>{if(p.startsWith('attachments/')){writes++;if(writes===1)foreground=repo.coordinate(()=>{observed=writes})}return write(p,...args)}
 await sync.install({objects:incoming,files},incoming);await foreground;assert.equal(observed,1,'Two 5 MiB resources must not occupy one batch')
})
