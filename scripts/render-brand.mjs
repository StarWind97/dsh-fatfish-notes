// Render trusted local SVGs with an available Playwright/Chrome installation.
// No dependency installation: pass --playwright-module <path> if it is external.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {brandSuffix} from '../src/client/brand-size.ts';
const require=createRequire(import.meta.url),arg=process.argv.indexOf('--playwright-module');
const {chromium}=require(arg<0?'playwright':process.argv[arg+1]);
const root=fileURLToPath(new URL('../',import.meta.url)),asset=path.join(root,'assets/brand');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage();
  async function render(name,width,height=width){
    const raw=await readFile(path.join(asset,name),'utf8');
    const svg=raw.replace(/<svg\b[^>]*>/,tag=>tag.replace(/\s(?:width|height)="[^"]*"/g,'').replace(/>$/,` width="${width}" height="${height}">`));
    const data=await page.evaluate(async({svg,width,height})=>{
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const image=new Image();image.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svg)));await image.decode();
      canvas.getContext('2d').drawImage(image,0,0,width,height);return canvas.toDataURL('image/png').split(',')[1];
    },{svg,width,height});
    return Buffer.from(data,'base64');
  }
  const sizes=[16,20,24,32,40,48,64,96,128,256],frames=[];
  for(const size of sizes){const bytes=await render('favicon.svg',size);frames.push({size,bytes});if(size===16||size===32)await writeFile(path.join(asset,`favicon-${size}.png`),bytes)}
  const header=Buffer.alloc(6+16*frames.length);header.writeUInt16LE(1,2);header.writeUInt16LE(frames.length,4);
  let offset=header.length;
  frames.forEach(({size,bytes},i)=>{const p=6+i*16;header[p]=header[p+1]=size===256?0:size;header.writeUInt16LE(1,p+4);header.writeUInt16LE(32,p+6);header.writeUInt32LE(bytes.length,p+8);header.writeUInt32LE(offset,p+12);offset+=bytes.length});
  await writeFile(path.join(asset,'favicon.ico'),Buffer.concat([header,...frames.map(f=>f.bytes)]));
  await writeFile(path.join(root,'assets/icon-180.png'),await render('fatfish-icon-dark.svg',180));
  const output=path.join(root,'docs/brand/current-png');await mkdir(output,{recursive:true});
  for(const size of [16,17,20,24,28,32,48,64,128,180,256,512]){
    const suffix=brandSuffix(size);
    for(const [label,source] of [
      ['mark-light',`fatfish-mark${suffix}.svg`],
      ['mark-dark',`fatfish-mark${suffix}-dark.svg`],
      ['mark-mono',`fatfish-mark${suffix}-mono.svg`],
      ['icon-light',`fatfish-icon${suffix}-light.svg`],
      ['icon-dark',`fatfish-icon${suffix}-dark.svg`],
    ])await writeFile(path.join(output,`${label}-${size}.png`),await render(source,size));
  }
  // These are explicitly native/browser resources, not generic display-size selections.
  for(const size of [16,24,32,48,64,128,256])await writeFile(path.join(output,`window-d1-${size}.png`),await render('favicon.svg',size));
  for(const theme of ['light','dark'])for(const size of [256,512,1024,2048])await writeFile(path.join(output,`brand-${theme}-${size}.png`),await render(`fatfish-brand-square-${theme}.svg`,size));
  console.log('Rendered app PNG, ten-resolution D1 ICO, favicon PNGs and 75 current brand PNGs.');
}finally{await browser.close()}
