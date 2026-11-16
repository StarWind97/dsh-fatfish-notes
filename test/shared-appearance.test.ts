import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm,readFile,writeFile,rename,mkdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {randomUUID} from 'node:crypto'
import {createServer} from 'node:http'
import {SharedAppearance} from '../src/host/appearance.js'
import {AppearancePreferences} from '../src/client/appearance-sync.js'
import {appearanceKey,defaultAppearance} from '../src/domain/appearance.js'
import {NotebookApplication} from '../src/host/application.js'
import {createHttpHandler} from '../src/host/routes.js'
import type {Api} from '../src/client/api.js'
import type {WindowTheme} from '../src/contracts/workspace.js'
const theme:WindowTheme={dark:false,background:'#fff',foreground:'#111',muted:'#666',border:'#ddd',language:'zh'}
const legacy=JSON.stringify({...defaultAppearance,layout:'soft',palette:'lilac',mode:'dark'})
async function fixture(){const dir=await mkdtemp(join(tmpdir(),'appearance-'));return {dir,store:new SharedAppearance(dir,60),async close(){await this.store.close();await rm(dir,{recursive:true,force:true})}}}
const patch=(storeId:string,value:object,operationId=randomUUID())=>({storeId,operationId,patch:value})
async function until(check:()=>boolean){for(let i=0;i<200;i++){if(check())return;await new Promise(r=>setTimeout(r,5))}assert.ok(check(),'condition did not converge')}

test('shared appearance waits for embedded migration, retains both originals, survives restart and ignores later stale caches',async()=>{
  const f=await fixture();try{
    const original=JSON.stringify(defaultAppearance)
    assert.equal((await f.store.connect('standalone',{legacy:original})).value,null)
    const state=await f.store.connect('embedded',{legacy,theme});assert.equal(state.value?.layout,'soft');assert.equal(state.value?.mode,'host')
    assert.equal((await f.store.connect('embedded',{legacy:original})).value?.layout,'soft')
    const disk=JSON.parse(await readFile(join(f.dir,'appearance.json'),'utf8'));assert.deepEqual(disk.legacy,{standalone:original,embedded:legacy})
    const restarted=new SharedAppearance(f.dir);try{const r=await restarted.connect('standalone',{legacy:null});assert.equal(r.value?.palette,'lilac');assert.equal(r.storeId,state.storeId);assert.notEqual(r.epoch,state.epoch)}finally{await restarted.close()}
  }finally{await f.close()}
})

test('concurrent patches merge fields and response-loss retries do not replay older mutations',async()=>{
  const f=await fixture();try{
    const {storeId}=await f.store.connect('embedded',{legacy})
    const first=patch(storeId,{palette:'pine'}),second=patch(storeId,{size:20})
    await Promise.all([f.store.update(first),f.store.update(second)])
    await f.store.update(patch(storeId,{palette:'rose'}))
    const r=await f.store.update(first);assert.equal(r.value?.palette,'rose');assert.equal(r.value?.size,20)
    for(const change of [{mode:'dark'},{size:900},{unknown:true},{}])await assert.rejects(f.store.update(patch(storeId,change)),{code:'appearance_invalid'})
    await assert.rejects(f.store.update(patch('other-profile',{palette:'mint'})),{code:'appearance_invalid'})
  }finally{await f.close()}
})

test('wait is notified immediately without blocking patches, theme events do not write disk, aborted waits clean up',async()=>{
  const f=await fixture();try{
    const state=await f.store.connect('embedded',{legacy,theme}),file=join(f.dir,'appearance.json'),before=await readFile(file,'utf8')
    const ctl=new AbortController(),waiting=f.store.wait('window',state,ctl.signal)
    await new Promise(r=>setTimeout(r,5));f.store.setTheme('embedded',{theme:{...theme,dark:true}})
    assert.equal((await waiting).theme?.dark,true);assert.equal(await readFile(file,'utf8'),before)
    assert.throws(()=>f.store.setTheme('standalone',{theme}),{code:'appearance_invalid'})
    const current=await f.store.connect('embedded',{legacy}),cancel=new AbortController(),pending=f.store.wait('window',current,cancel.signal)
    cancel.abort();await assert.rejects(pending,{name:'AbortError'})
    const wait=f.store.wait('window',current,new AbortController().signal);await f.store.update(patch(current.storeId,{size:18}));assert.equal((await wait).value?.size,18)
  }finally{await f.close()}
})

test('failed persistence leaves acknowledged settings intact and can retry; malformed persisted settings are never overwritten',async()=>{
  const f=await fixture();try{
    const state=await f.store.connect('embedded',{legacy}),file=join(f.dir,'appearance.json')
    await rename(file,file+'.backup');await mkdir(file)
    const update=patch(state.storeId,{palette:'pine'});await assert.rejects(f.store.update(update))
    assert.equal((await f.store.connect('embedded',{legacy})).value?.palette,'lilac')
    await rm(file,{recursive:true});await rename(file+'.backup',file);assert.equal((await f.store.update(update)).value?.palette,'pine')
    await writeFile(file,'{"version":999}');const invalid=new SharedAppearance(f.dir)
    await assert.rejects(invalid.connect('embedded',{legacy}));assert.equal(await readFile(file,'utf8'),'{"version":999}');await invalid.close()
  }finally{await f.close()}
})

