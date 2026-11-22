import assert from 'node:assert/strict'
import {existsSync,readFileSync,readdirSync} from 'node:fs'
import {dirname,join} from 'node:path'
import {test} from 'node:test'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import ts from 'typescript'
import {CaptureMetadata} from '../src/client/CaptureMetadata.js'
import {captureRangeLabel} from '../src/client/capture-turns.js'
import {BrandSignature} from '../src/client/Brand.js'
import {HandbookHelp} from '../src/client/HandbookHelp.js'
import {AppearanceFields} from '../src/client/paper/appearance.js'
import {NoteCaptureBridge} from '../src/client/note-capture-bridge.js'
import {standaloneAsset} from '../src/host/standalone-assets.js'
import {projectTranscript} from '../src/host/note-conversation.js'
import type {SessionWireEvent} from '@deepseek-ai/dsh-api-session-controller'
import type {NotebookView} from '../src/contracts/notes.js'
import {DEFAULT_NOTEBOOK_ID,DEFAULT_NOTEBOOK_TITLE,editedNotebookTitle,notebookTitle} from '../src/notes/notebooks.js'
import {dictionaries,resolveLanguage,translator} from '../src/domain/localization.js'

const hasHan = /\p{Script=Han}/u
const read = (path:string) => readFileSync(path,'utf8')

function variables(value:string):string[]{
  // Double braces describe note template syntax, independent of UI interpolation.
  return [...value.replace(/\{\{[^{}]+\}\}/g,'').matchAll(/\{([^{}]+)\}/g)].map(match=>match[1]!).sort()
}

test('Chinese and English catalogs have unique keys, complete text and matching runtime variables',()=>{
  const {zh,en}=dictionaries
  assert.deepEqual(Object.keys(zh).sort(),Object.keys(en).sort())
  for(const language of ['zh','en'] as const){
    const file=ts.parseJsonText('locale/'+language+'.json',read('locale/'+language+'.json'))
    const statement=file.statements[0]
    assert.ok(statement&&ts.isExpressionStatement(statement)&&ts.isObjectLiteralExpression(statement.expression))
    const keys=statement.expression.properties.map(property=>property.name?.getText(file))
    assert.equal(new Set(keys).size,keys.length)
  }
  for(const key of Object.keys(zh) as Array<keyof typeof zh>){
    assert.ok(zh[key].trim()&&en[key].trim(),key)
    assert.ok(!hasHan.test(en[key]),'Chinese copy in the English catalog: '+key)
    assert.deepEqual(variables(zh[key]),variables(en[key]),'Mismatched variables: '+key)
  }
  assert.equal(resolveLanguage('zh-CN'),'zh')
  assert.equal(resolveLanguage('en-US'),'en')
  assert.equal(translator('en')('sidebarSelectedCount',{count:2}),'2 selected')
  assert.equal(translator('en')('classBooksCount',{count:1}),'1 notebook')
  assert.equal(translator('en')('classBooksCount',{count:2}),'2 notebooks')
  assert.equal(captureRangeLabel(translator('en'),1,2),'1 turn · 2 messages selected')
  assert.equal(captureRangeLabel(translator('zh'),1,2),'已选 1 轮 · 2 条消息')
  assert.match(translator('en')('reuseVariables'),/\{\{date\}\}/)
})

test('capture, appearance, help and the independent window use the effective language',async()=>{
  const bridge=new NoteCaptureBridge()
  const state={metadata:{title:'Example',summary:'',tags:[]},suggesting:true}
  const en=translator('en'),zh=translator('zh')
  const localized=(t:typeof en)=>[
    renderToStaticMarkup(createElement(CaptureMetadata,{bridge,state,t})),
    renderToStaticMarkup(createElement(AppearanceFields,{group:'appearance',t})),
    renderToStaticMarkup(createElement(HandbookHelp,{t})),
    renderToStaticMarkup(createElement(BrandSignature,{t})),
  ].join('\n')
  try{
    const english=localized(en)
    for(const word of ['Note details','Generating suggestions','Palette','Pine green','Open user handbook'])assert.ok(english.includes(word),word)
    assert.doesNotMatch(english,hasHan)
    assert.match(english,/fatfish-signature-text.*Fatfish Notes/)
    assert.match(localized(zh),/笔记信息/)
    const bootstrap=(await standaloneAsset('/','en'))?.content.toString()
    assert.match(bootstrap??'',/<html lang="en">/)
    assert.match(bootstrap??'',/Connecting to the note library/)
    assert.doesNotMatch(bootstrap??'',hasHan)
  }finally{bridge.dispose()}
})

