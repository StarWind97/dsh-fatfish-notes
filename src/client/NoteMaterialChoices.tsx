import {currentMaterials} from '../notes/note-materials.js'
import * as React from 'react'
import {Image,Paperclip} from 'lucide-react'
import type {NoteContent} from '../contracts/notes.js'
import {fileSize} from './NoteAttachments.js'
import type {T} from './locale.js'
export interface MaterialChoice{id:string;name:string;bytes:number|null;image:boolean}
export function noteMaterials(note:NoteContent|undefined):MaterialChoice[]{const active=note&&currentMaterials(note);return note&&active?[...active.assetIds.map((id,i)=>({id:'image:'+id,name:`${i+1} · ${id.slice(0,10)}.${id.split('.')[1]}`,bytes:null,image:true})),...(note.attachments??[]).filter(a=>active.attachmentIds.includes(a.id)).map(a=>({id:'file:'+a.id,name:a.name,bytes:a.bytes,image:false}))]:[]}
export function NoteMaterialChoices({rows,selected,change,disabled=false,t}:{rows:MaterialChoice[];selected:string[];change:(ids:string[])=>void;disabled?:boolean;t:T}){
  return rows.length?<fieldset className="capture-materials" disabled={disabled}><style>{`.capture-materials{border:1px solid var(--rule);border-radius:8px;padding:12px;margin:12px 0;font-size:13px;min-width:0}.capture-materials>div{max-height:240px;overflow:auto}.capture-materials label{display:flex;align-items:center;gap:8px;padding:6px 0;overflow-wrap:anywhere}.capture-materials small{display:block;opacity:.65}`}</style><legend>{t('captureMaterials')}</legend><p><button type="button" onClick={()=>change(rows.map(r=>r.id))}>{t('materialsSelectAll')}</button> · <button type="button" onClick={()=>change([])}>{t('materialsClear')}</button></p><div>{rows.map(row=><label key={row.id}><input type="checkbox" checked={selected.includes(row.id)} onChange={e=>change(e.target.checked?[...selected,row.id]:selected.filter(id=>id!==row.id))}/>{row.image?<Image size={16}/>:<Paperclip size={16}/>}<span>{row.name}{row.bytes!==null&&<small>{fileSize(row.bytes)}</small>}</span></label>)}</div></fieldset>:null
}
