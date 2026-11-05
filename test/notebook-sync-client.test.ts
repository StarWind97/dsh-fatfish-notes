import test from 'node:test'
import assert from 'node:assert/strict'
import { NotebookSync } from '../src/client/notebook-sync.js'
import type { Api } from '../src/client/api.js'
import type { PersonalSyncState } from '../src/contracts/personal.js'

test('foreground checks remote every five minutes, deduplicates reopen, and stops when hidden',async()=>{
  let time=10_000,starts=0,reads=0
  const state:PersonalSyncState={ready:true,folder:'test',defaultFolder:'test',enabled:true,status:'idle',binding:null,lastSuccessAt:'2026-11-05T00:00:00Z',errorCode:null,error:null,pending:false}
  const call:Api=async path=>{if(path==='/personal/sync/start')starts++;else if(path==='/personal')reads++;else assert.fail(path);return {ok:true,sync:state} as never}
  const sync=new NotebookSync(call,()=>time),tick=()=>new Promise(r=>setTimeout(r,0))
  try{
    sync.foreground(true);await tick();assert.equal(starts,1)
    sync.foreground(false);sync.foreground(true);await tick();assert.equal(starts,1)
    time+=299_000;sync.tick();await tick();assert.equal(starts,1);assert.ok(reads>0)
    time+=1000;sync.tick();await tick();assert.equal(starts,2)
    sync.foreground(false);time+=300_000;sync.tick();await tick();assert.equal(starts,2)
    sync.foreground(true);await tick();assert.equal(starts,3)
    await sync.request(true);assert.equal(starts,4,'network recovery and completed edits request both directions')
  }finally{sync.dispose()}
})

test('settings watches changes while the library is unmounted, without starting repeated syncs',async()=>{
  let reads=0,starts=0
  const state:PersonalSyncState={ready:true,folder:'test',defaultFolder:'test',enabled:true,status:'idle',binding:null,lastSuccessAt:'2026-11-05T00:00:00Z',errorCode:null,error:null,pending:false}
  const sync=new NotebookSync(async path=>{if(path==='/personal')reads++;else starts++;return{ok:true,sync:{...state}} as never})
  const tick=()=>new Promise(r=>setTimeout(r,0)),stop=sync.watch()
  try{await tick();state.status='syncing';sync.tick();await tick();assert.equal(sync.getSnapshot()?.status,'syncing');state.status='idle';sync.tick();await tick();assert.equal(sync.getSnapshot()?.status,'idle');assert.equal(starts,0);stop();const before=reads;sync.tick();await tick();assert.equal(reads,before)}finally{sync.dispose()}
})
