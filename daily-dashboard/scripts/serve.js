const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 8080);
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.png':'image/png' };
http.createServer((req,res)=>{
  const relative = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file,(error,data)=>{
    if(error){res.writeHead(404);return res.end('Not found');}
    res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
    res.end(data);
  });
}).listen(port,'127.0.0.1',()=>console.log(`日报看板：http://127.0.0.1:${port}`));
