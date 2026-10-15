import { useApp } from '../state/AppContext';
import { explain } from '../engine/explain';
import { COMPOUND_COLOR, COMPOUND_LETTER } from '../styles/compounds';
import type { Compound, RaceState, Strategy, StrategyResult } from '../engine/types';
import { TyreThumb, COMPOUND_NAME } from './TyreThumb';

export const Badge = ({ c }: { c: Compound }) => (
  <span style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${COMPOUND_COLOR[c]}`, background: '#1D2127', color: '#fff', fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{COMPOUND_LETTER[c]}</span>
);
export const fmtTime = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = Math.round(s % 60); return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`; };
export const fmtDelta = (d: number) => d < 0.05 ? '—' : `+${d.toFixed(1)} s`;

/** Strategy phrased as an action: PIT NOW / PIT IN 2 LAPS / STAY OUT. */
export function actionTitle(s: Strategy, state: RaceState) {
  if (s.pitLap === null) return 'Stay out';
  const n = s.pitLap - state.currentLap;
  return n <= 0 ? 'Pit now' : `Pit in ${n} lap${n === 1 ? '' : 's'}`;
}
export function actionSub(s: Strategy, state: RaceState) {
  return s.pitLap === null ? `Stay on current ${COMPOUND_NAME[state.us.compound]}s` : `Box lap ${s.pitLap} · switch to ${COMPOUND_NAME[s.compound]}`;
}
export function planLine(r: StrategyResult) {
  const s = r.strategy;
  const base = s.pitLap === null ? 'No stop, run to the flag' : `L${s.pitLap} ${COMPOUND_NAME[s.compound]}`;
  return `${base} · finish P${Math.round(r.expectedPosition)}`;
}
const RISK_C = { Low: 'var(--green)', Medium: 'var(--amber)', High: 'var(--red)' } as const;

export function useSelected() {
  const { results, selectedId } = useApp();
  return results.find(r => r.strategy.id === selectedId)?.strategy ?? results[0]?.strategy;
}
export const DEG_LABEL = { low: 'Low degradation', nominal: 'Nominal degradation', high: 'High degradation' } as const;

function Uncertainty({ r }: { r: StrategyResult }) {
  const lvl = r.risk === 'Low' ? 1 : r.risk === 'Medium' ? 2 : 3;
  const uc = ['var(--green)', 'var(--amberFill)', 'var(--red)'][lvl - 1];
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 18 }}>
      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', paddingTop: 3, flex: '0 0 auto' }}>
        {[7, 10, 13].map((h, i) => <div key={h} style={{ width: 4, height: h, borderRadius: 1, background: i < lvl ? uc : 'var(--grid)' }} />)}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.5 }}>
        <b style={{ color: 'var(--text)', fontWeight: 600 }}>{r.risk} uncertainty.</b> 5–95% spread of {(r.p95 - r.p5).toFixed(1)} s across sampled scenarios, under our model.
      </div>
    </div>
  );
}

