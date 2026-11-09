const path=require('node:path'),fs=require('node:fs'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'../../..'),out=path.join(root,'output/playwright/a1-layout');fs.mkdirSync(out,{recursive:true});
const result=esbuild.buildSync({entryPoints:[path.join(__dirname,'preview.tsx')],bundle:true,write:false,outdir:out,format:'iife',platform:'browser',target:'chrome120',minify:false,define:{'process.env.NODE_ENV':'"production"'}});
const js=result.outputFiles.find(f=>f.path.endsWith('.js')).text,css=result.outputFiles.find(f=>f.path.endsWith('.css')).text;
fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>肥鱼笔记 · A1 三栏布局样稿</title><style>'+css+'</style><body><div id="root"></div><script>'+js.replaceAll('</script','<\\/script')+'</script></body></html>');
console.log(path.join(out,'index.html'));
