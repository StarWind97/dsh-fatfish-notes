import {readFile,writeFile} from 'node:fs/promises'

const source=new URL('../assets/brand/',import.meta.url)
const read=(name:string)=>readFile(new URL(name,source),'utf8')
function artwork(svg:string){
  return svg.replace(/^.*?<svg\b[^>]*>/s,'').replace(/<\/svg>\s*$/,'')
    .replace(/<(title|desc)\b[^>]*>[\s\S]*?<\/\1>/g,'').replace(/\s+id="[^"]*"/g,'').trim()
}
const smallSvg=await read('fatfish-mark-small-mono.svg')
const smallMarkViewBox=smallSvg.match(/<svg\b[^>]*\bviewBox="([^"]+)"/)?.[1]
if(!smallMarkViewBox)throw new Error('Small brand source needs a viewBox')
const small=artwork(smallSvg).replaceAll('#26362F','currentColor')
const mark=artwork(await read('fatfish-mark.svg')).replaceAll('#26362F','var(--fatfish-brand-ink, #26362F)')
const signature=artwork(await read('fatfish-brand-square-light.svg')).replace(/<rect\b[^>]*width="1024"[^>]*height="1024"[^>]*\/>/,'').replaceAll('#26362F','var(--fatfish-brand-ink, #26362F)')
await writeFile(new URL('../src/client/brand-artwork.ts',import.meta.url),`// Approved vector outlines. Regenerate with: npx tsx scripts/generate-brand.ts\n// Local constants only; no runtime SVG parsing, fonts, images or network requests.\nexport const smallMarkViewBox=${JSON.stringify(smallMarkViewBox)}\nexport const smallMark=${JSON.stringify(small)}\nexport const colorMark=${JSON.stringify(mark)}\nexport const brandSignature=${JSON.stringify(signature)}\n`)
for(const theme of ['light','dark']){
  const svg=await read(`fatfish-brand-square-${theme}.svg`)
  await writeFile(new URL(`fatfish-brand-transparent-${theme}.svg`,source),svg.replace(/<rect\b[^>]*width="1024"[^>]*height="1024"[^>]*\/>/,''))
}
await writeFile(new URL('favicon.svg',source),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${smallMarkViewBox}" width="32" height="32"><title>Fatfish Notes</title><style>svg{color:#26362f}@media(prefers-color-scheme:dark){svg{color:#f7f4eb}}</style>${small}</svg>\n`)
