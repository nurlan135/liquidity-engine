---
phase: 22-pool-lifecycle-decay-pool2-04
plan: '01'
subsystem: pools-scorer
tags: [pools, decay, scorer, vitest, purity]

requires:
  - phase: 19-pools-math
    provides: scoreAndRank scorer formula plus ACTIVE-only eligibility plus locked constants
  - phase: 21-execution-polish
    provides: parity harness idiom proving pools-on vs pools-off triple match
provides:
  - DECAY_HALF_LIFE_BARS=10 and DECAY_SCORE_FLOOR=0.25 provisional constants in pools.ts
  - Pure poolAgeBars and poolDecay helpers over injected asOf string compare
  - scoreAndRank asOf threading with decayFactor ledger field and one formula multiplier
  - 11-test pool decay boundary block pinning fresh half-life floor monotonicity
affects: [22-02-parity-gate, 22-03-sandbox, 23-tp2-resolver]

actuals:
  tokens: 4561
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns: ["scorer-plane multiplier beside dolBoost and behindPenalty", "D1-bar age via closed-window string compare", "CALIBRATION-PROVISIONAL plus boundary pins plus firing-log review"]

key-files:
  created: []
  modified: [src/lib/ict/pools.ts, src/lib/ict/pools.test.ts]

key-decisions:
  - "Age upper bound is the caller-threaded asOf, not the last closed date — scoreAndRank ages over the same closed array the lifecycle ran over (D-20 purity)"
  - "Fresh-peak geometry uses a 49.5 bps gap so the SWEPT-ghost test seeds a truly independent cluster (within-tolerance peaks merge by design)"
  - "16-bar fixture age (16) stays below the floor age — floor pinned at unit level, 60-bar floor-assert lives in Plan 02 if needed"

patterns-established:
  - "poolAgeBars: closed.filter(c => c.date > originDate && c.date <= asOf).length — weekend-proof D1-bar age"
  - "poolDecay: Math.max(1 / (1 + ageBars / DECAY_HALF_LIFE_BARS), DECAY_SCORE_FLOOR)"

requirements-completed: [POOL2-04]

coverage:
  - id: D1
    description: "Decay core in pools.ts — two provisional constants, two pure helpers, decayFactor ledger field, one formula multiplier, asOf threading"
    requirement: "POOL2-04"
    verification:
      - kind: unit
        ref: "src/lib/ict/pools.test.ts#pool decay"
        status: pass
    human_judgment: false
  - id: D2
    description: "Decay boundary pins — locked constants plus fresh half-life floor monotonicity ancient-strength fresh-seed age-counting properties"
    requirement: "POOL2-04"
    verification:
      - kind: unit
        ref: "src/lib/ict/pools.test.ts#pool decay"
        status: pass
    human_judgment: false
  - id: D3
    description: "No-regression proof — full suite green, purity guard clean, parity harness untouched and passing"
    requirement: "POOL2-04"
    verification:
      - kind: unit
        ref: "npm test (42 files, 524 tests)"
        status: pass
    human_judgment: false

duration: 13min
completed: 2026-10-26
status: complete
---

# Phase 22 Plan 01: Decay Scorer Core Summary

**Scorer-plane decay core landed: two provisional constants, two pure age helpers, one formula multiplier with decayFactor ledger, asOf threaded end-to-end, 11-test boundary block green with the full 524-test suite passing.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-10-26T09:44:10Z
- **Completed:** 2026-10-26T09:57:48Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- DECAY_HALF_LIFE_BARS=10 and DECAY_SCORE_FLOOR=0.25 exported as CALIBRATION-PROVISIONAL with the house comment shape (never tuned to pass tests)
- Pure poolAgeBars (D1-bar count via string compare, unknown origins neutral at 0) and poolDecay (max of hyperbolic decay and floor) with zero new imports
- Score formula extended by exactly one multiplier (weight x dolBoost x behindPenalty x decayFactor / (1 + distAtr)) with decayFactor in the PoolScore ledger and 1.0-neutral zeroScores on every refuse path
- scoreAndRank accepts asOf and threads it from evaluatePools; six test call sites updated; stored weight/touches stay read-only outside seedPools and mergePools
- Boundary block holds 11 tests: age-0 ledger pin, fresh-outscores-aged-self, half-life 0.5 at age 10, floor at 60+, monotonicity, ancient ACTIVE stays positive, fresh-seed independence (consumed-price plus SWEPT-ghost), floor-bounds-zero, unknown-origin neutrality, age-counting rules

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end decay slice** - `0893991` (feat)
2. **Task 2: Thread asOf with refuse-to-rank neutrality** - `2b426e3` (feat)
3. **Task 3: Lock decay boundary pins** - `fb7b4d9` (test)

