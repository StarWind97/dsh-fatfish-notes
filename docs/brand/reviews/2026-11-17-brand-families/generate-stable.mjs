// Review-only extension. Preserve all prior candidates and production assets.
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.USERPROFILE+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const dir=path.dirname(fileURLToPath(import.meta.url));
const {families}=JSON.parse(await readFile(path.join(dir,'catalog.json'),'utf8'));
const f=families.find(f=>f.id==='p3');
const config={body:f.main,arc:f.accent,lightInk:f.ink,darkInk:f.tile.body,lightBackground:f.paper,darkBackground:f.night,tile:f.tile};
const browser=await chromium.launch({channel:'chrome',headless:true});
const sources={};
try{
 const page=await browser.newPage();
 for(const stem of ['mark-original','mark-d1','mark-d2','mark-c0','stack','horizontal','cover']){
  const source=`p3-${stem}-light.svg`,original=await readFile(path.join(dir,'assets',source),'utf8');
  sources[source]=crypto.createHash('sha256').update(original).digest('hex');
  // Keep the original body and arc exactly. Only lettering and cover paper change.
  const art=original.replaceAll(f.ink,config.darkInk).replaceAll(f.paper,config.darkBackground);
  const name=`p3-${stem}-stable-dark`;
  await writeFile(path.join(dir,'assets',name+'.svg'),art);
  const dimensions={stack:[512,512],horizontal:[1400,400],cover:[1440,900]}[stem];
  if(dimensions){
   const data=await page.evaluate(async({art,dimensions:[w,h]})=>{
    const im=new Image();im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(art);await im.decode();
    const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);
    return c.toDataURL().split(',')[1];
   },{art,dimensions});
   await writeFile(path.join(dir,'assets',name+'.png'),Buffer.from(data,'base64'));
  }
 }
 await writeFile(path.join(dir,'stable-catalog.json'),JSON.stringify({id:'p3-stable',config,sources,geometry:'Reuse existing D2 / D1 / C0 / original. Taskbar remains fixed D1.',scope:'Review only; not an adopted brand or product setting.'},null,2)+'\n');
 console.log(JSON.stringify({svg:7,png:3,config}));
}finally{await browser.close()}
