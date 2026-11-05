import test from 'node:test'
import assert from 'node:assert/strict'
import { outlineHeadings, chapterAt } from '../src/client/paper/outline.js'
import { editorOffset, editorText } from '../src/client/paper/line-endings.js'

test('outline follows Markdown structure, levels and visible heading labels',()=>{
  const body='# 一级\n\n## **二级** 与 [链接](https://example.org) `code`\n\n### 三级\n\n#### 四级\n\n##### 五级\n\n###### 六级\n\n下划线标题\n===\n\n子标题\n---\n\n> ## 引用内章节\n\n## ![图示](pic.png) 与 ~~删除线~~'
  const headings=outlineHeadings(body)
  assert.deepEqual(headings.map(h=>[h.level,h.label]),[[1,'一级'],[2,'二级 与 链接 code'],[3,'三级'],[4,'四级'],[5,'五级'],[6,'六级'],[1,'下划线标题'],[2,'子标题'],[2,'引用内章节'],[2,'图示 与 删除线']])
  for(const h of headings)assert.ok(body.slice(h.position).startsWith('#')||body.slice(h.position).startsWith(h.label))
})

test('outline excludes code, HTML and table text; handles duplicate, empty and mixed newline headings',()=>{
  const body='```md\n# 围栏内\n```\n\n    # 缩进代码\n\n| 列 |\n| -- |\n| # 表格内 |\n\n<div>\n# HTML内\n</div>\n\n## 重复\r\n\r\n## 重复\n\n###\n\n普通段落'
  const headings=outlineHeadings(body)
  assert.deepEqual(headings.map(h=>h.label),['重复','重复',''])
  assert.equal(new Set(headings.map(h=>h.position)).size,3)
  for(const h of headings)assert.equal(editorText(body).sliceString(editorOffset(body,h.position),editorOffset(body,h.position)+1),'#')
  assert.equal(chapterAt(headings,0),null)
  assert.equal(chapterAt(headings,headings[1]!.position+2),headings[1]!.position)
  assert.deepEqual(outlineHeadings('没有章节的笔记'),[])
})

test('outline offsets and labels follow edited text without persisting anything into the body',()=>{
  const before='# 起点\n\n内容\n\n## 终点',after='# 改名\n\n新增的一段内容\n\n### 插入\n\n## 终点'
  assert.deepEqual(outlineHeadings(after).map(h=>h.label),['改名','插入','终点'])
  assert.notEqual(outlineHeadings(before).at(-1)?.position,outlineHeadings(after).at(-1)?.position)
  assert.equal(after.slice(outlineHeadings(after).at(-1)!.position),'## 终点')
})
