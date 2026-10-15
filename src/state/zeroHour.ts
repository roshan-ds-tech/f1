import type { RaceState } from '../engine/types';

export const ZERO_HOUR:RaceState = {
  circuit:'madrid', sessionName:'ZERO HOUR CHALLENGE GP', driverCode:'TG',
  currentLap:31, totalLaps:53, position:3,
  us:{ id:'us', name:'Our car', isUs:true, basePace:92.0, compound:'SOFT',
       tyreAge:24, fuelKg:38, startOffsetSec:0, plannedPitLap:null,
       plannedCompound:'MEDIUM', coverProbability:0, hasPitted:false },
  rivals:[
    { id:'r1',name:'Rival A',isUs:false,basePace:91.8,compound:'MEDIUM',tyreAge:12,fuelKg:37,
      startOffsetSec:-18.4,plannedPitLap:38,plannedCompound:'MEDIUM',coverProbability:0.5,hasPitted:false },
    { id:'r2',name:'Rival B',isUs:false,basePace:92.1,compound:'SOFT',tyreAge:22,fuelKg:38,
      startOffsetSec:-6.2,plannedPitLap:34,plannedCompound:'MEDIUM',coverProbability:0.7,hasPitted:false },
    { id:'r3',name:'Rival C',isUs:false,basePace:92.3,compound:'MEDIUM',tyreAge:9,fuelKg:39,
      startOffsetSec:4.1,plannedPitLap:41,plannedCompound:'HARD',coverProbability:0.3,hasPitted:false },
    { id:'r4',name:'Rival D',isUs:false,basePace:92.5,compound:'HARD',tyreAge:28,fuelKg:36,
      startOffsetSec:12.8,plannedPitLap:null,plannedCompound:'HARD',coverProbability:0.2,hasPitted:false },
  ],
  corners:[
    { corner:'FL',compound:'MEDIUM',stintAge:18,stintNumber:2,paceLossSec:0.4,lapsToDropOff:8,trend:'rising' },
    { corner:'FR',compound:'MEDIUM',stintAge:18,stintNumber:2,paceLossSec:0.4,lapsToDropOff:8,trend:'rising' },
    { corner:'RL',compound:'MEDIUM',stintAge:18,stintNumber:2,paceLossSec:0.3,lapsToDropOff:11,trend:'stable' },
    { corner:'RR',compound:'MEDIUM',stintAge:18,stintNumber:2,paceLossSec:0.6,lapsToDropOff:5,trend:'steep' },
  ],
  wetnessNow:0, rainArrivalLap:38, rainArrivalSigma:4, rainIntensity:0.55,
  trackTempC:28, airTempC:21,
  safetyCarActive:true, safetyCarLapsRemaining:3, scProbPerLap:0.015,
  provenance:'SIMULATED',
};
