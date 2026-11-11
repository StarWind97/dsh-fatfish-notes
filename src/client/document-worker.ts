import {documentStats} from './paper/document-stats.js'
const port=globalThis as unknown as {postMessage(value:unknown):void;onmessage:((event:MessageEvent<{id:number;body:string}>)=>void)|null}
port.onmessage=({data})=>{
  try{port.postMessage({id:data.id,...documentStats(data.body)})}
  catch{port.postMessage({id:data.id,failed:true})}
}
