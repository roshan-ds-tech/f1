import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, FlaskConical, RadioTower, Activity, CircleDot, CloudRain, GitCompareArrows, History, Settings as Cog, PanelLeft } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../state/AppContext';
import { CircuitSelect, ProvenanceBadge } from './ui';
import { ReplayTransport } from './ReplayTransport';

const ITEMS = [
  { to: '/', label: 'Race Dashboard', Icon: LayoutDashboard },
  { to: '/simulator', label: 'Strategy Simulator', Icon: FlaskConical },
  { to: '/live', label: 'Live Data', Icon: RadioTower },
  { to: '/telemetry', label: 'Telemetry', Icon: Activity },
  { to: '/tyres', label: 'Tyre Analysis', Icon: CircleDot },
  { to: '/weather', label: 'Weather & Track', Icon: CloudRain },
  { to: '/compare', label: 'Compare Strategies', Icon: GitCompareArrows },
  { to: '/history', label: 'Race History', Icon: History },
];

function initial() { try { return localStorage.getItem('pw.collapsed') === '1'; } catch { return false; } }

export function Shell() {
  const [collapsed, setCollapsed] = useState(initial);
  const { mode, setMode, circuit, setCircuit, provenance, fixture } = useApp();
  const toggle = () => setCollapsed(c => { const n = !c; try { localStorage.setItem('pw.collapsed', n ? '1' : '0'); } catch { /* ignore */ } return n; });
  return (
    <div className="shell">
      <aside className={`side ${collapsed ? 'collapsed' : ''}`}>
        <div className="brand"><i />{!collapsed && <span>PITWISE</span>}</div>
        {ITEMS.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav ${isActive ? 'active' : ''}`} title={label}>
            <Icon size={18} />{!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
        <div style={{ flex: 1 }} />
        <NavLink to="/settings" className={({ isActive }) => `nav ${isActive ? 'active' : ''}`} title="Settings"><Cog size={18} />{!collapsed && <span>Settings</span>}</NavLink>
        <button className="nav" onClick={toggle} title="Collapse"><PanelLeft size={18} />{!collapsed && <span>Collapse</span>}</button>
      </aside>
      <div className="main">
        <div className="topbar">
          <span className="label">Mode</span>
          <div className="seg">
            {(['scenario', 'replay', 'live'] as const).map(m => <button key={m} className={m === mode ? 'on' : ''} onClick={() => setMode(m)}>{m[0].toUpperCase() + m.slice(1)}</button>)}
          </div>
          <CircuitSelect value={circuit} onChange={setCircuit} />
          <ProvenanceBadge tag={provenance} />
          {mode === 'replay' && fixture && <span className="sub">{fixture.meta.grandPrix}</span>}
          <div style={{ flex: 1 }} />
          {mode === 'replay' && <ReplayTransport />}
        </div>
        <Outlet />
      </div>
    </div>
  );
}
