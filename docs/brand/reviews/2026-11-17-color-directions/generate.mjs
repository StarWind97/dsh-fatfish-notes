// Review assets only. Pure fills; no production writes or dependencies.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.USERPROFILE+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const dir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(dir,'../../../..');
const source=await readFile(path.join(root,'assets/brand/favicon.svg'),'utf8');
const paths=[...source.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map(m=>m[1]);
if(paths.length!==2)throw Error('Expected D1 arc and body paths');
const palettes=[
 {id:'vivid',no:'00',group:'基准',name:'鲜明绿',bg:'#168354',arc:'#C4E5B5',body:'#FFFDF5',desc:'上一轮你更喜欢的配色，常驻对照。'},
 {id:'green1',no:'01',group:'绿色力度',name:'翠绿',bg:'#109B60',arc:'#C4E5B5',body:'#FFFDF5',desc:'保留鱼身与叠页，底色提高一档鲜明度。'},
 {id:'green2',no:'02',group:'绿色力度',name:'鲜翠',bg:'#00B76B',arc:'#C4E5B5',body:'#FFFDF5',desc:'更明亮、纯净的绿色，观察是否足够醒目。'},
 {id:'green3',no:'03',group:'绿色力度',name:'亮翡翠',bg:'#00D27A',arc:'#C4E5B5',body:'#FFFDF5',desc:'再亮一档，观察明快与内部对比的平衡。'},
 {id:'warm',no:'04',group:'冷暖色相',name:'青柠',bg:'#739D18',arc:'#C4E5B5',body:'#FFFDF5',desc:'偏黄的暖绿，鱼身和叠页沿用基准。'},
 {id:'teal',no:'05',group:'冷暖色相',name:'碧青',bg:'#009C91',arc:'#C4E5B5',body:'#FFFDF5',desc:'偏青的冷绿，比较冷暖带来的气质变化。'},
 {id:'blue',no:'06',group:'冷暖色相',name:'晴蓝',bg:'#2864DC',arc:'#C4E5B5',body:'#FFFDF5',desc:'冷色进一步走向蓝，保留相同浅色主体。'},
 {id:'mintpaper',no:'07',group:'彩色主体',name:'薄荷纸',bg:'#E7F5EA',arc:'#E9A02F',body:'#008F58',desc:'浅底、鲜绿鱼身与暖金叠页，交换颜色分工。'},
 {id:'night',no:'08',group:'彩色主体',name:'夜航青',bg:'#142C49',arc:'#F4C562',body:'#3CE0BD',desc:'深蓝衬托明亮青绿鱼身，金色叠页独立显现。'},
 {id:'warmpaper',no:'09',group:'彩色主体',name:'暖纸蓝橙',bg:'#FFF0D9',arc:'#EF7641',body:'#2475C4',desc:'奶油底配蓝鱼和橙色叠页，温暖而清晰。'},
 {id:'orange',no:'10',group:'双色搭配',name:'橘子汽水',bg:'#F06B32',arc:'#FFCF69',body:'#FFFBED',desc:'橙色底、暖白鱼与黄色叠页，探索温暖方向。'},
 {id:'cobalt',no:'11',group:'双色搭配',name:'钴蓝柠檬',bg:'#234DCB',arc:'#F7D64C',body:'#F8FBFF',desc:'蓝白主体与明黄叠页，拉开两层的色相差异。'},
 {id:'berry',no:'12',group:'双色搭配',name:'紫莓薄荷',bg:'#6940BE',arc:'#75E2C4',body:'#FFF6F5',desc:'紫底、微暖白鱼与薄荷叠页，探索更鲜明的双色。'},
];
const geometries=[
 {id:'base',name:'现有 D1',desc:'已确认的饱满尾部和独立上弧。'},
 {id:'full',name:'主体更突出',desc:'整体放大 12%，保持鱼身与叠页比例，减少外围留白。'},
 {id:'leaf',name:'叠页更明确',desc:'上弧纵向增加 25%，略向上展开；鱼身和尾部保持。'},
];
function artwork(p,geometry='base',format='tile') {
 const outer=geometry==='full'?'translate(-52.8 -52.8) scale(1.12)':'';
 const arc=geometry==='leaf'?'matrix(1 0 0 1.25 0 -38)':'';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 880" width="880" height="880"><title>肥鱼笔记 · ${p.name} · ${geometry}</title>${format==='tile'?`<rect width="880" height="880" rx="192" fill="${p.bg}"/>`:''}<g transform="${outer}"><g transform="translate(-179 106)"><path transform="${arc}" fill="${p.arc}" d="${paths[0]}"/><path fill="${p.body}" fill-rule="evenodd" d="${paths[1]}"/></g></g></svg>`;
}
await mkdir(path.join(dir,'assets'),{recursive:true});
await writeFile(path.join(dir,'assets/source-d1.svg'),source);
const sizes=[16,20,24,32,40,48,64,96,128,256];
const catalog={sourceSHA256:crypto.createHash('sha256').update(source).digest('hex'),sizes,palettes,geometries,paths};
await writeFile(path.join(dir,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
const browser=await chromium.launch({channel:'chrome',headless:true});
let pngCount=0;
try {
 const page=await browser.newPage();
 for(const p of palettes)for(const g of geometries){
  if(g.id!=='base'&&p.id!=='vivid')continue;
  for(const format of ['tile','mark']){
   const svg=artwork(p,g.id,format),id=`${p.id}-${g.id}-${format}`;
   await writeFile(path.join(dir,`assets/${id}.svg`),svg);
   const frames=[];
   for(const size of sizes){
    const base64=await page.evaluate(async({svg,size})=>{const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await img.decode();const c=document.createElement('canvas');c.width=c.height=size;c.getContext('2d').drawImage(img,0,0,size,size);return c.toDataURL().split(',')[1]},{svg,size});
    const bytes=Buffer.from(base64,'base64');await writeFile(path.join(dir,`assets/${id}-${size}.png`),bytes);frames.push({size,bytes});pngCount++;
   }
   if(format==='tile'){
    const h=Buffer.alloc(6+16*frames.length);h.writeUInt16LE(1,2);h.writeUInt16LE(frames.length,4);let at=h.length;
    frames.forEach(({size,bytes},i)=>{const b=6+i*16;h[b]=h[b+1]=size===256?0:size;h.writeUInt16LE(1,b+4);h.writeUInt16LE(32,b+6);h.writeUInt32LE(bytes.length,b+8);h.writeUInt32LE(at,b+12);at+=bytes.length});
    await writeFile(path.join(dir,`assets/${id}.ico`),Buffer.concat([h,...frames.map(f=>f.bytes)]));
   }
  }
 }
 console.log(JSON.stringify({palettes:palettes.length,geometries:geometries.length,pngCount}));
}finally{await browser.close()}
