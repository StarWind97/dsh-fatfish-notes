import * as React from 'react'
import type {PropsRuntime} from '@deepseek-ai/dsh-client-ui-slots'
import type {InputState} from '@deepseek-ai/dsh-client-ui-conversation/client'
import {Check,LoaderCircle,Paperclip,Image,Quote} from 'lucide-react'
import type {NotesController} from './notes-controller.js'
import {PaperDialog} from './paper/PaperDialog.js'
import {TransientNotice} from './TransientNotice.js'
import {fileSize} from './NoteAttachments.js'
import {ReferenceReceipts,prepareReferences,type ReferenceTarget,type ReferenceChoice} from './note-reference.js'
import type {T} from './locale.js'

export const referenceTooltip='将笔记全文及正文中的图片、文件提供给当前会话，通过输入框插入读取提示词。补充附件可在下一步选择；不会自动发送。'

export function useNoteReference({controller,inputActions,useInput,sessionId,visible,available=true,scope,t,inserted}:{controller:NotesController;visible:boolean;available?:boolean;scope:string;t:T;inserted:(ids:string[])=>void}&Pick<PropsRuntime<'sidebar.right.pane.tab'>,'inputActions'|'useInput'|'sessionId'>){
  const input=useInput((s:InputState)=>s),[targets,setTargets]=React.useState<ReferenceTarget[]|null>(null),[choices,setChoices]=React.useState<ReferenceChoice[]>([]),[loading,setLoading]=React.useState(false),[busy,setBusy]=React.useState(false),[error,setError]=React.useState(''),[progress,setProgress]=React.useState(''),[notice,setNotice]=React.useState('')
  const active=React.useRef<AbortController|null>(null),current=React.useRef({visible,sessionId,available,scope});current.current={visible,sessionId,available,scope}
  const receipts=React.useMemo(()=>{let storage:Storage|undefined;try{storage=sessionStorage}catch{}return new ReferenceReceipts(storage,scope+':'+sessionId)},[scope,sessionId])
  function close(){active.current?.abort();setTargets(null);setError('')}
  React.useEffect(()=>()=>active.current?.abort(),[])
  React.useEffect(()=>{active.current?.abort();setTargets(null);setNotice('')},[sessionId,scope])
  React.useEffect(()=>{if(!visible||!available){close();setNotice('')}},[visible,available])
  const enabled=!!available&&!!inputActions&&!!input&&input.phase==='plain'&&!busy&&!loading
  async function open(rows:ReferenceTarget[]){
    if(!enabled||!rows.length)return
    active.current?.abort();const abort=new AbortController();active.current=abort
    const unique=[...new Map(rows.map(r=>[r.noteId,r])).values()]
    setTargets(unique);setChoices([]);setError('');setNotice('');setLoading(true)
    try{
      const next:ReferenceChoice[]=[]
      for(const row of unique){
        setProgress(`正在检查 ${next.length+1} / ${unique.length} · ${row.title}`)
        const {plan}=await controller.api('/notes/reference-preview',{noteId:row.noteId},abort.signal)
        next.push({plan,selected:plan.supplements.map(m=>m.id)})
      }
      abort.signal.throwIfAborted();setChoices(next)
    }catch{if(!abort.signal.aborted)setError('未能读取所选笔记，请重试。')}
    finally{if(active.current===abort){active.current=null;setLoading(false)}}
  }
  async function run(){
    if(!enabled||!inputActions||!input||!choices.length)return
    const draftBefore=input.draft,span=inputActions.captureInsertion(),at={...span,start:span.end},abort=new AbortController();active.current=abort;setBusy(true);setError('')
    const pending=choices.filter(c=>!receipts.has(c.plan,draftBefore)),ids=choices.map(c=>c.plan.noteId)
    try{
      if(!pending.length){setNotice('已加入当前输入框，无需重复添加。');setTargets(null);inserted(ids);return}
      const result=await prepareReferences(controller.api,sessionId,pending,abort.signal,(index,title)=>setProgress(`正在准备 ${index+1} / ${pending.length} · ${title}`))
      abort.signal.throwIfAborted()
      if(!current.current.visible||!current.current.available||current.current.scope!==scope||current.current.sessionId!==sessionId||!inputActions.insertText(result.instruction,at)){setError('当前会话或输入内容已变化，本次未插入。请确认后重试。');return}
      receipts.remember(result.notes,draftBefore);inputActions.persistDraft();setTargets(null);inserted(ids)
      setNotice(`已将 ${pending.length} 篇笔记加入输入框，可补充要求后发送。${pending.length<choices.length?'已跳过当前输入中重复的笔记。':''}`)
    }catch(e){if(!abort.signal.aborted){const changed=(e as {code?:string}).code==='reference_changed';if(changed)setChoices([]);setError(changed?'笔记已变化，请重新检查内容和附件。':'资料准备未完成，未向输入框插入内容。请重试或调整选择。')}}
    finally{if(active.current===abort){active.current=null;setBusy(false)}}
  }
  const dialogs=<>
    {notice&&<TransientNotice identity={notice} message={notice} milliseconds={5000} close={()=>setNotice('')}/>}
    {targets&&<PaperDialog title="引用到当前会话" closeLabel={t('paperClose')} onClose={close} className="reference-dialog">
      <style>{referenceCss}</style><div className="paper-dialog-content">
        <p className="reference-intro">正文及其中的图片、文件完整引用。准备完成后加入读取提示词，由你检查并发送。</p>
        {(loading||busy)&&<p className="reference-progress" role="status"><LoaderCircle className="conversation-link-spinner" size={16}/><span>{progress}</span></p>}
        {!loading&&choices.map(({plan,selected})=><section key={plan.noteId} className="reference-note">
          <div className="reference-note-title"><Quote size={15}/><strong title={plan.title}>{plan.title}</strong>{receipts.has(plan,input?.draft??'')&&<small>已加入</small>}</div>
          <p className="reference-included"><Check size={14}/> 全文{plan.required.assetIds.length?` · ${plan.required.assetIds.length} 张正文图片`:''}{plan.required.attachmentIds.length?` · ${plan.required.attachmentIds.length} 个正文文件`:''} · 完整引用</p>
          {!!plan.supplements.length&&<details className="reference-supplements" open={choices.length===1?true:undefined}><summary>补充附件 · 已选 {selected.length} / {plan.supplements.length}</summary>
            <div className="reference-select-actions"><button disabled={busy} onClick={()=>setChoices(cs=>cs.map(c=>c.plan.noteId===plan.noteId?{...c,selected:plan.supplements.map(m=>m.id)}:c))}>全选</button><button disabled={busy} onClick={()=>setChoices(cs=>cs.map(c=>c.plan.noteId===plan.noteId?{...c,selected:[]}:c))}>全不选</button></div>
            {plan.supplements.map(m=><label key={m.id}><input type="checkbox" disabled={busy} checked={selected.includes(m.id)} onChange={e=>setChoices(cs=>cs.map(c=>c.plan.noteId===plan.noteId?{...c,selected:e.target.checked?[...c.selected,m.id]:c.selected.filter(id=>id!==m.id)}:c))}/>{m.image?<Image size={15}/>:<Paperclip size={15}/>}<span>{m.name}{m.bytes!==null&&<small>{fileSize(m.bytes)}</small>}</span></label>)}
          </details>}
        </section>)}
        {error&&<p role="alert" className="reference-error">{error}</p>}
      </div><footer><span>{targets.length} 篇笔记</span><button onClick={close}>取消</button>{error&&!choices.length?<button onClick={()=>void open(targets)}>重试</button>:<button className="paper-primary" disabled={!enabled||!choices.length} onClick={()=>void run()}>加入输入框</button>}</footer>
    </PaperDialog>}
  </>
  return {open:(rows:ReferenceTarget[])=>void open(rows),enabled,dialogs,busy:busy||loading}
}

