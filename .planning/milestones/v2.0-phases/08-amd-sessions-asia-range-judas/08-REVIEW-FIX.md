---
phase: 08
fixed_at: 2026-09-07T14:42:00Z
review_path: .planning/phases/08-amd-sessions-asia-range-judas/08-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 08: Code Review Fix Report

**Fixed at:** 2026-09-07T14:42:00Z
**Source review:** .planning/phases/08-amd-sessions-asia-range-judas/08-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (WR-01 through WR-06, fix_scope: critical_warning)
- Fixed: 6
- Skipped: 0

**Verification environment:** gates ran inside the isolated review-fix worktree
(`.claude/worktrees/rf-08-*/`, branch `gsd-reviewfix/08-*`) using the main
checkout's `node_modules` (vitest invoked by absolute path). Full ICT suite:
13 files / 132 tests green (baseline 127, +5 new regression tests). Budget
script output compared before/after (WR-06): identical.

## Fixed Issues

### WR-01: Double-sided sweep always reports HIGH

**Files modified:** `src/lib/ict/judas.ts`, `src/lib/ict/judas.test.ts`
**Commit:** 8281042
**Applied fix:** The per-candle sweep scan now detects a both-extremes candle
explicitly and resolves it by penetration distance — the side with the larger
violation (`high - asiaHigh` vs `asiaLow - low`) wins, with exact ties
preferring HIGH for determinism. The priority is documented in both the
function header comment and the scan-site comment. Added two regression tests:
larger-violation-wins in both directions, and the exact-tie-prefers-HIGH case
(including a determinism re-evaluation check).

### WR-02: `asiaRange` does not validate `sessionDate`

**Files modified:** `src/lib/ict/asia.ts`, `src/lib/ict/asia.test.ts`
**Commit:** 77b8294
**Applied fix:** New `assertValidSessionDate` boundary guard called at the top
of `asiaRange`: enforces `yyyy-MM-dd` shape via regex (covers
undefined/null/non-string/malformed) and real-calendar validity via a
UTC round-trip check (rejects e.g. `2026-02-30`, `2026-13-01`). Both throw
descriptive errors echoing the received value. Added a regression test with
five cases (undefined, null, DD-MM-YYYY, Feb-30, month-13).
**Note:** existing callers pass machine-generated dates, so no call-site
updates were needed; full suite green confirms no behavior change on valid
input.

### WR-03: No `high >= low` guard — negative-height range can propagate

**Files modified:** `src/lib/ict/asia.ts`, `src/lib/ict/asia.test.ts`
**Commit:** d9714fe
**Applied fix:** New `hasOrderedWicks` predicate (`high >= low`) added to the
boundary drop filter alongside the finite-OHLC and valid-time checks, so a
corrupt inverted tick is dropped like other invalid rows. Defense-in-depth:
the wick accumulator now guards the resulting height and returns `null`
(honest degrade) instead of ever emitting a zero/negative-height range.
Added a regression test: inverted row with extreme wicks leaves the range
unchanged, and an inverted-only window returns `null`.

### WR-04: Resolve hook has no ROOT containment check (path traversal)

**Files modified:** `scripts/resolve-alias.mjs`
**Commit:** 4963ce1
**Applied fix:** The joined candidate is `path.normalize`d and asserted to
start with `ROOT`; on escape the hook falls through to `nextResolve` instead
of loading the out-of-root file. Verified with a direct harness: legit `@/`
specifier still short-circuits, `@/../../outside` falls through, non-`@`
specifiers pass through untouched. Budget script still runs (BUDGET line
unchanged), confirming no regression to the dev loader path.

### WR-05: `amdPhase` trusts `judas`/`smt` object shapes

**Files modified:** `src/lib/ict/amd.ts`, `src/lib/ict/amd.test.ts`
**Commit:** 91cee0f
**Applied fix:** New `assertValidJudas` boundary guard in `amdPhase` (null/undefined
still allowed as honest empty signals): rejects non-object judas, non-boolean
`candidate`/`confirmed`, non-finite/non-positive `sweepTime` (null allowed),
and `sweepSide` outside HIGH/LOW/null — all with descriptive errors echoing
received values. This closes the exact reported hole (`{candidate: 1,
sweepTime: "abc"}` silently holding manipulation via NaN compare). Added a
regression test covering all three rejection shapes plus null/well-formed
pass-through.

### WR-06: Budget synthesis uses fixed-offset day/hour arithmetic

**Files modified:** `scripts/judas-budget.ts`
**Commit:** ea8611d
**Applied fix:** `epochOf` now resolves each requested NY civil date + wall-clock
hour/minute per call through `fromZonedTime` (calendar rollover via the Date
constructor), replacing the anchor-plus-`dayOffset*86400+hour*3600` arithmetic.
Verified identical output: `BUDGET confirmed=10/60 (16.7%)`, exit 0, before
and after. DST-safety demonstrated: for the 2026-03-08 spring-forward date,
the old arithmetic renders 21:00 NY (3600s drift) while the new code renders
the intended 20:00 NY.

## Skipped Issues

None — all in-scope findings were fixed.

---

_Fixed: 2026-09-07T14:42:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
