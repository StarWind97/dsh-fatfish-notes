// Review only: all fish and lettering paths come from approved vector assets.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.USERPROFILE+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const dir=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(dir,'../../../..');
const families=[
 {id:'p1',no:'01',name:'紫莓薄荷',line:'紫色路线',tag:'原偏好 · 清晰的冷暖搭配',main:'#6940BE',accent:'#279B80',paper:'#F3EEF9',ink:'#39244F',night:'#23192F',darkBody:'#FFF6F5',darkArc:'#75E2C4',tile:{bg:'#6940BE',body:'#FFF6F5',arc:'#75E2C4'},desc:'紫色承担识别，薄荷绿作为叠页与点睛色。保留上一轮你喜欢的配色，扩展到整套场景。'},
 {id:'p2',no:'02',name:'电光鸢尾',line:'紫色路线',tag:'偏蓝亮紫 · 更清冷、更醒目',main:'#5841E6',accent:'#179A94',paper:'#EEEDFF',ink:'#28214E',night:'#19182C',darkBody:'#FAF9FF',darkArc:'#6EE7D4',tile:{bg:'#5841E6',body:'#FAF9FF',arc:'#6EE7D4'},desc:'紫色向蓝侧移动，拉高纯度；青色叠页保持轻快。比较更强的数字产品气质是否适合肥鱼。'},
 {id:'p3',no:'03',name:'莓紫春芽',line:'紫色路线',tag:'偏红莓紫 · 温暖而有个性',main:'#A337A0',accent:'#529849',paper:'#F9EDF6',ink:'#492340',night:'#2B1927',darkBody:'#FFF7EE',darkArc:'#B5EDA2',tile:{bg:'#A337A0',body:'#FFF7EE',arc:'#B5EDA2'},desc:'紫色向红侧移动，与嫩绿叠页拉开色相。比前两套更温暖，观察是否有亲切感而不过甜。'},
 {id:'g1',no:'04',name:'薄荷纸',line:'绿色路线',tag:'原偏好 · 彩色主体、轻盈底色',main:'#008F58',accent:'#D28A18',paper:'#E7F5EA',ink:'#184332',night:'#142B22',darkBody:'#61DCA3',darkArc:'#FFC76B',tile:{bg:'#E7F5EA',body:'#008F58',arc:'#E9A02F'},desc:'浅底承托鲜绿鱼身，暖金叠页提供第二个辨识点。任务栏沿用上一轮薄荷纸，不靠大块深绿抢眼。'},
 {id:'g2',no:'05',name:'碧青麦金',line:'绿色路线',tag:'偏青绿 · 清爽、稳健',main:'#008F89',accent:'#BD9219',paper:'#E4F5F2',ink:'#143E3C',night:'#122B2C',darkBody:'#5AE2CC',darkArc:'#F3D264',tile:{bg:'#E4F5F2',body:'#008F89',arc:'#E2B331'},desc:'绿色向青侧移动，金黄保持温暖。鱼与叠页的颜色分工明确，减少常见绿白聊天应用的联想。'},
 {id:'g3',no:'06',name:'鲜绿橙光',line:'绿色路线',tag:'偏暖鲜绿 · 活力最强',main:'#00A05C',accent:'#E87828',paper:'#F3F6E5',ink:'#24402B',night:'#1E2A20',darkBody:'#80ED9B',darkArc:'#FFB26D',tile:{bg:'#F3F6E5',body:'#00A05C',arc:'#FF923E'},desc:'鲜绿配橙金，把叠页变成显眼的暖色标记。与薄荷纸相比更活泼，也检验是否显得过于轻巧。'},
];
const names=['favicon.svg','fatfish-brand-transparent-light.svg','fatfish-mark.svg','fatfish-mark-d1.svg','fatfish-mark-d2.svg','fatfish-mark-c0.svg'];
const sources={};for(const name of names)sources[name]=await readFile(path.join(repo,'assets/brand',name),'utf8');
const hashes=Object.fromEntries(names.map(n=>[n,crypto.createHash('sha256').update(sources[n]).digest('hex')]));
const sizes=[16,20,24,28,32,40,48,64,96,128,256];
await mkdir(path.join(dir,'assets'),{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
let count=0;
try{
 const page=await browser.newPage();
 const shapes=await page.evaluate(sources=>{
  const parse=s=>new DOMParser().parseFromString(s,'image/svg+xml').documentElement;
  const full=parse(sources['fatfish-brand-transparent-light.svg']);document.body.appendChild(full);
  const parts={};for(const id of ['wordmark-chinese','wordmark-english']){const g=full.querySelector('#'+id),b=g.getBBox();parts[id]={inner:g.innerHTML,box:{x:b.x,y:b.y,width:b.width,height:b.height}}}
  full.remove();return parts;
 },sources);
 const recolor=(s,f,mode)=>s.replaceAll('#3F5A4E',mode==='light'?f.main:f.darkBody).replaceAll('#B7C9B3',mode==='light'?f.accent:f.darkArc);
 const strip=s=>s.replace(/^.*?<svg[^>]*>/s,'').replace(/<\/svg>\s*$/,'');
 const svg=(w,h,body)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;
 async function save(name,art,w,h){await writeFile(path.join(dir,'assets',name+'.svg'),art);count++;if(w){await png(name,art,w,h)}}
 async function png(name,art,w,h=w){const data=await page.evaluate(async({art,w,h})=>{const im=new Image();im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(art);await im.decode();const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);return c.toDataURL().split(',')[1]},{art,w,h});const bytes=Buffer.from(data,'base64');await writeFile(path.join(dir,'assets',name+'.png'),bytes);return bytes;}
 function lettering(id,x,y,width,fill){const {inner,box:b}=shapes[id];return `<g fill="${fill}" transform="translate(${x} ${y}) scale(${width/b.width}) translate(${-b.x} ${-b.y})">${inner}</g>`}
 for(const f of families){
  for(const mode of ['light','dark']){
   const body=mode==='light'?f.main:f.darkBody,ink=mode==='light'?f.ink:f.darkBody,accent=mode==='light'?f.accent:f.darkArc;
   for(const [shape,source] of [['original','fatfish-mark.svg'],['d1','fatfish-mark-d1.svg'],['d2','fatfish-mark-d2.svg'],['c0','fatfish-mark-c0.svg']])await save(`${f.id}-mark-${shape}-${mode}`,recolor(sources[source],f,mode));
   // Wordmarks retain approved outline geometry, with separate text and symbol colors.
   const stacked=recolor(sources['fatfish-brand-transparent-light.svg'],f,mode).replace(/(<g id="wordmark-(?:chinese|english)" fill=")[^"]+/,`$1${ink}`).replace(/(<g id="wordmark-english" fill=")[^"]+/,`$1${ink}`);
   await save(`${f.id}-stack-${mode}`,stacked,512,512);
   const mark=strip(recolor(sources['fatfish-mark.svg'],f,mode));
   const horizontal=svg(1400,400,`<g transform="translate(20 44) scale(.56)">${mark}</g>${lettering('wordmark-chinese',540,94,800,ink)}${lettering('wordmark-english',550,298,560,ink)}`);
   await save(`${f.id}-horizontal-${mode}`,horizontal,1400,400);
   // Cover is a design mockup, not a screenshot of released product UI.
   const cover=svg(1440,900,`<rect width="1440" height="900" fill="${mode==='light'?f.paper:f.night}"/><rect x="82" y="74" width="6" height="44" rx="3" fill="${accent}"/><text x="110" y="104" font-family="Microsoft YaHei, sans-serif" font-size="22" fill="${ink}">把值得留下的对话，变成自己的笔记。</text><g transform="translate(80 205) scale(.91)">${strip(horizontal)}</g><line x1="88" x2="1352" y1="664" y2="664" stroke="${accent}"/><text x="88" y="742" font-family="Microsoft YaHei, sans-serif" font-size="28" fill="${ink}">保存会话　·　整理资料　·　随时复用</text><text x="90" y="804" font-family="Microsoft YaHei, sans-serif" font-size="18" fill="${ink}">肥鱼笔记 / Fatfish Notes　　DSH 笔记插件</text><path d="M1298 760h54m-18-18 18 18-18 18" stroke="${body}" stroke-width="4" fill="none"/>`);
   await save(`${f.id}-cover-${mode}`,cover,1440,900);
  }
  const tile=sources['favicon.svg'].replaceAll('#3F5A4E',f.tile.bg).replaceAll('#F7F4EB',f.tile.body).replaceAll('#B7C9B3',f.tile.arc);
  await save(`${f.id}-tile`,tile);
  const frames=[];for(const size of sizes)frames.push({size,bytes:await png(`${f.id}-tile-${size}`,tile,size)});
  const head=Buffer.alloc(6+16*frames.length);head.writeUInt16LE(1,2);head.writeUInt16LE(frames.length,4);let offset=head.length;
  frames.forEach(({size,bytes},i)=>{const b=6+i*16;head[b]=head[b+1]=size===256?0:size;head.writeUInt16LE(1,b+4);head.writeUInt16LE(32,b+6);head.writeUInt32LE(bytes.length,b+8);head.writeUInt32LE(offset,b+12);offset+=bytes.length});
  await writeFile(path.join(dir,`assets/${f.id}-tile.ico`),Buffer.concat([head,...frames.map(f=>f.bytes)]));
  const original=svg(880,880,`<rect width="880" height="880" rx="192" fill="${f.tile.bg}"/><g transform="translate(40 160)">${strip(sources['fatfish-mark.svg'].replaceAll('#3F5A4E',f.tile.body).replaceAll('#B7C9B3',f.tile.arc))}</g>`);
  await save(`${f.id}-tile-original`,original,128,128);
 }
 await writeFile(path.join(dir,'catalog.json'),JSON.stringify({families,sizes,sources:hashes,geometry:{16:'D2',20:'D1',24:'D1',28:'C0',32:'原版',taskbar:'D1'}},null,2)+'\n');
 console.log(JSON.stringify({families:families.length,svg:count,sourceHashes:hashes}));
}finally{await browser.close()}
