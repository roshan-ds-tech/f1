import { useApp } from '../state/AppContext';
import { Card, ProvenanceBadge, EmptyState } from '../components/ui';

export function Telemetry() {
  const { raceState, provenance } = useApp(); // see TEAMMATE_CONTRACT.md
  void raceState;
  return (
    <div className="page grid" style={{ gap: 16 }}>
      <div className="row between wrap"><div><div className="h1">TELEMETRY</div><div className="sub">Lap-level pace and tyre telemetry</div></div><ProvenanceBadge tag={provenance} /></div>
      <Card><EmptyState title="Under construction — owned by TELEMETRY" /></Card>
    </div>
  );
}
