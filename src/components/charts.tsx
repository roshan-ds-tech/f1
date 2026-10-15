import type { Compound, RaceState, Strategy } from '../engine/types';
import { TYRES, type Constants } from '../engine/constants';
import { degradation, lapTime } from '../engine/lapTime';
import { COMPOUND_COLOR } from '../styles/compounds';
import { COMPOUND_NAME } from './TyreThumb';

const X0 = 34, X1 = 312, Y0 = 140, Y1 = 10;
const fmtLap = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const tick = { fontSize: 10.5, fill: 'var(--text2)' } as const;

function Frame({ yLabels, xLabels, children }: { yLabels: string[]; xLabels: { x: number; t: string }[]; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 320 160" style={{ width: '100%', height: 'auto', display: 'block', fontFamily: 'Manrope', overflow: 'visible' }}>
      <line x1={X0} y1={Y0} x2={X1} y2={Y0} style={{ stroke: 'var(--line)' }} />
      <line x1={X0} y1={75} x2={X1} y2={75} style={{ stroke: 'var(--grid)' }} />
      <line x1={X0} y1={Y1} x2={X1} y2={Y1} style={{ stroke: 'var(--grid)' }} />
      {yLabels.map((t, i) => <text key={i} x={28} y={[144, 79, 14][i]} textAnchor="end" style={tick}>{t}</text>)}
      {xLabels.map((l, i) => <text key={i} x={l.x} y={156} textAnchor="middle" style={tick}>{l.t}</text>)}
      {children}
    </svg>
  );
}

export function modelLapSeries(state: RaceState, st: Strategy, k: Constants) {
  const out: { lap: number; t: number }[] = [];
  let comp: Compound = state.us.compound, age = state.us.tyreAge, fuel = state.us.fuelKg;
  for (let lap = state.currentLap; lap <= state.totalLaps; lap++) {
    if (st.pitLap === lap) { comp = st.compound; age = 0; }
    const r = state.rainArrivalLap;
    let wet = state.wetnessNow;
    if (r !== null && lap >= r) wet = Math.min(state.rainIntensity, state.wetnessNow + (state.rainIntensity - state.wetnessNow) * ((lap - r + 1) / 3));
    out.push({ lap, t: lapTime({ basePace: state.us.basePace, compound: comp, tyreAge: age, fuelKg: fuel, degScale: k.DEG_MEAN_SCALE, wetness: wet, underSC: false, rng: () => 0.5 }, { ...k, PACE_SIGMA: 0 }) });
    age++; fuel = Math.max(0, fuel - k.FUEL_BURN_PER_LAP);
  }
  return out;
}

