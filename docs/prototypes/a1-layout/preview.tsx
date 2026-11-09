import * as React from 'react'
import {createRoot} from 'react-dom/client'
import {useEffect,useRef,useState,useSyncExternalStore} from 'react'
import {BookOpen,Notebook,PanelLeftClose,PanelLeftOpen,ExternalLink,Search,SquarePen,ChevronDown,CheckCircle2,Trash2,Settings,MessageSquare,Sun,Moon,ArrowDownUp,X,Info} from 'lucide-react'
import {NoteEditor} from '../../../src/client/NoteEditor'
import {NotesController} from '../../../src/client/notes-controller'
import {translate} from '../../../src/client/locale'
import {notesCss} from '../../../src/client/notes-style'
import {paperCss} from '../../../src/client/paper/style'
import type {NoteView,NotebookView,NoteListOptions} from '../../../src/contracts/notes'
import type {Api} from '../../../src/client/api'
import type {OutlineSession} from '../../../src/client/paper/use-outline'
import './preview.css'

// Disposable layout model. This entry never connects to a DSH or GitHub service.
const key='fatfish-a1-layout-v1',id=(n:number)=>'01K9TEST0000000000000000'+String(n).padStart(3,'0')
const now='2026-11-09T10:21:00.000Z'
const books:NotebookView[]=['随手记','工作与项目','阅读与学习','生活灵感'].map((title,i)=>({notebookId:id(i+1),heads:['book'],current:{version:1,notebookId:id(i+1),revision:'book',parents:[],recordedAt:now,title,status:'active'},conflicts:[],isDefault:i===0}))
const body=`## 从一次对话开始

把有价值的对话留下来，按照自己的理解慢慢整理。先写清楚问题和背景，再保留证据、判断与下一步行动。

> 笔记的价值，是下一次需要时，还能从熟悉的位置继续。

### 保留必要的背景

这篇记录来自一次项目讨论。保留结论之外，也留下当时的限制与选择，避免几周后只记得答案，却想不起原因。

- 问题：怎样在讨论的同时整理手边的资料？
- 背景：会话持续进行，笔记需要单独查阅。
- 取舍：先保证阅读和编辑，再增加更多工具。

### 给信息一个清晰的结构

用笔记本区分主题，用标题形成章节，用摘要帮助快速找回。无需在一开始就建立复杂分类。

| 内容 | 合适的位置 |
| --- | --- |
| 临时想法、待整理的片段 | 随手记 |
| 决策、执行方案与复盘 | 工作与项目 |
| 阅读摘录与自己的理解 | 阅读与学习 |

## 边工作，边整理

在 DSH 中继续会话，把笔记放在另一扇窗口。需要对照资料时，两个窗口各自保留阅读位置。

### 从阅读进入编辑

编辑器就在正文原来的位置打开。标题、摘要、标签和正文都可以手动调整；停笔后会自动保存。

\`\`\`markdown
## 下一步
- [ ] 核对资料来源
- [ ] 留下自己的判断
- [ ] 写下可以继续的行动
\`\`\`

### 留出恰好的空间

窗口宽时，笔记本、文章列表与正文各有位置。窗口变窄时，笔记本收进下拉选择，优先保证正文可读。

## 下一次，从这里继续

- [x] 保留原始对话
- [x] 写清摘要和关键词
- [ ] 补充实践后的结果

不急着整理所有内容。先让今天真正有用的几篇，能够方便地被找到、继续修改。`
const seeds=[
 ['把一次会话，变成可以继续使用的资料','保留背景、结论与下一步，让下一次阅读从熟悉的位置开始。',1,body,['工作流','知识整理']],
 ['本周项目：从讨论走向行动','把讨论里的共识拆成可执行的任务，并留下待确认的问题。',1,'## 已有共识\n\n先做好常用功能，再扩展新的能力。\n\n## 本周行动\n\n- [ ] 完成界面验收\n- [ ] 补充使用说明',['项目']],
 ['读书摘录 · 给想法留下位置','摘录只是起点，自己的理解与实践才让阅读变得有用。',2,'## 摘录与理解\n\n写下让你停顿的一句话，再写下为什么。\n\n## 用在什么地方\n\n把一个观点放回实际生活中检验。',['阅读']],
 ['周末观星手记','准备器材，记下月面细节，并保存当晚的观察。',3,'## 出发前\n\n找一处开阔、少灯光的位置。\n\n## 随身物品\n\n- [ ] 望远镜与三脚架\n- [ ] 红光手电\n\n## 留下这一刻\n\n日期、地点、天气，以及看到的细节。',['观察']],
 ['关于界面的几个小想法','让常用操作容易找到，让内容有足够的呼吸空间。',0,'## 第一印象\n\n克制的颜色、清晰的层级和一致的操作。\n\n## 待验证\n\n在真实内容上试一试。',['灵感']],
 ['会话笔记 · 一次阅读计划','每天留出一段连续时间，读一章，写两句自己的理解。',0,'## 阅读计划\n\n每天三十分钟。\n\n## 回顾\n\n周末整理本周最值得继续的问题。',['计划']],
] as const
let notes:NoteView[]=seeds.map(([title,summary,book,body,tags],i)=>{const noteId=id(i+10),revision=String(i+1).repeat(64);return {noteId,heads:[revision],current:{version:1,noteId,revision,parents:[],recordedAt:now,title,summary,body,tags:[...tags],notebookId:books[book]!.notebookId,status:'active',sourceId:null,assetIds:[]},conflicts:[],savedAt:now,effectiveNotebookId:books[book]!.notebookId}})
try{const saved=JSON.parse(localStorage.getItem(key+'.notes')||'null');if(Array.isArray(saved)&&saved.length)notes=saved}catch{}
const persist=()=>localStorage.setItem(key+'.notes',JSON.stringify(notes))
const call:Api=(async(route:string,input:any)=>{
 if(route==='/notes/notebooks')return {ok:true,notebooks:books}
 if(route==='/notes/jobs')return {ok:true,jobs:[],cursor:null}
 if(route==='/notes'){const f:NoteListOptions=input||{};return {ok:true,cursor:null,items:notes.filter(n=>(n.current.status===(f.status||'active'))&&(!f.notebookId||n.effectiveNotebookId===f.notebookId)&&(!f.query||JSON.stringify(n.current).includes(f.query))&&(!f.tag||n.current.tags.includes(f.tag))).map(n=>({...n.current,heads:n.heads,notebookId:n.effectiveNotebookId,savedAt:n.savedAt,conflicted:false,excerpt:n.current.summary}))}}
 if(route==='/notes/get'){const note=notes.find(n=>n.noteId===input.noteId);if(!note)throw Error('not found');return {ok:true,note:structuredClone(note)}}
 if(route==='/notes/save'){const noteId=input.noteId||id(100+notes.length),revision=crypto.randomUUID().replaceAll('-','').repeat(2),savedAt=new Date().toISOString(),note:NoteView={noteId,heads:[revision],current:{...input.content,version:1,noteId,revision,parents:input.expectedHeads,recordedAt:savedAt},conflicts:[],savedAt,effectiveNotebookId:input.content.notebookId||books[0]!.notebookId};notes=[note,...notes.filter(n=>n.noteId!==noteId)];persist();return {ok:true,note:structuredClone(note)}}
 if(route==='/notes/trash'||route==='/notes/restore'){const note=notes.find(n=>n.noteId===input.noteId)!;note.current.status=route.endsWith('trash')?'trashed':'active';persist();return {ok:true,note:structuredClone(note)}}
 throw Error('此操作不在 A1 布局样稿范围内')
}) as Api
const controller=new NotesController(call,{repository:()=>1,storage:{getItem:k=>localStorage.getItem(key+k),setItem:(k,v)=>localStorage.setItem(key+k,v),removeItem:k=>localStorage.removeItem(key+k)}})
Object.assign(window,{a1Preview:controller})
type Surface='embedded'|'window'
type Pref={open:boolean|null;book:number;list:number}
const defaultPref:Pref={open:null,book:196,list:312}
function getPref(surface:Surface):Pref{try{return {...defaultPref,...JSON.parse(localStorage.getItem(key+'.'+surface)||'{}')}}catch{return {...defaultPref}}}

