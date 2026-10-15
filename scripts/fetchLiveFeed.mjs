import { writeFileSync } from 'node:fs';

const [session = '9904', out = 'src/data/baku.feed.json'] = process.argv.slice(2);
const B = 'https://api.openf1.org/v1';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(ep) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`${B}/${ep}?session_key=${session}`, { signal: AbortSignal.timeout(60000) }).catch(() => null);
    if (r?.ok) return r.json();
    await sleep(1500 * (i + 1));
  }
  throw new Error(`OpenF1 ${ep} failed`);
}
const ms = d => new Date(d).getTime();
const r3 = x => x == null ? null : Math.round(x * 1000) / 1000;

const sessions = await get('sessions');
const drivers = await get('drivers'); await sleep(400);
const laps = await get('laps'); await sleep(400);
const rc = await get('race_control'); await sleep(400);
const pit = await get('pit'); await sleep(400);
const wx = await get('weather'); await sleep(400);
const pos = await get('position'); await sleep(400);
const stints = await get('stints');

const start = ms(rc.find(m => /SESSION STARTED/.test(m.message))?.date ?? laps.filter(l => l.date_start).map(l => l.date_start).sort()[0]);
const ev = [];
const byDriver = new Map();
for (const l of laps) (byDriver.get(l.driver_number) ?? byDriver.set(l.driver_number, []).get(l.driver_number)).push(l);
for (const rows of byDriver.values()) {
  rows.sort((a, b) => a.lap_number - b.lap_number);
  let prevEnd = null;
  for (const l of rows) {
    if (l.lap_duration == null) { prevEnd = null; continue; }
    const end = l.date_start ? ms(l.date_start) + l.lap_duration * 1000 : prevEnd != null ? prevEnd + l.lap_duration * 1000 : null;
    prevEnd = end;
    if (end == null) continue;
    ev.push({ t: end, k: 'lap', d: l.driver_number, lap: l.lap_number, time: r3(l.lap_duration), s: [r3(l.duration_sector_1), r3(l.duration_sector_2), r3(l.duration_sector_3)], st: l.st_speed ?? null, out: !!l.is_pit_out_lap });
  }
}
for (const m of rc) if (ms(m.date) >= start) ev.push({ t: ms(m.date), k: 'rc', lap: m.lap_number, cat: m.category, flag: m.flag, msg: m.message, d: m.driver_number });
for (const p of pit) ev.push({ t: ms(p.date), k: 'pit', d: p.driver_number, lap: p.lap_number, lane: r3(p.pit_duration ?? p.lane_duration), stop: r3(p.stop_duration) });
for (const w of wx) if (ms(w.date) >= start) ev.push({ t: ms(w.date), k: 'wx', air: w.air_temperature, track: w.track_temperature, hum: w.humidity, rain: !!w.rainfall, wind: w.wind_speed });
for (const p of pos) ev.push({ t: Math.max(start, ms(p.date)), k: 'pos', d: p.driver_number, p: p.position });
ev.sort((a, b) => a.t - b.t || (a.k === 'pos' ? -1 : 1));
for (const e of ev) e.t = Math.round(e.t - start) / 1000;

const s = sessions[0];
const feed = {
  meta: { source: 'OpenF1 (recorded)', sessionKey: +session, grandPrix: `${s.country_name} GP ${s.year}`, circuit: s.circuit_short_name, date: s.date_start, totalLaps: Math.max(...laps.map(l => l.lap_number)), events: ev.length, provenance: 'HISTORICAL' },
  drivers: drivers.map(d => ({ n: d.driver_number, code: d.name_acronym, name: d.full_name, team: d.team_name, colour: d.team_colour ? `#${d.team_colour}` : null })),
  stints: stints.map(x => ({ d: x.driver_number, from: x.lap_start, to: x.lap_end, c: (x.compound || 'UNKNOWN').toUpperCase(), age0: x.tyre_age_at_start ?? 0 })),
  events: ev,
};
writeFileSync(out, JSON.stringify(feed));
const counts = ev.reduce((a, e) => (a[e.k] = (a[e.k] || 0) + 1, a), {});
console.log(feed.meta.grandPrix, 'events', ev.length, JSON.stringify(counts), 'span', ev.at(-1).t, 's');
