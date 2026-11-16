import * as React from 'react'
import {createContext,useContext,useEffect,useState,useSyncExternalStore} from 'react'
import {appearanceColors,defaultAppearance,cjkFonts,latinFonts,layouts,palettes,type Appearance,type AppearanceColors} from './appearance-state.js'
import {appearanceCss} from './appearance-style.js'
import {codeFontCss} from './appearance-assets.js'
import {appearancePreferences} from '../appearance-sync.js'
export const setAppearance=(patch:Partial<Appearance>)=>appearancePreferences.set(patch)
export function useAppearance(){return useSyncExternalStore(appearancePreferences.subscribe,appearancePreferences.getSnapshot,appearancePreferences.getSnapshot)}
function hostAppearance(){
  if(typeof document==='undefined')return {dark:false,colors:{},font:'system-ui, sans-serif'}
  const body=getComputedStyle(document.body),html=getComputedStyle(document.documentElement)
  const dark=document.body.dataset.dsDarkTheme==='true'||(document.body.hasAttribute('data-ds-dark-theme')&&document.body.dataset.dsDarkTheme!=='false')||body.colorScheme==='dark'||html.colorScheme==='dark'
  const fields:Record<keyof AppearanceColors,string>={paper:'--dsw-alias-bg-base',shelf:'--dsw-specific-sidebar-fill',ink:'--dsw-alias-label-primary',muted:'--dsw-alias-label-secondary',rule:'--dsw-alias-border-l2',accent:'--dsw-alias-link',selected:'--dsw-alias-interactive-bg-hover',overlay:'--dsw-alias-bg-layer-2',input:'--dsw-alias-bg-layer-1'}
  const colors:Partial<AppearanceColors>={};for(const [key,variable] of Object.entries(fields)){const color=body.getPropertyValue(variable).trim();if(color)(colors as Record<string,string>)[key]=color}
  return {dark,colors,font:body.fontFamily}
}
type ThemeMode=Appearance['mode']
let hostSnapshot:ReturnType<typeof hostAppearance>|undefined,hostRevision=0
const hostListeners=new Set<()=>void>()
let hostObserver:MutationObserver|undefined
function refreshHost(){const next=hostAppearance();if(hostSnapshot&&next.dark!==hostSnapshot.dark)hostRevision++;if(JSON.stringify(next)!==JSON.stringify(hostSnapshot)){hostSnapshot=next;for(const fn of hostListeners)fn()}}
function hostSnapshotValue(){if(!hostSnapshot)hostSnapshot=hostAppearance();return hostSnapshot}
function subscribeHost(fn:()=>void){
  if(!hostListeners.size){hostObserver=new MutationObserver(refreshHost);for(const node of [document.body,document.documentElement])hostObserver.observe(node,{attributes:true,attributeFilter:['class','style','data-ds-dark-theme']})}
  hostListeners.add(fn);refreshHost()
  return()=>{hostListeners.delete(fn);if(!hostListeners.size){hostObserver?.disconnect();hostObserver=undefined;hostSnapshot=undefined}}
}
function useHostAppearance(){return useSyncExternalStore(subscribeHost,hostSnapshotValue,hostSnapshotValue)}
const ThemeContext=createContext<{mode:ThemeMode;locked:boolean;setMode:(mode:ThemeMode)=>void}>({mode:'host',locked:true,setMode:()=>{}})
/** Portals inherit their originating view. Temporary modes never enter localStorage. */
export function AppearanceScope({children,followHost=false}:{children:React.ReactNode;followHost?:boolean}){
  useHostAppearance()
  const [choice,setChoice]=useState<{mode:ThemeMode;revision:number}|null>(null)
  const mode=followHost||choice?.revision!==hostRevision?'host':choice.mode
  return <ThemeContext.Provider value={{mode,locked:followHost,setMode:mode=>{if(!followHost)setChoice({mode,revision:hostRevision})}}}>{children}</ThemeContext.Provider>
}
export function useAppearanceTheme(){return useContext(ThemeContext)}
export function useAppearanceProps(){
  const value=useAppearance(),host=useHostAppearance(),{mode}=useAppearanceTheme()
  const dark=mode==='host'?host.dark:mode==='dark',colors=appearanceColors(value,dark,dark===host.dark?host.colors:undefined)
  const sans='"Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif',serif='"Noto Serif CJK SC", "Songti SC", SimSun, Georgia, serif'
  const readingFont=readingFonts(value,host.font),headingFont=value.reading==='modern'?readingFont:serif
  const style={'--ink':colors.ink,'--muted':colors.muted,'--base':colors.paper,'--paper':colors.paper,'--shelf':colors.shelf,'--rule':colors.rule,'--accent':colors.accent,'--selected':colors.selected,'--overlay':colors.overlay,'--input':colors.input,'--reading-font':readingFont,'--heading-font':headingFont,'--reading-size':value.size+'px','--reading-leading':value.leading,'--code-size':value.codeSize+'px','--code-weight':value.codeWeight,'--serif':value.reading==='modern'?sans:serif,'--dsw-alias-label-primary':colors.ink,'--dsw-alias-label-secondary':colors.muted,'--dsw-alias-bg-layer-1':colors.paper,'--dsw-alias-bg-layer-2':colors.shelf,'--dsw-alias-border-l2':colors.rule,colorScheme:dark?'dark':'light'} as React.CSSProperties
  return {style,'data-layout':value.layout,'data-palette':value.palette,'data-theme':dark?'dark':'light','data-density':value.density,'data-code-wrap':value.codeWrap,'data-code-lines':value.codeLines}
}
const cjkFamily={host:'',yahei:'Microsoft YaHei',deng:'DengXian',song:'SimSun',kai:'KaiTi'}
const latinFamily={host:'',segoe:'Segoe UI',arial:'Arial',georgia:'Georgia',times:'Times New Roman'}
function readingFonts(value:Appearance,host:string){
  if(value.fontCjk==='host'&&value.fontLatin==='host')return host||'system-ui, sans-serif'
  const latin=latinFamily[value.fontLatin],cjk=cjkFamily[value.fontCjk]
  return [...(latin?[`"${latin}"`]:['"Segoe UI"','Arial']),...(cjk?[`"${cjk}"`]:[]),host||'system-ui','sans-serif'].join(',')
}
function FontPreview(){
  const value=useAppearance(),[missing,setMissing]=useState<string[]>([])
  useEffect(()=>{const context=document.createElement('canvas').getContext('2d');if(!context)return
    const sample='阅读笔记 AaWim 0123',width=(font:string)=>{context.font=`32px ${font}`;return context.measureText(sample).width}
    setMissing([cjkFamily[value.fontCjk],latinFamily[value.fontLatin]].filter(font=>font&&['monospace','serif'].every(fallback=>width(`"${font}",${fallback}`)===width(fallback))))
  },[value.fontCjk,value.fontLatin])
  return <><div className="appearance-font-preview" style={{fontFamily:readingFonts(value,getComputedStyle(document.body).fontFamily),fontSize:value.size,lineHeight:value.leading}}>把一次有价值的讨论留下，下一次从这里继续。<br/>Keep useful ideas close. Read, revise, and return.</div>{!!missing.length&&<p>未检测到 {missing.join('、')}，当前使用系统回退字体。可先安装字体，再重新打开页面。</p>}<p>字体设置只影响本机阅读。代码字体已随插件提供，无需安装；中文注释由系统字体补足。图片沿用阅读排版，PDF 使用随包字体以保证中文可读。</p></>
}
export function AppearanceStyle(){return <style>{codeFontCss+appearanceCss}</style>}
export function AppearanceSettings(){
  const value=useAppearance(),theme=useAppearanceTheme(),sync=useSyncExternalStore(appearancePreferences.subscribeStatus,appearancePreferences.getStatus,appearancePreferences.getStatus)
  function select<K extends keyof Appearance>(key:K,label:string,options:Record<string,string>){return <label>{label}<select aria-label={label} value={String(value[key])} onChange={e=>setAppearance({[key]:typeof value[key]==='number'?Number(e.target.value):e.target.value})}>{Object.entries(options).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>}
  function check(key:'tabs'|'pinned'|'codeWrap'|'codeLines',label:string){return <label className="appearance-check"><input type="checkbox" checked={value[key]} onChange={e=>setAppearance({[key]:e.target.checked})}/>{label}</label>}
  return <section className="appearance-settings" aria-label="外观与阅读"><header><div><h2>外观与阅读</h2><p>界面布局、配色与阅读设置在同一 DSH 的笔记窗口间共享。</p></div><button type="button" onClick={()=>{setAppearance(defaultAppearance);theme.setMode('host')}}>恢复默认</button></header>
    <p role={sync==='error'?'status':undefined} className="appearance-sync-status">{sync==='error'?'外观设置暂未同步，将自动重试。':sync==='saving'?'正在同步外观设置…':sync==='connecting'?'正在连接外观设置…':sync==='waiting'?'请先打开 DSH 中的肥鱼笔记，完成原设置合并。':'外观设置已同步'}{sync==='error'&&<button type="button" onClick={appearancePreferences.refresh}>重试</button>}</p>
    <fieldset><legend>界面主题</legend><div className="appearance-layouts">{Object.entries(layouts).map(([key,label],i)=><button key={key} aria-pressed={value.layout===key} onClick={()=>setAppearance({layout:key as Appearance['layout']})}><span className={'layout-glyph layout-'+key} aria-hidden="true"><i/><i/><i/></span><span><small>{String(i+1).padStart(2,'0')}</small> {label}</span></button>)}</div></fieldset>
    <fieldset><legend>配色与层次</legend><div className="appearance-fields">{select('palette','配色方案',palettes)}{!theme.locked&&<label>明暗模式<select aria-label="明暗模式" value={theme.mode} onChange={e=>theme.setMode(e.target.value as ThemeMode)}><option value="host">跟随 DSH</option><option value="light">浅色（本次）</option><option value="dark">深色（本次）</option></select></label>}{select('contrast','对比度',{standard:'标准',soft:'柔和',strong:'鲜明'})}{select('density','面板密度',{compact:'紧凑',balanced:'均衡',spacious:'舒展'})}</div><p>{theme.locked?'此区域的明暗始终跟随 DSH。':'明暗切换仅影响本次视图；DSH 切换明暗或重新打开后恢复跟随。'}</p></fieldset>
    <fieldset><legend>正文与代码</legend><div className="appearance-fields">{select('reading','阅读排版',{modern:'现代清晰',book:'书页',mixed:'标题与正文混排'})}{select('fontCjk','中文字体',cjkFonts)}{select('fontLatin','西文字体',latinFonts)}{select('size','正文字号',{16:'16 px',17:'17 px',18:'18 px',20:'20 px'})}{select('leading','正文行高',{'1.65':'紧凑 · 1.65','1.8':'舒适 · 1.8','2':'宽松 · 2'})}{select('codeWeight','代码字重',{300:'Light',400:'Regular',500:'Medium'})}{select('codeSize','代码字号',{12:'12 px',14:'14 px',16:'16 px'})}</div><div className="appearance-checks">{check('codeWrap','代码自动折行')}{check('codeLines','显示代码行号')}</div><FontPreview/></fieldset>
    <fieldset><legend>工作区</legend><div className="appearance-fields">{select('materials','资料区位置',{bottom:'底部',right:'右侧'})}{select('rightStyle','右侧资料与目录',{tabs:'切换显示',stack:'上下分区'})}{select('materialStyle','资料排列',{compact:'紧凑行列',cards:'轻量卡片'})}</div><div className="appearance-checks">{check('pinned','固定资料区')}{check('tabs','显示本次打开的笔记标签')}</div></fieldset>
  </section>
}
