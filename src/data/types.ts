import type { CircuitId, Provenance } from '../engine/types';
export interface FixtureEntry {
  lap:number; driverNumber:number; lapTimeSec:number; position:number; compound:string;
  tyreAge:number; pitThisLap:boolean; wetness:number; safetyCar:boolean;
  s1?:number|null; s2?:number|null; s3?:number|null;
}
export interface RaceFixture {
  meta:{ circuit:CircuitId; year:number; grandPrix:string; sessionKey:number; totalLaps:number;
         provenance:'HISTORICAL'|'SIMULATED'; fetchedAt:string; gaps:string[] };
  drivers:{ number:number; code:string; name:string; team:string }[];
  timeline:FixtureEntry[];
  weather:{ lap:number; airTempC:number|null; trackTempC:number|null; rainfall:boolean }[];
}
export type { Provenance };
