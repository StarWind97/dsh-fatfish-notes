import test, {type TestContext} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm,readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {NoteRepository} from '../src/notes/repository.js'
import {revisionContent} from '../src/notes/conflicts.js'
import {markFolder} from '../src/private-workspace/folder.js'
import {copyForMove} from '../src/private-workspace/move.js'
import {validNotesResponse} from '../src/client/notes-validation.js'
import type {TagChange} from '../src/contracts/tag-management.js'
import type {NoteContent} from '../src/contracts/notes.js'
const merge:TagChange={source:'访谈',target:'用户访谈',mode:'rename'}
const remove:TagChange={source:'访谈',target:null,mode:'remove'}
async function fixture(t:TestContext){
  const dir=await mkdtemp(join(tmpdir(),'fatfish-tags-'))
  let fault:(path:string)=>void=()=>{}
  const repo=new NoteRepository(dir,{beforeWrite:path=>fault(path)})
  t.after(async()=>{repo.close();await rm(dir,{recursive:true,force:true})})
  const book=await repo.saveNotebook({title:'另一本',expectedHeads:[]})
  const save=async(title:string,tags:string[],notebookId:string|null=null)=>{
    const content:NoteContent={title,tags,notebookId,body:'正文含 #访谈',summary:'摘要',status:'active',sourceId:null,assetIds:[]}
    return repo.save({expectedHeads:[],content})
  }
  const a=await save('一',['访谈','用户访谈','其他']),b=await save('二',['访谈'],book.notebookId)
  const preview=async(change:TagChange)=>(await repo.tagManagement({...change,action:'preview'})).preview!
  return {repo,dir,a,b,save,preview,fault:(f:(path:string)=>void)=>{fault=f}}
}
test('global tag preview spans notebooks, merges a rename collision, and undo restores the distinct original tags',async t=>{
  const {repo,a,b,save,preview}=await fixture(t),trash=await save('回收站',['访谈'])
  await repo.trash(trash.noteId,trash.heads)
  const p=await preview(merge)
  assert.equal(p.mode,'merge');assert.equal(p.rows.length,2);assert.equal(new Set(p.rows.map(r=>r.notebookId)).size,2)
  assert.equal(p.rows.filter(r=>r.before.includes('用户访谈')).length,1)
  const req={...merge,action:'apply',token:p.token}
  assert.ok(validNotesResponse('/notes/tags',await repo.tagManagement(req)))
  const after=(await repo.get(a.noteId)).current
  assert.deepEqual(after.tags,['其他','用户访谈']);assert.equal(after.body,a.current.body)
  assert.equal((await repo.get(trash.noteId)).current.tags.includes('访谈'),true)
  await repo.tagManagement(req);assert.equal((await repo.get(a.noteId)).current.revision,after.revision)
  await repo.tagManagement({action:'undo',token:p.token})
  for(const n of [a,b])assert.deepEqual(revisionContent((await repo.get(n.noteId)).current),revisionContent(n.current))
  assert.deepEqual((await repo.getRevision(a.noteId,a.current.revision)).tags,a.current.tags)
})
test('a new match, a target collision, an active editor and edits after preview are checked before any write',async t=>{
  const {repo,a,b,save,preview}=await fixture(t)
  const change={...merge,target:'尚未使用'}
  let p=await preview(change)
  await save('旧名后来被使用',['访谈'])
  const apply=()=>repo.tagManagement({...change,action:'apply',token:p.token})
  await assert.rejects(apply,{code:'tag_changed'})
  p=await preview(change);await save('新名称后来被使用',[change.target]);await assert.rejects(apply,{code:'tag_changed'})
  p=await preview(change)
  repo.editGuard=ids=>{if(ids.includes(b.noteId))throw Object.assign(new Error(),{code:'note_edit_busy'})}
  await assert.rejects(apply,{code:'note_edit_busy'});repo.editGuard=()=>{}
  await repo.save({noteId:b.noteId,expectedHeads:b.heads,content:{...revisionContent(b.current),body:'后来写的内容'}})
  await assert.rejects(apply,{code:'tag_changed'});assert.equal((await repo.get(a.noteId)).current.revision,a.current.revision)
})
test('interrupted projection survives restart and a replay finishes only outstanding revisions, including undo',async t=>{
  const {repo,dir,a,b,preview,fault}=await fixture(t)
  const p=await preview(remove),first=p.rows[0]!.noteId
  fault(path=>{if(path==='documents/'+first+'.md')throw Error('interrupted')})
  await assert.rejects(repo.tagManagement({...remove,action:'apply',token:p.token}),/interrupted/)
  const second=new NoteRepository(dir);t.after(()=>second.close())
  const snapshot=async()=>(await second.tagManagement({action:'status'})).receipt!
  assert.equal((await snapshot()).rows.filter(r=>r.completed).length,1)
  await second.tagManagement({action:'resume',token:p.token})
  assert.equal((await snapshot()).phase,'done')
  assert.match(await readFile(join(dir,'notes','documents',first+'.md'),'utf8'),new RegExp((await second.get(first)).current.revision))
  await assert.rejects(repo.tagManagement({action:'undo',token:p.token}),/interrupted/)
  assert.equal((await snapshot()).phase,'undoing')
  await second.tagManagement({action:'resume',token:p.token})
  assert.equal((await snapshot()).phase,'undone')
  for(const n of [a,b])assert.deepEqual((await second.get(n.noteId)).current.tags,n.current.tags)
})
test('keeping a partially completed result limits undo to the finished notes and later edits remain protected',async t=>{
  const {repo,preview,fault}=await fixture(t)
  const p=await preview(remove),last=p.rows[1]!.noteId
  fault(path=>{if(path.startsWith('revisions/'+last+'/'))throw Error('interrupted')})
  await assert.rejects(repo.tagManagement({...remove,action:'apply',token:p.token}))
  fault(()=>{})
  const stop=await repo.tagManagement({action:'finish',token:p.token})
  assert.equal(stop.receipt!.rows.length,1)
  const n=await repo.get(p.rows[0]!.noteId)
  await repo.save({noteId:n.noteId,expectedHeads:n.heads,content:{...revisionContent(n.current),title:'后来手动改名'}})
  await assert.rejects(repo.tagManagement({action:'undo',token:p.token}),{code:'tag_changed'})
  assert.equal((await repo.get(n.noteId)).current.title,'后来手动改名')
  assert.ok((await repo.get(last)).current.tags.includes('访谈'))
})

test('an offline library move preserves undo and only formal changes travel to a second library',async t=>{
  const {repo,dir,a,b,preview}=await fixture(t)
  const outer=await mkdtemp(join(tmpdir(),'fatfish-tags-move-'))
  const movedDir=join(outer,'moved'),peer=new NoteRepository(join(outer,'peer'))
  t.after(async()=>{peer.close();await rm(outer,{recursive:true,force:true})})
  const p=await preview(merge)
  await repo.tagManagement({...merge,action:'apply',token:p.token})
  await peer.importObjects(await repo.exportObjects())
  assert.deepEqual((await peer.get(b.noteId)).current.tags,['用户访谈'])
  assert.equal((await peer.tagManagement({action:'status'})).receipt,null)
  await markFolder({repositoryId:123,folder:dir,ownerId:123})
  await copyForMove(dir,dir,movedDir,123,new AbortController().signal)
  const moved=new NoteRepository(movedDir)
  try {
    await moved.tagManagement({action:'undo',token:p.token})
    await peer.importObjects(await moved.exportObjects())
    for(const n of [a,b])assert.deepEqual((await peer.get(n.noteId)).current.tags,n.current.tags)
  } finally {moved.close()}
})
