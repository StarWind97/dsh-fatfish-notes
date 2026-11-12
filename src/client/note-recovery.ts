import type { NoteSaveInput } from '../contracts/notes.js'

export interface RecoveryRecord { request: NoteSaveInput & {noteId:string}; inFlight?: NoteSaveInput; editId?:string; sequence?:number }
export type RecoveryStorage = Pick<Storage,'getItem'|'setItem'|'removeItem'>
export function browserStorage(): RecoveryStorage|undefined { try{return globalThis.localStorage}catch{return undefined} }
/** Private browser data, never part of the synced notebook or an export. */
export class NoteRecovery {
  constructor(private readonly storage:RecoveryStorage|undefined, private readonly repository:()=>number|undefined,private readonly scope=''){}
  private key(){const id=this.repository();return id===undefined?null:`fatfish-notes-recovery:1:${id}${this.scope?':'+this.scope:''}`}
  read():RecoveryRecord|null {
    const key=this.key();if(!key||!this.storage)return null
    const value=this.storage.getItem(key);if(!value)return null
    const parsed=JSON.parse(value) as RecoveryRecord
    if(parsed.editId!==undefined&&(!/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(parsed.editId)||!Number.isSafeInteger(parsed.sequence)||Number(parsed.sequence)<0))throw new Error('invalid draft identity')
    const r=parsed?.request,c=r?.content
    if(!r||!/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(r.noteId)||!Array.isArray(r.expectedHeads)||!r.expectedHeads.every(v=>/^[a-f0-9]{64}$/.test(v))||!c||typeof c.title!=='string'||typeof c.body!=='string'||typeof c.summary!=='string'||!Array.isArray(c.tags)||!c.tags.every(t=>typeof t==='string')||!Array.isArray(c.assetIds))throw new Error('invalid recovery record')
    return parsed
  }
  write(value:RecoveryRecord):boolean {try{const key=this.key();if(!key||!this.storage)return false;this.storage.setItem(key,JSON.stringify(value));return true}catch{return false}}
  clear(){try{const key=this.key();if(key)this.storage?.removeItem(key)}catch{/* An idempotent replay will reconcile the saved receipt. */}}
}
