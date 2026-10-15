import { useState } from 'react';
import { useApp } from '../state/AppContext';
import { ASSUMPTION_SOURCES, DEFAULTS, TYRES } from '../engine/constants';
import type { Compound, TyreModel } from '../engine/types';
import { Card, ProvenanceBadge } from './ui';

export function Assumptions({ startOpen = false }: { startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const { k, setK, setTyre, resetAssumptions } = useApp();
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
                  <td className="sub">{ASSUMPTION_SOURCES[key]}</td>
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
          <button className="btn" style={{ marginTop: 10 }} onClick={resetAssumptions}>Reset to defaults</button>
        </div>
      )}
    </Card>
  );
}
