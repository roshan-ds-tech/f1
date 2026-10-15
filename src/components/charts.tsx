import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';
import type { Compound, RaceState, Strategy } from '../engine/types';
import { TYRES, DEFAULTS, type Constants } from '../engine/constants';
import { degradation, lapTime } from '../engine/lapTime';
import { COMPOUND_COLOR } from '../styles/compounds';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const axis = { stroke: 'var(--text2)', fontSize: 11 };

/** Deterministic modelled lap times for one strategy (no noise, pit loss excluded, SC laps excluded). */
export function modelLapSeries(state: RaceState, st: Strategy, k: Constants) {
  const out: { lap: number; t: number | null }[] = [];
  let comp: Compound = state.us.compound, age = state.us.tyreAge, fuel = state.us.fuelKg;
  for (let lap = state.currentLap; lap <= state.totalLaps; lap++) {
    if (st.pitLap === lap) { comp = st.compound; age = 0; }
    const rainLap = state.rainArrivalLap;
    let wet = state.wetnessNow;
    if (rainLap !== null && lap >= rainLap) wet = Math.min(state.rainIntensity, state.wetnessNow + (state.rainIntensity - state.wetnessNow) * ((lap - rainLap + 1) / 3));
    const t = lapTime({ basePace: state.us.basePace, compound: comp, tyreAge: age, fuelKg: fuel, degScale: k.DEG_MEAN_SCALE, wetness: wet, underSC: false, rng: () => 0.5 }, { ...k, PACE_SIGMA: 0 });
    out.push({ lap, t: t });
    age++; fuel = Math.max(0, fuel - k.FUEL_BURN_PER_LAP);
  }
  return out;
}

export function LapTimeChart({ state, strategy, k }: { state: RaceState; strategy: Strategy | undefined; k: Constants }) {
  const data = strategy ? modelLapSeries(state, strategy, k) : [];
  const b = state.us.basePace;
  const ticks = [b - 6, b, b + 6];
  const scEnd = state.safetyCarActive ? state.currentLap + state.safetyCarLapsRemaining - 1 : null;
  return (
    <div>
      <div className="row between"><span className="label">Lap time</span><span className="sub">Pit loss excluded · MODEL ESTIMATE</span></div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="lap" {...axis} tickFormatter={l => `L${l}`} />
          <YAxis {...axis} domain={[ticks[0], ticks[2]]} ticks={ticks} tickFormatter={fmt} allowDataOverflow width={42} />
          <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)' }} formatter={(v) => [fmt(Number(v)) + '.' + String(Math.round((Number(v) % 1) * 10)), 'Lap']} labelFormatter={l => `Lap ${l}`} />
          <Line dataKey="t" stroke="var(--text)" dot={false} strokeWidth={2} isAnimationActive={false} />
          {scEnd !== null && <ReferenceLine x={scEnd} stroke="var(--amber)" strokeDasharray="3 3" label={{ value: 'SC', fill: 'var(--amber)', fontSize: 10 }} />}
          {strategy?.pitLap != null && <ReferenceLine x={strategy.pitLap} stroke="var(--red)" strokeDasharray="3 3" label={{ value: 'PIT', fill: 'var(--red)', fontSize: 10 }} />}
          {state.rainArrivalLap !== null && <ReferenceLine x={state.rainArrivalLap} stroke="var(--blue)" strokeDasharray="3 3" label={{ value: 'RAIN', fill: 'var(--blue)', fontSize: 10 }} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TyreDegChart({ state, k, degLabel }: { state: RaceState; k: Constants; degLabel: string }) {
  const T = k.TYRES ?? TYRES;
  const comps: Compound[] = ['SOFT', 'MEDIUM', 'HARD', 'INTER', 'WET'];
  const data = Array.from({ length: 41 }, (_, age) => {
    const row: Record<string, number> = { age };
    for (const c of comps) row[c] = Math.min(100, (degradation(T[c], age) * k.DEG_MEAN_SCALE) / (degradation(T[c], T[c].cliffLap + 12)) * 100);
    return row;
  });
  return (
    <div>
      <div className="row between"><span className="label">Tyre degradation</span><span className="sub">Model · {degLabel}</span></div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="age" {...axis} ticks={[0, 20, 40]} />
          <YAxis {...axis} domain={[0, 100]} ticks={[0, 50, 100]} tickFormatter={v => `${v}%`} width={40} />
          {comps.map(c => <Line key={c} dataKey={c} stroke={COMPOUND_COLOR[c]} dot={false} strokeWidth={2} isAnimationActive={false} />)}
          <ReferenceLine x={Math.min(40, state.us.tyreAge)} stroke="var(--text)" strokeDasharray="3 3" label={{ value: 'now', fill: 'var(--text)', fontSize: 10 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const cdf = (x: number) => { const t = 1 / (1 + 0.2316419 * Math.abs(x)); const d = 0.3989423 * Math.exp(-x * x / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; };

export function WeatherChart({ state }: { state: RaceState }) {
  const arr = state.rainArrivalLap;
  const data = Array.from({ length: 16 }, (_, off) => ({
    off, p: arr === null ? 0 : Math.round(cdf((state.currentLap + off - arr) / state.rainArrivalSigma) * 100),
  }));
  return (
    <div>
      <div className="row between"><span className="label">Weather</span><span className="sub">Now observed · rest simulated</span></div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="off" {...axis} tickFormatter={o => `+${o}`} />
          <YAxis {...axis} domain={[0, 100]} ticks={[0, 50, 100]} tickFormatter={v => `${v}%`} width={40} />
          <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)' }} formatter={(v) => [`${v}%`, 'Chance of rain (simulated)']} labelFormatter={o => `+${o} laps`} />
          <Area dataKey="p" stroke="var(--blue)" fill="var(--blue)" fillOpacity={0.18} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export { DEFAULTS };
