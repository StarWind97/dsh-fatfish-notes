import * as React from 'react'
import {Check,Copy} from 'lucide-react'
import type {T} from '../locale.js'
export async function copyCode(value:string){await navigator.clipboard.writeText(value)}
export function codeText(node:{type:string;value?:string;children?:readonly unknown[]}|undefined):string{
  if(!node)return ''
  if(node.type==='text')return node.value??''
  return (node.children??[]).map(child=>codeText(child as Parameters<typeof codeText>[0])).join('')
}
export function CopyCode({value,t}:{value:string;t:T}){
  const [result,setResult]=React.useState<'ready'|'copied'|'failed'>('ready'),timer=React.useRef<ReturnType<typeof setTimeout>|undefined>(undefined)
  React.useEffect(()=>()=>clearTimeout(timer.current),[])
  const label=t(result==='copied'?'documentCopied':result==='failed'?'documentCopyFailed':'documentCopyCode')
  async function copy(){clearTimeout(timer.current);try{await copyCode(value);setResult('copied')}catch{setResult('failed')}timer.current=setTimeout(()=>setResult('ready'),2200)}
  return <button className="paper-copy-code" title={label} aria-label={label} onClick={()=>void copy()}>{result==='copied'?<Check size={14}/>:<Copy size={14}/>}<span role="status">{result==='ready'?'':label}</span></button>
}
