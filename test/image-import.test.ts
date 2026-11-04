import test from 'node:test'
import assert from 'node:assert/strict'
import { publicImageTarget, isPublicAddress, importImage } from '../src/media/import.js'
test('image import rejects private, mapped, credentials, non-HTTPS and mixed DNS results',async()=>{
  for(const address of ['127.0.0.1','10.0.0.1','172.16.1.2','192.168.0.1','169.254.169.254','100.64.0.1','0.0.0.0','::1','::ffff:127.0.0.1','fc00::1','fe80::1'])assert.equal(isPublicAddress(address),false,address)
  assert.equal(isPublicAddress('8.8.8.8'),true)
  for(const url of ['http://example.com/x','https://user:pass@example.com/x','https://localhost/x','https://127.0.0.1/x','https://example.com:444/x'])await assert.rejects(publicImageTarget(url,async()=>[{address:'8.8.8.8',family:4}]),{code:'unsafe_image_url'})
  await assert.rejects(publicImageTarget('https://example.com/x',async()=>[{address:'8.8.8.8',family:4},{address:'10.0.0.1',family:4}]),{code:'unsafe_image_url'})
})
test('image import cancellation also interrupts pending DNS lookup',async()=>{
 const controller=new AbortController();let lookedUp!:()=>void;const started=new Promise<void>(resolve=>{lookedUp=resolve})
 const pending=importImage('https://example.com/x',controller.signal,{lookup:()=>{lookedUp();return new Promise(()=>{})}});await started;controller.abort();await assert.rejects(pending,{code:'aborted'})
})
test('image import checks every redirect and does not request private destination',async()=>{
  let requests=0
  await assert.rejects(importImage('https://example.com/x',undefined,{lookup:async()=>[{address:'8.8.8.8',family:4}],request:async()=>{requests++;return{status:302,location:'https://127.0.0.1/private',mediaType:'',bytes:Buffer.alloc(0)}}}),{code:'unsafe_image_url'})
  assert.equal(requests,1)
})
