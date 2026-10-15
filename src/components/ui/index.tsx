import type { ReactNode, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CircuitId, Provenance } from '../../engine/types';
import { CIRCUITS } from '../../engine/constants';

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  HISTORICAL: 'REAL HISTORICAL DATA', LIVE: 'LIVE DATA', SIMULATED: 'SIMULATED INPUT', ESTIMATE: 'MODEL ESTIMATE',
};
const PROV_COLOR: Record<Provenance, string> = {
  HISTORICAL: 'var(--green)', LIVE: 'var(--red)', SIMULATED: 'var(--amber)', ESTIMATE: 'var(--blue)',
};

export function ProvenanceBadge({ tag, style }: { tag: Provenance; style?: CSSProperties }) {
  return <span className="prov" style={{ color: PROV_COLOR[tag], borderColor: PROV_COLOR[tag], ...style }}>{PROVENANCE_LABEL[tag]}</span>;
}

export function Card({ title, right, children, style, className = '' }:
  { title?: string; right?: ReactNode; children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <section className={`card pad ${className}`} style={style}>
      {(title || right) && <div className="row between" style={{ marginBottom: 10 }}><span className="label">{title}</span>{right}</div>}
      {children}
    </section>
  );
}

export function StatTile({ label, value, sub, prov }: { label: string; value: ReactNode; sub?: ReactNode; prov?: Provenance }) {
  return (
    <div className="card pad stat">
      <div className="label">{label}</div>
      <div className="mono big">{value}</div>
      {sub && <div className="sub">{sub}</div>}
      {prov && <div className="tiny" style={{ color: PROV_COLOR[prov] }}>{PROVENANCE_LABEL[prov]}</div>}
    </div>
  );
}

export function SegmentedControl<T extends string | boolean>({ options, value, onChange }:
  { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map(o => (
        <button key={String(o.value)} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div style={{ fontWeight: 600 }}>{title}</div>
      {children && <div className="sub" style={{ marginTop: 4 }}>{children}</div>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
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
