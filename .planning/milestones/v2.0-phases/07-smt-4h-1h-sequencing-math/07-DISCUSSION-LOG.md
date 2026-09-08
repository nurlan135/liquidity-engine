# Phase 7: SMT + 4H/1H Sequencing Math - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-07
**Phase:** 7-smt-4h-1h-sequencing-math
**Areas discussed:** SMT comparator inputs, Correlation-regime gate, FVG map + ERL/IRL transition, 4H synthesis anchor

---

## SMT comparator inputs — feed series

| Option | Description | Selected |
|--------|-------------|----------|
| D1 daily only | Matches the locked out-of-scope rule (daily SMT first) and the proven D1 NQ anchor path; intraday pipes reserved for AMD/Phase 8 | ✓ |
| D1 primary + 1H confirm | Daily swing pair gates; 1H displacement confirms; richer but more NO-SIGNAL outcomes | |
| You decide | Researcher picks from PITFALLS + ICT sources | |

**User's choice:** D1 daily only
**Notes:** User selected the recommended option on first pass. REQUIREMENTS.md out-of-scope ("Intraday SMT in v2.0") was treated as a hard constraint, not re-litigated.

## SMT comparator inputs — swing detection

| Option | Description | Selected |
|--------|-------------|----------|
| Fractal k=2, window 60D | k=2 on ~60 daily bars; SWING_K named constant pinned by test per PITFALLS P1; same k both legs | ✓ |
| Fractal k=3, window 90D | Stricter swings, longer history; fewer pairs, more thin-history degrade | |
| You decide | Researcher tunes k/window against 60-day history fixtures | |

**User's choice:** Fractal k=2, window 60D

## SMT comparator inputs — bps tolerance

| Option | Description | Selected |
|--------|-------------|----------|
| 25 bps fixed | One named constant SMT_TOL_BPS=25 both legs; bps absorbs NQ≈5× ES scale; regime-gate absorbs volatility shifts | ✓ |
| ATR-scaled tolerance | Adapts to regimes but adds a second moving part; harder fixture tests | |
| You decide | Researcher calibrates fixed vs ATR-scaled on historical windows | |

**User's choice:** 25 bps fixed

## SMT comparator inputs — output shape

| Option | Description | Selected |
|--------|-------------|----------|
| Direction + sweeper + windows | { direction, sweeperLeg NQ|ES, nqWindow, esWindow, bpsGap }; labels which leg to fade; never bare 'SMT detected' | ✓ |
| Direction only + reason string | Minimal { direction, reason } like v1.0 flags; swing refs in tests/logs only | |
| You decide | Researcher designs SMTSignal type from ICT sources + §3 needs | |

**User's choice:** Direction + sweeper + windows

---

## Correlation-regime gate — decouple measure

| Option | Description | Selected |
|--------|-------------|----------|
| Rolling correlation, 20D | Pearson on daily closes over 20 bars; suppress below 0.70 as CORR_DECOUPLED; shares 20-bar vocabulary with REGIME_AVG_WINDOW | ✓ |
| ATR-ratio divergence | Catches volatility-regime splits correlation misses; two ATR pipelines must stay in sync | |
| You decide | Researcher compares on roll-week and macro-news fixtures | |

**User's choice:** Rolling correlation, 20D

## Correlation-regime gate — decouple output

| Option | Description | Selected |
|--------|-------------|----------|
| Suppressed envelope | { suppressed: true, reason: 'CORR_DECOUPLED', corr } — same vocabulary as rollover-week; one honest pattern for §3 | ✓ |
| Silent NO-SIGNAL | Forces NO-SIGNAL with rationale; §3 can't distinguish 'no divergence' from 'decoupled' | |
| You decide | Researcher designs suppression output from §3 honesty needs | |

**User's choice:** Suppressed envelope

## Correlation-regime gate — ordering

| Option | Description | Selected |
|--------|-------------|----------|
| Gate first | Decoupled windows skip matching entirely; matched-pair fixtures never need a low-corr case | ✓ |
| Parallel + annotate | Both run; output carries { signal, corrSuppressed } for analyst debug value | |
| You decide | Researcher orders from ICT semantics | |

**User's choice:** Gate first

---

## FVG/IRL — map scope + mitigation

| Option | Description | Selected |
|--------|-------------|----------|
| Both sides + fill | Both polarities on NQ D1; fill on close-through; bounded to latest ~20; forward-compatible with STRUCT-03 grading | ✓ |
| Unfilled only | Filled gaps drop entirely; smaller output but no mitigated-zone history for §3 | |
| You decide | Researcher designs from ICT sources | |

**User's choice:** Both sides + fill

## FVG/IRL — sweep-then-reject rule

| Option | Description | Selected |
|--------|-------------|----------|
| Wick + close back | Wick pierces FVG boundary but same candle closes back inside/through origin zone; pure-function friendly on D1 closes | ✓ |
| Pierce + displacement | Subsequent opposite displacement candle (min ATR-multiple); mirrors Judas three-gate vocabulary but fewer D1 transitions | |
| You decide | Researcher defines from ICT transition semantics | |

**User's choice:** Wick + close back

## FVG/IRL — §2 upgrade shape

| Option | Description | Selected |
|--------|-------------|----------|
| Extend §2 prose | Transition output { state, originFvg, triggerCandle } feeds existing bias/DOL/Delivery-Cycle prose; IRL-aware delivery sentence, no new section | ✓ |
| Standalone output | FVG/IRL ships as standalone selector output; §2 untouched until Phase 9 | |
| You decide | Researcher maps from report-shape needs | |

**User's choice:** Extend §2 prose

---

## 4H anchor — block grid anchor

| Option | Description | Selected |
|--------|-------------|----------|
| 18:00 ET open | CME equity-index day boundary; aligns 4H with futures session reality per PITFALLS CME sources; Baku display at edge | ✓ |
| 00:00 ET midnight | Simpler wall-clock grid but splits NY afternoon / Globex evening flow mid-block | |
| You decide | Researcher picks from CME session + ICT 4H conventions | |

**User's choice:** 18:00 ET open

## 4H anchor — partial trailing blocks

| Option | Description | Selected |
|--------|-------------|----------|
| Complete blocks only | Only full 4-candle blocks emitted (closedOnly); partial excluded until 4th hour closes; detectors never self-update | ✓ |
| Partial flagged forming | Partial emitted with { forming: true } for chart continuity; detectors must filter it | |
| You decide | Researcher decides from closedOnly discipline | |

**User's choice:** Complete blocks only

## 4H anchor — output shape

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse Candle shape | 4H blocks reuse D1 Candle shape so computeRange/computeBias/regime helpers consume unchanged | ✓ |
| Dedicated block type | FourHourBlock with { startTime, endTime, sourceHours } provenance; every consumer needs an adapter | |
| You decide | Researcher designs from consumer needs | |

**User's choice:** Reuse Candle shape

---

## Area flow

Each area ended with a "More questions / Next area" check; user chose "Next area" every time (no deep-dive extensions). Final "Done" check offered "Explore more areas" (e.g. rollover-threshold sharing, ICT-09/ICT-10 boundary, selector refusal vocabulary) — user chose "Ready for context".

## Claude's Discretion

None — user decided every question directly (no "You decide" selections).

## Deferred Ideas

None — discussion stayed within phase scope.
