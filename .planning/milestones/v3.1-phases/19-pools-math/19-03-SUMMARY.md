---
phase: 19-pools-math
plan: '03'
subsystem: ict-math
tags: [pools, selectPools, swings, degrade-matrix, purity, zustand-selector]

# Dependency graph
requires:
  - phase: 19-pools-math-plan-01
    provides: Thin selectPools envelope plus shared swings.ts plus thin pools pipeline
provides:
  - Hardened selectPools degraded envelope (thin flag, finite-range probe, ES-stale independent)
  - POOL-06 refuse-null matrix in store.test.ts (stale/empty/thin/ES-stale/garbage/epoch)
  - Shared-swings regression pins in swings.test.ts (zero-behavior-change proof)
affects: [20-pools-report]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 6250
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: [degraded-flag-over-null-for-dim-signal, range-read-as-finiteness-probe, single-computeRange-read-for-thin-plus-finite]

key-files:
  created: [src/lib/ict/swings.test.ts]
  modified: [src/lib/store.ts, src/lib/store.test.ts]

key-decisions:
  - "Thin history yields a flagged result (degraded thin:true leg:nq), never null — Phase 20 dims on the flag per the selectTicket precedent"
  - "One computeRange read serves both thinHistory and the finite-range garbage probe — no second derivation, no torn read"
  - "swings.test.ts mirrors the smt.test.ts leg() shape for positives; smt.test.ts itself stays byte-unmodified as the zero-change gate"

patterns-established:
  - "Degrade envelope: refuse-null on stale/empty, degraded-flag on thin, independent on foreign-leg staleness"
  - "Shared-owner pins: constants plus strict edges plus k-throws plus boundaries live with the owner module"

requirements-completed: [POOL-01, POOL-06]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Hardened selectPools — stale/empty null, thin flagged, ES-stale live, garbage safe, single sharedEpoch"
    requirement: "POOL-06"
    verification:
      - kind: unit
        ref: "src/lib/store.test.ts#pools-matrix"
        status: pass
    human_judgment: false
  - id: D2
    description: "Shared-swings regression pins — constants, strict edges, k-throws, boundaries"
    requirement: "POOL-01"
    verification:
      - kind: unit
        ref: "src/lib/ict/swings.test.ts"
        status: pass
      - kind: unit
        ref: "src/lib/ict/smt.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Phase-exit suite proof — full npm test green with purity guard clean"
    requirement: "POOL-06"
    verification:
      - kind: unit
        ref: "npm test -- --maxWorkers=2 (40 files, 439 tests)"
        status: pass
      - kind: unit
        ref: "src/lib/ict/purity.test.ts"
        status: pass
    human_judgment: false

# Metrics
duration: 20min
completed: 2026-09-16
status: complete
---

# Phase 19 Plan 03: Guarded Delivery Hardening Summary

**selectPools degrades honestly on stale/empty/thin legs with a sharedEpoch time truth and a thin dim-flag, shared swings carry regression pins with smt green unmodified, and the full 439-test suite stays green at phase exit.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-16T06:56:00Z
- **Completed:** 2026-09-16T07:16:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Hardened selectPools degraded envelope: thin history returns ranked pools with `{ stale: false, thin: true, leg: 'nq' }`, stale/empty refuse null, ES-stale ignored, garbage probed finite, one sharedEpoch call, try/catch null, zero set calls
- POOL-06 matrix test (`pools-matrix`): healthy-clean, ES-stale-live, thin-flagged, stale-refusal with lastError, empty-null, garbage-null, back-to-back epoch identity — all not.toThrow
- Shared-swings regression pins: locked constants, one positive high/low each, strict equality edges, k-throws, boundary indices — smt.test.ts byte-unmodified and green
- Phase-exit proof: full suite 40 files / 439 tests green (`--maxWorkers=2`), tsc clean, eslint zero errors (2 pre-existing warnings)

## Task Commits

Each task was committed atomically:

1. **Task 1: selectPools hardened degrade envelope plus POOL-06 matrix** - `3fcb496` (feat)
2. **Task 2: Shared-swings regression pins plus phase-exit suite proof** - `6a211aa` (test)

