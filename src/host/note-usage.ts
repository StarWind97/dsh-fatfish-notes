import {readdir,lstat} from 'node:fs/promises'
import {dirname,join} from 'node:path'
import {missing,safePath} from '../notes/files.js'
import type {NoteRepository} from '../notes/repository.js'
export interface NoteUsage {bytes:number;gitBytes:number;notes:number;revisions:number;level:'normal'|'notice'|'large';nearLimit:boolean}
/** On-demand metadata walk. No file bodies, credentials or Git objects are opened. */
export class NoteUsageReader {
  private cached:{root:string;time:number;value:NoteUsage}|undefined
  private pending:Promise<NoteUsage>|undefined
  constructor(private repo:NoteRepository){}
  read(signal?:AbortSignal){
    const root=this.repo.files.root
    if(this.cached?.root===root&&Date.now()-this.cached.time<60_000)return Promise.resolve(this.cached.value)
    if(this.pending)return this.pending
    const work=async()=>{
      const snapshot=await this.repo.files.scan();signal?.throwIfAborted()
      const paths=snapshot.paths,notes=new Set(paths.flatMap(p=>/^revisions\/([^/]+)\//.exec(p)?.[1]?[p.split('/')[1]!]:[])).size
      const revisions=paths.filter(p=>/^(revisions|notebooks)\/[^/]+\/[a-f0-9]{64}\.json$/.test(p)).length
      const walk=async(path:string):Promise<number>=>{
        signal?.throwIfAborted();const info=await lstat(path).catch(e=>{if(missing(e))return null;throw e})
        if(!info||info.isSymbolicLink())return 0
        if(info.isFile())return info.size
        let bytes=0;for(const entry of await readdir(path))bytes+=await walk(join(path,entry));return bytes
      }
      const git=join(dirname(root),'backup','repositories');await safePath(git)
      const gitBytes=await walk(git)
      const value:NoteUsage={bytes:snapshot.bytes,gitBytes,notes,revisions,level:snapshot.bytes>=5*1024**3?'large':snapshot.bytes>=1024**3?'notice':'normal',nearLimit:notes>=4500||revisions>=90_000}
      this.cached={root,time:Date.now(),value};return value
    }
    this.pending=work().finally(()=>{this.pending=undefined});return this.pending
  }
}
