import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, mkdir, writeFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fixture, request } from './fixtures/notes-capture.js'
import { NoteConversation, projectTranscript } from '../src/host/note-conversation.js'
import type { AttachmentId } from '@deepseek-ai/dsh-attachment'
import type { CaptureSource } from '../src/contracts/notes.js'
import { NoteCaptureService } from '../src/notes/capture.js'
import { NoteRepository } from '../src/notes/repository.js'


test('M3 freezes opening cursor, walks 3+ overlapping pages and preserves all 112 visible texts',async()=>{
  const f=fixture(),adapter=new NoteConversation(()=>f.controller),cut=await adapter.open(request.sessionId,new AbortController().signal)
  f.events.push({...f.events[111]!,seq:112,data:{message:{id:'later',content:[{type:'text',text:'LATER'}]}}})
  const capture=await adapter.read(request.sessionId,cut,new AbortController().signal)
  assert.equal(capture.messages.length,112);assert.ok(f.pages>=3);assert.ok(f.cuts.every(n=>n===111))
  assert.equal(capture.messages[1]?.blocks[0]?.type,'text');assert.deepEqual(capture.messages[1]?.blocks[0],{type:'text',text:'  answer 1\r\n\n'})
  assert.equal(capture.complete,true)
})
test('M3 request identity survives receipt loss/restart and freezes selection arguments',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'notes-capture-'))
  try{const f=fixture(),repo=new NoteRepository(dir),service=new NoteCaptureService(repo,new NoteConversation(()=>f.controller))
    const first=await service.capture(request)
    f.events.push({...f.events[111]!,seq:112})
    const second=await new NoteCaptureService(new NoteRepository(dir),new NoteConversation(()=>f.controller)).capture(request)
    assert.equal(first.note.noteId,second.note.noteId);assert.equal(first.sourceId,second.sourceId);assert.equal(f.follows,1)
    assert.equal((await repo.list()).items.length,1)
    await assert.rejects(service.capture({...request,scope:'selection',messageIds:['m1']}),{code:'capture_request_mismatch'})
  }finally{await rm(dir,{recursive:true,force:true})}
})

test('M3 cancellation during paging resumes the frozen cut after restart, excluding later messages',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'notes-cancel-'))
  try {
    const f=fixture(),page=f.controller.page,abort=new AbortController()
    f.controller.page=async(input,signal)=>{const result=await page(input,signal);if(input.beforeSeq!==undefined)abort.abort();return result}
    const repo=new NoteRepository(dir)
    await assert.rejects(new NoteCaptureService(repo,new NoteConversation(()=>f.controller)).capture(request,abort.signal),{name:'AbortError'})
    assert.equal((await repo.list()).items.length,0)
    f.events.push({...f.events[111]!,seq:112,data:{message:{id:'new',content:[{type:'text',text:'new tail'}]}}})
    f.controller.page=page
    const result=await new NoteCaptureService(new NoteRepository(dir),new NoteConversation(()=>f.controller)).capture(request)
    assert.equal(result.messageCount,112);assert.equal(f.follows,1);assert.equal(result.note.current.body.includes('new tail'),false)
  } finally { await rm(dir,{recursive:true,force:true}) }
})

test('M3 no-progress, missing-page, inconsistent overlap and beyond-cut responses never claim completeness',async()=>{
  for(const kind of ['stalled','gap','changed','future']) {
    const f=fixture(),page=f.controller.page,adapter=new NoteConversation(()=>f.controller),signal=new AbortController().signal,cut=await adapter.open(request.sessionId,signal)
    f.controller.page=async(input,active)=>{
      const result=await page(input,active)
      if(kind==='stalled')return {records:[],hasMore:true,cursor:input.throughSeq??-1}
      if(kind==='gap')return {...result,hasMore:false}
      if(kind==='future')return{records:[{type:'event',event:{...f.events[0]!,seq:112}}],hasMore:false,cursor:112}
      if(input.beforeSeq!==undefined)return {...result,records:result.records.map(r=>r.event.seq===input.beforeSeq?{...r,event:{...r.event,time:999}}:r)}
      return result
    }
    await assert.rejects(adapter.read(request.sessionId,cut,signal),{code:kind==='stalled'?'capture_no_progress':kind==='gap'?'capture_gap':kind==='changed'?'capture_changed':'capture_protocol'})
  }
})

