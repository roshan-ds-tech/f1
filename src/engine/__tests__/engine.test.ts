import { describe, it, expect } from 'vitest';
import { degradation, lapTime } from '../lapTime';
import { TYRES, DEFAULTS } from '../constants';
import { mulberry32 } from '../rng';
import { sampleScenarios } from '../scenarios';
import { simulateOnce } from '../simulate';
import { recommend } from '../recommend';
import { ZERO_HOUR } from '../../state/zeroHour';
import type { RaceState } from '../types';

const base = (over:Partial<RaceState> = {}):RaceState => ({ ...ZERO_HOUR, ...over });
const lt = (age:number, degScale = 1, compound:'SOFT'|'MEDIUM'|'HARD' = 'MEDIUM') =>
  lapTime({ basePace:92, compound, tyreAge:age, fuelKg:0, degScale, wetness:0, underSC:false, rng:()=>0.5 }, { ...DEFAULTS, PACE_SIGMA:0 });

describe('engine', () => {
  it('1. degradation monotonic and steeper past cliff', () => {
    const m = TYRES.MEDIUM;
    for (let a=1;a<50;a++) expect(degradation(m,a)).toBeGreaterThan(degradation(m,a-1));
    expect(degradation(m,m.cliffLap+5)-degradation(m,m.cliffLap)).toBeGreaterThan(degradation(m,5));
  });
  it('2. fresh tyre faster than 20-lap-old of same compound', () => {
    expect(lt(0)).toBeLessThan(lt(20));
  });
  it('3. degScale 1.0 -> 1.5 increases lap time', () => {
    expect(lt(20,1.5)).toBeGreaterThan(lt(20,1.0));
  });
  it('4. simulateOnce deterministic for same seed', () => {
    const sc = sampleScenarios(ZERO_HOUR, 1, 5)[0];
    const s = { id:'x', label:'x', plan:'x', pitLap:32, compound:'HARD' as const };
    const r = Array.from({length:10}, () => simulateOnce(s, ZERO_HOUR, sc, DEFAULTS, 9));
    expect(new Set(r).size).toBe(1);
  });
  it('5. heavily degraded tyre with 20 laps left -> no-stop never first', () => {
    const us = { ...ZERO_HOUR.us, compound:'SOFT' as const, tyreAge:30 };
    const st = base({ currentLap:34, totalLaps:54, us, safetyCarActive:false, safetyCarLapsRemaining:0, rainArrivalLap:null });
    const res = recommend(st, { ...DEFAULTS, COARSE_SCENARIOS:60, FINE_SCENARIOS:200 }, 1);
    expect(res[0].strategy.pitLap).not.toBeNull();
  });
  it('6. safety car active -> best pit lap within 2 laps of current', () => {
    const res = recommend(ZERO_HOUR, { ...DEFAULTS, COARSE_SCENARIOS:60, FINE_SCENARIOS:200 }, 3);
    const p = res[0].strategy.pitLap!;
    expect(p).toBeLessThanOrEqual(ZERO_HOUR.currentLap+2);
  });
  it('7. rival 18s ahead at identical pace finishes ahead', () => {
    const rival = { ...ZERO_HOUR.us, id:'r', isUs:false, startOffsetSec:-18, plannedPitLap:null };
    const st = base({ rivals:[rival], position:2, safetyCarActive:false, rainArrivalLap:null });
    const sc = { scLaps:new Set<number>(), rainArrivalLap:null, degScale:1, pitNoise:[0,0,0,0] };
    const pos = simulateOnce({ id:'n', label:'n', plan:'n', pitLap:null, compound:'SOFT' }, st, sc, { ...DEFAULTS, PACE_SIGMA:0 }, 1);
    expect(pos).toBe(2);
  });
  it('8. recommend identical across calls with same seed', () => {
    const k = { ...DEFAULTS, COARSE_SCENARIOS:40, FINE_SCENARIOS:100 };
    const a = recommend(ZERO_HOUR, k, 11), b = recommend(ZERO_HOUR, k, 11);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(mulberry32(1)()).toBe(mulberry32(1)());
  });
});
