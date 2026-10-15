import { useApp } from '../state/AppContext';
import { Card, ProvenanceBadge } from '../components/ui';
import { fmtTime, Badge } from '../components/Panels';

export function Compare() {
  const { results } = useApp();
  return (
    <div className="page grid" style={{ gap: 16 }}>
      <div className="row between"><div><div className="h1">COMPARE STRATEGIES</div><div className="sub">Shortlist side by side</div></div><ProvenanceBadge tag="ESTIMATE" /></div>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.max(1, results.length)}, minmax(0,1fr))`, overflowX: 'auto' }}>
        {results.map((r, i) => (
          <Card key={r.strategy.id} title={i === 0 ? 'Best' : `Option ${i + 1}`}>
            <div className="row"><Badge c={r.strategy.compound} /><div><b>{r.strategy.label}</b><div className="sub">{r.strategy.plan}</div></div></div>
            <div className="kv" style={{ marginTop: 10 }}><span>Remaining time</span><b className="mono">{fmtTime(r.meanTime)}</b></div>
            <div className="kv"><span>Delta</span><b className="mono">{i === 0 ? 'Best' : `+${r.medianDelta.toFixed(1)}s`}</b></div>
            <div className="kv"><span>Expected position</span><b className="mono">P{r.expectedPosition.toFixed(1)}</b></div>
            <div className="kv"><span>Podium share (model)</span><b className="mono">{(r.podiumShare * 100).toFixed(0)}%</b></div>
            <div className="kv"><span>Spread 5–95%</span><b className="mono">{(r.p95 - r.p5).toFixed(1)}s</b></div>
            <div className="kv"><span>Risk</span><span className={`pill ${r.risk}`}>{r.risk}</span></div>
          </Card>))}
      </div>
    </div>
  );
}
