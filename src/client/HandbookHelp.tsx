import * as React from 'react'
import {useState} from 'react'
import {BookOpen} from 'lucide-react'
import {api} from './api.js'

export function HandbookHelp(){
  const [busy,setBusy]=useState(false),[missing,setMissing]=useState(false),[error,setError]=useState(false)
  const running=React.useRef(false)
  async function open(add=false){
    if(running.current)return
    running.current=true;setBusy(true);setError(false)
    try{
      const result=await api('/notes/handbook',{action:add?'add':'open'})
      if(result.noteId){setMissing(false);window.dispatchEvent(new CustomEvent('fatfish-notes-open-handbook',{detail:{noteId:result.noteId}}))}
      else setMissing(true)
    }catch{setError(true)}finally{running.current=false;setBusy(false)}
  }
  return <section className="setup-section" aria-label="用户手册">
    <strong><BookOpen size={17}/> 用户手册</strong>
    <p>用可以直接阅读、编辑和取用的笔记，了解写作、资料整理、会话转存与导出。</p>
    {!missing&&<button disabled={busy} onClick={()=>void open()}>{busy?'正在打开…':'打开用户手册'}</button>}
    {missing&&<><p>这份笔记库里没有可打开的手册。可以添加一份新的副本；原来的删除记录会保留。</p><button disabled={busy} onClick={()=>void open(true)}>{busy?'正在添加…':'添加用户手册'}</button></>}
    {error&&<p role="alert">手册暂未打开，请重试。已有笔记和修改会保留。</p>}
  </section>
}
