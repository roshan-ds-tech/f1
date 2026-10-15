import { useApp } from '../state/AppContext';
import { Card, StatTile, ProvenanceBadge } from '../components/ui';
import { Stage } from '../components/Stage';
import { Recommendation, Alternatives, useSelected, DEG_LABEL } from '../components/Panels';
import { LapTimeChart, TyreDegChart, WeatherChart } from '../components/charts';
import { Assumptions } from '../components/Assumptions';
import { PostRace } from '../components/PostRace';

export function SectorDelta() {
  const { fixture, mode, lap, driverCode } = useApp();
  let content = <div className="sub">Sector timing unavailable</div>;
  if (mode === 'replay' && fixture) {
    const d = fixture.drivers.find(x => x.code === driverCode) ?? fixture.drivers[0];
    const row = fixture.timeline.filter(e => e.lap <= lap && e.driverNumber === d?.number).at(-1);
    if (row?.s1 != null && row.s2 != null && row.s3 != null) {
      const lead = fixture.timeline.filter(e => e.lap === row.lap && e.position === 1)[0];
      if (lead?.s1 != null && lead.s2 != null && lead.s3 != null) {
        content = <>{([['S1', row.s1 - lead.s1], ['S2', row.s2 - lead.s2], ['S3', row.s3 - lead.s3]] as const).map(([n, v]) => (
          <div key={n} className="kv"><span>{n}</span><b className="mono">{v >= 0 ? '+' : ''}{v.toFixed(3)}s</b></div>))}</>;
      }
    }
  }
  return <Card title="Sector delta vs leader" right={mode === 'replay' ? <ProvenanceBadge tag="HISTORICAL" /> : undefined}>{content}</Card>;
}

export function StatRow() {
  const { raceState: s, mode, provenance, circuit, results } = useApp();
  const ahead = s.rivals.filter(r => r.startOffsetSec < 0).sort((a, b) => a.startOffsetSec - b.startOffsetSec)[0];
  const gap = ahead ? `+${Math.abs(ahead.startOffsetSec).toFixed(1)}s` : '—';
  const wx = s.wetnessNow > 0.2 ? 'Wet now' : s.rainArrivalLap ? `Dry · rain ~L${s.rainArrivalLap}` : 'Dry';
  void mode; void circuit; void results;
  return (
    <div className="grid g5">
      <StatTile label="Lap" value={`${s.currentLap}/${s.totalLaps}`} prov={provenance} />
      <StatTile label="Position" value={`P${s.position}`} prov={provenance} />
      <StatTile label="Gap to car ahead" value={gap} sub="Nearest rival ahead (approx. leader gap needs full field)" prov={provenance} />
      <StatTile label="Weather" value={<span style={{ fontSize: 18 }}>{wx}</span>} sub={s.trackTempC != null ? `Track ${s.trackTempC}°C` : undefined} prov={provenance} />
      <StatTile label="Track" value={<span style={{ fontSize: 18 }}>{s.safetyCarActive ? 'Safety car' : 'Green flag'}</span>} sub={s.safetyCarActive ? `${s.safetyCarLapsRemaining} laps remaining` : undefined} prov={provenance} />
    </div>
  );
}

export function Charts() {
  const { raceState, k, scenario } = useApp();
  const sel = useSelected();
  return (
    <div className="grid g3">
      <Card><LapTimeChart state={raceState} strategy={sel} k={k} /></Card>
      <Card><TyreDegChart state={raceState} k={k} degLabel={DEG_LABEL[scenario.deg]} /></Card>
      <Card><WeatherChart state={raceState} /></Card>
    </div>
  );
}

export function Dashboard() {
  const { raceState: s, results, fixture, mode, provenance } = useApp();
  const best = results[0];
  const gaps = mode === 'replay' ? fixture?.meta.gaps ?? [] : [];
  return (
    <div className="page grid" style={{ gap: 16 }}>
      <div className="row between wrap">
        <div>
          <div className="h1">{s.sessionName.toUpperCase()} · LAP {s.currentLap} OF {s.totalLaps}</div>
          <div className="sub">{best ? `Modelled best call: ${best.strategy.label} (${best.strategy.plan}). Under our model, not a prediction.` : 'Calculating…'}</div>
        </div>
        <ProvenanceBadge tag={provenance} />
      </div>
      {gaps.length > 0 && <div className="warn">Data gaps: {gaps.join(' · ')}</div>}
      <StatRow />
      <div className="main-grid">
        <div className="grid"><Stage /><SectorDelta /></div>
        <div className="grid" style={{ alignContent: 'start' }}><Recommendation /><Alternatives /></div>
      </div>
      <Charts />
      <Assumptions />
      {mode === 'replay' && <PostRace />}
      <div className="foot">
        <div>Simulated: race state, weather, tyre model, strategy outcomes</div>
        <div>Historical: model calibration</div>
        <div>Live: not connected</div>
      </div>
    </div>
  );
}
