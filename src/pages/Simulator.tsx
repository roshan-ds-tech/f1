import { useApp } from '../state/AppContext';
import { DEFAULT_SCENARIO, type ScenarioInputs } from '../engine/types';
import { ProvenanceBadge } from '../components/ui';
import { RecommendedPanel, useSelected, DEG_LABEL, fmtTime, fmtDelta, actionTitle, planLine, RISK_C } from '../components/Panels';
import { ScenarioControls } from '../components/ScenarioDrawer';
import { LapTimeChart, TyreDegChart } from '../components/charts';
import { useObserved } from './Dashboard';

const PRESETS: [string, ScenarioInputs][] = [
  ['ZERO HOUR challenge', { ...DEFAULT_SCENARIO }],
  ['Dry baseline', { ...DEFAULT_SCENARIO, wx: 'dry', sc: false, deg: 'nominal' }],
  ['Wet gamble', { ...DEFAULT_SCENARIO, wx: 'heavy', sc: false, deg: 'high' }],
];
const same = (a: ScenarioInputs, b: ScenarioInputs) => (Object.keys(a) as (keyof ScenarioInputs)[]).every(k => a[k] === b[k]);

export function Simulator() {
  const { scenario, setScenario, resetScenario, results, selectedId, setSelectedId, raceState, k, mode, setMode } = useApp();
  const sel = useSelected();
  const best = results[0];
  const selId = selectedId ?? best?.strategy.id;
  const observed = useObserved();
  const active = PRESETS.findIndex(([, p]) => same(p, scenario));
  return (
    <div data-screen-label="Strategy Simulator page" style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <div className="row"><span className="label">Strategy simulator</span><ProvenanceBadge tag="SIMULATED" short style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.8px' }} /></div>
          <h1 className="page-h1">Decide the next pit call</h1>
        </div>
        <div className="seg tseg" style={{ borderRadius: 10, flexWrap: 'wrap' }}>
          {PRESETS.map(([label, p], i) => (
            <button key={label} className={i === active ? 'on' : ''} aria-pressed={i === active} style={{ width: 'auto', height: 34, padding: '0 14px', borderRadius: 8, fontSize: 12.5 }} onClick={() => setScenario(p)}>{label}</button>
          ))}
          {active < 0 && <button className="on" style={{ width: 'auto', height: 34, padding: '0 14px', borderRadius: 8, fontSize: 12.5 }}>Custom</button>}
        </div>
      </div>
      {mode !== 'scenario' && <div className="warn row between wrap">The simulator edits the scenario preset; you are in {mode} mode. <button className="btn sm" onClick={() => setMode('scenario')}>Switch to scenario mode</button></div>}
      <div className="dash-row">
        <section className="card" data-screen-label="Conditions" style={{ flex: '0 0 340px', maxWidth: '100%', padding: '24px 26px 26px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div className="row between" style={{ alignItems: 'baseline' }}><span className="label">Conditions</span><button className="link" onClick={resetScenario}>Reset</button></div>
          <ScenarioControls />
        </section>
        <RecommendedPanel />
      </div>
      <section className="card" data-screen-label="Strategy comparison" style={{ padding: '24px 0 8px', overflowX: 'auto' }}>
        <div className="row between" style={{ padding: '0 30px 12px', alignItems: 'baseline' }}><span className="label">Strategies</span><span style={{ fontSize: 12, color: 'var(--text2)' }}>Select one to plot it below</span></div>
        <div style={{ minWidth: 520 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.8fr) minmax(0,.9fr) minmax(0,.8fr) minmax(0,.6fr)', gap: '0 16px', padding: '0 30px 8px', fontSize: 11.5, color: 'var(--text2)' }}>
            <span /><span style={{ textAlign: 'right' }}>Remaining time</span><span style={{ textAlign: 'right' }}>Delta</span><span style={{ textAlign: 'right' }}>Risk</span>
          </div>
          {results.map(r => {
            const on = r.strategy.id === selId;
            return (
              <div key={r.strategy.id} role="button" aria-pressed={on} onClick={() => setSelectedId(r.strategy.id)} className="alt"
                style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.8fr) minmax(0,.9fr) minmax(0,.8fr) minmax(0,.6fr)', gap: '0 16px', padding: '15px 30px', borderTop: '1px solid var(--line)', background: on ? 'var(--surface2)' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  <span className="radio" style={{ borderColor: on ? 'var(--red)' : 'var(--line)' }}><span style={{ background: on ? 'var(--red)' : 'transparent' }} /></span>
                  <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 14.5 }}>{actionTitle(r.strategy, raceState)}</div><div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>{planLine(r)}</div></div>
                </div>
                <div className="sora" style={{ fontSize: 15, fontWeight: 500, textAlign: 'right' }}>{fmtTime(r.meanTime)}</div>
                <div className="sora" style={{ fontSize: 14, fontWeight: 500, textAlign: 'right', color: r.medianDelta < 0.05 ? 'var(--text2)' : 'var(--text)' }}>{fmtDelta(r.medianDelta)}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, textAlign: 'right', color: RISK_C[r.risk] }}>{r.risk}</div>
              </div>
            );
          })}
        </div>
      </section>
      <div className="chart-grid" data-screen-label="Charts" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))' }}>
        <LapTimeChart state={raceState} strategy={sel} compare={best && sel?.id !== best.strategy.id ? best.strategy : undefined} compareLabel="Best" k={k} observed={observed} />
        <TyreDegChart state={raceState} k={k} degLabel={DEG_LABEL[scenario.deg]} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text2)', padding: '0 2px 8px' }}>Simulated model outputs. Not validated race predictions.</div>
    </div>
  );
}
