// Review-only vector edits. Product source, eye, body and page paths stay intact.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const assets=new URL('../../../../assets/brand/',import.meta.url),out=new URL('candidates/',import.meta.url);
await mkdir(out,{recursive:true});
const read=name=>readFile(new URL(name,assets),'utf8');
const original=await read('fatfish-mark.svg');
const paths=[...original.matchAll(/<path\b[^>]* d="([^"]+)"/g)].map(m=>m[1]);
const old=paths[1],body=old.slice(old.indexOf('C 478 325'),old.indexOf('C 434 427')),eye=old.slice(old.indexOf('M 886.25'));
if(!body||!eye||paths.length!==2)throw Error('Unexpected original SVG');
const tails={
 b:{
  start:'M 454 408 C 422 399 387 391 370 379 C 344 356 348 315 375 289 C 385 281 396 277 406 278 C 438 276 441 314 464 330 ',
  end:'C 432 423 411 473 380 499 C 365 513 339 513 331 493 C 315 465 349 434 381 421 C 405 414 429 410 454 408 Z '
 },
 c:{
  start:'M 466 408 C 420 401 377 392 358 378 C 333 360 341 315 371 287 C 382 278 396 273 409 275 C 442 275 444 308 464 330 ',
  end:'C 429 419 400 477 365 510 C 347 527 318 527 305 504 C 288 474 330 438 372 424 C 402 416 435 410 466 408 Z '
 }
};
const forms={colorLight:'fatfish-mark.svg',colorDark:'fatfish-mark-dark.svg',mono:'fatfish-mark-mono.svg',tile:'fatfish-icon-dark.svg',tileLight:'fatfish-icon-light.svg'};
const microForms={colorLight:'fatfish-mark-small.svg',colorDark:'fatfish-mark-small-dark.svg',mono:'fatfish-mark-small-mono.svg',tile:'fatfish-icon-small-dark.svg',tileLight:'fatfish-icon-small-light.svg'};
const meta={original:{label:'原版',sub:'原始不对称鱼尾'},a:{label:'A 版',sub:'现有小稿 · 保留对照'},b:{label:'B 版',sub:'轻度增强 · 更贴近原版'},c:{label:'C 版',sub:'明显增强 · 尾部展开更多'}};
const data={};
for(const id of Object.keys(meta)){
 data[id]={...meta[id],forms:{}};
 for(const [form,name] of Object.entries(id==='a'?microForms:forms)){
  let svg=await read(name);
  if(tails[id]){if(!svg.includes(old))throw Error('Missing original body in '+name);svg=svg.replace(old,tails[id].start+body+tails[id].end+eye);svg=svg.replace(/<title>[^<]*<\/title>/,`<title>肥鱼笔记 · 原版不对称鱼尾 ${id.toUpperCase()} · 预览</title>`)}
  data[id].forms[form]=svg;
  await writeFile(new URL(`${id}-${form}.svg`,out),svg);
 }
}
const source={commit:execFileSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8'}).trim(),date:'2026-11-17',primary:'#3F5A4E'};
await writeFile(new URL('artwork.js',import.meta.url),`window.TAIL_SOURCE=${JSON.stringify(source)};\nwindow.TAIL_ART=${JSON.stringify(data)};\n`);
await writeFile(new URL('geometry.json',import.meta.url),JSON.stringify({source:'assets/brand/fatfish-mark.svg',bodyUnchanged:body,eyeUnchanged:eye,pageUnchanged:paths[0],tails},null,2)+'\n');
console.log('Generated 20 review SVGs, including unchanged original/A and 10 B/C candidates.');
