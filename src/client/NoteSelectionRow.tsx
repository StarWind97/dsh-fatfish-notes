import * as React from 'react'
import {RowMenu,type RowAction} from './RowMenu.js'

/** In selection mode one label owns the complete hit area, including its native checkbox. */
export function NoteSelectionRow({selecting,selected,label,rowClass,children,toggle,open,actions,current=false,disabled=false}:{
 selecting:boolean;selected:boolean;label:string;rowClass:string;children:React.ReactNode;toggle:()=>void;open:()=>void;actions:RowAction[];current?:boolean;disabled?:boolean
}){
 if(!selecting)return <RowMenu label={label+' · 操作'} actions={actions}><button className={rowClass} aria-current={current?'true':undefined} onClick={open}>{children}</button></RowMenu>
 return <label className="paper-selection-hit" data-selected={selected} onContextMenu={e=>e.preventDefault()} onClick={e=>{if(e.detail>1)e.preventDefault()}}>
  <input type="checkbox" checked={selected} disabled={disabled} aria-label={label} onChange={()=>toggle()} onKeyDown={e=>{if(e.key==='Enter'&&!e.repeat){e.preventDefault();toggle()}}}/>
  <span className={rowClass}>{children}</span>
  <style>{`.paper-selection-hit{display:flex;align-items:center;gap:8px;width:100%;min-width:0;cursor:pointer;border-radius:5px}.paper-selection-hit[data-selected=true]{background:var(--selected);box-shadow:inset 3px 0 0 var(--accent)}.paper-selection-hit:focus-within{outline:2px solid var(--accent);outline-offset:-2px}.paper-selection-hit>input{width:16px;height:16px;flex:none;accent-color:var(--accent);margin-left:6px}.paper-selection-hit>.paper-row,.paper-selection-hit>.conversation-note-row{display:block;flex:1;min-width:0;text-align:left}.conversation-notes-list article:has(.paper-selection-hit){padding:0}.conversation-notes-list .paper-selection-hit{padding:5px 0}.paper-select-row:has(.paper-selection-hit){padding:0}`}</style>
 </label>
}
