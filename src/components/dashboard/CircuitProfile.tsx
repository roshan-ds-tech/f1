import { useApp } from '../../state/AppContext';
import { CIRCUIT_FACTS, FOCUS_CIRCUIT } from '../../config';
import { CALIBRATION } from '../../data/calibration';
import { CIRCUITS } from '../../engine/constants';
import { CircuitMap } from './CircuitMap';

const fmtLap = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
const Tag = ({ t }: { t: 'Published' | 'Fitted 2025' | 'Assumption' }) => (
  <span style={{ fontSize: 10.5, fontWeight: 600, color: t === 'Fitted 2025' ? 'var(--green)' : t === 'Assumption' ? 'var(--amber)' : 'var(--text2)' }}>{t}</span>
);

export function CircuitProfile() {
  const { k } = useApp();
  const f = CIRCUIT_FACTS.baku, cal = CALIBRATION[FOCUS_CIRCUIT], c = CIRCUITS[FOCUS_CIRCUIT];
  const cells: [string, string, 'Published' | 'Fitted 2025' | 'Assumption', string?][] = [
    ['Length', `${f.lengthKm.toFixed(3)} km`, 'Published'],
    ['Turns', String(f.turns), 'Published'],
    ['Race distance', `${f.raceLaps} laps`, 'Published', 'The ZERO HOUR scenario keeps the challenge setting of 53 laps.'],
    ['Pit loss', `${k.PIT_LOSS_BASE.toFixed(1)} s`, cal ? 'Fitted 2025' : 'Assumption', cal ? `Median of ${cal.pitLossSamples} green-flag stops, ${cal.source}` : undefined],
    ['Base pace', cal ? fmtLap(cal.basePaceSec) : fmtLap(c.basePace), cal ? 'Fitted 2025' : 'Assumption', cal ? `Zero-fuel, fresh-tyre reference lap from ${cal.cleanLaps} clean laps` : undefined],
    ['Safety Car', `${(c.scProbPerLap * 100).toFixed(0)}% / lap`, 'Assumption', 'Chance a new Safety Car starts on any lap. One race is too few to fit this.'],
  ];
  return (
    <section className="card" data-screen-label="Circuit profile" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, padding: '22px 28px', alignItems: 'center', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <CircuitMap circuit={FOCUS_CIRCUIT} deltas={null} width={220} sectorColors={['var(--red)', 'var(--amberFill)', 'var(--blue)']} />
          <div className="legend" style={{ fontSize: 11 }}>{['S1', 'S2', 'S3'].map((n, i) => <span key={n}><span style={{ width: 10, height: 3, borderRadius: 2, background: ['var(--red)', 'var(--amberFill)', 'var(--blue)'][i] }} />{n}</span>)}</div>
          <span style={{ fontSize: 10.5, color: 'var(--text2)' }}>Outline from OpenF1 car positions, 2025</span>
        </div>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <span className="label">Circuit · {f.country}</span>
          <div className="sora" style={{ fontSize: 24, fontWeight: 600, marginTop: 6 }}>{f.name}</div>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--text2)', lineHeight: 1.55, maxWidth: 640 }}>{f.character}</p>
        </div>
      </div>
      <div className="strip" style={{ border: 0, borderRadius: 0 }}>
        {cells.map(([l, v, t, tip]) => (
          <div key={l} className="cell" title={tip} style={{ flex: '1 1 140px' }}>
            <span className="label">{l}</span>
            <span className="sora" style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.1 }}>{v}</span>
            <Tag t={t} />
          </div>
        ))}
      </div>
    </section>
  );
}
