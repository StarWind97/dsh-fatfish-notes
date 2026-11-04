import * as React from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Bold, Italic, Strikethrough, List, ListOrdered, ListChecks, Quote, Code2, SquareCode, Link, Image, Table2, Undo2, Redo2, Minus, IndentIncrease, IndentDecrease, Search, Ellipsis, ChevronDown, type LucideIcon } from 'lucide-react'
import type { T,LocaleKey } from '../locale.js'
import type { Format } from './format.js'

export type Action=Format|'link'|'picture'
type Tool={action:Action;key:LocaleKey;icon:LucideIcon;hint?:string}
const tools:Tool[]=[
  {action:'bold',key:'paperBold',icon:Bold,hint:'Ctrl+B'},{action:'italic',key:'paperItalic',icon:Italic,hint:'Ctrl+I'},
  {action:'unordered',key:'paperUnordered',icon:List},{action:'ordered',key:'paperOrdered',icon:ListOrdered},
  {action:'link',key:'paperLink',icon:Link,hint:'Ctrl+K'},{action:'picture',key:'paperPicture',icon:Image},
  {action:'task',key:'paperTask',icon:ListChecks},{action:'undo',key:'paperUndo',icon:Undo2,hint:'Ctrl+Z'},
  {action:'code',key:'paperCode',icon:Code2},{action:'quote',key:'paperQuote',icon:Quote},
  {action:'block-code',key:'paperBlockCode',icon:SquareCode},{action:'strike',key:'paperStrike',icon:Strikethrough},
  {action:'table',key:'paperTable',icon:Table2},{action:'redo',key:'paperRedo',icon:Redo2,hint:'Ctrl+Shift+Z'},
  {action:'rule',key:'paperRule',icon:Minus},{action:'indent',key:'paperIndent',icon:IndentIncrease,hint:'Tab'},
  {action:'outdent',key:'paperOutdent',icon:IndentDecrease,hint:'Shift+Tab'},{action:'find',key:'paperFind',icon:Search,hint:'Ctrl+F'},
]
const order=['bold','italic','strike','unordered','ordered','task','quote','code','block-code','link','picture','table','undo','redo']
interface Props {t:T;run:(action:Action)=>void;active:Set<Format>;heading:string|undefined}
export function FormatBar({t,run,active,heading}:Props){
  const bar=useRef<HTMLDivElement>(null),strip=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement|null>(null)
  const [available,setAvailable]=useState(0),[menu,setMenu]=useState<'heading'|'more'|null>(null)
  useLayoutEffect(()=>{const el=strip.current!,measure=()=>setAvailable(el.clientWidth);measure();const o=new ResizeObserver(measure);o.observe(el);return()=>o.disconnect()},[])
  useEffect(()=>{if(!menu)return;function outside(e:PointerEvent){if(!bar.current?.contains(e.target as Node))setMenu(null)}
    document.addEventListener('pointerdown',outside);bar.current?.querySelector<HTMLButtonElement>('.paper-popup [aria-checked=true],.paper-popup button')?.focus({preventScroll:true});return()=>document.removeEventListener('pointerdown',outside)
  },[menu])
  const count=Math.min(14,Math.max(0,Math.floor((available-95)/33)))
  const shown=tools.slice(0,count).sort((a,b)=>order.indexOf(a.action)-order.indexOf(b.action))
  const invoke=(a:Action)=>{setMenu(null);run(a)}
  const toggle=(e:React.MouseEvent<HTMLButtonElement>,m:'heading'|'more')=>{trigger.current=e.currentTarget;setMenu(menu===m?null:m)}
  return <div className="paper-formatbar" ref={bar} onKeyDown={e=>{
    if(!menu)return
    if(e.key==='Escape'){e.preventDefault();setMenu(null);trigger.current?.focus();return}
    const all=Array.from(bar.current!.querySelectorAll<HTMLButtonElement>('.paper-popup button')),i=all.indexOf(document.activeElement as HTMLButtonElement)
    const index=({ArrowDown:(i+1)%all.length,ArrowUp:(i+all.length-1)%all.length,Home:0,End:all.length-1} as Record<string,number>)[e.key]
    if(index!==undefined){e.preventDefault();all[index]?.focus()}
  }} onBlur={e=>{if(e.relatedTarget&&!bar.current?.contains(e.relatedTarget as Node))setMenu(null)}}>
    <div className="paper-toolstrip" ref={strip}>
      <button type="button" aria-label={t('paperStyles')} aria-haspopup="menu" aria-expanded={menu==='heading'} onClick={e=>toggle(e,'heading')}>{heading?'H'+heading:t('paperParagraph')}<ChevronDown size={12}/></button>
      {shown.map(({action,key,icon:Icon,hint})=><button key={action} type="button" title={t(key)+(hint?' ('+hint+')':'')} aria-label={t(key)} aria-pressed={active.has(action as Format)} onMouseDown={e=>e.preventDefault()} onClick={()=>invoke(action)}><Icon size={16}/></button>)}
      <button aria-label={t('paperFormatMore')} title={t('paperFormatMore')} aria-haspopup="menu" aria-expanded={menu==='more'} onClick={e=>toggle(e,'more')}><Ellipsis size={17}/></button>
    </div>
    {menu&&<div className={'paper-popup '+menu} role="menu" aria-label={t(menu==='heading'?'paperStyles':'paperFormatMore')}>
      {menu==='heading'?[0,1,2,3,4,5,6].map(n=><button key={n} role="menuitemradio" aria-checked={n===Number(heading??0)} onClick={()=>invoke(n?'h'+n as Format:'paragraph')}><small>{n?'H'+n:'¶'}</small>{n?t('paperHeading',{n}):t('paperParagraph')}</button>):tools.slice(count).map(({action,key,icon:Icon,hint})=><button key={action} role="menuitem" onClick={()=>invoke(action)}><Icon size={16}/>{t(key)}<small>{hint}</small></button>)}
    </div>}
  </div>
}
