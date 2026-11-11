import test from 'node:test'
import assert from 'node:assert/strict'
import {documentStats} from '../src/client/paper/document-stats.js'
import {codeText} from '../src/client/paper/CopyCode.js'
import {ConversationBrowse} from '../src/client/conversation-browse.js'
import type {NotebookView} from '../src/contracts/notes.js'

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
test('notebook browsing memory is isolated by repository and workspace identity, and stale books fall back',()=>{
  const store=new Map<string,string>(),storage={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>{store.set(k,v)},removeItem:(k:string)=>{store.delete(k)}}
  const books:NotebookView[]=['a','b'].map(notebookId=>({notebookId,heads:['revision'],current:{version:1,notebookId,revision:'revision',parents:[],recordedAt:'2026-11-11',title:notebookId,status:'active'},conflicts:[]}))
  const a=new ConversationBrowse(storage,1,'project-a');a.choose('b')
  assert.equal(a.initial(books,'a'),'b');assert.equal(new ConversationBrowse(storage,1,'project-b').initial(books,'a'),'a')
  assert.equal(new ConversationBrowse(storage,2,'project-a').initial(books,null),null)
  assert.equal(new ConversationBrowse(storage,1,null).initial(books,null),null)
  assert.equal(a.initial(books.slice(0,1),'a'),'a');assert.equal(a.initial([],null),null)
})
