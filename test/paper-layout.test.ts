import test from 'node:test'
import assert from 'node:assert/strict'
import {columnPreference,columnSizes,defaultColumns,wideColumns} from '../src/client/paper/layout-state.js'

test('three columns respond to plugin width with a stable transition band',()=>{
  let wide=false
  for(const [width,expected] of [[1056,false],[1139,false],[1140,true],[1120,true],[1100,true],[1099,false],[1120,false],[1560,true]] as const){wide=wideColumns(width,wide);assert.equal(wide,expected)}
})

test('temporary space constraints preserve preferred widths and collapse choice',()=>{
  const preference={open:true,book:260,list:440}
  const tight=columnSizes(1100,preference,true),large=columnSizes(1600,preference,true)
  assert.ok(1100-tight.book-tight.list>=460)
  assert.equal(large.list,440)
  assert.equal(columnSizes(980,preference,false).expanded,false)
  assert.equal(columnSizes(1600,preference,true).expanded,true)
  assert.equal(columnSizes(1600,{...preference,open:false},true).expanded,false)
  assert.deepEqual(preference,{open:true,book:260,list:440})
})

test('column preferences tolerate unavailable, stale and malformed browser data',()=>{
  for(const raw of [null,'','oops','null','42'])assert.deepEqual(columnPreference(raw),defaultColumns)
  assert.deepEqual(columnPreference('{"open":"false","book":999,"list":2}'),{open:null,book:260,list:240})
  assert.deepEqual(columnPreference('{"open":false,"book":212,"list":344}'),{open:false,book:212,list:344})
})
