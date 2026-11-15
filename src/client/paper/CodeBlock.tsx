import * as React from 'react'
import {useEffect,useRef,useState} from 'react'
import {highlightWorkerSource} from './appearance-assets.js'
import {codeLanguage,highlightAllowed,searchedTokens,type CodeTokens} from './code-highlight.js'
import {CopyCode} from './CopyCode.js'
import type {T} from '../locale.js'
import {currentRepository} from '../api.js'
let worker:Worker|undefined,sequence=0,failedUntil=0,repository:number|undefined
const waiting=new Map<number,{resolve:(value:CodeTokens|null)=>void;timer:ReturnType<typeof setTimeout>}>()
const cache=new Map<string,Promise<CodeTokens|null>>()
export function highlightCode(text:string,language:string,dark:boolean):Promise<CodeTokens|null>{
  const lang=codeLanguage(language)
  if(repository!==currentRepository()){repository=currentRepository();cache.clear();failedUntil=0}
  if(Date.now()<failedUntil||!lang||!highlightAllowed(text))return Promise.resolve(null)
  const key=JSON.stringify([lang,dark,text]),hit=cache.get(key);if(hit){cache.delete(key);cache.set(key,hit);return hit}
  try{
    if(!worker){const url=URL.createObjectURL(new Blob([highlightWorkerSource],{type:'text/javascript'}));try{worker=new Worker(url)}finally{URL.revokeObjectURL(url)}
      worker.onmessage=(event:MessageEvent<{id:number;tokens:CodeTokens|null}>)=>{const request=waiting.get(event.data.id);if(request){clearTimeout(request.timer);waiting.delete(event.data.id);request.resolve(event.data.tokens)}}
      worker.onerror=()=>{failedUntil=Date.now()+30000;worker?.terminate();worker=undefined;for(const {resolve,timer} of waiting.values()){clearTimeout(timer);resolve(null)}waiting.clear();cache.clear()}
    }
    const id=++sequence,result=new Promise<CodeTokens|null>(resolve=>{const timer=setTimeout(()=>{waiting.delete(id);cache.delete(key);resolve(null)},10000);waiting.set(id,{resolve,timer});worker!.postMessage({id,text,language:lang,dark})})
    cache.set(key,result);while(cache.size>32)cache.delete(cache.keys().next().value!)
    return result
  }catch{failedUntil=Date.now()+30000;return Promise.resolve(null)}
}
export function CodeBlock({text,language,t,staticView=false,query='',position}:{text:string;language:string;t:T;staticView?:boolean;query?:string|undefined;position?:number|undefined}){
  const root=useRef<HTMLDivElement>(null),[dark,setDark]=useState(false),[result,setResult]=useState<{text:string;dark:boolean;tokens:CodeTokens|null}|null>(null)
  useEffect(()=>{const app=root.current?.closest('[data-theme]')??document.documentElement;const update=()=>setDark(app.getAttribute('data-theme')==='dark'||getComputedStyle(app).colorScheme==='dark');update();const observer=new MutationObserver(update);observer.observe(app,{attributes:true,attributeFilter:['data-theme','style']});return()=>observer.disconnect()},[])
  useEffect(()=>{let alive=true;void highlightCode(text,language,dark).then(tokens=>{if(alive)setResult({text,dark,tokens})});return()=>{alive=false}},[text,language,dark])
  const settled=result?.text===text&&result.dark===dark,tokens=settled?result.tokens:null
  const lines=text.replace(/\n$/,'').split('\n')
  return <div ref={root} className="paper-code" data-md-pos={position} data-highlight={settled?'ready':'pending'}><span className="paper-code-label">{language||'纯文本'}</span>{!staticView&&<CopyCode value={text} t={t}/>}<pre tabIndex={staticView?undefined:0}><code>{lines.map((line,i)=><span className="paper-code-line" key={i}>{searchedTokens(line,tokens?.[i],query??'').map((token,j)=>token.match?<mark key={j}>{token.content}</mark>:<span key={j} style={token.color?{color:token.color}:undefined}>{token.content}</span>)}</span>)}</code></pre></div>
}