const referenceCss=`
.reference-dialog{width:min(620px,calc(100vw - 32px));font-size:13px}.reference-intro{color:var(--muted);line-height:1.65}.reference-note{padding:14px 0;border-bottom:1px solid var(--rule)}.reference-note:last-of-type{border-bottom:0}.reference-note-title{display:flex;align-items:center;gap:8px}.reference-note-title strong{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}.reference-note-title small{color:var(--muted);white-space:nowrap}.reference-included{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);margin:8px 0}.reference-supplements{padding:10px 12px;background:color-mix(in srgb,var(--base) 96%,var(--ink));border:1px solid var(--rule);border-radius:8px}.reference-supplements summary{cursor:pointer;color:var(--muted)}.reference-supplements label{display:flex;align-items:center;gap:8px;padding:7px 0;overflow-wrap:anywhere}.reference-supplements input{width:14px!important;height:14px;flex:none;margin:0!important}.reference-supplements svg{flex:none}.reference-supplements small{display:block;color:var(--muted);font-size:11px}.reference-select-actions{display:flex;gap:10px;margin-top:8px}.reference-select-actions button{font-size:12px;border:0;padding:2px 4px}.reference-dialog>footer>span{margin-right:auto;color:var(--muted);font-size:12px}.reference-progress{display:flex;align-items:center;gap:8px;color:var(--muted)}.reference-progress span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.reference-error{color:light-dark(#ad3333,#f1a0a0)}
`
