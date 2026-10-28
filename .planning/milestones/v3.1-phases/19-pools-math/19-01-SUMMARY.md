---
phase: 19-pools-math
plan: '01'
subsystem: ict-math
tags: [pools, swings, bsl-ssl, zustand-selector, purity]

# Dependency graph
requires:
  - phase: 18-trigger-calibration
    provides: 420-test green suite plus sharedEpoch plus selectSMT guard precedent
provides:
  - Shared swings.ts (SWING_K/SWING_LOOKBACK/isSwingHigh/isSwingLow single owner)
  - Thin pools.ts pipeline (detectPools plus evaluatePools, BSL/SSL zones, lifecycle, scorer, cap-20)
  - Thin selectPools guarded envelope on the Zustand store
affects: [19-pools-math-plan-02, 19-pools-math-plan-03, 20-pools-report]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 6250
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: [shared-swing-truth-via-reexport, thin-pipeline-then-expand, selectSMT-guard-adapted-to-single-leg]

key-files:
  created: [src/lib/ict/swings.ts, src/lib/ict/pools.ts, src/lib/ict/pools.test.ts]
  modified: [src/lib/ict/smt.ts, src/lib/store.ts, src/lib/store.test.ts]

key-decisions:
  - "swings.ts owns the fractal contract; smt.ts re-exports (move, zero behavior change, smt.test.ts green as gate)"
  - "Thin weight is touches>=2 ? 3.0 : 1.0 deferred — seed is single-touch so weight 1.0; diminishing curve lands in Plan 02"
  - "selectPools guards the NQ D1 leg only; ES-stale never nulls pools"
  - "Zero-or-empty ATR refuses to rank (unscored ACTIVE order), never divides by zero"

patterns-established:
  - "Shared swing truth: one owner module plus re-export, never a forked fractal loop"
  - "selectPools envelope: selectSMT guard adapted to the owning leg, one sharedEpoch call, try/catch null"

requirements-completed: [POOL-01, POOL-03, POOL-06]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Shared swings extraction — one k=2 strict-fractal contract feeds SMT and pools"
    requirement: "POOL-01"
    verification:
      - kind: unit
        ref: "src/lib/ict/smt.test.ts"
        status: pass
      - kind: unit
        ref: "src/lib/ict/pools.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Thin pools pipeline — one BSL plus one SSL pool flows detected-to-ranked with exact shape literals"
    requirement: "POOL-03"
    verification:
      - kind: unit
        ref: "src/lib/ict/pools.test.ts"
        status: pass
      - kind: unit
        ref: "src/lib/ict/purity.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Thin selectPools — ranked PoolsSelection on healthy NQ leg, null on stale/empty, never throws"
    requirement: "POOL-06"
    verification:
      - kind: unit
        ref: "src/lib/store.test.ts#pools-refusal"
        status: pass
      - kind: unit
        ref: "src/lib/ict/pools.test.ts"
        status: pass
    human_judgment: false

# Metrics
duration: 45min
completed: 2026-09-16
status: complete
---

# Phase 19 Plan 01: Tracer Pools Slice Summary

**Thin BSL/SSL inventory flows NQ D1 candles through one shared k=2 swing contract into ranked zones behind a guarded selectPools — smt, purity, and full suite green.**

## Performance

- **Duration:** 45 min
- **Started:** 2026-09-16T06:30:00Z
- **Completed:** 2026-09-16T07:15:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Shared swings.ts extraction: SWING_K=2, SWING_LOOKBACK=60, isSwingHigh/isSwingLow moved verbatim; smt.ts re-exports with zero behavior change
- Thin pools.ts pipeline: detectPools plus evaluatePools with BSL/SSL zones, ACTIVE/SWEPT/CONSUMED lifecycle, proximity-x-DOL scorer, POOL_MAP_BOUND=20 cap
- Thin selectPools envelope on the store: null on stale/empty NQ leg, ES-stale independent, single sharedEpoch, never throws
- Full suite 425/425 green (baseline 420 plus 5 new), tsc clean, eslint zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Shared swings extraction + thin pools pipeline end-to-end** - `4e1be9f` (feat)
2. **Task 2: Thin selectPools guarded envelope in store** - `5c838bd` (feat)

**Plan metadata:** `pending` (docs: complete plan — committed below with SUMMARY)

**Measured:** 2 commits from plan_head_before `42f3962` (`git rev-list --count 42f3962..HEAD`), both listed above.

## Files Created/Modified

