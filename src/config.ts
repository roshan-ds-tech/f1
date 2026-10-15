import type { CircuitId } from './engine/types';

export const FOCUS_CIRCUIT: CircuitId = 'baku';

export const CIRCUIT_FACTS = {
  baku: {
    name: 'Baku City Circuit', country: 'Azerbaijan', lengthKm: 6.003, turns: 20, raceLaps: 51,
    character: 'Street circuit: a long flat-out run along the seafront into tight 90° corners and the narrow old-city castle section. Strong braking zones, Safety Car interruptions are common, and track position can still be won on the straight.',
  },
} as const;
