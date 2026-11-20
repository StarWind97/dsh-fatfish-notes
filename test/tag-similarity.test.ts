import assert from 'node:assert/strict'
import test from 'node:test'
import {similarCandidates} from '../src/client/tag-similarity.js'
import {translate} from '../src/client/locale.js'

test('merge suggestions rank alternate spellings before internal separators and preserve meaningful punctuation',()=>{
  const entries=['AI 工具','AI工具','ＡＩ 工具','ai-工具','工 具','C','C++','C#','-1','1']
    .map((tag,i)=>({tag,count:i+1}))
  const similar=(name:string)=>similarCandidates(entries,name,translate)
  assert.deepEqual(similar('AI 工具').map(x=>x.entry.tag),['ＡＩ 工具','AI工具','ai-工具'])
  assert.equal(similar('AI 工具')[1]?.match.reason,'空格不同')
  for(const name of ['C','C++','C#','-1','1'])assert.deepEqual(similar(name),[])
})
