import { useNavigate } from 'react-router-dom';
import { FIXTURES } from '../data/fixtures';
import { CIRCUITS } from '../engine/constants';
import type { CircuitId, Provenance } from '../engine/types';
import { Card, ProvenanceBadge } from '../components/ui';
import { useApp } from '../state/AppContext';

export function History() {
  const { setCircuit, setMode } = useApp();
  const nav = useNavigate();
  return (
    <div className="page grid" style={{ gap: 16 }}>
      <div><div className="h1">RACE HISTORY</div><div className="sub">Prepared race fixtures</div></div>
      <div className="grid g2">
        {(Object.keys(FIXTURES) as CircuitId[]).map(id => {
          const m = FIXTURES[id].meta;
          const tag: Provenance = m.provenance === 'HISTORICAL' ? 'HISTORICAL' : 'SIMULATED';
          return (
            <Card key={id} title={CIRCUITS[id].name} right={<ProvenanceBadge tag={tag} />}>
              <div style={{ fontWeight: 700 }}>{m.grandPrix}</div>
              <div className="sub">{m.totalLaps} laps · {FIXTURES[id].drivers.length} drivers · fetched {m.fetchedAt.slice(0, 10)}</div>
              {m.gaps.map((g, i) => <div key={i} className="warn" style={{ marginTop: 6 }}>{g}</div>)}
              <button className="btn" style={{ marginTop: 10 }} onClick={() => { setCircuit(id); setMode('replay'); nav('/'); }}>Load</button>
            </Card>);
        })}
      </div>
    </div>
  );
}
