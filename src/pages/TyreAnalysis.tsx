import { useMemo, useState } from 'react';
import { useApp } from '../state/AppContext';
import type { Compound, CornerState } from '../engine/types';
import { TYRES } from '../engine/constants';
import { weatherPenalty } from '../engine/lapTime';
import { SegmentedControl } from '../components/ui';
import { TYRE_IMG, COMPOUND_NAME } from '../components/TyreThumb';
import { actionTitle, actionSub, planLine, fmtDelta } from '../components/Panels';
import { conditionIndex } from '../components/dashboard/Stage';
import { tyreLoss, crossoverLap, centralWetness } from '../components/strategyMath';
import { CALIBRATION } from '../data/calibration';
import { COMPOUND_COLOR } from '../styles/compounds';

const ORDER: Compound[] = ['SOFT', 'MEDIUM', 'HARD', 'INTER', 'WET'];
const SIDEWALL: Record<Compound, string> = { SOFT: 'Red', MEDIUM: 'Yellow', HARD: 'White', INTER: 'Green', WET: 'Blue' };
const DESC: Record<Compound, string> = {
  SOFT: 'High grip, shorter life. Useful when maximum pace is needed over a relatively short stint.',
  MEDIUM: 'A compromise between grip and durability when the stint has to be both quick and long.',
  HARD: 'Built for long stints and durability, with less immediate grip than a softer compound.',
  INTER: 'For damp or changing conditions, such as a track that is drying or becoming wet.',
  WET: 'For heavy rain and standing water. Worth using only when conditions justify a full wet.',
};
const CORNER_NAME = { FL: 'Front left', FR: 'Front right', RL: 'Rear left', RR: 'Rear right' } as const;
type Tag = 'SIMULATED INPUT' | 'MODEL ESTIMATE' | 'REAL HISTORICAL DATA' | 'HISTORICAL FIT' | 'NOT AVAILABLE';
const TAG_STYLE: Record<Tag, [string, string]> = {
  'SIMULATED INPUT': ['var(--amberTint)', 'var(--amber)'], 'MODEL ESTIMATE': ['var(--blueTint)', 'var(--blue)'],
  'REAL HISTORICAL DATA': ['var(--surface2)', 'var(--text2)'], 'HISTORICAL FIT': ['var(--greenTint)', 'var(--green)'],
  'NOT AVAILABLE': ['var(--surface2)', 'var(--text2)'],
};
const TagPill = ({ t }: { t: Tag }) => (
  <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.6px', padding: '2px 7px', borderRadius: 999, background: TAG_STYLE[t][0], color: TAG_STYLE[t][1], whiteSpace: 'nowrap' }}>{t}</span>
);
function Img({ c, size, r }: { c: Compound; size: number; r: number }) {
  return <div style={{ width: size, height: size, borderRadius: r, background: 'var(--tile)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flex: '0 0 auto' }}>
    <img src={TYRE_IMG[c]} alt={`${COMPOUND_NAME[c]} tyre`} style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply', display: 'block' }} /></div>;
}
const fit = (d: number): [string, string, string] => d < 0.5 ? ['Suited', 'var(--green)', 'var(--greenTint)'] : d < 3 ? ['Marginal', 'var(--amber)', 'var(--amberTint)'] : ['Poor', 'var(--red)', 'var(--redTint)'];

export function TyreAnalysis() {
  const { raceState: s, k, results, scenario, setScenario, mode, fixture, circuit, loading } = useApp();
  const [sel, setSel] = useState<Compound>(s.us.compound);
  const [corner, setCorner] = useState<CornerState['corner'] | null>(null);
  const [stintN, setStintN] = useState(10);
  const T = k.TYRES ?? TYRES, cal = CALIBRATION[circuit];
  const cur = s.us.compound, age = s.us.tyreAge, sigma = k.DEG_UNCERTAINTY;

  const lossNow = tyreLoss(cur, age, k), marginal = tyreLoss(cur, age + 1, k) - lossNow;
  const lvl = lossNow < 0.8 ? 'Low' : lossNow < 2 ? 'Moderate' : 'High';
  const lvlCol = lvl === 'Low' ? 'var(--green)' : lvl === 'Moderate' ? 'var(--amber)' : 'var(--red)';
  const peakWet = s.rainArrivalLap !== null ? Math.max(s.wetnessNow, s.rainIntensity) : s.wetnessNow;
  const pen = (c: Compound) => weatherPenalty(c, peakWet);
  const minPen = Math.min(...ORDER.map(pen));
  const sf = fit(pen(sel) - minPen);

  const X = (a: number) => 48 + a / 40 * 576, Y = (v: number) => 212 - Math.min(v, 8.4) / 8 * 198;
  const curve = (c: Compound, scale = k.DEG_MEAN_SCALE) => Array.from({ length: 41 }, (_, a) => `${a ? 'L' : 'M'}${X(a).toFixed(1)} ${Y(tyreLoss(c, a, k, scale)).toFixed(1)}`).join('');
  let band = curve(sel, k.DEG_MEAN_SCALE * (1 - sigma));
  for (let a = 40; a >= 0; a--) band += `L${X(a).toFixed(1)} ${Y(tyreLoss(sel, a, k, k.DEG_MEAN_SCALE * (1 + sigma))).toFixed(1)}`;
  band += 'Z';
  const dry = peakWet < 0.2, mx = X(Math.min(40, age));

  const table = useMemo(() => {
    const rows = ORDER.map(c => {
      let wear = 0; for (let a = 0; a < stintN; a++) wear += tyreLoss(c, a, k);
      const offset = T[c].offset * stintN, p = pen(c), tot = offset + wear + p * stintN;
      return { c, offset, wear, p, tot, f: fit(p - minPen) };
    });
    return { rows, min: Math.min(...rows.map(r => r.tot)) };
  }, [stintN, k, T, peakWet]);

  const xI = crossoverLap(s, k, 'INTER', ['SOFT', 'MEDIUM', 'HARD']);
  const xW = crossoverLap(s, k, 'WET', ['INTER']);
  const obsWx = mode === 'replay' && fixture ? fixture.weather.filter(w => w.lap <= s.currentLap).at(-1) : undefined;
  const scenWx = s.rainArrivalLap === null ? (s.wetnessNow > 0.2 ? 'Wet' : 'Dry') : `${s.rainIntensity > 0.7 ? 'Heavy rain' : 'Light rain'} · from lap ${s.rainArrivalLap}`;
  const wxRows: [string, string, Tag][] = [
    ['Observed weather', obsWx ? `${obsWx.rainfall ? 'Rain' : 'Dry'} · air ${obsWx.airTempC ?? '—'} °C` : 'No live source', obsWx ? 'REAL HISTORICAL DATA' : 'NOT AVAILABLE'],
    ['Scenario weather', scenWx, mode === 'replay' ? 'REAL HISTORICAL DATA' : 'SIMULATED INPUT'],
    ['Track temperature', s.trackTempC != null ? `${s.trackTempC} °C` : 'Not recorded', mode === 'replay' ? 'REAL HISTORICAL DATA' : 'SIMULATED INPUT'],
    ['Intermediate crossover', xI ? `Lap ${xI}` : 'None, slicks stay faster', 'MODEL ESTIMATE'],
    ['Wet crossover', xW ? `Lap ${xW}` : 'None in scenario', 'MODEL ESTIMATE'],
  ];

  const best = results[0];
  const stopNow = results.find(r => r.strategy.pitLap === s.currentLap), stay = results.find(r => r.strategy.pitLap === null);
  const pitStat = (stopNow && stay) ? ` Stopping now is ${Math.abs(stay.meanTime - stopNow.meanTime).toFixed(1)} s ${stay.meanTime >= stopNow.meanTime ? 'faster' : 'slower'} than staying out under our model.` : '';
  const nextC = best ? (best.strategy.pitLap === null ? cur : best.strategy.compound) : cur;
  const scOn = s.safetyCarActive;

  const prov: [string, string, Tag][] = [
    ['Degradation curve', `linear to the cliff, then steeper: ${ORDER.map(c => `${COMPOUND_NAME[c]} ${T[c].deg.toFixed(3)}→${T[c].cliffDeg.toFixed(2)} s/lap after L${T[c].cliffLap}`).join(' · ')}`, 'MODEL ESTIMATE'],
    ['Degradation scenario', `${scenario.deg[0].toUpperCase() + scenario.deg.slice(1)} wear (×${k.DEG_MEAN_SCALE.toFixed(2)})`, 'SIMULATED INPUT'],
    ['Stint age', `${age} laps`, mode === 'replay' ? 'REAL HISTORICAL DATA' : 'SIMULATED INPUT'],
    ['Reference lap time', `Base ${s.us.basePace.toFixed(2)} s${cal ? `, fitted from ${cal.source}` : ''}`, cal ? 'HISTORICAL FIT' : 'MODEL ESTIMATE'],
    ['Pit loss', `${k.PIT_LOSS_BASE.toFixed(1)} s${cal ? ` (median of ${cal.pitLossSamples} stops, ${cal.source})` : ''}`, cal ? 'HISTORICAL FIT' : 'MODEL ESTIMATE'],
    ['Tyre wear fit', cal ? `Fitted slopes ${Object.entries(cal.deg).map(([c, v]) => `${c} ${v}`).join(', ')} s/lap are available in Assumptions; not applied by default (track evolution hides wear)` : 'Not performed', cal ? 'HISTORICAL FIT' : 'NOT AVAILABLE'],
    ['Uncertainty band', `±1σ on the degradation multiplier (σ ${sigma.toFixed(2)})`, 'MODEL ESTIMATE'],
    ['Live data', 'Not connected', 'NOT AVAILABLE'],
  ];
  const card = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14 } as const;
  const G = { display: 'grid', gridTemplateColumns: '1.4fr .9fr .9fr 1fr 1fr .9fr .8fr .9fr', gap: 10 } as const;

  return (
    <div data-screen-label="Tyre Analysis page" style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <div className="row"><span className="label">Tyre analysis</span><TagPill t="MODEL ESTIMATE" /></div>
          <h1 className="page-h1">Tyre performance</h1>
          <p style={{ margin: '8px 0 0', fontSize: 14.5, color: 'var(--text2)', lineHeight: 1.5, maxWidth: 620 }}>How the tyres are affecting lap time, and when to change them. Pace loss is estimated from the strategy model, not measured wear.</p>
        </div>
        {mode === 'scenario' && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 12, color: 'var(--text2)' }}>Scenario weather</span>
          <div className="tseg-host"><SegmentedControl value={scenario.wx} onChange={wx => setScenario({ wx })} full={false} options={[{ value: 'dry', label: 'Dry' }, { value: 'light', label: 'Light rain' }, { value: 'heavy', label: 'Heavy rain' }]} /></div></div>}
      </div>

      <div className="strip">
        <div className="cell" style={{ flex: '1 1 200px', gap: 8 }}><span className="label">Current tyre</span>
          <div className="row" style={{ gap: 12 }}><Img c={cur} size={46} r={10} /><div><div className="sora" style={{ fontSize: 24, letterSpacing: -.4 }}>{COMPOUND_NAME[cur]}</div><div style={{ fontSize: 12, color: 'var(--text2)' }}>{SIDEWALL[cur]} · {mode === 'replay' ? s.driverCode : 'selected car'}</div></div></div></div>
        <div className="cell" style={{ flex: '1 1 170px' }}><span className="label">Stint age</span><span className="sora" style={{ fontSize: 24, letterSpacing: -.4 }}>{age} laps</span><span style={{ fontSize: 12, color: 'var(--text2)' }}>Fitted on lap {Math.max(1, s.currentLap - age)} · {mode === 'replay' ? 'recorded' : 'simulated input'}</span></div>
        <div className="cell" style={{ flex: '1 1 170px' }}><span className="label">Estimated degradation</span><span className="sora" style={{ fontSize: 24, letterSpacing: -.4, color: lvlCol }}>{lvl}</span><span style={{ fontSize: 12, color: 'var(--text2)' }}>Model classification of pace loss</span></div>
        <div className="cell" style={{ flex: '1 1 170px' }}><span className="label">Estimated pace loss</span><span className="sora" style={{ fontSize: 24, letterSpacing: -.4 }}>+{lossNow.toFixed(1)} s/lap</span><span style={{ fontSize: 12, color: 'var(--text2)' }}>vs a fresh {COMPOUND_NAME[cur]} · +{marginal.toFixed(2)} s per extra lap</span></div>
      </div>

      <section style={{ ...card, padding: '22px 24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="row between wrap" style={{ alignItems: 'baseline', gap: 8 }}><span className="label">Tyre compound overview</span><span style={{ fontSize: 12, color: 'var(--text2)' }}>Select a compound to inspect it on the chart and table below</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(172px,1fr))', gap: 12 }}>
          {ORDER.map(c => (
            <button key={c} className="ta-card" aria-pressed={sel === c} onClick={() => setSel(c)}
              style={{ textAlign: 'left', cursor: 'pointer', color: 'var(--text)', background: 'var(--surface)', border: `1.5px solid ${sel === c ? COMPOUND_COLOR[c] : 'var(--line)'}`, boxShadow: sel === c ? '0 10px 26px -14px rgba(0,0,0,.45)' : 'var(--shadow)', borderRadius: 14, padding: '8px 8px 14px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
              <div style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 10, background: 'var(--tile)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <img src={TYRE_IMG[c]} alt={`${COMPOUND_NAME[c]} tyre, ${SIDEWALL[c]} sidewall`} style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply', display: 'block' }} />
                {c === cur && <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 9.5, fontWeight: 700, letterSpacing: '.8px', padding: '3px 7px', borderRadius: 999, background: '#0F1319', color: '#fff' }}>ON CAR</span>}
              </div>
              <div style={{ padding: '0 6px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="row" style={{ gap: 8 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: COMPOUND_COLOR[c] }} /><span style={{ fontSize: 14.5, fontWeight: 600 }}>{COMPOUND_NAME[c]}</span><span style={{ fontSize: 12, color: 'var(--text2)' }}>{SIDEWALL[c]}</span></div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{DESC[c]}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="strip" style={{ borderRadius: 10 }}>
          {([
            ['Base degradation rate', `+${(T[sel].deg * k.DEG_MEAN_SCALE).toFixed(3)} s/lap per lap, ${(T[sel].cliffDeg * k.DEG_MEAN_SCALE).toFixed(2)} after lap ${T[sel].cliffLap}`, 'var(--text)'],
            [`Loss at ${age} laps`, `+${tyreLoss(sel, age, k).toFixed(1)} s/lap`, 'var(--text)'],
            ['Loss at 30 laps', `+${tyreLoss(sel, 30, k).toFixed(1)} s/lap`, 'var(--text)'],
            ['Fit for scenario weather', `${sf[0]}${pen(sel) > 0.05 ? ` · +${pen(sel).toFixed(1)} s/lap` : ''}`, sf[1]],
          ] as const).map(([l, v, c]) => (
            <div key={l} style={{ flex: '1 1 170px', background: 'var(--surface2)', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>{l}</span><span style={{ fontSize: 14, fontWeight: 600, color: c }}>{v}</span></div>
          ))}
        </div>
      </section>

      <div className="dash-row">
        <section style={{ ...card, flex: '2 1 520px', minWidth: 0, padding: '22px 24px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="row between wrap" style={{ alignItems: 'baseline', gap: 8 }}><span className="label">Degradation curves</span><span className="cap">Model · {scenario.deg[0].toUpperCase() + scenario.deg.slice(1)} wear</span></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ORDER.map(c => (
              <button key={c} onClick={() => setSel(c)} style={{ display: 'flex', alignItems: 'center', gap: 7, height: 28, padding: '0 11px', borderRadius: 999, border: '1px solid var(--line)', background: sel === c ? 'var(--surface2)' : 'transparent', color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: sel === c ? 1 : .65 }}>
                <span style={{ width: 14, height: 3, borderRadius: 2, background: COMPOUND_COLOR[c] }} />{COMPOUND_NAME[c]}</button>
            ))}
          </div>
          <svg viewBox="0 0 640 250" role="img" aria-label="Estimated lap-time loss against tyre age" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
            <g style={{ stroke: 'var(--grid)', strokeWidth: 1 }}>{[212, 162.5, 113, 63.5, 14].map(y => <line key={y} x1={48} y1={y} x2={624} y2={y} />)}</g>
            <g style={{ fontSize: 10.5, fill: 'var(--text2)' }} textAnchor="end">{['0', '2', '4', '6', '8 s'].map((t, i) => <text key={t} x={40} y={216 - i * 49.5}>{t}</text>)}</g>
            <g style={{ fontSize: 10.5, fill: 'var(--text2)' }} textAnchor="middle">{['0', '10', '20', '30', '40 laps'].map((t, i) => <text key={t} x={48 + i * 144} y={232}>{t}</text>)}</g>
            <path d={band} style={{ fill: COMPOUND_COLOR[sel], opacity: .16, stroke: 'none' }} />
            {(['HARD', 'WET', 'INTER', 'SOFT', 'MEDIUM'] as Compound[]).sort((a, b) => (a === sel ? 1 : 0) - (b === sel ? 1 : 0)).map(c => (
              <path key={c} d={curve(c)} style={{ fill: 'none', stroke: COMPOUND_COLOR[c], strokeWidth: sel === c ? 3.2 : 1.8, opacity: sel === c ? 1 : .42, strokeLinecap: 'round', strokeLinejoin: 'round', strokeDasharray: (c === 'INTER' || c === 'WET') && dry ? '5 5' : undefined }} />
            ))}
            <line x1={mx} y1={14} x2={mx} y2={212} style={{ stroke: 'var(--text2)', strokeWidth: 1, strokeDasharray: '3 4' }} />
            <circle cx={mx} cy={Y(lossNow)} r={5.5} style={{ fill: 'var(--surface)', stroke: COMPOUND_COLOR[cur], strokeWidth: 3 }} />
            <text x={mx > 480 ? mx - 8 : mx + 8} y={26} textAnchor={mx > 480 ? 'end' : 'start'} style={{ fontSize: 11, fontWeight: 600, fill: 'var(--text)' }}>Now · {age} laps · {COMPOUND_NAME[cur]}</text>
          </svg>
          <div className="cap" style={{ lineHeight: 1.5 }}>Shaded band: ±1σ degradation uncertainty for the selected compound (σ {sigma.toFixed(2)}). Curves are the engine's tyre model, not a fit to recorded laps.{dry ? ' Dashed Intermediate and Wet curves are reference only while the track is dry.' : ''}</div>
        </section>
        <section style={{ ...card, flex: '1 1 300px', minWidth: 0, padding: '22px 24px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="row between" style={{ alignItems: 'baseline' }}><span className="label">Individual tyres</span><span className="cap">Model estimate</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, flex: 1 }}>
            {s.corners.map(c => {
              const v = conditionIndex(c, k), on = corner === c.corner;
              const lv = v < 30 ? 'Low' : v <= 60 ? 'Moderate' : 'High', col = v < 30 ? 'var(--red)' : v <= 60 ? 'var(--amber)' : 'var(--green)';
              return (
                <button key={c.corner} onClick={() => setCorner(x => x === c.corner ? null : c.corner)} title="Modelled condition index — not a measured wear value."
                  style={{ textAlign: 'left', cursor: 'pointer', color: 'var(--text)', background: 'var(--surface)', border: `1.5px solid ${on ? 'var(--red)' : 'var(--line)'}`, boxShadow: on ? '0 0 0 3px var(--redTint)' : 'var(--shadow)', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                  <div className="row" style={{ gap: 10 }}><Img c={c.compound} size={38} r={8} /><div><div style={{ fontSize: 13, fontWeight: 600 }}>{CORNER_NAME[c.corner]}</div><div style={{ fontSize: 11.5, color: 'var(--text2)' }}>{COMPOUND_NAME[c.compound]} · {c.stintAge} laps</div></div></div>
                  <div className="row between" style={{ alignItems: 'baseline' }}><span style={{ fontSize: 12, fontWeight: 600, color: col, whiteSpace: 'nowrap' }}>{lv} · {v}%</span><span style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>+{c.paceLossSec.toFixed(1)} s/lap</span></div>
                  {on && <div style={{ fontSize: 11.5, color: 'var(--text2)' }}>Laps to drop-off: <b style={{ color: 'var(--text)' }}>{c.lapsToDropOff === 0 ? 'past drop-off' : c.lapsToDropOff}</b> · trend {c.trend}</div>}
                </button>
              );
            })}
          </div>
          <div className="cap" style={{ lineHeight: 1.5 }}>Per-tyre condition is not measured. Values are modelled pace effects.</div>
        </section>
      </div>

      <section style={{ ...card, padding: '22px 24px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="row between wrap" style={{ gap: '12px 24px' }}>
          <div><span className="label">Compound comparison</span><div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>Model estimate · a fresh stint on the scenario's conditions</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '0 1 260px', minWidth: 200 }}>
            <div className="row between" style={{ alignItems: 'baseline' }}><span style={{ fontSize: 12.5, color: 'var(--text2)' }}>Stint length</span><span className="sora" style={{ fontSize: 14, fontWeight: 500 }}>{stintN} laps</span></div>
            <input type="range" min={5} max={20} step={1} value={stintN} onChange={e => setStintN(+e.target.value)} />
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 720, display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...G, padding: '0 12px 8px', fontSize: 11, color: 'var(--text2)' }}><span>Compound</span><span>Base deg. rate</span><span>Pace offset</span><span>Tyre wear</span><span>Wet-track penalty</span><span>Stint cost</span><span>±1σ</span><span>Fit</span></div>
          {table.rows.map(r => (
            <div key={r.c} style={{ ...G, alignItems: 'center', padding: '9px 12px', borderRadius: 10, fontSize: 13, background: r.tot === table.min ? 'var(--surface2)' : 'transparent' }}>
              <div className="row" style={{ gap: 10, minWidth: 0 }}><Img c={r.c} size={32} r={7} /><span style={{ fontWeight: 600 }}>{COMPOUND_NAME[r.c]}</span>{r.tot === table.min && <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.6px', padding: '2px 7px', borderRadius: 999, background: 'var(--greenTint)', color: 'var(--green)' }}>LOWEST</span>}</div>
              <span style={{ color: 'var(--text2)' }}>+{(T[r.c].deg * k.DEG_MEAN_SCALE).toFixed(3)}</span>
              <span style={{ color: 'var(--text2)' }}>{r.offset.toFixed(1)} s</span>
              <span>{r.wear.toFixed(1)} s</span>
              <span style={{ color: 'var(--text2)' }}>{r.p < 0.05 ? 'None' : `+${r.p.toFixed(1)} s/lap`}</span>
              <span style={{ fontWeight: 600 }}>{r.tot.toFixed(1)} s</span>
              <span style={{ color: 'var(--text2)' }}>± {(r.wear * sigma).toFixed(1)} s</span>
              <span><span className="pill" style={{ fontSize: 11.5, background: r.f[2], color: r.f[1] }}>{r.f[0]}</span></span>
            </div>
          ))}
        </div></div>
        <div className="cap" style={{ lineHeight: 1.5 }}>Stint cost = compound pace offset + modelled wear + wet-track penalty, summed over the stint. Penalties use the scenario's peak wetness for every lap.</div>
      </section>

      <div className="dash-row">
        <section style={{ ...card, flex: '1 1 340px', minWidth: 0, padding: '22px 24px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="label">Weather and crossover</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {wxRows.map(([l, v, t]) => (
              <div key={l} className="row between" style={{ gap: 10, padding: '9px 0', borderTop: '1px solid var(--line)', fontSize: 13 }}>
                <span style={{ color: 'var(--text2)' }}>{l}</span>
                <span className="row wrap" style={{ gap: 8, justifyContent: 'flex-end' }}><span style={{ fontWeight: 600 }}>{v}</span><TagPill t={t} /></span>
              </div>
            ))}
          </div>
          <div className="cap" style={{ lineHeight: 1.5 }}>A crossover is the first lap where a wetter tyre is modelled faster than the best slick, with rain arriving as forecast (wetness {centralWetness(s, s.totalLaps).toFixed(2)} by the flag). Observed, forecast and simulated weather are kept separate.</div>
        </section>
        <section style={{ ...card, flex: '1.3 1 440px', minWidth: 0, padding: '22px 24px 20px', display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
          <div className="row between" style={{ alignItems: 'baseline' }}><span className="label">Pit-stop timing</span><TagPill t="MODEL ESTIMATE" /></div>
          {best && <>
            <div className="row" style={{ gap: 14 }}><Img c={nextC} size={64} r={12} />
              <div><div className="sora" style={{ fontSize: 20, letterSpacing: -.3, lineHeight: 1.25 }}>{best.strategy.pitLap === null ? 'Current tyre stays competitive' : `${actionTitle(best.strategy, s)} · lap ${best.strategy.pitLap}`}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text2)', marginTop: 3 }}>{actionSub(best.strategy, s)}</div></div></div>
            <div style={{ fontSize: 13.5, lineHeight: 1.55 }}>The current {COMPOUND_NAME[cur]} is about {lossNow.toFixed(1)} s/lap slower than a fresh one, and the gap grows by roughly {marginal.toFixed(2)} s with every extra lap.{pitStat} Reassess the compound if rain arrives sooner than assumed.</div>
            <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
              {results.slice(0, 3).map((r, i) => (
                <div key={r.strategy.id} className="row between" style={{ gap: 12, padding: '9px 14px', fontSize: 12.5, background: i === 0 ? 'var(--surface2)' : 'transparent', borderTop: i ? '1px solid var(--line)' : 0 }}>
                  <span style={{ minWidth: 0 }}><b>{actionTitle(r.strategy, s)}</b> <span style={{ color: 'var(--text2)' }}>· {planLine(r)}</span></span>
                  <span style={{ fontWeight: 600, whiteSpace: 'nowrap', color: i === 0 ? 'var(--green)' : r.medianDelta > 10 ? 'var(--red)' : 'var(--text)' }}>{i === 0 ? 'Best' : fmtDelta(r.medianDelta)}</span>
                </div>
              ))}
            </div>
          </>}
          <div className="cap" style={{ lineHeight: 1.5 }}>Pit loss {k.PIT_LOSS_BASE.toFixed(1)} s{scOn ? ` (${(k.PIT_LOSS_BASE * k.SC_PIT_MULTIPLIER).toFixed(1)} s while the Safety Car is out, to lap ${s.currentLap + s.safetyCarLapsRemaining - 1})` : ''}. Strategy totals come from the same engine as the dashboard and simulator.</div>
          {loading && <div className="overlay" style={{ borderRadius: 14, opacity: .7 }}><div className="spin" style={{ width: 18, height: 18 }} /></div>}
        </section>
      </div>

      <details className="card">
        <summary style={{ cursor: 'pointer', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', listStyle: 'none' }}><span className="label">Assumptions and data provenance</span><span style={{ fontSize: 12, color: 'var(--text2)' }}>Show or hide</span></summary>
        <div style={{ padding: '0 24px 18px' }}>
          {prov.map(([a, b, t]) => (
            <div key={a} className="row between" style={{ gap: 14, padding: '9px 0', borderTop: '1px solid var(--line)', fontSize: 12.5 }}>
              <span><b>{a}</b> <span style={{ color: 'var(--text2)' }}>· {b}</span></span><TagPill t={t} /></div>
          ))}
        </div>
      </details>
      <div style={{ fontSize: 12, color: 'var(--text2)', padding: '0 2px 8px' }}>Simulated model outputs. Not validated race predictions. Pace loss is an estimate, not physical tyre wear.</div>
    </div>
  );
}
