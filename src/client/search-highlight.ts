import type {Root,RootContent,PhrasingContent} from 'mdast'
import {matchRanges} from '../contracts/search.js'

export function highlightMarkdown(query:string) {
  return ()=> (tree:Root)=> {
    function visit(node:Root|RootContent|PhrasingContent) {
      if(!('children' in node))return
      const children: typeof node.children=[]
      for(const child of node.children) {
        if(child.type!=='text'){visit(child);children.push(child as never);continue}
        let offset=0
        for(const [start,end]of matchRanges(child.value,query)) {
          if(start>offset)children.push({type:'text',value:child.value.slice(offset,start)} as never)
          children.push({type:'strong',data:{hName:'mark'},children:[{type:'text',value:child.value.slice(start,end)}]} as never);offset=end
        }
        if(offset<child.value.length)children.push({type:'text',value:child.value.slice(offset)} as never)
      }
      node.children=children as typeof node.children
    }
    visit(tree)
  }
}
