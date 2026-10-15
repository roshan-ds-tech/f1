import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, RotateCcw, ArrowRight, Radio } from 'lucide-react';
import { useApp } from '../state/AppContext';
import { ProvenanceBadge } from '../components/ui';
import { TYRE_IMG, COMPOUND_NAME } from '../components/TyreThumb';
import type { Compound } from '../engine/types';
import { useFeed, feedControls, fmtLap, fmtClock, type Feed, type FeedState, type Alert } from '../components/live/feedStore';

const STATUS_COL: Record<string, string> = { GREEN: 'var(--green)', 'SAFETY CAR': 'var(--amber)', VSC: 'var(--amber)', 'RED FLAG': 'var(--red)', CHEQUERED: 'var(--text)', 'PRE-RACE': 'var(--text2)' };
const TAG_COL: Record<Alert['tag'], [string, string]> = {
  PIT: ['var(--blueTint)', 'var(--blue)'], TRACK: ['var(--amberTint)', 'var(--amber)'], FASTEST: ['rgba(168,85,247,.14)', '#A855F7'],
  LEAD: ['var(--greenTint)', 'var(--green)'], WEATHER: ['var(--blueTint)', 'var(--blue)'], STEWARDS: ['var(--redTint)', 'var(--red)'],
};
const RC_COL = (cat?: string, flag?: string | null) => cat === 'SafetyCar' ? 'var(--amber)' : flag === 'RED' ? 'var(--red)' : /YELLOW/.test(flag ?? '') ? 'var(--amberFill)' : flag === 'GREEN' || flag === 'CLEAR' ? 'var(--green)' : flag === 'BLUE' ? 'var(--blue)' : flag === 'CHEQUERED' ? 'var(--text)' : 'var(--text2)';
const KNOWN: Compound[] = ['SOFT', 'MEDIUM', 'HARD', 'INTER', 'WET'];

function tyreOf(feed: Feed, n: number, lap: number) {
  const st = feed.stints.find(x => x.d === n && lap >= x.from && lap <= x.to) ?? feed.stints.filter(x => x.d === n && x.from <= lap).at(-1);
  if (!st) return null;
  return { c: st.c, age: st.age0 + Math.max(0, lap - st.from) };
}

function gapOf(s: FeedState, n: number): { text: string; sec: number | null } {
  const leaderN = [...s.pos.entries()].find(([, p]) => p === 1)?.[0];
  const me = s.cars.get(n), lead = leaderN != null ? s.cars.get(leaderN) : undefined;
  if (n === leaderN) return { text: 'Leader', sec: 0 };
  if (!me || !lead || !me.laps) return { text: '—', sec: null };
  const lc = lead.crossed[me.laps];
  if (lc == null) return { text: '—', sec: null };
  const g = me.crossed[me.laps] - lc;
  if (lead.laps > me.laps && lead.last != null && g > lead.last) return { text: `+${lead.laps - me.laps} LAP`, sec: null };
  return { text: `+${g.toFixed(3)}`, sec: g };
}

function Spark({ pts }: { pts: { lap: number; time: number }[] }) {
  const fastest = Math.min(...pts.map(p => p.time));
  const clean = pts.filter(p => p.time < fastest * 1.1);
  if (clean.length < 2) return <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--text2)' }}>Waiting for laps…</div>;
  const lo = Math.min(...clean.map(p => p.time)), hi = Math.max(...clean.map(p => p.time)), sp = Math.max(0.5, hi - lo);
  const a = clean[0].lap, b = clean.at(-1)!.lap, w = 300, h = 90;
  const d = clean.map((p, i) => `${i ? 'L' : 'M'}${((p.lap - a) / Math.max(1, b - a) * w).toFixed(1)} ${(h - 6 - (p.time - lo) / sp * (h - 12)).toFixed(1)}`).join('');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 90, overflow: 'visible' }} aria-label="Lap times">
      <path d={d} style={{ fill: 'none', stroke: 'var(--red)', strokeWidth: 2, strokeLinejoin: 'round' }} />
      <text x={0} y={h + 12} style={{ fontSize: 10, fill: 'var(--text2)' }}>L{a}</text>
      <text x={w} y={h + 12} textAnchor="end" style={{ fontSize: 10, fill: 'var(--text2)' }}>L{b}</text>
      <text x={w} y={10} textAnchor="end" style={{ fontSize: 10, fill: 'var(--text2)' }}>{fmtLap(hi)}</text>
      <text x={w} y={h - 2} textAnchor="end" style={{ fontSize: 10, fill: 'var(--text2)' }}>{fmtLap(lo)}</text>
    </svg>
  );
}

