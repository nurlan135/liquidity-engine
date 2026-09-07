# Phase 07: SMT + 4H/1H Sequencing Math - Pattern Map

**Mapped:** 2026-09-07
**Files analyzed:** 7 (3 new modules + 3 test files + 1 prose helper/fixtures)
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/ict/smt.ts` | service (pure detector) | transform (joined rows → signal) | `src/lib/ict/regime.ts` | role-match |
| `src/lib/ict/fvg.ts` | service (pure detector) | transform (D1 scan → map + transition) | `src/lib/ict/range.ts` | role-match |
| `src/lib/ict/aggregate.ts` | utility (pure transform) | batch (1H rows → 4H blocks) | `src/lib/ict/join.ts` | role-match |
| `src/lib/ict/delivery.ts` or prose export in `fvg.ts` (§2 sentence) | utility (prose builder) | transform (state → string) | `src/lib/ict/dol.ts` | role-match |
| `src/lib/ict/smt.test.ts` | test | batch (fixtures) | `src/lib/ict/rollover.test.ts` | exact |
| `src/lib/ict/fvg.test.ts` | test | batch (fixtures) | `src/lib/ict/range.test.ts` | exact |
| `src/lib/ict/aggregate.test.ts` | test | batch (fixtures) | `src/lib/ict/join.test.ts` + `src/lib/time.test.ts` | role-match |
| `src/lib/__fixtures__/smt-*.json` | config (fixture data) | file-I/O (JSON loaded by tests) | `src/lib/__fixtures__/join-misaligned.json` | exact |

## Pattern Assignments

### `src/lib/ict/smt.ts` (service, transform)

**Analog:** `src/lib/ict/regime.ts` (lines 1-67)

**Imports pattern** (lines 1-2):
```typescript
import type { Candle, RegimeOutput, RegimeState } from '@/src/lib/ict/types';
import { closedOnly } from '@/src/lib/ict/types';
```
Copy: `@/`-aliased type imports from `types.ts`, then value import `closedOnly` on its own line. smt.ts adds `detectRollover`, `computeATR` imports in the same style.

**Named-constant pattern** (lines 4-6):
```typescript
export const ATR_PERIOD = 14;
export const REGIME_AVG_WINDOW = 20;
export const MIN_CANDLES_FULL = 34;
```
Copy: `export const` caps constants at module top, pinned by test. smt.ts adds `SWING_K = 2`, `SMT_TOL_BPS = 25`, `CORR_WINDOW = 20`, `CORR_MIN = 0.70` in the same position.

**Input-validation pattern** (lines 16-19):
```typescript
if (!Number.isInteger(period) || period < 1) {
  throw new Error(`computeATR requires a positive integer period, got ${period}`);
}
```
Copy: fail-fast `throw` with echoed value. smt.ts validates `toleranceBps > 0`, window ≥ 2 the same way (see also `rollover.ts:39-41` finite-ATR guard, `dol.ts:7-9` finite guard).

**Honest-degrade pattern** (lines 42-51):
```typescript
export function computeRegime(candles: Candle[]): RegimeOutput {
  const closed = closedOnly(candles);
  if (closed.length < MIN_CANDLES_FULL) {
    return {
      regime: 'compression',
      rationale: `Insufficient history (${closed.length} of ${MIN_CANDLES_FULL} closed candles): honest degrade to compression until the ATR window fills.`,
      atr: 0,
      avg: 0,
    };
  }
```
Copy: `closedOnly()` FIRST line, then thin-history early return with reason string carrying `(actual of required)` counts, never a guess. SMT gate: `joined.length < CORR_WINDOW` → suppressed/thin-history before any Pearson or swing work; suppressed envelope `{ suppressed: true, reason: 'CORR_DECOUPLED' | 'rollover-week', corr? }`.

**Pure-function discipline:** no `Date.now`/`new Date()` inside; `asOf` injected as parameter (see `rollover.ts:33-38` signature `(candles, atr, asOf, contractHint)`). Gate order: correlation → rollover → match (cheapest pre-filter first per D-07 + Open Q1 recommendation).

---

### `src/lib/ict/fvg.ts` (service, transform)

**Analog:** `src/lib/ict/range.ts` (lines 1-34)

**Imports pattern** (lines 1-2):
```typescript
import type { Candle, DealingRange } from '@/src/lib/ict/types';
import { closedOnly } from '@/src/lib/ict/types';
```

**Closed-first + windowed scan pattern** (lines 6-17):
```typescript
export function computeRange(candles: Candle[], asOf: string, window: number = ANCHOR_WINDOW): DealingRange {
  const closed = closedOnly(candles);
  const rows = closed.slice(Math.max(0, closed.length - window));
  if (rows.length === 0) {
    throw new Error('computeRange requires at least one closed candle');
  }
  let high = rows[0].high;
  let low = rows[0].low;
  for (const c of rows) {
    if (c.high > high) high = c.high;
    if (c.low < low) low = c.low;
  }
```
Copy: `closedOnly` → window slice → empty-throw → linear scan. FVG map: 3-candle gap scan on NQ D1 closed candles, close-through mitigation removes gaps, `slice(-20)` bound after each update.

**Return-shape pattern** (lines 19-26): return `{ high, low, eq, window, asOf, thinHistory }` — data object with `asOf` threaded through and `thinHistory: closed.length < window` flag. FVG returns `{ state: 'ERL' | 'IRL', originFvg, triggerCandle }`.

**Do-NOT-copy warning:** `range.ts` EXTENDS extremes on wick pierce (see `range.test.ts:37-57`); FVG transition does the opposite — pierce alone fires nothing, only wick-pierce + same-candle close-back flips state. Separate modules/tests.

---

### `src/lib/ict/aggregate.ts` (utility, batch)

**Analog:** `src/lib/ict/join.ts` (lines 1-92)

**Forming-boundary re-validation pattern** (lines 55-58):
```typescript
const nqClosed = nq.filter((c) => !c.forming);
const esClosed = es.filter((c) => !c.forming);
```
Copy: filter `!forming` at the module boundary FIRST even if the caller promises clean inputs (comment cites D-15/T-06-05). aggregate.ts calls `closedOnlyIntraday()` (`types.ts:64-66`) before bucketing.

**Finite-OHLC guard pattern** (lines 34-41, 57-58):
```typescript
function hasFiniteOhlc(c: IntradayCandle): boolean {
  return (
    Number.isFinite(c.open) &&
    Number.isFinite(c.high) &&
    Number.isFinite(c.low) &&
    Number.isFinite(c.close)
  );
}
```
Copy verbatim into aggregate.ts boundary (join precedent for V5 NaN-poisoning defense).

**Deterministic-output pattern** (lines 67-80): dedupe via `seen` Set, emit ascending (`joined.sort((a, b) => a.time - b.time)`). aggregate.ts: chronological OHLC (open = first open, high = max, low = min, close = last close), emit as `Candle { date, open, high, low, close }` (`types.ts:1-8`), ONLY blocks with exactly 4 constituents — drop trailing partial silently.

**TZ-anchor pattern** — from `src/lib/time.ts` (lines 1-8):
```typescript
import { formatInTimeZone, getTimezoneOffset } from 'date-fns-tz';
export const BAKU_TZ = 'Asia/Baku';
export const CME_TZ = 'America/Chicago';
```
Copy: `getTimezoneOffset('America/New_York', ms)` per candle for the 18:00 ET grid; NY wall-clock hour = hour of `(time*1000 + offset)`; block index = `floor((hours-since-18:00-ET) / 4)`. Never a `+4`/`+5` literal. DST fixtures mirror `time.test.ts:18-36` March/November pair pattern. Never synthesize maintenance-break filler candles.

---

### §2 delivery-sentence helper (utility, transform)

**Analog:** `src/lib/ict/dol.ts` (lines 1-22)

**Pattern** (lines 6-22):
```typescript
export const DOL_HIGH_NAME = 'Range High / PDH';
export const DOL_LOW_NAME = 'Range Low / PDL';

export function computePrimaryDOL(range: DealingRange, bias: BiasDirection, lastPrice: number): DOLTarget {
  if (!Number.isFinite(range.high) || !Number.isFinite(range.low) || !Number.isFinite(lastPrice)) {
    throw new Error('computePrimaryDOL requires finite high, low, and lastPrice');
  }
  if (bias === 'BULLISH') {
    return { name: DOL_HIGH_NAME, price: range.high };
  }
  ...
```
Copy: exported name constants + finite-guard-throw + deterministic branch-to-value. Recommendation (RESEARCH Open Q3): export pure `describeDeliveryTransition(state): string` from the FVG module beside `computePrimaryDOL`'s consumers — neutral wording following trap-vs-genuine prose precedent, no new report section. Pin with string tests.

---

### `src/lib/ict/smt.test.ts` (test, batch)

**Analog:** `src/lib/ict/rollover.test.ts` (lines 1-64)

**Test-file pattern:**
```typescript
import { describe, expect, it } from 'vitest';
import type { Candle } from '@/src/lib/ict/types';
import { ANCHOR_WINDOW, computeRange } from '@/src/lib/ict/range';
import { detectRollover, ROLLOVER_ATR_MULT } from '@/src/lib/ict/rollover';

function candle(date: string, price: number, overrides: Partial<Candle> = {}): Candle {
  return { date, open: price, high: price + 15, low: price - 12, close: price + 5, ...overrides };
}

function trend(n: number, startPrice: number, startDay = 5): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const day = String(startDay + i).padStart(2, '0');
    out.push(candle(`2026-01-${day}`, startPrice + i * 10));
  }
  return out;
}
```
Copy: `vitest` imports, `@/`-aliased module imports, small `candle()` + `trend()` synthetic builders with `Partial<Candle>` overrides, `describe` per behavior with literal expected values. Required cases: bull, bear, choppy ±1-bar → NO-SIGNAL, lookback-shift ±2 bars → no flip, corr < 0.70 → CORR_DECOUPLED + matching skipped, zero-variance leg → suppressed, NQ-gaps/ES-clean → `rollover-week`. Also: exact-25bps edge, `closedOnly` assertion, constant-value tests (`expect(SMT_TOL_BPS).toBe(25)` mirroring line 61-63).

**Strict-greater-than precedent** (lines 28-33): gap exactly equal to tripwire leaves flag clear — pin the same edge semantics for the 25 bps tolerance.

---

### `src/lib/ict/fvg.test.ts` (test, batch)

**Analog:** `src/lib/ict/range.test.ts` (rolling-extremes precedent, cited RESEARCH:37-57) + `rollover.test.ts` builder pattern above.

Copy the same `candle()`/`trend()` builders and `describe`/`it` structure. Required cases: bullish + bearish detection, close-through mitigation removes gap, map bounded ≤ 20 (200-bar fixture), sweep-then-reject → transition, sweep-alone (pierce, close outside) → NO transition + gap stays active, §2 sentence builder string test.

---

### `src/lib/ict/aggregate.test.ts` (test, batch)

**Analog:** `src/lib/ict/join.test.ts` (lines 1-60) + `src/lib/time.test.ts` (lines 18-36)

**Join-test patterns to copy:**
```typescript
import misaligned from '@/src/lib/__fixtures__/join-misaligned.json';
// row() builder with STEP = 3600, NQ_BASE/ES_BASE price bases (lines 6-19)
expect(coverage).toEqual({ nq: 20, es: 17, joined: 14, dropped: 7 }); // exact-count assertions
```
Copy: JSON fixture import via `@/` alias, epoch-second `row()` builders, exact-count assertions, ascending/dedupe invariants, forming-exclusion-on-regress test.

**Time-test patterns to copy** (lines 18-36): March spring-forward + November fall-back pairs asserting the same wall-clock bucket both sides of each transition via `getTimezoneOffset`. Aggregate mirrors this: March + November fixtures asserting 4H block boundaries land on the same NY wall-clock both sides. Plus: partial-trailing-block exclusion, consecutive-poll byte-identical test, `Candle`-shape reuse test feeding blocks into `computeRange`/`computeBias` unchanged.

---

### `src/lib/__fixtures__/smt-*.json` (fixture data)

**Analog:** `src/lib/__fixtures__/join-misaligned.json` (consumed at `join.test.ts:4,23-29`)

Copy: plain `{ nq: [...], es: [...] }` JSON arrays loaded with a single import; no schema wrapper. New fixtures: bull/bear/choppy/roll-week matched pairs alongside the existing pattern.

## Shared Patterns

### Purity (applies to ALL new modules)
**Source:** `src/lib/ict/join.ts:43-50` + repo-wide grep (zero `Date.now`/`new Date()` in `src/lib/ict`)
```typescript
// D-07: timestamp inner-join on numeric epoch time only — never index zipping,
// so misaligned rows can never be compared. Pure: no wall-clock reads, no I/O.
```
Every new function takes injected `asOf` + explicit candle windows; zero I/O, zero `Date.now`. Phase-gate grep must stay clean. No store imports (selectors derive in Phases 8–9).

### Error Handling (applies to ALL new modules)
**Source:** `src/lib/ict/rollover.ts:39-41`, `src/lib/ict/dol.ts:7-9`, `src/lib/ict/regime.ts:18-20`
```typescript
if (!Number.isFinite(atr) || atr < 0) {
  throw new Error(`detectRollover requires a finite non-negative ATR, got ${atr}`);
}
```
Fail-fast `throw` on non-finite/bad inputs at every module boundary (V5/ASVS). Thin-history → honest-degrade value with reason string (never throw, never guess). Detection outputs never self-update.

### Rollover reuse (applies to `smt.ts`)
**Source:** `src/lib/ict/rollover.ts:4,43-50`
```typescript
export const ROLLOVER_ATR_MULT = 3;
const tripwire = ROLLOVER_ATR_MULT * atr;
for (let i = 1; i < closed.length; i++) {
  if (Math.abs(closed[i].close - closed[i - 1].close) > tripwire) {
```
Call `detectRollover` per symbol with per-leg `computeATR(legD1).at(-1)` ATR and the SHARED multiplier; strict-`>` semantics. Either suspect → `{ suppressed: true, reason: 'rollover-week' }`. Raw OHLC only — grep-ban `adjclose`. Per-leg ATR per Open Q2; thin-history leg → non-suspect, never suspect.

### Suppressed-envelope vocabulary (applies to `smt.ts`, consumed Phase 9 §3)
**Source:** `src/lib/ict/regime.ts:44-50` degrade branch + `src/lib/ict/rollover.ts:51-54` proximityWarning
```typescript
const proximityWarning = isNearRolloverWeek(asOf)
  ? `Near quarterly rollover week (third Friday of Mar/Jun/Sep/Dec) at ${asOf}: treat gaps as contract-roll artifacts first.`
  : null;
```
One honest pattern, two reasons: `'CORR_DECOUPLED'` (with `corr` value) and `'rollover-week'` (rendered "SMT unavailable — contract roll week", never a weak signal). §3 renders reasons verbatim.

### Validation / test commands (applies to ALL test files)
- Per-file: `npm test -- src/lib/ict/smt.test.ts` (likewise fvg, aggregate)
- Full gate: `npm test` — existing range/bias/dol/regime/rollover/join tests are the no-regression gate; D1 NQ anchor path stays byte-identical.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Pearson `pearsonCorr` zero-variance guard | — | — | No correlation math exists in-repo; textbook formula + guard (zero variance → decoupled/suppressed, never divide) pinned by flat-ES fixture per RESEARCH Pitfall 3 |
| Fractal-k swing matcher body | — | — | No swing detection in-repo; standard fractal definition (strict max/min over k neighbors, equality → no swing) pinned by fixtures per RESEARCH A1 |
| 3-candle FVG constructor | — | — | No FVG code in-repo; construction pinned by fixtures per RESEARCH A3 |

For these three, planner uses RESEARCH.md Patterns 1/3/5 + Assumptions log, wrapped in the house template above (closedOnly-first, finite-guards, named constants, rationale strings).

## Metadata

**Analog search scope:** `src/lib/ict/`, `src/lib/time.ts`, `src/lib/__fixtures__/`
**Files scanned:** 17 tracked files (8 modules + 7 tests + 2 time files; fixtures dir pattern confirmed via join.test.ts import)
**Analog git-tracked check:** `git ls-files` confirms all cited analogs tracked (non-empty output for `src/lib/ict/`, `src/lib/time.ts`, `src/lib/time.test.ts`)
**Pattern extraction date:** 2026-09-07
