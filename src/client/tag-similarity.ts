import type {TagEntry} from '../contracts/notes.js'
import type {T} from './locale.js'

export function foldTag(name:string){
  return name.normalize('NFKC').replace(/\s+/gu,'').toLowerCase()
}

// Only strip separators between letters or digits. C++ and C# stay distinct.
export function joinedTag(name:string){
  return foldTag(name).replace(/(?<=[\p{L}\p{N}])[-_·](?=[\p{L}\p{N}])/gu,'')
}

function similarity(a:string,b:string,t:T){
  if(a===b)return
  if(foldTag(a)===foldTag(b)){
    const left=a.normalize('NFKC'),right=b.normalize('NFKC')
    const reasons:string[]=[]
    if(a!==left||b!==right)reasons.push(t('classWidthMatch'))
    if(left.toLowerCase()!==right.toLowerCase()&&/\s/u.test(left+right))reasons.push(t('classSpaceMatch'))
    if(left.replace(/\s+/gu,'')!==right.replace(/\s+/gu,''))reasons.push(t('classCaseMatch'))
    return {order:0,reason:reasons.join(' · ')}
  }
  if(joinedTag(a)===joinedTag(b))return {order:1,reason:t('classSeparatorMatch')}
}

export function similarCandidates(tags:TagEntry[],source:string,t:T){
  const matches=[]
  for(const entry of tags){
    const match=similarity(source,entry.tag,t)
    if(match)matches.push({entry,match})
  }
  return matches.sort((a,b)=>a.match.order-b.match.order||b.entry.count-a.entry.count||
    a.entry.tag.localeCompare(b.entry.tag,'zh-CN',{numeric:true}))
}
