---
phase: 19-pools-math
plan: '02'
subsystem: ict-math
tags: [pools, equality-bonus, sweep-lifecycle, atr-merge, inventory-cap, dol-scorer, calibration-provisional]

# Dependency graph
requires:
  - phase: 19-pools-math-plan-01
    provides: Thin pools.ts pipeline (seed/lifecycle/scorer/cap skeletons) plus shared swings.ts k=2 contract plus withinTolerance/bpsGap helpers
provides:
  - Equality clustering with EQUAL_BONUS_STEPS diminishing curve (POOL-02, D-01..D-05)
  - First-sweep-wins lifecycle with no re-promotion (POOL-04, D-18)
  - ATR merge plus trailing-20 cap plus full proximity-x-DOL scorer with provisional constants (POOL-03 remainder, POOL-05, D-13..D-16/D-06..D-09/D-20)
  - Full pools.test.ts POOL-02..05 boundary matrix (30 tests), green with smt/purity
affects: [19-pools-math-plan-03, 20-pools-report, 21-calibration]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 9950
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns: [equality-bonus-via-cumulative-steps, sweep-then-reject-stays-swept, merge-before-cap-map-plane-order, refuse-to-rank-on-zero-atr]

key-files:
  created: []
  modified: [src/lib/ict/pools.ts, src/lib/ict/pools.test.ts]

key-decisions:
  - "Fixture fix over production reorder for the red cap test — converging-triangle seed keeps 22 ACTIVE; lifecycle->merge->cap order stands per D-18/D-16"
  - "Lifecycle never edits weight — SWEPT keeps full bonus per D-04, reduced presence flows through scorer eligibility only"
  - "Zero-or-empty ATR refuses to rank with originDate order and zero scores — never NaN/Infinity per T-19-01"

patterns-established:
  - "Diminishing bonus curve: cumulative EQUAL_BONUS_STEPS (3.0/2.0/1.0/0.5) sum, increments strictly shrink"
  - "First-sweep-wins: strict inequalities for pierce/consume, equality touch never flips, no re-promotion"
  - "Map-plane before view-plane: lifecycle->merge->cap->rank, cap sorts by originDate before slice(-20)"

requirements-completed: [POOL-02, POOL-03, POOL-04, POOL-05]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Equality clustering with diminishing bonus — cluster/split, 25bps pin, min-2-touches, triple dominance, swept-keeps-bonus"
    requirement: "POOL-02"
    verification:
      - kind: unit
        ref: "src/lib/ict/pools.test.ts#pools equality clustering: POOL-02 matrix"
        status: pass
    human_judgment: false
  - id: D2
    description: "Sweep lifecycle first-sweep-wins — pierce-to-SWEPT, close-through-to-CONSUMED, no-flip on touch, no re-promotion, stale-keep, asOf cutoff"
    requirement: "POOL-04"
    verification:
      - kind: unit
        ref: "src/lib/ict/pools.test.ts#pools sweep lifecycle: POOL-04 first-sweep-wins matrix"
        status: pass
    human_judgment: false
  - id: D3
    description: "ATR merge plus trailing-20 cap plus full scorer — merge/no-merge, empty-ATR skip, newest-20 unsorted, DOL boost 2.0, behind 0.25, scale invariance, zero-ATR refuse"
    requirement: "POOL-03"
    verification:
      - kind: unit
        ref: "src/lib/ict/pools.test.ts#pools merge plus cap plus scorer: POOL-03/POOL-05 matrix"
        status: pass
    human_judgment: false
  - id: D4
    description: "Rank-1 is nearest ACTIVE pool on the DOL side scored in ATR units with exported provisional constants"
    requirement: "POOL-05"
    verification:
      - kind: unit
        ref: "src/lib/ict/pools.test.ts#Rank-1 equals the nearest ACTIVE pool on the DOL side"
        status: pass
    human_judgment: false

# Metrics
duration: 60min
completed: 2026-09-16
status: complete
---

# Phase 19 Plan 02: Pools Math Matrix Summary

**Equality bonus curve, first-sweep-wins lifecycle, ATR-merge plus trailing-20 cap, and proximity-x-DOL scorer fully pinned by 30 boundary tests — pools/smt/purity 49/49 green.**

## Performance

- **Duration:** 60 min (3 pre-existing task commits found in history; completion pass: red-cap-test diagnosis plus fixture fix plus SUMMARY)
- **Started:** 2026-09-16T11:10:00Z (earliest 19-02 task commit)
- **Completed:** 2026-09-16T12:06:00Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Equality clustering (POOL-02, D-01..D-05): same-side swings within EQUAL_TOL_BPS=25 (TOL_EPS_BPS=1e-9 idiom) fuse; weight = touches + cumulative EQUAL_BONUS_STEPS=[3.0,2.0,1.0,0.5]; swept pools keep full bonus per D-04
- Sweep lifecycle (POOL-04, D-18): wick-pierce to SWEPT, close-through to CONSUMED, equality touch no-flip, first-sweep-wins, no re-promotion, stale-origin keep, asOf cutoff
- ATR merge plus trailing cap plus scorer (POOL-03/POOL-05, D-13..D-16/D-06..D-09/D-20): MERGE_ATR_MULT=0.25, POOL_MAP_BOUND=20, DOL_BOOST=2.0, BEHIND_PENALTY=0.25, zero-ATR refuse-to-rank; all CALIBRATION-PROVISIONAL and exported
- Full matrix: 30 pools tests plus smt plus purity green (49/49), store 46/46, tsc clean