export function LapTimeChart({ state, strategy, compare, compareLabel, k, observed }: {
  state: RaceState; strategy?: Strategy; compare?: Strategy; compareLabel?: string; k: Constants;
  observed?: { lap: number; t: number }[];
}) {
  const from = Math.max(1, state.currentLap - 6), to = state.totalLaps;
  const b = Math.round(state.us.basePace), lo = b - 6, hi = b + 6;
  const xs = (l: number) => X0 + (l - from) / Math.max(1, to - from) * (X1 - X0);
  const ys = (t: number) => Y0 - (Math.min(Math.max(t, lo), hi) - lo) / (hi - lo) * (Y0 - Y1);
  const path = (pts: { lap: number; t: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${xs(p.lap).toFixed(1)} ${ys(p.t).toFixed(1)}`).join('');
  const a = strategy ? modelLapSeries(state, strategy, k) : [];
  const c = compare ? modelLapSeries(state, compare, k) : [];
  const obs = (observed ?? []).filter(p => p.lap >= from && p.lap <= state.currentLap);
  const scEnd = state.safetyCarActive ? Math.min(to, state.currentLap + state.safetyCarLapsRemaining - 1) : null;
  const pit = strategy?.pitLap != null ? a.find(p => p.lap === strategy.pitLap) : undefined;
  const mid1 = Math.round(from + (to - from) / 3), mid2 = Math.round(from + 2 * (to - from) / 3);
  return (
    <section className="chart" data-screen-label="Lap time projection">
      <div className="row between" style={{ alignItems: 'baseline', gap: 8 }}><span className="label">Lap time</span><span className="cap">Pit loss excluded · model estimate</span></div>
      <div className="legend">
        {obs.length > 0 && <span><span style={{ width: 14, height: 2, background: 'var(--text)' }} />Observed</span>}
        {strategy && <span><span style={{ width: 14, borderTop: '2px dashed var(--red)' }} />{strategy.plan}</span>}
        {compare && <span><span style={{ width: 14, borderTop: '2px dashed var(--hard)' }} />{compareLabel ?? compare.plan}</span>}
      </div>
      <Frame yLabels={[fmtLap(lo), fmtLap(b), fmtLap(hi)]} xLabels={[{ x: X0, t: `L${from}` }, { x: xs(mid1), t: String(mid1) }, { x: xs(mid2), t: String(mid2) }, { x: X1, t: String(to) }]}>
        {scEnd !== null && <><rect x={xs(state.currentLap)} y={Y1} width={Math.max(4, xs(scEnd + 1) - xs(state.currentLap))} height={130} style={{ fill: 'var(--amberTint)' }} /><text x={(xs(state.currentLap) + xs(scEnd + 1)) / 2} y={22} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: 'var(--amber)' }}>SC</text></>}
        {state.rainArrivalLap !== null && state.rainArrivalLap <= to && <><line x1={xs(state.rainArrivalLap)} y1={Y1} x2={xs(state.rainArrivalLap)} y2={Y0} style={{ stroke: 'var(--blue)', strokeDasharray: '3 3' }} /><text x={xs(state.rainArrivalLap) + 4} y={34} style={{ fontSize: 10, fontWeight: 700, fill: 'var(--blue)' }}>RAIN</text></>}
        {c.length > 0 && <path d={path(c)} style={{ fill: 'none', stroke: 'var(--hard)', strokeWidth: 1.6, strokeDasharray: '4 3' }} />}
        {a.length > 0 && <path d={path(a)} style={{ fill: 'none', stroke: 'var(--red)', strokeWidth: 2.2, strokeDasharray: '5 3' }} />}
        {obs.length > 1 && <path d={path(obs)} style={{ fill: 'none', stroke: 'var(--text)', strokeWidth: 2 }} />}
        {pit && <><circle cx={xs(pit.lap)} cy={ys(pit.t)} r={4} style={{ fill: 'var(--surface)', stroke: 'var(--red)', strokeWidth: 2 }} /><text x={xs(pit.lap)} y={ys(pit.t) - 9} textAnchor="middle" style={{ fontSize: 9.5, fontWeight: 700, fill: 'var(--red)' }}>PIT</text></>}
      </Frame>
    </section>
  );
}

const ORDER: Compound[] = ['HARD', 'INTER', 'WET', 'SOFT', 'MEDIUM'];
export function TyreDegChart({ state, k, degLabel }: { state: RaceState; k: Constants; degLabel: string }) {
  const T = k.TYRES ?? TYRES;
  const wear = (c: Compound, age: number) => Math.min(100, degradation(T[c], age) * k.DEG_MEAN_SCALE / degradation(T[c], T[c].cliffLap + 12) * 100);
  const xs = (a: number) => X0 + a / 40 * (X1 - X0), ys = (p: number) => Y0 - p / 100 * (Y0 - Y1);
  const path = (c: Compound) => Array.from({ length: 21 }, (_, i) => i * 2).map((a, i) => `${i ? 'L' : 'M'}${xs(a).toFixed(1)} ${ys(wear(c, a)).toFixed(1)}`).join('');
  const cur = state.us.compound, age = Math.min(40, state.us.tyreAge), nx = xs(age), ny = ys(wear(cur, age));
  return (
    <section className="chart" data-screen-label="Tyre degradation">
      <div className="row between" style={{ alignItems: 'baseline', gap: 8 }}><span className="label">Tyre degradation</span><span className="cap">Model · {degLabel}</span></div>
      <div className="legend">{(['SOFT', 'MEDIUM', 'HARD', 'INTER', 'WET'] as Compound[]).map(c => <span key={c}><span style={{ width: 10, height: 3, borderRadius: 2, background: COMPOUND_COLOR[c] }} />{c === 'INTER' ? 'Inter' : COMPOUND_NAME[c]}</span>)}</div>
      <Frame yLabels={['0%', '50%', '100%']} xLabels={[{ x: X0, t: '0' }, { x: 173, t: '20' }, { x: X1, t: '40 laps' }]}>
        {ORDER.map(c => <path key={c} d={path(c)} style={{ fill: 'none', stroke: COMPOUND_COLOR[c], strokeWidth: c === cur ? 2.6 : 1.6 }} />)}
        <circle cx={nx} cy={ny} r={4} style={{ fill: 'var(--surface)', stroke: 'var(--text)', strokeWidth: 2 }} />
        <text x={nx > 240 ? nx - 8 : nx + 8} y={ny < 30 ? ny + 16 : ny - 8} textAnchor={nx > 240 ? 'end' : 'start'} style={{ fontSize: 10, fontWeight: 700, fill: 'var(--text)' }}>now · {age} laps</text>
      </Frame>
    </section>
  );
}

const cdf = (x: number) => { const t = 1 / (1 + 0.2316419 * Math.abs(x)); const d = 0.3989423 * Math.exp(-x * x / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; };

export function WeatherChart({ state }: { state: RaceState }) {
  const arr = state.rainArrivalLap;
  const cols = [0, 5, 10, 20].map((off, i) => {
    const p = state.wetnessNow > 0.2 ? 100 : arr === null ? 0 : Math.round(cdf((state.currentLap + off - arr) / state.rainArrivalSigma) * 100);
    return { label: i ? `+${off} laps` : 'Now', p, track: i === 0 && state.trackTempC != null ? `${state.trackTempC}°C track` : i === 0 ? 'Track temp n/a' : 'simulated' };
  });
  return (
    <section className="chart" data-screen-label="Weather forecast">
      <div className="row between" style={{ alignItems: 'baseline', gap: 8 }}><span className="label">Weather</span><span className="cap">Now observed · rest simulated</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', flex: 1, alignItems: 'end' }}>
        {cols.map((w, i) => (
          <div key={w.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{ height: 110, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{w.p}%</span>
              <div style={{ width: 28, height: Math.max(2, w.p * .7), background: 'var(--blue)', opacity: i ? .55 : 1, borderRadius: '4px 4px 0 0', transition: 'height .5s' }} />
            </div>
            <div style={{ width: '100%', borderTop: '1px solid var(--line)', paddingTop: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: i ? 500 : 700 }}>{w.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{w.track}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="cap">Chance of rain by lap offset</div>
    </section>
  );
}
