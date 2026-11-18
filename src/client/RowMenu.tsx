import * as React from 'react'
import {createPortal} from 'react-dom'
import {useEffect,useLayoutEffect,useRef,useState} from 'react'
import {useAppearanceProps} from './paper/appearance.js'
import {MoreHorizontal} from 'lucide-react'

export interface RowAction {label:string;run:()=>void;disabled?:boolean;danger?:boolean}
export function RowMenu({children,actions,label,triggerVisible=true,reveal='current'}: {children:React.ReactNode;actions:RowAction[];label:string;triggerVisible?:boolean;reveal?:'current'|'interaction'}){
  const appearance=useAppearanceProps()
  const [at,setAt]=useState<{x:number;y:number}|null>(null),menu=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),origin=useRef<HTMLElement|null>(null)
  function close(restore=false){setAt(null);if(restore&&origin.current?.isConnected)origin.current.focus({preventScroll:true})}
  useLayoutEffect(()=>{if(!at||!menu.current)return;const el=menu.current;const r=el.getBoundingClientRect();el.style.left=`${Math.max(8,Math.min(at.x,innerWidth-r.width-8))}px`;el.style.top=`${Math.max(8,Math.min(at.y,innerHeight-r.height-8))}px`;el.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({preventScroll:true})},[at])
  useEffect(()=>{if(!at)return;const outside=(e:PointerEvent)=>{if(!menu.current?.contains(e.target as Node)&&!trigger.current?.contains(e.target as Node))close()};const dismiss=()=>close();const scroll=(e:Event)=>{if(!menu.current?.contains(e.target as Node))close()};document.addEventListener('pointerdown',outside,true);document.addEventListener('scroll',scroll,true);window.addEventListener('resize',dismiss);return()=>{document.removeEventListener('pointerdown',outside,true);document.removeEventListener('scroll',scroll,true);window.removeEventListener('resize',dismiss)}},[at])
  return <div className="paper-menu-row" data-menu-reveal={reveal} onContextMenu={e=>{e.preventDefault();e.stopPropagation();origin.current=(e.target as HTMLElement).closest('button')??trigger.current;setAt({x:e.clientX,y:e.clientY})}}><style>{rowMenuCss}</style>{children}{triggerVisible&&<button type="button" className="paper-row-more" ref={trigger} aria-label={label} title={label} aria-haspopup="menu" aria-expanded={!!at} onClick={e=>{e.stopPropagation();if(at){close(true);return}origin.current=trigger.current;const r=e.currentTarget.getBoundingClientRect();setAt({x:r.left,y:r.bottom+4})}}><MoreHorizontal size={16}/></button>}{at&&createPortal(<div ref={menu} className="paper-row-menu" role="menu" aria-label={label} {...appearance} style={{...appearance.style,left:at.x,top:at.y}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true)}if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const buttons=Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')),i=buttons.indexOf(document.activeElement as HTMLButtonElement);buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:buttons.length-1))%buttons.length]?.focus()}}}>{actions.map((a,i)=><button key={i} role="menuitem" disabled={a.disabled} data-danger={a.danger} onClick={()=>{close(true);a.run()}}>{a.label}</button>)}</div>,document.body)}</div>
}
const revealedMenu = `.paper-menu-row:is(
  :hover,
  :has(>button:focus-visible,>button.paper-row-more[aria-expanded=true]),
  :not([data-menu-reveal=interaction]):is(:focus-within,:has(>button[aria-current]))
)`
export const rowMenuCss=`.paper-tabs-overflow{position:fixed;z-index:2100;width:min(360px,calc(100vw - 16px));max-height:min(60vh,500px);overflow:auto;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#222);border:1px solid var(--dsw-alias-border-l2,#ccc);border-radius:8px;padding:6px;box-shadow:0 6px 22px #0003;font:13px/1.6 system-ui}.paper-tabs-overflow header{padding:6px 8px;color:var(--dsw-alias-label-secondary,#777)}.paper-tabs-overflow button{padding:8px;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.paper-tabs-overflow button:hover{background:#8882}
.paper-menu-row{position:relative;display:flex;align-items:center;min-width:0}
.paper-menu-row>button:first-of-type{min-width:0;flex:1}
.paper-menu-row>button.paper-row-more{position:absolute;inset-inline-end:3px;top:50%;transform:translateY(-50%);z-index:1;width:26px;height:26px;min-height:0!important;margin:0;padding:5px!important;border-radius:5px;opacity:0;pointer-events:none;background:linear-gradient(var(--row-menu-tint,transparent),var(--row-menu-tint,transparent)) var(--base,var(--dsw-alias-bg-layer-1,#fff))}
.paper-menu-row:is(:hover,:focus-within,:has(>button[aria-current])){--row-menu-tint:var(--selected,transparent)}
${revealedMenu}>button.paper-row-more{opacity:1;pointer-events:auto}
${revealedMenu}>button>.paper-notebook-count{opacity:0}
@media(hover:none){.paper-menu-row>button.paper-row-more{opacity:1;pointer-events:auto}.paper-menu-row>button>.paper-notebook-count{opacity:0}}
.paper-row-menu{position:fixed;z-index:2200;width:190px;max-height:calc(100vh - 16px);overflow:auto;border:1px solid var(--dsw-alias-border-l2,#ccc);border-radius:9px;padding:5px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#222);box-shadow:0 6px 22px #0003;font:13px/1.6 system-ui}.paper-row-menu button{display:block;width:100%;text-align:left;padding:7px 11px;border:0;border-radius:5px;background:transparent;color:inherit;cursor:pointer}.paper-row-menu button:hover,.paper-row-menu button:focus-visible{background:var(--dsw-alias-bg-layer-2,#8882);outline:none}.paper-row-menu button[data-danger=true]{color:light-dark(#b33333,#f1a0a0)}.paper-row-menu button:disabled{opacity:.4;cursor:default}`
