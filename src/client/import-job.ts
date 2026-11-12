import {ImportWorkerClient,type WorkerPlan,type WorkerProgress} from './import-worker-client.js'
import {currentRepository,type Api} from './api.js'
import {importId} from './library-import.js'
import {importedNotebookName} from '../notes/notebooks.js'
interface State {busy:boolean;plan:WorkerPlan|null;progress:WorkerProgress;done:number;total:number;report:string[];message:string;cancelled:boolean}
/** One running import in this window. The server also arbitrates across windows. */
export class ImportJob {
  private state:State={busy:false,plan:null,progress:{bytes:0,total:0,path:''},done:0,total:0,report:[],message:'',cancelled:false}
  private listeners=new Set<()=>void>()
  private worker:ImportWorkerClient|null=null
  private generation=0
  private repo:number|undefined
  private books=new Map<string,string>()
  private api:Api|undefined
  private taskId:string|undefined
  private heartbeat:ReturnType<typeof setInterval>|undefined
  getSnapshot=()=>this.state
  subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn)}}
  private emit(patch:Partial<State>){this.state={...this.state,...patch};this.listeners.forEach(fn=>fn())}
  private async release(){clearInterval(this.heartbeat);const taskId=this.taskId;this.taskId=undefined;if(taskId)await this.api?.('/notes/import-task',{action:'end',taskId}).catch(()=>{})}
  private async claim(generation:number){const result=await this.api!('/notes/import-task',{action:'begin'});if(generation!==this.generation){if(result.taskId)await this.api!('/notes/import-task',{action:'end',taskId:result.taskId});throw new DOMException('Cancelled','AbortError')}this.taskId=result.taskId;this.heartbeat=setInterval(()=>{if(this.taskId)void this.api!('/notes/import-task',{action:'heartbeat',taskId:this.taskId}).catch(()=>this.cancel())},20000)}
  async scan(files:File[],zip:boolean,api:Api){
    if(this.state.busy)return
    this.worker?.cancel();this.repo=currentRepository();const repo=this.repo
    this.api=((path,body,signal)=>{if(repo!==currentRepository())return Promise.reject(Error('笔记库已改变'));return api(path,body,signal)}) as Api
    const generation=++this.generation;this.books.clear();this.emit({busy:true,plan:null,done:0,total:0,report:[],message:'',cancelled:false,progress:{bytes:0,total:0,path:'扫描文件'}})
    try{
      await this.claim(generation);const worker=this.worker=new ImportWorkerClient(this.api,p=>{if(generation===this.generation)this.emit({progress:p})});await worker.start()
      const plan=await worker.request<WorkerPlan>('scan',{files,zip});if(generation!==this.generation)return
      this.emit({plan,report:[...plan.warnings,...plan.notes.flatMap(n=>n.warnings.map(w=>n.path+': '+w))]})
    }catch(e){if(generation===this.generation)this.emit({message:e instanceof Error?e.message:'扫描未完成'})}
    finally{if(generation===this.generation){await this.release();this.emit({busy:false})}}
  }
  async run(selected:string[],notebookId:string,folders:boolean,remote:boolean){
    const {plan}=this.state;if(!plan||!this.worker||this.state.busy)return
    const generation=this.generation;this.emit({busy:true,done:0,total:plan.notes.filter(n=>selected.includes(n.noteId)&&!n.done).length,message:'',cancelled:false});let failed=0
    try{
      await this.claim(generation)
      let books=folders?(await this.api!('/notes/notebooks',undefined)).notebooks:[]
      for(const note of plan.notes.filter(n=>selected.includes(n.noteId)&&!n.done)){
        if(generation!==this.generation)break
        try{
          let target=notebookId
          if(folders&&note.path.includes('/')){
            const folder=note.path.split('/')[0]!;target=this.books.get(folder)??''
            if(!target){
              const title=importedNotebookName(books,folder);target=importId()
              books=(await this.api!('/notes/notebook',{notebookId:target,title,expectedHeads:[]})).notebooks;this.books.set(folder,target)
              if(title!==folder)this.emit({report:[...this.state.report,`笔记本“${folder}”已存在，导入至新建的“${title}”。`]})
            }
          }
          const warnings=await this.worker.request<string[]>('import',{noteId:note.noteId,selected,notebookId:target,remote})
          note.done=true;this.emit({done:this.state.done+1,report:[...this.state.report,...warnings.map(w=>note.path+': '+w)]})
        }catch(e){if(generation!==this.generation)break;failed++;this.emit({report:[...this.state.report,note.path+': '+(e instanceof Error?e.message:'未完成，可重新尝试；已完成的笔记会保留。')]})}
      }
      if(generation===this.generation)this.emit({message:`本机已导入 ${this.state.done} 篇${failed?`，${failed} 篇未完成`:''}。云端同步随后进行。`})
    }catch(e){if(generation===this.generation)this.emit({message:e instanceof Error?e.message:'导入未完成'})}
    finally{if(generation===this.generation){await this.release();this.emit({busy:false})}}
  }
  async cancel(){if(this.state.cancelled&&this.state.busy)return;const generation=++this.generation,worker=this.worker;this.worker=null;this.emit({busy:true,cancelled:true,progress:{...this.state.progress,path:'正在停止，确认已保存内容'}});await worker?.cancel();if(generation!==this.generation)return;let done=this.state.done;for(const note of this.state.plan?.notes??[])if(!note.done&&worker?.savedNotes.has(note.noteId)){note.done=true;done++}await this.release();this.emit({busy:false,done,message:`已停止，已完成的 ${done} 篇笔记保留。请重新选择文件以继续。`})}
  clear(){if(this.state.busy)return;this.worker?.cancel();this.worker=null;this.emit({plan:null,report:[],message:''})}
}
export const importJob=new ImportJob()
if(typeof window!=='undefined')window.addEventListener('pagehide',()=>importJob.cancel())
