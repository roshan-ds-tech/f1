import { useSyncExternalStore } from 'react';

export interface FeedEvent {
  t: number; k: 'lap' | 'rc' | 'pit' | 'wx' | 'pos';
  d?: number | null; lap?: number | null; time?: number; s?: (number | null)[]; st?: number | null; out?: boolean;
  cat?: string; flag?: string | null; msg?: string; lane?: number | null; stop?: number | null;
  air?: number; track?: number; hum?: number; rain?: boolean; wind?: number; p?: number;
}
export interface Feed {
  meta: { source: string; sessionKey: number; grandPrix: string; circuit: string; date: string; totalLaps: number; events: number; provenance: string };
  drivers: { n: number; code: string; name: string; team: string; colour: string | null }[];
  stints: { d: number; from: number; to: number; c: string; age0: number }[];
  events: FeedEvent[];
}
export type TrackStatus = 'GREEN' | 'SAFETY CAR' | 'VSC' | 'RED FLAG' | 'CHEQUERED' | 'PRE-RACE';
export interface Car {
  n: number; laps: number; last: number | null; best: number | null; sectors: (number | null)[]; speedTrap: number | null;
  crossed: Record<number, number>; history: { lap: number; time: number }[]; pits: number; lastPitLap: number | null; inPitLane: boolean;
}
export interface Alert { t: number; tag: 'PIT' | 'TRACK' | 'FASTEST' | 'LEAD' | 'WEATHER' | 'STEWARDS'; title: string; text: string }
export interface FeedState {
  idx: number; t: number; cars: Map<number, Car>; pos: Map<number, number>; status: TrackStatus;
  rc: FeedEvent[]; wx: FeedEvent | null; fastest: { d: number; time: number; lap: number } | null;
  alerts: Alert[]; leaderLaps: number; looped: number;
}

const empty = (looped = 0): FeedState => ({
  idx: 0, t: 0, cars: new Map(), pos: new Map(), status: 'PRE-RACE', rc: [], wx: null, fastest: null, alerts: [], leaderLaps: 0, looped,
});
const car = (s: FeedState, n: number) => {
  let c = s.cars.get(n);
  if (!c) { c = { n, laps: 0, last: null, best: null, sectors: [null, null, null], speedTrap: null, crossed: {}, history: [], pits: 0, lastPitLap: null, inPitLane: false }; s.cars.set(n, c); }
  return c;
};
const code = (f: Feed, n?: number | null) => f.drivers.find(d => d.n === n)?.code ?? `#${n}`;
const alert = (s: FeedState, a: Alert) => { s.alerts = [a, ...s.alerts].slice(0, 12); };

