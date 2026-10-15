import { CIRCUITS, DEFAULTS, type Constants } from '../engine/constants';
import { recommend } from '../engine/recommend';
import type { CircuitId, Provenance, RaceState } from '../engine/types';
import { FIXTURES } from '../data/fixtures';

export interface Envelope<T> { data:T; provenance:Provenance|'HISTORICAL'|'SIMULATED'|'NONE'; generatedAt:string; source:string }
const env = <T>(data:T, provenance:Envelope<T>['provenance'], source:string):Envelope<T> =>
  ({ data, provenance, generatedAt:new Date().toISOString(), source });
const fxProv = (c:CircuitId):Provenance => FIXTURES[c].meta.provenance === 'HISTORICAL' ? 'HISTORICAL' : 'SIMULATED';

export class HttpError extends Error { status:number; constructor(status:number, message:string) { super(message); this.status = status; } }
export const isCircuit = (c:string):c is CircuitId => c in CIRCUITS;
const need = (c:string):CircuitId => { if (!isCircuit(c)) throw new HttpError(400, `Unknown circuit: ${c}`); return c; };

export async function getHealth() { return env({ status:'ok' }, 'NONE', 'pitwise-api'); }
export async function getCircuits() {
  return env(Object.entries(CIRCUITS).map(([id, c]) => ({ id, ...c, provenance:'ESTIMATE' as const })), 'ESTIMATE', 'explicit per-circuit assumptions (not measured)');
}
export async function getRace(circuit:string) {
  const c = need(circuit);
  return env(FIXTURES[c], fxProv(c), `src/data/${c}.json (${FIXTURES[c].meta.grandPrix})`);
}
export async function getWeather(circuit:string) {
  const c = need(circuit);
  return env({ meta:FIXTURES[c].meta, weather:FIXTURES[c].weather }, fxProv(c), `src/data/${c}.json`);
}
export async function getTelemetry(circuit:string, lap:number, driver:string) {
  const c = need(circuit);
  const fx = FIXTURES[c];
  const d = fx.drivers.find(x => x.code === driver || String(x.number) === driver) ?? fx.drivers[0];
  const rows = fx.timeline.filter(e => e.driverNumber === d.number && e.lap <= lap);
  return env({ driver:d, lap, laps:rows, note:'Lap-level data only; no sub-lap telemetry channels are recorded in this build.' }, fxProv(c), `src/data/${c}.json`);
}
export async function postStrategy(body:{ state:RaceState; k?:Partial<Constants>; seed?:number }) {
  if (!body || !body.state) throw new HttpError(400, 'Body must include "state"');
  const k = { ...DEFAULTS, ...(body.k ?? {}) } as Constants;
  const t0 = Date.now();
  const results = recommend(body.state, k, body.seed ?? 42);
  return env({ results, elapsedMs:Date.now() - t0 }, 'ESTIMATE', 'src/engine/recommend (shared with the browser worker)');
}

export async function route(method:string, url:string, readBody:()=>Promise<unknown>):Promise<{ status:number; body:unknown }> {
  try {
    const u = new URL(url, 'http://x');
    const p = u.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '').split('/').filter(Boolean);
    const [a, b] = p;
    if (method === 'GET' && a === 'health') return { status:200, body:await getHealth() };
    if (method === 'GET' && a === 'circuits') return { status:200, body:await getCircuits() };
    if (method === 'GET' && a === 'race' && b) return { status:200, body:await getRace(b) };
    if (method === 'GET' && a === 'weather' && b) return { status:200, body:await getWeather(b) };
    if (method === 'GET' && a === 'telemetry' && b) return { status:200, body:await getTelemetry(b, Number(u.searchParams.get('lap') ?? 1e9), u.searchParams.get('driver') ?? '') };
    if (method === 'POST' && a === 'strategy') return { status:200, body:await postStrategy((await readBody()) as Parameters<typeof postStrategy>[0]) };
    return { status:404, body:{ error:'Not found' } };
  } catch (e) {
    if (e instanceof HttpError) return { status:e.status, body:{ error:e.message } };
    return { status:500, body:{ error:e instanceof Error ? e.message : 'Internal error' } };
  }
}
