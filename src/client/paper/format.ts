import { syntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'
import type { EditorState } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { undo, redo } from '@codemirror/commands'
import { openSearchPanel } from '@codemirror/search'

export type Format = 'paragraph' | `h${1|2|3|4|5|6}` | 'bold' | 'italic' | 'strike' | 'unordered' | 'ordered' | 'task' | 'quote' | 'code' | 'block-code' | 'table' | 'rule' | 'undo' | 'redo' | 'indent' | 'outdent' | 'find'
const inline = {bold:['StrongEmphasis','**'],italic:['Emphasis','*'],strike:['Strikethrough','~~'],code:['InlineCode','`']} as const
export function ancestor(state:EditorState, names:readonly string[]):SyntaxNode | null {
  const {from,to}=state.selection.main
  for(const side of [1,-1] as const){
    for(let n:SyntaxNode|null=syntaxTree(state).resolveInner(from,side);n;n=n.parent)
      if(n.to>=to && names.includes(n.name))return n
  }
  return null
}
export function selectionFormat(state:EditorState){
  const active=new Set<Format>()
  for(const key of Object.keys(inline) as (keyof typeof inline)[])if(ancestor(state,[inline[key][0]]))active.add(key)
  const list=ancestor(state,['OrderedList','BulletList'])
  if(list)active.add(list.name==='OrderedList'?'ordered':'unordered')
  if(ancestor(state,['Task']))active.add('task')
  if(ancestor(state,['Blockquote']))active.add('quote')
  if(ancestor(state,['FencedCode','CodeBlock']))active.add('block-code')
  const h=ancestor(state,Array.from({length:6},(_,i)=>'ATXHeading'+(i+1)))
  return {active,heading:h?.name.slice(-1)}
}
const marker=/^( *)([-+*]|\d{1,9}[.)])(?:[ \t]+|$)(?:\[([ xX])\](?:[ \t]+|$))?/
function lines(view:EditorView,action:Format):boolean{
  const state=view.state,{from,to,anchor,head}=state.selection.main, doc=state.doc
  const first=doc.lineAt(from).number,last=doc.lineAt(to>from?to-1:to).number
  const rows=Array.from({length:last-first+1},(_,i)=>doc.line(first+i))
  const listAction=['unordered','ordered','task'].includes(action)
  const markers=rows.map(l=>marker.exec(l.text))
  const isKind=(m:RegExpExecArray)=>action==='task'?m[3]!==undefined:m[3]===undefined&&(action==='ordered'?/^\d/.test(m[2]!):!/^\d/.test(m[2]!))
  const existing=markers.filter((m):m is RegExpExecArray=>!!m)
  const remove=existing.length>0 && existing.every(isKind)
  const changes:{from:number;to:number;insert:string}[]=[]
  const counters=new Map<number,number>()
  for(const [i,l] of rows.entries()){
    const m=markers[i]
    if(listAction){
      if((existing.length && !m)||(!l.text.trim()&&rows.length>1)||/^\s*(?:#{1,6}\s|```|~~~)/.test(l.text))continue
      let syntax:SyntaxNode|null=syntaxTree(state).resolveInner(l.from+l.text.length-l.text.trimStart().length,1)
      let protectedLine=false
      while(syntax){if(['FencedCode','CodeBlock','HorizontalRule','Table'].includes(syntax.name)){protectedLine=true;break}syntax=syntax.parent}
      if(protectedLine)continue
      const indent=m?.[1]??l.text.match(/^ */)![0],depth=indent.length
      for(const d of counters.keys())if(d>depth)counters.delete(d)
      const number=(counters.get(depth)??0)+1;counters.set(depth,number)
      const prefix=remove?'':action==='ordered'?`${number}. `:action==='task'?'- [ ] ':'- '
      changes.push({from:l.from,to:l.from+(m?.[0].length??indent.length),insert:indent+prefix})
    }else{
      const lead=(action==='quote'?/^( *)(?:> ?)?/:/^( *)(?:#{1,6}[ \t]+)?/).exec(l.text)!
      const prefix=action==='quote'?(/^\s*>/.test(rows[0]!.text)?'':'> '):action==='paragraph'?'':'#'.repeat(Number(action.slice(1)))+' '
      changes.push({from:l.from,to:l.from+lead[0].length,insert:lead[1]+prefix})
    }
  }
  const set=state.changes(changes)
  view.dispatch({changes:set,selection:{anchor:set.mapPos(anchor,1),head:set.mapPos(head,1)},userEvent:'input.format'})
  return true
}
function indentList(view:EditorView,out:boolean):boolean{
  const state=view.state,{from,to}=state.selection.main,doc=state.doc
  let first=doc.lineAt(from).number,last=doc.lineAt(to>from?to-1:to).number
  const item=ancestor(state,['ListItem'])
  if(item){first=doc.lineAt(item.from).number;last=doc.lineAt(item.to).number}
  const current=marker.exec(doc.line(first).text);if(!current)return false
  const depth=current[1]!.length
  if(out&&!depth)return false
  let amount=0
  for(let i=first-1;i>=1;i--){
    const text=doc.line(i).text,previous=marker.exec(text)
    if(previous&&(out?previous[1]!.length<depth:previous[1]!.length===depth)){
      amount=out?depth-previous[1]!.length:previous[2]!.length+1;break
    }
    if(text.trim() && text.search(/\S/)<depth)break
  }
  if(!amount && out)amount=Math.min(2,depth)
  if(!amount)return false
  const changes=[]
  for(let i=first;i<=last;i++){const l=doc.line(i);if(l.text.trim())changes.push({from:l.from,to:l.from+(out?Math.min(amount,l.text.match(/^ */)![0].length):0),insert:out?'':' '.repeat(amount)})}
  view.dispatch({changes,userEvent:'input.indent'});return true
}
export function format(view:EditorView,action:Format,placeholder:string):boolean{
  const {state}=view,{from,to}=state.selection.main,selected=state.sliceDoc(from,to)
  if(action==='undo'||action==='redo')return (action==='undo'?undo:redo)(view)
  if(action==='find')return openSearchPanel(view)
  if(action==='indent'||action==='outdent')return indentList(view,action==='outdent')
  if(action==='block-code'||action==='table'||action==='rule'){
    const fence='`'.repeat(Math.max(3,...Array.from(selected.matchAll(/`+/g),m=>m[0].length+1)))
    const prefix=from?'\n\n':'',content=selected||placeholder
    const insert=action==='block-code'?fence+'\n'+content+'\n'+fence:action==='table'?'| A | B |\n| --- | --- |\n| 1 | 2 |':'---'
    const start=from+prefix.length+(action==='block-code'?fence.length+1:action==='table'?2:insert.length+2)
    view.dispatch({changes:{from,to,insert:prefix+insert+'\n\n'},selection:{anchor:start,head:start+(action==='block-code'?content.length:0)},userEvent:'input.format'})
    return true
  }
  if(!(action in inline))return lines(view,action)
  const [node,mark]=inline[action as keyof typeof inline]
  const current=ancestor(state,[node])
  if(current){
    const left=current.firstChild,right=current.lastChild
    if(left && right && left.from!==right.from){view.dispatch({changes:[{from:left.from,to:left.to},{from:right.from,to:right.to}],userEvent:'input.format'});return true}
  }
  const content=selected||placeholder
  const delim=action==='code'?'`'.repeat(Math.max(1,...Array.from(content.matchAll(/`+/g),m=>m[0].length+1))):mark
  const pos=from+delim.length
  view.dispatch({changes:{from,to,insert:delim+content+delim},selection:{anchor:pos,head:pos+content.length},userEvent:'input.format'});return true
}
