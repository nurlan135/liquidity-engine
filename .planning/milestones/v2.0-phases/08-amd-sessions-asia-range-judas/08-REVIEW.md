---
status: issues-found
files_reviewed: 8
counts:
  critical: 0
  warning: 6
  info: 4
  total: 10
---

# Phase 08 Review — Asia Range / Judas / AMD + Budget Script

Reviewed `src/lib/ict/asia.ts`, `src/lib/ict/judas.ts`, `src/lib/ict/amd.ts`,
their `.test.ts` suites, `scripts/judas-budget.ts`, and
`scripts/resolve-alias.mjs` at standard depth. Boundary math (killzone strict
inequality, DST wall-clock resolution, displacement ratio) is largely correct
and well-pinned by tests. Findings below are edge-case correctness gaps,
validation inconsistencies, and a dev-loader containment gap.

## Warning

### WR-01: Double-sided sweep always reports HIGH

**File:** `src/lib/ict/judas.ts:134-143`
**Summary:** Per-candle sweep scan checks `high > asiaHigh` before
`low < asiaLow` and breaks on the first hit. A single 15M candle that pierces
both extremes (expansion candle with `high > asiaHigh && low < asiaLow`) is
always classified `HIGH`, never `LOW`, with no documented priority.
**Failure scenario:** Wide-range killzone candle takes both sides; detector
reports HIGH sweep and evaluates HIGH-side reversal while the LOW sweep is
silently dropped, yielding the wrong `sweepSide` and wrong confirmation
verdict.

### WR-02: `asiaRange` does not validate `sessionDate`

**File:** `src/lib/ict/asia.ts:61`
**Summary:** `rows` is type-guarded (`Array.isArray`, finite OHLC, positive
time) but `sessionDate` is used raw in `nyDateOf(r.time) === sessionDate`.
An `undefined`/`null`/malformed date never throws — it falls through to
`inWindow.length === 0` and returns `null`, indistinguishable from an honestly
empty window.
**Failure scenario:** Caller passes `undefined` session date due to an upstream
date bug; gets `null` back and treats the session as "no Asia range" instead
of surfacing the contract violation. `judasSwing` and `amdPhase` both validate
their scalar inputs (`dispMult`, `asOf`); `asiaRange` should do the same for
its documented `yyyy-MM-dd` parameter.

### WR-03: No `high >= low` guard — negative-height range can propagate

**File:** `src/lib/ict/asia.ts:96-102`
**Summary:** Wick-to-wick extremes assume every surviving candle has
`high >= low` and that the resulting `high >= low`. A corrupt row with
`high < low` (bad feed tick) passes `hasFiniteOhlc`, seeds the accumulator,
and can yield `height <= 0`. Downstream `judasSwing` then throws on
non-positive height, turning one bad tick into a pipeline exception instead
of a dropped row.
**Failure scenario:** Single inverted-OHLC row in an otherwise clean Asia
window makes `asiaRange` return `{ high: X, low: Y, height: negative }`;
`judasSwing` throws `requires a positive Asia height` for the whole session.

### WR-04: Resolve hook has no ROOT containment check (path traversal)

**File:** `scripts/resolve-alias.mjs:11-17`
**Summary:** `specifier.slice(2).concat('.ts')` is joined to `ROOT` without
normalization or a starts-with-ROOT assertion. `@/../../outside.ts` resolves
to a path outside the project root; if that file exists it is loaded with
`shortCircuit: true`.
**Failure scenario:** Dev-only loader, so exploitability is low (specifiers
are static imports, not user input). Still, any future dynamic specifier
construction turns this into arbitrary-file load. Add
`path.normalize` + `candidate.startsWith(ROOT)` guard and fall through on
escape.

### WR-05: `amdPhase` trusts `judas`/`smt` object shapes

