import type { Compound } from '../engine/types';
import { COMPOUND_COLOR, COMPOUND_LETTER } from '../styles/compounds';

/** Photos for all five compounds (from the Tyre Analysis design). The ring fallback stays for safety. */
export const TYRE_IMG: Partial<Record<Compound, string>> = { SOFT: '/tyres/soft.webp', MEDIUM: '/tyres/medium.webp', HARD: '/tyres/hard.webp', INTER: '/tyres/inter.webp', WET: '/tyres/wet.webp' };
const IMG = TYRE_IMG;
export const COMPOUND_NAME: Record<Compound, string> = { SOFT: 'Soft', MEDIUM: 'Medium', HARD: 'Hard', INTER: 'Intermediate', WET: 'Wet' };

export function TyreThumb({ c, w = 46, h = 42, radius = 8 }: { c: Compound; w?: number; h?: number; radius?: number }) {
  const src = IMG[c];
  return (
    <div className="tile" title={`${COMPOUND_NAME[c]} tyre`} style={{ width: w, height: h, borderRadius: radius }}>
      {src ? <img src={src} alt={`${COMPOUND_NAME[c]} tyre`} style={{ width: w - 2, height: h - 2 }} />
        : <div style={{ width: Math.round(h * .66), height: Math.round(h * .66), borderRadius: '50%', border: `3px solid ${COMPOUND_COLOR[c]}`, background: '#1D2127', color: '#fff', fontSize: 9.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{COMPOUND_LETTER[c]}</div>}
    </div>
  );
}
