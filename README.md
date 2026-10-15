# PITWISE — Race Strategy Intelligence

**Selected circuit: Baku City Circuit (Azerbaijan).** 6.003 km · 20 turns · 51-lap race distance (published).

How Baku shapes the build:
- **Historical replay** runs the recorded 2025 Azerbaijan GP from OpenF1 (51 laps, real sector times, real stops), and you can pick any driver.
- **Pit loss of 20.8 s and base pace of 1:44.2** are fitted from that race (`scripts/calibrate.mjs` → `src/data/baku.calibration.json`) and replace the generic assumptions.
- **Fitted tyre wear** (Medium/Hard ≈ 0.005–0.009 s/lap) is shown with its caveat. Baku's track gets faster during the race, which hides wear in lap times. Apply it from the Assumptions panel.
- **Circuit map** is the real outline built from OpenF1 car positions, split at the recorded sector boundaries (`scripts/fetchTrackOutline.mjs`).
- **ZERO HOUR scenario** keeps the challenge's hypothetical lap 31 of 53, labelled SIMULATED, on Baku pace and pit loss. It is not presented as Baku's real 51-lap distance.
- **Safety Car probability** (3%/lap) stays an explicit assumption: one race is too few to fit it.

Deployed URL: _pending `vercel login`_ · Pages: Race Dashboard `/`, Strategy Simulator `/simulator`, Live Data `/live` (honestly not connected), plus Compare, History, Settings. Telemetry / Tyre Analysis / Weather & Track are teammate stubs (`TEAMMATE_CONTRACT.md`).

## API
`GET /api/health|circuits|race/:c|weather/:c|telemetry/:c?lap=&driver=` · `POST /api/strategy` (same `recommend()` engine as the browser worker).

## Lap-time model
`lap = basePace + offset(compound) + degradation(age)·degScale + fuelKg·SEC_PER_KG + weatherPenalty(compound, wetness) + (SC ? SC_LAP_DELTA : 0) + N(0, PACE_SIGMA)`
Degradation is linear to `cliffLap`, then steeper. Constants and their sources are in `src/engine/constants.ts` and the Assumptions panel (all assumptions, not measurements).

## Limitations
No measured tyre wear · fuel estimated · simple rival model · no overtake prediction · no weather forecast · probabilities are model-relative · live mode unconfigured by design · Madrid has no real race data (SIMULATED fixture).
