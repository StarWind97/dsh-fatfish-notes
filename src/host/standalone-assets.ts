import {readFile} from 'node:fs/promises'

const html='<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>肥鱼笔记 · Fatfish Notes</title><link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48 64x64 128x128 256x256"><link rel="icon" href="/favicon-16.png" type="image/png" sizes="16x16"><link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32"><link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any"><style>html,body,#app{height:100%;margin:0}body{background:var(--dsw-alias-bg-layer-1,Canvas);color:var(--dsw-alias-label-primary,CanvasText);font-family:system-ui,sans-serif}*{box-sizing:border-box}</style><div id="app">正在连接笔记库…</div><script src="/standalone.js"></script></html>'
const files=new Map([
  ['/standalone.js',['../standalone.js','application/javascript; charset=utf-8']],
  ['/favicon.svg',['../../assets/brand/favicon.svg','image/svg+xml; charset=utf-8']],
  ['/favicon.ico',['../../assets/brand/favicon.ico','image/vnd.microsoft.icon']],
  ['/favicon-16.png',['../../assets/brand/favicon-16.png','image/png']],
  ['/favicon-32.png',['../../assets/brand/favicon-32.png','image/png']],
] as const)

/** Only fixed package resources; callers apply the same request fence as the API. */
export async function standaloneAsset(path:string){
  if(path==='/')return {content:Buffer.from(html),type:'text/html; charset=utf-8'}
  const file=files.get(path as Parameters<typeof files.get>[0])
  if(!file)return undefined
  return {content:await readFile(new URL(file[0],import.meta.url)),type:file[1]}
}
