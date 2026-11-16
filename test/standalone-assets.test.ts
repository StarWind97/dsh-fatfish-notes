import test from 'node:test'
import assert from 'node:assert/strict'
import {standaloneAsset} from '../src/host/standalone-assets.js'

test('standalone page declares packaged SVG and correctly sized PNG favicons',async()=>{
  const page=await standaloneAsset('/')
  assert.equal(page?.type,'text/html; charset=utf-8')
  for(const size of [16,32]){
    assert.ok(page!.content.toString().includes(`href="/favicon-${size}.png"`))
    const icon=await standaloneAsset(`/favicon-${size}.png`)
    assert.equal(icon?.type,'image/png')
    assert.equal(icon!.content.subarray(0,8).toString('hex'),'89504e470d0a1a0a')
    assert.equal(icon!.content.readUInt32BE(16),size)
    assert.equal(icon!.content.readUInt32BE(20),size)
  }
  const svg=await standaloneAsset('/favicon.svg')
  assert.equal(svg?.type,'image/svg+xml; charset=utf-8')
  assert.match(svg!.content.toString(),/prefers-color-scheme:dark/)
  assert.ok(page!.content.toString().includes('href="/favicon.svg"'))
})

test('standalone resource lookup does not turn URL paths into filesystem paths',async()=>{
  for(const path of ['/assets/brand/favicon.svg','/favicon.svg/extra','/../package.json','/%2e%2e/package.json','/favicon.svg?ignored','/constructor','/__proto__','/favicon.ico']){
    assert.equal(await standaloneAsset(path),undefined,path)
  }
})
