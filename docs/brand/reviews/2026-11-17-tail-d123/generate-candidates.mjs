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
const arc='M 816 160 C 797 158 779 152 759 151 C 680 146 617 165 568 194 C 522 220 487 257 460 297 L 438 274 L 414 246 C 434 207 453 173 480 152 C 505 140 533 129 565 121 C 617 108 680 112 732 124 C 748 128 762 134 779 140 C 793 146 806 154 816 160 Z';
const tails={
 d1:{start:'M 395 390 C 357 363 303 300 279 250 C 257 211 257 176 284 169 C 328 159 350 211 382 250 C 412 286 441 314 464 330 ',end:'C 429 430 400 500 365 550 C 340 592 297 595 274 574 C 249 553 276 514 302 480 C 333 442 362 409 395 390 Z '},
 d2:{start:'M 403 391 C 358 362 295 299 268 245 C 242 198 244 158 274 152 C 322 140 350 201 383 244 C 414 283 442 312 464 330 ',end:'C 426 429 396 505 356 560 C 327 602 280 607 256 581 C 232 555 264 511 294 476 C 330 435 370 406 403 391 Z '},
 d3:{start:'M 411 392 C 358 361 287 296 256 239 C 226 186 230 141 265 134 C 318 124 350 190 386 239 C 417 282 445 313 464 330 ',end:'C 424 428 390 512 347 568 C 312 613 263 615 239 584 C 215 553 252 507 286 470 C 327 426 377 402 411 392 Z '}
};
const meta={original:{label:'原版',sub:'原始轮廓'},a:{label:'A 版',sub:'现有小稿 · 尺度参照'},b:{label:'B 版',sub:'上一轮轻度增强'},c:{label:'C 版',sub:'上一轮明显增强'},c0:{label:'C0 对照',sub:'仅去背景鱼尾'},d1:{label:'D1 · 舒展',sub:'接近 A 的展开尺度'},d2:{label:'D2 · 饱满',sub:'上下展开进一步增加'},d3:{label:'D3 · 鲜明',sub:'三稿中尾部最宽大'}};
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
await writeFile(new URL('geometry.json',root),JSON.stringify({source:'../2026-11-17-tail-bc/candidates/',bodyUnchanged:body,eyeUnchanged:eye,arc,tails},null,2)+'\n');
console.log('Generated 40 review SVGs; original/A/B/C are copied unchanged.');
