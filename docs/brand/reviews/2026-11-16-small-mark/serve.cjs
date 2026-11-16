const http=require('http'),fs=require('fs/promises'),path=require('path');
const allowed=new Map([['/','index.html'],['/index.html','index.html'],['/mark-a.svg','mark-a.svg'],['/mark-b.svg','mark-b.svg']]);
http.createServer(async(req,res)=>{const file=allowed.get(req.url);if(!file||!['GET','HEAD'].includes(req.method)){res.writeHead(404);return res.end()}
try{const bytes=await fs.readFile(path.join(__dirname,file));res.writeHead(200,{'Content-Type':file.endsWith('.svg')?'image/svg+xml':'text/html; charset=utf-8','Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:bytes)}catch{res.writeHead(500);res.end()}}).listen(8818,'127.0.0.1',()=>console.log('Fatfish small-mark review: http://127.0.0.1:8818/'));
