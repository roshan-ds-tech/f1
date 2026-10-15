import type { CircuitId } from '../engine/types';
import type { RaceFixture } from './types';
import baku from './baku.json';
import madrid from './madrid.json';
import monaco from './monaco.json';
import singapore from './singapore.json';

export const FIXTURES:Record<CircuitId,RaceFixture> = {
  baku: baku as unknown as RaceFixture, madrid: madrid as unknown as RaceFixture,
  monaco: monaco as unknown as RaceFixture, singapore: singapore as unknown as RaceFixture,
};
