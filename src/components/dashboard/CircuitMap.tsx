import type { CircuitId } from '../../engine/types';
import { OUTLINES } from '../../data/calibration';

const SCHEMATIC: Record<CircuitId, { s: [string, string, string]; start: [number, number] }> = {
  madrid: {
    s: ['M40 104 C 40 58, 70 30, 120 34 L 190 40 C 220 42, 230 20, 255 28',
        'M255 28 C 285 38, 280 80, 250 88 C 220 96, 215 116, 185 118',
        'M185 118 L 70 124 C 50 126, 40 118, 40 104'],
    start: [40, 104],
  },
  baku: {
    s: ['M30 110 L 30 40 L 70 40 L 80 22 L 120 22 L 120 50',
        'M120 50 L 150 50 L 160 30 L 270 30 L 280 44',
        'M280 44 L 280 110 L 30 110'],
    start: [30, 80],
  },
  monaco: {
    s: ['M60 112 L 150 118 C 185 120, 205 104, 220 86 L 262 60',
        'M262 60 C 278 48, 268 26, 246 28 L 180 40 C 160 44, 150 30, 120 28',
        'M120 28 C 80 26, 52 40, 46 66 C 42 86, 44 110, 60 112'],
    start: [100, 115],
  },
  singapore: {
    s: ['M36 98 L 36 46 L 96 46 L 96 22 L 176 22',
        'M176 22 L 176 52 L 248 52 L 266 72 L 266 100',
        'M266 100 L 200 100 L 190 118 L 70 118 L 36 98'],
    start: [36, 72],
  },
};

export function CircuitMap({ circuit, deltas, width = 116, sectorColors }: { circuit: CircuitId; deltas: [number, number, number] | null; width?: number; sectorColors?: [string, string, string] }) {
  const real = OUTLINES[circuit];
  const o = real ? { s: real.sectors, start: real.start } : SCHEMATIC[circuit];
  const col = (i: number) => deltas === null ? (sectorColors?.[i] ?? 'var(--grid)') : deltas[i] <= 0 ? 'var(--green)' : 'var(--red)';
  return (
    <svg viewBox="0 0 300 140" style={{ width, flex: '0 0 auto', height: 'auto', display: 'block', overflow: 'visible' }} aria-label={real ? `Circuit outline from ${real.source}` : 'Circuit sectors (schematic)'}>
      {o.s.map((d, i) => <path key={i} d={d} style={{ fill: 'none', stroke: col(i), strokeWidth: real ? (deltas ? 5 : 4.5) : (deltas ? 7 : 6), strokeLinecap: 'round', strokeLinejoin: 'round' }} />)}
      <circle cx={o.start[0]} cy={o.start[1]} r={5} style={{ fill: 'var(--text)', stroke: 'var(--surface)', strokeWidth: 2 }} />
    </svg>
  );
}
