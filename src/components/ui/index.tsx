import type { ReactNode, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CircuitId, Provenance } from '../../engine/types';
import { CIRCUITS } from '../../engine/constants';

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  HISTORICAL: 'REAL HISTORICAL DATA', LIVE: 'LIVE DATA', SIMULATED: 'SIMULATED INPUT', ESTIMATE: 'MODEL ESTIMATE',
};
const PROV_STYLE: Record<Provenance, { color: string; bg: string; dot: string }> = {
  HISTORICAL: { color: 'var(--text2)', bg: 'var(--surface2)', dot: 'var(--text2)' },
  LIVE: { color: 'var(--green)', bg: 'var(--greenTint)', dot: 'var(--green)' },
  SIMULATED: { color: 'var(--amber)', bg: 'var(--amberTint)', dot: 'var(--amberFill)' },
  ESTIMATE: { color: 'var(--blue)', bg: 'var(--blueTint)', dot: 'var(--blue)' },
};

export function ProvenanceBadge({ tag, short, style }: { tag: Provenance; short?: boolean; style?: CSSProperties }) {
  const s = PROV_STYLE[tag];
  const text = short ? { HISTORICAL: 'Historical', LIVE: 'Live', SIMULATED: 'Simulated', ESTIMATE: 'Model estimate' }[tag] : PROVENANCE_LABEL[tag];
  return (
    <span className="pill" style={{ color: s.color, background: s.bg, letterSpacing: short ? 0 : '.8px', fontSize: short ? 11.5 : 10.5, fontWeight: short ? 600 : 700, ...style }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', border: `1.5px solid ${s.dot}`, flex: 'none' }} />{text}
    </span>
  );
}

export function Label({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <span className="label" style={style}>{children}</span>;
}

export function Card({ title, right, children, style, className = '', pad = '26px 28px 24px' }:
  { title?: string; right?: ReactNode; children: ReactNode; style?: CSSProperties; className?: string; pad?: string }) {
  return (
    <section className={`card ${className}`} style={{ padding: pad, minWidth: 0, ...style }}>
      {(title || right) && <div className="row between" style={{ marginBottom: 14, gap: 8 }}><span className="label">{title}</span>{right}</div>}
      {children}
    </section>
  );
}

export function StatTile({ label, value, sub, prov, grow = '1 1 150px', style }:
  { label: string; value: ReactNode; sub?: ReactNode; prov?: Provenance; grow?: string; style?: CSSProperties }) {
  return (
    <div className="cell" style={{ flex: grow, ...style }}>
      <span className="label">{label}</span>
      <span className="sora" style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.2, whiteSpace: 'nowrap' }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: 'var(--text2)' }}>{sub}</span>}
      {prov && <ProvenanceBadge tag={prov} style={{ alignSelf: 'flex-start' }} />}
    </div>
  );
}

export function StatStrip({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div className="strip" style={style}>{children}</div>;
}

export function SegmentedControl<T extends string | boolean>({ options, value, onChange, full = true }:
  { options: { value: T; label: ReactNode; title?: string }[]; value: T; onChange: (v: T) => void; full?: boolean }) {
  return (
    <div className="seg" role="group">
      {options.map(o => (
        <button key={String(o.value)} aria-pressed={o.value === value} title={o.title} className={o.value === value ? 'on' : ''}
          style={full ? { flex: 1 } : undefined} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function EmptyState({ title, children, action, icon }: { title: string; children?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="empty">
      {icon}
      <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
      {children && <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, maxWidth: 360 }}>{children}</span>}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}

export function CircuitSelect({ value, onChange }: { value: CircuitId; onChange: (c: CircuitId) => void }) {
  return (
    <select className="select" value={value} onChange={e => onChange(e.target.value as CircuitId)}>
      {(Object.keys(CIRCUITS) as CircuitId[]).map(id => <option key={id} value={id}>{CIRCUITS[id].name}</option>)}
    </select>
  );
}

export function LinkButton({ to, children }: { to: string; children: ReactNode }) {
  const nav = useNavigate();
  return <button className="btn" onClick={() => nav(to)}>{children}</button>;
}