test('M3 compaction retains append-origin history, excludes injections/private blocks, marks unknown effects partial',()=>{
  const f=fixture(),answer=f.events[1]!
  const events=[f.events[0]!,answer,{...f.events[0]!,seq:112,data:{id:'context',source:{kind:'producer'},content:[{type:'text',text:'private context'}]}},{...answer,seq:113,surfaceOp:{op:'replace',startSeq:0,endSeq:1},data:{message:{id:'summary',content:[{type:'text',text:'model compaction'}]}}},{type:'session/end-seed',seq:114,time:0,data:{}},{type:'third-party/edit',seq:115,time:0,data:{}}]
  const result=projectTranscript(events)
  assert.deepEqual(result.messages.map(m=>m.id),['m0','m1']);assert.equal(result.complete,false);assert.deepEqual(result.issues,['unknown_required_event'])
  assert.equal(projectTranscript(events.slice(0,-1)).complete,true)
  assert.equal(projectTranscript([{...events.at(-1)!,ignorable:true}]).complete,true)
  const privateBlocks=projectTranscript([{...answer,data:{message:{id:'a',content:[{type:'reasoning',text:'hidden'},{type:'tool-call',arguments:'hidden'},{type:'text',text:'\r\n visible \n'}]}}}])
  assert.equal(JSON.stringify(privateBlocks).includes('hidden'),false);assert.deepEqual(privateBlocks.messages[0]?.blocks,[{type:'text',text:'\r\n visible \n'}])
})

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')
test('M3 authorized image bytes persist before source/note and preserve image-before-text order',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'notes-image-'))
  try {
    const f=fixture(),writes:string[]=[],repo=new NoteRepository(dir,{beforeWrite:path=>{writes.push(path)}})
    f.events[0]={...f.events[0]!,data:{id:'m0',source:{kind:'user'},content:[{type:'image',attachment:{attachmentId:'img',mediaType:'image/png',bytes:png.length,width:1,height:1}},{type:'text',text:'  after image\r\n'}]}}
    f.controller.attachment=async input=>{assert.equal(input.sessionId,request.sessionId);assert.deepEqual(input.attachment,{attachmentId:'img',mediaType:'image/png',bytes:png.length,width:1,height:1});return{attachment:{attachmentId:'img' as AttachmentId,mediaType:'image/png',bytes:png.length,width:1,height:1},data:png.toString('base64')}}
    const result=await new NoteCaptureService(repo,new NoteConversation(()=>f.controller)).capture(request),source=await repo.getSource(result.sourceId) as unknown as CaptureSource
    assert.equal(result.complete,true);assert.equal(result.note.current.assetIds.length,1);assert.deepEqual(await repo.getAsset(result.note.current.assetIds[0]!),png)
    assert.ok(result.note.current.body.indexOf('![会话图片]')<result.note.current.body.indexOf('  after image\r\n'))
    assert.deepEqual(source.messages[0]?.blocks[0],{type:'image',attachmentId:'img',mediaType:'image/png'});assert.equal('imageReferences' in source,false);assert.ok(writes.findIndex(p=>p.startsWith('assets/'))<writes.findIndex(p=>p.startsWith('sources/')));assert.ok(writes.findIndex(p=>p.startsWith('sources/'))<writes.findIndex(p=>p.startsWith('revisions/')))
  } finally { await rm(dir,{recursive:true,force:true}) }
})

test('M3 missing image retains position and identity; AI is unavailable but raw material persists',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'notes-missing-'))
  try {
    const f=fixture(),repo=new NoteRepository(dir)
    f.events[0]={...f.events[0]!,data:{id:'m0',source:{kind:'user'},content:[{type:'image',attachment:{attachmentId:'missing',mediaType:'image/png'}},{type:'text',text:'after'}]}}
    const result=await new NoteCaptureService(repo,new NoteConversation(()=>f.controller)).capture({...request,mode:'raw',autoMetadata:true})
    assert.equal(result.complete,false);assert.deepEqual(result.missingAssetIds,['missing']);assert.equal(result.enrichmentJobId,null);assert.equal(result.enrichmentStatus,'unavailable');assert.match(result.note.current.body,/\[图片未归档\]\nafter/)
    const source=await repo.getSource(result.sourceId) as unknown as CaptureSource
    assert.equal(source.messages[0]?.blocks[0]?.type,'image');assert.deepEqual(source.missingAssetIds,['missing'])
  } finally { await rm(dir,{recursive:true,force:true}) }
})

