---
phase: 22-pool-lifecycle-decay-pool2-04
verified: 2026-10-26T15:00:00Z
status: passed
score: 15/15 must-haves verified
covered_files: [".planning/phases/22-pool-lifecycle-decay-pool2-04/22-01-PLAN.md", ".planning/phases/22-pool-lifecycle-decay-pool2-04/22-01-SUMMARY.md", ".planning/phases/22-pool-lifecycle-decay-pool2-04/22-02-PLAN.md", ".planning/phases/22-pool-lifecycle-decay-pool2-04/22-02-SUMMARY.md", ".planning/phases/22-pool-lifecycle-decay-pool2-04/22-03-PLAN.md", ".planning/phases/22-pool-lifecycle-decay-pool2-04/22-03-SUMMARY.md", "components/dashboard/calibration-sandbox.tsx", "src/lib/ict/pools.test.ts", "src/lib/ict/pools.ts", "src/lib/store.test.ts", "src/lib/store.ts"]
covered_digest: "v3:sha256:2a1fb5aea070ec15333075cbbc807ec48dde2bb8db55773f5c2cfe2f7b306e52"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 22: Pool Lifecycle Decay (POOL2-04) Verification Report

**Phase Goal:** Pool age/decay + re-accumulation — eligibility and decay semantics locked before any consumer reads rank.
**Verified:** 2026-10-26T15:00:00Z
**Status:** passed
**Re-verification:** No — initial verification (no prior VERIFICATION.md found)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A fresh ACTIVE pool scores at full strength and a 10-bar-old identical pool scores at half strength | ✓ VERIFIED | `poolDecay(0) === 1.0` and `poolDecay(10) === 0.5` pinned in `describe('pool decay')`; `pools.test.ts` 45/45 green (re-run by verifier) |
| 2 | An ancient ACTIVE pool never scores zero while ACTIVE; the floor holds at quarter strength | ✓ VERIFIED | `poolDecay(60/120/1000) === DECAY_SCORE_FLOOR`, ancient-ACTIVE pipeline test asserts `decayFactor > FLOOR` with positive finite score |
| 3 | Stored weight and touches are byte-identical before and after scoring | ✓ VERIFIED | `scoring never mutates stored weight or touches across young and ancient pools` test passes; scorer is read-only outside `seedPools`/`mergePools` (code comment + no assignments found) |
| 4 | Refuse-to-rank paths return finite zero scores with a neutral decay ledger and rankSkipped true | ✓ VERIFIED | `zeroScores` builder carries `decayFactor: 1.0, score: 0`; zero-ATR test asserts finite zeros + originDate order + `rankSkipped: true` |
| 5 | Two injected asOf values give deterministic time-ordered decay with no clock reads | ✓ VERIFIED | `an earlier asOf outscores a later asOf` test passes; `purity.test.ts` 2/2 green; no `Date.now`/`new Date`/store imports in `pools.ts` (grep clean) |
| 6 | Stored weight/touches survive scoring untouched across young and ancient pools (Plan 02 restatement of #3) | ✓ VERIFIED | Same identity pin as #3, plus double-run `JSON.stringify` equality pin — scorer is a pure function of pools + window + asOf |
| 7 | Scoring the same input twice yields identical rank output with no shared mutable state | ✓ VERIFIED | `double-run scoring is byte-identical` test passes |
| 8 | SWEPT pools never re-enter rank and ghost order stays originDate-sorted after decay | ✓ VERIFIED | Ghost test asserts SWEPT rows carry no score entry, ACTIVE fills scores, inactive tail stays date-sorted; scorer only maps `active`, inactives appended unscored |
| 9 | Parity triple matches exactly pools-on versus pools-off with zero tolerance | ✓ VERIFIED | `pools-parity.test.ts` green (re-run by verifier as part of 56-test batch); derivation files untouched by phase commits |
| 10 | selectPools still refuses null on NQ-stale and wraps thin history as degraded | ✓ VERIFIED | `pools-matrix: POOL-06 degrade envelope` test in `store.test.ts` passes; phase commits never touched the selector source |
| 11 | Operator moves half-life and floor knobs and sees a what-if preview badge with drifted dimmed | ✓ VERIFIED | Two `KnobRow` entries (`sandbox-knob-decay-half-life`, `sandbox-knob-decay-floor`) wired after the behind knob with degraded-flag honoring and preview-dim path; `pristine` compares preview fields against imported `DECAY_*` constants; `tsc --noEmit` clean |
| 12 | Apply records the review and re-seeds preview to pinned constants without rewriting any constant | ✓ VERIFIED | `applyCalibrationPreview` re-seed object includes both decay fields sourced from pinned imports; store test asserts post-Apply `toEqual` against `DECAY_HALF_LIFE_BARS`/`DECAY_SCORE_FLOOR` |
| 13 | Reset restores pristine preview matching the pinned decay constants exactly | ✓ VERIFIED | `resetCalibrationPreview` re-seeds both fields; NaN-refusal + clamp pins pass; pristine `toEqual` assertion green |
| 14 | No derivation reads preview state; scoreAndRank keeps reading pinned constants | ✓ VERIFIED | `scoreAndRank` signature takes only `(pools, closed, bias, asOf)` — no preview/store parameter possible; store test proves byte-identical scorer output before/after preview movement |
| 15 | Section 1 prose and chart lines render exactly as before with decay live | ✓ VERIFIED | Phase commits touch only `pools.ts`, `pools.test.ts`, `store.ts`, `calibration-sandbox.tsx`, `store.test.ts` — zero prose/chart/trigger/flaw/ticket/selector edits; parity suite green confirms no behavioral drift |

**Score:** 15/15 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/ict/pools.ts` exports `DECAY_HALF_LIFE_BARS` / `DECAY_SCORE_FLOOR` | 10 / 0.25, CALIBRATION-PROVISIONAL | ✓ VERIFIED | Lines 36-41, exact values, provisional comment shape |
| `src/lib/ict/pools.ts` exports pure `poolAgeBars` and `poolDecay` | string-compare age, max-formula decay | ✓ VERIFIED | Lines 77-89; no clock, no imports beyond existing |
| `PoolScore` carries `decayFactor`, `scoreAndRank` threads `asOf` | ledger field + 4th param | ✓ VERIFIED | Lines 63-71, 354-359; `evaluatePools` threads `asOf` (line 474); `zeroScores` neutral 1.0 |
| `src/lib/ict/pools.test.ts` pool decay boundary block | fresh/half-life/floor/monotonicity pins | ✓ VERIFIED | 15 tests in block (11 boundary + 4 invariant), no Rank-1-flip assertions |
| `src/lib/ict/pools.test.ts` immutability + determinism + ghost-order pins | identity, double-run, ghost, time-order | ✓ VERIFIED | 4 invariant tests appended in one block |
| Green parity / purity / selector gates | triple match, no clock reads, envelope stable | ✓ VERIFIED | Re-run by verifier: all green |
| `src/lib/store.ts` preview fields + setters + bounds + re-seed | clamp, round, NaN-refusal, pinned Apply/reset | ✓ VERIFIED | Lines 90-95, 110-111, 1242-1253, 1283-1284, 1309-1310 |
| `calibration-sandbox.tsx` two KnobRows + pristine | slots, imports, no new primitive | ✓ VERIFIED | Slots + pristine lines 139-148, rows 270-289, KnobRow reuse |
| `src/lib/store.test.ts` preview pins | clamp/reset/Apply/independence | ✓ VERIFIED | Lines 1578-1760; scorer-identity assertion included |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `evaluatePools` | `scoreAndRank` | `asOf` 4th arg, same closed window | ✓ WIRED | Line 474; age counts bars the lifecycle saw |
| scorer formula | Phase 19 locked line | exactly one `decayFactor` multiplier | ✓ WIRED | Line 410: `weight * dolBoost * behindPenalty * decayFactor / (1 + distAtr)` |
| `zeroScores` | refuse-to-rank paths | `decayFactor: 1.0` on every path | ✓ WIRED | Lines 362-371, all 5 refuse branches use it |
| pristine compare | pinned constants | `DECAY_*` imports, never literals | ✓ WIRED | Sandbox lines 38-39, 147-148; store lines 627-628 |
| KnobRows | preview setters | `onChange` to decay setters | ✓ WIRED | Rows reference `preview.decayHalfLifeBars`/`decayFloor` with setter subscriptions |
| preview slice | live derivation | zero reads | ✓ WIRED (absent by design) | `scoreAndRank` has no preview parameter; identity test proves independence |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `scoreAndRank` | `decayFactor` | `poolDecay(poolAgeBars(pool, closed, asOf))` over real closed candles | Yes — unit-pinned at 0/9/10/11/16/60/120/1000 bars | ✓ FLOWING |
| sandbox knobs | `preview.decayHalfLifeBars`/`decayFloor` | seeded from pinned `DECAY_*` imports, clamped setters | Yes — what-if only, never flows to derivation (proven by identity test) | ✓ FLOWING (preview-scoped) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| decay boundary block | `npx vitest run src/lib/ict/pools.test.ts` | 45/45 passed | ✓ PASS |
| store + parity + purity gates | `npx vitest run src/lib/store.test.ts src/lib/ict/pools-parity.test.ts src/lib/ict/purity.test.ts` | 3 files, 56/56 passed | ✓ PASS |
| full typecheck | `npx tsc --noEmit` | clean, exit 0 | ✓ PASS |

### Probe Execution

No probes declared by plans; phase is scorer/store unit-test work. SKIPPED (no runnable entry points beyond the suites above).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| POOL2-04 | 22-01, 22-02, 22-03 | ACTIVE-only predicate + transition table | ✓ SATISFIED | Pre-existing per D-19, parity green with decay live |
| POOL2-04 | 22-01 | Scorer-plane decay multiplier (provisional half-life) | ✓ SATISFIED | Truths 1, 2, 5; constants + helpers + formula |
| POOL2-04 | 22-01, 22-02 | Stored weight/touches immutable | ✓ SATISFIED | Truths 3, 6, 7 |
| POOL2-04 | 22-02 | SWEPT never re-enters rank | ✓ SATISFIED | Truth 8 + fresh-seed independence tests |
| POOL2-04 | 22-01, 22-03 | Re-accumulation via fresh-seed | ✓ SATISFIED | Consumed-price + SWEPT-ghost fresh-seed tests |
| POOL2-04 | 22-01, 22-02 | Injected asOf, no store timers | ✓ SATISFIED | Truth 5; purity gate green |
| POOL2-04 | 22-02, 22-03 | Stale/thin matrix pinned | ✓ SATISFIED | Truth 10; selector source untouched |

No orphaned requirements: POOL2-04 is the only Phase 22 requirement in REQUIREMENTS.md traceability, and all three plans claim it.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | Grep for TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER/placeholder/console.log/empty-returns across `pools.ts` and `pools.test.ts` returned zero matches; `tsc` clean; working tree clean |

### Human Verification Required

None. All 15 truths are pinned by automated tests that were re-run green by the verifier. Sandbox knob rendering reuses the installed `KnobRow` primitive with no new UI surface; preview semantics (clamp/Apply/reset/independence) are unit-pinned, not visual.

### Gaps Summary

No gaps. Every must-have from all three plan frontmatters plus the POOL2-04 requirement text is verified against actual code and passing tests. Phase goal achieved: decay semantics are locked in the scorer plane with stored inventory untouched, lifecycle invariants pinned, parity/purity/selector gates green, and the sandbox preview surface proven derivation-independent — before any consumer (Phase 23 TP2 resolver) reads rank.

---
_Verified: 2026-10-26T15:00:00Z_
_Verifier: Claude (gsd-verifier)_
