import test from 'node:test'
import assert from 'node:assert/strict'
import { ChangeSet } from '@codemirror/state'
import { editorText, editorOffset, sourceOffset, applyEditorChanges } from '../src/client/paper/line-endings.js'
import { searchNotes } from '../src/notes/search.js'
import { createNoteRevision, materializeNote } from '../src/notes/revisions.js'

test('paper anchors and local edits preserve old CRLF and mixed Markdown line endings',()=>{
  const source='甲\r\n\r\n乙\n尾', doc=editorText(source)
  const pos=editorOffset(source,source.indexOf('乙'))
  assert.equal(doc.sliceString(pos,pos+1),'乙')
  assert.equal(sourceOffset(source,pos),source.indexOf('乙'))
  const changes=ChangeSet.of({from:pos,to:pos+1,insert:'新\n行'},doc.length)
  assert.equal(applyEditorChanges(source,changes),'甲\r\n\r\n新\r\n行\n尾')
  assert.equal(editorOffset(source,source.length),doc.length)
})
test('paper summaries use display text and recent ordering pages independently of ULID order',()=>{
  const views=['01K00000000000000000000000','01K00000000000000000000001'].map((noteId,i)=>materializeNote([createNoteRevision({version:1,noteId,parents:[],recordedAt:`2026-11-0${i+1}T09:00:00.000Z`,title:'标题',body:'**文本** [说明](https://example.org/private) ![图片](../assets/secret.png)',summary:'',tags:[],notebookId:null,sourceId:null,status:'active',assetIds:[]})],noteId))
  const first=searchNotes(views,{order:'recent',limit:1})
  assert.equal(first.items[0]?.noteId,views[1]?.noteId)
  assert.equal(first.items[0]?.excerpt,'文本 说明 图片')
  assert.deepEqual(searchNotes(views,{order:'recent',cursor:first.cursor!,limit:1}).items.map(n=>n.noteId),[views[0]!.noteId])
})
