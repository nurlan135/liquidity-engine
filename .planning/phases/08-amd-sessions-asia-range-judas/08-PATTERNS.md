# Phase 08: AMD Sessions (Asia Range + Judas) - Pattern Map

**Mapped:** 2026-09-07
**Files analyzed:** 6 (3 modules + 3 test files)
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/ict/asia.ts` | utility (pure detector) | batch (windowed aggregation) | `src/lib/ict/aggregate.ts` | exact |
| `src/lib/ict/asia.test.ts` | test | batch | `src/lib/ict/aggregate.test.ts` | exact |
| `src/lib/ict/judas.ts` | utility (pure detector) | request-response (gated detection) | `src/lib/ict/fvg.ts` | exact |
| `src/lib/ict/judas.test.ts` | test | request-response | `src/lib/ict/aggregate.test.ts` | role-match |
| `src/lib/ict/amd.ts` | utility (pure classifier) | transform (fusion) | `src/lib/ict/smt.ts` | exact |
| `src/lib/ict/amd.test.ts` | test | transform | `src/lib/ict/aggregate.test.ts` | role-match |

## Pattern Assignments

### `src/lib/ict/asia.ts` (utility, batch)

**Analog:** `src/lib/ict/aggregate.ts`

**Imports pattern** (lines 1-3):
```typescript
import { formatInTimeZone } from 'date-fns-tz';
import type { Candle, IntradayCandle } from '@/src/lib/ict/types';
import { closedOnlyIntraday } from '@/src/lib/ict/types';
```

**Constants pattern** (lines 11-16):
```typescript
/** IANA anchor for the 18:00 ET daily-open grid (D-12). */
export const NY_TZ = 'America/New_York';
/** CME equity-index day boundary in NY wall-clock hours (D-12). */
export const DAY_OPEN_NY_HOUR = 18;
/** 1H constituents per 4H block; only complete blocks emit (D-13). */
export const BLOCK_SIZE = 4;
```
Copy: export `NY_TZ` (reuse, do not redefine — import from aggregate.ts), pin `ASIA_START_NY_HOUR = 20` and `ASIA_END_NY_HOUR = 24` as named exported constants with D-01 comment.

**Wall-clock pattern** (lines 41-47):
```typescript
function nyDateOf(timeSec: number): string {
  return formatInTimeZone(timeSec * 1000, NY_TZ, 'yyyy-MM-dd');
}

