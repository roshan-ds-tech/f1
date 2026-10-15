import { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../state/AppContext';

export function ReplayTransport() {
  const { lap, setLap, raceState } = useApp();
  const total = raceState.totalLaps;
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setLap(Math.min(total, lap + 1)), 3000 / speed);
    return () => clearInterval(t);
  }, [playing, speed, lap, total, setLap]);
  useEffect(() => { if (lap >= total) setPlaying(false); }, [lap, total]);
  return (
    <div className="row wrap">
      <button className="btn" onClick={() => setPlaying(p => !p)} title={playing ? 'Pause' : 'Play'}>{playing ? <Pause size={14} /> : <Play size={14} />}</button>
      <button className="btn" onClick={() => { setPlaying(false); setLap(2); }} title="Restart"><RotateCcw size={14} /></button>
      <button className="btn" onClick={() => setLap(Math.max(2, lap - 1))}><ChevronLeft size={14} /></button>
      <button className="btn" onClick={() => setLap(Math.min(total, lap + 1))}><ChevronRight size={14} /></button>
      <input type="range" min={2} max={total} value={lap} onChange={e => setLap(+e.target.value)} style={{ width: 160 }} />
      <span className="mono sub">L{lap}/{total}</span>
      <div className="seg">{[1, 5, 10].map(s => <button key={s} className={s === speed ? 'on' : ''} onClick={() => setSpeed(s)}>{s}×</button>)}</div>
    </div>
  );
}
