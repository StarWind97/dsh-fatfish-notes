import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {BacklinkIndex} from '../src/notes/backlinks.js'
import {NoteRepository} from '../src/notes/repository.js'
import {createNoteRevision,materializeNote} from '../src/notes/revisions.js'
import type {NoteContent} from '../src/contracts/notes.js'
const id=(n:number)=>String(n).padStart(26,'0'),target=id(1)
const content:NoteContent={title:'引用',body:'正文',summary:'',tags:[],notebookId:null,status:'active',sourceId:null,assetIds:[]}
const body=`[一次](fatfish-note:${target}) [再次](fatfish-note:${target})`
function view(n:number,extra:Partial<NoteContent>={}){const row=createNoteRevision({...content,body,...extra,version:1,noteId:id(n),parents:[],recordedAt:'2026-11-13T00:00:00.000Z'});return materializeNote([row],row.noteId)}

test('reverse links retain all sources above one page and update only from current active non-template content',()=>{
  const index=new BacklinkIndex(),views=Array.from({length:108},(_,i)=>view(i+2))
  index.update([...views,view(1),view(120,{isTemplate:true}),view(121,{status:'trashed'}),view(122,{body:`\`[code](fatfish-note:${target})\``})])
  assert.equal(index.get(target).length,108)
  index.update([view(2,{body:'removed'}),view(3,{status:'trashed'}),view(4,{title:'renamed'}),view(5,{isTemplate:true})])
  assert.deepEqual(index.get(target).map(v=>[v.noteId,v.current.title]),[[id(4),'renamed']])
  index.update([view(3)])
  assert.deepEqual(index.get(target).map(v=>v.noteId),[id(3)])
  index.update([]);assert.deepEqual(index.get(target),[])
})

test('repository backlink pages preserve exact totals and invalidate after other notes change, trash, restore and directory switch',async t=>{
  const root=await mkdtemp(join(tmpdir(),'fatfish-backlinks-')),repo=new NoteRepository(root)
  t.after(async()=>{repo.close();await rm(root,{recursive:true,force:true})})
  await repo.save({noteId:target,expectedHeads:[],content})
  let source=await repo.save({noteId:id(2),expectedHeads:[],content:{...content,body}})
  assert.equal((await repo.backlinkPage(target)).total,1)
  for(let i=3;i<=13;i++)await repo.save({noteId:id(i),expectedHeads:[],content:{...content,body}})
  const all:string[]=[];let cursor:string|undefined
  do{const page=await repo.backlinkPage(target,{limit:5,...(cursor?{cursor}:{})});assert.equal(page.total,12);all.push(...page.items.map(n=>n.noteId));cursor=page.cursor??undefined}while(cursor)
  assert.equal(new Set(all).size,12)
  source=await repo.trash(id(2),source.heads);assert.equal((await repo.backlinkPage(target)).total,11)
  source=await repo.restore(id(2),source.heads);assert.equal((await repo.backlinkPage(target)).total,12)
  await repo.save({noteId:id(2),expectedHeads:source.heads,content:{...content,body:'link removed'}})
  assert.equal((await repo.backlinkPage(target)).total,11)
  repo.useDirectory(join(root,'another'))
  await repo.save({noteId:target,expectedHeads:[],content})
  assert.equal((await repo.backlinkPage(target)).total,0)
})
