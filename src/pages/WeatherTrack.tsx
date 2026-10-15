import { useApp } from '../state/AppContext';
import { Card, ProvenanceBadge, EmptyState } from '../components/ui';

export function WeatherTrack() {
  const { raceState, provenance } = useApp(); // see TEAMMATE_CONTRACT.md
  void raceState;
  return (
    <div className="page grid" style={{ gap: 16 }}>
      <div className="row between wrap"><div><div className="h1">WEATHER & TRACK</div><div className="sub">Conditions and track state</div></div><ProvenanceBadge tag={provenance} /></div>
      <Card><EmptyState title="Under construction — owned by WEATHER & TRACK" /></Card>
    </div>
  );
}
