import type {ConversationFileServices} from './conversation-files.js'
import { NotesApplication } from './notes.js'
import { GitHubCli } from '../onboarding/cli.js'
import { PrivateWorkspaceSync, type PrivateWorkspaceSyncOptions } from '../private-workspace/sync.js'
import type { NoteModelController } from './note-model.js'
import type { PersonalState } from '../contracts/personal.js'
import { NotebookError } from '../domain/errors.js'
import { EditCoordinator,windowRequest } from './edit-coordinator.js'
import { id,object,text } from '../notes/validation.js'
import type { WindowTheme } from '../contracts/workspace.js'
import {WorkspaceBooks} from './workspace-books.js'
import type {WorkspaceRegistry} from '@deepseek-ai/dsh-workspace'
export interface ApplicationOptions extends ConversationFileServices {
  dir: string
  conversation?: () => NoteModelController | undefined
  workspaces?:()=>Pick<WorkspaceRegistry,'list'>|undefined
  pickFolder?: (signal?:AbortSignal)=>Promise<string|null>
  personal?: Pick<PrivateWorkspaceSyncOptions,'gateway'|'gitRunner'|'remoteForTest'|'batchMs'|'retryMs'>
}
export class NotebookApplication {
  readonly notes: NotesApplication
  readonly backup: PrivateWorkspaceSync
  readonly workspace:EditCoordinator
  readonly workspaceBooks:WorkspaceBooks
  requireWindowIdentity=false
  openWindow:((noteId?:string)=>Promise<{ok:true;focused:boolean;reused:boolean}>)|undefined
  closeWindowService:(()=>Promise<void>)|undefined
  constructor(private readonly options:ApplicationOptions) {
    this.notes=new NotesApplication(options.dir,options.conversation??(()=>undefined),()=>this.backup.changingLocation?'busy':this.backup.ready,options)
    this.backup=new PrivateWorkspaceSync({dir:options.dir,notes:this.notes.repository,drainNotes:()=>this.notes.drain(),gateway:options.personal?.gateway??new GitHubCli(),...options.personal})
    this.workspace=new EditCoordinator(()=>this.backup.state().binding?.repositoryId??null,()=>this.notes.repository.generation)
    this.workspaceBooks=new WorkspaceBooks(options.dir,this.notes.repository,()=>this.backup.state().binding?.repositoryId??null)
    this.notes.repository.editGuard=(ids,required)=>this.workspace.check(ids,windowRequest.getStore(),required)
  }
  workspaceRequest(path:string,input:unknown){return this.notes.repository.coordinate(()=>{
    const v=object(input),actor=windowRequest.getStore()
    if(path==='/workspace/register')return this.workspace.register(text(v.windowId,36),v.surface as 'embedded'|'standalone'|'conversation')
    if(!actor)throw new NotebookError('window_expired','请重新打开笔记窗口',409)
    const noteId=v.noteId===undefined?undefined:id(v.noteId)
    if(path==='/workspace/state'){
      let theme:WindowTheme|undefined
      if(v.theme!==undefined){const raw=object(v.theme);if(typeof raw.dark!=='boolean'||!['zh','en'].includes(String(raw.language)))throw new NotebookError('window_invalid','主题无效')
        const color=(key:string)=>{const value=text(raw[key],100);if(!/^(#[\da-f]{3,8}|rgba?\([\d.,%\s]+\)|color\(srgb [\d.\s/]+\))$/i.test(value))throw new NotebookError('window_invalid','主题颜色无效');return value}
        theme={dark:raw.dark,language:raw.language as 'zh'|'en',background:color('background'),foreground:color('foreground'),muted:color('muted'),border:color('border')}
      }
      return this.workspace.state(actor,noteId,theme)
    }
    if(v.action==='acquire')return this.workspace.acquire(actor,id(v.noteId))
    if(v.action==='release')return this.workspace.release(actor,noteId)
    if(v.action==='handoff')return this.workspace.handoff(actor,id(v.noteId))
    if(v.action==='cancel')return this.workspace.cancel(actor,text(v.requestId,36))
    if(v.action==='ack')return this.workspace.acknowledge(actor,text(v.requestId,36))
    throw new NotebookError('window_invalid','窗口操作无效')
  })}
  async changeLocation<T>(work:()=>Promise<T>){
    await this.notes.repository.coordinate(()=>{if(this.notes.transfers.active)throw new NotebookError('notebook_busy','文件正在处理中，请先完成或取消',409);return this.workspace.beginLocationChange()})
    const before=this.backup.state().binding?.repositoryId
    try{return await work()}finally{this.workspace.endLocationChange(before!==this.backup.state().binding?.repositoryId)}
  }
  personalState():PersonalState { return {ok:true,sync:this.backup.state()} }
  workspaceBook(input:unknown){return this.notes.localOperation(async()=>{
    const workspaceId=text(object(input).workspaceId,512)
    if(!this.options.workspaces?.()?.list().some(w=>w.id===workspaceId))throw new NotebookError('workspace_unavailable','工作区已不存在，请重新打开会话',409)
    return this.workspaceBooks.request(input)
  })}
  async sessionContext(input:unknown){
    const sessionId=text(object(input).sessionId,512)
    const registry=this.options.workspaces?.()
    if(!registry)throw new NotebookError('workspace_unavailable','宿主工作区服务暂不可用',503)
    const workspace=registry.list().find(w=>w.sessionIds.some(s=>s===sessionId))
    const selected=workspace?await this.workspaceBooks.request({workspaceId:workspace.id}):null
    return {ok:true as const,workspace:workspace?{id:String(workspace.id),title:workspace.title}:null,notebookId:selected?.notebookId??null}
  }
  async pickFolder(signal?:AbortSignal) {
    if(!this.options.pickFolder)throw new NotebookError('notebook_picker_unavailable','当前宿主无法打开目录选择窗口',409)
    return {ok:true as const,folder:await this.options.pickFolder(signal)}
  }
  async close() { await this.closeWindowService?.();await Promise.all([this.notes.close(),this.backup.close()]) }
}
export async function createApplication(options:ApplicationOptions) {
  const app=new NotebookApplication(options)
  try {await app.backup.load();return app} catch(error) {await app.close();throw error}
}
