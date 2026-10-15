import type { CircuitId } from '../engine/types';
import baku from './baku.calibration.json';
import bakuOutline from './baku.outline.json';

export interface Calibration {
  circuit: string; source: string; provenance: 'HISTORICAL-FIT'; fittedAt: string;
  pitLossSec: number; pitLossSamples: number; basePaceSec: number; cleanLaps: number;
  deg: Partial<Record<'SOFT' | 'MEDIUM' | 'HARD' | 'INTER' | 'WET', number>>;
  stintsUsed: Record<string, number>; safetyCarLapsRecorded: number[]; notes: string[];
}
export interface Outline { circuit: string; source: string; viewBox: string; sectors: [string, string, string]; start: [number, number] }

/** Parameters fitted from recorded races by scripts/calibrate.mjs. */
export const CALIBRATION: Partial<Record<CircuitId, Calibration>> = { baku: baku as Calibration };
/** Real outlines built from OpenF1 car positions by scripts/fetchTrackOutline.mjs. */
export const OUTLINES: Partial<Record<CircuitId, Outline>> = { baku: bakuOutline as unknown as Outline };
