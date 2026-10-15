import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Unplug, Activity, ArrowRight } from 'lucide-react';
import { useApp } from '../state/AppContext';

const D = '—';
const NO_FEED = "Live timing needs an authorised real-time feed. OpenF1's documentation requires an OAuth2 token exchanged in backend code, and no token is configured for this build. Historical replay and the scenario simulator are fully functional.";

export function Live() {
  const nav = useNavigate();
  const { setMode } = useApp();
  const [retried, setRetried] = useState(false);
  const cells: [string, string][] = [['Lap', D], ['Position', D], ['Gap to leader', D], ['Track', D], ['Weather', D], ['Last update', 'Never']];
  return (
    <div data-screen-label="Live Data page" style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <div className="row"><span className="label">Live data</span>
            <span className="pill" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.8px', color: 'var(--red)', background: 'var(--redTint)' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)' }} />NOT CONNECTED</span></div>
          <h1 className="page-h1">Race monitor</h1>
          <p style={{ margin: '8px 0 0', fontSize: 14.5, color: 'var(--text2)', lineHeight: 1.5, maxWidth: 560 }}>{NO_FEED}</p>
        </div>
      </div>
      <div className="card" data-screen-label="Offline notice" style={{ padding: '20px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px 24px' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0, flex: '1 1 320px' }}>
          <Unplug size={22} color="var(--red)" />
          <div><div style={{ fontSize: 15, fontWeight: 600 }}>No live feed connected</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, lineHeight: 1.5 }}>{retried ? 'Retried: still no feed. No authorised real-time token is configured.' : 'Nothing below is filled in until a real feed is connected.'}</div></div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" style={{ background: 'transparent' }} onClick={() => setRetried(true)}>Retry</button>
          <button className="btn solid" onClick={() => { setMode('scenario'); nav('/simulator'); }}>Use simulated scenario</button>
        </div>
      </div>
      <div className="strip" data-screen-label="Race status">
        {cells.map(([l, v]) => (
          <div key={l} className="cell" style={{ flex: '1 1 130px' }}><span className="label">{l}</span><span className="sora" style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.2, color: 'var(--text2)' }}>{v}</span></div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(440px,1fr))', gap: 16 }}>
        <section className="card" data-screen-label="Leaderboard" style={{ padding: '24px 0 12px' }}>
          <div className="row between" style={{ padding: '0 28px 12px' }}><span className="label">Leaderboard</span><span style={{ fontSize: 12, color: 'var(--text2)' }}>Awaiting feed</span></div>
          <div style={{ padding: '40px 28px 28px', borderTop: '1px solid var(--line)', textAlign: 'center', fontSize: 13.5, color: 'var(--text2)' }}>No classification received.</div>
        </section>
        <section className="card" data-screen-label="Race control" style={{ padding: '24px 28px 12px' }}>
          <div className="row between"><span className="label">Race control</span><span style={{ fontSize: 12, color: 'var(--text2)' }}>Awaiting feed</span></div>
          <div style={{ marginTop: 12, padding: '40px 0 28px', borderTop: '1px solid var(--line)', textAlign: 'center', fontSize: 13.5, color: 'var(--text2)' }}>No race-control messages received.</div>
        </section>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(440px,1fr))', gap: 16 }}>
        <section className="card" data-screen-label="Telemetry" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="label">Telemetry</span>
          <div className="empty" style={{ minHeight: 200 }}><Activity size={22} color="var(--text2)" /><span style={{ fontSize: 14, fontWeight: 600 }}>No telemetry received</span><span style={{ fontSize: 12, color: 'var(--text2)', maxWidth: 320 }}>Car telemetry appears here once an authorised feed is connected.</span></div>
        </section>
        <section className="card" data-screen-label="Strategy alerts" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="label">Strategy alerts</span>
          <div style={{ padding: '14px 0', borderTop: '1px solid var(--line)', marginTop: 6, fontSize: 13, color: 'var(--text2)' }}>No live race state, so no alerts. Analysing runs the engine on the simulated scenario.</div>
          <div style={{ marginTop: 'auto', paddingTop: 14 }}>
            <button className="btn red" style={{ width: '100%', height: 44, justifyContent: 'center', fontSize: 14, fontWeight: 700 }} onClick={() => { setMode('scenario'); nav('/'); }}>Analyse current race state<ArrowRight size={15} /></button>
          </div>
        </section>
      </div>
    </div>
  );
}
