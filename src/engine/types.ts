export type Compound = 'SOFT' | 'MEDIUM' | 'HARD' | 'INTER' | 'WET';
export type Provenance = 'HISTORICAL' | 'LIVE' | 'SIMULATED' | 'ESTIMATE';
export type CircuitId = 'baku' | 'madrid' | 'monaco' | 'singapore';

export interface TyreModel { offset:number; deg:number; cliffLap:number; cliffDeg:number; }

export interface CornerState {
  corner:'FL'|'FR'|'RL'|'RR';
  compound:Compound; stintAge:number; stintNumber:number;
  paceLossSec:number;
  lapsToDropOff:number;
  trend:'stable'|'rising'|'steep';
}

export interface CarState {
  id:string; name:string; isUs:boolean;
  basePace:number;
  compound:Compound; tyreAge:number; fuelKg:number;
  startOffsetSec:number;
  plannedPitLap:number|null; plannedCompound:Compound;
  coverProbability:number; hasPitted:boolean;
}

export interface RaceState {
  circuit:CircuitId; sessionName:string; driverCode:string;
  currentLap:number; totalLaps:number; position:number;
  us:CarState; rivals:CarState[]; corners:CornerState[];
  wetnessNow:number;
  rainArrivalLap:number|null; rainArrivalSigma:number; rainIntensity:number;
  trackTempC:number|null; airTempC:number|null;
  safetyCarActive:boolean; safetyCarLapsRemaining:number; scProbPerLap:number;
  provenance:Provenance;
}

export interface Strategy { id:string; label:string; plan:string; pitLap:number|null; compound:Compound; }

export interface Scenario {
  scLaps:Set<number>; rainArrivalLap:number|null; degScale:number; pitNoise:number[];
}

export interface StrategyResult {
  strategy:Strategy;
  meanTime:number; medianDelta:number; p5:number; p95:number;
  podiumShare:number; winShare:number;
  positionHistogram:number[]; expectedPosition:number;
  risk:'Low'|'Medium'|'High';
}

export interface ScenarioInputs {
  wx:'dry'|'light'|'heavy';
  rainArrivalOffset:number;
  sc:boolean;
  deg:'low'|'nominal'|'high';
  tyreAge:number;
}
export const DEFAULT_SCENARIO:ScenarioInputs =
  { wx:'dry', rainArrivalOffset:7, sc:true, deg:'nominal', tyreAge:24 };
