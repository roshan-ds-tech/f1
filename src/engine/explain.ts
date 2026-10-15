import type { RaceState, StrategyResult } from './types';
import { TYRES as BASE_TYRES, type Constants } from './constants';

export function explain(best:StrategyResult, runnerUp:StrategyResult|undefined, state:RaceState, k:Constants):string[] {
  const out:string[] = [];
  const s = best.strategy;
  if (s.pitLap === null) {
    out.push(`Staying out on ${state.us.compound.toLowerCase()} tyres avoids the ${k.PIT_LOSS_BASE.toFixed(1)}s pit loss; under our model the tyre wear cost over the remaining laps is smaller than that.`);
  } else {
    const underSC = state.safetyCarActive && s.pitLap < state.currentLap + state.safetyCarLapsRemaining;
    if (underSC) {
      out.push(`Pitting under the safety car cuts the stop to ${(k.PIT_LOSS_BASE*k.SC_PIT_MULTIPLIER).toFixed(1)}s instead of ${k.PIT_LOSS_BASE.toFixed(1)}s (modelled discount).`);
    } else {
      out.push(`Pitting on L${s.pitLap} costs ${k.PIT_LOSS_BASE.toFixed(1)}s of track time in the model.`);
    }
    const T = k.TYRES ?? BASE_TYRES;
    const cur = T[state.us.compound], nxt = T[s.compound];
    const delta = (nxt.offset - cur.offset) - (cur.deg * state.us.tyreAge - 0);
    out.push(`${s.compound[0]+s.compound.slice(1).toLowerCase()} versus current ${state.us.compound.toLowerCase()}: compound offset ${(nxt.offset-cur.offset>=0?'+':'')}${(nxt.offset-cur.offset).toFixed(2)}s/lap, but the current set has ${state.us.tyreAge} laps of modelled wear (~${(cur.deg*state.us.tyreAge).toFixed(1)}s/lap); net ${delta<0?'gain':'loss'} of ${Math.abs(delta).toFixed(2)}s/lap on fresh rubber.`);
  }
  if (runnerUp) out.push(`Next best (${runnerUp.strategy.label}) is ${runnerUp.medianDelta.toFixed(1)}s slower on average.`);
  out.push(`Under our model, P(podium) is ${(best.podiumShare*100).toFixed(0)}%; this is a model-relative estimate, not a prediction.`);
  return out.slice(0,4);
}
