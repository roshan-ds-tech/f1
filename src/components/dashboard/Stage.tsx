import { Component, useCallback, useRef, useState, type ReactNode } from 'react';
import { Rotate3d, Minus, Plus, RotateCcw } from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { useThemeValue } from '../../state/theme';
import { TYRES } from '../../engine/constants';
import { degradation } from '../../engine/lapTime';
import type { CornerState } from '../../engine/types';
import { ProvenanceBadge } from '../ui';
import { TyreThumb, COMPOUND_NAME } from '../TyreThumb';
import { Viewer, type Corner, type Slot, type ViewerApi, type ViewerStatus } from './Viewer';

const NAME: Record<Corner, string> = { FL: 'Front left', FR: 'Front right', RL: 'Rear left', RR: 'Rear right' };
const SLOTS: Slot[] = ['tl', 'tr', 'bl', 'br'];
const DEFAULT_MAP: Record<Slot, Corner> = { tl: 'FL', tr: 'FR', bl: 'RL', br: 'RR' };
const SLOT_POS: Record<Slot, React.CSSProperties> = { tl: { top: 24, left: 24 }, tr: { top: 24, right: 24 }, bl: { bottom: 72, left: 24 }, br: { bottom: 72, right: 24 } };
const COND_TIP = 'Modelled condition index — not a measured wear value.';

/** 100 = fresh, 0 = modelled end of useful life (cliff + 12 laps). A model output, not measured wear. */
export function conditionIndex(c: CornerState, k: { TYRES?: typeof TYRES }) {
  const m = (k.TYRES ?? TYRES)[c.compound];
  const end = degradation(m, m.cliffLap + 12);
  return Math.max(0, Math.min(100, Math.round(100 * (1 - c.paceLossSec / end))));
}
const condColor = (v: number) => v > 60 ? 'var(--green)' : v >= 30 ? 'var(--amberFill)' : 'var(--red)';

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

