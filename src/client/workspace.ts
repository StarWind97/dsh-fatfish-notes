import {api,ApiError,setWindowHeaders,type Api} from './api.js'
import type {EditAccess,NotesController} from './notes-controller.js'
import type {WorkspaceState,WindowSurface,WindowTheme} from '../contracts/workspace.js'
import {browserStorage} from './note-recovery.js'

export interface WindowState { connected:boolean;registered:boolean;server:WorkspaceState|null;busy:boolean;message:string|null;restart:boolean }
/** Shared lifecycle for embedded and standalone views; no second note writer. */
export class NotesWorkspace implements EditAccess {
  readonly windowId:string
  readonly recoveryScope:string
  private state:WindowState={connected:false,registered:false,server:null,busy:false,message:null,restart:false}
  private listeners=new Set<()=>void>()
  private registration:Promise<void>|undefined
  private chain:Promise<unknown>=Promise.resolve()
  private timer:ReturnType<typeof setInterval>|undefined
  private polling=false
  private handling=false
  private stopped=false
  private controller:NotesController|undefined
  private seenSequence=-1
  private requestedHandoff:string|null=null
  constructor(readonly surface:WindowSurface,private readonly call:Api=api){
    const key=`fatfish-notes-window:${surface}`,storage=browserStorage()
    let id:string|undefined
    try{id=storage?.getItem(key)??undefined}catch{}
    this.windowId=id&&/^[a-f0-9-]{36}$/.test(id)?id:crypto.randomUUID()
    try{storage?.setItem(key,this.windowId)}catch{}
    this.recoveryScope=`${surface}:${this.windowId}`
  }
  getSnapshot=()=>this.state
  subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn)}}
  private emit(patch:Partial<WindowState>){this.state={...this.state,...patch};this.listeners.forEach(fn=>fn())}
  bind(controller:NotesController){this.controller=controller}
  start(){
    setWindowHeaders((path,body)=>{
      const s=this.state.server,headers:Record<string,string>={'x-notebook-window':this.windowId,'x-notebook-epoch':s?.serviceEpoch??''}
      const noteId=body&&typeof body==='object'&&'noteId' in body?body.noteId:undefined
      if(s?.owned&&(noteId===s.owned.noteId||path==='/workspace/action'))headers['x-notebook-lease']=s.owned.leaseId
      return headers
    })
    void this.ready().catch(()=>{})
    this.timer=setInterval(()=>void this.poll(),2000)
  }
  dispose(){this.stopped=true;clearInterval(this.timer);setWindowHeaders(()=>({}));this.listeners.clear()}
  private serial<T>(work:()=>Promise<T>):Promise<T>{const result=this.chain.then(work,work);this.chain=result.catch(()=>{});return result}
  private accept(server:WorkspaceState){
    const prior=this.state.server
    if(prior&&(server.serviceEpoch!==prior.serviceEpoch||server.repositoryId!==prior.repositoryId)){
      this.controller?.pauseInput(true);this.emit({connected:false,restart:true,message:'windowRestart'});return
    }
    this.emit({server,registered:true,connected:true,...(this.state.message==='windowOffline'?{message:null}:{})})
    if(this.surface==='standalone'&&server.theme)applyTheme(server.theme)
    this.controller?.pauseInput(this.state.busy||this.state.restart)
  }
  ready():Promise<void>{
    if(this.state.registered)return Promise.resolve()
    return this.registration??=this.serial(async()=>{
      try{this.accept(await this.call('/workspace/register',{windowId:this.windowId,surface:this.surface}))}
      catch(e){this.emit({connected:false,message:'windowOffline'});throw e}
      finally{this.registration=undefined}
    })
  }
  writable(noteId:string){const s=this.state;return s.connected&&!s.restart&&s.server?.owned?.noteId===noteId&&s.server.owned.expiresAt>Date.now()}
  private async action(action:'acquire'|'release'|'handoff'|'cancel'|'ack',noteId?:string,requestId?:string){
    await this.ready()
    return this.serial(async()=>{try{const s=await this.call('/workspace/action',{action,...(noteId?{noteId}:{}),...(requestId?{requestId}:{})});this.accept(s);return s}catch(e){await this.failed(e);throw e}})
  }
  async acquire(noteId:string){if(this.state.restart)throw new ApiError('window_expired');await this.action('acquire',noteId);this.emit({message:null})}
  async release(noteId?:string){if(!this.state.server?.owned)return;await this.action('release',noteId)}
  private async failed(e:unknown){
    const code=e instanceof ApiError?e.code:'network'
    if(['network','window_expired','personal_repository_changed'].includes(code)){
      this.controller?.pauseInput(true);this.emit({connected:false,message:code==='network'?'windowOffline':'windowRestart',restart:code!=='network'})
      if(code!=='network'){
        try{const live=await this.call('/workspace/register',{windowId:this.windowId,surface:this.surface})
          if(live.serviceEpoch!==this.state.server?.serviceEpoch||live.repositoryId!==this.state.server?.repositoryId){if(!this.controller?.getSnapshot().composing&&!this.controller?.importing)location.reload()}
        }catch{/* Retry when the original DSH service becomes available. */}
      }
    }
  }
  async poll(){
    if(this.stopped||this.polling)return
    this.polling=true
    try{
      await this.ready()
      const c=this.controller,selected=c?.getSnapshot().noteId
      const theme=this.surface==='embedded'?readTheme():undefined
      await this.serial(async()=>this.accept(await this.call('/workspace/state',{...(selected?{noteId:selected}:{}),...(theme?{theme}:{})})))
      if(this.state.restart){if(!c?.getSnapshot().composing&&!c?.importing)location.reload();return}
      const s=this.state.server!
      if(this.requestedHandoff&&selected!==this.requestedHandoff){await this.cancel();if(s.owned)await this.release(s.owned.noteId)}
      if(c?.getSnapshot().editing&&!this.writable(c.getSnapshot().noteId!)){
        c.pauseInput(true);this.emit({message:'windowLeaseLost'})
      }
      if(s.changeSeq!==this.seenSequence){this.seenSequence=s.changeSeq;if(c&&!c.getSnapshot().loadingList)await c.refresh(true,true)}
      const h=s.handoff
      if(h?.incoming&&c&&!this.handling&&!c.getSnapshot().composing&&!c.importing){
        this.handling=true;this.emit({busy:true});c.pauseInput(true)
        try{if(!await c.saveEdits()){await this.action('cancel',undefined,h.id);this.emit({message:'windowHandoffFailed'})}}
        finally{this.handling=false;this.emit({busy:false});c.pauseInput(false)}
      }
      if(this.requestedHandoff&&s.owned?.noteId===this.requestedHandoff&&c){
        const noteId=this.requestedHandoff;this.requestedHandoff=null
        // Do not use open(): its leave path would release the newly granted lease.
        if(c.getSnapshot().noteId===noteId)await c.beginEdit()
      }
      if(s.command&&this.surface==='standalone'&&c&&!this.handling){
        if(!c.getSnapshot().editing||c.getSnapshot().noteId===s.command.noteId){await this.openCommand(true)}
      }
    }catch(e){await this.failed(e)}finally{this.polling=false}
  }
  async handoff(){const id=this.controller?.getSnapshot().noteId;if(!id)return;this.requestedHandoff=id;try{await this.action('handoff',id);await this.poll()}catch{this.requestedHandoff=null;this.emit({message:'windowHandoffFailed'})}}
  async cancel(){const h=this.state.server?.handoff;if(h)await this.action('cancel',undefined,h.id);this.requestedHandoff=null}
  async resume(){
    const c=this.controller,id=c?.getSnapshot().noteId;if(!c||!id)return
    // Keep the original heads: saveEdits uses the normal keep-both recovery rule.
    try{await this.acquire(id);c.pauseInput(false);this.emit({message:null});await c.saveEdits()}catch{this.emit({message:'windowHandoffFailed'})}
  }
  async open(){
    const c=this.controller;if(!c||!await c.leave())return
    this.emit({message:'windowOpening'})
    try{const result=await this.call('/workspace/open',{...(c.getSnapshot().noteId?{noteId:c.getSnapshot().noteId!}:{})});this.emit({message:result.reused&&!result.focused?'windowFindExisting':null})}catch{this.emit({message:'windowOpenFailed'})}
  }
  async openCommand(accept:boolean){const command=this.state.server?.command,c=this.controller;if(!command||!c)return
    if(accept&&c.getSnapshot().noteId!==command.noteId&&!await c.open(command.noteId))return
    await this.action('ack',undefined,command.id)
  }
  dismiss(){this.emit({message:null})}
}

