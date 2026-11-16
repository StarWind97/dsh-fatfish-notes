import {readFile,writeFile,rename,mkdir,rm} from 'node:fs/promises'
import {join} from 'node:path'
import {randomUUID} from 'node:crypto'
import {appearanceValue,parseAppearance,type Appearance} from '../domain/appearance.js'
import type {AppearanceState} from '../contracts/appearance.js'
import type {WindowSurface,WindowTheme} from '../contracts/workspace.js'
import {NotebookError} from '../domain/errors.js'
import {object,text} from '../notes/validation.js'

interface Stored {version:1;storeId:string;value:Appearance|null;legacy:Partial<Record<WindowSurface,string|null>>;receipts:string[]}
const invalid=()=>new NotebookError('appearance_invalid','外观设置无效',400)
export function validatedTheme(input:unknown):WindowTheme {
  const v=object(input)
  if(typeof v.dark!=='boolean'||!['zh','en'].includes(String(v.language)))throw invalid()
  const color=(key:string)=>{const s=text(v[key],100);if(!/^(#[\da-f]{3,8}|rgba?\([\d.,%\s]+\)|color\(srgb [\d.\s/]+\))$/i.test(s))throw invalid();return s}
  return {dark:v.dark,language:v.language as 'zh'|'en',background:color('background'),foreground:color('foreground'),muted:color('muted'),border:color('border')}
}
/** Profile-local preferences. Waiters and writes never enter the note repository queue. */
export class SharedAppearance {
  private data:Stored={version:1,storeId:randomUUID(),value:null,legacy:{},receipts:[]}
  private loaded=false
  private chain:Promise<unknown>=Promise.resolve()
  private readonly epoch=randomUUID()
  private sequence=0
  private theme:WindowTheme|null=null
  private waiters=new Map<string,()=>void>()
  private closed=false
  constructor(private dir:string,private waitMs=20_000){}
  private serial<T>(work:()=>Promise<T>):Promise<T>{const p=this.chain.then(work,work);this.chain=p.catch(()=>{});return p}
  private async load(){
    if(this.loaded)return
    try{
      const v=object(JSON.parse(await readFile(join(this.dir,'appearance.json'),'utf8')))
      if(v.version!==1||typeof v.storeId!=='string'||!Array.isArray(v.receipts)||!v.receipts.every(x=>typeof x==='string')||v.receipts.length>128)throw invalid()
      const legacy=object(v.legacy)
      for(const [key,value] of Object.entries(legacy))if(!['embedded','standalone','conversation'].includes(key)||(value!==null&&(typeof value!=='string'||value.length>8192)))throw invalid()
      if(v.value!==null&&JSON.stringify(appearanceValue(v.value))!==JSON.stringify(v.value))throw invalid()
      this.data={version:1,storeId:v.storeId,value:v.value as Appearance|null,legacy,receipts:v.receipts as string[]}
    }catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e}
    this.loaded=true
  }
  private async persist(next:Stored){
    await mkdir(this.dir,{recursive:true})
    const file=join(this.dir,'appearance.json'),tmp=file+'.'+randomUUID()+'.tmp'
    try{await writeFile(tmp,JSON.stringify(next),'utf8');await rename(tmp,file)}finally{await rm(tmp,{force:true}).catch(()=>{})}
    this.data=next
  }
  private changed(){this.sequence++;for(const wake of [...this.waiters.values()])wake()}
  private snapshot():AppearanceState{return {ok:true,epoch:this.epoch,sequence:this.sequence,storeId:this.data.storeId,value:this.data.value?{...this.data.value}:null,theme:this.theme?{...this.theme}:null}}
  async connect(surface:WindowSurface,input:unknown){return this.serial(async()=>{
    await this.load();const v=object(input)
    if(v.legacy!==null&&(typeof v.legacy!=='string'||v.legacy.length>8192))throw invalid()
    const next={...this.data,legacy:{...this.data.legacy}}
    let write=false
    if(!(surface in next.legacy)){next.legacy[surface]=v.legacy as string|null;write=true}
    if(!next.value&&surface==='embedded'){next.value=parseAppearance(v.legacy as string|null);write=true}
    const theme=v.theme===undefined?null:validatedTheme(v.theme)
    if(theme&&surface!=='embedded')throw invalid()
    if(write)await this.persist(next)
    const themeChanged=theme&&JSON.stringify(theme)!==JSON.stringify(this.theme)
    if(themeChanged)this.theme=theme
    if(write||themeChanged)this.changed()
    return this.snapshot()
  })}
  async update(input:unknown){return this.serial(async()=>{
    await this.load();const v=object(input),operationId=text(v.operationId,100),patch=object(v.patch)
    if(!/^[a-f0-9-]{36}$/.test(operationId)||v.storeId!==this.data.storeId)throw invalid()
    if(!this.data.value)throw new NotebookError('appearance_not_ready','请先打开 DSH 中的肥鱼笔记以完成外观同步',409)
    if(this.data.receipts.includes(operationId))return this.snapshot()
    const value=appearanceValue({...this.data.value,...patch})
    for(const [key,item] of Object.entries(patch))if(key==='version'||key==='mode'||!(key in value)||value[key as keyof Appearance]!==item)throw invalid()
    if(!Object.keys(patch).length)throw invalid()
    await this.persist({...this.data,value,receipts:[...this.data.receipts,operationId].slice(-128)})
    this.changed();return this.snapshot()
  })}
  setTheme(surface:WindowSurface,input:unknown){
    if(surface!=='embedded')throw invalid()
    const theme=validatedTheme(object(input).theme)
    if(JSON.stringify(theme)!==JSON.stringify(this.theme)){this.theme=theme;this.changed()}
    return this.snapshot()
  }
  async wait(windowId:string,input:unknown,signal:AbortSignal){
    await this.serial(()=>this.load());const v=object(input)
    if(typeof v.epoch!=='string'||!Number.isSafeInteger(v.sequence)||Number(v.sequence)<0)throw invalid()
    signal.throwIfAborted()
    if(this.closed||v.epoch!==this.epoch||v.sequence!==this.sequence)return this.snapshot()
    await new Promise<void>(resolve=>{
      const finish=()=>{clearTimeout(timer);signal.removeEventListener('abort',finish);if(this.waiters.get(windowId)===finish)this.waiters.delete(windowId);resolve()}
      const timer=setTimeout(finish,this.waitMs);timer.unref?.()
      this.waiters.get(windowId)?.();this.waiters.set(windowId,finish);signal.addEventListener('abort',finish,{once:true})
    })
    signal.throwIfAborted();return this.snapshot()
  }
  async close(){this.closed=true;for(const wake of [...this.waiters.values()])wake();await this.chain}
}
