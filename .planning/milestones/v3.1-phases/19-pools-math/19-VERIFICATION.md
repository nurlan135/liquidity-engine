---
phase: 19-pools-math
verified: 2026-09-18T13:20:00Z
status: passed
score: 6/6 must-haves verified
covered_files: [.planning/phases/19-pools-math/19-01-PLAN.md, .planning/phases/19-pools-math/19-02-PLAN.md, .planning/phases/19-pools-math/19-03-PLAN.md, .planning/phases/19-pools-math/19-01-SUMMARY.md, .planning/phases/19-pools-math/19-02-SUMMARY.md, .planning/phases/19-pools-math/19-03-SUMMARY.md, .planning/REQUIREMENTS.md, src/lib/ict/pools.ts, src/lib/ict/swings.ts, src/lib/ict/pools.test.ts, src/lib/ict/swings.test.ts, src/lib/store.ts, src/lib/store.test.ts]
covered_digest: "v1:sha256:5769f74267cf7282805a031cd9c2dd609c5ae73be75166f14f4e5fe6c903aa93"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: 6/6
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 19: Pools Math Verification Report

**Phase Goal:** Ranked BSL/SSL stop-cluster inventory exists as pure, test-pinned math with a guarded selector
**Verified:** 2026-09-18T13:20:00Z
**Status:** passed
**Re-verification:** Yes — prior 19-VERIFICATION.md (2026-09-16, passed 6/6) read stale after phases 20–21 built on top; fresh check confirms pools derivation semantics unchanged

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POOL-01: BSL/SSL pools detected from D1 swing highs/lows via one shared k=2 strict-fractal contract (swings.ts single owner, smt re-exports, zero drift) | ✓ VERIFIED | `src/lib/ict/swings.ts:8,10` owns `SWING_K=2`, `SWING_LOOKBACK=60`; `isSwingHigh` (`swings.ts:14-27`, `>=` means no swing) / `isSwingLow` (`swings.ts:31-44`, `<=` means no swing) strict. `src/lib/ict/smt.ts:8` imports from `./swings`, `smt.ts:10` re-exports — zero forked fractal logic. `src/lib/ict/pools.ts:9` imports predicates from `./swings` only. `swings.test.ts` 7 pins green; `smt.test.ts` green unmodified; targeted 5-file run 104/104 green |
| 2 | POOL-02: Equal highs/lows cluster into heavier pools with a strong but diminishing bonus, swept pools keep their bonus | ✓ VERIFIED | `pools.ts:17` `EQUAL_TOL_BPS=25` + `pools.ts:32` `TOL_EPS_BPS=1e-9` epsilon idiom (`pools.ts:99-101`); `pools.ts:35` `EQUAL_BONUS_STEPS=[3.0,2.0,1.0,0.5]` exported CALIBRATION-PROVISIONAL; `poolWeight = touches + bonus` (`pools.ts:123-128`); lifecycle never edits weight (D-04 comment `pools.ts:120-122`). `pools.test.ts` POOL-02 matrix (3bps cluster / 200bps split / exact-25bps boundary / min-2-touches / triple-dominance / diminishing deltas / swept-keeps-bonus) green |
| 3 | POOL-03: Pools project as zones (side, top, bottom, touches, weight, originDate, status) with min-max spans, ATR-merge, trailing-20 cap newest-wins | ✓ VERIFIED | `LiquidityPool` exact shape `pools.ts:40-48`. `seedPools` min-max span `pools.ts:188-200`. `mergePools` `MERGE_ATR_MULT=0.25` x ATR, more-extreme edge kept, touches summed, weight recomputed `pools.ts:257-293`; empty/non-finite ATR skips merge (`pools.ts:259`). `capPools` originDate sort-before-slice(-20) `pools.ts:297-301`. All constants exported + CALIBRATION-PROVISIONAL. Merge/cap matrix (incl. converging-triangle newest-20 + reversed-input pin) green |
| 4 | POOL-04: Sweep lifecycle ACTIVE/SWEPT/CONSUMED — wick-pierce=swept, close-through=consumed, first-sweep-wins, no re-promotion | ✓ VERIFIED | `applyLifecycle` `pools.ts:210-245`: strict `>`/`<` pierce, close-through consumes with break (first-wins), `==` touch never flips, CONSUMED leaves map (`pools.ts:241`), stale origin kept+skipped (`pools.ts:214-217`), asOf cutoff (`pools.ts:222`). POOL-04 matrix (pierce/SWEPT both polarities, close/CONSUMED both polarities, touch-no-flip x2, double-raid, retest-no-repromote, latest-origin keep, asOf-cutoff) green |
| 5 | POOL-05: Proximity x DOL-side scorer ranks pools — Rank-1 nearest ACTIVE on DOL side, 2.0 boost, 0.25 behind-penalty, zero-ATR refuse-to-rank | ✓ VERIFIED | `scoreAndRank` `pools.ts:327-397`: `score = weight x dolBoost x behindPenalty / (1+distAtr)`; `DOL_BOOST=2.0` (`pools.ts:26`), `BEHIND_PENALTY=0.25` (`pools.ts:29`) exported provisional; only ACTIVE rank-eligible, SWEPT rides along unscored (`pools.ts:346,359-366,389-391`); zero/empty/non-finite ATR returns originDate order + zero scores + rankSkipped (`pools.ts:348-358`), never NaN. Scorer matrix (Rank-1 both biases, 2.0 boost ratio, 0.25 behind ratio, 10x scale invariance, zero-ATR finite) green |
| 6 | POOL-06: selectPools guarded envelope — null on stale/empty NQ leg, thin flagged (not nulled), ES-stale independent, never throws, single sharedEpoch | ✓ VERIFIED | `src/lib/store.ts:953-973`: `nq.stale→null` (955), `closedOnly` empty→null (956-957), single `sharedEpoch(get)` (959), `computeRange` finiteness probe→null on NaN (963-964), `evaluatePools(nq.candles, asOfBaku)` (965), thin→`{stale:false,thin:true,leg:'nq'}` flag (966-968), try/catch→null (970-972). Zero `es.stale` reads inside selector (confirmed: `es.stale` only at store.ts:934 selectSMT, 1121/1338 unrelated). `store.test.ts:996-1082` pools-matrix (healthy/ES-stale-live/thin-flagged/stale-refusal/empty/garbage/epoch-identity, all not.toThrow) green |

