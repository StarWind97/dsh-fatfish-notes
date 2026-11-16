// Trusted local SVG snapshot for this review; no product resources are changed.
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const assets=new URL('../../../../assets/brand/',import.meta.url);
const names=['fatfish-mark.svg','fatfish-mark-dark.svg','fatfish-mark-mono.svg','fatfish-mark-small.svg','fatfish-mark-small-dark.svg','fatfish-mark-small-mono.svg','fatfish-icon-dark.svg','fatfish-icon-light.svg','fatfish-icon-small-dark.svg','fatfish-icon-small-light.svg','fatfish-brand-square-light.svg','fatfish-brand-square-dark.svg','fatfish-brand-transparent-light.svg','fatfish-brand-transparent-dark.svg'];
const art={};for(const name of names)art[name]=await readFile(new URL(name,assets),'utf8');
const commit=execFileSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8'}).trim();
await writeFile(new URL('artwork.js',import.meta.url),'window.BRAND_SOURCE='+JSON.stringify({commit,date:'2026-11-17'})+';\nwindow.BRAND_ART='+JSON.stringify(art)+';\n');
console.log(`Prepared ${names.length} original vector resources; product files unchanged.`);
