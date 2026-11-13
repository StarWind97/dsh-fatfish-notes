import type {Api} from './api.js'
import type {ImportNote} from './library-import.js'
export interface WorkerPlan {notes:ImportNote[];warnings:string[];bytes:number;entries:Array<{path:string;bytes:number}>}
export interface WorkerProgress {bytes:number;total:number;path:string}
/** Main thread only coordinates UI and bounded HTTP requests; parsing/encoding stays in the Worker. */
export class ImportWorkerClient {
  readonly database='fatfish-import-'+Date.now()+'-'+crypto.randomUUID()
  private worker:Worker|null=null
  private controller=new AbortController()
  private id=0
  private calls=new Map<number,{resolve:(v:unknown)=>void;reject:(e:Error)=>void}>()
  private progressTimer:ReturnType<typeof setTimeout>|undefined
  private latestProgress:WorkerProgress|undefined
  private uploads=new Map<string,string>()
  private commits=new Set<Promise<unknown>>()
  readonly savedNotes=new Set<string>()
  constructor(private api:Api,private progress:(value:WorkerProgress)=>void){}
  async start(){
    // Reclaim only this plugin's abandoned temporary archives, never active/recent imports.
    if(indexedDB.databases)void indexedDB.databases().then(rows=>{for(const {name} of rows){const match=/^fatfish-import-(\d+)-[a-f0-9-]{36}$/.exec(name??'');if(match&&Date.now()-Number(match[1])>24*60*60_000)indexedDB.deleteDatabase(name!)}}).catch(()=>{})
    this.worker=new Worker(new URL('/dsh-fatfish-notes/notes/import-worker',location.href),{name:'Fatfish Notes import'})
    this.worker.onerror=()=>{this.cancel(Error('后台处理无法启动，请重新打开笔记后重试。'))}
    this.worker.onmessage=({data:m})=>{
      if(m.kind==='progress'){this.latestProgress=m as WorkerProgress;if(!this.progressTimer)this.progressTimer=setTimeout(()=>{this.progressTimer=undefined;if(this.latestProgress)this.progress(this.latestProgress)},50);return}
      if(m.kind==='api'){
        // A submitted note is atomic: stop preparing more work, but let this save acknowledge.
        const committing=m.path==='/notes/save'
        const request=this.api(m.path,m.body,committing?undefined:this.controller.signal).then(value=>{
        if(committing&&value&&typeof value==='object'&&'note'in value)this.savedNotes.add(m.body.noteId)
        if(m.path==='/notes/transfer'&&value&&typeof value==='object'){
          if(m.body.action==='begin'&&'uploadId'in value&&typeof value.uploadId==='string')this.uploads.set(value.uploadId,m.body.noteId)
          if(['finish','cancel'].includes(m.body.action))this.uploads.delete(m.body.uploadId)
        }
        this.worker?.postMessage({action:'api-result',id:m.id,value})
      }).catch(e=>this.worker?.postMessage({action:'api-result',id:m.id,error:e instanceof Error?('code'in e?String(e.code)+': ':'')+e.message:'Request failed'}))
        if(committing){this.commits.add(request);void request.finally(()=>this.commits.delete(request))}return}
      const call=this.calls.get(m.id);this.calls.delete(m.id);m.error?call?.reject(Error(m.error)):call?.resolve(m.value)
    }
    await this.request('ping',{})
  }
  request<T>(action:string,data:Record<string,unknown>):Promise<T>{if(this.controller.signal.aborted||!this.worker)return Promise.reject(new DOMException('Cancelled','AbortError'));return new Promise((resolve,reject)=>{const id=++this.id;this.calls.set(id,{resolve:resolve as (v:unknown)=>void,reject});this.worker!.postMessage({id,action,...data,database:this.database})})}
  async cancel(error:Error=new DOMException('Cancelled','AbortError')){clearTimeout(this.progressTimer);this.controller.abort();this.worker?.terminate();this.worker=null;for(const call of this.calls.values())call.reject(error);this.calls.clear();indexedDB.deleteDatabase(this.database);for(const [uploadId,noteId]of this.uploads)void this.api('/notes/transfer',{action:'cancel',uploadId,noteId}).catch(()=>{});this.uploads.clear();await Promise.all([...this.commits])}
}

export async function uploadFile(file:File,options:{noteId:string;draft:boolean;mediaType?:string;editId?:string},api:Api,signal?:AbortSignal,progress:(value:WorkerProgress)=>void=()=>{}){
  const worker=new ImportWorkerClient(api,progress),cancel=()=>worker.cancel()
  signal?.throwIfAborted();signal?.addEventListener('abort',cancel,{once:true})
  try{await worker.start();return await worker.request<import('../contracts/notes.js').NotesApiContract['/notes/transfer']['response']>('file',{files:[file],...options})}
  finally{signal?.removeEventListener('abort',cancel);worker.cancel()}
}
