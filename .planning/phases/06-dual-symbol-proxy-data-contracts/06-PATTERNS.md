# Phase 06: dual-symbol-proxy-data-contracts - Pattern Map

**Mapped:** 2026-09-06
**Files analyzed:** 6 (3 modified, 3 new)
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/yahoo.ts` (modify: `fetchSymbol`) | service | request-response | `src/lib/yahoo.ts` (self: `fetchNQDaily`, `fetchUpstream`, `parseChartJson`) | exact |
| `app/api/yahoo/route.ts` (modify: params) | route | request-response | `app/api/yahoo/route.ts` (self: bare GET NQ daily) | exact |
| `src/lib/store.ts` (modify: dual-leg) | store | request-response | `src/lib/store.ts` (self: single `refresh()` + `isValidEnvelope`) | exact |
| `src/lib/freshness.ts` (modify: per-leg) | utility | transform | `src/lib/freshness.ts` (self: `deriveStatus`, `formatStripAge`) | exact |
| `src/lib/ict/types.ts` (modify: intraday type) | model | transform | `src/lib/ict/types.ts` (self: `Candle`, `closedOnly`) | exact |
| `src/lib/ict/join.ts` (new) | utility | transform | `src/lib/ict/range.ts` (pure fn + injected input, no I/O) | role-match |

## Pattern Assignments

### `src/lib/yahoo.ts` (service, request-response)

**Analog:** `src/lib/yahoo.ts`

**Imports pattern** (lines 1-2):
```typescript
import { toBakuYMD } from '@/src/lib/time';
import type { Candle } from '@/src/lib/ict/types';
```

**Core pattern — composite cache key + singleflight** (lines 140-155, 280-315):
```typescript
const CACHE_KEY = `${SYMBOL}:D1`;
const CACHE_TTL_MS = 60_000;
const FETCH_TIMEOUT_MS = 4_000;
const MAX_RETRY_AFTER_MS = 10_000;
const BASE_DELAYS_MS = [500, 1000, 2000];
const MAX_STALE_MS = 30 * 60_000;
// Target: const cacheKey = (symbol, interval, range) => `${symbol}:${interval}:${range}`;
const payloadCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<Envelope>>();
```
Copy: module-level `payloadCache`/`inFlight` Maps keyed per combo (D-11), 60s TTL (D-09), 30-min serve-stale ceiling (D-10), defensive candle copy on every return (`candles.map((c) => ({ ...c }))`), `__resetYahooCacheForTests` reset (lines 157-161).

**Core pattern — failover + validate-then-cache** (lines 206-259, 300-308):
```typescript
const host = HOSTS[attempt % HOSTS.length]; // query1→query2 alternation
// Retryable: 429 / 5xx + Retry-After honor (retryAfterMs, lines 167-180) + jitteredDelay (lines 163-165)
// HTTP-200 chart-error bodies are retryable throttle signals (lines 248-255)
if (!isValidPayload(candles, symbol)) {
  throw new UpstreamError('upstream payload failed validation', { retryable: false });
}
// Serve-stale only within MAX_STALE_MS; non-retryable 4xx fails loudly, never serves stale (lines 301-307)
```
Copy: keep `fetchWithTimeout` 4s AbortController (lines 196-204), `UpstreamError` discriminated by `retryable`/`status` (lines 14-23, WR-11: branch on discriminator never message text), never cache errors.

**Parser pattern — null-row filter + forming last row** (lines 47-101):
```typescript
const complete = isFiniteNumber(o) && isFiniteNumber(h) && isFiniteNumber(l) && isFiniteNumber(c);
if (complete) { candles.push({ date: toBakuYMD(ts * 1000), open, high, low, close }); }
else if (i === lastIndex && isFiniteNumber(c)) { candles.push({ ..., forming: true }); }
// then symbol-match check (lines 107-111) + ascending-date check (lines 113-119)
```
Copy for intraday branch: same null-drop + last-row-forming rule, but emit epoch-seconds field (`time`) instead of `toBakuYMD` date string (D-16, never unify). Extend `isValidPayload` (lines 182-194: min 5 rows, finite OHLC, ascending) per leg with symbol-match against the allowlisted value.
Do NOT copy: hardcoded `SYMBOL = 'NQ=F'` / `ENCODED_SYMBOL` (lines 33-34) and daily `period1/period2&interval=1d` path builder (lines 211-213) — these become parameterized; bare-GET default must still produce the byte-identical NQ daily path (D-05).

---

### `app/api/yahoo/route.ts` (route, request-response)

**Analog:** `app/api/yahoo/route.ts`

**Full current shape** (lines 1-21):
```typescript
import { fetchNQDaily, UpstreamError } from '@/src/lib/yahoo';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

