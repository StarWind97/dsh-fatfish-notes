import test from 'node:test'
import assert from 'node:assert/strict'
import {standaloneAsset} from '../src/host/standalone-assets.js'
import {brandIconVersion} from '../src/host/brand-icon-version.js'
import {createHash} from 'node:crypto'

test('standalone page declares packaged SVG and correctly sized PNG favicons',async()=>{
  const page=await standaloneAsset('/')
  assert.equal(page?.type,'text/html; charset=utf-8')
  for(const size of [16,32]){
    assert.ok(page!.content.toString().includes(`href="/favicon-${size}.png?v=${brandIconVersion}"`))
    const icon=await standaloneAsset(`/favicon-${size}.png`)
    assert.equal(icon?.type,'image/png')
    assert.equal(icon!.content.subarray(0,8).toString('hex'),'89504e470d0a1a0a')
    assert.equal(icon!.content.readUInt32BE(16),size)
    assert.equal(icon!.content.readUInt32BE(20),size)
  }
  const svg=await standaloneAsset('/favicon.svg')
  assert.equal(svg?.type,'image/svg+xml; charset=utf-8')
  assert.match(svg!.content.toString(),/<rect[^>]+fill="#3F5A4E"/)
  assert.match(svg!.content.toString(),/fill="#F7F4EB"/)
  assert.doesNotMatch(svg!.content.toString(),/prefers-color-scheme|currentColor|#26362f/i)
  assert.equal(brandIconVersion,createHash('sha256').update(svg!.content.toString().replaceAll('\r\n','\n')).digest('hex').slice(0,16))
  for(const name of ['favicon.svg','favicon.ico'])assert.ok(page!.content.toString().includes(`href="/${name}?v=${brandIconVersion}"`))
})

test('standalone resource lookup does not turn URL paths into filesystem paths',async()=>{
  for(const path of ['/assets/brand/favicon.svg','/favicon.svg/extra','/../package.json','/%2e%2e/package.json','/favicon.svg?ignored','/constructor','/__proto__','/favicon.ico/extra']){
    assert.equal(await standaloneAsset(path),undefined,path)
  }
})

test('Windows icon fallback contains valid PNG frames through 256 pixels',async()=>{
  const icon=await standaloneAsset('/favicon.ico'),b=icon!.content
  assert.equal(icon?.type,'image/vnd.microsoft.icon')
  assert.equal(b.readUInt16LE(0),0);assert.equal(b.readUInt16LE(2),1)
  const sizes=[]
  for(let i=0;i<b.readUInt16LE(4);i++){
    const p=6+i*16,size=b[p]||256,offset=b.readUInt32LE(p+12),length=b.readUInt32LE(p+8)
    assert.equal(b[p+1]||256,size);assert.ok(offset>=6+16*b.readUInt16LE(4));assert.ok(offset+length<=b.length)
    const png=b.subarray(offset,offset+length)
    assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a')
    assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);sizes.push(size)
  }
  assert.deepEqual(sizes,[16,32,48,64,128,256])
})
