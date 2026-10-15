import { Card, EmptyState, StatTile } from '../components/ui';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export function Live() {
  const nav = useNavigate();
  const [msg, setMsg] = useState('');
  return (
    <div className="page grid" style={{ gap: 16 }}>
      <div className="row between wrap"><div><div className="h1">LIVE DATA</div><div className="sub">Real-time timing, race control and telemetry</div></div>
        <span className="prov" style={{ color: 'var(--text2)', borderColor: 'var(--text2)' }}>NOT CONNECTED</span></div>
      <Card>
        <EmptyState title="No live feed connected" action={<div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn" onClick={() => setMsg('Still no feed: no authorised real-time token is configured.')}>Retry</button>
          <button className="btn primary" onClick={() => nav('/simulator')}>Use simulated scenario</button></div>}>
          Live timing needs an authorised real-time feed. OpenF1's documentation requires an OAuth2 token exchanged in backend code, and no token is configured for this build. Historical replay and the scenario simulator are fully functional.
        </EmptyState>
        {msg && <div className="sub" style={{ textAlign: 'center', marginTop: 8 }}>{msg}</div>}
      </Card>
      <div className="grid g6">
        {['Lap', 'Position', 'Gap to leader', 'Track', 'Weather', 'Last update'].map(l => <StatTile key={l} label={l} value="—" />)}
      </div>
      <div className="grid g2">
        <Card title="Leaderboard"><div className="sub">No classification received.</div></Card>
        <Card title="Race control"><div className="sub">No race-control messages received.</div></Card>
        <Card title="Telemetry"><div className="sub">No telemetry received</div></Card>
        <Card title="Strategy alerts"><button className="btn" onClick={() => nav('/')}>Analyse current race state</button>
          <div className="sub" style={{ marginTop: 6 }}>Runs the engine on the simulated scenario, since no live state exists.</div></Card>
      </div>
    </div>
  );
}
