---
phase: 01-data-foundation-ict-core
plan: 02
subsystem: ict-core
tags: [ict-math, dealing-range, bias, dol, atr-regime, rollover, vitest]
dependency_graph:
  requires:
    - phase: 01-01
      provides: [vitest-harness, canonical-ict-types, range-anchor-math]
  provides: [levels-eq-quadrants-ote, bias-with-rationale, primary-dol, atr-regime, rollover-tripwire, re-anchor-rule-table]
  affects: [01-03, phase-2-selectors]
actuals:
  tokens: 6659
  tasks: 3
  commits: 3
tech_stack:
  added: []
  patterns: [pure-ict-functions, closedOnly-first, close-only-reanchor, flag-and-continue, honest-degrade]
key_files:
  created:
    - src/lib/ict/levels.ts
    - src/lib/ict/levels.test.ts
    - src/lib/ict/range.test.ts
    - src/lib/ict/bias.ts
    - src/lib/ict/bias.test.ts
    - src/lib/ict/dol.ts
    - src/lib/ict/dol.test.ts
    - src/lib/ict/regime.ts
    - src/lib/ict/regime.test.ts
    - src/lib/ict/rollover.ts
    - src/lib/ict/rollover.test.ts
  modified: []
key-decisions:
  - "bias.ts re-exports ANCHOR_WINDOW from range.ts so the thin-history threshold has a single source of truth"
  - "DOL name constants DOL_HIGH_NAME/DOL_LOW_NAME exported for exact-spelling reuse by Phase 2 selectors"
  - "computeATR exported alongside computeRegime so sibling plan 01-03 and Phase 2 selectors can reuse Wilder smoothing directly"
  - "rollover proximity uses quarterly third-Friday Mar/Jun/Sep/Dec within 10 calendar days, computed from the injected asOf string with no wall-clock reads"
requirements-completed: [ICT-02, ICT-03, ICT-04, ICT-05, ICT-06, ICT-07]
coverage:
  - id: D1
    description: "Levels math (EQ, Q1/Q3 quadrants, bull/bear OTE pockets, position) per D-13"
    requirement: "ICT-02"
    verification:
      - kind: unit
        ref: "src/lib/ict/levels.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Re-anchor rule table (close-only retire, wick ignored, equality no-retire, idempotent, forming excluded) per D-06"
    requirement: "ICT-03"
    verification:
      - kind: unit
        ref: "src/lib/ict/range.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Bias with mandatory rationale (thin-history, buffer, discount/premium) per D-09/D-10"
    requirement: "ICT-04"
    verification:
      - kind: unit
        ref: "src/lib/ict/bias.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Single named Primary DOL (bullish->high, bearish->low, compression->nearer, tie->high) per D-11"
    requirement: "ICT-05"
    verification:
      - kind: unit
        ref: "src/lib/ict/dol.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "ATR regime (Wilder 14 vs 20-bar average, 34-bar honest degrade) per D-12"
    requirement: "ICT-06"
    verification:
      - kind: unit
        ref: "src/lib/ict/regime.test.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "Rollover tripwire (strict 3xATR flag-and-continue plus quarterly proximity warning) per D-07"
    requirement: "ICT-07"
    verification:
      - kind: unit
        ref: "src/lib/ict/rollover.test.ts"
        status: pass
    human_judgment: false
duration: ~35 min
completed: 2026-09-05
status: complete
---

# Phase 01 Plan 02: ICT Math Core Summary

**Complete deterministic Module 2 math core: EQ/quadrant/OTE levels, close-only re-anchor table, rationale-bearing bias, single named Primary DOL, Wilder-ATR regime, and 3xATR rollover tripwire — 43/43 tests green.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-05T12:55:52Z
- **Completed:** 2026-09-05T13:30:00Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Levels math per D-13: EQ half-sum, Q1/Q3 quarter fractions, bull pocket down from high and bear mirror up from low at 0.62-0.79, position 1.0/0.0 at extremes with zero-width 0.5 guard
- Full D-06 re-anchor rule table: strict close-beyond retires and re-anchors, wick pierce ignored, equality no-retire, repeat evaluation identical, forming rows excluded
- Bias per D-09/D-10: top-down thin-history then 0.48-0.52 buffer then discount-BULLISH/premium-BEARISH, mandatory English ASCII rationale naming regime on every path
- Primary DOL per D-11: bullish to Range High / PDH, bearish to Range Low / PDL, compression to nearer extreme with equidistant tie to high, explicit error on empty range
- ATR regime per D-12: Wilder smoothing period 14 vs 20-bar average, 34-bar honest degrade to compression, strict-greater expansion, oldest-to-newest single-contribution ordering
- Rollover tripwire per D-07: strict greater-than 3xATR flag-and-continue with anchors untouched, quarterly third-Friday proximity warning, stateless parallel evaluations

## Task Commits

Each task was committed atomically:

