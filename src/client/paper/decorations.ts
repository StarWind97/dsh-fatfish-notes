import { syntaxTree } from '@codemirror/language'
import { StateField, StateEffect, type EditorState } from '@codemirror/state'
import { Decoration, EditorView, WidgetType } from '@codemirror/view'
import type { SyntaxNode } from '@lezer/common'

export const refreshMedia=StateEffect.define<void>()
class Preview extends WidgetType {
  constructor(readonly type:'image'|'code'|'table'|'rule'|'marker'|'task',readonly value:string,readonly extra='',readonly rows:readonly string[][]=[]) {super()}
  eq(other:Preview){return this.type===other.type&&this.value===other.value&&this.extra===other.extra&&JSON.stringify(this.rows)===JSON.stringify(other.rows)}
  toDOM(view:EditorView):HTMLElement{
    let el:HTMLElement
    if(this.type==='image'){
      const img=document.createElement('img');img.src=this.value;img.alt=this.extra;img.className='paper-image';img.onload=()=>view.requestMeasure();el=img
    }else if(this.type==='code'){
      el=document.createElement('div');el.className='paper-code'
      if(this.extra){const label=document.createElement('small');label.textContent=this.extra;el.append(label)}
      const pre=document.createElement('pre');pre.textContent=this.value;el.append(pre)
    }else if(this.type==='table'){
      el=document.createElement('div');el.className='paper-table';const table=document.createElement('table');el.append(table)
      this.rows.forEach((row,i)=>{const tr=table.insertRow();for(const value of row){const cell=document.createElement(i?'td':'th');cell.textContent=value;tr.append(cell)}})
    }else if(this.type==='rule'){el=document.createElement('hr')}
    else if(this.type==='task'){
      const box=document.createElement('input');box.type='checkbox';box.checked=this.value==='x';box.setAttribute('aria-label',this.extra)
      box.onmousedown=e=>e.preventDefault();box.onclick=e=>{e.preventDefault();const pos=view.posAtDOM(box),line=view.state.doc.lineAt(pos),match=/\[([ xX])\]/.exec(line.text.slice(pos-line.from));if(match){const from=pos+match.index+1;view.dispatch({changes:{from,to:from+1,insert:this.value==='x'?' ':'x'},userEvent:'input'})}}
      return box
    }else{el=document.createElement('span');el.className='paper-bullet';el.textContent=this.value}
    el.onmousedown=e=>{e.preventDefault();view.dispatch({selection:{anchor:view.posAtDOM(el)}});view.focus()};return el
  }
}

export function livePreview(imageUrl:(path:string)=>string|null,taskLabel:string){
  function build(state:EditorState){
    const ranges:ReturnType<Decoration['range']>[]=[], sel=state.selection.main,doc=state.doc
    const text=(n:SyntaxNode)=>state.sliceDoc(n.from,n.to)
    const line=(pos:number,cls:string)=>ranges.push(Decoration.line({class:cls}).range(doc.lineAt(pos).from))
    const mark=(a:number,b:number,cls:string)=>{if(b>a)ranges.push(Decoration.mark({class:cls}).range(a,b))}
    const token=(a:number,b:number,visible:boolean)=>{if(b>a)ranges.push((visible?Decoration.mark({class:'paper-token'}):Decoration.replace({})).range(a,b))}
    const widget=(n:SyntaxNode,w:Preview,block=false)=>ranges.push(Decoration.replace({widget:w,block}).range(n.from,n.to))
    const listNumbers=new Map<number,number>()
    syntaxTree(state).iterate({enter(ref){
      const n=ref.node,a=n.from,b=n.to,active=sel.from<=b&&sel.to>=a,first=doc.lineAt(a)
      const left=n.firstChild,right=n.lastChild
      if(/^ATXHeading[1-6]$/.test(n.name)){
        line(a,'paper-h h'+n.name.slice(-1));if(left)token(a,Math.min(b,left.to+(state.sliceDoc(left.to,left.to+1)===' '?1:0)),active)
      }else if(['StrongEmphasis','Emphasis','Strikethrough','InlineCode'].includes(n.name)&&left&&right&&left.from!==right.from){
        token(left.from,left.to,active);token(right.from,right.to,active);mark(left.to,right.from,'paper-'+n.name)
      }else if(n.name==='ListItem'){
        const list=n.parent,lm=n.getChild('ListMark');if(!list||!lm)return
        const order=list.name==='OrderedList', count=listNumbers.get(list.from)??(parseInt(text(lm),10)||1)
        listNumbers.set(list.from,count+1)
        const task=n.getChild('Task')?.getChild('TaskMarker'),end=task?.to??lm.to
        if(sel.from<=first.to && sel.to>=first.from)mark(lm.from,end,'paper-token')
        else ranges.push(Decoration.replace({widget:task?new Preview('task',text(task).toLowerCase()==='[x]'?'x':'',taskLabel):new Preview('marker',order?count+'.':'•')}).range(lm.from,end))
      }else if(n.name==='Image'){
        const url=n.getChild('URL'),src=url&&imageUrl(text(url)),alt=text(n).match(/^!\[([^\]]*)\]/)?.[1]??''
        if(src&&!active){widget(n,new Preview('image',src,alt),a===first.from&&b===doc.lineAt(b).to);return false}
      }else if(n.name==='Link'){
        const close=n.getChildren('LinkMark')[1];if(left&&close&&n.getChild('URL')){token(a,left.to,active);mark(left.to,close.from,'paper-link');token(close.from,b,active)}
      }else if(n.name==='QuoteMark'){line(a,'paper-quote');token(a,b,sel.from<=first.to&&sel.to>=first.from)}
      else if(n.name==='FencedCode'){
        if(!active&&a===first.from&&b===doc.lineAt(b).to){
          const content=n.getChildren('CodeText').map(text).join('\n'),info=n.getChild('CodeInfo')
          widget(n,new Preview('code',content,info?text(info):''),true);return false
        }
        for(let i=first.number;i<=doc.lineAt(b).number;i++)line(doc.line(i).from,'paper-code-line')
      }else if(n.name==='Table'&&!active&&a===first.from&&b===doc.lineAt(b).to){
        const rows=[...n.getChildren('TableHeader'),...n.getChildren('TableRow')].map(row=>row.getChildren('TableCell').map(text))
        widget(n,new Preview('table','','',rows),true);return false
      }else if(n.name==='HorizontalRule'&&!active&&a===first.from&&b===first.to){widget(n,new Preview('rule',''),true);return false}
      return undefined
    }})
    return Decoration.set(ranges,true)
  }
  return StateField.define({create:build,update:(previous,tr)=>tr.docChanged||tr.selection||tr.effects.some(e=>e.is(refreshMedia))||syntaxTree(tr.startState)!==syntaxTree(tr.state)?build(tr.state):previous,provide:f=>EditorView.decorations.from(f)})
}