test('M3 unsafe inline image links stay byte-exact literal text alongside authorized images and nested fences',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'notes-literal-'))
  try {
    const f=fixture(),repo=new NoteRepository(dir),raw='  ![local](file:///C:/private.png)\r\n![data](data:image/png;base64,abc)\n![relative](../unknown.png)\n\n````ts\nconst tick = `hi`\n````\n  '
    f.events[0]={...f.events[0]!,data:{id:'m0',source:{kind:'user'},content:[{type:'image',attachment:{attachmentId:'img',mediaType:'image/png',bytes:png.length,width:1,height:1}},{type:'text',text:raw}]}}
    f.controller.attachment=async()=>({attachment:{attachmentId:'img' as AttachmentId,mediaType:'image/png',bytes:png.length,width:1,height:1},data:png.toString('base64')})
    const result=await new NoteCaptureService(repo,new NoteConversation(()=>f.controller)).capture(request),source=await repo.getSource(result.sourceId) as unknown as CaptureSource
    assert.equal(result.complete,false);assert.ok(result.issues.includes('image_links_kept_as_text'));assert.equal(result.missingAssetIds.length,0)
    assert.deepEqual(source.textOnlyBlocks,[{messageId:'m0',blockIndex:1}]);assert.deepEqual(source.messages[0]?.blocks[1],{type:'text',text:raw})
    assert.ok(result.note.current.body.includes('`````text\n'+raw+'\n`````'));assert.ok(result.note.current.body.indexOf('![会话图片]')<result.note.current.body.indexOf('`````text'));assert.deepEqual(await repo.getAsset(result.note.current.assetIds[0]!),png)
  }finally{await rm(dir,{recursive:true,force:true})}
})

test('final R1 capture keeps the first unusable duplicate image reference as exact partial literal material', async t => {
  for (const destination of ['file:///C:/private.png', '<>']) for (const prefix of ['', '> ']) await t.test(`${destination} ${prefix ? 'nested first definition' : 'flat definitions'}`, async () => {
    const dir = await mkdtemp(join(tmpdir(), 'notes-duplicate-literal-'))
    try {
      const f = fixture(), repo = new NoteRepository(dir), raw = `${prefix}[Pic Ref]: ${destination}\n\n![selected][PIC REF]\n\n[pic  ref]: https://example.com/harmless.png`
      f.events[0] = { ...f.events[0]!, data: { id: 'm0', source: { kind: 'user' }, content: [{ type: 'text', text: raw }] } }
      const result = await new NoteCaptureService(repo, new NoteConversation(() => f.controller)).capture(request), source = await repo.getSource(result.sourceId) as unknown as CaptureSource
      assert.equal(result.complete, false); assert.ok(result.issues.includes('image_links_kept_as_text'))
      assert.deepEqual(source.textOnlyBlocks, [{ messageId: 'm0', blockIndex: 0 }]); assert.deepEqual(source.messages[0]?.blocks[0], { type: 'text', text: raw })
      assert.ok(result.note.current.body.includes('```text\n' + raw + '\n```')); assert.deepEqual(result.note.current.assetIds, [])
      assert.equal((await new NoteRepository(dir).get(result.note.noteId)).current.body, result.note.current.body)
    } finally { await rm(dir, { recursive: true, force: true }) }
  })
})

test('M3 completed tool result archives only structured visible images; uncertain PTC image is partial',()=>{
  const image={type:'image',attachment:{attachmentId:'tool-image',mediaType:'image/png'}}
  const result=projectTranscript([{type:'tool/result',seq:0,time:0,surfaceOp:'append',data:{message:{id:'tool-msg',content:[{type:'text',text:'secret log'},image]}}},{type:'tool/ptc-dispatch',seq:1,time:0,data:{content:[image]}}])
  assert.equal(result.messages.length,1);assert.deepEqual(result.messages[0]?.blocks,[{type:'image',attachmentId:'tool-image',mediaType:'image/png'}]);assert.equal(JSON.stringify(result).includes('secret log'),false);assert.deepEqual(result.issues,['unsupported_tool_images'])
})

