import * as React from 'react'
import { X, ListTree } from 'lucide-react'
import type { T } from '../locale.js'
import type { OutlineHeading } from './outline.js'

export function ChapterOutline({headings,active,onJump,onClose,t,busy}:{headings:OutlineHeading[];active:number|null;onJump:(position:number)=>void;onClose:()=>void;t:T;busy:boolean}) {
  const list=React.useRef<HTMLDivElement>(null)
  React.useEffect(()=>{
    const container=list.current,item=container?.querySelector<HTMLElement>('[aria-current="location"]')
    if(!container||!item)return
    const a=container.getBoundingClientRect(),b=item.getBoundingClientRect()
    if(b.top<a.top)container.scrollTop+=b.top-a.top
    else if(b.bottom>a.bottom)container.scrollTop+=b.bottom-a.bottom
  },[active])
  const base=Math.min(...headings.map(heading=>heading.level),6)
  return <aside id="paper-chapter-outline" className="paper-outline" aria-label={t('paperOutline')}>
    <header><span><ListTree size={15}/>{t('paperOutline')}</span><button type="button" aria-label={t('paperOutlineClose')} title={t('paperOutlineClose')} onClick={onClose}><X size={15}/></button></header>
    <div className="paper-outline-scroll" ref={list}>
      {headings.length?<nav aria-label={t('paperOutline')}><ol>{headings.map(heading=><li key={heading.position}>
        <button type="button" disabled={busy} title={heading.label||t('paperOutlineUntitled')} aria-current={heading.position===active?'location':undefined}
          style={{paddingInlineStart:12+(heading.level-base)*12}} onClick={()=>onJump(heading.position)}>
          <span>{heading.label||t('paperOutlineUntitled')}</span>
        </button>
      </li>)}</ol></nav>:<p className="paper-outline-empty">{t('paperOutlineEmpty')}</p>}
    </div>
  </aside>
}