1. **Task 1: Levels math plus re-anchor rule table** - `ac203e1` (feat)
2. **Task 2: Bias with rationale plus single named Primary DOL** - `97ac5e0` (feat)
3. **Task 3: ATR regime plus rollover tripwire** - `02368fc` (feat)

## Files Created/Modified

- `src/lib/ict/levels.ts` - computeLevels: EQ, Q1/Q3, bull/bear OTE pockets, position
- `src/lib/ict/levels.test.ts` - EQ formula, quadrant fractions, OTE pockets, 1.0/0.0 boundaries, zero-width guard
- `src/lib/ict/range.test.ts` - D-06 table: strict retire, wick ignored, equality no-retire, idempotent, forming excluded
- `src/lib/ict/bias.ts` - ANCHOR_WINDOW re-export plus computeBias top-down rules with mandatory rationale
- `src/lib/ict/bias.test.ts` - All four table rows, zero-candle degrade, ASCII/identical-output checks
- `src/lib/ict/dol.ts` - computePrimaryDOL plus DOL_HIGH_NAME/DOL_LOW_NAME constants
- `src/lib/ict/dol.test.ts` - All three mappings, tie-break, exact prices, name spellings, empty-input error
- `src/lib/ict/regime.ts` - ATR_PERIOD/REGIME_AVG_WINDOW/MIN_CANDLES_FULL plus computeATR/computeRegime
- `src/lib/ict/regime.test.ts` - Thin degrade, expansion, compression, chronological stability, closeTo checks
- `src/lib/ict/rollover.ts` - ROLLOVER_ATR_MULT plus detectRollover with proximity warning
- `src/lib/ict/rollover.test.ts` - Synthetic 250-point gap tripwire, equality no-flag, flag-and-continue, proximity presence

## Decisions Made

- bias.ts re-exports ANCHOR_WINDOW from range.ts so the thin-history threshold has a single source of truth.
- DOL name constants exported for exact-spelling reuse by Phase 2 selectors.
- computeATR exported alongside computeRegime for direct reuse by 01-03 and Phase 2.
- Rollover proximity uses quarterly third-Friday Mar/Jun/Sep/Dec within 10 calendar days from the injected asOf string, no wall-clock reads.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Vitest reporter output contains ANSI escape sequences that garble direct Bash output rendering on this shell; worked around by piping through `tr -d` control-char stripping and grepping for summary lines. All suites reported clean pass counts; no code impact.
- `npx vitest` and `--reporter=basic` invocations misbehaved in this environment; `node node_modules/vitest/vitest.mjs run` with the default reporter worked reliably. No code impact.

## Verification

- `levels.test.ts` + `range.test.ts`: 11/11 passed
- `bias.test.ts` + `dol.test.ts`: 13/13 passed
- `regime.test.ts` + `rollover.test.ts`: 13/13 passed
- Full suite `vitest run`: 7 files, 43/43 tests passed (includes 01-01 tracer suite, still green)
- `tsc --noEmit`: zero errors in src/lib/ict (remaining errors, if any, are pre-existing untracked scaffold files untouched by this plan)
- Purity spot check: zero hits for Date.now/new Date()/Intl/store tokens in ict sources excluding tests

## Known Stubs

None - stub scan over all plan files returned zero TODO/FIXME/placeholder markers. No hardcoded empty values flow to any UI; all outputs derive from injected candle/range inputs.

## Threat Flags

None - new surface matches the plan threat model exactly: close-only re-anchor plus forming exclusion plus zero-width guard (T-02-01), strict 3xATR flag-and-continue with no adjusted-price parsing (T-02-02), deterministic English rationale traces with no payload echo (T-02-03, accepted). No package installs (T-02-SC).

## Requirements

- ICT-02 (levels): boundary positions 1.0/0.0 exact, closeTo precision on quadrants/OTE
- ICT-03 (re-anchor): close-only retire, equality no-retire, idempotent repeat, stateless concurrency by pure-function construction
- ICT-04 (bias): zero-candle COMPRESSION degrade, ASCII rationale naming regime, identical repeat output
- ICT-05 (DOL): equidistant tie to high, empty-input error, exact PDH/PDL spellings, exact extreme prices
- ICT-06 (regime): sub-34 degrade, equality to compression, chronological ordering, closeTo ATR precision
- ICT-07 (rollover): equality no-flag, multiplier exactly 3, stateless parallel evaluations

## Next Phase Readiness

Ready for 01-03 (proxy resilience: failover, backoff, singleflight, stale-serve plus time-util DST completion). Math core exports are stable for Phase 2 selector consumption. No blockers.

## Self-Check: PASSED

- All 11 created files exist on disk
- All 3 task commits exist in git log (ac203e1, 97ac5e0, 02368fc)
- Full suite green after final task commit; typecheck and purity checks clean

---
*Phase: 01-data-foundation-ict-core*
*Completed: 2026-09-05*