**Plan metadata:** pending (docs commit below)

## Files Created/Modified

- `src/lib/ict/pools.ts` - Decay constants, poolAgeBars/poolDecay helpers, PoolScore.decayFactor, scoreAndRank asOf param plus multiplier, evaluatePools threading
- `src/lib/ict/pools.test.ts` - Locked-constants pins plus 11-test describe pool decay block

## Decisions Made

- Age upper bound is the caller-threaded asOf, not the last closed date — scoreAndRank ages over the same closed array the lifecycle ran over (D-20 purity, T-22-01 mitigation).
- Fresh-peak geometry uses a 49.5 bps gap so the SWEPT-ghost test seeds a truly independent cluster; a within-tolerance peak joins the cluster by design (tolerance clustering is the non-overlap decision).
- 16-bar fixture age (16) stays below the floor age, so the floor is pinned at unit level (poolDecay(60)=0.25) rather than through a pipeline fixture; the ancient-ACTIVE pipeline test pins decay(16) above floor with positive finite score.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tracer fresh-pin used unreachable age-0 geometry**
- **Found during:** Task 1 (tracer test first run)
- **Issue:** No real pipeline pool can have age 0 — a k=2 swing needs right-side neighbors, so the freshest origin sits ≥2 bars before the window end; the reduce-for-max-decayFactor assertion found 0.875, not 1.0.
- **Fix:** Pinned the age-0 ledger entry with a synthetic pool on the last closed date instead of pipeline output; kept the fresh-outscores-aged-self ordering test on real pipeline pools.
- **Files modified:** src/lib/ict/pools.test.ts
- **Verification:** pools.test.ts 32/32 green, tsc clean.
- **Committed in:** 0893991 (Task 1 commit)

**2. [Rule 1 - Bug] Two boundary tests asserted unreachable fixture states**
- **Found during:** Task 3 (boundary block first run)
- **Issue:** (a) Ancient-ACTIVE test expected floor factor through a 16-bar fixture, but age 16 yields decay 0.38, not 0.25. (b) SWEPT-ghost test expected rankSkipped false on a 12-bar leg, but computeATR needs period+1 bars (13+) so the scorer refused to rank.
- **Fix:** (a) Asserted decay(16) above floor with positive finite score; floor itself stays unit-pinned. (b) Grew the ghost leg to 16 bars with a 49.5 bps fresh peak (also fixing accidental within-tolerance clustering of the 20206 peak into the 20200 ghost).
- **Files modified:** src/lib/ict/pools.test.ts
- **Verification:** pools.test.ts 41/41 green, tsc clean.
- **Committed in:** fb7b4d9 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (both test-geometry bugs, zero implementation changes)
**Impact on plan:** Both fixes keep the plan's math untouched; the scorer implementation from Task 1 passed every iteration unchanged. No scope creep.

## Issues Encountered

None beyond the two auto-fixed test-geometry bugs above. No auth gates, no Rule 4 escalations, no pre-existing failures touched (full suite 524/524 at close).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 22-02 (parity gate): decay core is scorer-plane-only with stored inventory untouched; pools-parity.test.ts and purity.test.ts pass unmodified (8/8).
- Phase 23 TP2 resolver will read the locked decayed rank via evaluatePools with asOf threading already in place.
- Watch item for 22-02: stored weight/touches byte-identity plus double-run determinism pins (flagged assumptions from the plan) remain to be proven there, not here.

## Threat Flags

None - no new network endpoints, auth paths, file access, or schema changes. Decay output flows into the already-reviewed rank-consumer path (T-22-01 mitigated via pure helpers with no clock reads or store imports; T-22-SC not applicable — zero new packages).

## Self-Check

Key files verified present; acceptance criteria re-checked (constants 10/0.25, PoolScore.decayFactor present, asOf in scoreAndRank signature plus 6 test call sites, decay block 11 tests with zero Rank-1-flip assertions, zero-ATR rankSkipped pin intact); full suite 524/524 and gates 8/8 green on final tree.

## Self-Check: PASSED

---
*Phase: 22-pool-lifecycle-decay-pool2-04*
*Completed: 2026-10-26*