function nyHourOf(timeSec: number): number {
  return Number(formatInTimeZone(timeSec * 1000, NY_TZ, 'H'));
}
```
Copy: reuse `nyDateOf` shape verbatim; add minute resolution (`'H:mm'` or hour+minute) for the 20:00/00:00 window edges since 1H boundary candles need exact edge classification. Never fixed offsets, never `CME_TZ`.

**Boundary re-validation pattern** (lines 102-108):
```typescript
const closed = closedOnlyIntraday(rows);
const valid = closed.filter((r) => hasFiniteOhlc(r) && hasValidTime(r));
```
Copy: `closedOnlyIntraday` first, then local `hasFiniteOhlc` + `hasValidTime` filters (aggregate.ts:18-33 for both predicates). Asia additionally: ascending sort + timestamp dedupe before min/max (lines 110-120).

**Wick-to-wick aggregation pattern** (lines 163-168):
```typescript
let high = members[0].high;
let low = members[0].low;
for (const m of members) {
  if (m.high > high) high = m.high;
  if (m.low < low) low = m.low;
}
```
Copy: `Math.max(...inWindow.map(r => r.high))` / `Math.min(...inWindow.map(r => r.low))` per D-02; empty window returns `null` (honest-degrade, never throw).

---

### `src/lib/ict/judas.ts` (utility, request-response)

**Analog:** `src/lib/ict/fvg.ts`

**Imports pattern** (lines 5-6):
```typescript
import type { Candle } from '@/src/lib/ict/types';
import { closedOnly } from '@/src/lib/ict/types';
```
Copy: import `IntradayCandle` type + `closedOnlyIntraday` (intraday variant from `src/lib/ict/types.ts:54-66`); no store imports, no clock reads.

**Input-guard pattern** (lines 51-53, 142-150):
```typescript
if (!Array.isArray(candles)) {
  throw new Error(`detectFVGs requires a Candle array, got ${String(candles)}`);
}
if (typeof asOf !== 'string' || asOf.length === 0) {
  throw new Error(`detectTransition requires an asOf date string, got ${String(asOf)}`);
}
```
Copy: throw on non-array candle input; validate `AsiaRange` arg (finite high/low, height > 0) with same `got ${...}` message shape.

**Sweep-then-reject core pattern** (lines 160-164):
```typescript
const pierced = gap.polarity === 'BULLISH' ? c.low < gap.bottom : c.high > gap.top;
if (!pierced) continue;
const rejected = gap.polarity === 'BULLISH' ? c.close >= gap.bottom : c.close <= gap.top;
```
Copy: polarity axis becomes range-side — sweep of Asia high: `c.high > asia.high`, rejection: `c.close <= asia.high` plus displacement `|close − extreme| ≥ DISP_MULT × height`; sweep of Asia low mirrored. Extend from single-candle to sweep + next 3 candles loop (D-10, 4-candle window). Pierce-without-reversal stays `candidate` (never flips, per fvg.ts:133-136 comment "one bad wick cannot whiplash").

**Finite-assert pattern** (lines 29-35):
```typescript
function assertFiniteGap(gap: FvgGap, caller: string): void {
  if (!Number.isFinite(gap.top) || !Number.isFinite(gap.bottom)) {
    throw new Error(
      `${caller} requires finite gap bounds, got top=${gap.top} bottom=${gap.bottom}`,
    );
  }
}
```
Copy: `assertFiniteAsiaRange(range, caller)` with identical shape — NaN never reaches comparators (ASVS V5).

**Killzone gate** (no fvg analog — compose from aggregate.ts:41-47):
Per-candle check via `formatInTimeZone(t * 1000, NY_TZ, ...)` with minute precision; strict inequality both edges (02:00 < t < 05:00); pre-killzone sweep → `preRun: true`, never candidate (D-08).

---

### `src/lib/ict/amd.ts` (utility, transform)

**Analog:** `src/lib/ict/smt.ts`

**Gate-order pipeline pattern** (lines 202-211):
```typescript
export function evaluateSMT(nq: Candle[], es: Candle[], asOf: string): SmtOutput {
  const nqClosed = [...closedOnly(nq).filter(hasFiniteOhlc)].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
```
Copy: `amdPhase(asia, judas, smt, asOf)` takes already-validated detector outputs (no re-validation of candles); fixed gate order — clock skeleton first, Judas promotion second, SMT regime tag third, NY `Gözlənilir` branch last.

**Suppressed-envelope output pattern** (lines 39-45):
```typescript
export interface SmtSuppressed {
  suppressed: true;
  reason: 'CORR_DECOUPLED' | 'rollover-week';
  corr?: number;
}

export type SmtOutput = SmtSignal | SmtSuppressed;
```
Copy: `{ phase, reason, inputs }` per D-16 — `reason` is an Azerbaijani §3-ready string rendered verbatim in Phase 9; NY branch: `{ phase: <prior>, reason: 'Gözlənilir — …', inputs }`. Accept `SmtOutput` read-only: read `direction` only when `suppressed === false` (smt.ts:30-37); never mutate, never re-derive.

**Tolerance-epsilon pattern** (lines 293-297):
```typescript
const TOL_EPS_BPS = 1e-9;
```
Copy if float-boundary compares arise (displacement `≥` edge): same epsilon guard with strict-greater-than semantics comment.

**Narrowing union pattern** (lines 303-307):
```typescript
if (!Number.isFinite(toleranceBps) || toleranceBps <= 0) {
  throw new Error(`detectSMT requires a finite positive toleranceBps, got ${toleranceBps}`);
}
```
Copy: validate `DISP_MULT`-style numeric params (finite, positive) with identical message shape.

---

### Test files (`asia.test.ts`, `judas.test.ts`, `amd.test.ts`)

**Analog:** `src/lib/ict/aggregate.test.ts`

**Fixture-builder pattern** (lines 13-22):
```typescript
function row(time: number, price: number, overrides: Partial<IntradayCandle> = {}): IntradayCandle {
  return {
    time,
    open: price,
    high: price + 8,
    low: price - 6,
    close: price + 3,
    ...overrides,
  };
}
```
Copy verbatim into each test file (with `forming: true` override cases for forming-exclusion tests).

**DST-fixture helper pattern** (lines 28-34):
```typescript
import { fromZonedTime } from 'date-fns-tz';

function nyHourEpoch(nyDate: string, nyHour: number): number {
  return Math.floor(fromZonedTime(`${nyDate} ${String(nyHour).padStart(2, '0')}:00:00`, NY_TZ).getTime() / 1000);
}
```
Copy verbatim (do not reinvent). Triple-test pins: March spring-forward instant 2026-03-08 07:00Z, November fall-back instant 2026-11-01 06:00Z (aggregate.test.ts:70-91 pair-test shape).

**Window-builder pattern** (lines 37-45):
```typescript
function block8(nyDate: string, startHour: number, price = BASE): IntradayCandle[] {
  const rows: IntradayCandle[] = [];
  let t = nyHourEpoch(nyDate, startHour);
  for (let i = 0; i < 8; i++) {
    rows.push(row(t, price + i * 2));
    t += STEP;
  }
  return rows;
}
```
Copy: `STEP = 3600` for asia (1H), `STEP = 900` for judas (15M); build Asia 20:00-window, killzone 02:00–05:00, pre-killzone 01:47, post-midnight 00:00–02:00 fixtures from this shape.

**Determinism assertion** (lines 94-100): consecutive polls on same input return deep-equal output — copy into detector tests (PITFALLS P6 guard).

---

## Shared Patterns

### Boundary re-validation (T-07-01)
**Source:** `src/lib/ict/aggregate.ts:102-108` + `src/lib/ict/join.ts:51-58`
**Apply to:** `asia.ts`, `judas.ts` entry points
```typescript
const closed = closedOnlyIntraday(rows);
const valid = closed.filter((r) => hasFiniteOhlc(r) && hasValidTime(r));
```
Forming drop first, finite-OHLC + finite-positive-time second. `amd.ts` consumes validated outputs — no candle validation there.

### Purity (no clock reads)
**Source:** `src/lib/ict/aggregate.ts:102` (`asOf: string` injected), `src/lib/ict/fvg.ts:137-141`
**Apply to:** all three modules
`asOf` always injected; zero `Date.now` / `new Date()` in `src/lib/ict` (grep gate at phase end). Module header comment states purity contract (aggregate.ts:5-9 shape).

### Array-input guards (ASVS V5)
**Source:** `src/lib/ict/fvg.ts:51-53`, `src/lib/ict/smt.ts:117-120`
**Apply to:** all three modules
```typescript
if (!Array.isArray(candles)) {
  throw new Error(`detectFVGs requires a Candle array, got ${String(candles)}`);
}
```

### Azerbaijani reason strings (§3-verbatim)
**Source:** `src/lib/ict/fvg.ts:175-186` (`describeDeliveryTransition`)
**Apply to:** `amd.ts` reason field
Deterministic sentence builder, no new report section. Target shape: `Asia Range [Təmizlənib / Təmizlənməyib]. London/NY Judas Swing [Baş verib / Gözlənilir].`

### Sort + dedupe before grouping (T-07-04)
**Source:** `src/lib/ict/aggregate.ts:110-120`
**Apply to:** `asia.ts` (min/max attribution), `judas.ts` (sweep-first ordering)
Ascending sort + first-row-wins timestamp dedupe on copies — caller arrays never mutated.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Budget dev-script (`scripts/judas-budget.ts`, name TBD) | dev-script | batch backtest | No backtest script precedent in-repo; planner defines history-stitching per RESEARCH.md Open Question 2 |

## Metadata

**Analog search scope:** `src/lib/ict/` (aggregate.ts, fvg.ts, smt.ts, types.ts, join.ts, aggregate.test.ts)
**Files scanned:** 6
**Pattern extraction date:** 2026-09-07
