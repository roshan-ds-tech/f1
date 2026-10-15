import type { Compound, TyreModel } from './types';
import { TYRES, type Constants } from './constants';
import { gauss } from './rng';

export function degradation(m:TyreModel, age:number):number {
  return age <= m.cliffLap ? m.deg*age : m.deg*m.cliffLap + m.cliffDeg*(age-m.cliffLap);
}
export function weatherPenalty(c:Compound, wetness:number):number {
  const slick = c==='SOFT'||c==='MEDIUM'||c==='HARD';
  if (slick) return wetness*wetness*45;
  if (c==='INTER') return Math.max(0,0.35-wetness)*12 + Math.max(0,wetness-0.75)*25;
  return Math.max(0,0.60-wetness)*18;
}

export interface LapInput {
  basePace:number; compound:Compound; tyreAge:number; fuelKg:number;
  degScale:number; wetness:number; underSC:boolean; rng:()=>number;
}
export function lapTime(a:LapInput, k:Constants):number {
  const tyres = k.TYRES ?? TYRES;
  return a.basePace
    + tyres[a.compound].offset
    + degradation(tyres[a.compound], a.tyreAge) * a.degScale
    + a.fuelKg * k.SEC_PER_KG
    + weatherPenalty(a.compound, a.wetness)
    + (a.underSC ? k.SC_LAP_DELTA : 0)
    + gauss(a.rng) * k.PACE_SIGMA;
}
