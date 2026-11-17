// Review-only assets. Never writes to production assets or changes D1 geometry.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.USERPROFILE+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../../../..');
await mkdir(path.join(dir,'assets'),{recursive:true});
const source=await readFile(path.join(root,'assets/brand/favicon.svg'),'utf8');
await writeFile(path.join(dir,'assets/source-d1.svg'),source);
const palettes=[
 {id:'current',name:'现有配色',bg:'#3F5A4E',arc:'#B7C9B3',body:'#F7F4EB',desc:'灰绿与米白，保留当前品牌气质。'},
 {id:'clear',name:'清晰绿',bg:'#2E7357',arc:'#BDD7B5',body:'#FBF8F0',desc:'绿色更纯净，亮度适度提高，仍然克制。'},
 {id:'vivid',name:'鲜明绿',bg:'#168354',arc:'#C4E5B5',body:'#FFFDF5',desc:'饱和度再提高一档，验证任务栏中的存在感。'},
];
const sizes=[16,20,24,30,32,36,40,48,60,64,72,96,128,256];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();
 for(const p of palettes){
  const svg=source.replaceAll('#3F5A4E',p.bg).replaceAll('#B7C9B3',p.arc).replaceAll('#F7F4EB',p.body);
  await writeFile(path.join(dir,`assets/${p.id}.svg`),svg);
  const frames=[];
  for(const size of sizes){
   const data=await page.evaluate(async({svg,size})=>{
    const sized=svg.replace(/width="880" height="880"/,`width="${size}" height="${size}"`);
    const img=new Image();img.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(sized)));await img.decode();
    const c=document.createElement('canvas');c.width=c.height=size;c.getContext('2d').drawImage(img,0,0,size,size);return c.toDataURL().split(',')[1];
   },{svg,size});
   const bytes=Buffer.from(data,'base64');frames.push({size,bytes});await writeFile(path.join(dir,`assets/${p.id}-${size}.png`),bytes);
  }
  for(const [name,selected] of [['full',frames],['legacy',frames.filter(f=>[16,32,48,64,128,256].includes(f.size))]]){
   const header=Buffer.alloc(6+selected.length*16);header.writeUInt16LE(1,2);header.writeUInt16LE(selected.length,4);let offset=header.length;
   selected.forEach(({size,bytes},i)=>{const at=6+i*16;header[at]=header[at+1]=size===256?0:size;header.writeUInt16LE(1,at+4);header.writeUInt16LE(32,at+6);header.writeUInt32LE(bytes.length,at+8);header.writeUInt32LE(offset,at+12);offset+=bytes.length});
   await writeFile(path.join(dir,`assets/${p.id}-${name}.ico`),Buffer.concat([header,...selected.map(f=>f.bytes)]));
  }
 }
 const manifest={sourceSHA256:crypto.createHash('sha256').update(source).digest('hex'),sizes,palettes};
 await writeFile(path.join(dir,'palettes.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('Generated three unchanged D1 geometries, 42 PNGs, and six review ICOs.');
}finally{await browser.close()}
