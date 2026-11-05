import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { NotebookError } from '../domain/errors.js'
import { isRecord } from '../domain/record.js'
import { cancelled } from '../git/common.js'
import type { OnboardingAccount } from '../contracts/onboarding.js'
import type { GitHubGateway, GitHubRepository } from './types.js'

export interface CliRunOptions { signal?:AbortSignal; timeoutMs?:number; onOutput?:(chunk:string)=>void }
export interface CliRunResult { exitCode:number; stdout:string }
export type CliRunner=(args:readonly string[],options?:CliRunOptions)=>Promise<CliRunResult>
/** Output stays at the process boundary; callers explicitly select safe structured fields. */
export const runCli:CliRunner=async(args,options={})=>{
  cancelled(options.signal)
  return new Promise((resolve,reject)=>{
    const child=spawn('gh',[...args],{windowsHide:true,detached:process.platform!=='win32',stdio:['pipe','pipe','pipe'],env:{...process.env,GH_PROMPT_DISABLED:'1',GH_PAGER:'cat',NO_COLOR:'1',CLICOLOR:'0'}})
    let output='',bytes=0,aborted=false,timedOut=false,overflow=false,stopping=false
    const stop=()=>{if(stopping||!child.pid)return;stopping=true;if(process.platform==='win32'){const killer=spawn(join(process.env.SystemRoot??'C:\\Windows','System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});killer.on('error',()=>child.kill('SIGKILL'))}else{try{process.kill(-child.pid,'SIGKILL')}catch{child.kill('SIGKILL')}}}
    const abort=()=>{aborted=true;stop()},timer=setTimeout(()=>{timedOut=true;stop()},options.timeoutMs??60_000)
    const cleanup=()=>{clearTimeout(timer);options.signal?.removeEventListener('abort',abort)}
    options.signal?.addEventListener('abort',abort,{once:true})
    const receive=(chunk:string,stdout:boolean)=>{bytes+=Buffer.byteLength(chunk);if(bytes>1024*1024){overflow=true;stop();return}if(stdout)output+=chunk;options.onOutput?.(chunk)}
    child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',(chunk:string)=>receive(chunk,true));child.stderr.on('data',(chunk:string)=>receive(chunk,false))
    child.stdin.on('error',()=>{});child.stdin.end()
    child.once('error',()=>{cleanup();reject(new NotebookError('gh_unavailable','无法启动 GitHub CLI，请安装或检查运行权限',503))})
    child.once('close',code=>{cleanup();if(aborted)reject(new NotebookError('cancelled','GitHub CLI 操作已取消',499));else if(timedOut)reject(new NotebookError('gh_timeout','GitHub CLI 操作超时，请核对原事务',504));else if(overflow)reject(new NotebookError('gh_output_limit','GitHub CLI 输出超过上限',502));else resolve({exitCode:code??-1,stdout:output})})
    if(options.signal?.aborted)abort()
  })
}
function json(text:string):unknown{try{return JSON.parse(text)}catch{throw new NotebookError('gh_response_invalid','GitHub CLI 返回格式无效',502)}}
function account(value:unknown):OnboardingAccount{if(!isRecord(value)||value.type!=='User'||typeof value.login!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(value.login)||!Number.isSafeInteger(value.id)||Number(value.id)<=0)throw new NotebookError('github_account_invalid','仅支持 github.com 个人账号',409);return{login:value.login,id:Number(value.id)}}
function repository(value:unknown):GitHubRepository{if(!isRecord(value)||!isRecord(value.owner)||typeof value.name!=='string'||!Number.isSafeInteger(value.id)||typeof value.private!=='boolean')throw new NotebookError('gh_response_invalid','仓库响应无效',502);const owner=account(value.owner);return{id:Number(value.id),name:value.name,owner:owner.login,ownerId:owner.id,visibility:value.private?'private':'public'}}
export class GitHubCli implements GitHubGateway {
  private readonly runner:CliRunner
  constructor(private readonly options:{runner?:CliRunner;authTimeoutMs?:number}={}){this.runner=options.runner??runCli}
  async available(signal?:AbortSignal){try{return(await this.runner(['--version'],{...(signal?{signal}:{})})).exitCode===0}catch(error){cancelled(signal);if(error instanceof NotebookError&&error.code==='gh_unavailable')return false;throw error}}
  async login(onCode:(code:string)=>void, signal:AbortSignal):Promise<void>{
    let tail=''
    const result=await this.runner(['auth','login','--hostname','github.com','--git-protocol','https','--web'],{
      signal,timeoutMs:this.options.authTimeoutMs??5*60_000,
      onOutput:chunk=>{tail=(tail+chunk).slice(-512);const code=/\b([A-Z0-9]{4}-[A-Z0-9]{4})\b/.exec(tail)?.[1];if(code)onCode(code)}
    })
    if(result.exitCode!==0)throw new NotebookError('github_login_failed','GitHub 登录未完成，请重试',409)
  }
  async account(signal?:AbortSignal):Promise<OnboardingAccount|null>{
    const status=await this.runner(['auth','status','--hostname','github.com','--json','hosts'],{...(signal?{signal}:{})}),value=json(status.stdout)
    if(!isRecord(value)||!isRecord(value.hosts))throw new NotebookError('gh_response_invalid','无法读取 GitHub CLI 登录状态',502)
    // A failed online auth-status check can mark a configured account inactive.
    // Only a missing account or a confirmed HTTP 401 means authentication is needed.
    const hosts=value.hosts['github.com'];if(!Array.isArray(hosts)||hosts.length===0)return null
    const result=await this.runner(['api','--hostname','github.com','user','--include'],{...(signal?{signal}:{})})
    const header=/^HTTP\/\S+\s+(\d{3})[^\r\n]*\r?\n/.exec(result.stdout),httpStatus=header?Number(header[1]):null
    if(httpStatus===401)return null
    if(result.exitCode!==0||httpStatus!==200)throw new NotebookError('github_account_unavailable','暂时无法核对 GitHub 账号，请检查网络后重试',502)
    const separator=/\r?\n\r?\n/.exec(result.stdout);if(!separator)throw new NotebookError('gh_response_invalid','GitHub 账号响应格式无效',502)
    return account(json(result.stdout.slice(separator.index+separator[0].length)))
  }
  async repository(owner:string,repo:string,signal?:AbortSignal):Promise<GitHubRepository|null>{
    const result=await this.runner(['api','--hostname','github.com',`repos/${owner}/${repo}`,'--include'],{...(signal?{signal}:{})})
    const header=/^HTTP\/\S+\s+(\d{3})[^\r\n]*\r?\n/.exec(result.stdout),status=header?Number(header[1]):null
    if(status===404)return null
    if(status===401||status===403)throw new NotebookError('github_repository_forbidden','当前账号没有仓库访问权限，请重新核对 GitHub 登录和授权',403)
    if(result.exitCode!==0||status!==200)throw new NotebookError('github_repository_unavailable','暂时无法核对仓库，请检查网络及权限',502)
    const separator=/\r?\n\r?\n/.exec(result.stdout);if(!separator)throw new NotebookError('gh_response_invalid','仓库响应格式无效',502)
    return repository(json(result.stdout.slice(separator.index+separator[0].length)))
  }
  async createPrivate(frozen:OnboardingAccount,repo:string,signal?:AbortSignal):Promise<GitHubRepository>{
    const options=signal?{signal}:{}
    const resolved=await this.runner(['api','--hostname','github.com',`users/${frozen.login}`],options)
    if(resolved.exitCode!==0)throw new NotebookError('github_account_unavailable','暂时无法解析已确认的 GitHub 账号',502)
    const value=json(resolved.stdout)
    const owner=account(value)
    if(owner.id!==frozen.id||owner.login.toLowerCase()!==frozen.login.toLowerCase()){
      throw new NotebookError('account_changed','已确认的账号名称与稳定身份不匹配，未创建仓库',409)
    }
    if(!isRecord(value)||typeof value.node_id!=='string'||!value.node_id||value.node_id.length>256){
      throw new NotebookError('github_account_invalid','已确认的 GitHub 账号缺少稳定节点标识',502)
    }
    // Explicit ownerId is essential: a gh account switch between this lookup and
    // the mutation must fail permission checks rather than create under another user.
    const query=`mutation NotebookCreate($ownerId: ID!, $name: String!) {
      createRepository(input: {ownerId: $ownerId, name: $name, visibility: PRIVATE}) {
        repository { databaseId name visibility owner { __typename login ... on User { databaseId } } }
      }
    }`
    const result=await this.runner(['api','--hostname','github.com','graphql','-f',`query=${query}`,'-f',`ownerId=${value.node_id}`,'-f',`name=${repo}`],options)
    if(result.exitCode!==0)throw new NotebookError('repository_creation_unknown','创建结果尚未确认，请核对原事务',502)
    const response=json(result.stdout)
    if(!isRecord(response)||response.errors!==undefined||!isRecord(response.data)||!isRecord(response.data.createRepository)||!isRecord(response.data.createRepository.repository)){
      throw new NotebookError('repository_creation_unknown','创建结果尚未确认，请核对原事务',502)
    }
    const created=response.data.createRepository.repository
    if(!isRecord(created.owner)||created.owner.__typename!=='User'||!['PUBLIC','PRIVATE'].includes(String(created.visibility))){
      throw new NotebookError('repository_creation_unknown','创建结果尚未确认，请核对原事务',502)
    }
    return repository({id:created.databaseId,name:created.name,private:created.visibility==='PRIVATE',owner:{type:'User',login:created.owner.login,id:created.owner.databaseId}})
  }
}
