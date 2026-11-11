import {fromMarkdown} from 'mdast-util-from-markdown'
import {gfm} from 'micromark-extension-gfm'
import {gfmFromMarkdown} from 'mdast-util-gfm'
import type {Root,RootContent} from 'mdast'

/** Run in a worker: Markdown parsing must not compete with typing or scrolling. */
export function documentStats(body:string):{words:number;characters:number}{
  const tree=fromMarkdown(body,{extensions:[gfm()],mdastExtensions:[gfmFromMarkdown()]}),parts:string[]=[]
  function visit(node:Root|RootContent){
    if(node.type==='text'||node.type==='inlineCode'||node.type==='code')parts.push(node.value)
    else if('children' in node)for(const child of node.children)visit(child)
    if(['paragraph','heading','code','tableCell','break'].includes(node.type))parts.push('\n')
  }
  visit(tree)
  const text=parts.join(''),cjk=/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu
  const words=(text.match(cjk)?.length??0)+(text.replace(cjk,' ').match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)?.length??0)
  return {words,characters:Array.from(text.replace(/\s/gu,'')).length}
}