**File:** `src/lib/ict/amd.ts:73-89`
**Summary:** `amdPhase` validates `input` and `asOf` but never validates the
`JudasOutput` envelope it branches on. A malformed judas object
(`{ candidate: 1, confirmed: 1, sweepTime: "abc" }`) is accepted:
`promote` treats truthy `candidate` as real, and
`asOf > "abc" + 2700` evaluates to `false` (string concat → NaN compare),
silently holding `manipulation` instead of throwing.
**Failure scenario:** Upstream refactor passes a partial/mocked judas through
the e2e path; AMD returns a confident-looking phase/reason on garbage input
rather than failing at the boundary like `judasSwing` does for its range.

### WR-06: Budget synthesis uses fixed-offset day/hour arithmetic

**File:** `scripts/judas-budget.ts:49-55`
**Summary:** `epochOf` anchors one `fromZonedTime` instant then adds
`dayOffset * 86400 + hour * 3600`. This is fixed UTC-offset arithmetic, the
exact pattern `asia.ts`/`judas.ts` prohibit at call time. Safe for the pinned
June-2026 (EDT, no transition in window) run, but fragile: moving `BASE_*` or
`SESSIONS` across a DST boundary silently shifts synthesized 20:00/02:00 wall
clocks while `sessionDateOf`/`nyMinutesOf` resolve true wall clock.
**Failure scenario:** Base date moved to March/October for a DST-budget run;
`epochOf(day, 20, 0)` lands an hour off true 20:00 NY, Asia bucketing splits
sessions and the BUDGET line measures the wrong windows without error.

## Info

### IN-01: `nyMinutesOf` triplicated across asia/judas/amd

**File:** `src/lib/ict/amd.ts:63-67`
**Summary:** Identical `formatInTimeZone(H)`/`(m)` minute-resolution helper is
copy-pasted in `asia.ts:46`, `judas.ts:60`, `amd.ts:63` with the same D-07
comment. Drift risk (one copy fixed, others not).
**Fix:** Extract to a shared `nyMinutesOf` in `aggregate.ts` (next to `NY_TZ`)
and import.

### IN-02: Dead `void rand` statement in budget script

**File:** `scripts/judas-budget.ts:123`
**Summary:** `void rand;` after building killzone rows is a no-op — `rand` is
already consumed via the `jitter` closures. Suppresses nothing; confuses the
next reader into thinking the parameter is unused.

### IN-03: Claimed-branch coverage gaps in all three suites

**File:** `src/lib/ict/judas.test.ts:168`
**Summary:** Notable untested branches: judas sweep at exactly the 02:00 edge
(05:00 exact is tested, 02:00 exact is not); non-finite OHLC / non-positive
time drop in judas (tested in asia, not judas); null/zero-height/invalid
`dispMult` throws; both-sides sweep priority; out-of-order + duplicate-timestamp
dedupe in judas; amd `confirmed + null sweepTime` hold-manipulation branch;
amd NY-boundary 570/960 exact minutes; amd invalid-input/`asOf` throws;
asia zero/negative-time drop (NaN tested, 0/negative not).
**Fix:** Add the missing edge fixtures mirroring the existing
`nyMinuteEpoch`/`nyHourEpoch` style.

### IN-04: NY-unavailable branch discards SMT suffix by design

**File:** `src/lib/ict/amd.ts:138-143`
**Summary:** Gate 4 replaces the assembled reason (including any SMT agree /
suppressed suffix) wholesale with `REASON_NY_UNAVAILABLE`. Phase is preserved,
so this matches the "never guess from clock alone" comment — recorded here so
a future reader does not "fix" it into appending the SMT tag.

## Verdict

No critical (ship-stopper) defects found: killzone strict inequality
(`<= 120`, `>= 300`), 20:00-inclusive/00:00-exclusive Asia edges, DST-aware
per-candle wall-clock resolution, forming-row exclusion, sort-plus-dedupe
purity, and displacement `dist + TOL_EPS >= threshold` math all check out
against the fixtures. The six warnings above are real but bounded:
double-sided sweep priority, unvalidated `sessionDate`, missing
`high >= low` guard, unconstrained alias resolution, unvalidated AMD judas
shape, and DST-fragile budget synthesis. Recommend fixing WR-02 through WR-05
before shipping (cheap input guards + containment check) and documenting or
handling WR-01/WR-06 explicitly.
