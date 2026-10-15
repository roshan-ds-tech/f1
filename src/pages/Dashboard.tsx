import { useMemo } from 'react';
import { useApp } from '../state/AppContext';
import { StatRow } from '../components/dashboard/StatRow';
import { Stage } from '../components/dashboard/Stage';
import { RecommendationPanel, useSelected, DEG_LABEL, actionTitle, actionSub } from '../components/Panels';
import { LapTimeChart, TyreDegChart, WeatherChart } from '../components/charts';
import { Assumptions } from '../components/Assumptions';
import { PostRace } from '../components/PostRace';
import { CircuitProfile } from '../components/dashboard/CircuitProfile';
import { CIRCUIT_FACTS } from '../config';

/** Recorded lap times for our driver, laps <= current only (replay). */
export function useObserved() {
  const { mode, fixture, lap, driverCode } = useApp();
  return useMemo(() => {
    if (mode !== 'replay' || !fixture) return undefined;
    const d = fixture.drivers.find(x => x.code === driverCode) ?? fixture.drivers[0];
    return fixture.timeline.filter(e => e.lap <= lap && e.driverNumber === d?.number && !e.pitThisLap && !e.safetyCar).map(e => ({ lap: e.lap, t: e.lapTimeSec }));
  }, [mode, fixture, lap, driverCode]);
}

export function Dashboard() {
  const { raceState: s, results, fixture, mode, k, scenario } = useApp();
  const best = results[0], next = results[1];
  const sel = useSelected();
  const compare = sel && best && sel.id !== best.strategy.id ? best.strategy : next?.strategy;
  const observed = useObserved();
  const gaps = mode === 'replay' ? fixture?.meta.gaps ?? [] : [];
  const summary = best
    ? `${actionTitle(best.strategy, s)}: ${actionSub(best.strategy, s).toLowerCase()}.${next ? ` Under our model it beats the next option by ${next.medianDelta.toFixed(1)} s on average.` : ''}`
    : 'Calculating strategies…';

  return (
    <div data-screen-label="Race Dashboard page" style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      {gaps.length > 0 && <div className="warn">Data gaps in this recorded race: {gaps.join(' · ')}</div>}
      <StatRow />
      <div className="dash-row">
        <div style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Stage />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '6px 4px 0' }}>
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: 2.2, color: 'var(--text2)' }}>{s.sessionName.toUpperCase()} · {CIRCUIT_FACTS.baku.name.toUpperCase()} · LAP {s.currentLap} OF {s.totalLaps}</span>
            <span className="sora" style={{ fontSize: 20, fontWeight: 300, lineHeight: 1.35, letterSpacing: -.3, maxWidth: 900, textWrap: 'balance' }}>{summary}</span>
          </div>
        </div>
        <div style={{ flex: '1 1 330px', maxWidth: 400, minWidth: 0, display: 'flex' }}><RecommendationPanel /></div>
      </div>
      <div className="chart-grid">
        <LapTimeChart state={s} strategy={sel} compare={compare} k={k} observed={observed} />
        <TyreDegChart state={s} k={k} degLabel={DEG_LABEL[scenario.deg]} />
        <WeatherChart state={s} />
      </div>
      <CircuitProfile />
      <footer className="foot">
        <span><span style={{ width: 7, height: 7, borderRadius: '50%', border: '1.5px solid var(--amberFill)' }} />Simulated: race state, weather, tyre model, strategy outcomes</span>
        <span><span style={{ width: 7, height: 7, background: 'var(--text2)' }} />Historical: model calibration (2025 Azerbaijan GP)</span>
        <span><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)' }} />Live: not connected</span>
      </footer>
      <Assumptions />
      {mode === 'replay' && <PostRace />}
    </div>
  );
}
