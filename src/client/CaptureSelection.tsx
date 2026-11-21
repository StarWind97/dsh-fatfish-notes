import * as React from 'react'
import { Check, ChevronDown, MessagesSquare } from 'lucide-react'
import type { CaptureMessage } from '../contracts/notes.js'
import type { NoteCaptureBridge, NoteCaptureState } from './note-capture-bridge.js'
import type { IndexedSelection } from './capture-turns.js'
import type { T } from './locale.js'

function TurnRow({messages, index, anchor, selected, toggle, initiallyOpen = false, t}: {
  messages:CaptureMessage[]; index:number; anchor:boolean; selected:ReadonlySet<string>; toggle:(ids:string[])=>void; initiallyOpen?:boolean; t:T
}) {
  const [open,setOpen] = React.useState(initiallyOpen)
  const detailId = React.useId(), ids = messages.map(m=>m.id)
  const count = ids.filter(id=>selected.has(id)).length
  const summary = messages[0]!.blocks.find(b=>b.type==='text' && b.text.trim())
  const label = t('captureTurn',{n:index+1})
  return <div className="capture-turn">
    <div className="capture-turn-line">
      <input type="checkbox" aria-label={label} checked={count===ids.length}
        ref={el=>{if(el)el.indeterminate=count>0 && count<ids.length}}
        onChange={()=>toggle(ids)}/>
      <button type="button" aria-expanded={open} aria-controls={detailId} onClick={()=>setOpen(!open)}>
        <span className="capture-turn-index">{label}</span>
        <span className="capture-turn-excerpt">{summary?.type==='text' ? summary.text : t('noteImage')}</span>
        {anchor && <small>{t('captureCurrent')}</small>}<ChevronDown aria-hidden="true" size={15}/>
      </button>
    </div>
    {open && <div id={detailId} className="capture-messages">{messages.map(message=><label key={message.id} className="notes-capture-message">
      <input type="checkbox" checked={selected.has(message.id)} onChange={()=>toggle([message.id])}/>
      <span><strong>{message.role==='user' ? t('messageUser') : 'AI'}</strong>{message.blocks.map((block,i)=><span key={i}>{block.type==='text' ? block.text : t('noteImage')}</span>)}</span>
    </label>)}</div>}
  </div>
}
export function CaptureTurnList({selection, selected, anchorMessageId, toggle, t}: {
  selection:IndexedSelection; selected:ReadonlySet<string>; anchorMessageId:string|undefined; toggle:(ids:string[])=>void; t:T
}) {
  const [limit,setLimit] = React.useState(80)
  return <>
    <div className="capture-turns">{selection.turns.slice(0,limit).map((messages,index)=><TurnRow key={messages[0]!.id}
      messages={messages} index={index} anchor={messages.some(message=>message.id===anchorMessageId)} selected={selected} toggle={toggle} t={t}/>)}</div>
    {limit<selection.turns.length && <button type="button" className="capture-expand" onClick={()=>setLimit(limit+80)}>{t('captureMore')}</button>}
  </>
}
export function CaptureSelection({state, selection, bridge, t}: {
  state:NoteCaptureState; selection:IndexedSelection; bridge:NoteCaptureBridge; t:T
}) {
  const [all,setAll] = React.useState(false)
  const turns = selection.turns
  const selected = new Set(state.selected), whole = state.scope==='session'
  const anchor = turns.findIndex(messages=>messages.some(m=>m.id===state.anchorMessageId))
  const visible = turns.map((messages,index)=>({messages,index})).filter(({messages,index})=>all || index===anchor || messages.some(m=>selected.has(m.id)))
  const count = whole ? selection.messages.length : selected.size
  return <section className="capture-selection">
    <div className="capture-scope" role="group" aria-label={t(state.exporting?'chatExportRange':'captureRange')}>
      {(['selection','session'] as const).map(scope=><button type="button" key={scope} aria-pressed={state.scope===scope} onClick={()=>bridge.setScope(scope)}>
        {t(scope==='session'?'captureWhole':'captureTurns')}</button>)}
    </div>
    {whole ? <div className="capture-whole"><MessagesSquare size={19} aria-hidden="true"/><div><strong>{t('captureWhole')}</strong><small>{t('captureTotal',{turns:turns.length,messages:count})}</small></div><Check size={16} aria-hidden="true"/></div> :
      <><div className="capture-turns">{visible.map(({messages,index})=><TurnRow key={messages[0]!.id} messages={messages} index={index} anchor={index===anchor} selected={selected}
        toggle={ids=>bridge.toggleMessages(ids)} initiallyOpen={messages.some(m=>selected.has(m.id))} t={t}/>)}</div>
      {turns.length>1 && <button type="button" className="capture-expand" aria-expanded={all} onClick={()=>setAll(!all)}>{t(all?'captureCollapse':'captureMore')}<ChevronDown size={14} aria-hidden="true"/></button>}</>}
    {!selection.complete && <p role="alert">{t(state.exporting?'chatExportPartial':'notePartialSource')}</p>}
  </section>
}
