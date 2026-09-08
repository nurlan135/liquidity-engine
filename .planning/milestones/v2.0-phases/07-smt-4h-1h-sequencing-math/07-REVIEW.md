---
phase: 07-smt-4h-1h-sequencing-math
reviewed: 2026-09-07T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/lib/ict/smt.ts
  - src/lib/ict/smt.test.ts
  - src/lib/__fixtures__/smt-rollweek.json
  - src/lib/ict/fvg.ts
  - src/lib/ict/fvg.test.ts
  - src/lib/ict/aggregate.ts
  - src/lib/ict/aggregate.test.ts
findings:
  critical: 2
  warning: 7
  info: 3
  total: 12
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-09-07T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Reviewed pure TypeScript ICT math modules (SMT comparator, FVG map/transition, NY-anchored 1H→4H synthesis) plus vitest suites and roll-week fixture. No purity violations found (no `Date.now`, `Math.random`, I/O, store imports; `asOf` injected throughout). Two correctness BLOCKERs: `bpsGap` mixes NQ/ES price scales into a meaningless number, and FVG `originIndex` throws on any stale origin instead of skipping. Asymmetric SMT sweep matrix, float-tolerance edge, DST 5-member block drop, and weak test assertions follow as WARNINGs.

Purity scan (`Date.now|Math.random|new Date()|process.env|fetch(|console.log|TODO|FIXME` over `src/lib/ict`): zero matches.

## Critical Issues

### CR-01: `bpsGap` mixes legs across price scales — reported value is nonsense

**File:** `src/lib/ict/smt.ts:155-157,321,338`
**Issue:** `bpsGap(sweptPrice, heldPrice, referenceExtreme)` is called as `bpsGap(latest.nqExtreme, latest.esExtreme, prior.esExtreme)` (bearish, line 321) and `bpsGap(latest.esExtreme, latest.nqExtreme, prior.nqExtreme)` (bullish, line 338). It takes `|NQ_price − ES_price| / reference` — absolute difference between two instruments trading at ~20000 vs ~6000. For the bear fixture: `|20300−6080|/6100*10000 ≈ 23311 bps (≈233%)`. The test only asserts `> SMT_TOL_BPS`, so it passes, but the field is semantically garbage; any downstream consumer (prose, thresholds, charts) inherits a ~23000 bps "gap" for a ~33 bps hold.
**Fix:**
```ts
// Bearish: report the ES hold gap already computed, not a cross-leg spread.
if (holdGapBps > toleranceBps) {
  return { suppressed: false, direction: 'BEARISH', sweeperLeg: 'NQ',
    nqWindow, esWindow, bpsGap: holdGapBps };
}
// Bullish mirror: bpsGap: holdGapBps
```

### CR-02: FVG `originIndex` throws on stale origins — mitigation/transition crash instead of skipping

**File:** `src/lib/ict/fvg.ts:37-43,97,147`
**Issue:** `originIndex` throws when `gap.originDate` is absent from the candle window. Both `applyMitigation` (line 97) and `detectTransition` (line 147) call it per gap. Any real pipeline where gaps come from a longer history than the evaluation window (trailing-20 map, truncated chart window, rolled history) throws `originDate ... not found in candle window` instead of treating the gap as untestable. Boundary re-validation should never turn a stale input into an exception.
**Fix:**
```ts
function originIndexOrNeg1(closed: Candle[], originDate: string): number {
  return closed.findIndex((c) => c.date === originDate);
}
// in loops:
const origin = originIndexOrNeg1(closed, gap.originDate);
if (origin === -1) continue; // stale gap: keep (mitigation) / skip (transition)
```

## Warnings

### WR-01: SMT sweep matrix is asymmetric — 2 of 4 textbook divergences are undetectable

**File:** `src/lib/ict/smt.ts:308-342`
**Issue:** High branch only fires `BEARISH/sweeperLeg NQ` (NQ takes prior high, ES holds). Low branch only fires `BULLISH/sweeperLeg ES` (ES takes prior low, NQ holds). The mirrors — ES sweeps high while NQ holds (bearish, sweeper ES) and NQ sweeps low while ES holds (bullish, sweeper NQ) — fall through to `NO-SIGNAL`. The `sweeperLeg: 'NQ' | 'ES'` type promises both legs can sweep either direction, but `BEARISH/ES` and `BULLISH/NQ` are unreachable. Tests only cover the two implemented diagonals, so the gap is invisible.
**Fix:** Add the mirror arms (same tolerance semantics), e.g. bearish-ES-sweeps: `if (latest.esExtreme > prior.esExtreme) { holdGap = (prior.nq − latest.nq)/prior.nq*10000; if (holdGap > tol) return BEARISH/sweeperLeg ES ... }`, and bullish-NQ-sweeps symmetrically.

### WR-02: Exact-tolerance edge relies on raw float `>` with no epsilon

