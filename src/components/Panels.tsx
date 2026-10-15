import { RotateCcw } from 'lucide-react';
import { useApp } from '../state/AppContext';
import { explain } from '../engine/explain';
import { COMPOUND_COLOR, COMPOUND_LETTER } from '../styles/compounds';
import { Card, ProvenanceBadge } from './ui';
import type { Compound, StrategyResult } from '../engine/types';

export const Badge = ({ c }: { c: Compound }) => <span className="badge" style={{ background: COMPOUND_COLOR[c] }}>{COMPOUND_LETTER[c]}</span>;
export const fmtTime = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60; return `${h}:${String(m).padStart(2, '0')}:${r.toFixed(1).padStart(4, '0')}`; };

export function Recommendation() {
  const { results, loading, raceState, k } = useApp();
  const best = results[0], next = results[1];
  return (
    <Card title="Recommendation" right={<ProvenanceBadge tag="ESTIMATE" />}>
      {loading && <div className="sub" style={{ color: 'var(--amber)' }}>Recalculating strategies</div>}
      {!best ? <div className="sub">Recalculating strategies</div> : (
        <div className={loading ? 'dim' : ''}>
          <div className="label">Best option</div>
          <div className="row" style={{ margin: '6px 0 10px' }}>
            <Badge c={best.strategy.compound} />
            <div><div style={{ fontWeight: 700, fontSize: 17 }}>{best.strategy.label}</div><div className="sub">{best.strategy.plan}</div></div>
          </div>
          {explain(best, next, raceState, k).map((s, i) => <p key={i} style={{ fontSize: 13, marginBottom: 6 }}>{s}</p>)}
          <div className="grid g3" style={{ marginTop: 10 }}>
            <div><div className="label">Est. race time</div><div className="mono" style={{ fontWeight: 700 }}>{fmtTime(best.meanTime)}</div></div>
            <div><div className="label">Gain vs next best</div><div className="mono" style={{ fontWeight: 700 }}>{next ? `${next.medianDelta.toFixed(1)}s` : '—'}</div></div>
            <div><div className="label">Uncertainty</div><div className="mono" style={{ fontWeight: 700 }}>±{((best.p95 - best.p5) / 2).toFixed(1)}s</div></div>
          </div>
          <div className="sub" style={{ marginTop: 6 }}>Time covers remaining laps from the current lap. Range is the model's 5–95% spread.</div>
        </div>
      )}
    </Card>
  );
}

export function Alternatives({ withTime = false }: { withTime?: boolean }) {
  const { results, selectedId, setSelectedId, loading } = useApp();
  const sel = selectedId ?? results[0]?.strategy.id;
  return (
    <Card title="Alternatives" right={selectedId ? <button className="btn" onClick={() => setSelectedId(null)}><RotateCcw size={12} /> Back to best</button> : <span className="label">Delta to best</span>}>
      {loading && results.length > 0 && <div className="sub" style={{ color: 'var(--amber)', marginBottom: 6 }}>Recalculating strategies</div>}
      <div className={loading ? 'dim' : ''}>
        {results.map((r: StrategyResult) => (
          <div key={r.strategy.id} className={`alt ${sel === r.strategy.id ? 'sel' : ''}`} onClick={() => setSelectedId(r.strategy.id)}>
            <div><div style={{ fontWeight: 600 }}>{r.strategy.label}</div><div className="sub">{r.strategy.plan}{withTime ? ` · ${fmtTime(r.meanTime)}` : ''}</div></div>
            <span className="mono">{r === results[0] ? 'Best' : `+${r.medianDelta.toFixed(1)}s`}</span>
            <span className={`pill ${r.risk}`}>{r.risk}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function useSelected() {
  const { results, selectedId } = useApp();
  return results.find(r => r.strategy.id === selectedId)?.strategy ?? results[0]?.strategy;
}

export const DEG_LABEL = { low: 'Low degradation', nominal: 'Nominal degradation', high: 'High degradation' } as const;
