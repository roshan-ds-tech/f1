import { useState } from 'react';
import { useApp } from '../state/AppContext';
import { ASSUMPTION_SOURCES, DEFAULTS, TYRES } from '../engine/constants';
import type { Compound, TyreModel } from '../engine/types';
import { Card, ProvenanceBadge } from './ui';
import { CALIBRATION } from '../data/calibration';

export function Assumptions({ startOpen = false }: { startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const { k, setK, setTyre, resetAssumptions, circuit, kOverrides } = useApp();
  const cal = CALIBRATION[circuit];
  const source = (key: string) => key === 'PIT_LOSS_BASE' && cal && kOverrides.PIT_LOSS_BASE === undefined
    ? `fitted: median of ${cal.pitLossSamples} green-flag stops, ${cal.source}` : ASSUMPTION_SOURCES[key];
  const T = k.TYRES ?? TYRES;
  return (
    <Card title="Assumptions" right={<div className="row"><ProvenanceBadge tag="ESTIMATE" /><button className="btn" onClick={() => setOpen(o => !o)}>{open ? 'Collapse' : 'Expand'}</button></div>}>
      <div className="sub">Every constant behind the recommendation. Edit a value to re-run the engine.</div>
      {open && (
        <div style={{ marginTop: 10 }}>
          <table className="t">
            <thead><tr><th className="label">Constant</th><th className="label">Value</th><th className="label">Source</th></tr></thead>
            <tbody>
              {(Object.keys(DEFAULTS) as (keyof typeof DEFAULTS)[]).map(key => (
                <tr key={key}>
                  <td className="mono">{key}</td>
                  <td><input className="input mono" type="number" step="any" value={k[key]} onChange={e => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) setK(key, v); }} /></td>
                  <td className="sub">{source(key)}</td>
                </tr>
              ))}
              {(Object.keys(T) as Compound[]).map(c => (
                <tr key={c}>
                  <td className="mono">TYRES.{c}</td>
                  <td><div className="row wrap">{(['offset', 'deg', 'cliffLap', 'cliffDeg'] as (keyof TyreModel)[]).map(f => (
                    <label key={f} className="sub">{f} <input className="input mono" style={{ width: 70 }} type="number" step="any" value={T[c][f]} onChange={e => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) setTyre(c, f, v); }} /></label>
                  ))}</div></td>
                  <td className="sub">{ASSUMPTION_SOURCES['TYRES.*']}</td>
                </tr>
              ))}
              <tr><td className="mono">CIRCUITS.*</td><td className="sub">see circuit selector</td><td className="sub">{ASSUMPTION_SOURCES['CIRCUITS.*']}</td></tr>
            </tbody>
          </table>
          {cal && (
            <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 10, background: 'var(--surface2)', fontSize: 12.5, lineHeight: 1.55 }}>
              <div className="label" style={{ marginBottom: 6 }}>Fitted from {cal.source}</div>
              <div>Tyre wear slope: {Object.entries(cal.deg).map(([c, v]) => `${c} ${v?.toFixed(3)} s/lap (${cal.stintsUsed[c]} stints)`).join(' · ')}. Model defaults: MEDIUM {TYRES.MEDIUM.deg.toFixed(3)}, HARD {TYRES.HARD.deg.toFixed(3)}.</div>
              <div style={{ color: 'var(--text2)', marginTop: 4 }}>Baku's track gets faster through the race, which hides tyre wear in lap times, so these fitted slopes are a lower bound. They are not applied by default.</div>
              <button className="btn sm" style={{ marginTop: 10 }} onClick={() => (Object.entries(cal.deg) as [Compound, number][]).forEach(([c, v]) => setTyre(c, 'deg', v))}>Apply fitted tyre wear</button>
              <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: 'var(--text2)' }}>{cal.notes.map(n => <li key={n}>{n}</li>)}</ul>
            </div>
          )}
          <button className="btn" style={{ marginTop: 10 }} onClick={resetAssumptions}>Reset to defaults</button>
        </div>
      )}
    </Card>
  );
}
