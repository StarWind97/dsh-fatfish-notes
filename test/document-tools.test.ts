import test from 'node:test'
import assert from 'node:assert/strict'
import {documentStats} from '../src/client/paper/document-stats.js'
import {codeText} from '../src/client/paper/CopyCode.js'

test('body statistics count visible words, ignore destinations and Markdown syntax, keep inline fragments together',()=>{
  assert.deepEqual(documentStats('# 你好 **world**\n\n[知识库](https://example.com/very-long-path) ![图片说明](photo.png)\n\n`a = 1`\n\n- [x] 完成'),{words:10,characters:15})
  assert.equal(documentStats('**fat**fish\n\n| 标题 | Value |\n| --- | --- |\n| 两字 | one |').words,7)
  assert.equal(documentStats('```js\nconst x = 1;\n```').words,3)
  assert.deepEqual(documentStats('![alt](image.png)\n\n---\n\n[link]: https://example.com'),{words:0,characters:0})
})
test('copy extraction preserves highlighted code text, blank lines and tabs without Markdown fences',()=>{
  const raw='function f() {\n\treturn 1;\n\n}\n'
  assert.equal(codeText({type:'element',children:[{type:'text',value:'function '},{type:'element',children:[{type:'text',value:'f'}]},{type:'text',value:'() {\n\treturn 1;\n\n}\n'}]}),raw)
})