## Task Commits

Each task was committed atomically (three found pre-existing in branch history, verified present; one completion fix committed this pass):

1. **Task 1: Equality clustering with strong diminishing bonus** - `eb3af59` (feat)
2. **Task 2: Full sweep lifecycle first-sweep-wins** - `2955c5b` (feat)
3. **Task 3: ATR merge plus trailing cap plus full scorer ordering** - `bb8a3a7` (feat)
4. **Completion fix: converging-triangle cap fixture (red-test repair)** - `85774f2` (fix)

**Plan metadata:** pending (docs: complete plan — committed below with SUMMARY)

**Measured:** 4 commits in the 19-02 scope listed above. Plan-scoped diff (pools.ts + pools.test.ts vs main): 907 insertions, ~9950 estimateTokens (chars/4).

## Files Created/Modified

- `src/lib/ict/pools.ts` - Equality clusterer, bonus curve, hardened lifecycle, ATR merge, cap, full scorer with provisional constants (Tasks 1-3, pre-existing)
- `src/lib/ict/pools.test.ts` - POOL-02/04/03-05 boundary matrix incl. converging-triangle cap fixture plus reversed-input pin (Tasks 1-3, pre-existing; fixture repaired in 85774f2)

## Decisions Made

- Fixture fix over production reorder for the red cap test: the `known_red_test` suggested reordering cap before lifecycle, but D-18 (CONSUMED leaves the map) plus D-16 (cap is map-plane newest-wins) plus the lifecycle->merge->cap order already in code are the plan intent — the bug was fixture geometry (ascending extremes inflated ATR ~800 so the merge fused everything pre-cap). Rebuilt the seed as a converging triangle toward a pinned 20000 close rail; production order untouched, D-04/D-06 intact.
- Lifecycle never edits weight: swept-keeps-bonus is expressed via scorer eligibility only (D-04/D-06), never by touching the weight field.
- Zero-or-empty ATR refuses to rank with originDate order and all-zero finite scores plus rankSkipped — never NaN/Infinity (T-19-01).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Red cap test: converging-triangle fixture replaces ascending-peak layout**
- **Found during:** Completion pass (Task 3 verification — 1 failure: `inventory over 20 keeps the newest 20`, expected 20 got 2)
- **Issue:** The 22-seed fixture used ascending peaks (20750->22250) and descending troughs, inflating late-window TR and ATR (~800). The 0.25x ATR merge radius (~200) swallowed the 150/100 inter-pool gaps, fusing 22 seeded pools into 2 before the cap ever ran. First fix attempt (70-step converging triangle) still failed a swing-strictness assertion (baseline 19960 rail broke trough strictness). Second revision (150-step triangle: peaks 21650->20150, troughs 18350->19850, flat 20020/19980 rails, pinned 20000 closes) passes all pins.
- **Fix:** Test-only change; production order lifecycle->merge->cap stands. All 22 seeds stay ACTIVE (nothing consumed, nothing swept, nothing merged); cap keeps newest 20. Added a reversed-input pin proving sort-before-slice.
- **Files modified:** src/lib/ict/pools.test.ts
- **Verification:** `npm test -- src/lib/ict/pools.test.ts src/lib/ict/smt.test.ts src/lib/ict/purity.test.ts` 49/49 green; store 46/46; tsc clean
- **Committed in:** 85774f2 (fix, this pass)

---

**Total deviations:** 1 auto-fixed (1 bug — test fixture only, zero production change)
**Impact on plan:** No scope change. All must-have truths hold; provisional constants untouched (no tuning per D-22).

## Issues Encountered

- PowerShell runner has no `tail` alias target used in plan verify snippets — used `Select-Object -Last N` instead. No plan impact.
- Branch history interleaves 19-02 and 19-03 commits (parallel waves sharing `gsd/phase-19-pools-math`); 19-02 task commits verified individually by hash and message rather than by linear range. No plan impact.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: division-guard | src/lib/ict/pools.ts | Scorer divides by ATR — mitigated per T-19-01: explicit zero/empty-ATR refuse-to-rank branch, finite-OHLC entry filter, NaN-free comparator; pinned by zero-ATR and scale-invariance tests in this plan |
| threat_flag: bonus-dominance | src/lib/ict/pools.ts | Equality bonus could build mega-pools — mitigated per T-19-03: diminishing EQUAL_BONUS_STEPS (3.0/2.0/1.0/0.5) with strictly-shrinking increments pinned by test |

Omitted: T-19-SC (npm installs) — no new packages installed in this plan.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 19-03 (selector hardening) — scorer output contract `{ pools, scores, rankSkipped }` plus RankedPools shape is stable; CONSUMED-leaves-map and SWEPT-rides-along semantics are pinned
- Ready for Phase 20 (pools report) — provisional constants exported with CALIBRATION-PROVISIONAL comments; zero tuning done here per D-22; Phase 21 calibrates against the firing log
- No blockers; purity guard green; trigger/invalidation/ticket signatures untouched (D-17)

---
*Phase: 19-pools-math*
*Completed: 2026-09-16*

## Self-Check: PASSED
