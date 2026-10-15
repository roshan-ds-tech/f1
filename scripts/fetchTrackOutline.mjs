import { writeFileSync } from 'node:fs';
const [circuit = 'baku', session = '9904', driver = '1', lapNo = '20'] = process.argv.slice(2);
const B = 'https://api.openf1.org/v1';
const get = async p => { const r = await fetch(B + p, { signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error(`HTTP ${r.status} ${p}`); return r.json(); };
const [lap] = await get(`/laps?session_key=${session}&driver_number=${driver}&lap_number=${lapNo}`);
const t0 = new Date(lap.date_start).getTime();
const t1 = t0 + lap.duration_sector_1 * 1000, t2 = t1 + lap.duration_sector_2 * 1000, t3 = t0 + lap.lap_duration * 1000;
const iso = ms => new Date(ms).toISOString();
const pts = (await get(`/location?session_key=${session}&driver_number=${driver}&date>${iso(t0 - 500)}&date<${iso(t3 + 500)}`))
  .filter(p => p.x !== 0 || p.y !== 0).map(p => ({ t: new Date(p.date).getTime(), x: p.x, y: p.y }));
if (pts.length < 50) throw new Error(`only ${pts.length} location samples`);
const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
const s = Math.min(290 / (maxX - minX), 130 / (maxY - minY));
const ox = (300 - (maxX - minX) * s) / 2, oy = (140 - (maxY - minY) * s) / 2;
const P = p => [+(ox + (p.x - minX) * s).toFixed(1), +(oy + (maxY - p.y) * s).toFixed(1)];
const seg = (a, b) => { const q = pts.filter(p => p.t >= a && p.t <= b); return 'M' + q.map(p => P(p).join(' ')).join(' L'); };
const out = {
  circuit, source: `OpenF1 location, session ${session}, driver ${driver}, lap ${lapNo}`, viewBox: '0 0 300 140',
  sectors: [seg(t0, t1), seg(t1, t2), seg(t2, t3)], start: P(pts[0]), samples: pts.length,
};
writeFileSync(`src/data/${circuit}.outline.json`, JSON.stringify(out));
console.log('samples', pts.length, 'start', out.start, 'sector path lengths', out.sectors.map(x => x.length));
