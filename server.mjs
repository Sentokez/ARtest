import http from 'node:http';
import { readFile, writeFile, mkdir, rename, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { validateProject } from './validation.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.mjs':'text/javascript', '.json':'application/json', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.webp':'image/webp', '.mp3':'audio/mpeg', '.wav':'audio/wav', '.ogg':'audio/ogg', '.mp4':'video/mp4' };
async function body(req, limit) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > limit) throw Object.assign(new Error('Dosya çok büyük.'), { status:413 }); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
export function createServer({ rootDir = root } = {}) {
  const projectRoot = rootDir;
  let saving = false;
  const server = http.createServer(async (req, res) => {
    const send = (status, data) => { res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' }); res.end(JSON.stringify(data)); };
    try {
      // Only this local app may write; reject cross-origin and DNS rebinding requests.
      const boundPort = server.address()?.port || port;
      if (!['127.0.0.1', 'localhost'].some(host => req.headers.host === `${host}:${boundPort}`)) return send(403, { error:'Geçersiz sunucu adresi.' });
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      if (req.method === 'POST') {
        if (req.headers.origin !== `http://${req.headers.host}` || req.headers['x-tour-editor'] !== '1') return send(403, { error:'Geçersiz düzenleyici isteği.' });
        if (url.pathname === '/api/save') {
          if (saving) return send(409, { error:'Başka bir kayıt sürüyor. Yeniden deneyin.' });
          const project = JSON.parse((await body(req, 8 * 1024 * 1024)).toString());
          validateProject(project);
          if (saving) return send(409, { error:'Başka bir kayıt sürüyor. Yeniden deneyin.' });
          saving = true;
          try {
            await mkdir(path.join(projectRoot, 'backups'), { recursive:true });
            await copyFile(path.join(projectRoot, 'config.json'), path.join(projectRoot, 'backups', `config-${Date.now()}-${randomUUID()}.json`));
            const temp = path.join(projectRoot, 'config.json.tmp');
            await writeFile(temp, JSON.stringify(project, null, 2) + '\n');
            await rename(temp, path.join(projectRoot, 'config.json'));
            return send(200, { ok:true });
          } finally { saving = false; }
        }
        if (url.pathname === '/api/upload') {
          const ext = path.extname(url.searchParams.get('name') || '').toLowerCase();
          if (!['.jpg','.jpeg','.png','.webp','.mp3','.wav','.ogg'].includes(ext)) return send(400, { error:'JPG, PNG, WebP veya ses dosyası seçin.' });
          const data = await body(req, 60 * 1024 * 1024);
          if (!data.length) return send(400, { error:'Dosya boş.' });
          const folder = ['.mp3','.wav','.ogg'].includes(ext) ? 'audio' : 'images';
          const relative = `${folder}/upload-${randomUUID()}${ext}`;
          await mkdir(path.join(projectRoot, folder), { recursive:true });
          await writeFile(path.join(projectRoot, relative), data);
          return send(201, { path:relative });
        }
        return send(404, { error:'İşlem bulunamadı.' });
      }
      if (!['GET','HEAD'].includes(req.method)) return send(405, { error:'Desteklenmeyen istek.' });
      const name = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      if (['/server.mjs','/baslat.ps1','/package.json'].includes(name) || name.startsWith('/tests/')) return send(404, { error:'Dosya bulunamadı.' });
      if (name.includes('\\') || name.split('/').some(segment => segment.startsWith('.') || segment === 'backups') || !mime[path.extname(name)]) return send(404, { error:'Dosya bulunamadı.' });
      const target = path.resolve(projectRoot, '.' + name);
      if (!target.startsWith(projectRoot + path.sep)) return send(403, { error:'Erişim yok.' });
      const content = await readFile(target);
      res.writeHead(200, { 'Content-Type':mime[path.extname(name)], 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) { send(error.status || (error.code === 'ENOENT' ? 404 : 400), { error:error.code === 'ENOENT' ? 'Dosya bulunamadı.' : error.message }); }
  });
  return server;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createServer().listen(port, '127.0.0.1', () => console.log(`Sanal tur: http://127.0.0.1:${port}\nDüzenleyici: http://127.0.0.1:${port}/editor.html\nDurdurmak için Ctrl+C.`));
}
