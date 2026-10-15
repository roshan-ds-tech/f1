import type { CarState, CircuitId, Compound, CornerState, RaceState, ScenarioInputs } from '../engine/types';
import { CIRCUITS, DEFAULTS, TYRES } from '../engine/constants';
import { degradation } from '../engine/lapTime';
import type { RaceFixture } from '../data/types';
import { ZERO_HOUR } from './zeroHour';
import { CALIBRATION } from '../data/calibration';

export const circuitBasePace = (c:CircuitId) => CALIBRATION[c]?.basePaceSec ?? CIRCUITS[c].basePace;

export type Mode = 'replay' | 'live' | 'scenario';
export const DEG_PRESETS = { low:{ mean:0.85, mult:0.75 }, nominal:{ mean:1.0, mult:1.0 }, high:{ mean:1.2, mult:1.35 } } as const;

export function degConstants(deg:ScenarioInputs['deg']) {
  return { DEG_MEAN_SCALE:DEG_PRESETS[deg].mean, DEG_UNCERTAINTY:DEFAULTS.DEG_UNCERTAINTY*DEG_PRESETS[deg].mult };
}

const WX = { dry:0, light:0.35, heavy:0.9 } as const;

export function cornersFor(compound:Compound, age:number, stint:number):CornerState[] {
  const m = TYRES[compound];
  const base = degradation(m, age);
  return (['FL','FR','RL','RR'] as const).map((corner, i) => {
    const f = [1.1, 1.0, 0.85, 1.25][i];
    const loss = base * f;
    const left = Math.max(0, Math.round((m.cliffLap - age) / f));
    return { corner, compound, stintAge:age, stintNumber:stint, paceLossSec:+loss.toFixed(2), lapsToDropOff:left,
      trend: left <= 5 ? 'steep' : left <= 10 ? 'rising' : 'stable' };
  });
}

function scenarioState(circuit:CircuitId, lap:number, sc:ScenarioInputs):RaceState {
  const z = ZERO_HOUR, c = CIRCUITS[circuit];
  const shift = circuitBasePace(circuit) - CIRCUITS.madrid.basePace;
  const total = z.totalLaps;
  const cur = Math.min(lap, total - 2);
  const wet = WX[sc.wx];
  return {
    ...z, circuit, totalLaps:total, currentLap:cur,
    us:{ ...z.us, basePace:z.us.basePace + shift, tyreAge:sc.tyreAge },
    rivals:z.rivals.map(r => ({ ...r, basePace:r.basePace + shift,
      plannedPitLap: r.plannedPitLap === null ? null : Math.min(total - 1, r.plannedPitLap - z.currentLap + cur) })),
    corners:cornersFor(z.us.compound, sc.tyreAge, 1),
    wetnessNow:0,
    rainArrivalLap: wet === 0 ? null : Math.min(total, cur + sc.rainArrivalOffset),
    rainIntensity: wet,
    safetyCarActive:sc.sc, safetyCarLapsRemaining:sc.sc ? 3 : 0,
    scProbPerLap:c.scProbPerLap, provenance:'SIMULATED',
  };
}

function replayState(fx:RaceFixture, lap:number, driverCode:string, circuit:CircuitId):RaceState {
  const past = fx.timeline.filter(e => e.lap <= lap);
  const c = CIRCUITS[circuit];
  const driver = fx.drivers.find(d => d.code === driverCode) ?? fx.drivers[0];
  const cum = new Map<number, number>(), last = new Map<number, typeof past[number]>();
  for (const e of past) { cum.set(e.driverNumber, (cum.get(e.driverNumber) ?? 0) + e.lapTimeSec); last.set(e.driverNumber, e); }
  const mkCar = (num:number, isUs:boolean, usTime:number):CarState => {
    const e = last.get(num)!;
    const comp = (['SOFT','MEDIUM','HARD','INTER','WET'].includes(e.compound) ? e.compound : 'MEDIUM') as Compound;
    const stint = new Set(past.filter(p => p.driverNumber === num && p.pitThisLap).map(p => p.lap)).size;
    return { id:isUs ? 'us' : `d${num}`, name:fx.drivers.find(d => d.number === num)?.code ?? `#${num}`, isUs,
      basePace:circuitBasePace(circuit), compound:comp, tyreAge:e.tyreAge, fuelKg:Math.max(0, (fx.meta.totalLaps - lap) * DEFAULTS.FUEL_BURN_PER_LAP),
      startOffsetSec:isUs ? 0 : (cum.get(num) ?? 0) - usTime, plannedPitLap:null, plannedCompound:stint > 0 ? 'HARD' : 'MEDIUM',
      coverProbability:0.3, hasPitted:stint > 0 };
  };
  const usNum = last.has(driver.number) ? driver.number : [...last.keys()][0];
  const usTime = cum.get(usNum) ?? 0;
  const ue = last.get(usNum)!;
  const others = [...last.keys()].filter(n => n !== usNum)
    .sort((a, b) => Math.abs((cum.get(a) ?? 0) - usTime) - Math.abs((cum.get(b) ?? 0) - usTime)).slice(0, 5);
  const us = mkCar(usNum, true, usTime);
  const wx = fx.weather.filter(w => w.lap <= lap).at(-1);
  return {
    circuit, sessionName:fx.meta.grandPrix, driverCode:driver.code, currentLap:Math.max(1, lap), totalLaps:fx.meta.totalLaps,
    position:ue.position, us, rivals:others.map(n => mkCar(n, false, usTime)),
    corners:cornersFor(us.compound, us.tyreAge, us.hasPitted ? 2 : 1),
    wetnessNow:ue.wetness, rainArrivalLap:null, rainArrivalSigma:4, rainIntensity:Math.max(0.4, ue.wetness),
    trackTempC:wx?.trackTempC ?? null, airTempC:wx?.airTempC ?? null,
    safetyCarActive:ue.safetyCar, safetyCarLapsRemaining:ue.safetyCar ? 2 : 0, scProbPerLap:c.scProbPerLap,
    provenance:fx.meta.provenance === 'HISTORICAL' ? 'HISTORICAL' : 'SIMULATED',
  };
}

export function deriveRaceState(a:{ mode:Mode; circuit:CircuitId; lap:number; scenario:ScenarioInputs; fixture:RaceFixture|null; driverCode:string }):RaceState {
  if (a.mode === 'replay' && a.fixture) return replayState(a.fixture, a.lap, a.driverCode, a.circuit);
  return scenarioState(a.circuit, a.mode === 'scenario' ? a.lap : ZERO_HOUR.currentLap, a.scenario);
}
