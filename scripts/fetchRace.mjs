import { writeFileSync, mkdirSync } from 'node:fs';
const BASE = 'https://api.openf1.org/v1';
const CIRCUITS = {
  baku: { short: 'Baku', laps: 51, base: 103.0 },
  madrid: { short: 'Madrid', laps: 57, base: 92.0 },
  monaco: { short: 'Monte Carlo', laps: 78, base: 73.5 },
  singapore: { short: 'Singapore', laps: 62, base: 95.5 },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(path, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(BASE + path, { signal: AbortSignal.timeout(20000) });
      if (r.ok) return await r.json();
      if (r.status === 429) await sleep(1500 * (i + 1));
      else throw new Error('HTTP ' + r.status);
    } catch (e) { if (i === tries - 1) throw e; await sleep(800); }
  }
  throw new Error('exhausted');
}

async function real(id, c) {
  let session = null;
  for (const year of [2025, 2024, 2023]) {
    const s = await get(`/sessions?circuit_short_name=${encodeURIComponent(c.short)}&session_name=Race&year=${year}`);
    if (s.length) { session = s[0]; break; }
    await sleep(400);
  }
  if (!session) throw new Error('no race session found for ' + c.short);
  const sk = session.session_key;
  const [drivers, laps, stints, pits, weather, rc] = [
    await get(`/drivers?session_key=${sk}`), await get(`/laps?session_key=${sk}`),
    await get(`/stints?session_key=${sk}`), await get(`/pit?session_key=${sk}`),
    await get(`/weather?session_key=${sk}`), await get(`/race_control?session_key=${sk}`),
  ];
  const gaps = [];
  const totalLaps = Math.max(...laps.map((l) => l.lap_number));
  const scLaps = new Set();
  for (const m of rc) if (m.lap_number && /SAFETY CAR|VIRTUAL SAFETY CAR/i.test(m.message || m.category || '') && !/ENDING|IN THIS LAP|CLEAR/i.test(m.message || '')) scLaps.add(m.lap_number);
  const stintOf = (dn, lap) => stints.find((s) => s.driver_number === dn && lap >= s.lap_start && lap <= s.lap_end);
  const pitSet = new Set(pits.map((p) => `${p.driver_number}:${p.lap_number}`));
  const raw = laps.filter((l) => l.lap_duration != null).sort((a, b) => a.lap_number - b.lap_number);
  const cum = {};
  const byLap = {};
  for (const l of raw) {
    cum[l.driver_number] = (cum[l.driver_number] || 0) + l.lap_duration;
    (byLap[l.lap_number] ||= []).push([l.driver_number, cum[l.driver_number]]);
  }
  const posOf = {};
  for (const [lap, arr] of Object.entries(byLap)) arr.sort((a, b) => a[1] - b[1]).forEach(([dn], i) => (posOf[`${dn}:${lap}`] = i + 1));
  const wxAt = (lap) => weather[Math.min(weather.length - 1, Math.floor((lap / totalLaps) * weather.length))] || {};
  const timeline = raw.map((l) => {
    const st = stintOf(l.driver_number, l.lap_number);
    const w = wxAt(l.lap_number);
    return {
      lap: l.lap_number, driverNumber: l.driver_number, lapTimeSec: l.lap_duration,
      position: posOf[`${l.driver_number}:${l.lap_number}`] ?? 0,
      compound: (st?.compound || 'UNKNOWN').toUpperCase(),
      tyreAge: st ? (st.tyre_age_at_start || 0) + (l.lap_number - st.lap_start) : 0,
      pitThisLap: pitSet.has(`${l.driver_number}:${l.lap_number}`),
      wetness: w.rainfall ? 0.5 : 0, safetyCar: scLaps.has(l.lap_number),
      s1: l.duration_sector_1 ?? null, s2: l.duration_sector_2 ?? null, s3: l.duration_sector_3 ?? null,
    };
  });
  if (timeline.some((t) => t.lapTimeSec < 0)) gaps.push('Negative lap times found');
  if (timeline.some((t) => t.compound === 'UNKNOWN')) gaps.push('Some laps have no recorded compound');
  const missing = laps.length - raw.length;
  if (missing > 0) gaps.push(`${missing} laps had no recorded lap time and were skipped`);
  const wl = weather.length ? Array.from({ length: totalLaps }, (_, i) => {
    const w = wxAt(i + 1); return { lap: i + 1, airTempC: w.air_temperature ?? null, trackTempC: w.track_temperature ?? null, rainfall: !!w.rainfall };
  }) : [];
  if (!wl.length) gaps.push('No weather samples recorded');
  return {
    meta: { circuit: id, year: session.year, grandPrix: `${session.country_name} GP ${session.year}`, sessionKey: sk, totalLaps, provenance: 'HISTORICAL', fetchedAt: new Date().toISOString(), gaps },
    drivers: drivers.map((d) => ({ number: d.driver_number, code: d.name_acronym, name: d.full_name, team: d.team_name })),
    timeline, weather: wl,
  };
}

