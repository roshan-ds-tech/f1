import type { RaceState, Scenario } from './types';
import { DEFAULTS, type Constants } from './constants';
import { mulberry32, gauss } from './rng';

export function sampleScenarios(state:RaceState, count:number, seed:number, k:Constants = DEFAULTS):Scenario[] {
  const rng = mulberry32(seed);
  const out:Scenario[] = [];
  for (let i=0;i<count;i++) {
    const scLaps = new Set<number>();
    if (state.safetyCarActive) {
      for (let l=state.currentLap; l<state.currentLap+state.safetyCarLapsRemaining; l++) scLaps.add(l);
    }
    const startLap = state.currentLap + (state.safetyCarActive ? state.safetyCarLapsRemaining : 0);
    for (let l=startLap; l<=state.totalLaps; l++) {
      if (scLaps.has(l)) continue;
      if (rng() < state.scProbPerLap) {
        const len = 3 + Math.floor(rng()*3);
        for (let j=0;j<len;j++) scLaps.add(l+j);
      }
    }
    const rainArrivalLap = state.rainArrivalLap === null ? null
      : Math.round(gauss(rng)*state.rainArrivalSigma + state.rainArrivalLap);
    const degScale = Math.min(1.6, Math.max(0.5, k.DEG_MEAN_SCALE + gauss(rng)*k.DEG_UNCERTAINTY));
    const pitNoise = [0,1,2,3].map(() => gauss(rng)*k.PIT_NOISE_SIGMA);
    out.push({ scLaps, rainArrivalLap, degScale, pitNoise });
  }
  return out;
}

export function wetnessAt(lap:number, sc:Scenario, state:RaceState):number {
  if (sc.rainArrivalLap === null) return state.wetnessNow;
  const t = (lap - sc.rainArrivalLap) / 3;
  if (t <= 0) return state.wetnessNow;
  if (t >= 1) return state.rainIntensity;
  return state.wetnessNow + (state.rainIntensity - state.wetnessNow) * t;
}
