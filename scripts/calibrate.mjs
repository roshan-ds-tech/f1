import { readFileSync, writeFileSync } from 'node:fs';

const circuit = process.argv[2] || 'baku';
const fx = JSON.parse(readFileSync(`src/data/${circuit}.json`, 'utf8'));
if (fx.meta.provenance !== 'HISTORICAL') throw new Error(`${circuit} fixture is not historical; refusing to calibrate from generated data`);

const FUEL_BURN = 1.75, SEC_PER_KG = 0.033;
const fuelGainPerLap = FUEL_BURN * SEC_PER_KG;
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const quant = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(q * (s.length - 1))]; };
const T = fx.meta.totalLaps;
const byDriver = new Map();
for (const e of fx.timeline) (byDriver.get(e.driverNumber) ?? byDriver.set(e.driverNumber, []).get(e.driverNumber)).push(e);
for (const rows of byDriver.values()) rows.sort((a, b) => a.lap - b.lap);
const scLaps = new Set(fx.timeline.filter(e => e.safetyCar).map(e => e.lap));
const clean = e => !e.pitThisLap && !scLaps.has(e.lap) && e.lap > 1;

const pitLoss = [];
for (const rows of byDriver.values()) {
  rows.forEach((e, i) => {
    if (!e.pitThisLap || e.lap <= 2 || scLaps.has(e.lap)) return;
    const out = rows[i + 1];
    if (!out || out.lap !== e.lap + 1 || scLaps.has(out.lap)) return;
    const ref = median(rows.filter(r => clean(r) && Math.abs(r.lap - e.lap) <= 5 && r.lap !== e.lap + 1).map(r => r.lapTimeSec));
    if (Number.isFinite(ref)) pitLoss.push(e.lapTimeSec + out.lapTimeSec - 2 * ref);
  });
}

const slopes = {}, stintsUsed = {};
for (const rows of byDriver.values()) {
  let stint = [];
  const flush = () => {
    const pts = stint.filter(clean);
    if (pts.length >= 8) {
      const med = median(pts.map(p => p.lapTimeSec));
      const ok = pts.filter(p => p.lapTimeSec < med + 2.5);
      const xs = ok.map(p => p.tyreAge), ys = ok.map(p => p.lapTimeSec + p.lap * fuelGainPerLap);
      const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
      const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
      if (sxx > 0) {
        const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / sxx;
        const c = stint[0].compound;
        (slopes[c] ??= []).push(slope); stintsUsed[c] = (stintsUsed[c] ?? 0) + 1;
      }
    }
    stint = [];
  };
  for (const e of rows) { if (stint.length && (e.compound !== stint[0].compound || e.pitThisLap)) flush(); if (!e.pitThisLap) stint.push(e); }
  flush();
}
const deg = Object.fromEntries(Object.entries(slopes).map(([c, s]) => [c, +Math.min(0.2, Math.max(0.005, median(s))).toFixed(3)]));

const fuelCorrected = fx.timeline.filter(clean).map(e => e.lapTimeSec - (T - e.lap) * FUEL_BURN * SEC_PER_KG);
const basePace = +quant(fuelCorrected, 0.25).toFixed(2);

const out = {
  circuit, source: `${fx.meta.grandPrix} (OpenF1 session ${fx.meta.sessionKey})`, provenance: 'HISTORICAL-FIT', fittedAt: new Date().toISOString(),
  pitLossSec: +median(pitLoss).toFixed(2), pitLossSamples: pitLoss.length,
  basePaceSec: basePace, cleanLaps: fuelCorrected.length,
  deg, stintsUsed,
  safetyCarLapsRecorded: [...scLaps].sort((a, b) => a - b),
  notes: [
    'Pit loss = in-lap + out-lap minus twice the driver\'s local median clean lap; Safety Car laps excluded.',
    'Degradation = median per-stint slope of lap time vs tyre age after removing the fuel-burn gain (1.75 kg/lap × 0.033 s/kg).',
    'Base pace = 25th percentile of clean laps corrected to zero fuel.',
    'Soft, Inter and Wet were not run in this race, so those compounds keep the illustrative model values.',
    'One race is a small sample: treat these as calibrated estimates, not measurements of the circuit.',
  ],
};
writeFileSync(`src/data/${circuit}.calibration.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ pitLoss: out.pitLossSec, n: pitLoss.length, pitLossRange: [quant(pitLoss, .1)?.toFixed(1), quant(pitLoss, .9)?.toFixed(1)], basePace, deg, stintsUsed, slopesRaw: Object.fromEntries(Object.entries(slopes).map(([c, s]) => [c, s.map(x => x.toFixed(3)).join(',')])) }, null, 1));
