---
phase: 22-pool-lifecycle-decay-pool2-04
reviewed: 2026-10-26T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/lib/ict/pools.ts
  - src/lib/ict/pools.test.ts
  - src/lib/store.ts
  - components/dashboard/calibration-sandbox.tsx
  - src/lib/store.test.ts
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 22-pool-lifecycle-decay-pool2-04: Code Review Report

**Reviewed:** 2026-10-26T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Reviewed Phase 22 decay surface (poolAgeBars/poolDecay/scoreAndRank threading, store preview slice, two sandbox KnobRows) at standard depth. Decay formula, purity (no clock/store reads in helpers), byte-identity of weight/touches, refuse-to-rank neutrality (decayFactor 1.0), and preview-vs-live separation all hold on the happy path. Findings are test-strength gaps (one tautological assertion, one vacuous independence test), a rankSkipped inconsistency on the zero-ACTIVE branch, and an incomplete applied-copy after the two new knobs. No security issues found. No critical (ship-blocking) defects.

## Warnings

### WR-01: Tautological self-compare assertion never fails

**File:** `src/lib/ict/pools.test.ts:637-639`
**Issue:** The age test compares `poolAgeBars(...)` to itself with identical arguments, so it passes regardless of implementation. The intended pin (bars after asOf never count) is untested.
**Fix:**
```ts
// was: expect(poolAgeBars(freshPool('2026-01-09'), candles, '2026-01-09')).toBe(
//   poolAgeBars(freshPool('2026-01-09'), candles, '2026-01-09'),
// );
expect(poolAgeBars(freshPool('2026-01-09'), candles, '2026-01-09')).toBe(0);
expect(poolAgeBars(freshPool('2026-01-09'), candles, '2026-01-12')).toBe(3);
expect(poolAgeBars(freshPool('2026-01-05'), candles, '2026-01-12')).toBeGreaterThan(
  poolAgeBars(freshPool('2026-01-09'), candles, '2026-01-12'),
);
```

### WR-02: Decay preview-independence test is vacuous

**File:** `src/lib/store.test.ts:1726-1740`
**Issue:** Both `control` and `moved` call `scoreAndRank` with identical arguments after the preview drift, so `JSON.stringify(moved) === JSON.stringify(control)` proves determinism only. It would still pass if the scorer read preview state, because neither call varies preview input. The claim under test (derivation never reads preview) needs a before-vs-after drift comparison.
**Fix:**
```ts
const before = scoreAndRank(pool, window, 'COMPRESSION', '2026-01-21');
useDashboard.getState().setCalibrationDecayHalfLifeBars(1);
useDashboard.getState().setCalibrationDecayFloor(0.9);
const after = scoreAndRank(pool, window, 'COMPRESSION', '2026-01-21');
expect(JSON.stringify(after)).toBe(JSON.stringify(before));
```

### WR-03: Zero-ACTIVE branch returns rankSkipped false with zero scores

**File:** `src/lib/ict/pools.ts:388-390`
**Issue:** When `active.length === 0` the function returns `{ pools: ordered, scores: zeroScores(ordered), rankSkipped: false }`. Everywhere else SWEPT pools ride along unscored (`scores.length === active.length`, ghost-origin exclusion pins at pools.test.ts:605-611/685-687). The empty-active branch instead emits score entries for inactive pools with `rankSkipped: false`, signalling a successful rank with nothing ranked. Callers branching on `rankSkipped` vs `scores.length` disagree here.
**Fix:**
```ts
if (active.length === 0) {
  return { pools: ordered, scores: [], rankSkipped: true };
}
// or document explicitly that zero-ACTIVE yields zero-scores with rankSkipped true
// and update the ghost-exclusion pins to match.
```

### WR-04: Applied-set copy omits the two new decay pins

**File:** `src/lib/store.ts:404-410`
**Issue:** `calibrationAppliedCopy()` names KZ/DISP/TOL/MERGE/DOL/BEHIND but not `decayHalfLifeBars`/`decayFloor`, even though Apply re-seeds both decay knobs (store.ts:1283-1284) and the sandbox pristine check covers them. The operator-facing applied record is incomplete after Phase 22.
**Fix:**
```ts
export function calibrationAppliedCopy(): string {
  return (
    `Tətbiq: KZ ${TRIGGER_KZ_START_MIN}–${TRIGGER_KZ_END_MIN} dəq · ` +
    `DISP ${TRIGGER_DISP_MULT}× · TOL ${EQUAL_TOL_BPS} bps · ` +
    `MERGE ${MERGE_ATR_MULT}× · DOL ${DOL_BOOST}× · BEHIND ${BEHIND_PENALTY} · ` +
    `HALF-LIFE ${DECAY_HALF_LIFE_BARS} bar · FLOOR ${DECAY_SCORE_FLOOR} — ` +
    `sərhəd testləri yenidən təsdiqləndi`
  );
}
```

## Info

### IN-01: equalityBonus cap comment disagrees with code by 0.5

**File:** `src/lib/ict/pools.ts:128-131`
**Issue:** Comment says "capped at 2 extra steps (bonus(6)=7, bonus(7+)=7)" but `capped = min(extra, 4+2)` yields bonus(7)=3+2+1+0.5+0.5+0.5=7.5, and bonus(8+) stays 7.5. Doc-only; tests pin only up to touches=5.
**Fix:** Update comment to `bonus(6)=7.0, bonus(7+)=7.5` or clamp to 5 total steps if 7.0 was intended.

### IN-02: Behind-penalty knob hardcodes min instead of the bound constant

**File:** `components/dashboard/calibration-sandbox.tsx:263`
**Issue:** `min={0}` duplicates `CALIBRATION_BEHIND_MIN` (imported bounds cover max/step but not min). A future retune of the constant silently desyncs the slider floor and the setter clamp (store.ts:1235).
**Fix:**
```tsx
import { CALIBRATION_BEHIND_MIN, ... } from '@/src/lib/store';
// ...
min={CALIBRATION_BEHIND_MIN}
```

### IN-03: scoreAndRank trusts closed non-empty at the tail without a guard

**File:** `src/lib/ict/pools.ts:384,391`
**Issue:** `closed[closed.length - 1].close` and `dolSide(closed, ...)` assume non-empty `closed`. Currently unreachable when empty (computeATR([]) early-returns), so no crash today, but the public exported function has no explicit empty-closed guard and relies on ATR internals for safety.
**Fix:**
```ts
if (closed.length === 0) {
  return { pools: ordered, scores: zeroScores(ordered), rankSkipped: true };
}
```
placed before the ATR read.

---

_Reviewed: 2026-10-26T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