function disk(raw:string){const map=new Map<string,string>([[appearanceKey,raw]]);return {getItem:(key:string)=>map.get(key)??null,setItem:(key:string,value:string)=>{map.set(key,value)},removeItem:(key:string)=>{map.delete(key)}}}
function transport(store:SharedAppearance,surface:'embedded'|'standalone',windowId:string):Api{return (async(path,body,signal)=>{
  if(path==='/appearance/connect')return store.connect(surface,body)
  if(path==='/appearance/update')return store.update(body)
  if(path==='/appearance/theme')return store.setTheme(surface,body)
  if(path==='/appearance/wait')return store.wait(windowId,body,signal!)
  throw Error('unexpected API')
}) as Api}
test('clients converge bidirectionally, retain pending failures, merge remote fields and preserve original caches',async()=>{
  const f=await fixture(),oneDisk=disk(legacy),twoDisk=disk(JSON.stringify(defaultAppearance)),one=new AppearancePreferences(oneDisk),two=new AppearancePreferences(twoDisk)
  let fail=false;const api=transport(f.store,'standalone','two')
  try{
    two.start('standalone',((path,body,signal)=>{if(fail&&path==='/appearance/update')return Promise.reject(Error('offline'));return api(path,body,signal)}) as Api,async()=>{})
    await until(()=>two.getStatus()==='waiting');one.start('embedded',transport(f.store,'embedded','one'),async()=>{})
    await until(()=>one.getStatus()==='saved'&&two.getSnapshot().palette==='lilac')
    one.set({layout:'island'});await until(()=>two.getSnapshot().layout==='island')
    two.set({size:20});await until(()=>one.getSnapshot().size===20)
    fail=true;two.set({palette:'pine'});await until(()=>two.getStatus()==='error');assert.equal(two.getSnapshot().palette,'pine')
    one.set({leading:2});await until(()=>two.getSnapshot().leading===2);assert.equal(two.getSnapshot().palette,'pine')
    fail=false;two.refresh();await until(()=>two.getStatus()==='saved'&&one.getSnapshot().palette==='pine')
    assert.equal(one.getSnapshot().leading,2);assert.equal(JSON.parse(oneDisk.getItem(appearanceKey+'.legacy')!).value,legacy)
    assert.equal(JSON.parse(twoDisk.getItem(appearanceKey+'.legacy')!).value,JSON.stringify(defaultAppearance));assert.equal(twoDisk.getItem(appearanceKey+'.pending'),null)
  }finally{one.stop();two.stop();await f.close()}
})

test('HTTP appearance endpoints require valid windows, preserve origin fences and limit request bodies',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'appearance-http-')),app=new NotebookApplication({dir});let origin=''
  const server=createServer(createHttpHandler({app,getOrigin:()=>origin}));await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`
  const request=(path:string,body:unknown,headers:Record<string,string>={})=>fetch(origin+'/dsh-fatfish-notes'+path,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)})
  try{
    assert.equal((await request('/appearance/connect',{legacy})).status,409)
    const windowId=randomUUID(),registration=await(await request('/workspace/register',{windowId,surface:'embedded'})).json() as {serviceEpoch:string}
    const headers={'x-notebook-window':windowId,'x-notebook-epoch':registration.serviceEpoch}
    assert.equal((await request('/appearance/connect',{legacy},{...headers,origin:'https://example.com'})).status,403)
    assert.equal((await request('/appearance/connect',{legacy:'x'.repeat(20_000)},headers)).status,413)
    assert.equal((await request('/appearance/connect',{legacy},headers)).status,200)
    assert.equal((await request('/appearance/wait',{epoch:'old',sequence:0},{...headers,'x-notebook-epoch':'stale'})).status,409)
  }finally{await app.close();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(dir,{recursive:true,force:true})}
})

test('pending edits survive reload and late update replies cannot override a newer remote field',async()=>{
  const f=await fixture(),local=disk(legacy);let client=new AppearancePreferences(local)
  let release:(()=>void)|undefined,held=false
  const base=transport(f.store,'embedded','one')
  const delayed:Api=(async(path,body,signal)=>{const result=await base(path,body,signal);if(path==='/appearance/update'&&!held){held=true;await new Promise<void>(r=>{release=r})}return result}) as Api
  try{
    client.start('embedded',delayed,async()=>{});await until(()=>client.getStatus()==='saved')
    client.set({palette:'pine'});await until(()=>!!release)
    const current=await f.store.connect('standalone',{legacy:null});await f.store.update(patch(current.storeId,{size:20}));await until(()=>client.getSnapshot().size===20)
    release!();await until(()=>client.getStatus()==='saved');assert.equal(client.getSnapshot().size,20)
    client.stop();client=new AppearancePreferences(local)
    const failed:Api=(async(path,body,signal)=>{if(path==='/appearance/update')throw Error('offline');return base(path,body,signal)}) as Api
    client.start('embedded',failed,async()=>{});await until(()=>client.getStatus()==='saved');client.set({palette:'rose'});await until(()=>client.getStatus()==='error');client.stop()
    client=new AppearancePreferences(local);client.start('embedded',base,async()=>{});await until(()=>client.getStatus()==='saved');assert.equal(client.getSnapshot().palette,'rose');assert.equal(client.getSnapshot().size,20)
  }finally{release?.();client.stop();await f.close()}
})
