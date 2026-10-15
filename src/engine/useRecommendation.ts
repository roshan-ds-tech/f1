import { useEffect, useRef, useState } from 'react';
import type { RaceState, StrategyResult } from './types';
import type { Constants } from './constants';
import type { WorkerOut } from './worker';

export function useRecommendation(state:RaceState, k:Constants, seed = 42) {
  const [results, setResults] = useState<StrategyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    const w = new Worker(new URL('./worker.ts', import.meta.url), { type:'module' });
    workerRef.current = w;
    w.onmessage = (e:MessageEvent<WorkerOut>) => {
      if (e.data.id !== reqId.current) return; // superseded
      setResults(e.data.results); setElapsedMs(e.data.elapsedMs); setLoading(false);
    };
    return () => { w.terminate(); workerRef.current = null; };
  }, []);

  useEffect(() => {
    setLoading(true);
    const id = ++reqId.current;
    const t = setTimeout(() => workerRef.current?.postMessage({ id, state, k, seed }), 150);
    return () => clearTimeout(t);
  }, [state, k, seed]);

  return { results, loading, elapsedMs };
}
