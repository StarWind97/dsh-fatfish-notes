import test from 'node:test'
import assert from 'node:assert/strict'
import {presentationAt,presentationChange} from '../src/client/paper/image-presentation.js'

const url='../assets/'+'a'.repeat(64)+'.png'
test('presentation switches only the chosen occurrence and preserves link text, title and surrounding Markdown',()=>{
 const body=`前文\r\n![图\\[一\\]](<${url}> "说明")\r\n\r\n![另一处](${url})`
 const item=presentationAt(body,8)!
 assert.equal(item.image,true)
 const change=presentationChange(item,false)
 const result=body.slice(0,change.from)+change.insert+body.slice(change.to)
 assert.equal(result,`前文\r\n[图\\[一\\]](<${url}> "说明")\r\n\r\n![另一处](${url})`)
 assert.equal(presentationChange(presentationAt(result,8)!,true).insert,`![图\\[一\\]](<${url}> "说明")`)
})
test('shared reference definitions remain unchanged; code and arbitrary URLs are not presentation targets',()=>{
 const body=`[**相片**][img]\n\n![第二处][img]\n\n[img]: ${url} "标题"\n\n\`![代码](${url})\`\n\n[网页](https://example.com/a.png)`
 const item=presentationAt(body,3)!
 assert.equal(item.url,url)
 const c=presentationChange(item,true)
 assert.equal(c.insert,`![**相片**](<${url}> "标题")`)
 assert.equal(body.slice(c.to).includes('![第二处][img]'),true)
 assert.equal(presentationAt(body,body.indexOf('代码')),null)
 assert.equal(presentationAt(body,body.indexOf('网页')),null)
})