**File:** `src/lib/ict/smt.ts:313-314,330-331`
**Issue:** `holdGapBps > toleranceBps` on `(6100−6084.75)/6100*10000` (intended exactly 25). `0.0025` and the divide-then-multiply chain are not exact in binary; the result lands within ~1 ulp of 25. Today it rounds to `NO-SIGNAL` (test passes), but any refactor of operation order, a different engine, or a nearby fixture value flips the signal. Tolerance-boundary compares need an epsilon.
**Fix:** `const EPS = 1e-9; if (holdGapBps - toleranceBps > EPS) { ... }` and document "equal-within-epsilon ⇒ NO-SIGNAL".

### WR-03: `aggregate1Hto4H` drops DST fall-back 5-member blocks via `!== BLOCK_SIZE`

**File:** `src/lib/ict/aggregate.ts:131-133`
**Issue:** A group emits iff `members.length === BLOCK_SIZE`. On the November fall-back Sunday the repeated 01:00 wall-clock hour yields two distinct epoch rows mapping to the same `blockKey`, giving a 5-row group that is silently dropped. The existing fall-back test (lines 82-91) deliberately uses Oct-31/Nov-01 rows that avoid the repeated hour, so the hole is uncovered. Spring-forward 3-row drops are intended; 5-row fall-back drops lose a valid block.
**Fix:** Decide and document: either merge the duplicated wall-clock hour (prefer first, emit 4) or split/flag. Minimum: `if (members.length < BLOCK_SIZE) continue;` plus explicit duplicate-wall-clock handling, with a regression test containing both 01:00 occurrences.

### WR-04: `forming-exclusion` test assertion cannot fail on partial overlap

**File:** `src/lib/ict/smt.test.ts:271-276`
**Issue:** `expect(removed.has(p.windowStart) && removed.has(p.windowEnd)).toBe(false)` only fails when *both* endpoints are removed dates. A pair referencing one removed date (windowStart removed, windowEnd clean) passes. The test claims "never enter pairs" / "cannot reference the removed dates" but proves the weaker claim.
**Fix:** `expect(removed.has(p.windowStart)).toBe(false); expect(removed.has(p.windowEnd)).toBe(false);`

### WR-05: Aggregate never validates `time` — NaN/negative epochs reach timezone math

**File:** `src/lib/ict/aggregate.ts:18-25,99-100`
**Issue:** `hasFiniteOhlc` checks OHLC only. A row with `time: NaN` passes the filter, then `nyDateOf`/`nyHourOf` call `formatInTimeZone(NaN)` (throw/Invalid Date) and `seen`/`sort` behave pathologically. T-07-01 claims boundary re-validation; the epoch field is part of the boundary.
**Fix:** `Number.isFinite(c.time) && c.time > 0` in the filter (separate predicate so failure mode is distinguishable from OHLC).

### WR-06: SMT correlation window assumes sorted input — never sorts

**File:** `src/lib/ict/smt.ts:205-227`
**Issue:** `paired` follows NQ input order; `paired.slice(-CORR_WINDOW)` is "trailing" only if inputs arrive chronological. `aggregate1Hto4H` sorts; `evaluateSMT`/`matchSwings` do not. Out-of-order feed rows silently produce the wrong 20-close window and a wrong `corr`/suppression decision.
**Fix:** Sort a copy by `date` after filtering (`[...nqClosed].sort(...)` / same for ES) before pairing, mirroring the aggregate T-07-04 precedent.

### WR-07: `applyMitigation` doesn't sort before the trailing-20 slice; `detectTransition` does

**File:** `src/lib/ict/fvg.ts:110,144`
**Issue:** `applyMitigation` returns `active.slice(-FVG_MAP_BOUND)` in input-gap order, while `detectTransition` sorts by `originDate` first. Unsorted gap input yields different "latest 20" between the two layers — the map and the transition layer disagree on what is current.
**Fix:** Sort `active` by `originDate` (same comparator as line 144) before slicing.

## Info

### IN-01: Emitted 4H blocks rely on Map insertion order, not an explicit sort

**File:** `src/lib/ict/aggregate.ts:116-149`
**Issue:** Correct today (sorted+dedeuped input ⇒ first-seen order is chronological), but there is no `blocks.sort` by `date`. Any future caller change or non-`B1..B6`-lexicographic key edit silently unsorts downstream `computeRange`/`computeBias` consumers.
**Fix:** `blocks.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));` before return.

### IN-02: Coverage gaps that let the above survive

**File:** Multiple test files
**Issue:** (a) No aggregate test with a block containing the DST transition hour itself (missing 02:00 Mar / doubled 01:00 Nov) — `aggregate.test.ts:70-91` tests adjacent blocks only. (b) No FVG test for bearish close-through mitigation or for stale-origin gaps (would have caught CR-02). (c) No SMT test for mirror sweeps NQ-low / ES-high (would have caught WR-01) or for unsorted-input determinism.
**Fix:** Add the five targeted cases; each is a <15-line builder test in existing style.

### IN-03: Delivery sentence interpolates raw floats

**File:** `src/lib/ict/fvg.ts:172-175`
**Issue:** `${originFvg.bottom}–${originFvg.top}` renders full float repr (e.g. `20027.333333333332–20040.666666666668`) into trader-facing prose. Deterministic, but ugly and unstable-looking across feeds.
**Fix:** Format with fixed precision / tick rounding helper before interpolation.

---

_Reviewed: 2026-09-07T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
