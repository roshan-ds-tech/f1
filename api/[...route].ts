import { route } from '../src/server/handlers';

interface Req { method?:string; url?:string; body?:unknown }
interface Res { statusCode:number; setHeader(k:string, v:string):void; end(s:string):void }

export default async function handler(req:Req, res:Res) {
  const out = await route(req.method ?? 'GET', req.url ?? '/', async () => req.body);
  res.statusCode = out.status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(out.body));
}
