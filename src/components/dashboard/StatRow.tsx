import { Sun, CloudDrizzle, CloudRain } from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { CircuitMap } from './CircuitMap';
import type { RaceFixture } from '../../data/types';

/** Sector deltas vs the car leading on the same lap. Only real recorded timing; never invented. */
export function sectorDeltas(fixture: RaceFixture | null, lap: number, driverCode: string, enabled: boolean): [number, number, number] | null {
  if (!enabled || !fixture) return null;
  const d = fixture.drivers.find(x => x.code === driverCode) ?? fixture.drivers[0];
  const past = fixture.timeline.filter(e => e.lap <= lap);
  const row = past.filter(e => e.driverNumber === d?.number && e.s1 != null && e.s2 != null && e.s3 != null).at(-1);
  if (!row) return null;
  const lead = past.find(e => e.lap === row.lap && e.position === 1 && e.s1 != null && e.s2 != null && e.s3 != null);
  if (!lead) return null;
  return [row.s1! - lead.s1!, row.s2! - lead.s2!, row.s3! - lead.s3!];
}

const fmtD = (v: number) => `${v < 0 ? '−' : '+'}${Math.abs(v).toFixed(3)} s`;

export function StatRow() {
  const { raceState: s, mode, fixture, lap, driverCode, circuit } = useApp();
  const pct = (s.currentLap / s.totalLaps) * 100;
  // Leader gap only when every car ahead of us is in the modelled field.
  const ahead = s.rivals.filter(r => r.startOffsetSec < 0);
  let gapText = '—', gapColor = 'var(--text2)';
  if (s.position === 1) { gapText = 'Leader'; gapColor = 'var(--green)'; }
  else if (ahead.length === s.position - 1 && ahead.length > 0) {
    const g = -Math.min(...ahead.map(r => r.startOffsetSec));
    gapText = `+${g.toFixed(1)} s`; gapColor = 'var(--text)';
  }
  const rainIn = s.rainArrivalLap === null ? null : s.rainArrivalLap - s.currentLap;
  const wet = s.wetnessNow > 0.2;
  const WxIcon = wet ? CloudRain : rainIn !== null ? CloudDrizzle : Sun;
  const wxNow = wet ? 'Wet track' : rainIn !== null ? (s.rainIntensity > 0.7 ? 'Heavy rain' : 'Light rain') : 'Dry';
  const wxWhen = wet ? 'Rain on track' : rainIn !== null ? (rainIn <= 0 ? 'arriving now' : `in ${rainIn} lap${rainIn === 1 ? '' : 's'}`) : 'No rain modelled';
  const scColor = s.safetyCarActive ? 'var(--red)' : 'var(--green)';
  const deltas = sectorDeltas(fixture, lap, driverCode, mode === 'replay');

  return (
    <div className="strip" data-screen-label="Race state">
      <div className="cell"><span className="label">Lap</span>
        <span className="sora" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1 }}>{s.currentLap}<span style={{ color: 'var(--text2)', fontWeight: 500, fontSize: 22 }}> / {s.totalLaps}</span></span>
        <div style={{ height: 2, background: 'var(--grid)', borderRadius: 2 }}><div style={{ width: `${pct}%`, height: '100%', background: 'var(--text)' }} /></div></div>
      <div className="cell"><span className="label">Position</span>
        <span className="sora" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1, color: 'var(--red)' }}>P{s.position}</span></div>
      <div className="cell"><span className="label">Gap to leader</span>
        <span className="sora" title={gapText === '—' ? 'Leader not in the modelled field at this lap' : undefined} style={{ fontSize: 28, fontWeight: 600, lineHeight: 1, color: gapColor }}>{gapText}</span></div>
      <div className="cell"><span className="label">Weather</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34 }}>
          <WxIcon size={20} color={wet || rainIn !== null ? 'var(--blue)' : 'var(--amberFill)'} />
          <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>{wxNow}<span style={{ display: 'block', fontSize: 12, fontWeight: 400, color: 'var(--text2)' }}>{wxWhen}</span></span>
        </span></div>
      <div className="cell"><span className="label">Track</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34, color: scColor, fontWeight: 600, fontSize: 15, letterSpacing: '.6px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: scColor, animation: s.safetyCarActive ? 'pw-pulse 1.4s infinite' : 'none' }} />
          {s.safetyCarActive ? 'SAFETY CAR' : 'GREEN FLAG'}</span></div>
      <div className="cell" data-screen-label="Circuit map" style={{ flex: '2 1 300px', padding: '12px 22px', flexDirection: 'row', alignItems: 'center', gap: 20 }}>
        <CircuitMap circuit={circuit} deltas={deltas} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="label">Sector delta vs leader</span>
          {deltas ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {deltas.map((d, i) => <span key={i} className="chip">S{i + 1} <b style={{ color: d <= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{fmtD(d)}</b></span>)}
            </div>
          ) : <div style={{ fontSize: 12, color: 'var(--text2)' }}>Sector timing unavailable</div>}
        </div>
      </div>
    </div>
  );
}
