import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import { NotebookError } from '../domain/errors.js'
import type { WindowIdentity,WindowSurface,EditLease,WorkspaceState,WindowTheme } from '../contracts/workspace.js'

export const windowRequest=new AsyncLocalStorage<WindowIdentity|undefined>()
interface Session { surface:WindowSurface; seen:number }
interface Lease extends EditLease { windowId:string }
interface Handoff { id:string;noteId:string;from:string;to:string;expiresAt:number }
const fail=(code:string):never=>{throw new NotebookError(code,'请在当前笔记窗口核对编辑状态后继续',409)}
export const EDIT_LEASE_MS=90_000
/** All state transitions run inside the same repository queue as protected writes. */
export class EditCoordinator {
  epoch=randomUUID()
  private sessions=new Map<string,Session>()
  private leases=new Map<string,Lease>()
  private transfer:Handoff|null=null
  private command:{id:string;noteId:string}|null=null
  private theme:WindowTheme|null=null
  private maintenance=false
  available=false
  constructor(private readonly repository:()=>number|null,private readonly generation:()=>number,private readonly now=Date.now){}
  private prune(){const now=this.now();for(const [id,l] of this.leases)if(l.expiresAt<=now)this.leases.delete(id);if(this.transfer&&(this.transfer.expiresAt<=now||!this.leases.has(this.transfer.noteId)))this.transfer=null;for(const [id,s] of this.sessions)if(s.seen+24*60*60*1000<now&&!Array.from(this.leases.values()).some(l=>l.windowId===id))this.sessions.delete(id)}
  register(windowId:string,surface:WindowSurface){
    this.prune();if(!/^[a-f0-9-]{36}$/.test(windowId)||!['embedded','standalone'].includes(surface))return fail('window_invalid')
    const existing=this.sessions.get(windowId);if(existing&&existing.surface!==surface)return fail('window_invalid')
    this.sessions.set(windowId,{surface,seen:this.now()});return this.state({windowId,serviceEpoch:this.epoch})
  }
  private session(actor:WindowIdentity|undefined){
    this.prune();if(!actor||actor.serviceEpoch!==this.epoch||!this.sessions.has(actor.windowId))return fail('window_expired')
    const s=this.sessions.get(actor.windowId)!;s.seen=this.now();return s
  }
  state(actor:WindowIdentity,noteId?:string,theme?:WindowTheme):WorkspaceState {
    const s=this.session(actor)
    if(theme&&s.surface==='embedded')this.theme=theme
    const own=Array.from(this.leases.values()).find(l=>l.windowId===actor.windowId)
    // A heartbeat does not resurrect an expired or handed-off lease.
    if(own)own.expiresAt=this.now()+EDIT_LEASE_MS
    const owner=noteId?this.leases.get(noteId):undefined,t=this.transfer
    return {ok:true,serviceEpoch:this.epoch,repositoryId:this.repository(),changeSeq:this.generation(),available:this.available,owner:owner&&owner.windowId!==actor.windowId?this.sessions.get(owner.windowId)?.surface??null:null,
      owned:own?{noteId:own.noteId,leaseId:own.leaseId,expiresAt:own.expiresAt}:null,handoff:t&&(t.from===actor.windowId||t.to===actor.windowId)?{id:t.id,noteId:t.noteId,incoming:t.from===actor.windowId}:null,command:s.surface==='standalone'?this.command:null,theme:this.theme}
  }
  acquire(actor:WindowIdentity,noteId:string){
    this.session(actor);if(this.maintenance)return fail('notebook_busy')
    const current=this.leases.get(noteId)
    if(current&&current.windowId!==actor.windowId)return fail('note_edit_busy')
    const other=Array.from(this.leases.values()).find(l=>l.windowId===actor.windowId&&l.noteId!==noteId)
    if(other)return fail('note_edit_finish')
    if(!current)this.leases.set(noteId,{windowId:actor.windowId,noteId,leaseId:randomUUID(),expiresAt:this.now()+EDIT_LEASE_MS})
    return this.state(actor,noteId)
  }
  release(actor:WindowIdentity,noteId?:string){
    this.session(actor)
    for(const [id,l] of this.leases){if(l.windowId!==actor.windowId||(noteId&&id!==noteId))continue
      if(actor.leaseId!==l.leaseId)return fail('note_edit_lost')
      this.leases.delete(id)
      const t=this.transfer
      if(t&&t.noteId===id&&t.from===actor.windowId){this.transfer=null;this.leases.set(id,{windowId:t.to,noteId:id,leaseId:randomUUID(),expiresAt:this.now()+EDIT_LEASE_MS})}
    }
    return this.state(actor,noteId)
  }
  handoff(actor:WindowIdentity,noteId:string){
    this.session(actor);if(this.maintenance)return fail('notebook_busy')
    const l=this.leases.get(noteId);if(!l||l.windowId===actor.windowId)return this.acquire(actor,noteId)
    if(Array.from(this.leases.values()).some(v=>v.windowId===actor.windowId))return fail('note_edit_finish')
    if(this.transfer&&this.transfer.to!==actor.windowId)return fail('note_edit_busy')
    this.transfer={id:randomUUID(),noteId,from:l.windowId,to:actor.windowId,expiresAt:this.now()+45_000};return this.state(actor,noteId)
  }
  cancel(actor:WindowIdentity,requestId?:string){this.session(actor);if(this.transfer&&this.transfer.id===requestId&&(this.transfer.to===actor.windowId||this.transfer.from===actor.windowId))this.transfer=null;return this.state(actor)}
  check(ids:string[],actor=windowRequest.getStore(),requireLease=false){
    this.prune();if(this.maintenance)return fail('notebook_busy')
    if(actor)this.session(actor)
    const occupied=new Set(ids.filter(id=>{const l=this.leases.get(id);return l&&(!actor||l.windowId!==actor.windowId)}))
    if(occupied.size){const error=new NotebookError('note_edit_busy','相关笔记正在另一窗口中编辑，请先完成编辑或交接',409);error.affectedCount=occupied.size;throw error}
    for(const id of ids){const l=this.leases.get(id)
      if(requireLease&&actor&&(!l||actor.leaseId!==l.leaseId))return fail('note_edit_lost')
      if(l&&(!actor||l.windowId!==actor.windowId))return fail('note_edit_busy')
      if(actor?.leaseId&&(!l||actor.leaseId!==l.leaseId))return fail('note_edit_lost')
      if(l&&actor?.leaseId!==l.leaseId)return fail('note_edit_lost')
    }
  }
  beginLocationChange(){this.prune();if(this.leases.size||this.maintenance)return fail('note_edit_busy');this.maintenance=true}
  endLocationChange(changed:boolean){this.maintenance=false;if(changed){this.epoch=randomUUID();this.sessions.clear();this.leases.clear();this.transfer=null;this.command=null}}
  requestOpen(noteId?:string){if(noteId)this.command={id:randomUUID(),noteId}}
  acknowledge(actor:WindowIdentity,id?:string){const s=this.session(actor);if(s.surface==='standalone'&&id===this.command?.id)this.command=null;return this.state(actor)}
}
