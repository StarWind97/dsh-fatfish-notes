import {appearanceKey,appearanceValue,migrateLayout,migratePalette,parseAppearance,type Appearance} from '../domain/appearance.js'
import type {Api} from './api.js'
import type {AppearancePatch,AppearanceState} from '../contracts/appearance.js'
import type {WindowSurface} from '../contracts/workspace.js'
import {readTheme,applyTheme} from './host-theme.js'

type Pending={operationId:string;patch:AppearancePatch}
export type AppearanceSyncStatus='local'|'connecting'|'waiting'|'saving'|'saved'|'error'
const pendingKey=appearanceKey+'.pending',backupKey=appearanceKey+'.legacy'
function storage(){try{return globalThis.localStorage}catch{return undefined}}
/** A shared profile is authoritative; browser storage only caches and retains pending edits. */
export class AppearancePreferences {
  private value:Appearance
  private status:AppearanceSyncStatus='local'
  private listeners=new Set<()=>void>()
  private statusListeners=new Set<()=>void>()
  private legacy:string|null
  private server:AppearanceState|undefined
  private queue:Pending[]=[]
  private queueStore:string|undefined
  private api:Api|undefined
  private ready:(()=>Promise<void>)|undefined
  private surface:WindowSurface='standalone'
  private stopped=false
  private connecting=false
  private flushing=false
  private watcher:AbortController|undefined
  private retry:ReturnType<typeof setTimeout>|undefined
  private observer:MutationObserver|undefined
  private themeSent=''
  private themeSending=false
  constructor(private disk:Pick<Storage,'getItem'|'setItem'|'removeItem'>|undefined=storage()){
    try{this.legacy=this.disk?.getItem(appearanceKey)??null}catch{this.legacy=null}
    this.value=parseAppearance(this.legacy)
    try {
      const pending = JSON.parse(this.disk?.getItem(pendingKey) ?? 'null')
      if (pending && typeof pending.storeId === 'string' && Array.isArray(pending.queue)) {
        this.queueStore = pending.storeId
        for (const entry of pending.queue) {
          if (!entry || typeof entry.operationId !== 'string' || !entry.patch || typeof entry.patch !== 'object' || Array.isArray(entry.patch)) continue
          const patch = { ...entry.patch }
          if (Object.hasOwn(patch, 'layout')) patch.layout = migrateLayout(patch.layout)
          if (Object.hasOwn(patch, 'palette')) patch.palette = migratePalette(patch.palette)
          this.queue.push({ operationId: entry.operationId, patch })
          if (this.queue.length === 128) break
        }
      }
    } catch { /* A damaged local queue cannot replace server settings. */ }
  }
  getSnapshot=()=>this.value
  getStatus=()=>this.status
  subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn)}}
  subscribeStatus=(fn:()=>void)=>{this.statusListeners.add(fn);return()=>{this.statusListeners.delete(fn)}}
  private state(status:AppearanceSyncStatus){if(this.status===status)return;this.status=status;for(const fn of this.statusListeners)fn()}
  private show(value:Appearance){if(JSON.stringify(value)===JSON.stringify(this.value))return;this.value=value;for(const fn of this.listeners)fn()}
  private saveQueue(){try{if(this.queue.length&&this.queueStore)this.disk?.setItem(pendingKey,JSON.stringify({storeId:this.queueStore,queue:this.queue}));else this.disk?.removeItem(pendingKey)}catch{/* Keep in-memory edits and report host persistence independently. */}}
  private cache(){try{if(this.disk?.getItem(backupKey)===null)this.disk.setItem(backupKey,JSON.stringify({value:this.legacy}));this.disk?.setItem(appearanceKey,JSON.stringify(this.value))}catch{/* The host remains authoritative. */}}
  set(patch:Partial<Appearance>){
    const normalized=appearanceValue({...this.value,...patch}),changes:AppearancePatch={}
    for(const key of Object.keys(patch) as (keyof Appearance)[])if(key!=='version'&&key!=='mode'&&key in normalized)(changes as Record<string,unknown>)[key]=normalized[key]
    if(!Object.keys(changes).length)return
    this.show(normalized)
    if(!this.api){this.cache();return}
    this.queue.push({operationId:crypto.randomUUID(),patch:changes});this.queueStore??=this.server?.storeId;this.saveQueue();this.state('saving');void this.flush()
  }
  start(surface:WindowSurface,api:Api,ready:()=>Promise<void>){
    this.surface=surface;this.api=api;this.ready=ready;this.stopped=false;this.state('connecting');void this.connect()
    if(typeof window!=='undefined'){
      window.addEventListener('online',this.refresh);window.addEventListener('focus',this.refresh)
      if(surface==='embedded'){this.observer=new MutationObserver(()=>void this.publishTheme());for(const node of [document.body,document.documentElement])this.observer.observe(node,{attributes:true,attributeFilter:['class','style','data-ds-dark-theme','lang']})}
    }
    return()=>this.stop()
  }
  private accept(next:AppearanceState){
    if(this.server?.epoch===next.epoch&&next.sequence<this.server.sequence)next=this.server
    this.server=next
    if(this.queueStore&&this.queueStore!==next.storeId){this.queue=[];this.saveQueue()}
    this.queueStore=next.storeId
    if(next.value){let value=next.value;for(const item of this.queue)value=appearanceValue({...value,...item.patch});this.show(value);this.cache();this.saveQueue()}
    if(this.surface==='standalone'&&next.theme&&typeof document!=='undefined')applyTheme(next.theme)
    if(!this.queue.length)this.state(next.value?'saved':'waiting')
  }
  private later(){if(this.retry||this.stopped)return;this.retry=setTimeout(()=>{this.retry=undefined;void this.connect()},3000)}
  private async connect(){
    if(this.stopped||this.connecting||!this.api)return
    this.connecting=true
    try{
      await this.ready?.()
      const theme=this.surface==='embedded'&&typeof document!=='undefined'?readTheme():undefined
      const next=await this.api('/appearance/connect',{legacy:this.legacy,...(theme?{theme}:{})})
      if(this.stopped)return
      this.themeSent=JSON.stringify(theme??null);this.accept(next);void this.flush();void this.watch();void this.publishTheme()
    }catch{if(!this.stopped){this.state('error');this.later()}}finally{this.connecting=false}
  }
  private async watch(){
    if(this.stopped||this.watcher||!this.server||!this.api)return
    const controller=new AbortController();this.watcher=controller
    try{
      while(!this.stopped&&!controller.signal.aborted){const {epoch,sequence}=this.server;this.accept(await this.api('/appearance/wait',{epoch,sequence},controller.signal));void this.flush()}
    }catch{if(!this.stopped&&!controller.signal.aborted){this.state('error');this.later()}}
    finally{if(this.watcher===controller)this.watcher=undefined}
  }
  private async flush(){
    if(this.stopped||this.flushing||!this.server?.value||!this.api)return
    this.flushing=true
    try{while(this.queue.length&&!this.stopped){
      this.state('saving');const item=this.queue[0]!,next=await this.api('/appearance/update',{storeId:this.server.storeId,...item})
      if(this.stopped)return
      this.queue.shift();this.saveQueue();this.accept(next)
    }}catch{if(!this.stopped){this.state('error');this.later()}}finally{this.flushing=false}
  }
  private async publishTheme(){
    if(this.stopped||this.surface!=='embedded'||!this.server||!this.api||this.themeSending||typeof document==='undefined')return
    this.themeSending=true
    try{for(;;){const theme=readTheme(),key=JSON.stringify(theme??null);if(!theme||key===this.themeSent||this.stopped)break;this.accept(await this.api('/appearance/theme',{theme}));this.themeSent=key}}
    catch{if(!this.stopped){this.state('error');this.later()}}finally{this.themeSending=false}
  }
  refresh=()=>{if(this.stopped)return;void this.connect()}
  stop(){this.stopped=true;clearTimeout(this.retry);this.retry=undefined;this.watcher?.abort();this.observer?.disconnect();if(typeof window!=='undefined'){window.removeEventListener('online',this.refresh);window.removeEventListener('focus',this.refresh)}}
}
export const appearancePreferences=new AppearancePreferences()
