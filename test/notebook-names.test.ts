import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {NoteRepository} from '../src/notes/repository.js'
import {activeNotebook,notebookNameKey} from '../src/notes/notebooks.js'
import {ImportJob} from '../src/client/import-job.js'
import type {Api} from '../src/client/api.js'

async function fixture(t:{after(fn:()=>Promise<void>):void}){
  const dir=await mkdtemp(join(tmpdir(),'notebook-names-'));t.after(()=>rm(dir,{recursive:true,force:true}));return new NoteRepository(dir)
}
const taken={code:'notebook_name_taken'}
test('create and rename reject duplicate names without changing notebooks or note membership',async t=>{
  const repo=await fixture(t),a=await repo.saveNotebook({title:' Work ',expectedHeads:[]}),b=await repo.saveNotebook({title:'Other',expectedHeads:[]})
  const note=await repo.save({expectedHeads:[],content:{title:'note',body:'body',summary:'',tags:[],sourceId:null,assetIds:[],notebookId:b.notebookId,status:'active'}})
  const before=await repo.exportObjects()
  for(const title of ['Work',' work ','WORK']){
    await assert.rejects(repo.saveNotebook({title,expectedHeads:[]}),taken)
    await assert.rejects(repo.saveNotebook({notebookId:b.notebookId,expectedHeads:b.heads,title}),taken)
  }
  assert.deepEqual(await repo.exportObjects(),before)
  assert.deepEqual(await repo.get(note.noteId),note)
  const renamed=await repo.saveNotebook({notebookId:a.notebookId,expectedHeads:a.heads,title:'WORK'})
  assert.equal(renamed.current.title,'WORK')
  await repo.deleteNotebook(a.notebookId,renamed.heads,undefined,{removal:'move',expectedNoteCount:0})
  const replacement=await repo.saveNotebook({title:' work ',expectedHeads:[]})
  assert.notEqual(replacement.notebookId,a.notebookId)
  assert.equal((await repo.listNotebooks()).filter(activeNotebook).filter(b=>notebookNameKey(b.current.title)==='work').length,1)
})
test('serialized creates admit only one same-named notebook',async t=>{
  const repo=await fixture(t)
  const results=await Promise.allSettled(['阅读',' 阅读 '].map(title=>repo.saveNotebook({title,expectedHeads:[]})))
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1)
  assert.equal((results.find(r=>r.status==='rejected') as PromiseRejectedResult).reason.code,'notebook_name_taken')
})
test('folder import keeps existing books separate and reports unique names across retry and case variants',async t=>{
  const repo=await fixture(t),existing=await repo.saveNotebook({title:'Work',expectedHeads:[]})
  await repo.saveNotebook({title:'Work（导入）',expectedHeads:[]})
  const job=new ImportJob()
  const saved=new Map<string,PropertyDescriptor|undefined>()
  function set(name:string,value:unknown){saved.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{value,configurable:true,writable:true})}
  t.after(async()=>{try{await job.cancel()}finally{for(const [key,descriptor]of saved)descriptor?Object.defineProperty(globalThis,key,descriptor):Reflect.deleteProperty(globalThis,key)}})
  const imports:Array<{noteId:string;notebookId:string}>=[];let fail=true
  class FakeWorker{
    onmessage:((e:{data:unknown})=>void)|null=null;onerror:unknown
    postMessage(m:{id:number;action:string;noteId:string;notebookId:string}){
      let value:unknown={worker:true},error:string|undefined
      if(m.action==='scan')value={notes:['Work/a.md','Work/b.md','WORK/c.md'].map((path,i)=>({path,noteId:String(i),warnings:[],done:false})),warnings:[],bytes:3,entries:[]}
      if(m.action==='import'){if(m.noteId==='1'&&fail){error='simulated retry';fail=false}else{imports.push({noteId:m.noteId,notebookId:m.notebookId});value=[]}}
      queueMicrotask(()=>this.onmessage?.({data:{id:m.id,value,error}}))
    }
    terminate(){}
  }
  set('Worker',FakeWorker);set('location',{href:'http://127.0.0.1/'});set('indexedDB',{deleteDatabase(){}})
  const api=(async(path:string,body:any)=>{
    if(path==='/notes/import-task')return {ok:true,taskId:'task'}
    if(path==='/notes/notebook')await repo.saveNotebook(body)
    return {ok:true,notebooks:await repo.listNotebooks()}
  }) as Api
  await job.scan([],false,api);await job.run(['0','1','2'],existing.notebookId,true,false)
  const after=(await repo.listNotebooks()).filter(activeNotebook)
  assert.equal(new Set(after.map(b=>notebookNameKey(b.current.title))).size,after.length)
  assert.equal(imports.length,2);assert.ok(imports.every(n=>n.notebookId!==existing.notebookId))
  assert.ok(job.getSnapshot().report.some(r=>r.includes('Work（导入 2）')))
  await job.run(['0','1','2'],existing.notebookId,true,false)
  assert.equal((await repo.listNotebooks()).length,after.length)
  assert.equal(imports.find(n=>n.noteId==='0')!.notebookId,imports.find(n=>n.noteId==='1')!.notebookId)
})