test('capture translates generated material names and preserves user-authored text and filenames',()=>{
  const attachment={attachmentId:'sha256:'+'1'.repeat(64),mediaType:'image/png',bytes:100,width:10,height:10}
  const original='请保留原文。'
  const input=[{type:'user/message',seq:2,time:0,surfaceOp:'append',data:{id:'message',source:{kind:'user'},content:[
    {type:'text',text:original},{type:'image',attachment},{type:'image',attachment:{...attachment,name:'我的图片.png'}},
    {type:'file',attachment:{attachmentId:'sha256:'+'2'.repeat(64),bytes:5}},
  ]}}] as SessionWireEvent[]
  const en=projectTranscript(input,translator('en')),zh=projectTranscript(input,translator('zh'))
  assert.deepEqual(en.materials?.map(material=>material.name),['Conversation image.png','我的图片.png','Attachment'])
  assert.deepEqual(zh.materials?.map(material=>material.name),['会话图片.png','我的图片.png','附件'])
  assert.deepEqual(en.messages[0]!.blocks[0],{type:'text',text:original})
  assert.equal(en.messages[0]!.blocks[3]?.type==='text'&&en.messages[0]!.blocks[3].text,'[Uploaded file: Attachment]')
})

test('the built-in notebook has localized labels and keeps its stored title on an unchanged edit',()=>{
  const en=translator('en')
  const book={notebookId:DEFAULT_NOTEBOOK_ID,current:{title:DEFAULT_NOTEBOOK_TITLE}} as NotebookView
  assert.equal(notebookTitle(book,en),'Default notebook')
  assert.equal(editedNotebookTitle(book,'Default notebook',en),DEFAULT_NOTEBOOK_TITLE)
  assert.equal(editedNotebookTitle(book,'My notes',en),'My notes')
  const named={...book,notebookId:'another-book'}
  assert.equal(notebookTitle(named,en),DEFAULT_NOTEBOOK_TITLE)
})

function sourceFiles(path:string):string[]{
  return readdirSync(path,{withFileTypes:true}).flatMap(entry=>{
    const file=join(path,entry.name)
    return entry.isDirectory()?sourceFiles(file):/\.(?:ts|tsx)$/.test(file)?[file.replaceAll('\\','/')]:[]
  })
}

test('client UI uses catalog keys for visible text and names',()=>{
  const problems:string[]=[]
  const allowedTerms=new Set(['Git','GitHub','GitHub CLI','DSH','Markdown','PDF','PNG','SVG','ZIP','MiB','KiB','px','AI'])
  const accessible=new Set(['alt','aria-label','label','placeholder','title'])
  for(const path of sourceFiles('src/client')){
    const file=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true)
    const visit=(node:ts.Node)=>{
      let value:string|undefined
      if(ts.isJsxText(node))value=node.text.trim()
      if(ts.isStringLiteralLike(node)&&ts.isJsxAttribute(node.parent)&&accessible.has(node.parent.name.getText(file)))value=node.text.trim()
      const badVisible=value&&/\p{L}/u.test(value)&&!allowedTerms.has(value)
      const badChinese=ts.isStringLiteralLike(node)&&hasHan.test(node.text)&&
        !(path==='src/client/paper/appearance.tsx'&&ts.isVariableDeclaration(node.parent)&&node.parent.name.getText(file)==='sample')
      const badTemplate=(ts.isTemplateHead(node)||ts.isTemplateMiddle(node)||ts.isTemplateTail(node))&&hasHan.test(node.text)
      if(badVisible||badChinese||badTemplate)problems.push(path+':'+(file.getLineAndCharacterOfPosition(node.getStart(file)).line+1)+' '+node.getText(file).slice(0,95))
      ts.forEachChild(node,visit)
    }
    visit(file)
  }
  assert.deepEqual(problems,[])
})

const images = (doc:string) => [...read(doc).matchAll(/!\[[^\]\n]*\]\(([^)\s]+)\)/g)].map(match=>match[1]!)
const rawPrefix='https://raw.githubusercontent.com/StarWind97/dsh-fatfish-notes/main/'

test('localized README images are paired and English guides use English screenshots',()=>{
  const zh=images('README.md').filter(path=>path.includes('/assets/screenshots/'))
  const en=images('README.en.md').filter(path=>path.includes('/assets/screenshots/'))
  assert.ok(zh.length>0)
  const check=(paths:string[],language:string)=>paths.map(path=>{
    assert.ok(path.startsWith(rawPrefix),path)
    const relative=path.slice(rawPrefix.length)
    assert.ok(existsSync(relative),relative)
    assert.match(relative,new RegExp('/'+language+'/[^/]+\\.png$'))
    assert.equal(readFileSync(relative).readUInt32BE(0),0x89504e47,relative)
    return relative.replace('/'+language+'/','/')
  })
  assert.deepEqual(check(zh,'zh'),check(en,'en'))
  for(const [index,path] of zh.entries()){
    assert.ok(!readFileSync(path.slice(rawPrefix.length)).equals(readFileSync(en[index]!.slice(rawPrefix.length))),path)
  }
  assert.deepEqual(JSON.parse(read('screenshots.json')),zh.map(path=>path.slice(rawPrefix.length)))
  for(const doc of ['docs/user-guide.en.md','docs/user-guide-reference.en.md'])for(const path of images(doc)){
    assert.ok(path.includes('/en/'),doc+' '+path)
    assert.ok(existsSync(join(dirname(doc),path)),doc+' '+path)
  }
  for(const path of images('docs/user-guide.zh.md')){
    assert.ok(!path.includes('/en/'),path)
    assert.ok(existsSync(join('docs',path)),path)
  }
})
