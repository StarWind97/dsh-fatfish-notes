import * as React from 'react'
import {useEffect,useLayoutEffect,useRef} from 'react'
import {Paperclip,Link,ChevronUp,ChevronDown,Pin,PinOff,X} from 'lucide-react'
import {setAppearance,useAppearance} from './appearance.js'
import type {T} from '../locale.js'
export function MaterialsToggle({t,open,onClick,files,references,controls}:{t:T;open:boolean;onClick:()=>void;files:number;references:number|null;controls:string}){
  const label=t('materialsPanelCount',{files,references:references??t('loading')})
  return <button type="button" className="paper-materials-toggle" data-materials-toggle aria-label={label} title={label} aria-expanded={open} aria-controls={controls} onClick={onClick}><span data-empty={files===0}><Paperclip size={14}/>{files}</span><span data-empty={references===0}><Link size={14}/>{references??'…'}</span>{open?<ChevronDown size={12}/>:<ChevronUp size={12}/>}</button>
}
export function MaterialsPanel({t,open,setOpen,files,references,children,hidden,id}:{t:T;open:boolean;setOpen:(open:boolean)=>void;files:number;references:number|null;children:React.ReactNode;hidden:boolean;id:string}){
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
  return <aside ref={ref} id={id} className="paper-materials" aria-label={t('materialsAndReferences')} hidden={hidden||!open} data-open={open} data-pinned={value.pinned} data-position={value.materials} data-style={value.materialStyle}>
    <header><span>{t('materialsAndReferences')}</span><button type="button" aria-label={value.pinned?t('appearanceUnpinMaterials'):t('appearancePinMaterials')} title={value.pinned?t('appearanceUnpinMaterials'):t('appearancePinMaterials')} aria-pressed={value.pinned} onClick={()=>setAppearance({pinned:!value.pinned})}>{value.pinned?<PinOff size={14}/>:<Pin size={14}/>}</button><button type="button" aria-label={t('materialsCollapse')} title={t('materialsCollapse')} onClick={()=>setOpen(false)}><X size={14}/></button></header>
    <div className="paper-material-content">{children}{!files&&references===0&&<p className="paper-hint">{t('materialsAndReferencesEmpty')}</p>}</div>
  </aside>
}
