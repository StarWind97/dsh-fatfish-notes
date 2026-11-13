import type {GitSnapshot} from '../git/types.js'
import {fail} from './validation.js'

interface CachedFile {identity:string;length:number;bytes?:Buffer}
/** Receipts from a completely validated snapshot. Binary bodies are never retained. */
export class VerifiedSnapshotFiles {
  private readonly files=new Map<string,CachedFile>()
  private bytes=0
  constructor(private readonly byteLimit=32*1024*1024,private readonly entryLimit=10_000){}
  private identity(snapshot:GitSnapshot,path:string):string|undefined{
    const entry=snapshot.entries.get(path)
    if(!entry||entry.type!=='blob'||!['100644','100755'].includes(entry.mode)||!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(entry.sha))return undefined
    return `${entry.mode}:${entry.sha}`
  }
  get(snapshot:GitSnapshot,path:string,limit:number):{length:number;bytes?:Buffer}|undefined{
    const cached=this.files.get(path)
    if(!cached||cached.identity!==this.identity(snapshot,path))return undefined
    if(cached.length>limit)fail('note_limit')
    return {length:cached.length,...(cached.bytes?{bytes:Buffer.from(cached.bytes)}:{})}
  }
  remember(snapshot:GitSnapshot,path:string,file:Buffer|{length:number}):void{
    const identity=this.identity(snapshot,path)
    if(!identity||this.files.size>=this.entryLimit)return
    const binary=/^notes\/(assets|attachments)\//.test(path)
    if(!binary&&(!Buffer.isBuffer(file)||this.bytes+file.length>this.byteLimit))return
    const bytes=!binary&&Buffer.isBuffer(file)?Buffer.from(file):undefined
    this.files.set(path,{identity,length:file.length,...(bytes?{bytes}:{})});this.bytes+=bytes?.length??0
  }
}
