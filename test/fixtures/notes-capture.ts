import type { SessionController, SessionWireEvent } from '@deepseek-ai/dsh-api-session-controller'
import type { CaptureRequest } from '../../src/contracts/notes.js'
export const request: CaptureRequest = { requestId:'capture-test-1',sessionId:'session-test',scope:'session',mode:'raw',autoMetadata:false,notebookId:null }
export function fixture() {
  const events:SessionWireEvent[]=Array.from({length:112},(_,seq)=>({type:seq%2?'assistant/message':'user/message',seq,time:seq,surfaceOp:'append',data:seq%2?{message:{id:`m${seq}`,content:[{type:'text',text:`  answer ${seq}\r\n\n`}]}}:{id:`m${seq}`,source:{kind:'user'},content:[{type:'text',text:`  question ${seq}\n`}]}}))
  let follows=0, pages=0
  const cuts:number[]=[]
  const controller={
    async *follow(){follows++;yield {type:'snapshot',header:{id:request.sessionId,isSeeded:false},cursor:events.length-1,records:events.slice(-40).map(event=>({type:'event',event})),hasMore:true}},
    async page(input:{throughSeq:number;beforeSeq?:number}){pages++;cuts.push(input.throughSeq);const end=input.beforeSeq??input.throughSeq+1,start=Math.max(0,end-40);return{records:events.slice(start,Math.min(end+1,input.throughSeq+1)).map(event=>({type:'event',event})),hasMore:start>0,cursor:input.throughSeq}},
    async attachment(){throw new Error('no image')},
  } as unknown as Pick<SessionController,'follow'|'page'|'attachment'>
  return{events,controller,cuts,get follows(){return follows},get pages(){return pages}}
}
