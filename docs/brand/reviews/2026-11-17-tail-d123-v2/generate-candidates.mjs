// Review-only SVG curves; all formal brand files remain untouched.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const root=new URL('./',import.meta.url),previous=new URL('../2026-11-17-tail-bc/',root);
await mkdir(new URL('candidates/',root),{recursive:true});
const forms=['colorLight','colorDark','mono','tile','tileLight'];
const read=(id,form)=>readFile(new URL(`candidates/${id}-${form}.svg`,previous),'utf8');
const original=await read('original','colorLight');
const paths=[...original.matchAll(/<path\b[^>]* d="([^"]+)"/g)].map(x=>x[1]);
const body=paths[1].slice(paths[1].indexOf('C 478 325'),paths[1].indexOf('C 434 427'));
const eye=paths[1].slice(paths[1].indexOf('M 886.25'));
if(!body||!eye)throw Error('Unexpected source paths');
// Retain the original upper outer/inner sweep and cut away the rear tail.
const arc='M 816 152 C 797 150 779 144 759 143 C 680 138 617 157 568 186 C 536 204 513 228 493 252 L 471 231 C 492 189 529 141 565 113 C 617 100 680 104 732 116 C 748 120 762 126 779 132 C 793 138 806 146 816 152 Z';
const cSource=await read('c','colorLight');
const cFish=[...cSource.matchAll(/<path\b[^>]* d="([^"]+)"/g)][1][1];
const cUpper=cFish.slice(0,cFish.indexOf(body)),cLower=cFish.slice(cFish.indexOf(body)+body.length,cFish.indexOf(eye));
// Expand C's existing lobes about their common notch; retain the original control
// point sequence, roundness and asymmetry. The body attachment remains fixed.
const scales={d1:{upper:[1.4,1.7],lower:[1.22,1.45]},d2:{upper:[1.65,1.9],lower:[1.32,1.6]},d3:{upper:[1.9,2.1],lower:[1.42,1.72]}};
const expand=(s,[sx,sy])=>s.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g,(_,x,y)=>`${+(466+(Number(x)-466)*sx).toFixed(2)} ${+(408+(Number(y)-408)*sy).toFixed(2)}`);
const tails=Object.fromEntries(Object.entries(scales).map(([id,scale])=>[id,{start:expand(cUpper,scale.upper).replace(/[-\d.]+\s+[-\d.]+\s*$/,'464 330 '),end:expand(cLower,scale.lower)}]));
const meta={original:{label:'原版',sub:'原始轮廓'},a:{label:'A 版',sub:'现有小稿 · 尺度参照'},b:{label:'B 版',sub:'前轮轻度增强'},c:{label:'C 版',sub:'前轮明显增强'},c0:{label:'C0 对照',sub:'仅去背景鱼尾'},d1:{label:'D1 · 圆润',sub:'饱满尾瓣 · 适度展开'},d2:{label:'D2 · 丰盈',sub:'尾瓣加厚 · 明显增大'},d3:{label:'D3 · 充盈',sub:'宽大尾瓣 · 最大幅度'}};
const artwork={};
for(const [id,info]of Object.entries(meta)){
 artwork[id]={...info,forms:{}};
 for(const form of forms){let svg=await read(['c0','d1','d2','d3'].includes(id)?'c':id,form);
  if(id==='c0'||tails[id]){svg=svg.replace(paths[0],arc);if(tails[id]){const p=[...svg.matchAll(/<path\b[^>]* d="([^"]+)"/g)][1][1];svg=svg.replace(p,tails[id].start+body+tails[id].end+eye)}svg=svg.replace(/<title>.*?<\/title>/,`<title>肥鱼笔记 · ${info.label} · 预览</title>`)}
  artwork[id].forms[form]=svg;await writeFile(new URL(`candidates/${id}-${form}.svg`,root),svg);
 }
}
const source={commit:execFileSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8'}).trim(),date:'2026-11-17',primary:'#3F5A4E'};
await writeFile(new URL('artwork.js',root),`window.TAIL_SOURCE=${JSON.stringify(source)};\nwindow.TAIL_ART=${JSON.stringify(artwork)};\n`);
await writeFile(new URL('geometry.json',root),JSON.stringify({source:'../2026-11-17-tail-bc/candidates/',bodyUnchanged:body,eyeUnchanged:eye,arc,cUpper,cLower,scales,tails},null,2)+'\n');
console.log('Generated 40 review SVGs; original/A/B/C are copied unchanged.');
