import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {unzipSync} from 'fflate'
import {NoteRepository} from '../src/notes/repository.js'
import {createExport} from '../src/notes/export/service.js'
import type {ReadingSnapshot} from '../src/notes/export/reading.js'
import type {NoteContent,CaptureSource} from '../src/contracts/notes.js'
import {ReadingBody} from '../src/client/NoteReading.js'
import {SourceContent} from '../src/client/NoteSource.js'
import {translate} from '../src/client/locale.js'

const content:NoteContent={title:'阅读截图',body:'正文',summary:'摘要',tags:['资料'],notebookId:null,status:'active',sourceId:null,assetIds:[]}
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')
async function fixture(t:{after(fn:()=>Promise<void>):void}){const dir=await mkdtemp(join(tmpdir(),'reading-export-'));t.after(()=>rm(dir,{recursive:true,force:true}));return new NoteRepository(dir)}
test('reading PNG freezes selected content and handles table images and external image links without the PDF model',async t=>{
  const repo=await fixture(t),image=await repo.putAsset(png,'image/png'),file=await repo.putAttachment(Buffer.from('original'),'资料.txt')
  const body=`| 图片 | 说明 |\n|---|---|\n| ![本地](../assets/${image.id}) | 内容 |\n\n![外部](https://example.com/image.png)\n\n[文件](../attachments/${file.id}.bin)\n\n\`\`\`js\nconst x = 1\n\`\`\``
  const note=await repo.save({expectedHeads:[],content:{...content,body,assetIds:[image.id],attachments:[file]}}),identity={noteId:note.noteId,revision:note.current.revision}
  await repo.save({noteId:note.noteId,expectedHeads:note.heads,content:{...content,body:'后来编辑'}})
  let reads=0;const original=repo.getAsset.bind(repo);repo.getAsset=async(...args)=>{reads++;return original(...args)};repo.getAttachment=async()=>{throw Error('PNG must not read attachment original')}
  const value=JSON.parse((await createExport(repo,{...identity,format:'png-long',includeTags:false,includeSummary:false})).bytes.toString()) as ReadingSnapshot
  assert.equal(value.note.current.body,body);assert.equal(value.note.current.revision,identity.revision);assert.deepEqual(value.note.current.tags,[]);assert.equal(value.note.current.summary,'');assert.equal(reads,1)
  const html=renderToStaticMarkup(React.createElement(ReadingBody,{note:value.note,t:translate,staticView:true,assetUrl:id=>value.assets[id]!}))
  assert.match(html,/<table[ >]/);assert.match(html,/data:image\/png;base64/);assert.match(html,/href="https:\/\/example.com\/image.png"/);assert.doesNotMatch(html,/<img[^>]+src="https:/);assert.doesNotMatch(html,/class="paper-copy-code"|class="paper-media-more"|后来编辑/)
  await assert.rejects(createExport(repo,{...identity,format:'png-long',assetIds:['a'.repeat(64)+'.png']}),{code:'export_request'})
  const omitted=JSON.parse((await createExport(repo,{...identity,format:'png-long',assetIds:[],attachmentIds:[]})).bytes.toString()) as ReadingSnapshot
  assert.deepEqual(omitted.assets,{});assert.doesNotMatch(omitted.note.current.body,/\.\.\/assets\/|\.\.\/attachments\//);assert.deepEqual(omitted.note.current.attachments,[])
})
test('PDF and PNG retain supplement labels without bundling originals; Markdown alone carries selected bytes',async t=>{
  const repo=await fixture(t),image=await repo.putAsset(png,'image/png'),file=await repo.putAttachment(Buffer.from('original bytes'),'资料.txt')
  const note=await repo.save({expectedHeads:[],content:{...content,assetIds:[image.id],attachments:[file],supplements:{assetIds:[image.id],attachmentIds:[file.id]}}}),identity={noteId:note.noteId,revision:note.current.revision}
  const resources=unzipSync((await createExport(repo,{...identity,format:'markdown-zip'})).bytes)
  assert.equal(Buffer.from(resources[Object.keys(resources).find(n=>n.startsWith('attachments/'))!]!).toString(),'original bytes');assert.deepEqual(Buffer.from(resources['assets/'+image.id]!),png)
  repo.getAsset=async()=>{throw Error('No supplemental image read for visual exports')};repo.getAttachment=async()=>{throw Error('No attachment original read for visual exports')}
  const pdf=await createExport(repo,{...identity,format:'pdf'});assert.equal(pdf.mediaType,'application/pdf');assert.equal(pdf.filename,'阅读截图.pdf');assert.equal(pdf.bytes.subarray(0,5).toString(),'%PDF-')
  const value=JSON.parse((await createExport(repo,{...identity,format:'png-long'})).bytes.toString()) as ReadingSnapshot
  assert.deepEqual(value.assets,{});assert.deepEqual(value.note.current.supplements,note.current.supplements)
  const html=renderToStaticMarkup(React.createElement(ReadingBody,{note:value.note,t:translate,staticView:true}));assert.match(html,/资料.txt/);assert.match(html,/paper-supplements/);assert.doesNotMatch(html,/lucide-download/)
})
test('reading source remains separate from an unfinished note fence and filters unselected originals by identity',async t=>{
  const repo=await fixture(t),image=await repo.putAsset(png,'image/png'),file=await repo.putAttachment(Buffer.from('source file'),'上传.txt')
  const source:CaptureSource={version:1,sessionId:'s',scope:'session',cut:{throughSeq:1,capturedAt:new Date().toISOString(),isSeeded:false},complete:true,issues:[],assets:{img:image.id},missingAssetIds:[],textOnlyBlocks:[],messages:[{id:'m',seq:1,role:'user',blocks:[{type:'text',text:'[上传文件：上传.txt]',materialId:'upload:1:0'},{type:'image',attachmentId:'img',mediaType:'image/png'},{type:'text',text:'原始文字'}]}],archivedMaterials:[{id:'upload:1:0',kind:'file',origin:'upload',name:'上传.txt',seq:1,messageId:'m',bytes:file.bytes,available:true,saved:file}]}
  const sourceId=await repo.putSource(source as unknown as Record<string,unknown>),note=await repo.save({expectedHeads:[],content:{...content,sourceId,body:'```\n用户编辑正文'}})
  const value=JSON.parse((await createExport(repo,{noteId:note.noteId,revision:note.current.revision,format:'png-long',includeSource:true,attachmentIds:[]})).bytes.toString()) as ReadingSnapshot
  assert.equal(value.note.current.body,note.current.body);assert.ok(value.assets[image.id]);assert.equal(value.source!.archivedMaterials![0]!.saved,undefined)
  const html=renderToStaticMarkup(React.createElement(SourceContent,{source:value.source!,note:value.note,t:translate,staticView:true,assetUrl:id=>value.assets[id]!}));assert.match(html,/上传.txt（未包含）/);assert.match(html,/原始文字/);assert.doesNotMatch(html,/notes\/download/)
  assert.deepEqual(await repo.getSource(sourceId),source)
})

test('retired paginated PNG requests are rejected before reading notes or resources',async t=>{
  const repo=await fixture(t)
  repo.getRevision=async()=>{throw Error('retired format must not read a revision')}
  await assert.rejects(createExport(repo,{noteId:'0'.repeat(26),revision:'a'.repeat(64),format:'png-pages'}),{code:'export_request'})
})
