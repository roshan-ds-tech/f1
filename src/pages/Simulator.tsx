import { useApp } from '../state/AppContext';
import { Card, SegmentedControl, ProvenanceBadge } from '../components/ui';
import { Recommendation, useSelected, DEG_LABEL, fmtTime, Badge } from '../components/Panels';
import { LapTimeChart, TyreDegChart } from '../components/charts';
import { RotateCcw } from 'lucide-react';

export function Simulator() {
  const { scenario: sc, setScenario, resetScenario, results, selectedId, setSelectedId, raceState, k, mode, setMode, loading } = useApp();
  const sel = useSelected();
  const selId = selectedId ?? results[0]?.strategy.id;
  return (
    <div className="page grid" style={{ gap: 16 }}>
      <div className="row between wrap">
        <div><div className="h1">STRATEGY SIMULATOR</div><div className="sub">Decide the next pit call</div></div>
        <ProvenanceBadge tag="SIMULATED" />
      </div>
      {mode !== 'scenario' && <div className="warn">The simulator edits the scenario preset. <button className="btn" onClick={() => setMode('scenario')}>Switch to scenario mode</button></div>}
      <div className="main-grid">
        <Card title="Conditions" right={<button className="btn" onClick={resetScenario}><RotateCcw size={12} /> Reset</button>}>
          <div className="grid" style={{ gap: 16 }}>
            <div><div className="label" style={{ marginBottom: 6 }}>Weather</div>
              <SegmentedControl value={sc.wx} onChange={wx => setScenario({ wx })} options={[{ value: 'dry', label: 'Dry' }, { value: 'light', label: 'Light rain' }, { value: 'heavy', label: 'Heavy rain' }]} /></div>
            <div><div className="label" style={{ marginBottom: 6 }}>Rain arrives · {sc.rainArrivalOffset} laps{sc.wx === 'dry' ? ' (no effect while Dry)' : ''}</div>
              <input type="range" min={1} max={15} value={sc.rainArrivalOffset} onChange={e => setScenario({ rainArrivalOffset: +e.target.value })} /></div>
            <div><div className="label" style={{ marginBottom: 6 }}>Safety Car</div>
              <SegmentedControl<boolean> value={sc.sc} onChange={v => setScenario({ sc: v })} options={[{ value: true, label: 'Deployed' }, { value: false, label: 'Clear' }]} /></div>
            <div><div className="label" style={{ marginBottom: 6 }}>Tyre degradation</div>
              <SegmentedControl value={sc.deg} onChange={deg => setScenario({ deg })} options={[{ value: 'low', label: 'Low' }, { value: 'nominal', label: 'Nominal' }, { value: 'high', label: 'High' }]} /></div>
            <div><div className="label" style={{ marginBottom: 6 }}>Tyre age · {sc.tyreAge} laps</div>
              <input type="range" min={0} max={40} value={sc.tyreAge} onChange={e => setScenario({ tyreAge: +e.target.value })} /></div>
          </div>
        </Card>
        <Recommendation />
      </div>
      <Card title="Strategies" right={<span className="sub">Select one to plot it below</span>}>
        <div className={loading ? 'dim' : ''} style={{ overflowX: 'auto' }}>
          <table className="t">
            <thead><tr><th className="label">Strategy</th><th className="label">Plan</th><th className="label">Remaining time</th><th className="label">Delta</th><th className="label">Risk</th></tr></thead>
            <tbody>{results.map((r, i) => (
              <tr key={r.strategy.id} onClick={() => setSelectedId(r.strategy.id)} style={{ cursor: 'pointer', background: selId === r.strategy.id ? 'var(--surface2)' : undefined }}>
                <td><span className="row"><Badge c={r.strategy.compound} />{r.strategy.label}</span></td>
                <td className="sub">{r.strategy.plan}</td><td className="mono">{fmtTime(r.meanTime)}</td>
                <td className="mono">{i === 0 ? 'Best' : `+${r.medianDelta.toFixed(1)}s`}</td><td><span className={`pill ${r.risk}`}>{r.risk}</span></td>
              </tr>))}</tbody>
          </table>
        </div>
      </Card>
      <div className="grid g2">
        <Card><LapTimeChart state={raceState} strategy={sel} k={k} /></Card>
        <Card><TyreDegChart state={raceState} k={k} degLabel={DEG_LABEL[sc.deg]} /></Card>
      </div>
      <div className="foot">Simulated model outputs. Not validated race predictions.</div>
    </div>
  );
}
