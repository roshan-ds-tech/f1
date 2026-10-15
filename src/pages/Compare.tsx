import { useMemo } from 'react';
import { useApp } from '../state/AppContext';
import { DEFAULT_SCENARIO, type ScenarioInputs, type StrategyResult } from '../engine/types';
import { CIRCUITS, DEFAULTS } from '../engine/constants';
import { recommend } from '../engine/recommend';
import { deriveRaceState, degConstants } from '../state/deriveRaceState';
import { CALIBRATION } from '../data/calibration';
import { SegmentedControl } from '../components/ui';
import { TyreThumb, COMPOUND_NAME } from '../components/TyreThumb';
import { actionTitle, fmtTime, RISK_C } from '../components/Panels';
import { breakdown, COMPONENTS, type Breakdown } from '../components/strategyMath';

const ROW = { display: 'grid', gridTemplateColumns: '34px minmax(0,1.7fr) minmax(0,.9fr) minmax(0,.7fr) minmax(0,1.5fr) minmax(0,.6fr)', gap: '0 16px', alignItems: 'center' } as const;
const sgn = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(1)} s`;
const WX_LABEL = { dry: 'Dry', light: 'Light rain', heavy: 'Heavy rain' } as const;
const DEG_LABEL = { low: 'Low', nominal: 'Nominal', high: 'High' } as const;
const plan = (r: StrategyResult) => r.strategy.pitLap === null ? 'No stop, run to the flag' : `L${r.strategy.pitLap} ${COMPOUND_NAME[r.strategy.compound]}`;

export function Compare() {
  const { results, raceState: s, k, scenario, setScenario, resetScenario, selectedId, setSelectedId, mode, circuit, kOverrides, setK, clearK, loading } = useApp();
  const fittedPit = CALIBRATION[circuit]?.pitLossSec ?? CIRCUITS[circuit].pitLossBase;
  const pg = k.PIT_LOSS_BASE;
  const best = results[0], next = results[1];
  const A = results.find(r => r.strategy.id === selectedId) ?? best;
  const R = A === best ? next : best;

  // Baseline = the ZERO HOUR defaults with the fitted pit loss. Smaller pools: it's only for the verdict line.
  const baseline = useMemo(() => {
    if (mode !== 'scenario') return null;
    const st = deriveRaceState({ mode: 'scenario', circuit, lap: s.currentLap, scenario: DEFAULT_SCENARIO, fixture: null, driverCode: '' });
    return recommend(st, { ...DEFAULTS, ...k, PIT_LOSS_BASE: fittedPit, ...degConstants('nominal'), COARSE_SCENARIOS: 100, FINE_SCENARIOS: 400 }, 42);
  }, [mode, circuit, s.currentLap, fittedPit, k.TYRES]); // eslint-disable-line react-hooks/exhaustive-deps

  const bd = useMemo(() => new Map(results.map(r => [r.strategy.id, breakdown(s, r.strategy, k)])), [results, s, k]);
  const changedItems: string[] = [];
  if (scenario.wx !== DEFAULT_SCENARIO.wx) changedItems.push(`Weather: ${WX_LABEL[DEFAULT_SCENARIO.wx]} → ${WX_LABEL[scenario.wx]}`);
  else if (scenario.wx !== 'dry' && scenario.rainArrivalOffset !== DEFAULT_SCENARIO.rainArrivalOffset) changedItems.push(`Rain: in ${DEFAULT_SCENARIO.rainArrivalOffset} → ${scenario.rainArrivalOffset} laps`);
  if (scenario.sc !== DEFAULT_SCENARIO.sc) changedItems.push(`Safety Car: ${DEFAULT_SCENARIO.sc ? 'Deployed' : 'Clear'} → ${scenario.sc ? 'Deployed' : 'Clear'}`);
  if (scenario.deg !== DEFAULT_SCENARIO.deg) changedItems.push(`Wear: ${DEG_LABEL[DEFAULT_SCENARIO.deg]} → ${DEG_LABEL[scenario.deg]}`);
  if (scenario.tyreAge !== DEFAULT_SCENARIO.tyreAge) changedItems.push(`Tyre age: ${DEFAULT_SCENARIO.tyreAge} → ${scenario.tyreAge} laps`);
  if (kOverrides.PIT_LOSS_BASE !== undefined) changedItems.push(`Pit loss: ${fittedPit.toFixed(1)} → ${pg.toFixed(1)} s`);
  const changed = changedItems.length > 0;
  const b0 = baseline?.[0];
  const verdict = !changed ? 'Matches the ZERO HOUR scenario.' : !b0 || !best ? 'Recalculating…'
    : b0.strategy.id === best.strategy.id ? `Recommendation unchanged: ${actionTitle(best.strategy, s)}.` : `Recommendation changed: ${actionTitle(b0.strategy, s)} (${plan(b0)}) → ${actionTitle(best.strategy, s)} (${plan(best)}).`;
  const vsub = !changed ? 'Change a condition above and the ranking recalculates.' : `${changedItems.join(' · ')}.${next && baseline?.[1] ? ` Margin ${next.medianDelta.toFixed(1)} s (was ${baseline[1].medianDelta.toFixed(1)} s).` : ''}`;

  // Explanations from the central-scenario breakdown (labelled as such).
  const dif = (X: Breakdown, Y: Breakdown) => COMPONENTS.map(([l, c, n]) => ({ l, n, d: X[c] - Y[c] })).filter(x => Math.abs(x.d) >= .5).sort((p, q) => Math.abs(q.d) - Math.abs(p.d));
  const body = (a: StrategyResult, r: StrategyResult) => {
    const d = dif(bd.get(a.strategy.id)!, bd.get(r.strategy.id)!);
    const g = d.filter(x => x.d < 0).slice(0, 2).map(x => `${Math.abs(x.d).toFixed(1)} s of ${x.n}`).join(' and ');
    const c = d.filter(x => x.d > 0).slice(0, 2).map(x => `${x.d.toFixed(1)} s of ${x.n}`).join(' and ');
    const rt = actionTitle(r.strategy, s).toLowerCase();
    let t = g && c ? `Saves ${g} but gives up ${c}` : g ? `Saves ${g}` : c ? `Gives up ${c}` : `Within 0.5 s of ${rt} on every component`;
    t += ` versus ${rt}.`;
    const p = a.strategy.pitLap;
    if (s.safetyCarActive && p !== null && p < s.currentLap + s.safetyCarLapsRemaining) t += ` Stopping under the Safety Car costs ${(pg * k.SC_PIT_MULTIPLIER).toFixed(1)} s instead of ${pg.toFixed(1)} s.`;
    return t;
  };
  const head = best && next ? `${actionTitle(best.strategy, s)} (${plan(best)}) ranks first, ${next.medianDelta.toFixed(1)} s ahead of ${actionTitle(next.strategy, s).toLowerCase()} (${plan(next)}).` : '';
  const dep = `This depends on ${s.rainArrivalLap === null ? 'the track staying dry' : `rain arriving around lap ${s.rainArrivalLap}`}, ${DEG_LABEL[scenario.deg].toLowerCase()} tyre wear${s.safetyCarActive ? ', the Safety Car window' : ''} and a ${pg.toFixed(1)} s pit-loss estimate.`;

  const lo = Math.min(...results.map(r => r.p5)), hi = Math.max(...results.map(r => r.p95)), sp = Math.max(1, hi - lo);
  const px = (v: number) => `${(3 + (v - lo) / sp * 94).toFixed(1)}%`;
  const maxD = Math.max(1, ...results.map(r => r.medianDelta));
  const ahead = s.rivals.filter(r => r.startOffsetSec < 0);
  const gapTxt = s.position === 1 ? 'Leader' : ahead.length === s.position - 1 && ahead.length ? `+${(-Math.min(...ahead.map(r => r.startOffsetSec))).toFixed(1)} s to leader` : 'Leader gap not modelled';
  const ctx: [string, string, string, string][] = [
    ['Lap', `${s.currentLap} / ${s.totalLaps}`, `${s.totalLaps - s.currentLap} laps remaining`, 'var(--text)'],
    ['Position', `P${s.position}`, gapTxt, 'var(--red)'],
    ['Tyre', COMPOUND_NAME[s.us.compound], `${s.us.tyreAge} laps old`, 'var(--text)'],
    ['Track', s.safetyCarActive ? 'Safety Car' : 'Green flag', s.safetyCarActive ? `Pit loss ${(pg * k.SC_PIT_MULTIPLIER).toFixed(1)} s` : `Pit loss ${pg.toFixed(1)} s`, s.safetyCarActive ? 'var(--red)' : 'var(--green)'],
    ['Weather', s.rainArrivalLap === null ? (s.wetnessNow > .2 ? 'Wet' : 'Dry') : WX_LABEL[scenario.wx], s.rainArrivalLap === null ? 'No rain modelled' : `from lap ${s.rainArrivalLap}`, 'var(--text)'],
    ['Objective', 'Lowest time', 'Remaining race time', 'var(--text)'],
  ];
  const setWhatIf = (p: Partial<ScenarioInputs>) => { setScenario(p); setSelectedId(null); };
  const A_bd = A ? bd.get(A.strategy.id) : undefined, R_bd = R ? bd.get(R.strategy.id) : undefined;

  return (
    <div data-screen-label="Compare Strategies page" style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      <div style={{ padding: '8px 0 4px' }}>
        <div className="row"><span className="label">Compare strategies</span><span className="pill" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.8px', color: 'var(--amber)', background: 'var(--amberTint)' }}>SIMULATED</span></div>
        <h1 className="page-h1">Which pit call is best?</h1>
        <p style={{ margin: '8px 0 0', fontSize: 14.5, color: 'var(--text2)', lineHeight: 1.5, maxWidth: 560 }}>Every option is tested against the same simulated futures, so differences come from the strategy, not luck.</p>
      </div>

      <div className="strip">
        {ctx.map(([l, v, sub, c]) => (
          <div key={l} className="cell" style={{ flex: '1 1 140px', padding: '14px 20px', gap: 5 }}><span className="label">{l}</span>
            <span className="sora" style={{ fontSize: 19, fontWeight: 500, lineHeight: 1.15, whiteSpace: 'nowrap', color: c }}>{v}</span><span style={{ fontSize: 12, color: 'var(--text2)' }}>{sub}</span></div>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', minWidth: 0 }}>
        <div style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
          {best && <section className="card" style={{ padding: '26px 30px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="row between wrap" style={{ gap: 8 }}><span className="label">Best modelled strategy</span><span className="pill" style={{ background: 'var(--greenTint)', color: 'var(--green)' }}>Lowest remaining time</span></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ minWidth: 0 }}><div className="sora" style={{ fontSize: 44, fontWeight: 500, letterSpacing: -1.2, lineHeight: 1.05 }}>{actionTitle(best.strategy, s)}</div><div style={{ fontSize: 14, color: 'var(--text2)', marginTop: 10 }}>{plan(best)}</div></div>
              <TyreThumb c={best.strategy.pitLap === null ? s.us.compound : best.strategy.compound} w={60} h={52} radius={10} />
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text2)' }}>{head} {dep}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: 18, gap: '16px 0' }}>
              <div style={{ flex: '1 1 140px' }}><div style={{ fontSize: 12, color: 'var(--text2)' }}>Est. remaining time</div><div className="sora" style={{ fontSize: 26, fontWeight: 500, marginTop: 4, whiteSpace: 'nowrap' }}>{fmtTime(best.meanTime)}</div></div>
              <div style={{ flex: '1 1 140px', paddingLeft: 24, borderLeft: '1px solid var(--line)' }}><div style={{ fontSize: 12, color: 'var(--text2)' }}>Advantage vs next best</div><div className="sora" style={{ fontSize: 26, fontWeight: 500, marginTop: 4, color: 'var(--green)', whiteSpace: 'nowrap' }}>{next ? `${next.medianDelta.toFixed(1)} s` : '—'}</div></div>
              <div style={{ flex: '1 1 140px', paddingLeft: 24, borderLeft: '1px solid var(--line)' }}><div style={{ fontSize: 12, color: 'var(--text2)' }}>Outcome spread (P5 to P95)</div><div className="sora" style={{ fontSize: 26, fontWeight: 500, marginTop: 4, whiteSpace: 'nowrap' }}>{(best.p95 - best.p5).toFixed(0)} s</div></div>
            </div>
          </section>}

          <section className="card" style={{ padding: '24px 0 14px', overflowX: 'auto' }}>
            <div className="row between" style={{ padding: '0 30px 12px', alignItems: 'baseline' }}><span className="label">Ranked by remaining time</span><span style={{ fontSize: 12, color: 'var(--text2)' }}>Select one for detail</span></div>
            <div style={{ minWidth: 620 }}>
              <div style={{ ...ROW, padding: '0 30px 10px', fontSize: 10.5, fontWeight: 600, letterSpacing: 1.2, color: 'var(--text2)' }}><span>RANK</span><span>STRATEGY</span><span style={{ textAlign: 'right' }}>REMAINING</span><span style={{ textAlign: 'right' }}>VS BEST</span><span>OUTCOME RANGE</span><span style={{ textAlign: 'right' }}>RISK</span></div>
              {results.map((r, i) => {
                const on = r === A, c = i === 0 ? 'var(--red)' : 'var(--text2)';
                return (
                  <div key={r.strategy.id} className="alt" onClick={() => setSelectedId(r.strategy.id)} style={{ ...ROW, padding: '15px 30px', borderTop: '1px solid var(--line)', background: on ? 'var(--surface2)' : undefined }}>
                    <span className="sora" style={{ fontSize: 16, fontWeight: 500, color: c }}>{i + 1}</span>
                    <div className="row" style={{ gap: 12, minWidth: 0 }}>
                      <span className="radio" style={{ borderColor: on ? 'var(--red)' : 'var(--line)' }}><span style={{ background: on ? 'var(--red)' : 'transparent' }} /></span>
                      <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 14.5 }}>{actionTitle(r.strategy, s)}</div><div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>{plan(r)}</div></div>
                    </div>
                    <div className="sora" style={{ fontSize: 15, fontWeight: 500, textAlign: 'right' }}>{fmtTime(r.meanTime)}</div>
                    <div className="sora" style={{ fontSize: 14, fontWeight: 500, textAlign: 'right', color: r.medianDelta < .05 ? 'var(--text2)' : 'var(--text)' }}>{r.medianDelta < .05 ? '—' : `+${r.medianDelta.toFixed(1)} s`}</div>
                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ position: 'relative', height: 6, borderRadius: 3, background: 'var(--grid)' }}>
                        <div style={{ position: 'absolute', top: 0, bottom: 0, left: px(r.p5), width: `${Math.max(.8, (r.p95 - r.p5) / sp * 94).toFixed(1)}%`, borderRadius: 3, background: c, opacity: .4 }} />
                        <div style={{ position: 'absolute', top: -3, bottom: -3, left: px(r.meanTime), width: 2, borderRadius: 1, background: c }} />
                      </div>
                      <span style={{ fontSize: 11.5, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{fmtTime(r.p5)} – {fmtTime(r.p95)}</span>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 600, color: RISK_C[r.risk] }}>{r.risk}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '12px 30px 0', fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, borderTop: '1px solid var(--line)' }}>Bars show the 5th to 95th percentile of remaining time across {k.FINE_SCENARIOS.toLocaleString()} simulated futures; the tick is the mean. Every strategy sees the same futures.</div>
          </section>

          {A && R && A_bd && R_bd && (
            <div className="chart-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))' }}>
              <section className="chart" style={{ padding: '24px 28px 22px', gap: 14 }}>
                <div className="row between" style={{ alignItems: 'baseline' }}><span className="label">Time vs best</span><span className="cap">Modelled estimate</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginTop: 6 }}>
                  {results.map((r, i) => (
                    <div key={r.strategy.id} onClick={() => setSelectedId(r.strategy.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <span style={{ flex: '0 0 120px', fontSize: 13, fontWeight: r === A ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={plan(r)}>{actionTitle(r.strategy, s)} <span style={{ color: 'var(--text2)', fontWeight: 500 }}>{r.strategy.pitLap === null ? '' : COMPOUND_NAME[r.strategy.compound][0]}</span></span>
                      <div style={{ flex: 1, minWidth: 0, height: 14, borderRadius: 3, background: 'var(--grid)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${(i === 0 ? 0 : Math.max(2, r.medianDelta / maxD * 100)).toFixed(1)}%`, background: r === A ? 'var(--red)' : 'var(--text2)', borderRadius: 3, transition: 'width .4s' }} /></div>
                      <span className="sora" style={{ flex: '0 0 62px', textAlign: 'right', fontSize: 13, fontWeight: 500, color: i === 0 ? 'var(--green)' : 'var(--text)' }}>{i === 0 ? 'Best' : `+${r.medianDelta.toFixed(1)} s`}</span>
                    </div>
                  ))}
                </div>
                <div className="cap" style={{ lineHeight: 1.5, marginTop: 'auto', fontSize: 12 }}>Seconds slower than the best option, measured from the same point: lap {s.currentLap}.</div>
              </section>
              <section className="chart" style={{ padding: '24px 28px 22px', gap: 14 }}>
                <div className="row between" style={{ alignItems: 'baseline' }}><span className="label">Strategy detail</span><span className="cap">Rank {results.indexOf(A) + 1} of {results.length}</span></div>
                <div><div className="sora" style={{ fontSize: 22, fontWeight: 500, letterSpacing: -.3 }}>{actionTitle(A.strategy, s)}</div><div style={{ fontSize: 12.5, color: 'var(--text2)', marginTop: 4 }}>{plan(A)}</div></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '12px 16px' }}>
                  <div><div style={{ fontSize: 12, color: 'var(--text2)' }}>Est. remaining</div><div className="sora" style={{ fontSize: 15, fontWeight: 500, marginTop: 2 }}>{fmtTime(A.meanTime)}</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--text2)' }}>Pit-lane time</div><div className="sora" style={{ fontSize: 15, fontWeight: 500, marginTop: 2 }}>{A_bd.stops ? `${A_bd.pit.toFixed(0)} s (${A_bd.stops} stop)` : 'No stop'}</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--text2)' }}>Outcome range</div><div className="sora" style={{ fontSize: 15, fontWeight: 500, marginTop: 2 }}>{fmtTime(A.p5)} – {fmtTime(A.p95)}</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--text2)' }}>Risk</div><div style={{ fontSize: 15, fontWeight: 600, marginTop: 2, color: RISK_C[A.risk] }}>{A.risk}</div></div>
                </div>
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                  <div className="row between" style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 1.2, color: 'var(--text2)', paddingBottom: 6 }}><span>WHERE THE TIME DIFFERS</span><span>{A === best ? 'VS NEXT BEST' : 'VS BEST'}</span></div>
                  {(() => {
                    const rows = COMPONENTS.map(([l, c]) => ({ l, x: A_bd[c] - R_bd[c] })).filter(x => Math.abs(x.x) >= .05);
                    return rows.length ? rows.map(x => (
                      <div key={x.l} className="row between" style={{ gap: 8, fontSize: 13, padding: '4px 0' }}><span style={{ color: 'var(--text2)' }}>{x.l}</span><span className="sora" style={{ fontWeight: 500, color: x.x < 0 ? 'var(--green)' : 'var(--red)' }}>{sgn(x.x)}</span></div>
                    )) : <div style={{ fontSize: 13, color: 'var(--text2)' }}>No component differs.</div>;
                  })()}
                </div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--text2)' }}>{body(A, R)}</p>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>Breakdown uses the central scenario (rain as forecast, no new Safety Car, mean wear), so it can differ slightly from the ranked averages. Assumes {s.rainArrivalLap === null ? 'a dry track' : `${WX_LABEL[scenario.wx].toLowerCase()} from lap ${s.rainArrivalLap}`}, {s.safetyCarActive ? 'Safety Car deployed' : 'no Safety Car'}, {DEG_LABEL[scenario.deg].toLowerCase()} tyre wear, {pg.toFixed(1)} s pit loss and modelled fuel burn-off.</div>
              </section>
            </div>
          )}
          {loading && <div className="overlay" style={{ borderRadius: 14, opacity: .55, alignItems: 'flex-start', paddingTop: 120 }}><div className="spin" style={{ width: 20, height: 20 }} /><span style={{ fontWeight: 600 }}>Recalculating strategies</span></div>}
        </div>

        <aside className="card" style={{ flex: '1 1 300px', maxWidth: 340, minWidth: 0, position: 'sticky', top: 76, alignSelf: 'flex-start', padding: '24px 24px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="row between" style={{ alignItems: 'baseline' }}><span className="label">What-if</span>
            <button className="link" onClick={() => { resetScenario(); clearK('PIT_LOSS_BASE'); }}>Reset</button></div>
          {mode !== 'scenario' ? <div style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.5 }}>What-if controls edit the ZERO HOUR scenario. Switch to Scenario mode in the drawer to use them.</div> : <div className="tseg-host" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="ctl"><span style={{ fontSize: 13, color: 'var(--text2)' }}>Weather</span>
              <SegmentedControl value={scenario.wx} onChange={wx => setWhatIf({ wx })} options={[{ value: 'dry', label: 'Dry' }, { value: 'light', label: 'Light rain' }, { value: 'heavy', label: 'Heavy rain' }]} /></div>
            <div className="ctl" style={{ opacity: scenario.wx === 'dry' ? .35 : 1 }}>
              <div className="row between" style={{ alignItems: 'baseline' }}><span style={{ fontSize: 13, color: 'var(--text2)' }}>Rain arrives</span><span className="sora" style={{ fontSize: 14, fontWeight: 500 }}>{scenario.wx === 'dry' ? 'No rain' : `in ${scenario.rainArrivalOffset} lap${scenario.rainArrivalOffset === 1 ? '' : 's'}`}</span></div>
              <input type="range" min={1} max={15} step={1} value={scenario.rainArrivalOffset} disabled={scenario.wx === 'dry'} onChange={e => setWhatIf({ rainArrivalOffset: +e.target.value })} /></div>
            <div className="ctl"><span style={{ fontSize: 13, color: 'var(--text2)' }}>Safety Car</span>
              <SegmentedControl<boolean> value={scenario.sc} onChange={sc => setWhatIf({ sc })} options={[{ value: true, label: 'Deployed' }, { value: false, label: 'Clear' }]} /></div>
            <div className="ctl"><span style={{ fontSize: 13, color: 'var(--text2)' }}>Tyre degradation</span>
              <SegmentedControl value={scenario.deg} onChange={deg => setWhatIf({ deg })} options={[{ value: 'low', label: 'Low' }, { value: 'nominal', label: 'Nominal' }, { value: 'high', label: 'High' }]} /></div>
            <div className="ctl">
              <div className="row between" style={{ alignItems: 'baseline' }}><span style={{ fontSize: 13, color: 'var(--text2)' }}>Normal pit loss</span><span className="sora" style={{ fontSize: 14, fontWeight: 500 }}>{pg.toFixed(1)} s</span></div>
              <input type="range" min={15} max={35} step={0.5} value={pg} onChange={e => { setK('PIT_LOSS_BASE', +e.target.value); setSelectedId(null); }} />
              <span style={{ fontSize: 11.5, color: 'var(--text2)' }}>Fitted for Baku: {fittedPit.toFixed(1)} s</span></div>
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface2)', fontSize: 13, lineHeight: 1.5 }}><b style={{ fontWeight: 600 }}>{verdict}</b> <span style={{ color: 'var(--text2)' }}>{vsub}</span></div>
          </div>}
        </aside>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text2)', padding: '0 2px 8px', lineHeight: 1.5 }}>Simulated model outputs. Race state, weather, tyre wear and fuel load are modelled, not measured. PITWISE supports the decision; the strategy team makes the call.</div>
    </div>
  );
}