function apply(f: Feed, s: FeedState, e: FeedEvent) {
  s.t = e.t;
  if (e.k === 'lap' && e.d != null && e.lap != null && e.time != null) {
    const c = car(s, e.d);
    c.laps = Math.max(c.laps, e.lap); c.last = e.time; c.sectors = e.s ?? [null, null, null]; c.speedTrap = e.st ?? c.speedTrap;
    c.crossed[e.lap] = e.t; c.history = [...c.history, { lap: e.lap, time: e.time }].slice(-60); c.inPitLane = false;
    if (c.best == null || e.time < c.best) c.best = e.time;
    s.leaderLaps = Math.max(s.leaderLaps, e.lap);
    if (e.lap > 2 && !e.out && (!s.fastest || e.time < s.fastest.time)) {
      s.fastest = { d: e.d, time: e.time, lap: e.lap };
      alert(s, { t: e.t, tag: 'FASTEST', title: `Fastest lap: ${code(f, e.d)}`, text: `${fmtLap(e.time)} on lap ${e.lap}` });
    }
  } else if (e.k === 'pos' && e.d != null && e.p != null) {
    const prevLeader = [...s.pos.entries()].find(([, p]) => p === 1)?.[0];
    s.pos.set(e.d, e.p);
    if (e.p === 1 && prevLeader != null && prevLeader !== e.d && s.status !== 'PRE-RACE') alert(s, { t: e.t, tag: 'LEAD', title: `New leader: ${code(f, e.d)}`, text: `Takes P1 from ${code(f, prevLeader)}` });
  } else if (e.k === 'pit' && e.d != null) {
    const c = car(s, e.d); c.pits++; c.lastPitLap = e.lap ?? null; c.inPitLane = true;
    alert(s, { t: e.t, tag: 'PIT', title: `${code(f, e.d)} pits on lap ${e.lap}`, text: `Pit lane ${e.lane?.toFixed(1) ?? '—'} s${e.stop ? ` · stationary ${e.stop.toFixed(1)} s` : ''}` });
  } else if (e.k === 'wx') {
    if (s.wx && !s.wx.rain && e.rain) alert(s, { t: e.t, tag: 'WEATHER', title: 'Rain detected', text: `Track ${e.track} °C` });
    s.wx = e;
  } else if (e.k === 'rc') {
    s.rc = [e, ...s.rc].slice(0, 40);
    const m = (e.msg ?? '').toUpperCase(), before = s.status;
    const neutral = before === 'SAFETY CAR' || before === 'VSC';
    if (e.cat === 'SessionStatus' && /STARTED/.test(m)) s.status = 'GREEN';
    if (e.cat === 'SafetyCar' && /DEPLOYED/.test(m)) s.status = /VIRTUAL/.test(m) ? 'VSC' : 'SAFETY CAR';
    if (neutral && (e.flag === 'GREEN' || /TRACK CLEAR/.test(m))) s.status = 'GREEN';
    if (e.flag === 'RED') s.status = 'RED FLAG';
    if (e.flag === 'CHEQUERED') s.status = 'CHEQUERED';
    if (before !== s.status && before !== 'PRE-RACE')
      alert(s, { t: e.t, tag: 'TRACK', title: s.status === 'GREEN' ? 'Track green' : s.status === 'CHEQUERED' ? 'Chequered flag' : `${s.status} deployed`, text: e.msg ?? '' });
    else if (before === 'PRE-RACE' && s.status === 'GREEN') alert(s, { t: e.t, tag: 'TRACK', title: 'Race started', text: e.msg ?? '' });
    if (/SAFETY CAR IN THIS LAP|VSC ENDING/.test(m)) alert(s, { t: e.t, tag: 'TRACK', title: 'Safety Car ending', text: e.msg ?? '' });
    if (/PENALTY/.test(m) && /FIA STEWARDS/.test(m) && !/SERVED/.test(m)) alert(s, { t: e.t, tag: 'STEWARDS', title: 'Penalty', text: (e.msg ?? '').replace('FIA STEWARDS: ', '') });
  }
}

export const fmtLap = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(3).padStart(6, '0')}`;
export const fmtClock = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

type Snapshot = { feed: Feed | null; state: FeedState; playing: boolean; speed: number; error: string | null };
let snap: Snapshot = { feed: null, state: empty(), playing: true, speed: 1, error: null };
const subs = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;
let loading = false;
const emit = () => { subs.forEach(f => f()); };
const set = (p: Partial<Snapshot>) => { snap = { ...snap, ...p }; emit(); };

function tick() {
  timer = null;
  const { feed, state, playing, speed } = snap;
  if (!feed || !playing) return;
  if (state.idx >= feed.events.length) {
    set({ state: empty(state.looped + 1) });
  } else {
    const next: FeedState = { ...state, cars: new Map([...state.cars].map(([k, v]) => [k, { ...v }])), pos: new Map(state.pos) };
    apply(feed, next, feed.events[state.idx]);
    next.idx = state.idx + 1;
    set({ state: next });
  }
  schedule(1000 / speed, state.idx >= (feed.events.length - 1) ? 3000 : 0);
}
function schedule(ms: number, extra = 0) { if (!timer && snap.playing && subs.size) timer = setTimeout(tick, ms + extra); }

function ensureLoaded() {
  if (snap.feed || loading) return;
  loading = true;
  import('../../data/baku.feed.json')
    .then(m => { set({ feed: m.default as unknown as Feed }); schedule(1000 / snap.speed); })
    .catch(e => set({ error: e instanceof Error ? e.message : 'Feed could not be loaded' }))
    .finally(() => { loading = false; });
}

export const feedControls = {
  play() { set({ playing: true }); schedule(1000 / snap.speed); },
  pause() { set({ playing: false }); if (timer) { clearTimeout(timer); timer = null; } },
  restart() { if (timer) { clearTimeout(timer); timer = null; } set({ state: empty(snap.state.looped) }); schedule(1000 / snap.speed); },
  setSpeed(speed: number) { set({ speed }); if (timer) { clearTimeout(timer); timer = null; } schedule(1000 / speed); },
};

export function useFeed() {
  return useSyncExternalStore(cb => {
    subs.add(cb); ensureLoaded(); schedule(1000 / snap.speed);
    return () => { subs.delete(cb); };
  }, () => snap);
}

export function stateAt(feed: Feed, n: number): FeedState {
  const s = empty();
  for (let i = 0; i < Math.min(n, feed.events.length); i++) { apply(feed, s, feed.events[i]); s.idx = i + 1; }
  return s;
}