export function Stage() {
  const { raceState, k } = useApp();
  const theme = useThemeValue();
  const [status, setStatus] = useState<ViewerStatus>({ state: 'loading', progress: 0, loaded: 0, error: '' });
  const [attempt, setAttempt] = useState(0);
  const [rotate, setRotate] = useState(false);
  const [sel, setSel] = useState<Corner | null>(null);
  const [map, setMap] = useState<Record<Slot, Corner>>(DEFAULT_MAP);
  const assigned = useRef(false);
  const api = useRef<ViewerApi | null>(null);
  const cards = useRef<Partial<Record<Slot, HTMLDivElement | null>>>({});
  const lines = useRef<Partial<Record<Slot, SVGPathElement | null>>>({});
  const marks = useRef<Partial<Record<Slot, HTMLDivElement | null>>>({});
  const mapRef = useRef(map); mapRef.current = map;
  const selRef = useRef(sel); selRef.current = sel;

  const onFrame = useCallback((pos: Partial<Record<Corner, { x: number; y: number }>>) => {
    if (!assigned.current) {
      // Same rule as the design: the two higher wheels take the top cards, ordered left to right.
      const pr = (Object.keys(pos) as Corner[]).map(c => ({ c, ...pos[c]! })).sort((a, b) => a.y - b.y);
      if (pr.length === 4) {
        const top = pr.slice(0, 2).sort((a, b) => a.x - b.x), bot = pr.slice(2).sort((a, b) => a.x - b.x);
        assigned.current = true;
        setMap({ tl: top[0].c, tr: top[1].c, bl: bot[0].c, br: bot[1].c });
      }
    }
    SLOTS.forEach(slot => {
      const card = cards.current[slot], ln = lines.current[slot], mk = marks.current[slot], p = pos[mapRef.current[slot]];
      if (!card || !ln || !mk || !p) return;
      const left = slot[1] === 'l';
      const ax = left ? card.offsetLeft + card.offsetWidth : card.offsetLeft, ay = card.offsetTop + 28, mx = ax + (left ? 14 : -14);
      const on = selRef.current === mapRef.current[slot];
      ln.setAttribute('d', `M${ax.toFixed(1)} ${ay.toFixed(1)} L${mx.toFixed(1)} ${ay.toFixed(1)} L${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
      ln.style.opacity = on ? '1' : '.7'; ln.style.stroke = on ? 'var(--red)' : 'var(--text2)'; ln.style.strokeWidth = on ? '1.75' : '1.25';
      mk.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`; mk.style.opacity = '1';
    });
  }, []);

  const ready = status.state === 'ready';
  const retry = () => { assigned.current = false; setMap(DEFAULT_MAP); setAttempt(a => a + 1); };
  const errorCard = (msg: string) => (
    <div style={{ position: 'absolute', left: '50%', top: '56%', transform: 'translate(-50%,-50%)', width: 290, padding: 18, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'center', alignItems: 'center', zIndex: 4 }}>
      <div style={{ fontWeight: 700 }}>3D vehicle unavailable</div>
      <div style={{ fontSize: 13, color: 'var(--text2)' }}>{msg} Tyre data and strategy still work.</div>
      <button className="btn solid sm" style={{ marginTop: 4 }} onClick={retry}>Retry</button>
    </div>
  );
  const corners = Object.fromEntries(raceState.corners.map(c => [c.corner, c])) as Record<Corner, CornerState>;

  return (
    <section className="stage" data-screen-label="Vehicle overview">
      <Boundary key={attempt} fallback={errorCard('The 3D viewer crashed.')}>
        <Viewer key={attempt} attempt={attempt} theme={theme} autoRotate={rotate} selected={sel} apiRef={api} onStatus={setStatus} onFrame={onFrame} />
      </Boundary>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 1, display: ready ? 'block' : 'none' }}>
        {SLOTS.map(s => <path key={s} ref={el => { lines.current[s] = el; }} d="M0 0" style={{ fill: 'none', stroke: 'var(--text2)', strokeWidth: 1.25, opacity: 0 }} />)}
      </svg>
      {ready && SLOTS.map(s => (
        <div key={s} ref={el => { marks.current[s] = el; }} onClick={() => setSel(x => x === map[s] ? null : map[s])} title={NAME[map[s]]}
          style={{ position: 'absolute', left: 0, top: 0, width: 24, height: 24, margin: '-12px 0 0 -12px', transform: 'translate(-99px,-99px)', opacity: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          <div style={{ width: sel === map[s] ? 12 : 9, height: sel === map[s] ? 12 : 9, borderRadius: '50%', background: sel === map[s] ? 'var(--red)' : 'var(--surface)', border: '2px solid var(--red)', boxShadow: '0 0 0 4px var(--redTint)', transition: 'all .2s' }} />
        </div>
      ))}
      {SLOTS.map(s => {
        const c = corners[map[s]];
        if (!c) return null;
        const v = conditionIndex(c, k), on = sel === c.corner;
        return (
          <div key={s} ref={el => { cards.current[s] = el; }} className={`tcard ${on ? 'sel' : ''}`} style={SLOT_POS[s]} title={COND_TIP} onClick={() => setSel(x => x === c.corner ? null : c.corner)}>
            <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
              <TyreThumb c={c.compound} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 12.5, whiteSpace: 'nowrap' }}>{NAME[c.corner]}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{COMPOUND_NAME[c.compound]} · {c.stintAge} laps</div>
              </div>
              <div className="sora" style={{ fontSize: 19, fontWeight: 600, lineHeight: 1, flex: '0 0 auto' }}>{v}%</div>
            </div>
            <div style={{ height: 2, borderRadius: 2, background: 'var(--grid)', marginTop: 9, overflow: 'hidden' }}><div style={{ height: '100%', width: `${v}%`, background: condColor(v), transition: 'width .5s' }} /></div>
            {on && (
              <div style={{ marginTop: 9, display: 'grid', gridTemplateColumns: '1fr auto', gap: '3px 8px', fontSize: 11.5 }}>
                <span style={{ color: 'var(--text2)' }}>Laps to drop-off</span><span style={{ fontWeight: 600 }}>{c.lapsToDropOff === 0 ? 'Past drop-off' : c.lapsToDropOff}</span>
                <span style={{ color: 'var(--text2)' }}>Pace loss</span><span style={{ fontWeight: 600 }}>{c.paceLossSec.toFixed(2)} s/lap</span>
              </div>
            )}
          </div>
        );
      })}
      <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 3 }} title={COND_TIP}><ProvenanceBadge tag="ESTIMATE" /></div>
      {status.state === 'loading' && (
        <div style={{ position: 'absolute', left: '50%', top: '56%', transform: 'translate(-50%,-50%)', width: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center', zIndex: 4 }}>
          <div className="spin" style={{ width: 24, height: 24 }} />
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>Loading 3D vehicle</div>
          <div style={{ width: '100%', height: 3, borderRadius: 2, background: 'var(--grid)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.round(status.progress * 100)}%`, background: 'var(--red)', transition: 'width .2s' }} /></div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>{status.progress > 0 ? `${Math.round(status.progress * 100)}% · ${(status.loaded / 1048576).toFixed(1)} MB` : status.loaded > 0 ? `${(status.loaded / 1048576).toFixed(1)} MB` : 'Starting…'}</div>
        </div>
      )}
      {status.state === 'error' && errorCard(status.error)}
      <div className="vctl" title="Drag to orbit · Scroll to zoom">
        <button className={rotate ? 'on' : ''} aria-pressed={rotate} title="Auto-rotate" aria-label="Auto-rotate" onClick={() => setRotate(r => !r)}><Rotate3d size={16} /></button>
        <button title="Zoom out" aria-label="Zoom out" onClick={() => api.current?.zoom(1.15)}><Minus size={16} /></button>
        <button title="Zoom in" aria-label="Zoom in" onClick={() => api.current?.zoom(1 / 1.15)}><Plus size={16} /></button>
        <button title="Reset view" aria-label="Reset view" onClick={() => api.current?.reset()}><RotateCcw size={15} /></button>
      </div>
      <div className="attr"><a href="https://sketchfab.com/3d-models/2026-redbull-rb22-0a3d24a58e0549d591a5a48c22eec383" target="_blank" rel="noreferrer">RB22 model</a> by Dave Love · <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a></div>
    </section>
  );
}
