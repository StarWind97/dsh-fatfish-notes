import { api, type Api } from './api.js'
import type { PersonalSyncState } from '../contracts/personal.js'

/** Foreground remote checks are separate from lightweight local status reads. */
export class NotebookSync {
  private value:PersonalSyncState|null=null
  private listeners=new Set<()=>void>()
  private reading:Promise<void>|null=null
  private starting:Promise<void>|null=null
  private lastCheck=0
  private timer:ReturnType<typeof setInterval>|undefined
  private visible=false
  private closed=false
  constructor(private readonly call:Api=api,private readonly now=Date.now){}
  start(){this.closed=false;this.lastCheck=0;this.value=null}
  getSnapshot=()=>this.value
  subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn)}}
  private accept(value:PersonalSyncState){if(this.closed)return;this.value=value;this.listeners.forEach(fn=>fn())}
  localChanged(){if(this.value)this.accept({...this.value,pending:true})}
  read():Promise<void>{
    if(this.reading)return this.reading
    this.reading=this.call('/personal',undefined).then(r=>this.accept(r.sync)).catch(()=>{}).finally(()=>{this.reading=null})
    return this.reading
  }
  request(force=false):Promise<void>{
    if(this.closed)return Promise.resolve()
    if(this.starting)return this.starting
    if(!force&&this.lastCheck&&this.now()-this.lastCheck<60_000)return this.read()
    this.lastCheck=this.now()
    this.starting=this.call('/personal/sync/start',{}).then(r=>this.accept(r.sync)).catch(()=>{this.lastCheck=0;void this.read()}).finally(()=>{this.starting=null})
    return this.starting
  }
  foreground(visible:boolean){
    this.visible=visible
    if(visible){void this.request();this.timer??=setInterval(()=>this.tick(),3000)}
    else{clearInterval(this.timer);this.timer=undefined}
  }
  tick(){if(!this.visible||this.closed)return;void this.read();if(this.now()-this.lastCheck>=300_000)void this.request()}
  dispose(){this.closed=true;clearInterval(this.timer);this.timer=undefined;this.visible=false;this.listeners.clear()}
}
export const notebookSync=new NotebookSync()
