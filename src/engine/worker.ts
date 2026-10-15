import type { RaceState, StrategyResult } from './types';
import type { Constants } from './constants';
import { recommend } from './recommend';

export interface WorkerIn { id:number; state:RaceState; k:Constants; seed:number; }
export interface WorkerOut { id:number; results:StrategyResult[]; elapsedMs:number; }

self.onmessage = (e:MessageEvent<WorkerIn>) => {
  const t0 = performance.now();
  const results = recommend(e.data.state, e.data.k, e.data.seed);
  (self as unknown as Worker).postMessage({ id:e.data.id, results, elapsedMs:performance.now()-t0 } satisfies WorkerOut);
};
