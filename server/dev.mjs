import http from 'node:http';
import { route } from '../src/server/handlers.ts';

http.createServer(async (req, res) => {
  const read = () => new Promise((resolve) => {
    let s = ''; req.on('data', (c) => (s += c)); req.on('end', () => { try { resolve(s ? JSON.parse(s) : {}); } catch { resolve({}); } });
  });
  const out = await route(req.method, req.url, read);
  res.writeHead(out.status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(out.body));
}).listen(3001, () => console.log('PITWISE api on :3001'));
