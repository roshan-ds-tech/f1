import type { Compound } from '../engine/types';
export const COMPOUND_COLOR: Record<Compound, string> = {
  SOFT: 'var(--red)', MEDIUM: 'var(--med)', HARD: 'var(--hard)', INTER: 'var(--inter)', WET: 'var(--blue)',
};
export const COMPOUND_LETTER: Record<Compound, string> = { SOFT:'S', MEDIUM:'M', HARD:'H', INTER:'I', WET:'W' };