export async function GET() {
  try {
    const envelope = await fetchNQDaily(new Date());
    return Response.json(envelope, {
      headers: {
        'Cache-Control': envelope.stale ? 'no-store' : 'public, s-maxage=60, stale-while-revalidate=30',
      },
    });
  } catch (err) {
    const message = err instanceof UpstreamError ? err.message : 'upstream unavailable';
    return Response.json({ error: message, retryAfter: 60 }, {
      status: 502,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
    });
  }
}
```
Copy: keep `force-dynamic` + `maxDuration = 15`, stale-aware `Cache-Control` rule per leg (D-12), 502 `{ error, retryAfter: 60 }` + `Retry-After: 60` shape. New code adds `GET(request: NextRequest)` with `request.nextUrl.searchParams`, defaults `symbol ?? 'NQ=F'` / `interval ?? '1d'` delegating to the exact current path (D-05), strict allowlists `['NQ=F','ES=F']` / `['1d','1h','15m']` → 400 never forwarded (D-08). Per AGENTS.md mandate, re-check `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` for `searchParams` conventions before writing.

---

### `src/lib/store.ts` (store, request-response)

**Analog:** `src/lib/store.ts`

**Imports pattern** (lines 1-10):
```typescript
import { create } from 'zustand';
import type { BiasOutput, Candle, DealingRange, DOLTarget, RegimeOutput, RolloverFlag } from '@/src/lib/ict/types';
import { closedOnly } from '@/src/lib/ict/types';
import { ANCHOR_WINDOW, computePosition, computeRange } from '@/src/lib/ict/range';
// ... bias/dol/regime/rollover/levels selectors + getAsOfBakuDate from '@/src/lib/time'
```

**Client guard pattern** (lines 22-60):
```typescript
function isValidCandle(c: unknown): c is Candle { /* finite OHLC + date string + optional forming boolean */ }
function isValidEnvelope(env: EnvelopeJson): env is {...} {
  if (!Array.isArray(env.candles) || env.candles.length < 1) return false;
  if (!env.candles.every(isValidCandle)) return false;
  // contractHint non-empty, lastUpdatedISO parseable, stale boolean, source string
  const dates = (env.candles as Candle[]).map((c) => c.date);
  for (let i = 1; i < dates.length; i++) { if (dates[i] <= dates[i - 1]) return false; }
  return true;
}
```
Copy: per-leg guard applies the same checks per envelope + coverage-object guard (`{ nq, es, joined, dropped }` finite non-negative ints, `joined <= min(nq, es)`).

**Singleflight + failure path** (lines 99-132):
```typescript
refresh: async () => {
  if (get().inFlight) return;      // client singleflight
  set({ inFlight: true });
  try {
    const res = await fetch('/api/yahoo', { cache: 'no-store' });
    if (!res.ok) throw new Error(`refresh failed with status ${res.status}`);
    const json = (await res.json()) as EnvelopeJson;
    if (!isValidEnvelope(json)) throw new Error('refresh rejected invalid envelope');
    set({ candles: json.candles, ..., lastError: null, inFlight: false });
  } catch (err) {
    // Preserve last-known candles; mark stale immediately (no 120s wait)
    set({ lastError: ..., stale: true, inFlight: false });
  }
},
```
Copy: split into `refreshNQ()`/`refreshES()` with `inFlightNQ`/`inFlightES` booleans, `fetch('/api/yahoo?symbol=..&interval=..', { cache: 'no-store' })` per leg, per-leg catch marks only that leg stale (D-01/D-06). Two `setInterval` timers NQ :00 / ES :30 + jitter ±5–10s, uniform 60s cadence, always-on (D-01/D-02/D-03). Never `Promise.all` the legs; never a merged `stale` boolean.

---

### `src/lib/freshness.ts` (utility, transform)

**Analog:** `src/lib/freshness.ts`

**Full vocabulary** (lines 1-61):
```typescript
export type StatusState = 'LIVE' | 'STALE' | 'CLOSED';
export const STALE_AFTER_SEC = 120;
export interface EnvelopeFreshness { stale: boolean; lastUpdatedISO: string; }
export function deriveStatus(envelope: EnvelopeFreshness, now: Date = new Date()): DerivedStatus {
  const weekday = bakuWeekday(now);           // formatInTimeZone(now, BAKU_TZ, 'i')
  const ageSec = parseAgeSec(envelope.lastUpdatedISO, now); // throws on unparseable ISO
  if (weekday === '6' || weekday === '7') return { state: 'CLOSED', ageSec }; // weekend wins
  if (envelope.stale || ageSec >= STALE_AFTER_SEC) return { state: 'STALE', ageSec };
  return { state: 'LIVE', ageSec };
}
function ageCopy(ageSec: number): string {
  if (ageSec < 60) return `${ageSec} san əvvəl`;
  return `${Math.floor(ageSec / 60)} dəq əvvəl`;
}
export function formatStripAge(state: StatusState, ageSec: number): string {
  if (state === 'CLOSED') return 'BAZAR BAĞLIDIR — son bağlanış şamları';
  if (state === 'STALE') return `STALE · ${ageCopy(ageSec)} — son keş göstərilir`;
  return `LIVE · ${ageCopy(ageSec)}`;
}
```
Copy: apply `deriveStatus` independently per leg (no new enum), paired-age render `NQ 12s · ES 48s` reusing `ageCopy`/`formatStripAge` Azerbaijani copy (D-04). Test analog: `src/lib/status-strip.test.ts` pins LIVE/STALE/CLOSED + weekend-wins; extend per-leg. Test analog: `src/lib/store.test.ts` covers `refresh()` singleflight + envelope cases; extend with dual-timer fake-timer + independent-failure cases.

---

### `src/lib/ict/types.ts` (model, transform)

**Analog:** `src/lib/ict/types.ts`

**Current shape** (lines 1-49):
```typescript
export interface Candle {
  date: string; open: number; high: number; low: number; close: number;
  forming?: boolean;
}
export function closedOnly(candles: Candle[]): Candle[] {
  return candles.filter((c) => !c.forming);
}
```
Copy: intraday type keeps identical OHLC + `forming?` semantics (`closedOnly`-compatible either way — planner locks reuse-`Candle`-with-`time` vs new `IntradayCandle`); D1 `date: YYYY-MM-DD` contract untouched (D-16). Test analog: `src/lib/yahoo.test.ts` covers `parseChartJson` null-row filtering (8 surviving candles vs `yahoo-null.json` fixture) — new intraday fixtures follow the same fixture-driven style; `src/lib/ict/range.test.ts` must stay green untouched (D-07 anchor independence).

---

### `src/lib/ict/join.ts` NEW (utility, transform)

**Analog:** `src/lib/ict/range.ts`

**Purity pattern** (lines 1-27):
```typescript
import type { Candle, DealingRange } from '@/src/lib/ict/types';
import { closedOnly } from '@/src/lib/ict/types';
export const ANCHOR_WINDOW = 20;
export function computeRange(candles: Candle[], asOf: string, window: number = ANCHOR_WINDOW): DealingRange {
  const closed = closedOnly(candles);   // forming excluded at function boundary
  const rows = closed.slice(Math.max(0, closed.length - window));
  if (rows.length === 0) throw new Error('computeRange requires at least one closed candle');
  // ... pure scan, no Date.now, no I/O; time (asOf) injected by caller
}
```
Copy: `innerJoinOnTimestamp(nq, es)` as pure function — `Map<time, candle>` per leg → drop incomplete rows pre-join → `closedOnly` (drop forming) at join boundary even if parser regresses (D-15) → intersect → sort ascending → return `{ joined, coverage: { nq, es, joined, dropped } }`. No `Date.now()`/`new Date()` inside (purity gate: `grep -rn "Date.now\|new Date()" src/lib/ict` clean). Join warns via coverage, never refuses (D-14). Works on its own intersected working copy; D1 `computeRange(candles, asOfBaku, ANCHOR_WINDOW)` call sites unchanged (D-07). Time display routes through `src/lib/time.ts` (`BAKU_TZ = 'Asia/Baku'`, `toBakuYMD`, `formatInTimeZone` — never hand-rolled offsets). Test analog: new `src/lib/ict/join.test.ts` with misaligned fixture (ES missing middle candles, NQ null rows) asserting exact `dropped` count + forming-exclusion + clean-vs-joined no-shift.

---

## Shared Patterns

### Upstream resilience (all server-side fetch legs)
**Source:** `src/lib/yahoo.ts:14-23, 140-180, 196-278`
query1→query2 host alternation per attempt, 4s abort timeout, `BASE_DELAYS_MS = [500,1000,2000]` jittered backoff, `Retry-After` honor capped at 10s, `UpstreamError{retryable,status}` discriminator (WR-11), HTTP-200 chart-error treated as retryable throttle. Apply to every new symbol×interval leg unchanged.

### Validate-then-cache, never cache errors (all legs)
**Source:** `src/lib/yahoo.ts:182-194, 256-259, 300-308`
Per-leg `isValidPayload` (symbol match, min rows, finite OHLC, ascending) before cache write; on failure serve that leg's last-good with `stale: true` within `MAX_STALE_MS` else 502. One leg's validation failure never touches the other leg's cache entry (D-06).

### Freshness honesty vocabulary (all status display)
**Source:** `src/lib/freshness.ts:5-8, 32-61`
`LIVE`/`STALE`/`CLOSED`, `STALE_AFTER_SEC = 120`, weekend-wins, Azerbaijani strip copy. Extend per leg; do not invent a new enum.

### Purity discipline (all `src/lib/ict` code)
**Source:** `src/lib/ict/range.ts:6-27`, `src/lib/ict/types.ts:47-49`
Pure functions, injected time, `closedOnly()` at boundaries. New join code follows; test via `src/lib/ict/*.test.ts` + `vitest.config.ts` include `src/**/*.test.ts`, `testTimeout: 15000`.

### Test commands
- Targeted: `npx vitest run src/lib/yahoo.test.ts src/lib/store.test.ts`
- Full gate: `npm test` (133/133 baseline must stay green) + `npx tsc --noEmit` (pre-existing `app/layout.tsx` LayoutProps error is residual, not to fix)

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/lib/__fixtures__/*` (es-daily, intraday-1h, join-misaligned) | test | — | No ES/intraday fixtures exist; hand-build synthetic Yahoo payloads (live-probe density informs sizes only, never a unit test hitting Yahoo) |

## Metadata

**Analog search scope:** `src/lib/`, `src/lib/ict/`, `app/api/yahoo/`
**Files scanned:** 20 test files enumerated; 7 source files read fully (yahoo.ts, route.ts, store.ts, freshness.ts, ict/types.ts, ict/range.ts, time.ts)
**Pattern extraction date:** 2026-09-06
**Tracked-source gate:** all analogs verified via `git ls-files` (10/10 tracked)
