import {exportTree} from './export/model.js'
import {attachmentLinkId} from '../contracts/note-links.js'
import type {Root,RootContent,PhrasingContent} from 'mdast'

/** Actual Markdown uses only: code and unused definitions are not document resources. */
export function bodyMaterials(body:string){
  const root=exportTree(body),nodes:Array<Root|RootContent|PhrasingContent>=[root],definitions=new Map<string,string>()
  for(let i=0;i<nodes.length;i++){const n=nodes[i]!;if('children'in n)nodes.push(...n.children)}
  nodes.sort((a,b)=>(a.position?.start.offset??0)-(b.position?.start.offset??0))
  for(const n of nodes)if(n.type==='definition'&&!definitions.has(n.identifier.toUpperCase()))definitions.set(n.identifier.toUpperCase(),n.url)
  const assetIds=new Set<string>(),attachmentIds=new Set<string>()
  for(const n of nodes){
    const url=n.type==='link'||n.type==='image'?n.url:n.type==='linkReference'||n.type==='imageReference'?definitions.get(n.identifier.toUpperCase()):undefined
    if(!url)continue
    const asset=/^\.\.\/assets\/([a-f0-9]{64}\.(?:png|jpg|webp|gif))$/.exec(url)?.[1],file=attachmentLinkId(url)
    if(asset)assetIds.add(asset);if(file)attachmentIds.add(file)
  }
  return {assetIds:[...assetIds],attachmentIds:[...attachmentIds]}
}