/** Dashboard RECOMMENDATION + ALTERNATIVES, one panel as in the design. */
export function RecommendationPanel() {
  const { results, loading, raceState, k, selectedId, setSelectedId } = useApp();
  const best = results[0], next = results[1];
  const sel = selectedId ?? best?.strategy.id;
  const selR = results.find(r => r.strategy.id === selectedId);
  const lines = best ? explain(best, next, raceState, k) : [];
  const reason = [lines[0], next ? lines.find(l => l.startsWith('Next best')) : undefined].filter(Boolean).join(' ');
  return (
    <section className="rec" data-screen-label="Recommendation">
      <div style={{ padding: '26px 28px 24px' }}>
        <div className="row between" style={{ gap: 8 }}><span className="label">Recommendation</span><span className="pill" style={{ background: 'var(--greenTint)', color: 'var(--green)' }}>Best option</span></div>
        {best ? <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16 }}>
            <div style={{ minWidth: 0 }}>
              <div className="sora" style={{ fontSize: 46, fontWeight: 600, letterSpacing: -1, lineHeight: 1, textTransform: 'uppercase' }}>{actionTitle(best.strategy, raceState)}</div>
              <div style={{ fontSize: 13.5, color: 'var(--text2)', marginTop: 10 }}>{actionSub(best.strategy, raceState)}</div>
            </div>
            <TyreThumb c={best.strategy.pitLap === null ? raceState.us.compound : best.strategy.compound} w={60} h={52} radius={10} />
          </div>
          <p style={{ margin: '16px 0 0', fontSize: 14, lineHeight: 1.55, color: 'var(--text2)' }}>{reason}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', marginTop: 22, borderTop: '1px solid var(--line)', paddingTop: 18 }}>
            <div><div style={{ fontSize: 12, color: 'var(--text2)' }}>Est. remaining time</div><div className="sora" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.15, marginTop: 2 }}>{fmtTime(best.meanTime)}</div></div>
            <div style={{ paddingLeft: 20, borderLeft: '1px solid var(--line)' }}><div style={{ fontSize: 12, color: 'var(--text2)' }}>Gain vs next best</div><div className="sora" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.15, marginTop: 2, color: 'var(--green)' }}>{next ? `${next.medianDelta.toFixed(1)} s` : '—'}</div></div>
          </div>
          <Uncertainty r={best} />
        </> : <div style={{ height: 200 }} />}
      </div>
      <div style={{ borderTop: '1px solid var(--line)', padding: '16px 0 8px', flex: 1 }}>
        <div className="row between" style={{ padding: '0 28px 8px' }}><span className="label">Alternatives</span><span style={{ fontSize: 12, color: 'var(--text2)' }}>Delta to best</span></div>
        {results.map(r => {
          const on = r.strategy.id === sel;
          return (
            <div key={r.strategy.id} className="alt" role="button" aria-pressed={on} onClick={() => setSelectedId(r.strategy.id)} style={{ background: on ? 'var(--surface2)' : undefined }}>
              <span className="radio" style={{ borderColor: on ? 'var(--red)' : 'var(--line)' }}><span style={{ background: on ? 'var(--red)' : 'transparent' }} /></span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{actionTitle(r.strategy, raceState)}</div><div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.35 }}>{planLine(r)}</div></div>
              <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                <div className="sora" style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.1, color: r.medianDelta < 0.05 ? 'var(--text2)' : r.medianDelta > 10 ? 'var(--red)' : 'var(--text)' }}>{fmtDelta(r.medianDelta)}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text2)', fontWeight: 600 }}>{r.risk} risk</div>
              </div>
            </div>
          );
        })}
        {selR && selR !== best && (
          <div style={{ margin: '8px 28px', padding: '10px 12px', borderRadius: 8, background: 'var(--surface2)', fontSize: 12.5, lineHeight: 1.45, color: 'var(--text2)' }}>
            {actionTitle(selR.strategy, raceState)} ({planLine(selR)}) is {selR.medianDelta.toFixed(1)} s slower on average under our model. <button className="link red" onClick={() => setSelectedId(null)}>Back to best</button>
          </div>
        )}
      </div>
      {loading && <div className="overlay"><div className="spin" style={{ width: 18, height: 18 }} /><span style={{ fontWeight: 600 }}>Recalculating strategies</span></div>}
    </section>
  );
}

/** Simulator RECOMMENDED panel. */
export function RecommendedPanel() {
  const { results, loading, raceState, k } = useApp();
  const best = results[0], next = results[1];
  const lines = best ? explain(best, next, raceState, k) : [];
  return (
    <section className="card" data-screen-label="Recommended strategy" style={{ flex: '1 1 420px', minWidth: 0, padding: '28px 32px 26px', display: 'flex', flexDirection: 'column', gap: 22, position: 'relative' }}>
      <div className="row between wrap" style={{ gap: 8 }}><span className="label">Recommended</span><span className="pill" style={{ background: 'var(--greenTint)', color: 'var(--green)' }}>Best modelled result</span></div>
      {best && <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ minWidth: 0 }}><div className="sora" style={{ fontSize: 48, fontWeight: 500, letterSpacing: -1.4, lineHeight: 1.05 }}>{actionTitle(best.strategy, raceState)}</div><div style={{ fontSize: 14.5, color: 'var(--text2)', marginTop: 10 }}>{actionSub(best.strategy, raceState)}</div></div>
          <TyreThumb c={best.strategy.pitLap === null ? raceState.us.compound : best.strategy.compound} w={76} h={68} radius={12} />
        </div>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: 'var(--text2)' }}>{[lines[0], lines.find(l => l.startsWith('Next best'))].filter(Boolean).join(' ')}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: 20, gap: '18px 0', marginTop: 'auto' }}>
          <div style={{ flex: '1 1 140px' }}><div style={{ fontSize: 12, color: 'var(--text2)' }}>Est. remaining time</div><div className="sora" style={{ fontSize: 28, fontWeight: 500, marginTop: 4, whiteSpace: 'nowrap' }}>{fmtTime(best.meanTime)}</div></div>
          <div style={{ flex: '1 1 140px', paddingLeft: 24, borderLeft: '1px solid var(--line)' }}><div style={{ fontSize: 12, color: 'var(--text2)' }}>Gain vs next best</div><div className="sora" style={{ fontSize: 28, fontWeight: 500, marginTop: 4, color: 'var(--green)', whiteSpace: 'nowrap' }}>{next ? `${next.medianDelta.toFixed(1)} s` : '—'}</div></div>
          <div style={{ flex: '1 1 140px', paddingLeft: 24, borderLeft: '1px solid var(--line)' }}><div style={{ fontSize: 12, color: 'var(--text2)' }}>Uncertainty</div><div className="sora" style={{ fontSize: 28, fontWeight: 500, marginTop: 4 }}>{best.risk}</div></div>
        </div>
      </>}
      {loading && <div className="overlay" style={{ borderRadius: 14, opacity: .7 }}><div className="spin" style={{ width: 20, height: 20 }} /><span style={{ fontWeight: 600 }}>Recalculating strategies</span></div>}
    </section>
  );
}
export { RISK_C };