**Score:** 6/6 truths verified (0 present, behavior-unverified)

### Roadmap Success-Criteria Mapping

| SC | Roadmap text | Covered by | Status |
|----|--------------|------------|--------|
| SC-1 | Pool data derives from D1 swings via shared k=2 strict fractal, no forked logic | Truth 1 (POOL-01) | ✓ VERIFIED |
| SC-2 | Equal highs/lows rank heavier; every pool shows side, zone bounds, weight, origin, status | Truths 2+3 (POOL-02/03) | ✓ VERIFIED |
| SC-3 | Swept stays swept (pierce=SWEPT, close=CONSUMED, first-wins, no re-promotion) | Truth 4 (POOL-04) + Truth 5 SWEPT-rides-along | ✓ VERIFIED |
| SC-4 | Selector degrades honestly on stale/empty/thin (refuse-null, sharedEpoch), never throws | Truth 6 (POOL-06) | ✓ VERIFIED |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/ict/swings.ts` | Shared k=2 strict-fractal owner | ✓ VERIFIED | 44 lines, substantive: constants + both predicates + k-validation throws + boundary guards; unchanged since `4e1be9f` |
| `src/lib/ict/pools.ts` | Pure pools math (detect/lifecycle/merge/cap/scorer) | ✓ VERIFIED | 438 lines, substantive: 7 constants exported provisional, LiquidityPool/PoolsOutput/PoolScore/RankedPools types, detectPools + evaluatePools + scoreAndRank + equalityBonus + poolWeight + withinTolerance; derivation semantics unchanged — git log shows last touch `85774f2` (Phase 19 fixture fix), zero Phase 20/21 edits |
| `src/lib/ict/pools.test.ts` | POOL-01..05 boundary matrix | ✓ VERIFIED | 469 lines, 30 its across 4 describes (tracer / equality / lifecycle / merge-cap-scorer); wired via direct imports from pools.ts |
| `src/lib/ict/swings.test.ts` | Shared-contract regression pins | ✓ VERIFIED | 68 lines, 7 its: constants, positives, strict edges, k-throws, boundaries; wired to ./swings |
| `src/lib/store.ts` (selectPools) | Guarded selector envelope | ✓ VERIFIED | Wired: imports evaluatePools (line 17), computeRange; single sharedEpoch; degraded envelope typed via PoolsSelection; block at 953-973 semantically identical to Phase 19 hardening (later Phase 21 commits touched other store regions only) |
| `src/lib/store.test.ts` (pools-matrix) | POOL-06 degrade matrix | ✓ VERIFIED | 7-leg matrix lines 996-1082; wired to selectPools via getState() |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| swings.ts predicates | pools.ts detector | single import, zero duplicated fractal logic (D-12) | WIRED | pools.ts:9 imports isSwingHigh/isSwingLow/SWING_K/SWING_LOOKBACK from ./swings; no local fractal loop |
| pools.ts evaluatePools | store.ts selectPools | same snapshot, one sharedEpoch call (D-21) | WIRED | store.ts:959 `const epoch = sharedEpoch(get)` exactly once; :965 `evaluatePools(nq.candles, asOfBaku)` on same NQ snapshot |
| lifecycle status | scorer eligibility | only ACTIVE ranks (D-06) | WIRED | scoreAndRank :346 filters ACTIVE; SWEPT rides along unscored :391-394 |
| equality weight | scorer score | bonus flows into rank, swept keeps bonus (D-04) | WIRED | poolWeight via EQUAL_BONUS_STEPS at seed (:196) and merge-recompute (:279); lifecycle never touches weight |
| computeRange thinHistory | selectPools degraded flag | dim signal, not a null | WIRED | store.ts:963 single computeRange read serves finiteness probe + :966 thinHistory flag |

### Drift Check (Phases 20–21 Added Consumers Only)

| Check | Result |
|-------|--------|
| `git log --oneline -- pools.ts swings.ts swings.test.ts pools.test.ts` | Last touches are Phase 19 commits only (`85774f2`, `bb8a3a7`, `2955c5b`, `6a211aa`, `eb3af59`, `4e1be9f`) — no Phase 20/21 edits to derivation |
| `git log --oneline -3 -- store.ts` | `fd9b0c6`, `76eab37`, `d0789b8` (all Phase 21 sandbox) — selectPools block 953-973 semantics unchanged |
| Phase 20 consumers | `report.ts:17` comment-only reference to selectPools envelope; `terminal-shell.test.ts` reads selectPools (10 call sites) as a consumer, never re-derives swept-ness |
| Phase 21 consumers | `pools-parity.test.ts` toggles pools only in driver fixture selection (D-17); trigger/flaw/ticket take no pools input — parity harness proves non-vote |
| D-17 non-vote contract | `Select-String trigger.ts,invalidation.ts -Pattern pools` → zero matches; trigger takes no pools input |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| pools.ts detectPools | window via windowCandles | closedOnly + finite-OHLC drop + chronological sort + slice(-60) of injected Candle[] | ✓ FLOWING | Real swing-seeded zones; empty-window `return []` (:406/:425) is a legitimate degraded-empty guard, exercised by tests — not a stub |
| pools.ts evaluatePools | seeded→lived→merged→kept→ranked | seedPools + applyLifecycle + computeATR merge + capPools + scoreAndRank | ✓ FLOWING | End-to-end rank-ordered array; zero-ATR branch returns originDate order + rankSkipped, never static |
| store.ts selectPools | { pools, asOf, epoch, degraded } | evaluatePools(nq.candles, asOfBaku) + sharedEpoch(get) | ✓ FLOWING | Live NQ D1 leg; stale/empty/garbage refuse null (null = degraded, never silent []) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| pools+swings+smt+purity+store targeted | `npx vitest run src/lib/ict/pools.test.ts src/lib/ict/swings.test.ts src/lib/ict/smt.test.ts src/lib/ict/purity.test.ts src/lib/store.test.ts` | 5 files, 104 tests passed | ✓ PASS |
| pools+parity+report extended | `npx vitest run --maxWorkers=2 ...pools.test.ts ...swings.test.ts ...smt.test.ts ...purity.test.ts ...pools-parity.test.ts ...report.test.ts` | 6 files, 68 tests passed | ✓ PASS |
| Full suite (constrained workers; unconstrained run OOMs on parallel workers — runner contention, not code) | `npx vitest run --maxWorkers=2` | 42 files, 513 tests passed | ✓ PASS |
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
| POOL-06 | 19-01, 19-03 | selectPools refuse-null + sharedEpoch + never-throws | ✓ SATISFIED | pools-matrix 7 legs green |

Note: the stale-VERIFICATION observation that REQUIREMENTS.md checkboxes showed `[ ]`/Pending is now resolved — REQUIREMENTS.md marks all of POOL-01..06 `[x]` with traceability Complete. No docs touch-up needed.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | debt markers (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER) in pools.ts, swings.ts, pools.test.ts, swings.test.ts, store.ts selectPools block | — | None found |
| pools.ts | 406, 425 | `return []` | ℹ️ Info | Legitimate empty-window degraded-empty guard, exercised by tests — not a stub |
| pools.ts | 4 | `IntradayCandle`/`killzone` tokens | ℹ️ Info | Header comment stating the D-10 prohibition only; zero code imports — purity holds |
| replay.test.ts | 267 | `console.log` | ℹ️ Info | Outside phase scope (Phase 18/21 harness serializer); not in pools surface |

Purity wall: pools.ts/swings.ts contain zero `Date.now`/`store`/`zustand` code references — tsc clean plus purity.test.ts green confirms via self-scan. Trigger/invalidation modules contain zero `pools` references — no trigger/ticket disturbance per D-17 (parity harness in Phase 21 proves verdicts identical pools on/off).

### Human Verification Required

None. All phase truths are pure-function math plus a selector envelope, fully covered by deterministic unit tests (513/513 green). No visual appearance, user flow, real-time behavior, or external service integration in scope.

### Gaps Summary

No gaps. The phase goal holds in the current codebase after Phases 20–21: the ranked BSL/SSL stop-cluster inventory exists as pure test-pinned math (pools.ts 438 lines, 7 exported provisional constants, 30 boundary tests) behind a guarded selector (selectPools with stale/empty refuse-null, thin dim-flag, ES-stale independence, single sharedEpoch, never-throws). Derivation semantics show zero drift — later phases only added read-only consumers (report §1, chart overlay, parity/sandbox drivers). Full suite 513/513 green, tsc clean, purity guard clean, non-vote contract intact.

---
_Verified: 2026-09-18T13:20:00Z_
_Verifier: the agent (gsd-verifier)_
