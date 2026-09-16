# Phase 19: Pools Math - Pattern Map

**Mapped:** 2026-09-16
**Files analyzed:** 7 (4 new/create, 3 modify/extend)
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/ict/swings.ts` (NEW) | utility (pure math) | transform | `src/lib/ict/smt.ts` (donor, move verbatim) | exact |
| `src/lib/ict/pools.ts` (NEW) | service (pure pipeline: detect→cluster→zone→lifecycle→score→rank→cap) | transform | `src/lib/ict/fvg.ts` (cap + close-through + zone shape) | exact |
| `src/lib/ict/pools.test.ts` (NEW) | test (unit, boundary + lifecycle + ranking) | batch | `src/lib/ict/smt.test.ts` (builder idiom + pin style) | exact |
| `src/lib/ict/swings.test.ts` (NEW, optional) | test (unit, re-homed predicate pins) | batch | `src/lib/ict/smt.test.ts` (predicate sections) | role-match |
| `src/lib/ict/smt.ts` (MODIFIED, imports only) | service (pure detector) | transform | self (move-only extraction, zero behavior change) | exact |
| `src/lib/store.ts` (MODIFIED, add selectPools) | store (guarded Zustand selector) | request-response | `src/lib/store.ts` `selectSMT` (lines 810-819) + `selectTriggerPure` (lines 886-914) | exact |
| `src/lib/store.test.ts` (EXTENDED, POOL-06 matrix) | test (store selector) | request-response | `src/lib/store.test.ts` stale-refusal (lines 967-994) + ticket-refuse-null (lines 1518-1538) | exact |

## Pattern Assignments

### `src/lib/ict/swings.ts` (NEW — utility, transform)

**Analog:** `src/lib/ict/smt.ts` (move verbatim, zero behavior change; `smt.test.ts` green is the gate)

**Imports pattern** (`src/lib/ict/smt.ts` lines 1-4):
```typescript
import type { Candle } from '@/src/lib/ict/types';
import { closedOnly } from '@/src/lib/ict/types';
```

**Constants pattern** (`src/lib/ict/smt.ts` lines 6-14 — move `SWING_K`, keep comment style):
```typescript
// D-02: fractal swing parameter shared by both legs, pinned by test.
export const SWING_K = 2;
// D-02: trailing daily-bar window inside which swings are paired.
export const SWING_LOOKBACK = 60;
```

**Core predicates — copy verbatim** (`src/lib/ict/smt.ts` lines 47-79):
```typescript
// Strict fractal swing high: high[i] is the strict maximum of its k
// neighbors each side. Equality means no swing.
export function isSwingHigh(highs: number[], i: number, k: number): boolean {
  if (!Number.isInteger(k) || k < 1) {
    throw new Error(`isSwingHigh requires a positive integer k, got ${k}`);
  }
  if (i < k || i + k >= highs.length) {
    return false;
  }
  for (let j = i - k; j <= i + k; j++) {
    if (j !== i && highs[j] >= highs[i]) {
      return false;
    }
  }
  return true;
}
// isSwingLow mirrors with lows[j] <= lows[i] (lines 66-79).
```

**Boundary discipline** (`src/lib/ict/smt.ts` lines 81-88 finite-guard; lines 126-131 window slice):
```typescript
function hasFiniteOhlc(c: Candle): boolean {
  return (
    Number.isFinite(c.open) &&
    Number.isFinite(c.high) &&
    Number.isFinite(c.low) &&
    Number.isFinite(c.close)
  );
}
const nqLeg = [...closedOnly(nq).filter(hasFiniteOhlc)]
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  .slice(-SWING_LOOKBACK);
```

**Error handling pattern** (throw on bad scalar params, `false`/empty on boundary — never throw into callers for out-of-range index; see `isSwingHigh` `i < k` → `false`, lines 53-55).

---

### `src/lib/ict/pools.ts` (NEW — service, transform)

**Primary analog:** `src/lib/ict/fvg.ts` (both-polarities-one-pass, zone shape, cap, close-through). **Secondary donors:** `smt.ts` (tolerance + epsilon), `judas.ts` (strict pierce), `regime.ts` (ATR), `dol.ts` (DOL mapping), `trigger.ts` (provisional-constant comment).

**Imports pattern** (`src/lib/ict/fvg.ts` lines 5-6; pools adds regime/dol/swings imports, `Candle[]` only — never `IntradayCandle`):
```typescript
import type { Candle } from '@/src/lib/ict/types';
import { closedOnly } from '@/src/lib/ict/types';
```

**Module header convention** (`src/lib/ict/fvg.ts` lines 1-3 — copy the purity declaration):
```typescript
// Pools map: NQ D1 BSL/SSL stop-cluster inventory with sweep lifecycle.
// Pure: injected candles only, zero store imports, no clock reads.
```

**Cap-constant pattern** (`src/lib/ict/fvg.ts` line 8):
```typescript
export const FVG_MAP_BOUND = 20;   // pools mirror: export const POOL_MAP_BOUND = 20;
```

**Both-polarities-one-pass pattern** (`src/lib/ict/fvg.ts` lines 50-78):
```typescript
export function detectFVGs(candles: Candle[]): FvgGap[] {
  if (!Array.isArray(candles)) {
    throw new Error(`detectFVGs requires a Candle array, got ${String(candles)}`);
  }
  const closed = closedOnly(candles).filter(isFiniteCandle);
  const gaps: FvgGap[] = [];
  for (let i = 1; i + 1 < closed.length; i++) {
    // ... bullish push + bearish mirror in the same loop
  }
  return gaps;
}
```
Pools translation: one scan, swing highs → BSL candidates / swing lows → SSL candidates, opposite polarity.

**Stale-origin rule — copy verbatim** (`src/lib/ict/fvg.ts` lines 37-43, 97-101):
```typescript
// A stale origin is untestable, not an error — callers skip it
function originIndexOrNeg1(closed: Candle[], originDate: string): number {
  return closed.findIndex((c) => c.date === originDate);
}
// ... inside lifecycle:
if (origin === -1) {
  active.push({ ...gap, mitigated: false });
  continue;
}
```

**Close-through (CONSUMED) — copy verbatim** (`src/lib/ict/fvg.ts` lines 102-109):
```typescript
for (let j = origin + 1; j < closed.length; j++) {
  const close = closed[j].close;
  if (gap.polarity === 'BULLISH' ? close < gap.bottom : close > gap.top) {
    filled = true;
    break;
  }
}
```
Pool translation: BSL consumed on strictly-later close above `zone.top`; SSL on close below `zone.bottom`. Wick pierce with close back inside = SWEPT, never consumed.

**WR-07 origin-sort-before-slice — copy verbatim** (`src/lib/ict/fvg.ts` lines 114-118):
```typescript
// WR-07: sort by originDate before the trailing-20 slice so the map and the
// transition layer (which sorts identically) agree on what is current, even
// for unsorted gap input.
active.sort((a, b) => (a.originDate < b.originDate ? -1 : a.originDate > b.originDate ? 1 : 0));
return active.slice(-FVG_MAP_BOUND);
```

**Sweep-then-reject idiom** (`src/lib/ict/fvg.ts` lines 157-166 — pierce + reject same candle; pools apply per-pool status instead of ERL/IRL flip):
```typescript
for (let j = origin + 1; j < closed.length; j++) {
  const c = closed[j];
  if (c.date > asOf) continue;
  const pierced = gap.polarity === 'BULLISH' ? c.low < gap.bottom : c.high > gap.top;
  if (!pierced) continue;
  const rejected = gap.polarity === 'BULLISH' ? c.close >= gap.bottom : c.close <= gap.top;
```

**Strict pierce (SWEPT) — copy verbatim** (`src/lib/ict/judas.ts` lines 141-142; both-extremes resolution lines 143-148):
```typescript
const highPierced = r.high > (asiaHigh as number);
const lowPierced = r.low < (asiaLow as number);
```
Pool translation: BSL swept when strictly-later `high > zone.top`; SSL when `low < zone.bottom`. Touch (`==`) is not a sweep — pin it. First chronological sweep wins; retests never re-promote.

**Tolerance-constant + epsilon idiom** (`src/lib/ict/smt.ts` lines 7-9; `src/lib/ict/smt.ts` lines 293-297):
```typescript
export const SMT_TOL_BPS = 25;   // EQUAL_TOL_BPS ~25 mirrors this line (D-02)
const TOL_EPS_BPS = 1e-9;
// gap-vs-tolerance compare: `holdGapBps - toleranceBps > TOL_EPS_BPS`
```

**ATR denominator + short-history edges** (`src/lib/ict/regime.ts` lines 16-23, 42-50):
```typescript
export function computeATR(candles: Candle[], period: number = ATR_PERIOD): number[] {
  if (!Number.isInteger(period) || period < 1) {
    throw new Error(`computeATR requires a positive integer period, got ${period}`);
  }
  const closed = closedOnly(candles);
  if (closed.length < period + 1) {
    return [];
  }
```
Plus `computeRegime` degrades to `atr: 0` on short history (lines 42-50). Scorer must branch on zero/empty ATR explicitly — never divide by zero, never let `NaN` into a sort comparator.

**DOL mapping** (`src/lib/ict/dol.ts` lines 6-22):
```typescript
export function computePrimaryDOL(range: DealingRange, bias: BiasDirection, lastPrice: number): DOLTarget {
  if (bias === 'BULLISH') {
    return { name: DOL_HIGH_NAME, price: range.high };
  }
  if (bias === 'BEARISH') {
    return { name: DOL_LOW_NAME, price: range.low };
  }
  // COMPRESSION → nearer extreme
}
```
Scorer: `dolBoost = 2.0` when pool side matches DOL direction (BSL ↔ range high, SSL ↔ range low), else `1.0`.

**Provisional-constant comment — copy verbatim** (`src/lib/ict/trigger.ts` lines 20-30):
```typescript
/** Killzone open in NY wall-clock minutes since midnight, exclusive (D-01). */
// CALIBRATION-PROVISIONAL: seeded 2026-09-10, unobserved live. Acceptance band 1-4 fires/week (TRIG-04).
export const TRIGGER_KZ_START_MIN = 120;
```
Every pool ranking constant (`EQUAL_TOL_BPS`, `POOL_MAP_BOUND`, `MERGE_ATR_MULT`, `DOL_BOOST`, `BEHIND_PENALTY`) ships exported + boundary-pinned + `CALIBRATION-PROVISIONAL`.

**Locked shape literals** (RESEARCH Pattern 3): `{ side, top, bottom, touches, weight, originDate, status }` with `side: 'BSL' | 'SSL'`, `status: 'ACTIVE' | 'SWEPT' | 'CONSUMED'` — quote verbatim. Model on `FvgGap` (`src/lib/ict/fvg.ts` lines 12-18).

**`asOf` discipline** (`src/lib/ict/fvg.ts` lines 148-150, 157-159): injected plain-string date, `if (c.date > asOf) continue;` — never a clock read.

---

### `src/lib/ict/pools.test.ts` (NEW — test, batch)

**Analog:** `src/lib/ict/smt.test.ts`

**Builder idiom — copy verbatim** (`src/lib/ict/smt.test.ts` lines 16-29):
```typescript
// Builder helpers in the rollover.test.ts style: explicit high/low rails per
// bar with the open/close pinned to the midpoint (finite, neutral).
function leg(n: number, highs: number[], lows: number[], startDay = 5): Candle[] {
  if (highs.length !== n || lows.length !== n) {
    throw new Error(`leg requires ${n} highs and lows, got ${highs.length}/${lows.length}`);
  }
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const day = String(startDay + i).padStart(2, '0');
    const mid = (highs[i] + lows[i]) / 2;
    out.push({ date: `2026-01-${day}`, open: mid, high: highs[i], low: lows[i], close: mid });
  }
  return out;
}
```

**Constant-pin idiom** (`src/lib/ict/smt.test.ts` lines 112-117):
```typescript
it('locked constants are pinned: SWING_K 2, SMT_TOL_BPS 25, CORR_WINDOW 20, CORR_MIN 0.70', () => {
  expect(SWING_K).toBe(2);
  // ...
  expect(SWING_LOOKBACK).toBe(60);
```

**Fixture style** (`src/lib/ict/smt.test.ts` lines 35-39 — named rail arrays + comment stating setup and expected verdict):
```typescript
// Bear fixture: both legs print swing highs at bar 4 and bar 10. NQ takes its
// prior high (20200 -> 20300) while ES holds below its own ...
const BEAR_NQ_HIGHS = [20000, 20010, 20050, ...];
```

**Test matrix for pools.test.ts** (from RESEARCH Validation Architecture): equality-cluster (3 bps yes / 200 bps no), min-2-touches, triple-outranks, diminishing 4th/5th, swept-keeps-bonus, ATR-merge boundary, lifecycle (pierce vs close-through vs touch), scorer ordering (DOL-side nearest ACTIVE first), over-cap newest-N cut, zero-ATR branch, empty/single-bar/unsorted/non-finite boundaries.

---

### `src/lib/ict/swings.test.ts` (NEW, optional — test, batch)

**Analog:** `src/lib/ict/smt.test.ts` predicate sections (same builder + constant pins, re-homed). Only needed if extraction is chosen; `smt.test.ts` stays green regardless. Keep minimal: strict-fractal edges (equality = no swing), `k` validation throws, boundary indices.

---

### `src/lib/ict/smt.ts` (MODIFIED — imports only)

**Pattern:** move-only extraction. Replace lines 1-14 + 47-79 bodies with re-export from `./swings`:
```typescript
import { SWING_K, SWING_LOOKBACK, isSwingHigh, isSwingLow } from '@/src/lib/ict/swings';
```
Keep `SMT_TOL_BPS`, `CORR_WINDOW`, `CORR_MIN` in place. Touch nothing else — `smt.test.ts` green is the gate. (RESEARCH Open Question 2: fall back to direct `smt.ts` import in pools if the diff touches anything beyond imports.)

---

### `src/lib/store.ts` (MODIFIED — add `selectPools`)

**Analog:** `selectSMT` guard (lines 810-819) + `selectTriggerPure` envelope (lines 886-914) + `sharedEpoch` (lines 465-469).

**`sharedEpoch` — call verbatim, single time truth** (`src/lib/store.ts` lines 465-469):
```typescript
function sharedEpoch(get: () => DashboardState): number {
  const iso = get().nq1h.lastUpdatedISO;
  const parsed = iso === null ? NaN : new Date(iso).getTime();
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : Math.floor(new Date().getTime() / 1000);
}
```

**Guard shape — copy `selectSMT`** (`src/lib/store.ts` lines 810-819):
```typescript
selectSMT: () => {
  const { nq, es, asOfBaku } = get();
  if (nq.stale || es.stale) return null;
  if (nq.candles.length === 0 || es.candles.length === 0) return null;
  try {
    return evaluateSMT(nq.candles, es.candles, asOfBaku);
  } catch {
    return null;
  }
},
```
Pools adaptation: guard on the **NQ D1 leg only** (`nq.stale`, empty closed NQ candles) — ES-stale must not null pools. Thin history is a degrade flag (see below), not a null.

**Derivation envelope — copy `selectTriggerPure`** (`src/lib/store.ts` lines 886-914):
```typescript
selectTriggerPure: () => {
  const { nq, nq1h, nq15m } = get();
  if (nq1h.stale || nq15m.stale) return null;
  if (closedOnlyIntraday(nq1h.candles).length === 0) return null;
  if (closedOnlyIntraday(nq15m.candles).length === 0) return null;
  try {
    const epoch = sharedEpoch(get);
    // ... derive via pure functions, zero set calls
  } catch {
    return null;
  }
},
```
Rules: one `sharedEpoch(get)` call, derive via pure pool functions on the same candle snapshot, try/catch → null, zero `set` calls. Null means degraded — never a throw into render (lines 806-809).

**Degraded/thin flag — copy `selectTicket`** (`src/lib/store.ts` lines 1085-1097):
```typescript
let degraded = { stale: false, thin: false, leg: null as string | null };
// ... resolveThinTier(nq.candles, range); tier !== 'full' → thin
```
`selectPools` surfaces thin history (from `computeRange`, `src/lib/ict/range.ts` lines 19-26: `thinHistory: closed.length < window`) in its output for Phase 20 dimming; stale/empty → null with reason riding `nq.lastError`.

---

### `src/lib/store.test.ts` (EXTENDED — POOL-06 matrix)

**Analog 1: stale-refusal** (`src/lib/store.test.ts` lines 967-994):
```typescript
it('stale-refusal: stale nq1h forces selectAsia null, stale ES forces selectSMT null', async () => {
  const { useDashboard } = await resetDualState();
  stubFourLegs();
  // ...
  useDashboard.setState({
    nq1h: { ...useDashboard.getState().nq1h, stale: true, lastError: 'intraday stale' },
  });
  expect(useDashboard.getState().selectAsia()).toBeNull();
  expect(useDashboard.getState().nq1h.lastError).toBe('intraday stale');
```

**Analog 2: ticket-refuse-null + never-throws** (`src/lib/store.test.ts` lines 1518-1538):
```typescript
it('ticket-refuse-null: stale trigger-critical legs yield null with lastError preserved', async () => {
  // ...
  expect(() => {
    stale = useDashboard.getState().selectTicket();
  }).not.toThrow();
  expect(stale).toBeNull();
  expect(useDashboard.getState().nq15m.lastError).toBe('15m stale');
```

**POOL-06 matrix to add** (same `resetDualState` + `setState` + `not.toThrow` idioms): null on stale NQ leg; null on empty NQ leg; ES-stale does **not** null pools; never throws on garbage; single sharedEpoch (back-to-back calls agree — cf. ticket-coherence, lines 1559+).

---

## Shared Patterns

### Purity (applies to ALL new `src/lib/ict/` files)
**Source:** `src/lib/ict/purity.test.ts` (lines 8-44) + `src/lib/ict/fvg.ts` (lines 1-2)
- No `Date.now(`, no zustand/store imports — self-scanned via `import.meta.glob('./*.ts', { query: '?raw' })`; test files excluded. Green from first commit; no exclusions added.
- Injected `(candles, asOf)` only; `asOf` is a plain-string date parameter.
```typescript
function hasStoreImport(text: string): boolean {
  return (
    text.includes("'zustand'") ||
    text.includes('"zustand"') ||
    text.includes("'src/lib/store'") ||
    // ... (full list at purity.test.ts:18-29)
  );
}
```

### Input Validation (applies to all pure entry points)
**Source:** `src/lib/ict/fvg.ts` (lines 51-54, 86-91) + `src/lib/ict/types.ts` (lines 47-49) + `src/lib/ict/range.ts` (lines 19-26)
```typescript
if (!Array.isArray(candles)) {
  throw new Error(`detectFVGs requires a Candle array, got ${String(candles)}`);
}
const closed = closedOnly(candles).filter(isFiniteCandle);
```
- Array-type `got-string` throws, `closedOnly` forming-row drop, finite-OHLC drop, chronological-sort copies (never mutate caller arrays), `thinHistory: closed.length < window` degrade signal.

### Error Handling
**Source:** `src/lib/store.ts` (lines 806-819) for selectors; `src/lib/ict/smt.ts` (lines 50-55) for pure math
- Pure math: throw on invalid scalar params (`k`, `toleranceBps`, `period`); return `false`/`[]` on data boundaries (out-of-range index, short history).
- Selectors: every detector call in try/catch → null. Null means degraded — never a throw into render.

### Type Wall (applies to `pools.ts`)
**Source:** `src/lib/ict/types.ts` (lines 1-8, 51-66)
- Pool module takes `Candle[]` (D1 date strings) only. Never imports `IntradayCandle`, killzone constants, or `nyMinutesOf`. Sweep inputs arrive as pre-computed read-only outputs if needed at the selector level — never recomputed on intraday rows inside the pool module.

### Test Conventions (applies to all new test files)
**Source:** `src/lib/ict/smt.test.ts` (lines 1-39, 112-117) + `src/lib/store.test.ts` (lines 967-994, 1518-1538)
- vitest, `include: ['src/**/*.test.ts', 'app/**/*.test.ts']`, `testTimeout: 15000` (`vitest.config.ts`).
- `leg()` rail builder with midpoint open/close; named fixture arrays with setup→verdict comments; locked-constant pins; store tests use `resetDualState` + `setState` stale flips + `not.toThrow` + `lastError` preservation asserts.
- Sampling: per-commit `npm test -- src/lib/ict/pools.test.ts src/lib/ict/smt.test.ts src/lib/ict/purity.test.ts`; per-wave `npm test` (420-test baseline stays green per D-24).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | None. Every Phase 19 file has a tested house analog: equality clustering is the only genuinely new logic (tolerance idiom from `smt.ts` applies), and the scorer formula composes `computeATR` + `computePrimaryDOL` + provisional-constant conventions. The planner should still define the D-05 diminishing-bonus curve explicitly (RESEARCH A2 — principle locked, formula open) and pin it with boundary tests. |

## Metadata

**Analog search scope:** `src/lib/ict/` (smt, fvg, judas, regime, dol, types, trigger, range, purity.test, smt.test) + `src/lib/store.ts` + `src/lib/store.test.ts`
**Files scanned:** 12 (7 analog sources + CONTEXT + RESEARCH + AGENTS.md + phase dir listing)
**Analog git-tracked check:** all 12 analog paths verified via `git ls-files` (non-empty); no mirror paths emitted
**Skills check:** `.agents/skills/` and `.claude/skills/` do not exist — no project skills to load
**Pattern extraction date:** 2026-09-16
