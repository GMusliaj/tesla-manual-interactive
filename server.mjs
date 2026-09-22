import { createReadStream, statSync, realpathSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.json': 'application/json', '.md': 'text/plain; charset=utf-8' };
export function createStaticServer(directory=resolve('public')) {
 const root=realpathSync(directory);
 return createServer((req, res) => {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end('Method not allowed');return;}
  let requested;
  try{
    const url=new URL(req.url,'http://localhost');
    requested=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
  }catch{res.writeHead(400);res.end('Bad request');return;}
  let file, stat;
  try {
    file = resolve(root, '.' + requested);
    if (!file.startsWith(root + sep)) throw new Error('Outside public directory');
    file=realpathSync(file);
    if(!file.startsWith(root+sep))throw new Error('Symlink outside public directory');
    stat = statSync(file);
    if (!stat.isFile()) throw new Error('Not a file');
  } catch { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': 'no-cache' });
  if (req.method === 'HEAD') { res.end(); return; }
  createReadStream(file).on('error', () => res.destroy()).pipe(res);
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=createStaticServer(resolve(process.env.STATIC_ROOT||'public'));
 server.listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log('Model Y Field Guide ready at http://localhost:'+server.address().port));
}
