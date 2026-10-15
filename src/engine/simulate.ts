import type { CarState, RaceState, Scenario, Strategy } from './types';
import type { Constants } from './constants';
import { lapTime } from './lapTime';
import { wetnessAt } from './scenarios';
import { mulberry32 } from './rng';

interface Entry { car:CarState; total:number; stops:number; pitted:boolean; }

export function simulateDetailed(strategy:Strategy, state:RaceState, scenario:Scenario, k:Constants, seed:number):{position:number; time:number} {
  const rng = mulberry32(seed);
  const cars:Entry[] = [state.us, ...state.rivals].map(c => ({ car:{...c}, total:c.startOffsetSec, stops:0, pitted:false }));
  const us = cars[0];
  const rivalsAheadAtStart = state.rivals.filter(r => r.startOffsetSec < 0).length;
  let usPitLap = -1;

  for (let lap=state.currentLap; lap<=state.totalLaps; lap++) {
    const underSC = scenario.scLaps.has(lap);
    const wetness = wetnessAt(lap, scenario, state);
    for (const e of cars) {
      const c = e.car;
      let pit = false;
      if (c.isUs) {
        pit = strategy.pitLap !== null && lap === strategy.pitLap;
        if (pit) { c.plannedCompound = strategy.compound; usPitLap = lap; }
      } else if (!e.pitted) {
        pit = c.plannedPitLap !== null && lap === c.plannedPitLap;
        if (!pit && usPitLap >= 0 && lap === usPitLap + 1 && rng() < c.coverProbability) pit = true;
      }
      if (pit) {
        e.total += k.PIT_LOSS_BASE * (underSC ? k.SC_PIT_MULTIPLIER : 1) + scenario.pitNoise[e.stops % 4];
        e.stops++; e.pitted = true;
        c.compound = c.plannedCompound; c.tyreAge = 0;
      }
      e.total += lapTime({ basePace:c.basePace, compound:c.compound, tyreAge:c.tyreAge, fuelKg:c.fuelKg,
        degScale:scenario.degScale, wetness, underSC, rng }, k);
      c.tyreAge++;
      c.fuelKg = Math.max(0, c.fuelKg - k.FUEL_BURN_PER_LAP);
    }
  }
  const sorted = [...cars].sort((a,b) => a.total - b.total);
  const pos = sorted.indexOf(us) + 1 + (state.position - 1 - rivalsAheadAtStart);
  return { position:Math.min(20, Math.max(1, pos)), time:us.total };
}

export function simulateOnce(strategy:Strategy, state:RaceState, scenario:Scenario, k:Constants, seed:number):number {
  return simulateDetailed(strategy, state, scenario, k, seed).position;
}
