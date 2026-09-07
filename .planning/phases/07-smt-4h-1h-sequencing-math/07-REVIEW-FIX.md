---
phase: 07-smt-4h-1h-sequencing-math
fixed_at: 2026-09-07T11:56:00Z
review_path: .planning/phases/07-smt-4h-1h-sequencing-math/07-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase 07: Code Review Fix Report

**Fixed at:** 2026-09-07T11:56:00Z
**Source review:** .planning/phases/07-smt-4h-1h-sequencing-math/07-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 9
- Fixed: 9
- Skipped: 0

## Verification environment

All gates ran in the **main checkout** (`C:\Users\HP\Projects\liquidity-engine`), not the isolated
worktree: the hand-rolled worktree under `.claude/worktrees/` carries no `node_modules`, so
`vitest` and `tsc` were invoked from the main checkout with `--root` / `-p` pointed at the
worktree sources (module resolution walks up to the main `node_modules`). Results are reproducible
from the main checkout after the fast-forward.

- `npx vitest run src/lib/ict/smt.test.ts src/lib/ict/fvg.test.ts src/lib/ict/aggregate.test.ts
  --root .claude/worktrees/rf-07-1741-1788766719` → **3 files, 48 tests, all passed**
- `node node_modules/typescript/bin/tsc --noEmit` on main checkout → **clean (exit 0)**.
  The same check with `-p` at the worktree reports one error in `app/layout.tsx`
  (`Cannot find name 'LayoutProps'`) with **zero errors in `src/lib/ict`** — that layout error is
  an artifact of type-checking the worktree copy outside its Next.js generated-types context
  (the identical file type-checks clean in the main checkout); it is unrelated to these fixes.
- WR-03 additionally verified with a throwaway vitest case (both 01:00 fall-back occurrences in
  one B2 group → single merged block, first-open from row 0, last-close from the first 01:00);
  the scratch file was deleted after passing and is not part of the commits.
- Human verification (2026-09-07, operator confirmed): WR-01 mirror-arm `sweeperLeg` naming
  (BEARISH/ES, BULLISH/NQ) matches trading logic; WR-03 "first occurrence wins" merge policy
  accepted. Both `requires human verification` flags resolved.

## Fixed Issues

### CR-01: `bpsGap` mixes legs across price scales — reported value is nonsense

**Files modified:** `src/lib/ict/smt.ts`
**Commit:** 93dbae0
**Applied fix:** Both `detectSMT` signal arms now report the already-computed single-leg
`holdGapBps` as `bpsGap`. The private cross-leg `bpsGap()` helper (`|NQ_price − ES_price| /
reference`, ~23300 bps of scale-mixing garbage on the bear fixture) had no remaining callers, so
it was deleted outright rather than left as a misuse trap. Existing `> SMT_TOL_BPS` assertions
still pass; the field now carries the ~33 bps hold gap a downstream consumer expects.

### CR-02: FVG `originIndex` throws on stale origins — mitigation/transition crash instead of skipping

**Files modified:** `src/lib/ict/fvg.ts`
**Commit:** 04755a1
**Applied fix:** Replaced the throwing `originIndex(closed, originDate, caller)` with
`originIndexOrNeg1(closed, originDate)`. `applyMitigation` keeps a stale-origin gap as active
(untestable, so never fillable) and `detectTransition` skips it, per the reviewer's guidance.
All 16 existing FVG tests pass.

### WR-01: SMT sweep matrix is asymmetric — 2 of 4 textbook divergences are undetectable

**Files modified:** `src/lib/ict/smt.ts`
**Commit:** e1368a5
**Applied fix:** Added the two mirror arms with the same tolerance semantics: bearish
`BEARISH/sweeperLeg ES` (ES takes its prior high while NQ holds) and bullish `BULLISH/sweeperLeg
NQ` (NQ takes its prior low while ES holds). Both report the holding leg's own `holdGapBps`.
Naked-eye check: previously-unreachable enum combinations are now constructible; existing bear/bull
happy-path tests still pass unchanged. Status is `fixed: requires human verification` — the new
branches are new signal logic (not a refactor), so a domain owner should confirm the textbook
polarity/sweeper naming before this phase proceeds to verification.

### WR-02: Exact-tolerance edge relies on raw float `>` with no epsilon

**Files modified:** `src/lib/ict/smt.ts`
**Commit:** 52a97ea
**Applied fix:** Added `TOL_EPS_BPS = 1e-9` and rewrote all four tolerance compares as
`holdGapBps - toleranceBps > TOL_EPS_BPS`, documenting that equal-within-epsilon ⇒ NO-SIGNAL.
The exact-25 bps boundary test still asserts NO-SIGNAL; all 17 SMT tests pass.

### WR-03: `aggregate1Hto4H` drops DST fall-back 5-member blocks via `!== BLOCK_SIZE`

**Files modified:** `src/lib/ict/aggregate.ts`
**Commit:** a07911f
**Applied fix:** Chose the reviewer's "merge the duplicated wall-clock hour (prefer first, emit
4)" option: groups longer than `BLOCK_SIZE` are deduped by NY wall-clock identity
(`${nyDateOf}@${nyHourOf}`, first occurrence wins) before the exact-4 check; groups that still
do not hold exactly 4 (trailing partials, spring-forward shorts, maintenance gaps) stay dropped
as before. Verified with a throwaway regression test containing both 01:00 fall-back occurrences
(5-member B2 → single merged block, first-open/last-close from the first 01:00); scratch deleted
after passing. All 15 existing aggregate tests pass. Status is `fixed: requires human
verification` — the merge-vs-split policy is a judgment call the reviewer left open, and the
regression test lives only in the scratch run, not in the committed suite.

### WR-04: `forming-exclusion` test assertion cannot fail on partial overlap

**Files modified:** `src/lib/ict/smt.test.ts`
**Commit:** f4bb81b
**Applied fix:** Split the conjunction into two separate assertions exactly as suggested
(`windowStart` and `windowEnd` each asserted clean). Passes — the current fixtures produce no
partial-overlap pair, so the strengthened test holds vacuously on today's data and will catch a
future regression.

### WR-05: Aggregate never validates `time` — NaN/negative epochs reach timezone math

**Files modified:** `src/lib/ict/aggregate.ts`
**Commit:** 178a7a7
**Applied fix:** Added a separate `hasValidTime` predicate (`Number.isFinite(c.time) && c.time >
0`, distinguishable from the OHLC predicate) and applied it alongside `hasFiniteOhlc` at the
aggregate boundary. All 15 aggregate tests pass.

### WR-06: SMT correlation window assumes sorted input — never sorts

**Files modified:** `src/lib/ict/smt.ts`
**Commit:** a28d215
**Applied fix:** `matchSwings` sorts chronological copies of both legs (same comparator as the
existing pair sort) after filtering and before the trailing-lookback slice; `evaluateSMT` sorts
copies of both closed legs before pairing so `paired.slice(-CORR_WINDOW)` is the trailing window
even for out-of-order feeds. Caller arrays are never mutated (spread-then-sort). All 17 SMT tests
pass.

### WR-07: `applyMitigation` doesn't sort before the trailing-20 slice; `detectTransition` does

**Files modified:** `src/lib/ict/fvg.ts`
**Commit:** 2811339
**Applied fix:** `applyMitigation` sorts the active map by `originDate` with the identical
comparator used in `detectTransition` before `slice(-FVG_MAP_BOUND)`, so both layers agree on
what is current for unsorted gap input. All 16 FVG tests pass.

---

_Fixed: 2026-09-07T11:56:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
