import {Unzip,UnzipInflate} from 'fflate'
import {portablePath,type ImportEntry} from './library-import.js'
import {ATTACHMENT_LIMIT} from '../contracts/notes.js'

const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0})
function crc(data:Uint8Array,value:number){for(const n of data)value=crcTable[(value^n)&255]!^(value>>>8);return value}
export const IMPORT_CHUNK=1024*1024
/** Archive bytes live in browser-managed temporary storage, not an in-memory archive map. */
export class ImportWorkerStore {
  private db:IDBDatabase|null=null
  constructor(readonly name:string){}
  async open(){this.db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open(this.name,1);r.onupgradeneeded=()=>r.result.createObjectStore('chunks');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
  private put(key:string,value:Uint8Array){return new Promise<void>((resolve,reject)=>{const tx=this.db!.transaction('chunks','readwrite');tx.objectStore('chunks').put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
  private get(key:string){return new Promise<Uint8Array>((resolve,reject)=>{const r=this.db!.transaction('chunks').objectStore('chunks').get(key);r.onsuccess=()=>r.result?resolve(r.result as Uint8Array):reject(Error('Missing archive chunk'));r.onerror=()=>reject(r.error)})}
  async close(){this.db?.close();this.db=null}
  async unzip(file:File,progress:(bytes:number,total:number,path:string)=>void):Promise<{entries:ImportEntry[];warnings:string[]}>{
    // Central-directory sizes and CRCs let us reject truncated/changed archives and ZIP bombs.
    const tail=new Uint8Array(await file.slice(Math.max(0,file.size-65557)).arrayBuffer()),dv=new DataView(tail.buffer)
    let end=-1;for(let i=tail.length-22;i>=0;i--)if(dv.getUint32(i,true)===0x06054b50&&i+22+dv.getUint16(i+20,true)===tail.length){end=i;break}
    if(end<0||dv.getUint16(end+4,true)||dv.getUint16(end+6,true))throw Error('Invalid ZIP')
    const count=dv.getUint16(end+10,true),size=dv.getUint32(end+12,true),offset=dv.getUint32(end+16,true)
    if(count===65535||size===0xffffffff||offset===0xffffffff)throw Error('ZIP64 is not supported')
    if(count>10000||size>16*1024*1024||offset+size>file.size)throw Error('Invalid ZIP directory')
    const directory=new Uint8Array(await file.slice(offset,offset+size).arrayBuffer()),view=new DataView(directory.buffer),expected=new Map<string,{size:number;crc:number}>(),warnings:string[]=[],names=new Set<string>()
    let at=0
    for(let i=0;i<count;i++){
      if(at+46>directory.length||view.getUint32(at,true)!==0x02014b50)throw Error('Invalid ZIP entry')
      const n=view.getUint16(at+28,true),extra=view.getUint16(at+30,true),comment=view.getUint16(at+32,true),bytes=view.getUint32(at+24,true)
      if(at+46+n+extra+comment>directory.length)throw Error('Truncated ZIP directory')
      const raw=new TextDecoder('utf-8',{fatal:true}).decode(directory.subarray(at+46,at+46+n)),path=portablePath(raw)
      if(names.has(raw))throw Error('Duplicate ZIP entry');names.add(raw)
      if(!raw.endsWith('/')&&path&&!path.split('/').some(p=>p.startsWith('.'))){
        if(view.getUint16(at+8,true)&1)throw Error('Encrypted ZIP is not supported')
        if(bytes>ATTACHMENT_LIMIT)warnings.push(`${path}: 文件超过保存上限，已跳过`)
        else expected.set(raw,{size:bytes,crc:view.getUint32(at+16,true)})
      }else if(!raw.endsWith('/'))warnings.push(`${raw}: 已跳过隐藏文件或不安全路径`)
      at+=46+n+extra+comment
    }
    if(at!==directory.length)throw Error('Invalid ZIP directory length')
    const entries:ImportEntry[]=[],seen=new Set<string>(),paths=new Set<string>();let pending:Promise<void>[]=[],error:unknown=null
    const unzip=new Unzip(f=>{
      const meta=expected.get(f.name);if(!meta)return
      if(seen.has(f.name))throw Error('Duplicate ZIP local entry');seen.add(f.name)
      const path=portablePath(f.name)!;if(paths.has(path.toLowerCase()))throw Error('Duplicate archive path');paths.add(path.toLowerCase())
      let bytes=0,checksum=0xffffffff,chunks=0
      f.ondata=(err,data,final)=>{
        if(err){error=err;return}
        bytes+=data.length;if(bytes>meta.size||bytes>ATTACHMENT_LIMIT){error=Error('ZIP entry exceeds declared size');f.terminate();return}
        checksum=crc(data,checksum)
        for(let at=0;at<data.length;at+=IMPORT_CHUNK)pending.push(this.put(`${path}\n${chunks++}`,data.slice(at,at+IMPORT_CHUNK)))
        if(final){
          if(bytes!==meta.size||((checksum^0xffffffff)>>>0)!==meta.crc){error=Error('ZIP checksum mismatch');return}
          const parts=async function*(store:ImportWorkerStore){for(let i=0;i<chunks;i++)yield await store.get(`${path}\n${i}`)}
          entries.push({path,bytes,chunks:()=>parts(this),read:async()=>{const output=new Uint8Array(bytes);let at=0;for await(const part of parts(this)){output.set(part,at);at+=part.length}return output}})
        }
      };f.start()
    });unzip.register(UnzipInflate)
    for(let start=0;start<offset;start+=64*1024){const to=Math.min(offset,start+64*1024);unzip.push(new Uint8Array(await file.slice(start,to).arrayBuffer()),to===offset);await Promise.all(pending);pending=[];if(error)throw error;progress(to,offset,'解压文件')}
    if(entries.length!==expected.size)throw Error('Incomplete ZIP')
    return {entries,warnings}
  }
}
