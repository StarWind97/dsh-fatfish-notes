import test from 'node:test'
import assert from 'node:assert/strict'
import {ImportWorkerClient} from '../src/client/import-worker-client.js'
import type {Api} from '../src/client/api.js'

test('cancelling a worker stops preparation but waits for an already-submitted note acknowledgement',async t=>{
  const saved=new Map<string,PropertyDescriptor|undefined>()
  function set(name:string,value:unknown){saved.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{value,configurable:true,writable:true})}
  t.after(()=>{for(const [key,descriptor]of saved)descriptor?Object.defineProperty(globalThis,key,descriptor):Reflect.deleteProperty(globalThis,key)})
  let instance:FakeWorker
  class FakeWorker {
    onmessage:((event:{data:unknown})=>void)|null=null
    onerror:unknown
    terminated=false
    constructor(){instance=this}
    postMessage(m:{id:number;action:string}){if(m.action==='ping')queueMicrotask(()=>this.onmessage?.({data:{id:m.id,value:{worker:true}}}))}
    terminate(){this.terminated=true}
  }
  set('Worker',FakeWorker);set('location',{href:'http://127.0.0.1/'});set('indexedDB',{deleteDatabase(){}})
  let finish!:()=>void,received=false
  const pending=new Promise<void>(resolve=>{finish=resolve})
  const api=(async(path: string,_body:unknown,signal?:AbortSignal)=>{assert.equal(path,'/notes/save');assert.equal(signal,undefined);received=true;await pending;return {ok:true,note:{noteId:'saved-note'}}}) as Api
  const client=new ImportWorkerClient(api,()=>{})
  await client.start()
  instance!.onmessage!({data:{kind:'api',id:9,path:'/notes/save',body:{noteId:'saved-note'}}})
  assert.equal(received,true)
  let stopped=false;const cancel=client.cancel().then(()=>{stopped=true})
  await Promise.resolve();assert.equal(instance!.terminated,true);assert.equal(stopped,false)
  finish();await cancel;assert.equal(stopped,true);assert.deepEqual([...client.savedNotes],['saved-note'])
})
