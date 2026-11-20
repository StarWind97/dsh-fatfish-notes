import * as React from 'react'
import {BookOpen, Tag} from 'lucide-react'
import type {T} from './locale.js'
import {readPreference, writePreference, ResizeDivider} from './paper/layout.js'
import {clamp, type PaperSurface} from './paper/layout-state.js'
import {useAppearance} from './paper/appearance.js'

type Props={tags:boolean;busy:boolean;surface:PaperSurface;onSelect:(tags:boolean)=>void;t:T;children:React.ReactNode}

export function ClassificationViews({tags,busy,surface,onSelect,t,children}:Props){
  const id=React.useId()
  function onKey(event:React.KeyboardEvent<HTMLElement>){
    if(busy||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return
    event.preventDefault()
    const next=event.key==='Home'?false:event.key==='End'?true:!tags
    onSelect(next)
    event.currentTarget.querySelectorAll('button')[Number(next)]?.focus()
  }
  return <section className="class-shell">
    <div className="class-subhead"><nav className="class-tabs" role="tablist" aria-label={t('classTitle')} onKeyDown={onKey}>
      {[false,true].map(isTag=><button key={String(isTag)} role="tab" id={id+'-tab-'+isTag} aria-controls={tags===isTag?id:undefined}
        aria-selected={tags===isTag} tabIndex={tags===isTag?0:-1} disabled={busy} onClick={()=>onSelect(isTag)}>
        {isTag?<Tag size={16}/>:<BookOpen size={16}/>} {t(isTag?'classTags':'notesNotebook')}
      </button>)}
    </nav></div>
    <section className={tags?'class-stage-scroll':'class-book-panel'} role="tabpanel" id={id} aria-labelledby={id+'-tab-'+tags}>
      {tags?<TagColumns surface={surface} t={t}>{children}</TagColumns>:children}
    </section>
  </section>
}

function savedRatios(key:string):(number|null)[]{
  try{
    const saved:unknown=JSON.parse(readPreference(key)??'null')
    if(Array.isArray(saved))return [0,1].map(i=>typeof saved[i]==='number'&&saved[i]>0&&saved[i]<1?saved[i]:null)
  }catch{/* Fall back to automatic widths. */}
  return [null,null]
}

function TagColumns({surface,t,children}:Pick<Props,'surface'|'t'|'children'>){
  const frame=React.useRef<HTMLDivElement>(null)
  const {layout,density}=useAppearance()
  const [available,measure]=React.useState({width:1360,gap:0})
  const key='classification.widths.'+surface
  const [ratios,setRatios]=React.useState(()=>savedRatios(key))
  React.useLayoutEffect(()=>{
    const el=frame.current!
    const update=()=>{
      const width=el.clientWidth
      if(!width)return
      const gap=parseFloat(getComputedStyle(el).getPropertyValue('--panel-gap'))||0
      measure(old=>old.width===width&&old.gap===gap?old:{width,gap})
    }
    update()
    const observer=new ResizeObserver(update)
    observer.observe(el)
    return ()=>observer.disconnect()
  },[layout,density])
  const width=available.width-2*available.gap
  const minDir=width<990?156:180,minList=width<990?236:265
  const minReader=Math.min(420,Math.round(width*.42))
  const automatic=(ratio:number,defaultRatio:number,min:number,max:number)=>Math.round(ratio?width*ratio:clamp(width*defaultRatio,min,max))
  const dir=clamp(automatic(ratios[0]??0,.157,minDir,278),minDir,Math.min(390,width-minList-minReader))
  const list=clamp(automatic(ratios[1]??0,.277,minList,478),minList,Math.min(760,width-dir-minReader))
  const latest=React.useRef(ratios)
  React.useEffect(()=>()=>writePreference(key,JSON.stringify(latest.current)),[key])
  function change(index:number,value:number|null){
    const next=[...latest.current]
    next[index]=value===null?null:value/width
    latest.current=next
    setRatios(next)
  }
  React.useEffect(()=>{const timer=setTimeout(()=>writePreference(key,JSON.stringify(ratios)),100);return ()=>clearTimeout(timer)},[key,ratios])
  return <div ref={frame} className="class-stage" style={{'--dir':dir+'px','--mid':list+'px','--gap':available.gap+'px'} as React.CSSProperties}>
    {children}
    {[dir,list].map((value,i)=><ResizeDivider key={i} className={'class-grip grip-'+i} label={t(i?'classListWidth':'classDirWidth')} title={t('classDividerHint')}
      width={value} min={i?minList:minDir} max={i?Math.min(760,width-dir-minReader):Math.min(390,width-list-minReader)}
      resize={value=>change(i,value)} reset={()=>change(i,null)}/>)}
  </div>
}
