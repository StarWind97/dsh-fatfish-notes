import * as React from 'react'
import {useEffect,useRef,useState} from 'react'
import {X} from 'lucide-react'

/** A receipt expires, never the operation it describes. Hover/focus pauses its clock. */
export function useNoticeExpiry(key:unknown, close:()=>void, milliseconds=8000){
  const [hover,setHover]=useState(false),[focus,setFocus]=useState(false),remaining=useRef(milliseconds),callback=useRef(close);callback.current=close
  useEffect(()=>{remaining.current=milliseconds},[key,milliseconds])
  useEffect(()=>{
    if(!key||hover||focus)return
    const start=Date.now(),timer=setTimeout(()=>callback.current(),remaining.current)
    return()=>{clearTimeout(timer);remaining.current=Math.max(0,remaining.current-(Date.now()-start))}
  },[key,hover,focus,milliseconds])
  return {onMouseEnter:()=>setHover(true),onMouseLeave:()=>setHover(false),onFocusCapture:()=>setFocus(true),onBlurCapture:(e:React.FocusEvent)=>{if(!e.currentTarget.contains(e.relatedTarget))setFocus(false)}}
}
export function TransientNotice({identity,message,close,action,actionLabel='撤销',busy=false,paused=false,milliseconds=8000}:{identity:string;message:string;close:()=>void;action?:()=>void;actionLabel?:string;busy?:boolean;paused?:boolean;milliseconds?:number}){
  const events=useNoticeExpiry(busy||paused?null:identity,close,milliseconds)
  return <aside className="paper-transient" role="status" {...events}><style>{`.paper-transient{position:fixed;right:24px;bottom:24px;z-index:1500;display:flex;align-items:center;gap:12px;max-width:calc(100vw - 48px);padding:12px 16px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2,#ccc);box-shadow:0 5px 22px #0002;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#222);font:13px/1.5 system-ui}.paper-transient button{border:0;background:transparent;color:inherit;cursor:pointer;white-space:nowrap}`}</style><span>{message}</span>{action&&<button disabled={busy} onClick={action}>{actionLabel}</button>}<button aria-label="关闭提示" disabled={busy} onClick={close}><X size={14}/></button></aside>
}
