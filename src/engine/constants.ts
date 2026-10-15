import type { Compound, TyreModel, CircuitId } from './types';

export const TYRES:Record<Compound,TyreModel> = {
  SOFT:  { offset:0.00, deg:0.12, cliffLap:16, cliffDeg:0.45 },
  MEDIUM:{ offset:0.55, deg:0.07, cliffLap:26, cliffDeg:0.30 },
  HARD:  { offset:1.15, deg:0.04, cliffLap:38, cliffDeg:0.20 },
  INTER: { offset:4.50, deg:0.09, cliffLap:22, cliffDeg:0.35 },
  WET:   { offset:9.00, deg:0.05, cliffLap:30, cliffDeg:0.25 },
};

export const DEFAULTS = {
  PIT_LOSS_BASE:21.5, SC_PIT_MULTIPLIER:0.45, SC_LAP_DELTA:28.0,
  FUEL_BURN_PER_LAP:1.75, SEC_PER_KG:0.033,
  PACE_SIGMA:0.25, DEG_UNCERTAINTY:0.15, PIT_NOISE_SIGMA:1.2,
  DEG_MEAN_SCALE:1.0, COARSE_SCENARIOS:200, FINE_SCENARIOS:2000, SHORTLIST_SIZE:5,
};
export type Constants = typeof DEFAULTS & { TYRES?:Record<Compound,TyreModel> };

export const CIRCUITS:Record<CircuitId,{
  name:string; totalLaps:number; pitLossBase:number; basePace:number; scProbPerLap:number;
}> = {
  baku:      { name:'Baku City Circuit',  totalLaps:51, pitLossBase:19.5, basePace:103.0, scProbPerLap:0.030 },
  madrid:    { name:'Madrid — Madring',   totalLaps:57, pitLossBase:21.0, basePace: 92.0, scProbPerLap:0.015 },
  monaco:    { name:'Circuit de Monaco',  totalLaps:78, pitLossBase:23.5, basePace: 73.5, scProbPerLap:0.035 },
  singapore: { name:'Singapore — Marina Bay', totalLaps:62, pitLossBase:22.5, basePace: 95.5, scProbPerLap:0.040 },
};

export const ASSUMPTION_SOURCES:Record<string,string> = {
  PIT_LOSS_BASE:'assumption — circuit-specific, adjustable',
  SC_PIT_MULTIPLIER:'assumption — not a universal fact, adjustable',
  SC_LAP_DELTA:'assumption — circuit-specific',
  FUEL_BURN_PER_LAP:'assumption — adjustable',
  SEC_PER_KG:'assumption — adjustable',
  PACE_SIGMA:'assumption — adjustable',
  DEG_UNCERTAINTY:'assumption — adjustable',
  PIT_NOISE_SIGMA:'assumption — adjustable',
  DEG_MEAN_SCALE:'assumption — mean tyre-wear multiplier, set by the Tyre degradation control',
  COARSE_SCENARIOS:'engine setting — Monte Carlo sample count, stage 1',
  FINE_SCENARIOS:'engine setting — Monte Carlo sample count, stage 2',
  SHORTLIST_SIZE:'engine setting — candidates kept after stage 1',
  'TYRES.*':'illustrative — would be fitted from historical stint data',
  'CIRCUITS.*':'assumption — explicit per-circuit parameters, not measured',
};
