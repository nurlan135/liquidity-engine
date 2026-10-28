---
phase: 19-pools-math
verified: 2026-09-16T12:15:00Z
status: passed
score: 6/6 must-haves verified
covered_files: [src/lib/ict/pools.ts, src/lib/ict/swings.ts, src/lib/ict/pools.test.ts, src/lib/ict/swings.test.ts, src/lib/store.ts, src/lib/store.test.ts]
covered_digest: "v1:sha256:b24a90b820edce44e77738c77ff35c49d702c22214272a7c5a897f2b8c2f260b"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 19: Pools Math Verification Report

**Phase Goal:** Ranked BSL/SSL stop-cluster inventory exists as pure, test-pinned math with a guarded selector
**Verified:** 2026-09-16T12:15:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POOL-01: BSL/SSL pools detected from D1 swing highs/lows via one shared k=2 strict-fractal contract (swings.ts single owner, smt re-exports, zero drift) | ✓ VERIFIED | swings.ts owns SWING_K=2, SWING_LOOKBACK=60, isSwingHigh/isSwingLow strict (`>=`/`<=` means no swing). smt.ts line 8 imports from ./swings, line 10 re-exports. pools.ts line 9 imports predicates from ./swings only — zero duplicated fractal logic. swings.test.ts 7 pins green; smt.test.ts green unmodified; targeted run 56/56 green |
| 2 | POOL-02: Equal highs/lows cluster into heavier pools with a strong but diminishing bonus, swept pools keep their bonus | ✓ VERIFIED | EQUAL_TOL_BPS=25 + TOL_EPS_BPS=1e-9 epsilon idiom (pools.ts:92-101); EQUAL_BONUS_STEPS=[3.0,2.0,1.0,0.5] exported with CALIBRATION-PROVISIONAL (line 35); poolWeight = touches + cumulative bonus (lines 123-128); lifecycle never edits weight (D-04 comment lines 121-122). pools.test.ts POOL-02 matrix (3bps cluster / 200bps split / boundary / min-2-touches / triple-dominance / diminishing / swept-keeps-bonus) green — 30 its total in file |
| 3 | POOL-03: Pools project as zones (side, top, bottom, touches, weight, originDate, status) with min-max spans, ATR-merge, trailing-20 cap newest-wins | ✓ VERIFIED | LiquidityPool exact shape lines 40-48. seedPools min-max span lines 188-200. mergePools MERGE_ATR_MULT=0.25 x ATR, more-extreme edge kept, touches summed, weight recomputed lines 257-293; empty/non-finite ATR skips merge (line 259). capPools originDate sort-before-slice(-20) lines 297-301. All constants exported + CALIBRATION-PROVISIONAL. Merge/cap matrix green in full suite |
| 4 | POOL-04: Sweep lifecycle ACTIVE/SWEPT/CONSUMED — wick-pierce=swept, close-through=consumed, first-sweep-wins, no re-promotion | ✓ VERIFIED | applyLifecycle lines 210-245: strict `>`/`<` pierce, close-through consumes with break (first-wins), `==` touch never flips, CONSUMED leaves map (line 241), stale origin kept+skipped (214-217), asOf cutoff (line 222). POOL-04 matrix (pierce/SWEPT, close/CONSUMED, touch-no-flip, sweep-then-reject, double-raid, retest-no-repromote, stale-keep, asOf-cutoff) green |
| 5 | POOL-05: Proximity x DOL-side scorer ranks pools — Rank-1 nearest ACTIVE on DOL side, 2.0 boost, 0.25 behind-penalty, zero-ATR refuse-to-rank | ✓ VERIFIED | scoreAndRank lines 327-397: score = weight x dolBoost x behindPenalty / (1+distAtr); DOL_BOOST=2.0, BEHIND_PENALTY=0.25 exported provisional; only ACTIVE rank-eligible, SWEPT rides along unscored (lines 363-366, 389-391); zero/empty/non-finite ATR returns originDate order + zero scores + rankSkipped (lines 348-358), never NaN. Scorer matrix (boost ratio, behind ratio, scale invariance, zero-ATR finite) green |
| 6 | POOL-06: selectPools guarded envelope — null on stale/empty NQ leg, thin flagged (not nulled), ES-stale independent, never throws, single sharedEpoch | ✓ VERIFIED | store.ts lines 846-866 read: nq.stale→null (848), closedOnly empty→null (850), single sharedEpoch (852), computeRange finiteness probe→null on NaN (856-857), evaluatePools derivation (858), thin→{stale:false,thin:true,leg:'nq'} flag (859-861), try/catch→null (863-865). Zero es.stale reads in selector (confirmed grep). store.test.ts pools-matrix covers healthy/ES-stale-live/thin-flagged/stale-refusal/empty/garbage/epoch-identity, all not.toThrow — 46/46 green |