function App(){
 const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot)
 const [surface,setSurface]=useState<Surface>('window'),[dark,setDark]=useState(false),[pref,setPref]=useState(()=>getPref('window')),[width,setWidth]=useState(0),[wide,setWide]=useState(false),[full,setFull]=useState(false),[query,setQuery]=useState(''),[occupied,setOccupied]=useState(false),[notice,setNotice]=useState(''),[managed,setManaged]=useState(false)
 const area=useRef<HTMLDivElement>(null),outline=useRef<OutlineSession>({wide:null,open:false}),selectedBook=books.find(b=>b.notebookId===state.filter.notebookId)
 const expanded=wide&&pref.open!==false
 useEffect(()=>{void controller.initialize(null);return()=>{void controller.leave()}},[])
 useEffect(()=>{const node=area.current!;const ro=new ResizeObserver(([entry])=>{const w=entry!.contentRect.width;setWidth(Math.round(w));setWide(previous=>w>=(previous?1100:1140))});ro.observe(node);return()=>ro.disconnect()},[])
 useEffect(()=>{localStorage.setItem(key+'.'+surface,JSON.stringify(pref))},[pref,surface])
 useEffect(()=>{document.documentElement.style.colorScheme=dark?'dark':'light'},[dark])
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),3800);return()=>clearTimeout(timer)},[notice])
 async function switchSurface(next:Surface){await controller.leave();setSurface(next);setPref(getPref(next));setWide(false);setOccupied(false)}
 async function selectBook(book?:string){setManaged(false);await controller.selectFilter({...(book?{notebookId:book}:{}),order:'recent'});setQuery('')}
 function clearTag(){const {tag,...filter}=state.filter;void controller.selectFilter(filter)}
 const minBody=460,listWidth=Math.max(220,Math.min(pref.list,width-(expanded?pref.book:0)-minBody)),bookWidth=Math.min(pref.book,Math.max(164,width-listWidth-minBody))
 function resize(e:React.PointerEvent<HTMLDivElement>,name:'book'|'list'){const start=e.clientX,initial=name==='book'?bookWidth:listWidth;e.currentTarget.setPointerCapture(e.pointerId);const node=e.currentTarget;const move=(event:PointerEvent)=>{const maximum=name==='book'?Math.min(260,width-listWidth-minBody):Math.min(440,width-(expanded?bookWidth:0)-minBody);setPref(p=>({...p,[name]:Math.max(name==='book'?164:240,Math.min(maximum,initial+event.clientX-start))}))};const stop=()=>{node.removeEventListener('pointermove',move);node.removeEventListener('pointerup',stop);node.removeEventListener('pointercancel',stop)};node.addEventListener('pointermove',move);node.addEventListener('pointerup',stop);node.addEventListener('pointercancel',stop)}
 function divider(name:'book'|'list',value:number){return <div className="a1-divider" role="separator" aria-label={name==='book'?'调整笔记本栏宽度':'调整笔记列表宽度'} aria-orientation="vertical" tabIndex={0} aria-valuemin={name==='book'?164:240} aria-valuemax={name==='book'?260:440} aria-valuenow={Math.round(value)} onPointerDown={e=>resize(e,name)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();setPref(p=>({...p,[name]:Math.max(name==='book'?164:240,Math.min(name==='book'?260:440,p[name]+(e.key==='ArrowRight'?16:-16)))}))}}}/>}
 return <div className="a1-root" data-dark={dark}>
  <style>{notesCss+paperCss}</style>
  <div className="a1-demo-bar"><span><b>A1</b> 三栏布局样稿</span><div className="a1-segment"><button aria-pressed={surface==='embedded'} onClick={()=>void switchSurface('embedded')}>DSH 内</button><button aria-pressed={surface==='window'} onClick={()=>void switchSurface('window')}>独立窗口</button></div><span className="a1-measure">内容区 {width} px · {expanded?'三栏':'两栏'}</span><button title="切换深浅色" aria-label="切换深浅色" onClick={()=>setDark(!dark)}>{dark?<Sun size={16}/>:<Moon size={16}/>}</button><label className="a1-demo-check"><input type="checkbox" checked={occupied} disabled={state.editing} onChange={e=>setOccupied(e.target.checked)}/>模拟另一窗口编辑</label><button onClick={()=>{setPref({...defaultPref});setNotice('已恢复当前窗口类型的默认布局')}}>重置布局</button></div>
  <div className="a1-demo-note"><Info size={13}/> 示例资料仅保存在当前浏览器。阅读、Markdown 编辑可操作；跨窗口占用为交互演示，不连接你的笔记库。</div>
  <div className="a1-stage">
   {surface==='embedded'&&<aside className="a1-host"><strong>deepseek <small>HARNESS</small></strong><button onClick={()=>setNotice('实际独立窗口打开后，DSH 可以继续停留在会话。此处为布局示意。')}>＋ 新会话</button><div>◇ 插件</div><div>◷ 自动化任务</div><div className="active"><BookOpen size={17}/> 肥鱼笔记</div><p>工作区</p><div>▱ 默认工作区</div><div className="a1-session">讨论下一步的工作安排</div><div className="a1-session">整理本周的阅读记录</div><footer>● 隔离体验 · 布局示意</footer></aside>}
   <main ref={area} className="paper-app a1-app" data-full={full}>
    <header className="paper-top"><strong><BookOpen size={20}/>肥鱼笔记</strong><nav><button aria-pressed={!managed} onClick={()=>setManaged(false)}>笔记库</button><button aria-pressed={managed} onClick={()=>setManaged(true)}>笔记本</button></nav><div className="paper-width">{[false,true].map(v=><button key={String(v)} aria-pressed={v===full} onClick={()=>setFull(v)}>{v?'全宽':'标准宽度'}</button>)}</div><span className="a1-saved"><CheckCircle2 size={15}/> {state.error?'示例保存失败':state.dirty||state.saving?'保存示例中':'示例已保存'}</span><button aria-label={surface==='embedded'?'独立窗口打开':'返回 DSH 布局'} title={surface==='embedded'?'独立窗口打开（样稿切换）':'返回 DSH 布局'} onClick={()=>void switchSurface(surface==='embedded'?'window':'embedded')}><ExternalLink size={17}/></button></header>
    {managed?<section className="a1-manage"><h1>笔记本</h1><p>沿用现有笔记本管理。这里展示导航关系，管理操作不在本次样稿范围内。</p>{books.map(b=><button key={b.notebookId} onClick={()=>void selectBook(b.notebookId)}><Notebook size={20}/><strong>{b.current.title}</strong><span>{b.isDefault?'默认笔记本':`${notes.filter(n=>n.effectiveNotebookId===b.notebookId&&n.current.status==='active').length} 篇笔记`}</span><span>打开 →</span></button>)}</section>:
    <div className="a1-columns" style={{gridTemplateColumns:expanded?`${bookWidth}px 0px ${listWidth}px 0px minmax(0,1fr)`:`${listWidth}px 0px minmax(0,1fr)`}}>
     {expanded&&<><aside className="a1-books"><div className="a1-books-head"><span>笔记本</span><button title="收起笔记本栏" aria-label="收起笔记本栏" onClick={()=>setPref(p=>({...p,open:false}))}><PanelLeftClose size={17}/></button></div><button className={!selectedBook&&!state.filter.status?'selected':''} onClick={()=>void selectBook()}><BookOpen size={16}/>全部笔记<span>{notes.filter(n=>n.current.status==='active').length}</span></button><p>我的笔记本</p>{books.map(b=><button className={state.filter.notebookId===b.notebookId?'selected':''} key={b.notebookId} onClick={()=>void selectBook(b.notebookId)}><Notebook size={16}/><span className="a1-book-name">{b.current.title}</span>{b.isDefault&&<small>默认</small>}<span>{notes.filter(n=>n.effectiveNotebookId===b.notebookId&&n.current.status==='active').length}</span></button>)}<footer><button onClick={()=>setManaged(true)}><Settings size={16}/>管理笔记本</button><button onClick={()=>void controller.selectFilter({status:'trashed'})}><Trash2 size={16}/>回收站</button></footer></aside>{divider('book',bookWidth)}</>}
     <aside className="paper-list a1-list"><div className="a1-list-heading">{!expanded&&wide&&<button title="展开笔记本栏" aria-label="展开笔记本栏" onClick={()=>setPref(p=>({...p,open:true}))}><PanelLeftOpen size={17}/></button>}{expanded?<h2>{state.filter.status==='trashed'?'回收站':selectedBook?.current.title||'全部笔记'}</h2>:<label className="paper-picker"><select aria-label="选择笔记本" value={state.filter.notebookId||'all'} onChange={e=>void selectBook(e.target.value==='all'?undefined:e.target.value)}><option value="all">全部笔记</option>{books.map(b=><option key={b.notebookId} value={b.notebookId}>{b.current.title}{b.isDefault?' · 默认':''}</option>)}</select><ChevronDown size={14}/></label>}<button title="新建笔记" aria-label="新建笔记" onClick={()=>{setOccupied(false);void controller.create()}}><SquarePen size={17}/></button></div><div className="paper-search"><Search size={15}/><input type="search" aria-label="搜索笔记" placeholder="搜索标题、摘要或正文" value={query} onChange={e=>{setQuery(e.target.value);void controller.selectFilter({...state.filter,query:e.target.value})}}/></div><div className="a1-order"><ArrowDownUp size={13}/>最近修改在前<span>{state.items.length} 篇</span></div>{state.filter.tag&&<button onClick={clearTag}>#{state.filter.tag} <X size={13}/></button>}<div className="a1-list-scroll">{state.items.map(item=><button key={item.noteId} className="paper-row" aria-current={item.noteId===state.noteId?'true':undefined} onClick={()=>{setOccupied(false);void controller.open(item.noteId)}}><strong>{item.title}</strong><span>{item.summary}</span><small>{books.find(b=>b.notebookId===item.notebookId)?.current.title} · 11-09</small></button>)}{!state.items.length&&<p className="paper-hint">这里还没有笔记</p>}</div><footer><span>私人笔记 · 示例资料</span><button aria-label="查看样稿说明" title="查看样稿说明" onClick={()=>setNotice('所有修改只保留在这个浏览器。不会写入 DSH 或同步到 GitHub。')}><Info size={14}/></button></footer></aside>
     {divider('list',listWidth)}
     <section className="paper-detail" onClickCapture={e=>{const button=(e.target as HTMLElement).closest('button');if(!button)return;const label=button.getAttribute('aria-label')||button.textContent||'';if(label==='导出'||label.includes('彻底删除')){e.preventDefault();e.stopPropagation();setNotice('导出与回收站沿用现有功能，本次样稿只用于确认布局。')}if(occupied&&label==='编辑'){e.preventDefault();e.stopPropagation();setNotice('请先点击「在这里继续编辑」，查看交接后的布局。')}}}>
      {occupied&&<div className="a1-ownership"><span><MessageSquare size={15}/>正在{surface==='embedded'?'独立窗口':'DSH 主窗口'}中编辑</span><button onClick={()=>{setOccupied(false);controller.beginEdit();setNotice('交接交互演示：实际保存确认与编辑保护将在 A3 实现。')}}>在这里继续编辑</button></div>}
      {state.draft?<NoteEditor key={state.noteId} controller={controller} state={state} t={translate} outlineSession={outline} onTagClick={tag=>void controller.selectFilter({...state.filter,tag})} onNoteLink={()=>{}} onReturn={undefined} onPurge={()=>{}}/>:<div className="a1-empty"><BookOpen size={32}/><p>选择一篇笔记，继续阅读</p></div>}
     </section>
    </div>}
   </main>
  </div>{notice&&<div className="a1-toast" role="status">{notice}<button aria-label="关闭提示" onClick={()=>setNotice('')}><X size={14}/></button></div>}
 </div>
}
createRoot(document.getElementById('root')!).render(<App/> )
