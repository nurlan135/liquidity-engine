---
phase: 07-smt-4h-1h-sequencing-math
plan: 01
subsystem: ict-math
tags: [smt, divergence, pearson, rollover, vitest, pure-functions]

# Dependency graph
requires:
  - phase: 06-dual-symbol-proxy-data-contracts
    provides: per-leg D1 envelopes, closedOnly discipline, detectRollover tripwire, computeATR
provides:
  - Time-anchored SMT comparator (matchSwings + detectSMT) with BULLISH/BEARISH/NO-SIGNAL output
  - Rolling 20-day Pearson correlation gate with CORR_DECOUPLED suppression
  - Joint NQ/ES rollover-week suppression with JSON-backed fixture
affects: [phase-08-selectors, phase-09-report-section-3, fvg-plan-02, aggregate-plan-03]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 7374
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: [fractal-k swing matching with time-anchored pairing, bps-gap compare with sweeper label, gate-before-matching order, honest-degrade suppressed envelopes]

key-files:
  created:
    - src/lib/ict/smt.ts
    - src/lib/ict/smt.test.ts
    - src/lib/__fixtures__/smt-rollweek.json
  modified: []

key-decisions:
  - "Gate order correlation -> rollover -> matching, matching skipped entirely on suppression"
  - "Thin-history (<20 paired closes) suppresses as CORR_DECOUPLED with no corr field"
  - "Empty-ATR-series legs treated as non-suspect, never suspect"

patterns-established:
  - "Fractal swing detection: strict max/min over k neighbors each side, equality means no swing"
  - "Swing pairing by overlapping calendar date window only, one-to-one via used-set, ascending by windowStart"
  - "Bps compare on raw OHLC with strict-greater-than tolerance semantics; exact-tolerance is NO-SIGNAL"

requirements-completed: [ICT-08, ICT-09]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "SMT comparator returns BULLISH/BEARISH/NO-SIGNAL with sweeperLeg plus nqWindow, esWindow, bpsGap"
    requirement: "ICT-08"
    verification:
      - kind: unit
        ref: "src/lib/ict/smt.test.ts#bearish mirror / bullish case / default NO-SIGNAL"
        status: pass
    human_judgment: false
  - id: D2
    description: "Correlation below 0.70 suppresses with CORR_DECOUPLED before matching; flat-leg windows suppress without throwing"
    requirement: "ICT-08"
    verification:
      - kind: unit
        ref: "src/lib/ict/smt.test.ts#decoupled low-correlation / thin history / flat-ES 20-close"
        status: pass
    human_judgment: false
  - id: D3
    description: "Either-leg rollover suspect suppresses with rollover-week on the JSON-backed joint fixture"
    requirement: "ICT-09"
    verification:
      - kind: unit
        ref: "src/lib/ict/smt.test.ts#joint roll-week fixture asserts suppressed rollover-week"
        status: pass
    human_judgment: false
  - id: D4
    description: "NO-SIGNAL on choppy offsets and exact-25bp edge; direction stable under 2-bar shift; purity gates clean"
    requirement: "ICT-08"
    verification:
      - kind: unit
        ref: "src/lib/ict/smt.test.ts#choppy / exact-tolerance edge / lookback shift / forming-exclusion"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-09-07
status: complete
plan_head_before: ca3e8ead4c19b0921a9f3ee2f21a9a384c81a3ea
---

# Phase 07 Plan 01: Time-Anchored SMT Comparator Summary

**Tracer plus hardening for the time-anchored SMT comparator: fractal-k swing matching, bps compare with sweeper label, 20-day correlation gate, and joint NQ/ES rollover suppression — 17/17 tests green, full suite 182/182**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-07T06:34:06Z
- **Completed:** 2026-09-07T06:46:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- New pure module `smt.ts`: SWING_K/SMT_TOL_BPS/CORR_WINDOW/CORR_MIN/SWING_LOOKBACK constants, isSwingHigh/isSwingLow strict fractals, time-anchored matchSwings, bps-based detectSMT, textbook pearsonCorr, full evaluateSMT pipeline
- Correlation gate runs before matching: thin history suppresses without corr field, r < 0.70 suppresses carrying corr, zero-variance converts to suppression without throwing
- Joint rollover suppression: per-leg computeATR last value, shared ROLLOVER_ATR_MULT via detectRollover, either suspect yields rollover-week
- Roll-week JSON fixture (25 NQ + 25 ES D1 bars, NQ gap 425 > 3xATR tripwire 198.7, trailing-20 r 0.92 so the rollover gate owns the verdict)

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer: SMT core slice bull/bear happy path end to end** - `f545abf` (feat)
2. **Task 2: SMT hardening: correlation gate, joint rollover suppression, negative fixtures** - `e5baa19` (feat)

## Files Created/Modified

- `src/lib/ict/smt.ts` - SMT comparator: swing match, bps compare, correlation gate, joint rollover suppression
- `src/lib/ict/smt.test.ts` - 17 tests: bull, bear, NO-SIGNAL defaults, constants pins, choppy, lookback-shift, decoupled, thin-history, zero-variance, roll-week, exact-edge, forming-exclusion, tolerance-throw, gates-passthrough, non-finite boundary, no-mutation
- `src/lib/__fixtures__/smt-rollweek.json` - Joint roll-week D1 pair (NQ gaps, ES clean)

## Decisions Made

- Gate order correlation -> rollover -> matching; suppressed windows skip matchSwings entirely (plan left rollover position open; research recommended rollover-before-matching)
- Thin-history (< CORR_WINDOW paired closes) suppresses as CORR_DECOUPLED with no corr field (locked decisions specified the gate but not the thin edge; mirrors the honest-degrade house template)
- Empty-ATR-series legs treated as non-suspect with no flag (mirrors selectRollover atr<=0->null precedent; avoids false-suspect on short legs)
- evaluateSMT pairs by shared calendar date string at its own boundary (D1 strings, not join.ts epoch rows — join.ts consumes IntradayCandle; SMT is D1-only per D-01)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Tracer slice passed 5/5 on first run; hardening extended to 17/17 on first run; full suite 182/182 across 23 files with the D1 NQ anchor path untouched.

## Threat Flags

None beyond the plan threat model. T-07-01 mitigated (non-finite OHLC dropped at evaluateSMT and matchSwings boundaries, bad tolerance throws with echoed value, non-finite corr converts to CORR_DECOUPLED). T-07-02 mitigated (raw OHLC only; adjclose grep gate clean).

## Known Stubs

None. No hardcoded empty values, placeholder text, or unwired data sources in the new module or tests.

## Self-Check: PASSED

- `src/lib/ict/smt.ts`, `src/lib/ict/smt.test.ts`, `src/lib/__fixtures__/smt-rollweek.json` all FOUND on disk
- Commits `f545abf` and `e5baa19` both FOUND in `git log`
- `npm test -- src/lib/ict/smt.test.ts`: 17/17 pass
- `npm test` full suite: 182/182 pass
- `grep Date.now/new Date()` (minus `://`): exit 1, no output
- `grep -rni adjclose`: exit 1, no output

## Next Phase Readiness

- Ready for 07-02 (FVG map + ERL/IRL transition) and 07-03 (1H→4H aggregate): no shared files touched, no store changes, no API changes
- Downstream selectors (Phase 8) can consume `evaluateSMT(nqD1, esD1, asOf)` directly; suppressed envelopes share the `CORR_DECOUPLED | rollover-week` vocabulary Phase 9 §3 renders verbatim
- No blockers or concerns

---
*Phase: 07-smt-4h-1h-sequencing-math*
*Completed: 2026-09-07*