**Score:** 6/6 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/ict/swings.ts` | Shared k=2 strict-fractal owner | ✓ VERIFIED | 44 lines, substantive: constants + both predicates + k-validation throws + boundary guards |
| `src/lib/ict/pools.ts` | Pure pools math (detect/lifecycle/merge/cap/scorer) | ✓ VERIFIED | 438 lines, substantive: all 7 constants exported provisional, LiquidityPool/PoolsOutput/PoolScore/RankedPools types, detectPools + evaluatePools + scoreAndRank + equalityBonus + poolWeight + withinTolerance |
| `src/lib/ict/pools.test.ts` | POOL-01..05 boundary matrix | ✓ VERIFIED | 30 its across 4 describes (tracer / equality / lifecycle / merge-cap-scorer); wired via direct imports from pools.ts |
| `src/lib/ict/swings.test.ts` | Shared-contract regression pins | ✓ VERIFIED | 7 its: constants, positives, strict edges, k-throws, boundaries; wired to ./swings |
| `src/lib/store.ts` (selectPools) | Guarded selector envelope | ✓ VERIFIED | Wired: imports evaluatePools (line 17), computeRange (line 6); single sharedEpoch; degraded envelope typed via PoolsSelection |
| `src/lib/store.test.ts` (pools-matrix) | POOL-06 degrade matrix | ✓ VERIFIED | 7-leg matrix lines 996-1082; wired to selectPools via getState() |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| swings.ts predicates | pools.ts detector | single import, zero duplicated fractal logic (D-12) | WIRED | pools.ts line 9 imports isSwingHigh/isSwingLow/SWING_K/SWING_LOOKBACK from ./swings; no local fractal loop |
| pools.ts evaluatePools | store.ts selectPools | same snapshot, one sharedEpoch call (D-21) | WIRED | store.ts:852 `const epoch = sharedEpoch(get)` exactly once; :858 `evaluatePools(nq.candles, asOfBaku)` on same NQ snapshot |
| lifecycle status | scorer eligibility | only ACTIVE ranks (D-06) | WIRED | scoreAndRank line 346 filters ACTIVE; SWEPT rides along unscored lines 391-394 |
| equality weight | scorer score | bonus flows into rank, swept keeps bonus (D-04) | WIRED | poolWeight via EQUAL_BONUS_STEPS at seed (line 196) and merge-recompute (line 279); lifecycle never touches weight |
| computeRange thinHistory | selectPools degraded flag | dim signal, not a null | WIRED | store.ts:856 single computeRange read serves finiteness probe + :859 thinHistory flag |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| pools.ts detectPools | window via windowCandles | closedOnly + finite-OHLC drop + chronological sort + slice(-60) of injected Candle[] | ✓ FLOWING | Real swing-seeded zones; empty-window `return []` (lines 406/425) is a legitimate degraded-empty guard, not a stub — full pipeline downstream is exercised by 30 tests |
| pools.ts evaluatePools | seeded→lived→merged→kept→ranked | seedPools + applyLifecycle + computeATR merge + capPools + scoreAndRank | ✓ FLOWING | End-to-end rank-ordered array; zero-ATR branch returns originDate order + rankSkipped, never static |
| store.ts selectPools | { pools, asOf, epoch, degraded } | evaluatePools(nq.candles, asOfBaku) + sharedEpoch(get) | ✓ FLOWING | Live NQ D1 leg; stale/empty/garbage refuse null (null = degraded, never silent []) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| pools+smt+swings+purity targeted | `npm test -- src/lib/ict/pools.test.ts src/lib/ict/swings.test.ts src/lib/ict/smt.test.ts src/lib/ict/purity.test.ts` | 4 files, 56 tests passed | ✓ PASS |
| POOL-06 selector matrix | `npm test -- src/lib/store.test.ts` | 46 tests passed | ✓ PASS |
| Full suite (phase-exit proof) | `npm test` | 40 files, 458 tests passed | ✓ PASS |
| Type safety | `npx tsc --noEmit` | clean, no output | ✓ PASS |

### Probe Execution

No probes declared for this phase (pure-math + selector, no migration/CLI surface). Skipped.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| POOL-01 | 19-01, 19-03 | BSL/SSL from D1 swings, shared swings.ts k=2 | ✓ SATISFIED | swings.ts + re-export + swings.test.ts + smt green; BSL/SSL origin tests green |
| POOL-02 | 19-02 | Equal highs/lows extra weight, provisional test-pinned | ✓ SATISFIED | EQUAL_BONUS_STEPS curve + full equality matrix green |
| POOL-03 | 19-01, 19-02 | Zones + trailing cap | ✓ SATISFIED | Exact shape literals + merge + cap-20 newest-wins green |
| POOL-04 | 19-02 | ACTIVE/SWEPT/CONSUMED lifecycle | ✓ SATISFIED | First-sweep-wins matrix green |
| POOL-05 | 19-02 | Proximity x DOL scorer | ✓ SATISFIED | Scorer ordering + constants exported + refuse-to-rank green |
| POOL-06 | 19-01, 19-03 | selectPools refuse-null + sharedEpoch + never-throws | ✓ SATISFIED | pools-matrix 7 legs green, 46/46 store tests |

Note: REQUIREMENTS.md checkboxes for POOL-01/POOL-06 still show `[ ]` and traceability shows Pending — that file was not updated by the executors, but the code evidence above satisfies both requirements. Recommend flipping POOL-01/POOL-06 to `[x]`/Complete as a docs touch-up (non-blocking).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | debt markers (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER) | — | None found across pools.ts, swings.ts, pools.test.ts, swings.test.ts, store.ts |
| pools.ts | 406, 425 | `return []` | ℹ️ Info | Legitimate empty-window degraded-empty guard, exercised by tests — not a stub |

Purity wall: pools.ts contains zero `IntradayCandle`/`killzone`/`Date.now`/`store`/`zustand` code references (only header comments stating the prohibition) — purity.test.ts 2/2 green confirms via self-scan. Trigger/invalidation modules contain zero `pools` references — no trigger/ticket disturbance per D-17 (note: `src/lib/ict/ticket.ts` does not exist as a module; ticket logic lives in store.ts, which was grepped for the pools wiring above and shows only the additive selectPools surface).

### Human Verification Required

None. All phase truths are pure-function math plus a selector envelope, fully covered by deterministic unit tests. No visual appearance, user flow, real-time behavior, or external service integration in scope.

### Gaps Summary

No gaps. The phase goal is achieved in the codebase: a ranked BSL/SSL stop-cluster inventory exists as pure test-pinned math (pools.ts, 438 lines, 7 exported provisional constants, 30 boundary tests) behind a guarded selector (selectPools with stale/empty refuse-null, thin dim-flag, ES-stale independence, single sharedEpoch, never-throws). Full suite 458/458 green, tsc clean, purity guard clean, no trigger/ticket disturbance. Ready for Phase 20 handoff.

---
_Verified: 2026-09-16T12:15:00Z_
_Verifier: the agent (gsd-verifier)_
