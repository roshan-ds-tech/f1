import type { CircuitId } from './engine/types';

/** The circuit this build of PITWISE is tailored to (organiser constraint: choose one). */
export const FOCUS_CIRCUIT: CircuitId = 'baku';

/** Published facts for the focus circuit (formula1.com). Everything else is fitted or assumed, and labelled. */
export const CIRCUIT_FACTS = {
  baku: {
    name: 'Baku City Circuit', country: 'Azerbaijan', lengthKm: 6.003, turns: 20, raceLaps: 51,
    character: 'Street circuit: a long flat-out run along the seafront into tight 90° corners and the narrow old-city castle section. Strong braking zones, Safety Car interruptions are common, and track position can still be won on the straight.',
  },
} as const;
