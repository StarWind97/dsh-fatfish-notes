import test from 'node:test'
import assert from 'node:assert/strict'
import { setupFolder, pickSetupParent } from '../src/client/setup-folder.js'
import { pickHostFolder } from '../src/host/folder-picker.js'

test('parent choice appends the current cloud name on Windows and POSIX',()=>{
  assert.equal(setupFolder('E:\\CacheLogDownload\\','dsh-notes'),'E:\\CacheLogDownload\\dsh-notes')
  assert.equal(setupFolder('E:\\CacheLogDownload','renamed'),'E:\\CacheLogDownload\\renamed')
  assert.equal(setupFolder('/Users/person/Notes/','dsh-notes'),'/Users/person/Notes/dsh-notes')
  assert.equal(setupFolder('/','dsh-notes'),'/dsh-notes')
})

test('Desktop picker cancel and failure do not retry through the Host or mutate a path',async()=>{
  const globals=globalThis as typeof globalThis & {__DSH_DIRECTORY_PICKER__?:{pick():Promise<string|null>}}
  const original=globals.__DSH_DIRECTORY_PICKER__,fetch=globalThis.fetch
  let calls=0
  globalThis.fetch=async()=>{throw new Error('must not fall back')}
  try{
    globals.__DSH_DIRECTORY_PICKER__={pick:async()=>{calls++;return null}}
    assert.equal(await pickSetupParent(new AbortController().signal),null);assert.equal(calls,1)
    globals.__DSH_DIRECTORY_PICKER__={pick:async()=>{throw new Error('unavailable')}}
    await assert.rejects(pickSetupParent(new AbortController().signal),{code:'notebook_picker_failed'})
    const controller=new AbortController()
    globals.__DSH_DIRECTORY_PICKER__={pick:async()=>{controller.abort();return 'E:\\ignored'}}
    await assert.rejects(pickSetupParent(controller.signal),{name:'AbortError'})
  }finally{globalThis.fetch=fetch;if(original)globals.__DSH_DIRECTORY_PICKER__=original;else delete globals.__DSH_DIRECTORY_PICKER__}
})

test('host picker uses the composed native capability and preserves cancellation',async()=>{
  const signal=new AbortController().signal
  const service={capability:()=>({kind:'native',pick:async(s:AbortSignal)=>{assert.equal(s,signal);return 'E:\\资料'}})}
  assert.equal(await pickHostFolder(service,signal),'E:\\资料')
  assert.equal(await pickHostFolder({capability:()=>({kind:'native',pick:async()=>null})}),null)
  await assert.rejects(pickHostFolder(undefined),{code:'notebook_picker_unavailable'})
  await assert.rejects(pickHostFolder({capability:()=>({kind:'browse'})}),{code:'notebook_picker_unavailable'})
})
