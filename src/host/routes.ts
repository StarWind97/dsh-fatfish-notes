import {readFile} from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { isIP } from 'node:net'
import { NotebookError } from '../domain/errors.js'
import { PreviousFolderUnavailable } from '../private-workspace/folder.js'
import { isRecord } from '../domain/record.js'
import type { ApiResponse, ErrorResponse } from '../contracts/api.js'
import type { NotebookApplication } from './application.js'
import { ROUTE_PREFIXES } from './plugin-identity.js'
import { windowRequest } from './edit-coordinator.js'

export const routePaths=['/notes/draft','/notes/draft-recovery','/notes/suggest','/notes/usage','/notes/capture-progress','/notes/conversation-file','/notes/reference','/notes/import-task','/notes/transfer','/notes/document-worker','/notes/import-worker','/notes/session-context','/notes/associate','/notes/workspace-book','/notes/manage','/notes/catalog','/notes/history','/notes/revision','/notes/backlinks','/workspace/register','/workspace/state','/workspace/action','/workspace/open','/notes/library-export','/notes/attachment','/notes/download','/notes/batch','/notes','/notes/save','/notes/image','/notes/trash','/notes/restore','/notes/resolve','/notes/notebooks','/notes/notebook','/notes/jobs','/notes/job','/notes/job/retry','/notes/job/cancel','/notes/candidate','/notes/capture','/notes/selection','/notes/get','/notes/source','/personal','/personal/folder/pick','/personal/sync/preview','/personal/sync/connect','/personal/sync','/personal/sync/start','/personal/sync/tools','/personal/sync/login','/personal/sync/move','/personal/sync/reset-preview','/personal/sync/reset','/notes/asset','/notes/export-font','/notes/export','/notes/conversation-export'] as const
const READ_ONLY=new Set<string>(['/notes/draft-recovery','/notes/usage','/notes/capture-progress','/notes/document-worker','/notes/import-worker','/notes/catalog','/notes/history','/notes/revision','/notes/backlinks','/notes/download','/notes/export-font','/notes','/notes/notebooks','/notes/jobs','/notes/asset','/notes/job','/notes/get','/notes/source','/personal'])
function loopback(value:string):boolean{if(value==='::1'||value==='::ffff:127.0.0.1')return true;const v=value.replace(/^::ffff:/,'');return isIP(v)===4&&v.split('.')[0]==='127'}
export function fence(req:IncomingMessage,origin:string):void{
  if(!loopback(req.socket.remoteAddress??''))throw new NotebookError('loopback_only','仅接受本机请求',403)
  let expected:URL,authority:URL
  try{expected=new URL(origin);const host=req.headers.host;if(!host||/[\s/@#?\\]/.test(host))throw new Error();authority=new URL(`${expected.protocol}//${host}`);if(authority.host!==host||authority.port!==expected.port||!(authority.hostname==='localhost'||loopback(authority.hostname.replace(/^\[|\]$/g,''))))throw new Error()}catch{throw new NotebookError('invalid_host','请求 Host 不受信任',403)}
  const supplied=req.headers.origin
  if(supplied){try{const parsed=new URL(supplied);if(parsed.origin!==supplied||parsed.protocol!==expected.protocol||parsed.host!==authority.host)throw new Error()}catch{throw new NotebookError('cross_origin','拒绝跨源请求',403)}}
  const site=req.headers['sec-fetch-site'];if(site!==undefined&&site!=='same-origin'&&site!=='none')throw new NotebookError('cross_site','拒绝跨站请求',403)
}
function send(res:ServerResponse,status:number,value:ApiResponse):void{
  if(res.destroyed||res.writableEnded)return
  const text=JSON.stringify(value)
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','content-length':Buffer.byteLength(text),'x-content-type-options':'nosniff'});res.end(text)
}
function readJson(req:IncomingMessage,signal:AbortSignal,limit=2*1024*1024):Promise<unknown>{
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']??'')){req.resume();return Promise.reject(new NotebookError('unsupported_media_type','POST 请求必须使用 application/json',415))}
  if(Number(req.headers['content-length'])>limit){req.resume();return Promise.reject(new NotebookError('request_too_large','请求体超过当前接口的体积限制',413))}
  return new Promise((resolve,reject)=>{
    let size=0;const chunks:Buffer[]=[]
    const cleanup=()=>{req.off('data',onData);req.off('end',onEnd);req.off('error',onError);signal.removeEventListener('abort',onAbort)}
    const fail=(error:Error)=>{cleanup();req.resume();reject(error)}
    const onAbort=()=>fail(new NotebookError('aborted','请求已取消',409))
    const onError=()=>fail(new NotebookError('invalid_request','无法读取请求体'))
    const onData=(chunk:Buffer)=>{size+=chunk.byteLength;if(size>limit){fail(new NotebookError('request_too_large','请求体超过当前接口的体积限制',413));return}chunks.push(chunk)}
    const onEnd=()=>{cleanup();try{const value:unknown=size?JSON.parse(Buffer.concat(chunks).toString('utf8')):{};if(!isRecord(value))throw new Error();resolve(value)}catch{reject(new NotebookError('invalid_json','请求体必须是合法 JSON 对象'))}}
    if(signal.aborted){onAbort();return}
    signal.addEventListener('abort',onAbort,{once:true});req.on('data',onData);req.once('end',onEnd);req.once('error',onError)
  })
}
export function createHttpHandler({app,getOrigin}:{app:NotebookApplication;getOrigin:()=>string}):(req:IncomingMessage,res:ServerResponse)=>Promise<void>{
  return async(req,res)=>{
    const actor=req.headers['x-notebook-window']===undefined?undefined:{windowId:String(req.headers['x-notebook-window']),serviceEpoch:String(req.headers['x-notebook-epoch']??''),...(req.headers['x-notebook-lease']?{leaseId:String(req.headers['x-notebook-lease'])}:{})}
    return windowRequest.run(actor,async()=>{
    const controller=new AbortController(),abort=()=>controller.abort(),responseClosed=()=>{if(!res.writableEnded)abort()}
    req.once('aborted',abort);res.once('close',responseClosed)
    let body:unknown={}
    try{
      fence(req,getOrigin())
      const url=new URL(req.url??'/',getOrigin()),base=ROUTE_PREFIXES.find(prefix=>url.pathname.startsWith(`${prefix}/`)),path=base?url.pathname.slice(base.length):''
      if(!base||!routePaths.some(known=>known===path))throw new NotebookError('not_found','接口不存在',404)
      if(req.method!=='GET'&&req.method!=='POST')throw new NotebookError('method_not_allowed','请求方法不受支持',405)
      if(req.method==='GET'&&!READ_ONLY.has(path))throw new NotebookError('method_not_allowed','此操作需要 POST',405)
      if(path==='/notes/import-worker'){const bytes=await readFile(new URL('../import-worker.js',import.meta.url));res.writeHead(200,{'content-type':'application/javascript','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(bytes);return}
      if(path==='/notes/document-worker'){const bytes=await readFile(new URL('../document-worker.js',import.meta.url));res.writeHead(200,{'content-type':'application/javascript','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(bytes);return}
      body=req.method==='POST'?await readJson(req,controller.signal,path==='/notes/attachment'?135*1024*1024:(path==='/notes/save'||path==='/notes/draft')?12*1024*1024:path==='/notes/image'?28*1024*1024:2*1024*1024):Object.fromEntries(url.searchParams)
      const signal=controller.signal
      if(app.requireWindowIdentity&&['/notes/draft','/notes/suggest','/notes/import-task','/notes/transfer','/notes/associate','/notes/workspace-book','/notes/manage','/notes/save','/notes/image','/notes/attachment','/notes/batch','/notes/trash','/notes/restore','/notes/resolve','/notes/notebook','/notes/candidate','/personal/sync/move','/personal/sync/reset'].includes(path))await app.workspaceRequest('/workspace/state',{})
      const expectedRepo=req.headers['x-notebook-repository']
      if((path.startsWith('/notes')||path==='/workspace/action'||path==='/workspace/open') && expectedRepo!==undefined && String(app.backup.state().binding?.repositoryId)!==expectedRepo)
        throw new NotebookError('personal_repository_changed','笔记库已切换，请重新打开插件',409)
      if(path==='/notes/export-font') {
        const bytes=await app.notes.exportFont(signal)
        res.writeHead(200,{'content-type':'font/otf','content-length':bytes.length,'cache-control':'no-store','x-content-type-options':'nosniff'});res.end(bytes);return
      }
      if(path==='/notes/library-export'){
        await app.notes.exportLibrary(body,signal,{start:filename=>res.writeHead(200,{'content-type':'application/zip','cache-control':'no-store','x-content-type-options':'nosniff','content-disposition':`attachment; filename*=UTF-8''${encodeURIComponent(filename)}`}),write:data=>new Promise<void>((resolve,reject)=>{if(signal.aborted){reject(new Error('Cancelled'));return}res.write(data,error=>error?reject(error):resolve())})})
        res.end();return
      }
      if(path==='/notes/conversation-file'||path==='/notes/export' || path==='/notes/conversation-export' || path==='/notes/download') {
        const file:import('../notes/export/service.js').ExportFile & {warnings?:string}=path==='/notes/conversation-file'?await app.notes.conversationFile(body,signal):path==='/notes/download'?await app.notes.download(body,signal):path==='/notes/export'?await app.notes.export(body,signal):await app.notes.exportConversation(body,signal)
        if('warnings' in file)res.setHeader('x-export-warnings',String(file.warnings))
        res.writeHead(200,{'content-type':file.mediaType,...(!file.stream?{'content-length':file.bytes.length}:{}),'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'",'content-disposition':`attachment; filename*=UTF-8''${encodeURIComponent(file.filename).replace(/['()*]/g,c=>`%${c.charCodeAt(0).toString(16)}`)}`});if(file.stream){for await(const chunk of file.stream())await new Promise<void>((resolve,reject)=>res.write(chunk,error=>error?reject(error):resolve()));res.end()}else res.end(file.bytes);return
      }
      if(path==='/notes/asset'){
        const asset=await app.notes.asset(body,signal)
        res.writeHead(200,{'content-type':asset.mediaType,'content-length':asset.bytes.length,'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'"});res.end(asset.bytes);return
      }
      let value:ApiResponse
      switch(path){
        case '/workspace/register':case '/workspace/state':case '/workspace/action':value=await app.workspaceRequest(path,body);break
        case '/workspace/open':{
          if(!app.openWindow)throw new NotebookError('window_unavailable','当前环境暂不能打开独立窗口',409)
          await app.workspaceRequest('/workspace/state',{})
          const noteId=isRecord(body)&&typeof body.noteId==='string'?body.noteId:undefined
          if(noteId&&!/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(noteId))throw new NotebookError('window_invalid','笔记不存在')
          value=await app.openWindow(noteId);break
        }
        case '/personal/folder/pick':value=await app.pickFolder(signal);break
        case '/notes/usage':value=await app.notes.usage(signal);break
        case '/notes/capture-progress':value=app.notes.progress(body);break
        case '/notes/import-task':value=await app.notes.repository.coordinate(()=>app.notes.localOperation(async()=>app.notes.transfers.task(body),signal));break
        case '/notes/reference':value=await app.notes.reference(body,signal);break
        case '/notes/transfer':value=await app.notes.transfer(body,signal);break
        case '/notes/session-context':value=await app.sessionContext(body);break
        case '/notes/associate':value=await app.notes.associate(body,signal);break
        case '/notes/workspace-book':value=await app.workspaceBook(body);break
        case '/notes':value=await app.notes.list(body,signal);break
        // Once the complete request has arrived, a page closing must not cancel its local write.
        case '/notes/draft':value=await app.notes.draft(body);break;
        case '/notes/draft-recovery':value=app.notes.draftRecovery;break;
        case '/notes/save':value=await app.notes.save(body);break
        case '/notes/image':value=await app.notes.image(body,signal);break
        case '/notes/attachment':value=await app.notes.attachment(body,signal);break
        case '/notes/batch':value=await app.notes.batch(body,signal);break
        case '/notes/trash':value=await app.notes.status(body,true,signal);break
        case '/notes/restore':value=await app.notes.status(body,false,signal);break
        case '/notes/resolve':value=await app.notes.resolve(body,signal);break
        case '/notes/notebooks':value=await app.notes.notebooks(signal);break
        case '/notes/notebook':value=await app.notes.notebook(body,signal);break
        case '/notes/jobs':value=await app.notes.jobs(body,signal);break
        case '/notes/job':value=await app.notes.job(body,signal);break
        case '/notes/job/retry':value=await app.notes.retryJob(body,signal);break
        case '/notes/job/cancel':value=await app.notes.cancelJob(body,signal);break
        case '/notes/candidate':value=await app.notes.adoptCandidate(body,signal);break
        case '/notes/capture':value=await app.notes.capture(body,signal);break
        case '/notes/selection':value=await app.notes.selection(body,signal);break
        case '/notes/suggest':value=await app.notes.suggest(body,signal);break
        case '/notes/get':value=await app.notes.get(body,signal);break
        case '/notes/manage':value=await app.notes.manage(body);break
        case '/notes/catalog':value=await app.notes.catalog(signal);break
        case '/notes/history':value=await app.notes.history(body,signal);break
        case '/notes/revision':value=await app.notes.revision(body,signal);break
        case '/notes/backlinks':value=await app.notes.backlinks(body,signal);break
        case '/notes/source':value=await app.notes.source(body,signal);break
        case '/personal':value=app.personalState();break
        case '/personal/sync/preview':value=await app.backup.preview(body,signal);break
        case '/personal/sync/connect':await app.backup.connect(body,signal);value=app.personalState();break
        case '/personal/sync/move':{const cleanupPending=await app.changeLocation(()=>app.backup.move(body,signal));value={...app.personalState(),cleanupPending};break}
        case '/personal/sync/reset-preview':value=await app.backup.resetPreview(body,signal);break
        case '/personal/sync/reset':await app.changeLocation(()=>app.backup.reset(body,signal));value=app.personalState();break
        case '/personal/sync/start':if(app.backup.ready&&app.backup.state().status!=='paused')void app.backup.sync().catch(()=>{});value=app.personalState();break
        case '/personal/sync':await app.backup.sync(signal);value=app.personalState();break
        case '/personal/sync/tools':value=await app.backup.tools(signal);break
        case '/personal/sync/login':value=app.backup.startLogin();break
        default:throw new NotebookError('not_found','接口不存在',404)
      }
      send(res,200,value)
    }catch(error){
      if(res.headersSent){res.destroy();return}
      const safe=error instanceof NotebookError?error:new NotebookError('internal_error','操作失败；详细信息未向外部公开',500)
      const value:ErrorResponse={ok:false,status:'error',error:safe.message,code:safe.code,...(safe.affectedCount?{affectedCount:safe.affectedCount}:{}),...(safe instanceof PreviousFolderUnavailable?{previousFolder:safe.folder}:{})}
      send(res,safe.status,value)
    }finally{req.off('aborted',abort);res.off('close',responseClosed)}
    })
  }
}
