import type { Compound, RaceState, Strategy } from '../engine/types';
import { TYRES, type Constants } from '../engine/constants';
import { degradation, weatherPenalty } from '../engine/lapTime';

export const COMPONENTS = [
  ['Reference pace', 'base', 'reference pace'],
  ['Tyre pace and wear', 'tyre', 'tyre pace and wear'],
  ['Weather and track', 'wx', 'weather and track pace'],
  ['Fuel load', 'fuel', 'fuel load'],
  ['Safety Car laps', 'sc', 'Safety Car laps'],
  ['Pit stops', 'pit', 'pit-stop time'],
] as const;
export type Part = typeof COMPONENTS[number][1];
export type Breakdown = Record<Part, number> & { total: number; stops: number };

export function centralWetness(state: RaceState, lap: number) {
  const r = state.rainArrivalLap;
  if (r === null) return state.wetnessNow;
  const t = (lap - r) / 3;
  return t <= 0 ? state.wetnessNow : t >= 1 ? state.rainIntensity : state.wetnessNow + (state.rainIntensity - state.wetnessNow) * t;
}
const scLaps = (s: RaceState) => new Set(s.safetyCarActive ? Array.from({ length: s.safetyCarLapsRemaining }, (_, i) => s.currentLap + i) : []);

export function breakdown(state: RaceState, st: Strategy, k: Constants): Breakdown {
  const T = k.TYRES ?? TYRES, sc = scLaps(state);
  const b: Breakdown = { base: 0, tyre: 0, wx: 0, fuel: 0, sc: 0, pit: 0, total: 0, stops: 0 };
  let comp: Compound = state.us.compound, age = state.us.tyreAge, fuel = state.us.fuelKg;
  for (let lap = state.currentLap; lap <= state.totalLaps; lap++) {
    if (st.pitLap === lap) { b.pit += k.PIT_LOSS_BASE * (sc.has(lap) ? k.SC_PIT_MULTIPLIER : 1); b.stops++; comp = st.compound; age = 0; }
    b.base += state.us.basePace;
    b.tyre += T[comp].offset + degradation(T[comp], age) * k.DEG_MEAN_SCALE;
    b.wx += weatherPenalty(comp, centralWetness(state, lap));
    b.fuel += fuel * k.SEC_PER_KG;
    if (sc.has(lap)) b.sc += k.SC_LAP_DELTA;
    age++; fuel = Math.max(0, fuel - k.FUEL_BURN_PER_LAP);
  }
  b.total = b.base + b.tyre + b.wx + b.fuel + b.sc + b.pit;
  return b;
}

export const tyreLoss = (c: Compound, age: number, k: Constants, scale = k.DEG_MEAN_SCALE) => degradation((k.TYRES ?? TYRES)[c], age) * scale;

export function crossoverLap(state: RaceState, k: Constants, wetter: Compound, than: Compound[]) {
  const T = k.TYRES ?? TYRES;
  const pace = (c: Compound, lap: number) => T[c].offset + weatherPenalty(c, centralWetness(state, lap));
  for (let lap = state.currentLap; lap <= state.totalLaps; lap++) if (pace(wetter, lap) < Math.min(...than.map(c => pace(c, lap)))) return lap;
  return null;
}