- `src/lib/ict/swings.ts` - Shared swing truth: SWING_K, SWING_LOOKBACK, isSwingHigh, isSwingLow (moved verbatim from smt.ts)
- `src/lib/ict/smt.ts` - Re-exports swings.ts; keeps SMT_TOL_BPS/CORR_WINDOW/CORR_MIN; logic untouched
- `src/lib/ict/pools.ts` - Thin detector plus lifecycle plus scorer plus rank plus cap; CALIBRATION-PROVISIONAL constants
- `src/lib/ict/pools.test.ts` - Constant pins plus one-BSL plus one-SSL origin tests plus evaluatePools rank test
- `src/lib/store.ts` - selectPools plus PoolsSelection plus LiquidityPool re-export
- `src/lib/store.test.ts` - pools-refusal matrix test (healthy/stale/empty/garbage)

## Decisions Made

- swings.ts owns the fractal contract; smt.ts re-exports (move, zero behavior change, smt.test.ts green as gate) — D-12 zero-drift requirement
- Thin weight stays 1.0 single-touch; the touches>=2 bonus plus diminishing curve lands in Plan 02 (D-05) — seed has no clusters yet
- selectPools guards the NQ D1 leg only; ES-stale never nulls pools — pools are D1-NQ geometry, ES confirms only
- Zero-or-empty ATR refuses to rank (unscored ACTIVE order), never divides by zero — T-19-01 mitigation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed orphan duplicate lines after withinTolerance edit**
- **Found during:** Task 1 (thin pools pipeline)
- **Issue:** A duplicated Edit left stray `return (Math.abs(a - b) / b) * 10000; }` plus a second `withinTolerance` body after line 74, failing esbuild transform (`Unexpected "}"`); tsc -p output was misread as clean on the first pass
- **Fix:** Deleted the orphan block; re-verified with vite transformWithEsbuild per file plus tsc plus the plan verify suite
- **Files modified:** src/lib/ict/pools.ts
- **Verification:** `npm test -- src/lib/ict/pools.test.ts src/lib/ict/smt.test.ts src/lib/ict/purity.test.ts` 23/23 green
- **Committed in:** 4e1be9f (Task 1 commit)

**2. [Rule 3 - Blocking] Restored bpsGap after orphan-block deletion removed its definition**
- **Found during:** Task 1 (thin pools pipeline)
- **Issue:** The orphan cleanup deleted the `bpsGap` definition itself, leaving `withinTolerance` referencing an unknown name (tsc TS2304)
- **Fix:** Re-added `bpsGap` above `withinTolerance`; exported `withinTolerance` for the Plan 02 clusterer (clears the unused lint warning)
- **Files modified:** src/lib/ict/pools.ts
- **Verification:** tsc clean, eslint zero errors, 23/23 green
- **Committed in:** 4e1be9f (Task 1 commit)

**3. [Rule 3 - Blocking] Re-added amdPhase/AmdOutput import clobbered by Task 2 edit**
- **Found during:** Task 2 (selectPools envelope)
- **Issue:** The pools import edit replaced the `amdPhase, AmdOutput` import line instead of inserting beside it (tsc TS2304/TS2552)
- **Fix:** Restored `import { amdPhase, type AmdOutput } from '@/src/lib/ict/amd';` on its own line; verified via git diff that the change is purely additive
- **Files modified:** src/lib/store.ts
- **Verification:** tsc clean, store tests 50/50 green
- **Committed in:** 5c838bd (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All three were edit-hygiene repairs inside the touched files; no scope change, no behavior change beyond the plan.

## Issues Encountered

- Vitest/esbuild surfaces only `Transform failed with 1 error` with no detail under this runner; diagnosed via `vite.transformWithEsbuild` per file through node, which gave the exact line (`pools.ts:76 Unexpected "}"`). No plan impact.
- `git log --grep='feat('` scope format in this repo is `feat(17-05):` / `test(18-03):`; task commits follow the `feat(19-01):` scope.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: division-guard | src/lib/ict/pools.ts | New scorer divides by ATR — mitigated per T-19-01: explicit zero/empty-ATR branch refuses to rank, finite-guards on OHLC, NaN-free sort pinned by thin tests |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 19-02 (equality weighting plus ATR-merge plus full lifecycle matrix) — `withinTolerance`/`bpsGap` helpers already exported for the clusterer
- Ready for 19-03 (selector hardening plus boundary pins) — `PoolsSelection` shape `{ pools, asOf, epoch }` is the thin contract; thin flag lands in Plan 03 per plan
- No blockers; purity guard green from the first commit; trigger/invalidation/ticket signatures untouched (D-17)

---
*Phase: 19-pools-math*
*Completed: 2026-09-16*

## Self-Check: PASSED