function readTheme():WindowTheme|undefined {
  const root=document.querySelector<HTMLElement>('.paper-app')??document.documentElement
  const style=getComputedStyle(root)
  const color=(key:string,fallback:string)=>{const probe=document.createElement('span');probe.style.color=`var(${key},${fallback})`;root.append(probe);const value=getComputedStyle(probe).color;probe.remove();return value}
  const background=color('--dsw-alias-bg-layer-1','#ffffff'),foreground=color('--dsw-alias-label-primary','#202124')
  const rgb=background.match(/[\d.]+/g)?.slice(0,3).map(Number)??[255,255,255]
  return {dark:style.colorScheme==='dark'||(rgb[0]!+rgb[1]!+rgb[2]!)<384,background,foreground,muted:color('--dsw-alias-label-secondary','#707070'),border:color('--dsw-alias-border-l2','#dddddd'),language:document.documentElement.lang.startsWith('en')?'en':'zh'}
}
function applyTheme(theme:WindowTheme){const root=document.documentElement;root.style.colorScheme=theme.dark?'dark':'light';for(const [name,value]of Object.entries({'--dsw-alias-bg-layer-1':theme.background,'--dsw-alias-label-primary':theme.foreground,'--dsw-alias-label-secondary':theme.muted,'--dsw-alias-border-l2':theme.border}))root.style.setProperty(name,value);root.lang=theme.language}
