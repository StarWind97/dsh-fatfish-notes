import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmTable } from 'micromark-extension-gfm-table'
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table'
import type { Nodes } from 'mdast'

export interface OutlineHeading { position:number; level:number; label:string }

function label(node:Nodes):string {
  if(node.type==='image'||node.type==='imageReference')return node.alt??''
  if(node.type==='html')return ''
  if(node.type==='text')return node.value.replace(/~~(.+?)~~/g,'$1')
  if('value' in node)return node.value
  if('children' in node)return node.children.map(child=>label(child)).join('')
  return ''
}

/** Use Markdown structure, so fences, indented code and table cells cannot become chapters. */
export function outlineHeadings(body:string):OutlineHeading[] {
  const tree=fromMarkdown(body,{extensions:[gfmTable()],mdastExtensions:[gfmTableFromMarkdown()]})
  const headings:OutlineHeading[]=[]
  function visit(node:Nodes) {
    if(node.type==='heading')headings.push({position:node.position!.start.offset!,level:node.depth,label:label(node).replace(/\s+/g,' ').trim()})
    else if('children' in node)node.children.forEach(child=>visit(child))
  }
  visit(tree)
  return headings
}

export function chapterAt(headings:OutlineHeading[],position:number):number|null {
  let current:number|null=null
  for(const heading of headings){if(heading.position>position)break;current=heading.position}
  return current
}
