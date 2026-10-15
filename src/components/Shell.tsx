import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, FlaskConical, RadioTower, CircleDot, GitCompareArrows, Settings as Cog, PanelLeftClose, PanelLeftOpen, SlidersHorizontal, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../state/AppContext';
import { useTheme } from '../state/theme';
import { DEFAULT_SCENARIO } from '../engine/types';
import { ProvenanceBadge } from './ui';
import { ReplayTransport } from './ReplayTransport';
import { ScenarioDrawer } from './ScenarioDrawer';

const ITEMS = [
  { to: '/', label: 'Race Dashboard', Icon: LayoutDashboard },
  { to: '/simulator', label: 'Strategy Simulator', Icon: FlaskConical },
  { to: '/live', label: 'Live Data', Icon: RadioTower },
  { to: '/tyres', label: 'Tyre Analysis', Icon: CircleDot },
  { to: '/compare', label: 'Compare Strategies', Icon: GitCompareArrows },
];
const TITLES: Record<string, string> = Object.fromEntries([...ITEMS.map(i => [i.to, i.label]), ['/settings', 'Settings']]);

function initialCollapsed() { try { return localStorage.getItem('pw.collapsed') === '1'; } catch { return false; } }

export function Shell() {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [drawer, setDrawer] = useState(false);
  const [theme, setTheme] = useTheme();
  const { mode, provenance, scenario } = useApp();
  const { pathname } = useLocation();
  const toggle = () => setCollapsed(c => { const n = !c; try { localStorage.setItem('pw.collapsed', n ? '1' : '0'); } catch { /* ignore */ } return n; });
  const changed = mode !== 'scenario' || (Object.keys(DEFAULT_SCENARIO) as (keyof typeof DEFAULT_SCENARIO)[]).some(k => scenario[k] !== DEFAULT_SCENARIO[k]);
  const dark = theme === 'dark';
  const logo = collapsed ? (dark ? '/brand/mark-dark.png' : '/brand/mark-light.png') : (dark ? '/brand/lockup-dark.png' : '/brand/lockup-light.png');

  return (
    <div className="shell">
      <aside className="side" style={{ width: collapsed ? 64 : 224 }}>
        <div className="brand" style={{ height: collapsed ? 56 : 104, padding: collapsed ? '0 10px' : '0 18px' }}>
          <img src={logo} alt="PITWISE Race Strategy Intelligence" style={{ mixBlendMode: dark ? 'lighten' : 'multiply', width: '100%' }} />
        </div>
        <nav aria-label="Main" className="navlist">
          {ITEMS.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} title={label} className={({ isActive }) => `nav ${isActive ? 'active' : ''}`}>
              <Icon size={17} className="nav-ic" />{!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <NavLink to="/settings" title="Settings" className={({ isActive }) => `nav ${isActive ? 'active' : ''}`}><Cog size={17} className="nav-ic" />{!collapsed && <span>Settings</span>}</NavLink>
          <button className="nav muted" onClick={toggle} aria-expanded={!collapsed} title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}{!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <span className="page-title">{TITLES[pathname] ?? 'PITWISE'}</span>
          <ProvenanceBadge tag={provenance} short />
          <div style={{ flex: 1 }} />
          {mode === 'replay' && <ReplayTransport />}
          <button className="btn" onClick={() => setDrawer(true)} aria-expanded={drawer} style={{ height: 34, gap: 8 }}>
            <SlidersHorizontal size={15} />Scenario
            <span title={changed ? 'Inputs differ from the ZERO HOUR defaults' : 'Default inputs'} style={{ width: 6, height: 6, borderRadius: '50%', border: '1.5px solid var(--amberFill)', background: changed ? 'var(--amberFill)' : 'transparent' }} />
          </button>
          <div className="seg tseg" role="group" aria-label="Theme">
            <button aria-pressed={!dark} className={!dark ? 'on' : ''} title="Light theme" aria-label="Light theme" onClick={() => setTheme('light')}><Sun size={15} /></button>
            <button aria-pressed={dark} className={dark ? 'on' : ''} title="Dark theme" aria-label="Dark theme" onClick={() => setTheme('dark')}><Moon size={15} /></button>
          </div>
          <div className="avatar" title="Team Garage · Strategy desk">TG</div>
        </header>
        <main className="page"><Outlet /></main>
      </div>
      <ScenarioDrawer open={drawer} onClose={() => setDrawer(false)} />
    </div>
  );
}
