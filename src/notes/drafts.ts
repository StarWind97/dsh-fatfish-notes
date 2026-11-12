import { mkdir, open, readdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { NoteSaveInput } from '../contracts/notes.js'
import { missing, readBytes, replaceFile, safePath, syncDirectory, utf8 } from './files.js'
import { id, object, normalizeContent, sortedStrings, hash, relativePath, fail } from './validation.js'

export interface LocalDraft {
  editId:string; noteId:string; sequence:number; state:'editing'|'finished'|'discarded'
  request?:NoteSaveInput & {noteId:string}; files:string[]; resultId?:string; resultHeads?:string[]
}
/** Local only, outside notes/. Small receipts prevent cancelled/completed browser journals replaying. */
export class DraftFiles {
  constructor(readonly root:string){}
  async read(editId:string):Promise<LocalDraft|null>{
    const read=async(folder:string)=>{const bytes=await readBytes(join(folder,id(editId)+'.json'),12*1024*1024).catch(e=>{if(missing(e))return null;throw e});return bytes?object(JSON.parse(utf8(bytes))):null}
    const active=await read(this.root),receipt=await read(join(this.root,'receipts'))
    const v=receipt&&(!active||Number(receipt.sequence)>=Number(active.sequence))?receipt:active
    if(!v)return null
    if(v.editId!==editId||!['editing','finished','discarded'].includes(String(v.state))||!Number.isSafeInteger(v.sequence)||Number(v.sequence)<0||!Array.isArray(v.files))fail('note_draft_invalid')
    const result:LocalDraft={editId,noteId:id(v.noteId),sequence:Number(v.sequence),state:v.state as LocalDraft['state'],files:v.files.map(p=>relativePath(String(p)))}
    if(result.files.some(p=>! /^(assets\/[a-f0-9]{64}\.(png|jpg|gif|webp)|attachments\/[a-f0-9]{64}\.bin)$/.test(p)))fail('note_draft_invalid')
    if(v.request){const r=object(v.request);result.request={noteId:id(r.noteId),expectedHeads:sortedStrings(r.expectedHeads,100000,hash),content:normalizeContent(r.content)};if(result.request.noteId!==result.noteId)fail('note_draft_invalid')}
    if(result.state==='editing'&&!result.request)fail('note_draft_invalid')
    if(v.resultId!==undefined)result.resultId=id(v.resultId)
    if(v.resultHeads!==undefined)result.resultHeads=sortedStrings(v.resultHeads,100000,hash)
    return result
  }
  async list(includeReceipts=false){
    await safePath(this.root)
    const names:string[]=await readdir(this.root).catch(e=>{if(missing(e))return [];throw e})
    if(includeReceipts){await safePath(join(this.root,'receipts'));names.push(...await readdir(join(this.root,'receipts')).catch(e=>{if(missing(e))return [];throw e}))}
    const rows:LocalDraft[]=[]
    for(const name of [...new Set(names)].sort())if(/^[0-7][0-9A-HJKMNP-TV-Z]{25}\.json$/.test(name)){const row=await this.read(name.slice(0,-5));if(row)rows.push(row)}
    return rows
  }
  async write(row:LocalDraft){
    const folder=row.state==='editing'?this.root:join(this.root,'receipts')
    const path=join(folder,id(row.editId)+'.json');await safePath(path);await mkdir(folder,{recursive:true});await safePath(folder)
    const temp=join(folder,'.tmp-'+randomUUID()),handle=await open(temp,'wx',0o600)
    try{await handle.writeFile(JSON.stringify(row));await handle.sync()}finally{await handle.close()}
    try{await safePath(path);await replaceFile(temp,path);await syncDirectory(folder)}finally{await unlink(temp).catch(e=>{if(!missing(e))throw e})}
    if(row.state!=='editing'){const active=join(this.root,row.editId+'.json');await safePath(active);await unlink(active).catch(e=>{if(!missing(e))throw e})}
  }
}
