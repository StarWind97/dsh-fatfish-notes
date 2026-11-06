import { mkdir, open, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-app-boot'
import { NotebookError } from '../domain/errors.js'

export const PLUGIN_NAME='dsh-fatfish-notes'
export const ROUTE_PREFIXES=['/dsh-fatfish-notes'] as const

export async function ownApplication<T extends {close():Promise<void>}>(ctx:Context,dir:string,initialize:()=>Promise<T>):Promise<T> {
  const release=await acquireWriter(dir)
  let initializing:Promise<T>|undefined
  try {
    // Cordis unloads separate effects concurrently. One owner must await both
    // initialization and close before releasing the lease to the next writer.
    ctx.effect(()=>async()=>{
      const app=await initializing?.catch(()=>undefined)
      if(app)await app.close()
      await release()
    },'notebook: application and writer ownership')
  } catch(error) {await release();throw error}
  // Register ownership before any asynchronous initialization can write or fail.
  initializing=Promise.resolve().then(initialize)
  return initializing
}

/** New hosts also coordinate across processes. Only one host may write to this directory. */
export async function acquireWriter(dir:string):Promise<()=>Promise<void>> {
  await mkdir(dir,{recursive:true})
  const path=join(dir,'fatfish-notes-writer.lock')
  const gatePath=join(dir,'fatfish-notes-writer.acquire')
  const busy=()=>new NotebookError('plugin_writer_conflict','该资料目录已有 肥鱼笔记写入者或未完成的启动。请关闭重复宿主后重试；所有使用该资料目录的宿主均停止后，才可清理 fatfish-notes 下的 fatfish-notes-writer.lock 和 fatfish-notes-writer.acquire。',409)
  // Every acquisition holds this gate, including fresh starts. A takeover therefore cannot
  // delete a lease just acquired by another process. An interrupted gate stays fail-closed.
  let gate
  try {gate=await open(gatePath,'wx')} catch(error) {
    if((error as NodeJS.ErrnoException).code==='EEXIST')throw busy()
    throw error
  }
  try {
    let handle
    try {handle=await open(path,'wx')} catch(error) {
      if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error
      let owner:unknown
      try {owner=JSON.parse(await readFile(path,'utf8'))} catch {throw busy()}
      if(typeof owner!=='object'||owner===null||!('pid' in owner)||typeof owner.pid!=='number'||!Number.isSafeInteger(owner.pid)||owner.pid<=0||!('plugin' in owner)||owner.plugin!==PLUGIN_NAME)throw busy()
      // A reused PID or inaccessible process is uncertain, so retain its lease.
      try {process.kill(owner.pid,0);throw busy()} catch(error) {
        if((error as NodeJS.ErrnoException).code!=='ESRCH')throw busy()
      }
      await rm(path)
      handle=await open(path,'wx')
    }
    try {await handle.writeFile(JSON.stringify({pid:process.pid,plugin:PLUGIN_NAME}));await handle.close()} catch(error) {
      await handle.close().catch(()=>{});await rm(path,{force:true});throw error
    }
  } finally {
    await gate.close();await rm(gatePath,{force:true})
  }
  let released=false
  return async()=>{if(released)return;released=true;await rm(path,{force:true})}
}
