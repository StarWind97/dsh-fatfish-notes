// One restrained dark-only refinement. Keep all preceding review files intact.
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.USERPROFILE+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const dir=path.dirname(fileURLToPath(import.meta.url));
const palette={body:'#BA3FB6',arc:'#5DAC53',ink:'#FFF7EE',background:'#2B1927'};
// Increase HSL lightness by 0.06, retaining hue and saturation (rounded to sRGB).
const original={body:'#A337A0',arc:'#529849'},sources={};
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();
 for(const stem of ['mark-original','mark-d1','mark-d2','mark-c0','stack','horizontal','cover']){
  const name=`p3-${stem}-stable-dark.svg`,source=await readFile(path.join(dir,'assets',name),'utf8');
  sources[name]=crypto.createHash('sha256').update(source).digest('hex');
  const art=source.replaceAll(original.body,palette.body).replaceAll(original.arc,palette.arc);
  const target=`p3-${stem}-lift-dark`;
  await writeFile(path.join(dir,'assets',target+'.svg'),art);
  const dimensions={stack:[512,512],horizontal:[1400,400],cover:[1440,900]}[stem];
  if(dimensions){
   const data=await page.evaluate(async({art,dimensions:[w,h]})=>{
    const im=new Image();im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(art);await im.decode();
    const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);
    return c.toDataURL().split(',')[1];
   },{art,dimensions});
   await writeFile(path.join(dir,'assets',target+'.png'),Buffer.from(data,'base64'));
  }
 }
 await writeFile(path.join(dir,'lift-catalog.json'),JSON.stringify({id:'p3-lift',palette,original,sources,scope:'One dark-only review. Light, typography, geometry, tile and product unchanged.'},null,2)+'\n');
 console.log(JSON.stringify({svg:7,png:3,palette}));
}finally{await browser.close()}
