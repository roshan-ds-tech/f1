import { useApp } from '../state/AppContext';
import { Card, ProvenanceBadge, EmptyState } from '../components/ui';

export function TyreAnalysis() {
  const { raceState, provenance } = useApp(); // see TEAMMATE_CONTRACT.md
  void raceState;
  return (
    <div className="page grid" style={{ gap: 16 }}>
      <div className="row between wrap"><div><div className="h1">TYRE ANALYSIS</div><div className="sub">Compound behaviour and stint wear</div></div><ProvenanceBadge tag={provenance} /></div>
      <Card><EmptyState title="Under construction — owned by TYRE ANALYSIS" /></Card>
    </div>
  );
}
