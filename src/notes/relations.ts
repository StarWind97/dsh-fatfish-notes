import { fromMarkdown } from 'mdast-util-from-markdown'
import type { Nodes } from 'mdast'
import { noteLinkId } from '../contracts/note-links.js'

/** Parse real links and used reference definitions; code, images and unused definitions do not count. */
export function linkedNotes(body: string): Set<string> {
  const tree=fromMarkdown(body), definitions=new Map<string,string>(), references:string[]=[], ids=new Set<string>()
  function add(url:string) { const id=noteLinkId(url);if(id)ids.add(id) }
  function visit(node:Nodes) {
    if(node.type==='link')add(node.url)
    if(node.type==='definition'&&!definitions.has(node.identifier.toUpperCase()))definitions.set(node.identifier.toUpperCase(),node.url)
    if(node.type==='linkReference')references.push(node.identifier.toUpperCase())
    if('children' in node)node.children.forEach(visit)
  }
  visit(tree);references.forEach(ref=>add(definitions.get(ref)??''));return ids
}
export function fillTemplate(value:string,title:string,date:string):string {
  return value.replace(/\{\{(日期|date|标题|title)\}\}/g,(_,key:string)=>key==='日期'||key==='date'?date:title)
}