**Plan metadata:** `pending` (docs: complete plan — committed below with SUMMARY)

**Measured (this plan only):** 2 commits (`3fcb496`, `6a211aa`). A sibling plan-02 commit (`eb3af59`) landed on the shared branch in parallel between them; `git rev-list --count 3616167..HEAD` reads 3 total on the branch, 2 owned by this plan.

## Files Created/Modified

- `src/lib/store.ts` - PoolsSelection gains `degraded` envelope; selectPools adds thin-flag path plus finite-range garbage probe via the same single computeRange read
- `src/lib/store.test.ts` - `pools-refusal` rewritten as the full `pools-matrix` POOL-06 case (7 assertions named above)
- `src/lib/ict/swings.test.ts` - New: 7 regression pins over the shared swing contract (constants/positives/edges/throws/boundaries)

## Decisions Made

- Thin history yields a flagged result instead of null — Phase 20 gets its dim signal via the selectTicket degraded precedent; T-19-02 mitigated, not just tested
- One computeRange read serves thinHistory and finiteness — a second derivation would risk torn reads on the same snapshot
- Garbage (NaN OHLC) refuses null through the range probe rather than a new row-validator — closedOnly cannot see NaN, and the range high/low go non-finite exactly when the rows are unusable
- swings.test.ts mirrors the smt.test.ts leg() shape for the two positive cases only; smt.test.ts itself is never touched so its green run is an independent zero-change witness

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Garbage candles returned a flagged object instead of null**
- **Found during:** Task 1 (POOL-06 matrix, garbage leg of `pools-matrix`)
- **Issue:** NaN-OHLC rows pass the `closedOnly length === 0` guard (they are rows, just unusable), so the first implementation fell through to `evaluatePools` and returned `{ pools: [], degraded: { thin: true } }` instead of the plan-mandated refuse-null
- **Fix:** Read `computeRange` once and refuse null when `high`/`low` are non-finite; the same read supplies `thinHistory` — single derivation, no torn read
- **Files modified:** src/lib/store.ts
- **Verification:** `pools-matrix` garbage leg green; store.test.ts 46/46
- **Committed in:** 3fcb496 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Garbage-can-never-render was an acceptance criterion (`fails_when: garbage input throws`) extended to refuse-null; no scope change, pure math untouched, no trigger/invalidation/ticket wiring.

## Issues Encountered

- Full-suite first attempt crashed a vitest worker on `time.test.ts` (exit 134, resource contention with the parallel sibling plan 19-02 run); `time.test.ts` passes in isolation (11/11) and the full suite passes with `--maxWorkers=2` (439/439). No plan impact — runner parallel-wave contention, not a code failure.
- An intermediate targeted 4-file run briefly showed 5 failures while sibling plan 19-02 files (`pools.ts`/`pools.test.ts`) were mid-edit and uncommitted on the shared branch; the rerun after the sibling commit was 37/37 green. Out of this plan's scope by the orchestrator SCOPE WARNING — noted, not touched.
- Pre-existing eslint warnings (`PAPER_EQUITY_USD` unused in store.ts, `asOf` unused in a trigger-cap test) predate this plan and were left untouched per scope boundary.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: honesty | src/lib/store.ts | New thin-flag path surfaces geometry as dimmable instead of null — mitigated per T-19-02: stale still refuses null with reason, thin is an explicit flag Phase 20 must dim on |
| threat_flag: render-crash | src/lib/store.ts | Garbage probe added inside the existing try/catch envelope — mitigated per T-19-04: every path still returns null, never throws |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for Phase 20 report §1 plus chart lines — `selectPools` returns one trusted `{ pools, asOf, epoch, degraded }` array; thin means dim, null means degraded, never a throw
- Swing contract is pinned at the owner with smt green as witness — Phase 21 calibrates against pins, never vibes
- No blockers; purity guard green; trigger/invalidation/ticket signatures untouched (D-17)

---
*Phase: 19-pools-math*
*Completed: 2026-09-16*

## Self-Check: PASSED
