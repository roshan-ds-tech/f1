import { useState } from 'react';
import { useApp } from '../state/AppContext';
import { COMPOUND_COLOR } from '../styles/compounds';
import { ProvenanceBadge } from './ui';
import type { CornerState } from '../engine/types';

function Car() {
  return (
    <svg viewBox="0 0 200 420" width="170" aria-label="Top-down car">
      <g fill="var(--surface2)" stroke="var(--text2)" strokeWidth="2">
        <rect x="20" y="70" width="34" height="62" rx="8" /><rect x="146" y="70" width="34" height="62" rx="8" />
        <rect x="16" y="288" width="40" height="76" rx="8" /><rect x="144" y="288" width="40" height="76" rx="8" />
        <path d="M100 18 L112 90 L128 150 L124 290 L116 370 L84 370 L76 290 L72 150 L88 90 Z" />
        <rect x="52" y="8" width="96" height="14" rx="3" /><rect x="50" y="372" width="100" height="22" rx="3" />
      </g>
      <ellipse cx="100" cy="196" rx="13" ry="22" fill="var(--red)" opacity=".85" />
    </svg>
  );
}

function CarViewer() {
  const [tries, setTries] = useState(0);
  return (
    <div className="cars" key={tries}>
      <div style={{ textAlign: 'center' }}>
        <Car />
        <div className="card pad" style={{ position: 'absolute', left: '50%', bottom: 10, transform: 'translateX(-50%)', width: 'max-content', maxWidth: '90%' }}>
          <div style={{ fontWeight: 600, fontSize: 12 }}>3D vehicle unavailable</div>
          <div className="sub">Tyre data and strategy still work.</div>
          <button className="btn" style={{ marginTop: 6 }} onClick={() => setTries(t => t + 1)}>Retry</button>
        </div>
      </div>
    </div>
  );
}

const POS: Record<CornerState['corner'], React.CSSProperties> = {
  FL: { left: 14, top: 14 }, FR: { right: 14, top: 14 }, RL: { left: 14, bottom: 14 }, RR: { right: 14, bottom: 14 },
};
const NAME = { FL: 'Front left', FR: 'Front right', RL: 'Rear left', RR: 'Rear right' } as const;

export function Stage() {
  const { raceState } = useApp();
  return (
    <div className="stage">
      <div style={{ position: 'absolute', right: 14, bottom: 6, zIndex: 2 }}><ProvenanceBadge tag="ESTIMATE" /></div>
      <CarViewer />
      {raceState.corners.map(c => {
        const pct = Math.min(100, Math.round((c.paceLossSec / 1.5) * 100));
        return (
          <div key={c.corner} className="tyre" style={POS[c.corner]}>
            <div className="row between"><b>{c.corner}</b><span className="sub">{NAME[c.corner]}</span></div>
            <div className="sub">{c.compound} · Stint {c.stintNumber}</div>
            <div className="bar"><div style={{ width: `${pct}%`, background: COMPOUND_COLOR[c.compound] }} /></div>
            <div className="kv"><span>Laps to drop-off</span><b className="mono">{c.lapsToDropOff}</b></div>
            <div className="kv"><span>Pace loss</span><b className="mono">{c.paceLossSec.toFixed(2)}s/lap</b></div>
          </div>
        );
      })}
    </div>
  );
}
