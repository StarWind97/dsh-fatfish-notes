import {ImportWorkerClient} from './import-worker-client.js'
import {api,currentRepository} from './api.js'
export interface BundleRemote {name:string;path:string;body:unknown}
export async function bundleFiles(files:File[],remote:BundleRemote[],signal:AbortSignal,flatten=false):Promise<Blob>{
  const worker=new ImportWorkerClient(api,()=>{}),cancel=()=>worker.cancel();signal.throwIfAborted();signal.addEventListener('abort',cancel,{once:true})
  try{await worker.start();return await worker.request<Blob>('bundle',{files,remoteFiles:remote,repository:currentRepository(),flatten})}finally{signal.removeEventListener('abort',cancel);worker.cancel()}
}
