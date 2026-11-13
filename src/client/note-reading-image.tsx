import * as React from 'react'
import {createRoot} from 'react-dom/client'
import {flushSync} from 'react-dom'
import {toSvg} from 'html-to-image'
import type {ReadingSnapshot} from '../notes/export/reading.js'
import {ExportError} from '../notes/export/model.js'
import {checkPixels} from '../notes/export/layout.js'
import {ReadingTitle,ReadingMeta,ReadingSummary,ReadingBody} from './NoteReading.js'
import {SourceContent} from './NoteSource.js'
import {paperCss} from './paper/style.js'
import {transferCss} from './NoteAttachments.js'
import {translate} from './locale.js'

export interface ReadingAppearance {theme:Record<string,string>;containerWidth:number;allTags:boolean}
export interface ReadingImageOptions {width:number;pixelRatio:number;background:'current'|'light'|'dark'|'transparent';appearance?:ReadingAppearance|undefined}
const variables=['--dsw-alias-label-primary','--dsw-alias-label-secondary','--dsw-alias-bg-layer-1','--dsw-alias-bg-layer-2','--dsw-alias-border-l2']
export function readingAppearance(leaf:HTMLElement|null|undefined,allTags=false):ReadingAppearance {
  const app=leaf?.closest('.paper-app')??document.documentElement,style=getComputedStyle(app)
  return {theme:Object.fromEntries([...variables,'color-scheme'].map(key=>[key,style.getPropertyValue(key)])),containerWidth:app.getBoundingClientRect().width,allTags}
}
function ready<T>(promise:Promise<T>,signal:AbortSignal):Promise<T>{
  signal.throwIfAborted()
  return new Promise((resolve,reject)=>{const abort=()=>finish(()=>reject(signal.reason)),timer=setTimeout(()=>finish(()=>reject(new ExportError('export_image_decode'))),15000)
    const finish=(done:()=>void)=>{clearTimeout(timer);signal.removeEventListener('abort',abort);done()}
    signal.addEventListener('abort',abort,{once:true});promise.then(value=>finish(()=>resolve(value)),error=>finish(()=>reject(error)))})
}
/** html-to-image 1.11.13 rounds fonts down; restore the measured CSS sizes before rasterizing. */
export function restoreCaptureFonts(svgUrl:string):string {
  const xml=new DOMParser().parseFromString(decodeURIComponent(svgUrl.slice(svgUrl.indexOf(',')+1)),'image/svg+xml')
  if(xml.querySelector('parsererror'))throw new ExportError('export_failed')
  for(const node of xml.querySelectorAll<HTMLElement>('[data-export-font]')){node.style.fontSize=node.getAttribute('data-export-font')!;node.removeAttribute('data-export-font')}
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(xml))
}
export async function readingImage(value:ReadingSnapshot,options:ReadingImageOptions,signal:AbortSignal):Promise<{blob:Blob;filename:string}>{
  const {width,pixelRatio}=options
  if(!Number.isFinite(width)||width<160||width>2160||![1,2].includes(pixelRatio))throw new ExportError('export_dimensions')
  const holder=document.createElement('div');holder.className='paper-app';holder.setAttribute('aria-hidden','true');holder.inert=true
  Object.assign(holder.style,{position:'fixed',left:'-100000px',top:'0',height:'auto',display:'block',pointerEvents:'none',width:`${options.appearance?.containerWidth||width+48}px`})
  for(const [key,color] of Object.entries(options.appearance?.theme??{}))if(color)holder.style.setProperty(key,color)
  if(options.background!=='current'&&options.background!=='transparent'||!options.appearance){
    const dark=options.background==='dark',colors=dark?['#e7e9ec','#a1a7b1','#202329','#2a2e35','#424851']:['#20242b','#68717e','#ffffff','#f3f5f7','#dce1e6']
    variables.forEach((key,i)=>holder.style.setProperty(key,colors[i]!));holder.style.colorScheme=dark?'dark':'light'
  }
  document.body.append(holder);const root=createRoot(holder),canvas=document.createElement('canvas')
  try {
    const assetUrl=(id:string)=>{const url=value.assets[id];if(!url)throw new ExportError('export_image_missing');return url}
    flushSync(()=>root.render(<><style>{paperCss+transferCss}</style><div className="paper-detail" style={{width:width+48,display:'block',height:'auto',overflow:'visible'}}><div data-export-viewport style={{width:width+48,overflow:'hidden',position:'relative',background:options.background==='transparent'?'transparent':'var(--paper)'}}><div data-export-content style={{padding:24,width:width+48,display:'flow-root'}}><section className="paper-leaf" style={{width,maxWidth:'none',margin:0}}>
      <ReadingTitle title={value.note.current.title} t={translate}/><ReadingMeta content={value.note.current} savedAt={value.note.savedAt} t={translate} allTags={options.appearance?.allTags??false}/><ReadingSummary summary={value.note.current.summary} t={translate}/>
      <article className="paper-reading"><ReadingBody note={value.note} t={translate} staticView assetUrl={assetUrl}/></article>
      {value.source&&<div className="paper-source"><h2>{translate('notesSource')}</h2><SourceContent source={value.source} staticView note={value.note} t={translate} assetUrl={assetUrl}/></div>}
    </section></div></div></div></>))
    await ready(document.fonts.ready,signal)
    await ready(Promise.all([...holder.querySelectorAll('img')].map(img=>img.decode())),signal)
    signal.throwIfAborted()
    // A horizontally scrolled table must never silently lose columns in an export.
    if([...holder.querySelectorAll('table')].some(table=>table.scrollWidth>table.clientWidth+1))throw new ExportError('export_reading_width')
    const viewport=holder.querySelector<HTMLElement>('[data-export-viewport]')!,content=holder.querySelector<HTMLElement>('[data-export-content]')!
    const height=Math.ceil(content.getBoundingClientRect().height),outputWidth=Math.ceil(width+48)
    checkPixels(outputWidth,height,pixelRatio)
    for(const node of [viewport,...viewport.querySelectorAll<HTMLElement>('*')])node.setAttribute('data-export-font',getComputedStyle(node).fontSize)
    viewport.style.height=height+'px'
    const svg=await toSvg(viewport,{width:outputWidth,height,fontEmbedCSS:'',skipAutoScale:true,includeQueryParams:true,cacheBust:false,filter:node=>node.nodeName!=='STYLE'})
    signal.throwIfAborted();const image=new Image()
    const loaded=new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new ExportError('export_image_decode'))})
    image.decoding='async';image.src=restoreCaptureFonts(svg)
    await ready(loaded,signal);await ready(image.decode(),signal)
    // SVG foreignObject subresources finish painting on the next rendering frame.
    await ready(new Promise<void>(resolve=>requestAnimationFrame(()=>resolve())),signal)
    canvas.width=outputWidth*pixelRatio;canvas.height=height*pixelRatio
    const context=canvas.getContext('2d');if(!context)throw new ExportError('export_failed')
    context.drawImage(image,0,0,canvas.width,canvas.height)
    const blob=await ready(new Promise<Blob>((resolve,reject)=>canvas.toBlob(result=>result?resolve(result):reject(new ExportError('export_failed')),'image/png')),signal)
    canvas.width=0;canvas.height=0;image.src=''
    if(blob.size>128*1024*1024)throw new ExportError('export_output_limit')
    signal.throwIfAborted();return {blob,filename:`${value.filename}-长图.png`}
  } finally {root.unmount();holder.remove();canvas.width=0;canvas.height=0}
}
