import { useState } from 'react';
import { useApp } from '../state/AppContext';
import { Card, ProvenanceBadge } from './ui';
import { deriveRaceState } from '../state/deriveRaceState';
import { recommend } from '../engine/recommend';
import { DEFAULT_SCENARIO } from '../engine/types';

export function PostRace() {
  const { lap, raceState, fixture, driverCode, circuit, k } = useApp();
  const [open, setOpen] = useState(false);
  const done = lap >= raceState.totalLaps;
  const d = fixture?.drivers.find(x => x.code === driverCode) ?? fixture?.drivers[0];
  const stops = (fixture?.timeline ?? []).filter(e => e.driverNumber === d?.number && e.pitThisLap);
  const rows = !open || !done || !fixture ? [] : stops.slice(0, 4).map(st => {
    const at = Math.max(2, st.lap - 1);
    const state = deriveRaceState({ mode:'replay', circuit, lap:at, scenario:DEFAULT_SCENARIO, fixture, driverCode:d!.code });
    const adv = recommend(state, { ...k, COARSE_SCENARIOS:100, FINE_SCENARIOS:300 }, 7)[0];
    return { stop:st, adv };
  });
  return (
    <Card title="Post-Race Review" right={<button className="btn" disabled={!done} onClick={() => setOpen(o => !o)}>{done ? 'Post-Race Review' : 'Available at final lap'}</button>}>
      {open && done && (
        <div>
          <div className="label" style={{ marginBottom: 6 }}>RETROSPECTIVE — uses the completed race</div>
          <ProvenanceBadge tag="HISTORICAL" />
          <p className="sub" style={{ margin: '8px 0' }}>Recorded stops for {d?.code}: {stops.length ? stops.map(s => `L${s.lap} → ${s.compound}`).join(', ') : 'none recorded'}. This is a review of recorded decisions, not a prediction. Below: what the engine advised one lap before each recorded stop, using only data up to that lap.</p>
          <table className="t"><thead><tr><th className="label">Recorded</th><th className="label">Engine advised (MODEL ESTIMATE)</th></tr></thead><tbody>{rows.map(r => <tr key={r.stop.lap}><td>L{r.stop.lap} → {r.stop.compound}</td><td>{r.adv.strategy.label} ({r.adv.strategy.plan})</td></tr>)}</tbody></table>
        </div>
      )}
    </Card>
  );
}
