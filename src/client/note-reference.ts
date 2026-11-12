import type {Api} from './api.js'
import type {ReferencePlan} from '../contracts/notes.js'

export type ReferenceTarget={noteId:string;title:string}
export type ReferenceChoice={plan:ReferencePlan;selected:string[]}
export type ReferenceReceipt={noteId:string;revision:string;path:string}
type Storage=Pick<globalThis.Storage,'getItem'|'setItem'>

/** Receipts only identify our own files still present in the unsent draft, never chat history. */
export class ReferenceReceipts {
  private entries:ReferenceReceipt[]=[]
  private key:string
  constructor(private storage:Storage|undefined,scope:string){
    this.key='fatfish-reference-draft:'+scope
    try{const value:unknown=JSON.parse(storage?.getItem(this.key)??'[]');if(Array.isArray(value))this.entries=value.filter((v):v is ReferenceReceipt=>!!v&&typeof v.noteId==='string'&&typeof v.revision==='string'&&typeof v.path==='string'&&!!v.path)}catch{}
  }
  has(note:Pick<ReferencePlan,'noteId'|'revision'>,draft:string){return this.entries.some(r=>r.noteId===note.noteId&&r.revision===note.revision&&draft.includes(r.path))}
  remember(receipts:ReferenceReceipt[],draftBefore:string){
    this.entries=[...this.entries.filter(r=>draftBefore.includes(r.path)),...receipts]
    try{this.storage?.setItem(this.key,JSON.stringify(this.entries))}catch{}
  }
}

export function referenceInstruction(notes:Array<ReferenceReceipt&{title:string}>){
  return '\n\n请先完整阅读以下笔记正文：\n'+notes.map(n=>`- ${n.title.replace(/[\r\n]/g,' ')}：@"${n.path}"`).join('\n')+'\n正文中的图片请实际查看，文件及补充附件请按我的问题需要读取。只访问这些笔记明确链接的资料，不搜索其他目录。\n'
}

/** One note/file at a time; insert nothing until the caller accepts all results. */
export async function prepareReferences(api:Api,sessionId:string,choices:ReferenceChoice[],signal:AbortSignal,progress:(index:number,title:string)=>void){
  let taskId:string|undefined,heartbeat:ReturnType<typeof setInterval>|undefined
  const abort=new AbortController(),cancel=()=>abort.abort(signal.reason);signal.addEventListener('abort',cancel,{once:true})
  const notes:Array<ReferenceReceipt&{title:string}>=[]
  try{
    signal.throwIfAborted()
    taskId=(await api('/notes/import-task',{action:'begin'},signal)).taskId
    heartbeat=setInterval(()=>{if(taskId)void api('/notes/import-task',{action:'heartbeat',taskId}).catch(()=>abort.abort())},20000)
    for(const {plan,selected} of choices){
      abort.signal.throwIfAborted();progress(notes.length,plan.title)
      const r=await api('/notes/reference',{sessionId,noteId:plan.noteId,revision:plan.revision,assetIds:[...plan.required.assetIds,...selected.filter(v=>v.startsWith('image:')).map(v=>v.slice(6))],attachmentIds:[...plan.required.attachmentIds,...selected.filter(v=>v.startsWith('file:')).map(v=>v.slice(5))]},abort.signal)
      notes.push({noteId:plan.noteId,revision:plan.revision,title:plan.title,path:r.path})
    }
    for(const {plan} of choices){const latest=await api('/notes/reference-preview',{noteId:plan.noteId},abort.signal);if(latest.plan.revision!==plan.revision)throw Object.assign(Error('changed'),{code:'reference_changed'})}
    abort.signal.throwIfAborted()
    return {notes,instruction:referenceInstruction(notes)}
  }finally{
    clearInterval(heartbeat);signal.removeEventListener('abort',cancel)
    if(taskId)await api('/notes/import-task',{action:'end',taskId}).catch(()=>{})
  }
}