function mulberry32(a) { return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function simulated(id, c, reason) {
  console.warn(`!!! ${id}: using SIMULATED fallback (${reason})`);
  const rng = mulberry32(id.length * 7919 + c.laps);
  const OFF = { SOFT: 0, MEDIUM: 0.55, HARD: 1.15 }, DEG = { SOFT: 0.12, MEDIUM: 0.07, HARD: 0.04 };
  const names = ['Driver A', 'Driver B', 'Driver C', 'Driver D', 'Driver E', 'Driver F'];
  const drivers = names.map((n, i) => ({ number: i + 1, code: 'D' + (i + 1), name: n, team: 'Generated' }));
  const timeline = [];
  const cum = {};
  const plan = drivers.map((d, i) => ({ pit: Math.round(c.laps * (0.35 + 0.05 * i)), first: ['SOFT', 'MEDIUM'][i % 2], second: 'HARD', pace: c.base + i * 0.12 }));
  const rows = [];
  for (let lap = 1; lap <= c.laps; lap++) {
    const sc = lap >= Math.round(c.laps * 0.4) && lap < Math.round(c.laps * 0.4) + 3;
    drivers.forEach((d, i) => {
      const p = plan[i], pitted = lap > p.pit, compound = pitted ? p.second : p.first, age = pitted ? lap - p.pit : lap;
      const t = p.pace + OFF[compound] + DEG[compound] * age + (c.laps - lap) * 1.75 * 0.033 + (sc ? 28 : 0) + (rng() - 0.5) * 0.5 + (lap === p.pit ? 21 : 0);
      cum[d.number] = (cum[d.number] || 0) + t;
      rows.push({ lap, driverNumber: d.number, lapTimeSec: +t.toFixed(3), cum: cum[d.number], compound, tyreAge: age, pitThisLap: lap === p.pit, wetness: 0, safetyCar: sc });
    });
  }
  for (let lap = 1; lap <= c.laps; lap++) {
    const r = rows.filter((x) => x.lap === lap).sort((a, b) => a.cum - b.cum);
    r.forEach((x, i) => { const { cum: _c, ...rest } = x; timeline.push({ ...rest, position: i + 1, s1: null, s2: null, s3: null }); });
  }
  return {
    meta: { circuit: id, year: 0, grandPrix: 'Generated demo race', sessionKey: 0, totalLaps: c.laps, provenance: 'SIMULATED', fetchedAt: new Date().toISOString(), gaps: [`Generated from the lap-time model with a fixed seed because the OpenF1 fetch failed: ${reason}`] },
    drivers, timeline, weather: Array.from({ length: c.laps }, (_, i) => ({ lap: i + 1, airTempC: 24, trackTempC: 31, rainfall: false })),
  };
}

mkdirSync('src/data', { recursive: true });
const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CIRCUITS);
for (const id of want) {
  let out;
  try { out = await real(id, CIRCUITS[id]); console.log(`${id}: HISTORICAL ${out.meta.grandPrix}, ${out.timeline.length} laps`); }
  catch (e) { out = simulated(id, CIRCUITS[id], String(e.message || e)); }
  writeFileSync(`src/data/${id}.json`, JSON.stringify(out));
  await sleep(500);
}
