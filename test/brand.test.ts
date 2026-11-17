import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {BrandMark,BrandSignature} from '../src/client/Brand.js'

const paths=(svg:string)=>[...svg.matchAll(/ d="([^"]+)"/g)].map(m=>m[1])

test('display sizes select the approved review geometry for both mono and color',async()=>{
  const review=new URL('../docs/brand/reviews/2026-11-17-tail-d123-v2/candidates/',import.meta.url)
  for(const [size,variant] of [[16,'d2'],[17,'d2'],[18,'d1'],[20,'d1'],[24,'d1'],[27,'d1'],[28,'c0'],[29,'original'],[32,'original'],[64,'original']] as const){
    const expected=await readFile(new URL(`${variant}-colorLight.svg`,review),'utf8')
    for(const color of [false,true]){
      const html=renderToStaticMarkup(createElement(BrandMark,{size,color}))
      assert.match(html,/viewBox="0 0 800 560"/)
      assert.deepEqual(paths(html),paths(expected),`${size} px ${color?'color':'mono'}`)
      assert.match(html,color?/#B7C9B3/:/fill="currentColor"/)
    }
  }
})

test('native icon stays D1 while the app listing and full brand retain the original',async()=>{
  const read=(name:string)=>readFile(new URL('../'+name,import.meta.url),'utf8')
  const d1=await read('docs/brand/reviews/2026-11-17-tail-d123-v2/candidates/d1-tile.svg')
  assert.deepEqual(paths(await read('assets/brand/favicon.svg')),paths(d1))
  assert.equal(await read('icon.svg'),await read('assets/brand/fatfish-icon-dark.svg'))
  const signature=renderToStaticMarkup(createElement(BrandSignature))
  assert.deepEqual(paths(signature),paths(await read('assets/brand/fatfish-brand-square-light.svg')))
})

test('colored brand and signature use the unified ink without replacing outlined lettering',()=>{
  for(const html of [renderToStaticMarkup(createElement(BrandMark,{color:true})),renderToStaticMarkup(createElement(BrandSignature))]){
    assert.match(html,/var\(--fatfish-brand-ink, #3F5A4E\)/)
    assert.doesNotMatch(html,/#26362f|<text\b|<image\b|<script\b/i)
  }
})
