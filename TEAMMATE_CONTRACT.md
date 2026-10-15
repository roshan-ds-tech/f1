# PITWISE — Teammate Contract

You own **one** page file plus `src/components/<yourpage>/`. Shared files are owned by the lead — do not edit them.

| Page | File | Your components folder |
|---|---|---|
| Tyre Analysis | `src/pages/TyreAnalysis.tsx` | `src/components/tyreanalysis/` |

The Telemetry, Weather & Track and Race History pages were removed from the project (replay is still available from the Scenario drawer → Mode → Replay).

## 0. Circuit
The project is tailored to **Baku** (`FOCUS_CIRCUIT` in `src/config.ts`; facts in `CIRCUIT_FACTS`). Fitted parameters are in `CALIBRATION.baku` and the real outline is in `OUTLINES.baku` (`src/data/calibration.ts`). Tyre Analysis builds on these, not on hard-coded numbers.

## 1. App context
```ts
import { useApp } from '../state/AppContext';
const { raceState, results, fixture, lap, mode, circuit, provenance } = useApp();
```
```ts
interface AppContextValue {
  mode:'replay'|'live'|'scenario';  setMode(m):void;
  circuit:CircuitId;                setCircuit(c):void;
  driverCode:string;                setDriver(d):void;
  lap:number;                       setLap(l):void;
  scenario:ScenarioInputs;          setScenario(s:Partial<ScenarioInputs>):void;
  raceState:RaceState;              // derived, read-only (replay: only laps <= lap are visible)
  results:StrategyResult[];         // derived, read-only, sorted best first
  loading:boolean;
  fixture:RaceFixture|null;         // full prepared race for the circuit (meta, drivers, timeline, weather)
  provenance:Provenance;
  // read-only extras
  k:Constants; elapsedMs:number; selectedId:string|null;
}
```
Types: `src/engine/types.ts`, fixture types: `src/data/types.ts`. **In replay mode never read `fixture.timeline` entries with `lap > lap`** — filter first.

## 1b. Design source
`design-reference.html` (repo root) is the readable markup of the approved design, with exact inline styles. Port your page from it, not from screenshots. Fonts: **Sora** for display numerals/headings (`className="sora"`), **Manrope** for everything else (already on `body`). Tyre photos: `/tyres/soft.png`, `/tyres/medium.png`, `/tyres/inter.png` only. Use `<TyreThumb c={compound}/>` from `src/components/TyreThumb.tsx`, which already does the ring fallback for Hard and Wet.

## 2. CSS tokens
Colours come from CSS variables, never hex literals:
`--bg --surface --surface2 --card --line --grid --text --text2 --red --redTint --green --greenTint --amber --amberFill --amberTint --blue --blueTint --hard --med --inter --tile --stage`. Both `data-theme="dark"` (default) and `"light"` must work.
Classes: `.card` (14px-radius panel), `.label` (10.5px/600, 1.4px tracking, the only caption style), `.sora`, `.mono`, `.strip` + `.cell` (hairline stat strip), `.chart-grid` + `.chart`, `.pill`, `.btn`, `.seg`, `.empty`, `.warn`. Radii: 14px panels, 10px tiles, 999px pills. Panel padding `26px 28px 24px`, block gap 16px.

## 3. Compound colours
```ts
import { COMPOUND_COLOR, COMPOUND_LETTER } from '../styles/compounds';
COMPOUND_COLOR.SOFT // 'var(--red)'
```
Never hardcode compound colours elsewhere.

## 4. Provenance (mandatory)
Every displayed value carries one: `HISTORICAL` (REAL HISTORICAL DATA), `LIVE` (LIVE DATA), `SIMULATED` (SIMULATED INPUT), `ESTIMATE` (MODEL ESTIMATE).
`<ProvenanceBadge tag="ESTIMATE" />`. Never present generated values as recorded. No `Math.random()` anywhere in `src/engine/`.

## 5. Shared components — `src/components/ui`
`ProvenanceBadge({tag, short?})`, `StatStrip` wrapping `StatTile({label,value,sub?,prov?})` cells, `SegmentedControl({options,value,onChange})`, `Card({title?,right?,children})`, `EmptyState({title,children?,action?})`, `CircuitSelect({value,onChange})`.

## 6. API (`/api/*`, all responses `{ data, provenance, generatedAt, source }`)
- `GET /api/health` → `{"data":{"status":"ok"},"provenance":"NONE",...}`
- `GET /api/circuits` → circuit assumptions array (`provenance:"ESTIMATE"`)
- `GET /api/race/:circuit` → full fixture (`provenance` HISTORICAL or SIMULATED)
- `GET /api/weather/:circuit` → `{meta, weather:[{lap,airTempC,trackTempC,rainfall}]}`
- `GET /api/telemetry/:circuit?lap=31&driver=VER` → lap rows up to `lap` for the driver (lap-level only)
- `POST /api/strategy` body `{state:RaceState,k?,seed?}` → `{results,elapsedMs}`
Circuits: `baku | madrid | monaco | singapore`. Unknown circuit → 400, unknown route → 404.

## 7. Worked example — one tyre card
```tsx
import { useApp } from '../state/AppContext';
import { Card, ProvenanceBadge } from '../components/ui';
import { COMPOUND_COLOR } from '../styles/compounds';
export function Example() {
  const { raceState } = useApp();
  const c = raceState.corners[0];
  return <Card title={c.corner} right={<ProvenanceBadge tag="ESTIMATE" />}>
    <b style={{ color: COMPOUND_COLOR[c.compound] }}>{c.compound}</b>
    <div className="mono">{c.paceLossSec.toFixed(2)} s/lap · {c.lapsToDropOff} laps to drop-off</div>
  </Card>;
}
```
