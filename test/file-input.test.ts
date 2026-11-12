import test from 'node:test'
import assert from 'node:assert/strict'
import {transferFiles,inlineImageType,needsFileConfirmation} from '../src/client/paper/file-input.js'
import {ATTACHMENT_WARNING} from '../src/contracts/notes.js'

test('file transfers keep mixed file order without duplicating items exposed twice',()=>{
  const files=[new File(['text'],'a.txt',{type:'text/plain'}),new File(['image'],'b.png',{type:'image/png'}),new File(['data'],'c.pdf')]
  const items=files.map(f=>({kind:'file',getAsFile:()=>f}))
  assert.deepEqual(transferFiles({files,items} as unknown as DataTransfer),files)
  assert.deepEqual(transferFiles({files:[],items:[{kind:'string'},...items,{kind:'file',getAsFile:()=>null}]} as unknown as DataTransfer),files)
})
test('Explorer image filenames work with empty MIME, non-preview formats stay ordinary files',()=>{
  for(const name of ['截图.PNG','photo.JPEG','a.webp','a.gif'])assert.ok(inlineImageType({name,type:''}))
  for(const name of ['a.svg','a.heic','a.pdf','a.txt'])assert.equal(inlineImageType({name,type:''}),undefined)
  assert.equal(inlineImageType({name:'image',type:'image/png'}),'image/png')
  assert.equal(inlineImageType({name:'a.png',type:'application/pdf'}),undefined)
})
test('ordinary mixed batches are immediate; existing large-file warning remains',()=>{
  assert.equal(needsFileConfirmation([{size:68},{size:72}]),false)
  assert.equal(needsFileConfirmation([{size:ATTACHMENT_WARNING}]),false)
  assert.equal(needsFileConfirmation([{size:68},{size:ATTACHMENT_WARNING+1}]),true)
})
