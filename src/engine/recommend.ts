import type { Compound, RaceState, Scenario, Strategy, StrategyResult } from './types';
import { DEFAULTS, type Constants } from './constants';
import { sampleScenarios } from './scenarios';
import { simulateDetailed } from './simulate';

const NAME:Record<Compound,string> = { SOFT:'Soft', MEDIUM:'Medium', HARD:'Hard', INTER:'Inter', WET:'Wet' };
const SHORT:Record<Compound,string> = { SOFT:'SOFT', MEDIUM:'MED', HARD:'HARD', INTER:'INTER', WET:'WET' };

export function generateCandidates(state:RaceState):Strategy[] {
  const out:Strategy[] = [];
  const last = Math.min(state.currentLap+9, state.totalLaps-1);
  const compounds:Compound[] = ['MEDIUM','HARD'];
  const rainSoon = state.rainArrivalLap !== null && state.rainArrivalLap - state.currentLap <= 10;
  if (rainSoon || state.wetnessNow > 0.2) compounds.push('INTER');
  if (state.totalLaps - state.currentLap < 15) compounds.push('SOFT');
  for (let lap=state.currentLap; lap<=last; lap++) {
    for (const c of compounds) {
      const now = lap === state.currentLap;
      out.push({
        id:`pit-${lap}-${c}`,
        label:`${now ? 'Box now' : `Box L${lap}`} — ${NAME[c]}`,
        plan:`Pit L${lap} · ${SHORT[c]} to flag`,
        pitLap:lap, compound:c,
      });
    }
  }
  out.push({ id:'no-stop', label:'Stay out — no stop', plan:'No further stop', pitLap:null, compound:state.us.compound });
  return out.slice(0,40).concat(out.length>40 ? [out[out.length-1]] : []).filter((s,i,a)=>a.findIndex(x=>x.id===s.id)===i);
}

function quantile(sorted:number[], q:number):number {
  return sorted[Math.min(sorted.length-1, Math.max(0, Math.floor(q*(sorted.length-1))))];
}

function score(strats:Strategy[], state:RaceState, pool:Scenario[], k:Constants, seed:number):StrategyResult[] {
  return strats.map(strategy => {
    const times:number[] = []; const hist = new Array(20).fill(0) as number[];
    let posSum = 0;
    pool.forEach((sc, i) => {
      const r = simulateDetailed(strategy, state, sc, k, seed*7919 + i);
      times.push(r.time); hist[r.position-1]++; posSum += r.position;
    });
    const n = pool.length;
    const sorted = [...times].sort((a,b)=>a-b);
    const mean = times.reduce((a,b)=>a+b,0)/n;
    const p5 = quantile(sorted,0.05), p95 = quantile(sorted,0.95);
    const spread = p95 - p5;
    return {
      strategy, meanTime:mean, medianDelta:0, p5, p95,
      podiumShare:(hist[0]+hist[1]+hist[2])/n, winShare:hist[0]/n,
      positionHistogram:hist.map(h=>h/n), expectedPosition:posSum/n,
      risk: spread < 8 ? 'Low' : spread < 18 ? 'Medium' : 'High',
    } as StrategyResult;
  });
}

export function recommend(state:RaceState, k:Constants = DEFAULTS, seed = 42):StrategyResult[] {
  const cands = generateCandidates(state);
  const coarsePool = sampleScenarios(state, k.COARSE_SCENARIOS, seed, k);
  const coarse = score(cands, state, coarsePool, k, seed).sort((a,b)=>a.meanTime-b.meanTime);
  const shortlist = coarse.slice(0,k.SHORTLIST_SIZE).map(r=>r.strategy);
  const finePool = sampleScenarios(state, k.FINE_SCENARIOS, seed+1, k);
  const fine = score(shortlist, state, finePool, k, seed+1).sort((a,b)=>a.meanTime-b.meanTime);
  const best = fine[0].meanTime;
  for (const r of fine) r.medianDelta = r.meanTime - best;
  return fine;
}
