---
phase: 07-smt-4h-1h-sequencing-math
plan: 02
subsystem: ict-math
tags: [fvg, erl-irl, delivery-cycle, vitest, pure-functions]

# Dependency graph
requires:
  - phase: 06-dual-symbol-proxy-data-contracts
    provides: [closedOnly discipline, Candle contract, rollover test builder style]
provides:
  - FVG map (both polarities, close-through mitigation, latest-20 bound) in src/lib/ict/fvg.ts
  - Sweep-then-reject ERL/IRL transition state plus deterministic §2 delivery sentence builder
affects: [phase-08-selectors, phase-09-report-sections, STRUCT-03-quality-grading]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 12000
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: [house pure-function template with closedOnly first line and fail-fast finite guards, builder-style vitest fixtures with Partial Candle overrides]

key-files:
  created: [src/lib/ict/fvg.ts, src/lib/ict/fvg.test.ts]
  modified: []

key-decisions:
  - "Sweep-alone negative pinned at the transition layer: a pierce-without-close-back returns null while leaving the input gap untouched, since close-through fill belongs to applyMitigation"
  - "detectTransition evaluates candles after each gap origin in origin-date order with an asOf ceiling so Phase 9 selectors get deterministic point-in-time state"

patterns-established:
  - "FVG 3-candle scan: bullish gap when low[i+1] strictly exceeds high[i-1], bearish mirror, boundary equality skipped as a touch"
  - "Delivery sentence: ERL branch for null transition, IRL branch carrying polarity, origin bounds, and trigger date in neutral trap-vs-genuine wording"

requirements-completed: [ICT-10]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "FVG map detects both polarities with exact zones, fills on close-through, stays bounded to latest 20"
    requirement: "ICT-10"
    verification:
      - kind: unit
        ref: "src/lib/ict/fvg.test.ts#fvg: bullish polarity / bearish polarity / close-through mitigation / map bound"
        status: pass
    human_judgment: false
  - id: D2
    description: "Sweep-then-reject flips ERL to IRL with origin bounds and trigger date; sweep alone flips nothing"
    requirement: "ICT-10"
    verification:
      - kind: unit
        ref: "src/lib/ict/fvg.test.ts#fvg: sweep-then-reject transition"
        status: pass
    human_judgment: false
  - id: D3
    description: "describeDeliveryTransition returns deterministic IRL-aware delivery sentence for the §2 upgrade"
    requirement: "ICT-10"
    verification:
      - kind: unit
        ref: "src/lib/ict/fvg.test.ts#fvg: delivery sentence"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-09-07
status: complete
---

# Phase 07 Plan 02: FVG Map plus ERL/IRL Transition Summary

**NQ D1 FVG inventory with close-through mitigation and a 20-gap bound, sweep-then-reject ERL/IRL flip, and a deterministic §2 delivery-sentence builder — all pure, all pinned by 16 vitest cases**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-07T10:35:00Z
- **Completed:** 2026-09-07T10:47:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- FVG map finds both polarities on NQ D1 with exact zones, fills only on close-through, caps at the latest 20 gaps
- Transitions fire only on same-candle wick-pierce plus close-back; sweep alone returns null and mutates nothing
- `describeDeliveryTransition` returns the IRL-aware delivery sentence from transition state with no new report section

## Task Commits

Each task was committed atomically:

1. **Task 1: FVG map core** - `d6567ee` (feat)
2. **Task 2: Sweep-then-reject transition plus delivery-sentence builder** - `b293453` (feat)

## Files Created/Modified
- `src/lib/ict/fvg.ts` - FVG_MAP_BOUND, FvgPolarity/FvgGap/TransitionState types, detectFVGs, applyMitigation, detectTransition, describeDeliveryTransition
- `src/lib/ict/fvg.test.ts` - Builder helpers plus polarity, mitigation, bound, sweep-vs-reject, sentence cases (16 tests)

## Decisions Made
- Sweep-alone negative pinned at the transition layer (null + untouched gap) rather than through applyMitigation, because a bullish sweep-alone candle is simultaneously a close-through fill — the two layers have distinct contracts and the plan prohibition governs state flips, not fill.
- detectTransition sorts gaps by originDate and honors an asOf ceiling so later Phase 9 selectors can query deterministic point-in-time state.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Transition test helper echoed the gap top instead of the real bottom**
- **Found during:** Task 2 (Sweep-then-reject transition plus delivery-sentence builder)
- **Issue:** The `bullishTriple` helper returned `bottom: prev.high + 10` (the constructed next-low) while `detectFVGs` records `bottom = prev.high`; the trigger wick never pierced the real bottom, so two tests failed with null transitions.
- **Fix:** Helper now returns `bottom: prev.high`; no source change — the implementation was correct.
- **Files modified:** src/lib/ict/fvg.test.ts
- **Verification:** `npm test -- src/lib/ict/fvg.test.ts` progressed from 14/16 to the next failure mode, then green.
- **Committed in:** b293453 (part of task commit)

**2. [Rule 1 - Bug] Sweep-alone negative asserted the wrong layer's contract**
- **Found during:** Task 2 (Sweep-then-reject transition plus delivery-sentence builder)
- **Issue:** The negative case asserted `applyMitigation` keeps the gap after a pierce-without-close-back, but a bullish sweep-alone candle closes below the gap bottom — a legitimate D-09 close-through fill — so the map correctly dropped to 0.
- **Fix:** Negative now asserts `detectTransition` returns null and the input gap object stays unmitigated, pinning the plan prohibition (no state flip, gap untouched by the transition layer).
- **Files modified:** src/lib/ict/fvg.test.ts
- **Verification:** `npm test -- src/lib/ict/fvg.test.ts` 16/16 green.
- **Committed in:** b293453 (part of task commit)

---

**Total deviations:** 2 auto-fixed (2 test-correctness bugs, 0 source changes)
**Impact on plan:** Both fixes were test-side; implementation matched the plan throughout. No scope creep.

## Issues Encountered
- Bare `npm test` timed out in the harness (15s tool ceiling); every suite passes when run in batches — 8 ict files (59 tests), report/store (22), remaining lib batches (45 + 48). No code failure; runner/reporter environment limitation only.

## Threat Flags

None — the plan's threat register (T-07-01 finite-OHLC boundary guards + fail-fast throws, T-07-03 20-gap bound) is implemented as specified; no new network, auth, or trust-boundary surface was added.

## Known Stubs

None — no hardcoded empty values, placeholder text, or unwired components in the shipped files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `src/lib/ict/fvg.ts` exports are ready for Phase 8 selectors (point-in-time `detectTransition(gaps, candles, asOf)` needs no changes) and the Phase 9 §2 prose wire-up (`describeDeliveryTransition` output shape is final).
- No blockers. Plan 01 (SMT) and Plan 03 (aggregate) touch disjoint files; no merge concerns beyond the shared `src/lib/ict` directory.

## Self-Check: PASSED

- `src/lib/ict/fvg.ts` FOUND, `src/lib/ict/fvg.test.ts` FOUND
- Commits `d6567ee` and `b293453` verified in `git log`

---
*Phase: 07-smt-4h-1h-sequencing-math*
*Completed: 2026-09-07*
