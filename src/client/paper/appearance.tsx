import * as React from 'react'
import {useEffect,useState,useSyncExternalStore} from 'react'
import {appearanceColors,appearanceKey,appearanceValue,defaultAppearance,layouts,palettes,parseAppearance,type Appearance,type AppearanceColors} from './appearance-state.js'
import {appearanceCss} from './appearance-style.js'
import {codeFontCss} from './appearance-assets.js'
let current:Appearance|undefined
const listeners=new Set<()=>void>()
function snapshot(){if(!current){try{current=parseAppearance(localStorage.getItem(appearanceKey))}catch{current={...defaultAppearance}}}return current}
function notify(){for(const fn of listeners)fn()}
function changed(event:StorageEvent){if(event.key===appearanceKey||event.key===null){current=undefined;notify()}}
function subscribe(fn:()=>void){if(!listeners.size)window.addEventListener('storage',changed);listeners.add(fn);return()=>{listeners.delete(fn);if(!listeners.size)window.removeEventListener('storage',changed)}}
export function setAppearance(patch:Partial<Appearance>){current=appearanceValue({...snapshot(),...patch});try{localStorage.setItem(appearanceKey,JSON.stringify(current))}catch{/* Session preferences remain usable. */}notify()}
export function useAppearance(){return useSyncExternalStore(subscribe,snapshot,snapshot)}
function hostAppearance(){
  if(typeof document==='undefined')return {dark:false,colors:{}}
  const body=getComputedStyle(document.body),html=getComputedStyle(document.documentElement)
  const dark=document.body.dataset.dsDarkTheme==='true'||(document.body.hasAttribute('data-ds-dark-theme')&&document.body.dataset.dsDarkTheme!=='false')||body.colorScheme==='dark'||html.colorScheme==='dark'
  const fields:Record<keyof AppearanceColors,string>={paper:'--dsw-alias-bg-base',shelf:'--dsw-specific-sidebar-fill',ink:'--dsw-alias-label-primary',muted:'--dsw-alias-label-secondary',rule:'--dsw-alias-border-l2',accent:'--dsw-alias-link',selected:'--dsw-alias-interactive-bg-hover',overlay:'--dsw-alias-bg-layer-2',input:'--dsw-alias-bg-layer-1'}
  const colors:Partial<AppearanceColors>={};for(const [key,variable] of Object.entries(fields)){const color=body.getPropertyValue(variable).trim();if(color)(colors as Record<string,string>)[key]=color}
  return {dark,colors}
}
export function useAppearanceProps(){
  const value=useAppearance(),[host,setHost]=useState(hostAppearance)
  useEffect(()=>{const refresh=()=>setHost(hostAppearance());const observer=new MutationObserver(refresh);for(const node of [document.body,document.documentElement])observer.observe(node,{attributes:true,attributeFilter:['class','style','data-ds-dark-theme']});refresh();return()=>observer.disconnect()},[])
  const dark=value.mode==='host'?host.dark:value.mode==='dark',colors=appearanceColors(value,dark,dark===host.dark?host.colors:undefined)
  const sans='"Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif',serif='"Noto Serif CJK SC", "Songti SC", SimSun, Georgia, serif'
  const style={'--ink':colors.ink,'--muted':colors.muted,'--base':colors.paper,'--paper':colors.paper,'--shelf':colors.shelf,'--rule':colors.rule,'--accent':colors.accent,'--selected':colors.selected,'--overlay':colors.overlay,'--input':colors.input,'--reading-font':value.reading==='book'?serif:sans,'--heading-font':value.reading==='modern'?sans:serif,'--reading-size':value.size+'px','--reading-leading':value.leading,'--code-size':value.codeSize+'px','--code-weight':value.codeWeight,'--serif':value.reading==='modern'?sans:serif,'--dsw-alias-label-primary':colors.ink,'--dsw-alias-label-secondary':colors.muted,'--dsw-alias-bg-layer-1':colors.paper,'--dsw-alias-bg-layer-2':colors.shelf,'--dsw-alias-border-l2':colors.rule,colorScheme:dark?'dark':'light'} as React.CSSProperties
  return {style,'data-layout':value.layout,'data-palette':value.palette,'data-theme':dark?'dark':'light','data-density':value.density,'data-code-wrap':value.codeWrap,'data-code-lines':value.codeLines}
}
export function AppearanceStyle(){return <style>{codeFontCss+appearanceCss}</style>}
export function AppearanceSettings(){
  const value=useAppearance()
  function select<K extends keyof Appearance>(key:K,label:string,options:Record<string,string>){return <label>{label}<select aria-label={label} value={String(value[key])} onChange={e=>setAppearance({[key]:typeof value[key]==='number'?Number(e.target.value):e.target.value})}>{Object.entries(options).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>}
  function check(key:'tabs'|'pinned'|'codeWrap'|'codeLines',label:string){return <label className="appearance-check"><input type="checkbox" checked={value[key]} onChange={e=>setAppearance({[key]:e.target.checked})}/>{label}</label>}
  return <section className="appearance-settings" aria-label="外观与阅读"><header><div><h2>外观与阅读</h2><p>界面布局、配色与阅读可以分别调整，设置保存在本机。</p></div><button type="button" onClick={()=>setAppearance(defaultAppearance)}>恢复默认</button></header>
    <fieldset><legend>界面主题</legend><div className="appearance-layouts">{Object.entries(layouts).map(([key,label],i)=><button key={key} aria-pressed={value.layout===key} onClick={()=>setAppearance({layout:key as Appearance['layout']})}><span className={'layout-glyph layout-'+key} aria-hidden="true"><i/><i/><i/></span><span><small>{String(i+1).padStart(2,'0')}</small> {label}</span></button>)}</div></fieldset>
    <fieldset><legend>配色与层次</legend><div className="appearance-fields">{select('palette','配色方案',palettes)}{select('mode','明暗模式',{host:'跟随 DSH',light:'浅色',dark:'深色'})}{select('contrast','对比度',{standard:'标准',soft:'柔和',strong:'鲜明'})}{select('density','面板密度',{compact:'紧凑',balanced:'均衡',spacious:'舒展'})}</div></fieldset>
    <fieldset><legend>正文与代码</legend><div className="appearance-fields">{select('reading','阅读排版',{modern:'现代清晰',book:'书页',mixed:'标题与正文混排'})}{select('size','正文字号',{16:'16 px',17:'17 px',18:'18 px',20:'20 px'})}{select('leading','正文行高',{'1.65':'紧凑 · 1.65','1.8':'舒适 · 1.8','2':'宽松 · 2'})}{select('codeWeight','代码字重',{300:'Light',400:'Regular',500:'Medium'})}{select('codeSize','代码字号',{12:'12 px',14:'14 px',16:'16 px'})}</div><div className="appearance-checks">{check('codeWrap','代码自动折行')}{check('codeLines','显示代码行号')}</div></fieldset>
    <fieldset><legend>工作区</legend><div className="appearance-fields">{select('materials','资料区位置',{bottom:'底部',right:'右侧'})}{select('rightStyle','右侧资料与目录',{tabs:'切换显示',stack:'上下分区'})}{select('materialStyle','资料排列',{compact:'紧凑行列',cards:'轻量卡片'})}</div><div className="appearance-checks">{check('pinned','固定资料区')}{check('tabs','显示本次打开的笔记标签')}</div></fieldset>
  </section>
}
