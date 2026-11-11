import type { ApiContract, ApiPath } from '../contracts/api.js'
import { validNotesResponse } from './notes-validation.js'
const record=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x)
const text=(x:unknown):x is string=>typeof x==='string'
function assertResponse<P extends ApiPath>(path:P,value:unknown):asserts value is ApiContract[P]['response'] {
  if(path==='/workspace/open'&&record(value)&&value.ok===true&&typeof value.focused==='boolean'&&typeof value.reused==='boolean')return
  if(path.startsWith('/workspace/')&&record(value)&&value.ok===true&&text(value.serviceEpoch)&&typeof value.changeSeq==='number'&&typeof value.available==='boolean'&&('owned' in value)&&('handoff' in value))return
  const valid=validNotesResponse(path,value)
  if(valid === true)return
  if(path==='/personal/folder/pick' && record(value) && value.ok===true && (value.folder===null||text(value.folder)))return
  if(path==='/personal/sync/login' && record(value) && value.ok===true)return
  if(path==='/personal/sync/tools' && record(value) && value.ok===true && typeof value.git==='boolean' && typeof value.gh==='boolean' && (value.account===null || (record(value.account) && text(value.account.login))) && ['idle','waiting','failed'].includes(String(value.login)))return
  if(valid === undefined && record(value) && value.ok===true &&
    (path==='/personal/sync/preview'||path==='/personal/sync/reset-preview'?record(value.preview)&&text(value.preview.id)&&Array.isArray(value.preview.dataScope):
      record(value.sync)&&typeof value.sync.ready==='boolean'&&text(value.sync.folder)&&text(value.sync.defaultFolder)&&typeof value.sync.enabled==='boolean'&&text(value.sync.status)))return
  throw new ApiError('invalid_response')
}
export class ApiError extends Error {
  constructor(readonly code: string, readonly operationId?: string, readonly targetKey?: string, readonly previousFolder?:string,readonly affectedCount?:number) { super('请求未完成，请核对连接后重试。'); this.name = 'ApiError' }
}
export type Api = <P extends ApiPath>(path: P, body: ApiContract[P]['request'], signal?: AbortSignal) => Promise<ApiContract[P]['response']>
let clientRepository:number|undefined
let windowHeaders:(path:string,body:unknown)=>Record<string,string>=()=>({})
export function setWindowHeaders(provider:typeof windowHeaders){windowHeaders=provider}
export function currentRepository(){return clientRepository}
function pinRepository(id:number,switched=false){
  if(switched||clientRepository===undefined)clientRepository=id
}
export function createApi(fetcher: typeof fetch = globalThis.fetch, actorHeaders?:(path:string,body:unknown)=>Record<string,string>): Api {
  return async (path, requestBody, signal) => {
    const body:unknown=requestBody
    signal?.throwIfAborted()
    let response: Response
    const headers:Record<string,string>=path==='/workspace/register'?{}:(actorHeaders??windowHeaders)(path,body)
    if((path.startsWith('/notes')||path==='/workspace/action'||path==='/workspace/open') && clientRepository!==undefined)headers['x-notebook-repository']=String(clientRepository)
    if(body!==undefined)headers['Content-Type']='application/json'
    try { response = await fetcher(`/dsh-fatfish-notes${path}`, {method:body === undefined ? 'GET' : 'POST',credentials:'same-origin',headers, ...(body === undefined ? {} : {body:JSON.stringify(body)}), ...(signal ? {signal} : {})}) }
    catch (error) { if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw new DOMException('Request cancelled','AbortError'); throw new ApiError('network') }
    signal?.throwIfAborted()
    let value: unknown
    try { value = await response.json() } catch { signal?.throwIfAborted(); throw new ApiError('invalid_response') }
    signal?.throwIfAborted()
    if (!response.ok || (record(value) && value.ok === false)) {
      // Never render arbitrary server/proxy messages, payloads or paths.
      const code = record(value) && text(value.code) && /^[a-z_]{1,60}$/.test(value.code) ? value.code : 'request_failed'
      const folder=code==='notebook_previous_folder_unavailable' && record(value) && text(value.previousFolder) ? value.previousFolder : undefined
      throw new ApiError(code, record(value) && text(value.operationId) && value.operationId.length <= 200 ? value.operationId : undefined, record(value) && text(value.targetKey) && value.targetKey.length <= 2000 ? value.targetKey : undefined,folder,record(value)&&Number.isSafeInteger(value.affectedCount)&&Number(value.affectedCount)>0?Number(value.affectedCount):undefined)
    }
    assertResponse(path,value)
    if(record(value) && record(value.sync) && record(value.sync.binding) && value.sync.ready===true && typeof value.sync.binding.repositoryId==='number')
      pinRepository(value.sync.binding.repositoryId,path==='/personal/sync/reset')
    if (['/notes/get','/notes/save','/notes/resolve','/notes/trash','/notes/restore'].includes(path) && record(body) && typeof body.noteId === 'string' && record(value) && record(value.note) && value.note.noteId !== body.noteId && !(path==='/notes/save' && body.keepBoth===true && value.forkedFrom===body.noteId)) throw new ApiError('invalid_response')
    if (path === '/notes/jobs' && record(body) && record(value) && Array.isArray(value.jobs) && value.jobs.some(job => !record(job) || job.noteId !== body.noteId)) throw new ApiError('invalid_response')
    if (['/notes/job','/notes/job/retry','/notes/job/cancel','/notes/candidate'].includes(path) && record(body) && record(value) && record(value.job) && value.job.jobId !== body.jobId) throw new ApiError('invalid_response')
    return value
  }
}
export const api = createApi()