for(const stage of ['sources/','revisions/','manifest.json','receipt']) test(`M3 interrupted ${stage} retries one frozen note after process restart`,async()=>{
  const dir=await mkdtemp(join(tmpdir(),'notes-interruption-'))
  try {
    await new NoteRepository(dir).listNotebooks()
    const f=fixture();let fail=true,revisionWritten=false
    const repo=new NoteRepository(dir,{beforeWrite:path=>{
      if(path.startsWith('revisions/'))revisionWritten=true
      if(fail&&(stage==='receipt'?revisionWritten&&path.startsWith('captures/'):path.startsWith(stage))){fail=false;throw new Error('simulated interruption')}
    }})
    await assert.rejects(new NoteCaptureService(repo,new NoteConversation(()=>f.controller)).capture(request),/simulated interruption/)
    f.events.push({...f.events[111]!,seq:112,data:{message:{id:'late',content:[{type:'text',text:'late tail'}]}}})
    const restarted=new NoteRepository(dir),service=new NoteCaptureService(restarted,new NoteConversation(()=>f.controller)),result=await service.capture(request)
    assert.equal(result.messageCount,112);assert.equal(f.follows,1);assert.equal((await restarted.list()).items.length,1)
    const again=await service.capture(request);assert.equal(again.note.current.revision,result.note.current.revision)
    assert.equal((await restarted.exportObjects()).revisions.length,1)
  } finally { await rm(dir,{recursive:true,force:true}) }
})

test('M3 full selection covers all pages; turn scope picks preceding user and anchor only',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'notes-selection-'))
  try{const f=fixture(),service=new NoteCaptureService(new NoteRepository(dir),new NoteConversation(()=>f.controller))
    const selection=await service.selection({sessionId:request.sessionId,anchorMessageId:'m111'})
    assert.equal(selection.messages.length,112);assert.deepEqual(selection.defaultMessageIds,['m110','m111'])
    const result=await service.capture({...request,scope:'turn',anchorMessageId:'m101'})
    assert.equal(result.messageCount,2);assert.match(result.note.current.body,/question 100/);assert.match(result.note.current.body,/answer 101/);assert.doesNotMatch(result.note.current.body,/answer 103/)
    await assert.rejects(service.capture({...request,requestId:'other',scope:'selection',messageIds:['unknown']}),{code:'source_mismatch'})
  }finally{await rm(dir,{recursive:true,force:true})}
})

test('M3 a future module manifest blocks even new capture journals',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'notes-future-capture-'))
  try{await mkdir(join(dir,'notes'));await writeFile(join(dir,'notes','manifest.json'),JSON.stringify({version:99}))
    const f=fixture(),service=new NoteCaptureService(new NoteRepository(dir),new NoteConversation(()=>f.controller))
    await assert.rejects(service.capture(request),{code:'note_version'});assert.deepEqual(await readdir(join(dir,'notes')),['manifest.json']);assert.equal(f.follows,0)
  }finally{await rm(dir,{recursive:true,force:true})}
})

test('M3 receipt retry after repeated image-note edits retains original revision without overwriting edits',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'notes-edited-capture-'))
  try{
    const f=fixture(),repo=new NoteRepository(dir),service=new NoteCaptureService(repo,new NoteConversation(()=>f.controller))
    f.events[0]={...f.events[0]!,data:{id:'m0',source:{kind:'user'},content:[{type:'image',attachment:{attachmentId:'img',mediaType:'image/png',bytes:png.length,width:1,height:1}},{type:'text',text:'original'}]}}
    f.controller.attachment=async()=>({attachment:{attachmentId:'img' as AttachmentId,mediaType:'image/png',bytes:png.length,width:1,height:1},data:png.toString('base64')})
    const first=await service.capture(request);let view=first.note
    const start=performance.now()
    for(let i=0;i<10;i++){const r=view.current;view=await repo.save({noteId:view.noteId,expectedHeads:view.heads,content:{title:`manual ${i}`,body:r.body,summary:r.summary,tags:r.tags,notebookId:r.notebookId,status:r.status,sourceId:r.sourceId,assetIds:r.assetIds}})}
    const retry=await service.capture(request),current=await repo.get(view.noteId)
    t.diagnostic(`112-message source + one 68-byte image + 10 revisions and rereads: ${Math.round(performance.now()-start)} ms`)
    assert.equal(retry.note.current.revision,first.note.current.revision);assert.equal(current.current.title,'manual 9');assert.equal((await repo.exportObjects()).revisions.length,11)
  }finally{await rm(dir,{recursive:true,force:true})}
})

test('capture rejects a body organization request',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'capture-raw-only-'))
  try {
    const service=new NoteCaptureService(new NoteRepository(dir),new NoteConversation(()=>fixture().controller))
    assert.throws(()=>service.capture({...request,mode:'organize'}),{code:'capture_request'})
  } finally {await rm(dir,{recursive:true,force:true})}
})
