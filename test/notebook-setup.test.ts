import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp,rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createServer } from 'node:http'
import { createApplication } from '../src/host/application.js'
import { createHttpHandler } from '../src/host/routes.js'
import { GitHubCli } from '../src/onboarding/cli.js'

test('fresh host gates HTTP, capture and tool writes, and reports missing tools independently',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'notes-onboard-'))
  let picks=0
  const app=await createApplication({dir,pickFolder:async()=>{picks++;return null},personal:{gateway:{available:async()=>false,account:async()=>null,repository:async()=>null,createPrivate:async()=>assert.fail()},gitRunner:async()=>{throw Error('no git')}}})
  let origin=''
  const server=createServer((req,res)=>void createHttpHandler({app,getOrigin:()=>origin})(req,res))
  try {
    await new Promise<void>(done=>server.listen(0,'127.0.0.1',done))
    const address=server.address();assert.ok(address && typeof address!=='string')
    origin='http://127.0.0.1:'+address.port
    const post=(path:string)=>fetch(origin+'/dsh-fatfish-notes'+path,{method:'POST',headers:{'content-type':'application/json'},body:'{}'})
    for(const route of ['/notes','/notes/save','/notes/capture','/notes/notebook','/notes/image']){
      assert.equal((await (await post(route)).json()).code,'notebook_setup_required')
    }
    await assert.rejects(app.notes.submitCandidate({},undefined),{code:'notebook_setup_required'})
    assert.equal((await (await post('/personal')).json()).sync.ready,false)
    const tools=await (await post('/personal/sync/tools')).json()
    assert.equal(tools.git,false);assert.equal(tools.gh,false);assert.equal(tools.account,null)
    assert.equal((await fetch(origin+'/dsh-fatfish-notes/personal/folder/pick')).status,405)
    assert.equal((await fetch(origin+'/dsh-fatfish-notes/personal/folder/pick',{method:'POST',headers:{'content-type':'application/json',origin:'https://elsewhere.example'},body:'{}'})).status,403)
    assert.equal(picks,0)
    assert.deepEqual(await (await post('/personal/folder/pick')).json(),{ok:true,folder:null});assert.equal(picks,1)
  } finally {server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await app.close();await rm(dir,{recursive:true,force:true})}
})

test('browser login exposes only the device code and supports chunked CLI output',async()=>{
  const seen:string[]=[]
  const gh=new GitHubCli({runner:async(args,options)=>{
    assert.deepEqual(args,['auth','login','--hostname','github.com','--git-protocol','https','--web'])
    options?.onOutput?.('First copy the code: ABCD-');options?.onOutput?.('1234\n')
    return {exitCode:0,stdout:''}
  }})
  await gh.login(code=>seen.push(code),new AbortController().signal);assert.deepEqual(seen,['ABCD-1234'])
})
