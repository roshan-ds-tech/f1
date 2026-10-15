# PITWISE — Race Strategy Intelligence

Deployed URL: _pending `vercel login`_ · Pages: Race Dashboard `/`, Strategy Simulator `/simulator`, Live Data `/live` (honestly not connected), plus Compare, History, Settings. Telemetry / Tyre Analysis / Weather & Track are teammate stubs (`TEAMMATE_CONTRACT.md`).

## API
`GET /api/health|circuits|race/:c|weather/:c|telemetry/:c?lap=&driver=` · `POST /api/strategy` (same `recommend()` engine as the browser worker).

## Lap-time model
`lap = basePace + offset(compound) + degradation(age)·degScale + fuelKg·SEC_PER_KG + weatherPenalty(compound, wetness) + (SC ? SC_LAP_DELTA : 0) + N(0, PACE_SIGMA)`
Degradation is linear to `cliffLap`, then steeper. Constants and their sources are in `src/engine/constants.ts` and the Assumptions panel (all assumptions, not measurements).

## Limitations
No measured tyre wear · fuel estimated · simple rival model · no overtake prediction · no weather forecast · probabilities are model-relative · live mode unconfigured by design · Madrid has no real race data (SIMULATED fixture).
