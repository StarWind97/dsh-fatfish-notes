import * as React from 'react'
import {useEffect,useLayoutEffect,useRef} from 'react'
import {Paperclip,Link,ChevronUp,ChevronDown,Pin,PinOff,X} from 'lucide-react'
import {setAppearance,useAppearance} from './appearance.js'
export function MaterialsToggle({open,onClick,files,references,controls}:{open:boolean;onClick:()=>void;files:number;references:number|null;controls:string}){
  const label=`补充附件 ${files} · 引用本篇 ${references??'加载中'}`
  return <button type="button" className="paper-materials-toggle" data-materials-toggle aria-label={label} title={label} aria-expanded={open} aria-controls={controls} onClick={onClick}><span data-empty={files===0}><Paperclip size={14}/>{files}</span><span data-empty={references===0}><Link size={14}/>{references??'…'}</span>{open?<ChevronDown size={12}/>:<ChevronUp size={12}/>}</button>
}
export function MaterialsPanel({open,setOpen,files,references,children,hidden,id}:{open:boolean;setOpen:(open:boolean)=>void;files:number;references:number|null;children:React.ReactNode;hidden:boolean;id:string}){
  const ref=useRef<HTMLElement>(null),value=useAppearance()
  // Measure the containing reader, never a grid row that disappears when the panel floats.
  useLayoutEffect(()=>{const el=ref.current,body=el?.parentElement;if(!el||!body)return;const measure=()=>el.style.setProperty('--materials-limit',`${Math.max(0,body.clientHeight*(value.pinned?1/3:.5))}px`);measure();const observer=new ResizeObserver(measure);observer.observe(body);return()=>observer.disconnect()},[value.pinned])
  useEffect(()=>{if(value.pinned)setOpen(true)},[value.pinned,setOpen])
  useEffect(()=>{
    if(!open||value.pinned||hidden)return
    const outside=(e:PointerEvent)=>{const target=e.target as HTMLElement;if(!ref.current?.contains(target)&&!target.closest('[data-materials-toggle],dialog,[role=menu]'))setOpen(false)}
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!e.defaultPrevented&&!(e.target as HTMLElement).closest('dialog,[role=menu]')){e.preventDefault();setOpen(false)}}
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key)
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key)}
  },[open,value.pinned,hidden,setOpen])
  return <aside ref={ref} id={id} className="paper-materials" aria-label="资料与引用" hidden={hidden||!open} data-open={open} data-pinned={value.pinned} data-position={value.materials} data-style={value.materialStyle}>
    <header><span>资料与引用</span><button type="button" aria-label={value.pinned?'取消固定资料区':'固定资料区'} title={value.pinned?'取消固定资料区':'固定资料区'} aria-pressed={value.pinned} onClick={()=>setAppearance({pinned:!value.pinned})}>{value.pinned?<PinOff size={14}/>:<Pin size={14}/>}</button><button type="button" aria-label="收起资料区" title="收起资料区" onClick={()=>setOpen(false)}><X size={14}/></button></header>
    <div className="paper-material-content">{children}{!files&&references===0&&<p className="paper-hint">暂无补充资料和引用。</p>}</div>
  </aside>
}
