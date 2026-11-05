import test from 'node:test'
import assert from 'node:assert/strict'
import { GitHubCli } from '../src/onboarding/cli.js'
import { createGitBackend } from '../src/git/backend.js'
import { syncPresentation } from '../src/client/sync-presentation.js'
import type { PersonalSyncState } from '../src/contracts/personal.js'
import type { GitSnapshot } from '../src/git/types.js'

test('a configured but temporarily inactive GitHub account is checked, not reported as logged out',async()=>{
  let response={exitCode:1,stdout:''}
  const gh=new GitHubCli({runner:async args=>args[0]==='auth'?{exitCode:0,stdout:JSON.stringify({hosts:{'github.com':[{active:false,state:'error'}]}})}:response})
  await assert.rejects(gh.account(),{code:'github_account_unavailable'})
  response={exitCode:1,stdout:'HTTP/2.0 401 Unauthorized\n\n{}'};assert.equal(await gh.account(),null)
  response={exitCode:0,stdout:'HTTP/2.0 200 OK\n\n{"login":"Alice","id":123,"type":"User"}'};assert.deepEqual(await gh.account(),{login:'Alice',id:123})
})

test('only real transport spins; pending, save, failure, and confirmed success stay distinct',()=>{
  const state:PersonalSyncState={ready:true,folder:'test',defaultFolder:'test',enabled:true,status:'idle',binding:null,lastSuccessAt:'2026-11-05T00:00:00Z',errorCode:null,error:null,pending:false}
  assert.equal(syncPresentation(null).state,'checking')
  assert.equal(syncPresentation(state,true).state,'saving')
  assert.equal(syncPresentation({...state,status:'pending',pending:true}).state,'saved')
  assert.equal(syncPresentation({...state,status:'syncing'}).state,'syncing')
  assert.equal(syncPresentation(state).state,'synced')
  assert.equal(syncPresentation({...state,lastSuccessAt:null}).state,'saved')
  assert.equal(syncPresentation({...state,status:'error',errorCode:'github_account_unavailable'}).label,'notesBackupNetwork')
  assert.equal(syncPresentation({...state,status:'error',errorCode:'personal_auth_required'}).label,'notesBackupAccount')
  assert.equal(syncPresentation({...state,status:'error',errorCode:'gh_unavailable'}).label,'syncToolMissing')
})

test('batched Git objects preserve binary boundaries and reject mismatches, truncation and limits',async()=>{
  const a='a'.repeat(40),b='b'.repeat(40),bytes=Buffer.from([0,255,10,13,128]),text=Buffer.from('正文\n')
  const valid=Buffer.concat([Buffer.from(`${a} blob ${bytes.length}\n`),bytes,Buffer.from(`\n${b} blob ${text.length}\n`),text,Buffer.from('\n')])
  let result=valid,calls=0
  const backend=createGitBackend({rootDir:process.cwd(),remote:'https://github.com/example/notes.git',runner:async(args,options)=>{calls++;assert.deepEqual(args,['cat-file','--batch']);assert.equal(options?.input,`${a}\n${b}\n`);return{stdout:'',bytes:result,exitCode:0}}})
  const snapshot:GitSnapshot={revision:a,treeSha:a,entries:new Map([['a.bin',{sha:a,mode:'100644',type:'blob'}],['b.md',{sha:b,mode:'100644',type:'blob'}]])}
  const requests=new Map([['a.bin',100],['b.md',100]])
  const files=await backend.readBatch(snapshot,requests,200);assert.deepEqual(files.get('a.bin'),bytes);assert.deepEqual(files.get('b.md'),text);assert.equal(calls,1)
  await assert.rejects(backend.readBatch(snapshot,new Map([['a.bin',2],['b.md',100]]),200),{code:'note_limit'})
  await assert.rejects(backend.readBatch(snapshot,requests,5),{code:'note_limit'})
  result=valid.subarray(0,valid.length-1);await assert.rejects(backend.readBatch(snapshot,requests,200),{code:'note_corrupt'})
  result=Buffer.from(valid);result[0]=99;await assert.rejects(backend.readBatch(snapshot,requests,200),{code:'note_corrupt'})
  snapshot.entries.get('a.bin')!.mode='120000';await assert.rejects(backend.readBatch(snapshot,requests,200),{code:'unsafe_path'})
})
