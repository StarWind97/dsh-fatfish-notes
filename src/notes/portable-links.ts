import type {Root,RootContent,PhrasingContent} from 'mdast'
import {exportTree} from './export/model.js'
import {definitionLabel} from './export/markdown.js'
export interface PortableReference{url:string;image:boolean;used:boolean;start:number;end:number;node:RootContent|PhrasingContent}
export function references(body:string):PortableReference[]{
  const result:PortableReference[]=[],imageDefinitions=new Set<string>(),usedDefinitions=new Set<string>(),nodes:Array<Root|RootContent|PhrasingContent>=[]
  function visit(n:Root|RootContent|PhrasingContent){nodes.push(n);if(n.type==='imageReference')imageDefinitions.add(n.identifier.toUpperCase());if(n.type==='imageReference'||n.type==='linkReference')usedDefinitions.add(n.identifier.toUpperCase());if('children'in n)n.children.forEach(visit)}visit(exportTree(body))
  const definitions=new Set<string>()
  for(const n of nodes)if((n.type==='link'||n.type==='image'||n.type==='definition')&&n.position?.start.offset!==undefined&&n.position.end.offset!==undefined){
    const key=n.type==='definition'?n.identifier.toUpperCase():undefined,used=key===undefined||!definitions.has(key)&&usedDefinitions.has(key)
    if(key!==undefined)definitions.add(key)
    result.push({url:n.url,image:n.type==='image'||n.type==='definition'&&imageDefinitions.has(n.identifier.toUpperCase()),used,start:n.position.start.offset,end:n.position.end.offset,node:n})
  }
  return result
}
export function changeReferences(body:string,change:(ref:PortableReference)=>string|undefined):string{
  const downgraded=new Set<string>()
  const edits=references(body).flatMap(ref=>{
    const wasImage=ref.image,url=change(ref);if(url===undefined||(url===ref.url&&ref.image===wasImage))return []
    if(ref.node.type==='definition'&&wasImage&&!ref.image)downgraded.add(ref.node.identifier.toUpperCase())
    const n=ref.node,destination='<'+url.replace(/[<>\r\n]/g,encodeURIComponent)+'>',title='title'in n&&n.title?' '+JSON.stringify(n.title):''
    const label='children'in n?body.slice(n.children[0]?.position?.start.offset??ref.start,n.children.at(-1)?.position?.end.offset??ref.end):'alt'in n?(n.alt??'').replace(/[\\[\]]/g,'\\$&'):''
    const text=n.type==='definition'?`${definitionLabel(body.slice(ref.start,ref.end))} ${destination}${title}`:`${ref.image?'!':''}[${label}](${destination}${title})`
    return [{...ref,text}]
  })
  if(downgraded.size){
    function visit(n:Root|RootContent|PhrasingContent){
      if(n.type==='imageReference'&&downgraded.has(n.identifier.toUpperCase())&&n.position?.start.offset!==undefined){const start=n.position.start.offset;edits.push({url:'',image:false,used:true,start,end:start+1,node:n,text:''})}
      if('children'in n)n.children.forEach(visit)
    }visit(exportTree(body))
  }
  for(const edit of edits.sort((a,b)=>b.start-a.start))body=body.slice(0,edit.start)+edit.text+body.slice(edit.end)
  return body
}
