import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { SegmentedControl } from './ui';
import { CIRCUIT_FACTS } from '../config';

export function ScenarioControls() {
  const { scenario: sc, setScenario } = useApp();
  return (
    <>
      <div className="ctl"><span className="ctl-l">Weather</span>
        <SegmentedControl value={sc.wx} onChange={wx => setScenario({ wx })} options={[{ value: 'dry', label: 'Dry' }, { value: 'light', label: 'Light rain' }, { value: 'heavy', label: 'Heavy rain' }]} /></div>
      <div className="ctl" style={{ opacity: sc.wx === 'dry' ? 0.45 : 1 }}>
        <div className="row between"><span className="ctl-l">Rain arrives</span><span className="sora" style={{ fontSize: 14, fontWeight: 500 }}>{sc.wx === 'dry' ? 'No rain' : `in ${sc.rainArrivalOffset} lap${sc.rainArrivalOffset === 1 ? '' : 's'}`}</span></div>
        <input type="range" min={1} max={15} value={sc.rainArrivalOffset} disabled={sc.wx === 'dry'} onChange={e => setScenario({ rainArrivalOffset: +e.target.value })} /></div>
      <div className="ctl"><span className="ctl-l">Safety Car</span>
        <SegmentedControl<boolean> value={sc.sc} onChange={v => setScenario({ sc: v })} options={[{ value: true, label: 'Deployed' }, { value: false, label: 'Clear' }]} /></div>
      <div className="ctl"><span className="ctl-l">Tyre degradation</span>
        <SegmentedControl value={sc.deg} onChange={deg => setScenario({ deg })} options={[{ value: 'low', label: 'Low' }, { value: 'nominal', label: 'Nominal' }, { value: 'high', label: 'High' }]} /></div>
      <div className="ctl">
        <div className="row between"><span className="ctl-l">Tyre age</span><span className="sora" style={{ fontSize: 14, fontWeight: 500 }}>{sc.tyreAge} laps</span></div>
        <input type="range" min={0} max={40} value={sc.tyreAge} onChange={e => setScenario({ tyreAge: +e.target.value })} /></div>
    </>
  );
}

function DriverSelect() {
  const { fixture, driverCode, setDriver } = useApp();
  if (!fixture) return null;
  return <div className="ctl"><span className="ctl-l">Driver (our car)</span>
    <select className="select" value={driverCode} onChange={e => setDriver(e.target.value)}>
      {fixture.drivers.map(d => <option key={d.code} value={d.code}>{d.code} · {d.name} · {d.team}</option>)}
    </select></div>;
}

function DegOnly() {
  const { scenario: sc, setScenario } = useApp();
  return <div className="ctl"><span className="ctl-l">Tyre degradation</span>
    <SegmentedControl value={sc.deg} onChange={deg => setScenario({ deg })} options={[{ value: 'low', label: 'Low' }, { value: 'nominal', label: 'Nominal' }, { value: 'high', label: 'High' }]} /></div>;
}

export function ScenarioDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { mode, setMode, resetScenario } = useApp();
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  return (
    <>
      <div className={`scrim ${open ? 'open' : ''}`} onClick={onClose} />
      <aside className={`drawer ${open ? 'open' : ''}`} aria-hidden={!open} aria-label="Scenario">
        <div className="row between"><span className="label">Simulated inputs</span>
          <div className="row" style={{ gap: 12 }}>
            <button className="link" onClick={resetScenario}>Reset</button>
            <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
          </div></div>
        <div className="ctl"><span className="ctl-l">Mode</span>
          <SegmentedControl value={mode} onChange={setMode} options={[{ value: 'scenario', label: 'Scenario' }, { value: 'replay', label: 'Replay' }, { value: 'live', label: 'Live' }]} /></div>
        <div className="ctl"><span className="ctl-l">Circuit</span>
          <div style={{ fontWeight: 600 }}>{CIRCUIT_FACTS.baku.name}</div>
          <span style={{ fontSize: 11.5, color: 'var(--text2)', lineHeight: 1.45 }}>This build is tailored to Baku. Pit loss and base pace are fitted from the 2025 Azerbaijan GP. The scenario keeps the challenge's lap 31 of 53; Baku's real race distance is 51 laps.</span></div>
        <div style={{ height: 1, background: 'var(--line)' }} />
        {mode === 'scenario' ? <ScenarioControls /> : (
          <div style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.5 }}>
            {mode === 'replay' ? 'Replay reads weather, Safety Car and tyre age from the recorded race, so those inputs are off. Tyre degradation still scales the model.' : 'No live feed is connected. Switch to Scenario or Replay.'}
          </div>
        )}
        {mode === 'replay' && <DriverSelect />}
        {mode === 'replay' && <DegOnly />}
      </aside>
    </>
  );
}
