import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';
import type { CircuitId, Provenance, RaceState, ScenarioInputs, StrategyResult, TyreModel, Compound } from '../engine/types';
import { DEFAULT_SCENARIO } from '../engine/types';
import { CIRCUITS, DEFAULTS, TYRES, type Constants } from '../engine/constants';
import { useRecommendation } from '../engine/useRecommendation';
import { deriveRaceState, degConstants, type Mode } from './deriveRaceState';
import { FIXTURES } from '../data/fixtures';
import type { RaceFixture } from '../data/types';
import { ZERO_HOUR } from './zeroHour';
import { FOCUS_CIRCUIT } from '../config';
import { CALIBRATION } from '../data/calibration';

export interface AppContextValue {
  mode: Mode; setMode(m: Mode): void;
  circuit: CircuitId; setCircuit(c: CircuitId): void;
  driverCode: string; setDriver(d: string): void;
  lap: number; setLap(l: number): void;
  scenario: ScenarioInputs; setScenario(s: Partial<ScenarioInputs>): void;
  raceState: RaceState;             // derived, read-only
  results: StrategyResult[];        // derived, read-only
  loading: boolean;
  fixture: RaceFixture | null;
  provenance: Provenance;
  // extras (read-only for teammates)
  k: Constants; elapsedMs: number;
  kOverrides: Partial<Record<string, number>>; setK(key: string, v: number): void;
  tyreOverrides: Partial<Record<Compound, Partial<TyreModel>>>; setTyre(c: Compound, f: keyof TyreModel, v: number): void;
  resetAssumptions(): void;
  selectedId: string | null; setSelectedId(id: string | null): void;
  resetScenario(): void;
}

const Ctx = createContext<AppContextValue | null>(null);
export function useApp(): AppContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside <AppProvider>');
  return v;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setModeS] = useState<Mode>('scenario');
  const [circuit, setCircuitS] = useState<CircuitId>(FOCUS_CIRCUIT);
  const [driverCode, setDriver] = useState('');
  const [lap, setLapS] = useState(ZERO_HOUR.currentLap);
  const [scenario, setScen] = useState<ScenarioInputs>(DEFAULT_SCENARIO);
  const [kOverrides, setKO] = useState<Partial<Record<string, number>>>({});
  const [tyreOverrides, setTO] = useState<Partial<Record<Compound, Partial<TyreModel>>>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fixture = FIXTURES[circuit];
  const setScenario = useCallback((s: Partial<ScenarioInputs>) => { setScen(p => ({ ...p, ...s })); setSelectedId(null); }, []);
  const resetScenario = useCallback(() => { setScen(DEFAULT_SCENARIO); setSelectedId(null); }, []);
  const setMode = useCallback((m: Mode) => {
    setModeS(m);
    if (m === 'scenario') setLapS(ZERO_HOUR.currentLap);
    if (m === 'replay') setLapS(Math.max(2, Math.round(FIXTURES[circuit].meta.totalLaps * 0.4)));
  }, [circuit]);
  const setCircuit = useCallback((c: CircuitId) => {
    setCircuitS(c); setDriver(''); setSelectedId(null);
    setLapS(mode === 'replay' ? Math.max(2, Math.round(FIXTURES[c].meta.totalLaps * 0.4)) : ZERO_HOUR.currentLap);
  }, [mode]);
  const setLap = useCallback((l: number) => setLapS(l), []);

  useEffect(() => {
    if (mode === 'replay') { const t = fixture.meta.totalLaps; if (lap > t) setLapS(t); else if (lap < 2) setLapS(2); }
  }, [mode, fixture, lap]);

  const code = driverCode || (mode === 'replay' ? fixture.drivers[0]?.code ?? '' : ZERO_HOUR.driverCode);
  const raceState = useMemo(() => deriveRaceState({ mode, circuit, lap, scenario, fixture, driverCode: code }),
    [mode, circuit, lap, scenario, fixture, code]);

  const k = useMemo<Constants>(() => {
    const tyres = { ...TYRES } as Record<Compound, TyreModel>;
    for (const c of Object.keys(tyreOverrides) as Compound[]) tyres[c] = { ...TYRES[c], ...tyreOverrides[c] };
    return { ...DEFAULTS, PIT_LOSS_BASE: CALIBRATION[circuit]?.pitLossSec ?? CIRCUITS[circuit].pitLossBase, ...degConstants(scenario.deg), ...kOverrides, TYRES: tyres };
  }, [circuit, scenario.deg, kOverrides, tyreOverrides]);

  const { results, loading, elapsedMs } = useRecommendation(raceState, k);
  const provenance: Provenance = raceState.provenance;

  const value: AppContextValue = {
    mode, setMode, circuit, setCircuit, driverCode: code, setDriver, lap, setLap, scenario, setScenario,
    raceState, results, loading, fixture, provenance, k, elapsedMs,
    kOverrides, setK: (key, v) => setKO(p => ({ ...p, [key]: v })),
    tyreOverrides, setTyre: (c, f, v) => setTO(p => ({ ...p, [c]: { ...p[c], [f]: v } })),
    resetAssumptions: () => { setKO({}); setTO({}); },
    selectedId, setSelectedId, resetScenario,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
