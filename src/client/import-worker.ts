import {Zip,ZipPassThrough} from 'fflate'
import type {BundleRemote} from './export-bundle.js'
import {scanImport,importNote,transferEntry,type ImportPlan} from './library-import.js'
import {imageDimensions} from '../notes/export/image.js'
import {ImportWorkerStore,IMPORT_CHUNK} from './import-worker-store.js'
import type {Api} from './api.js'
type Packet={flatten?:boolean;repository?:number;remoteFiles?:BundleRemote[];id:number;action:string;files?:File[];zip?:boolean;database?:string;noteId?:string;selected?:string[];notebookId?:string;remote?:boolean;value?:unknown;error?:string;draft?:boolean;mediaType?:string;editId?:string}
const port=globalThis as unknown as {postMessage(value:unknown):void;onmessage:((event:MessageEvent<Packet>)=>void)|null}
let plan:ImportPlan|null=null,store:ImportWorkerStore|null=null,serial=Promise.resolve(),sequence=0
const calls=new Map<number,{resolve:(v:unknown)=>void;reject:(e:Error)=>void}>()
const api=((path:string,body:unknown)=>new Promise<unknown>((resolve,reject)=>{const id=++sequence;calls.set(id,{resolve,reject});port.postMessage({kind:'api',id,path,body})})) as Api
const progress=(bytes:number,total:number,path:string)=>port.postMessage({kind:'progress',bytes,total,path})
async function run(m:Packet){
  if(m.action==='ping')return {worker:true}
  if(m.action==='bundle'){
    const output:Blob[]=[],zip=new Zip((error,data)=>{if(error)throw error;output.push(new Blob([new Uint8Array(data)]))})
    const add=async(name:string,chunks:AsyncIterable<Uint8Array>)=>{const file=new ZipPassThrough(name);zip.add(file);for await(const chunk of chunks)file.push(chunk,false);file.push(new Uint8Array(),true)}
    async function* fileChunks(file:File){for(let p=0;p<file.size;p+=IMPORT_CHUNK)yield new Uint8Array(await file.slice(p,p+IMPORT_CHUNK).arrayBuffer())}
    try{
      for(const f of m.files??[]){if(m.flatten&&f.type==='application/zip'){store=new ImportWorkerStore(m.database!);await store.open();const archive=await store.unzip(f,progress);if(archive.warnings.length)throw Error('Export archive incomplete');for(const entry of archive.entries)await add(entry.path,entry.chunks!())}else await add(f.name,fileChunks(f))}
      for(const f of m.remoteFiles??[]){
        if(!['/notes/download','/notes/conversation-file'].includes(f.path))throw Error('Invalid export request')
        const response=await fetch('/dsh-fatfish-notes'+f.path,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json',...(m.repository===undefined?{}:{'x-notebook-repository':String(m.repository)})},body:JSON.stringify(f.body)})
        if(!response.ok||!response.body)throw Error('File unavailable or changed')
        async function* parts(){const reader=response.body!.getReader();try{for(;;){const r=await reader.read();if(r.done)break;yield r.value}}finally{reader.releaseLock()}}
        await add('attachments/'+f.name,parts())
      }
      zip.end();return new Blob(output,{type:'application/zip'})
    }finally{zip.terminate();await store?.close()}
  }
  if(m.action==='file'){
    const file=m.files![0]!
    if(m.mediaType){if(file.size>20*1024*1024)throw Error('image_limit');try{imageDimensions(new Uint8Array(await file.arrayBuffer()),{side:Number.MAX_SAFE_INTEGER,imagePixels:32_000_000})}catch{throw Error('image_limit')}}
    return transferEntry({path:file.name,bytes:file.size,read:async()=>new Uint8Array(await file.arrayBuffer()),chunks:async function*(){for(let at=0;at<file.size;at+=IMPORT_CHUNK)yield new Uint8Array(await file.slice(at,at+IMPORT_CHUNK).arrayBuffer())}},{noteId:m.noteId!,draft:!!m.draft,...(m.editId?{editId:m.editId}:{}),...(m.mediaType?{mediaType:m.mediaType}:{})},api,undefined,progress)
  }
  if(m.action==='scan'){
    await store?.close();store=new ImportWorkerStore(m.database!);await store.open()
    const files=m.files??[]
    const scanned=m.zip?await store.unzip(files[0]!,progress):{entries:files.map(f=>({path:f.webkitRelativePath?f.webkitRelativePath.split('/').slice(1).join('/'):f.name,bytes:f.size,read:async()=>new Uint8Array(await f.arrayBuffer()),chunks:async function*(){for(let at=0;at<f.size;at+=IMPORT_CHUNK)yield new Uint8Array(await f.slice(at,at+IMPORT_CHUNK).arrayBuffer())}})),warnings:[]}
    plan=await scanImport(scanned.entries,scanned.warnings,undefined,path=>progress(0,0,path))
    return {notes:plan.notes,warnings:plan.warnings,bytes:plan.bytes,entries:[...plan.entries.values()].map(e=>({path:e.path,bytes:e.bytes}))}
  }
  if(m.action==='import'){
    if(!plan)throw Error('No import plan');const note=plan.notes.find(n=>n.noteId===m.noteId);if(!note)throw Error('No note')
    return importNote({...plan,notes:plan.notes.filter(n=>m.selected?.includes(n.noteId))},note,m.notebookId!,!!m.remote,api,undefined,progress)
  }
  throw Error('Unknown worker operation')
}
port.onmessage=({data:m})=>{
  if(m.action==='api-result'){const call=calls.get(m.id);calls.delete(m.id);if(m.error)call?.reject(Error(m.error));else call?.resolve(m.value);return}
  serial=serial.then(async()=>{try{port.postMessage({kind:'result',id:m.id,value:await run(m)})}catch(e){port.postMessage({kind:'result',id:m.id,error:e instanceof Error?e.message:'Import failed'})}})
}
