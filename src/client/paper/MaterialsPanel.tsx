import * as React from 'react'
import {useEffect,useRef,useId} from 'react'
import {Paperclip,ChevronUp,ChevronDown,Pin,PinOff} from 'lucide-react'
import {setAppearance,useAppearance} from './appearance.js'
export function MaterialsPanel({open,setOpen,files,references,children,hidden}:{open:boolean;setOpen:(open:boolean)=>void;files:number;references:number|null;children:React.ReactNode;hidden:boolean}){
  const ref=useRef<HTMLElement>(null),value=useAppearance(),contentId=useId()
  useEffect(()=>{if(value.pinned)setOpen(true)},[value.pinned,setOpen])
  useEffect(()=>{
    if(!open||value.pinned||hidden)return
    const outside=(e:PointerEvent)=>{const target=e.target as HTMLElement;if(!ref.current?.contains(target)&&!target.closest('[data-materials-toggle],dialog,[role=menu]'))setOpen(false)}
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!e.defaultPrevented&&!(e.target as HTMLElement).closest('dialog,[role=menu]')){e.preventDefault();setOpen(false)}}
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key)
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key)}
  },[open,value.pinned,hidden,setOpen])
  return <aside ref={ref} className="paper-materials" aria-label="资料与引用" hidden={hidden} data-open={open} data-pinned={value.pinned} data-position={value.materials} data-style={value.materialStyle}>
    <header><button type="button" data-materials-toggle aria-expanded={open} aria-controls={contentId} onClick={()=>setOpen(!open)}><Paperclip size={14}/><span>资料 {files} · 引用 {references??'…'}</span>{open?<ChevronDown size={14}/>:<ChevronUp size={14}/>}</button><button type="button" aria-label={value.pinned?'取消固定资料区':'固定资料区'} title={value.pinned?'取消固定资料区':'固定资料区'} aria-pressed={value.pinned} onClick={()=>setAppearance({pinned:!value.pinned})}>{value.pinned?<PinOff size={14}/>:<Pin size={14}/>}</button></header>
    <div className="paper-material-content" id={contentId} hidden={!open}>{children}{!files&&references===0&&<p className="paper-hint">暂无补充资料和引用。</p>}</div>
  </aside>
}
