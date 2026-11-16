import test from 'node:test'
import assert from 'node:assert/strict'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {BrandMark,BrandSignature} from '../src/client/Brand.js'

test('micro and large brand slots preserve their distinct approved geometry',()=>{
  for(const size of [16,17,20,28,32]){
    const mono=renderToStaticMarkup(createElement(BrandMark,{size})),color=renderToStaticMarkup(createElement(BrandMark,{size,color:true}))
    assert.match(mono,/viewBox="0 0 24 24"/);assert.match(color,/viewBox="0 0 24 24"/)
    assert.match(mono,/fill="currentColor"/);assert.match(color,/#809D7B/)
    assert.deepEqual([...mono.matchAll(/ d="([^"]+)"/g)].map(m=>m[1]),[...color.matchAll(/ d="([^"]+)"/g)].map(m=>m[1]))
  }
  assert.match(renderToStaticMarkup(createElement(BrandMark,{size:64,color:true})),/viewBox="0 0 800 560"/)
})

test('colored brand and signature use the unified ink without replacing outlined lettering',()=>{
  for(const html of [renderToStaticMarkup(createElement(BrandMark,{color:true})),renderToStaticMarkup(createElement(BrandSignature))]){
    assert.match(html,/var\(--fatfish-brand-ink, #3F5A4E\)/)
    assert.doesNotMatch(html,/#26362f|<text\b|<image\b|<script\b/i)
  }
})