export function Live() {
  const nav = useNavigate();
  const { setMode, setLap, setDriver } = useApp();
  const { feed, state: s, playing, speed, error } = useFeed();
  const [sel, setSel] = useState<number | null>(null);

  const order = useMemo(() => feed ? [...s.pos.entries()].sort((a, b) => a[1] - b[1]).map(([n]) => n) : [], [feed, s.pos]);
  const selN = sel ?? order[0] ?? null;
  const drv = (n: number | null) => feed?.drivers.find(d => d.n === n);
  const span = feed?.events.at(-1)?.t ?? 1;
  const total = feed?.meta.totalLaps ?? 0;
  const curLap = Math.min(total, s.leaderLaps + 1);
  const me = selN != null ? s.cars.get(selN) : undefined;
  const myGap = selN != null ? gapOf(s, selN) : { text: '—', sec: null };
  const lastUpdate = feed && s.idx > 0 ? feed.events[s.idx - 1] : null;
  const analyse = () => { const d = drv(selN); setMode('replay'); setTimeout(() => { setLap(Math.max(2, s.leaderLaps)); if (d) setDriver(d.code); nav('/'); }, 0); };

  if (error) return <div className="warn">Recorded feed could not be loaded: {error}</div>;

  return (
    <div data-screen-label="Live Data page" style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <div className="row wrap">
            <span className="label">Live data</span>
            <span className="pill" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.8px', color: 'var(--amber)', background: 'var(--amberTint)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amberFill)', animation: playing ? 'pw-pulse 1.4s infinite' : 'none' }} />REPLAYED FEED</span>
            <ProvenanceBadge tag="HISTORICAL" />
          </div>
          <h1 className="page-h1">Race monitor</h1>
          <p style={{ margin: '8px 0 0', fontSize: 14.5, color: 'var(--text2)', lineHeight: 1.5, maxWidth: 680 }}>
            {feed ? `${feed.meta.grandPrix}, recorded by OpenF1 and streamed back one event per second, on a loop.` : 'Loading the recorded feed…'} This is a replay, not live timing: a real-time feed needs an authorised OpenF1 token, which this build does not have.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '14px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 18px' }}>
        <Radio size={18} color="var(--amber)" />
        <div className="row" style={{ gap: 6 }}>
          <button className="btn sm" onClick={() => (playing ? feedControls.pause() : feedControls.play())} aria-label={playing ? 'Pause feed' : 'Play feed'}>{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? 'Pause' : 'Play'}</button>
          <button className="btn sm" onClick={feedControls.restart} aria-label="Restart feed"><RotateCcw size={14} />Restart</button>
        </div>
        <div className="tseg-host"><div className="seg">
          {[1, 5, 20].map(x => <button key={x} className={x === speed ? 'on' : ''} onClick={() => feedControls.setSpeed(x)}>{x === 1 ? '1 event/s' : `${x}×`}</button>)}
        </div></div>
        <div style={{ flex: '1 1 220px', minWidth: 160, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--grid)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(100, s.t / span * 100)}%`, background: 'var(--red)', transition: 'width .3s' }} /></div>
          <span style={{ fontSize: 11.5, color: 'var(--text2)' }}>Event {s.idx} / {feed?.events.length ?? '—'} · race clock {fmtClock(s.t)}{s.looped ? ` · loop ${s.looped + 1}` : ''}</span>
        </div>
      </div>

      <div className="strip" data-screen-label="Race status">
        {([
          ['Lap', s.status === 'PRE-RACE' ? '—' : s.status === 'CHEQUERED' ? `${total} / ${total}` : `${curLap} / ${total}`, 'var(--text)', s.status === 'CHEQUERED' ? 'Finished' : `Leader has completed ${s.leaderLaps}`],
          ['Position', selN != null && s.pos.get(selN) ? `P${s.pos.get(selN)}` : '—', 'var(--red)', drv(selN)?.code ? `${drv(selN)!.code} · ${drv(selN)!.team}` : 'Select a driver'],
          ['Gap to leader', myGap.text, 'var(--text)', 'At the timing line, same lap'],
          ['Track', s.status, STATUS_COL[s.status], s.rc[0]?.msg?.slice(0, 34) ?? ''],
          ['Weather', s.wx ? `${s.wx.air?.toFixed(1)} °C air` : '—', 'var(--text)', s.wx ? `Track ${s.wx.track?.toFixed(1)} °C · ${s.wx.rain ? 'rain' : 'dry'} · hum ${s.wx.hum}%` : 'Waiting for sample'],
          ['Last update', lastUpdate ? fmtClock(lastUpdate.t) : '—', 'var(--text)', lastUpdate ? { lap: 'Lap completed', pos: 'Position change', rc: 'Race control', pit: 'Pit stop', wx: 'Weather sample' }[lastUpdate.k] : 'Waiting'],
        ] as const).map(([l, v, c, sub]) => (
          <div key={l} className="cell" style={{ flex: '1 1 130px' }}>
            <span className="label">{l}</span>
            <span className="sora" style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.2, whiteSpace: 'nowrap', color: c }}>{v}</span>
            <span style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(440px,1fr))', gap: 16, alignItems: 'stretch' }}>
        <section className="card" data-screen-label="Leaderboard" style={{ padding: '24px 0 12px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className="row between wrap" style={{ padding: '0 28px 12px' }}><span className="label">Leaderboard</span><span style={{ fontSize: 12, color: 'var(--text2)' }}>Click a driver to follow them</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: '40px minmax(0,1.3fr) minmax(0,1fr) minmax(0,.9fr) minmax(0,.8fr)', gap: '0 12px', padding: '0 28px 8px', fontSize: 10.5, fontWeight: 600, letterSpacing: 1.2, color: 'var(--text2)' }}>
            <span>POS</span><span>DRIVER</span><span>TYRE</span><span style={{ textAlign: 'right' }}>GAP</span><span style={{ textAlign: 'right' }}>LAST LAP</span>
          </div>
          <div style={{ maxHeight: 560, overflowY: 'auto' }}>
            {!order.length && <div style={{ padding: '40px 28px 28px', borderTop: '1px solid var(--line)', textAlign: 'center', fontSize: 13.5, color: 'var(--text2)' }}>Waiting for the grid…</div>}
            {order.map(n => {
              const d = drv(n), c = s.cars.get(n), ty = feed ? tyreOf(feed, n, (c?.laps ?? 0) + 1) : null, on = n === selN, gap = gapOf(s, n);
              const fastest = s.fastest?.d === n;
              return (
                <div key={n} onClick={() => setSel(n)} className="alt" style={{ display: 'grid', gridTemplateColumns: '40px minmax(0,1.3fr) minmax(0,1fr) minmax(0,.9fr) minmax(0,.8fr)', gap: '0 12px', padding: '11px 28px', alignItems: 'center', borderTop: '1px solid var(--line)', background: on ? 'var(--surface2)' : undefined }}>
                  <span className="sora" style={{ fontSize: 15, fontWeight: 500, color: s.pos.get(n) === 1 ? 'var(--red)' : 'var(--text)' }}>{s.pos.get(n)}</span>
                  <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 3, height: 26, borderRadius: 2, background: d?.colour ?? 'var(--line)', flex: 'none' }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{d?.code ?? `#${n}`}{c?.inPitLane && <span className="pill" style={{ marginLeft: 6, fontSize: 9.5, padding: '1px 6px', background: 'var(--blueTint)', color: 'var(--blue)' }}>PIT</span>}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d?.team}</div>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8, fontSize: 13, minWidth: 0 }}>
                    {ty && KNOWN.includes(ty.c as Compound) && <span className="tile" style={{ width: 28, height: 26, borderRadius: 6 }}><img src={TYRE_IMG[ty.c as Compound]} alt={`${ty.c} tyre`} style={{ width: 26, height: 24 }} /></span>}
                    <span style={{ color: 'var(--text2)', whiteSpace: 'nowrap' }}>{ty ? `${COMPOUND_NAME[ty.c as Compound] ?? ty.c} · ${ty.age}` : '—'}</span>
                  </div>
                  <span className="sora" style={{ fontSize: 13.5, fontWeight: 500, textAlign: 'right', color: gap.text === 'Leader' ? 'var(--red)' : 'var(--text)' }}>{gap.text}</span>
                  <span className="sora" style={{ fontSize: 13.5, fontWeight: 500, textAlign: 'right', color: fastest ? '#A855F7' : 'var(--text)' }}>{c?.last != null ? fmtLap(c.last) : '—'}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card" data-screen-label="Race control" style={{ padding: '24px 28px 12px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className="row between wrap"><span className="label">Race control</span><span style={{ fontSize: 12, color: 'var(--text2)' }}>Recorded messages, newest first</span></div>
          <div style={{ marginTop: 12, maxHeight: 590, overflowY: 'auto' }}>
            {!s.rc.length && <div style={{ padding: '40px 0 28px', borderTop: '1px solid var(--line)', textAlign: 'center', fontSize: 13.5, color: 'var(--text2)' }}>No race-control messages yet.</div>}
            {s.rc.slice(0, 25).map((e, i) => (
              <div key={`${e.t}-${i}`} style={{ display: 'grid', gridTemplateColumns: '44px 104px minmax(0,1fr)', gap: 12, alignItems: 'baseline', padding: '12px 0', borderTop: '1px solid var(--line)' }}>
                <span className="sora" style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text2)' }}>L{e.lap ?? '—'}</span>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.8px', color: RC_COL(e.cat, e.flag), textTransform: 'uppercase' }}>{e.flag && e.cat === 'Flag' ? e.flag : e.cat === 'SafetyCar' ? 'SAFETY CAR' : e.cat}</span>
                <span style={{ fontSize: 13.5 }}>{e.msg}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(440px,1fr))', gap: 16, alignItems: 'stretch' }}>
        <section className="card" data-screen-label="Telemetry" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div className="row between wrap"><span className="label">Lap & sector feed{drv(selN) ? ` · ${drv(selN)!.code}` : ''}</span><span style={{ fontSize: 12, color: 'var(--text2)' }}>Recorded timing</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12 }}>
            {([['Last lap', me?.last != null ? fmtLap(me.last) : '—'], ['Best lap', me?.best != null ? fmtLap(me.best) : '—'], ['Speed trap', me?.speedTrap ? `${me.speedTrap} km/h` : '—'], ['Pit stops', me ? String(me.pits) : '—']] as const).map(([l, v]) => (
              <div key={l}><div style={{ fontSize: 12, color: 'var(--text2)' }}>{l}</div><div className="sora" style={{ fontSize: 17, fontWeight: 500, marginTop: 2 }}>{v}</div></div>
            ))}
          </div>
          <div className="row" style={{ gap: 6 }}>
            {(me?.sectors ?? [null, null, null]).map((x, i) => <span key={i} className="chip">S{i + 1} <b style={{ color: 'var(--text)', fontWeight: 600 }}>{x != null ? `${x.toFixed(3)} s` : '—'}</b></span>)}
          </div>
          <Spark pts={me?.history ?? []} />
          <div className="cap" style={{ lineHeight: 1.5 }}>Racing laps only (Safety Car and pit laps are left out of the chart). Lap and sector times only. Car sensor channels (speed trace, throttle, brake, RPM) are not part of this feed.</div>
        </section>

        <section className="card" data-screen-label="Strategy alerts" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span className="label">Strategy alerts</span>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
            {!s.alerts.length && <div style={{ padding: '14px 0', borderTop: '1px solid var(--line)', fontSize: 13, color: 'var(--text2)' }}>Pit stops, Safety Cars, lead changes and fastest laps appear here as they happen.</div>}
            {s.alerts.slice(0, 5).map((a, i) => (
              <div key={`${a.t}-${i}`} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 0', borderTop: '1px solid var(--line)' }}>
                <span style={{ flex: '0 0 auto', width: 86, fontSize: 10, fontWeight: 700, letterSpacing: '.8px', padding: '4px 0', textAlign: 'center', borderRadius: 6, background: TAG_COL[a.tag][0], color: TAG_COL[a.tag][1] }}>{a.tag}</span>
                <div style={{ minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{a.title} <span style={{ fontSize: 11.5, color: 'var(--text2)', fontWeight: 500 }}>{fmtClock(a.t)}</span></div><div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, marginTop: 2 }}>{a.text}</div></div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'auto', paddingTop: 14 }}>
            <button className="btn red" disabled={!s.leaderLaps} onClick={analyse} style={{ width: '100%', height: 44, justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>Analyse current race state<ArrowRight size={15} /></button>
            <div className="cap" style={{ marginTop: 6 }}>Opens the dashboard in replay at lap {Math.max(2, s.leaderLaps)} for {drv(selN)?.code ?? 'the selected driver'}; the engine sees only laps up to that point.</div>
          </div>
        </section>
      </div>
    </div>
  );
}
