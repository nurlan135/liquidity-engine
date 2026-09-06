---
phase: 01-data-foundation-ict-core
reviewed: 2026-09-05T00:00:00Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - src/lib/ict/types.ts
  - src/lib/ict/range.ts
  - src/lib/ict/levels.ts
  - src/lib/ict/bias.ts
  - src/lib/ict/dol.ts
  - src/lib/ict/regime.ts
  - src/lib/ict/rollover.ts
  - src/lib/time.ts
  - src/lib/yahoo.ts
  - app/api/yahoo/route.ts
  - vitest.config.ts
  - src/lib/tracer.test.ts
  - src/lib/yahoo.test.ts
  - src/lib/time.test.ts
  - src/lib/ict/range.test.ts
  - src/lib/ict/levels.test.ts
  - src/lib/ict/bias.test.ts
  - src/lib/ict/dol.test.ts
  - src/lib/ict/regime.test.ts
  - src/lib/ict/rollover.test.ts
  - src/lib/__fixtures__/yahoo-null.json
findings:
  critical: 0
  warning: 12
  info: 7
  total: 19
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-09-05T00:00:00Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

Reviewed the full Phase 1 data-foundation slice at standard depth: ICT pure math
(range/levels/bias/dol/regime/rollover), Baku time bucketing, the Yahoo proxy
(parse/shape-guard, failover, jittered backoff, Retry-After cap, singleflight,
validate-before-store, stale-serve), the thin route handler, vitest config, all
nine test suites, and the null-row fixture. Cross-referenced against the three
plan summaries and `.planning/PROJECT.md` (core value: correct D1
Premium/Discount positioning on live NQ data).

No hardcoded secrets, no injection/SSRF surface (fixed hosts, fixed
`NQ%3DF` symbol, no route params), no `eval`/deserialization hazards, and the
close-only re-anchor / forming-exclusion / zero-width-guard / strict-3xATR /
Wilder-ATR semantics all match their specs with tests that genuinely prove them.
Baku bucketing correctly delegates to `date-fns-tz` with no hand-rolled offsets.

No Critical findings. The 12 Warnings cluster in three places: (1) non-finite
input handling is inconsistent across the ICT pure functions (`dol` throws,
`levels`/`bias` silently produce misleading outputs); (2) the Yahoo
fetch/cache layer drops the parsed `contractHint`, shares mutable cache
references, serves unbounded-age stale payloads through cacheable 200s, and can
exceed the route's 15s `maxDuration`; (3) error routing by message-prefix
matching plus a display-string round-trip for symbol validation are fragile.
Seven Info items cover test-provenance gaps and minor hygiene.

## Warnings

### WR-01: NaN position falls through to BEARISH instead of degrading

**File:** `src/lib/ict/bias.ts:18-28`
**Issue:** If `position` is `NaN`, the buffer check (`NaN >= 0.48 && NaN <= 0.52`)
is false and `NaN < 0.48` is false, so execution lands in the `else` branch and
returns `BEARISH` with a "premium positioning" rationale. A non-numeric input
produces a confident directional signal — the exact opposite of the honest-degrade
discipline used for thin history. Upstream validation makes this unlikely, but a
pure function consumed by Phase 2 selectors should not have a NaN-to-BEARISH path.
**Fix:**
```ts
export function computeBias(position: number, regime: RegimeState, closedCount: number): BiasOutput {
  if (!Number.isFinite(position) || closedCount < ANCHOR_WINDOW) {
    return {
      bias: 'COMPRESSION',
      rationale: `Insufficient history (${closedCount} of ${ANCHOR_WINDOW} closed candles) in ${regime} regime: holding COMPRESSION until the anchor window fills.`,
      position,
      regime,
    };
  }
  // ... rest unchanged
}
```

### WR-02: COMPRESSION DOL with NaN lastPrice silently selects the low

**File:** `src/lib/ict/dol.ts:6-17`
**Issue:** `computePrimaryDOL` validates `range.high`/`range.low` as finite but
never validates `lastPrice`. On the COMPRESSION path with `lastPrice = NaN`,
both distances are `NaN`, `NaN <= NaN` is false, and the function returns the
range low as if it were the nearer extreme. Same class of defect as WR-01.
**Fix:**
```ts
if (!Number.isFinite(range.high) || !Number.isFinite(range.low) || !Number.isFinite(lastPrice)) {
  throw new Error('computePrimaryDOL requires finite high, low, and lastPrice');
}
```

### WR-03: computeLevels has no finite-input guard, inconsistent with dol

**File:** `src/lib/ict/levels.ts:23-36`
**Issue:** `computeLevels` performs no finiteness validation: a `NaN`/`Infinity`
`range.high`/`range.low` propagates silently into `eq`, `q1`, `q3`, both OTE
pockets, and `position` (which then yields `NaN`, feeding WR-01's BEARISH path).
`dol.ts` throws explicitly on non-finite ranges; `levels.ts` should enforce the
same contract at the boundary instead of relying on callers.
**Fix:**
```ts
export function computeLevels(range: DealingRange, lastClose: number): LevelsOutput {
  if (!Number.isFinite(range.high) || !Number.isFinite(range.low) || !Number.isFinite(lastClose)) {
    throw new Error('computeLevels requires finite high, low, and lastClose');
  }
  // ... rest unchanged
}
```

### WR-04: computeATR accepts non-positive periods (divide-by-zero / NaN)

**File:** `src/lib/ict/regime.ts:16-20`
**Issue:** The only guard is `closed.length < period + 1`. With `period = 0`,
`atr /= period` divides by zero (`0/0 = NaN`) and the function returns `[NaN,
...]`; with a negative period the initial loop is skipped and the same `NaN`
results. `computeRegime` always passes the pinned constant so production is
safe, but `computeATR` is an exported, documented reuse point for Phase 2
(selectors could pass a computed period).
**Fix:**
```ts
export function computeATR(candles: Candle[], period: number = ATR_PERIOD): number[] {
  if (!Number.isInteger(period) || period < 1) {
    throw new Error(`computeATR requires a positive integer period, got ${period}`);
  }
  // ... rest unchanged
}
```

### WR-05: detectRollover has no ATR guard; negative/NaN ATR always trips

**File:** `src/lib/ict/rollover.ts:33-47`
**Issue:** `tripwire = ROLLOVER_ATR_MULT * atr` is used without validation. A
negative `atr` makes the tripwire negative, so every non-zero close-to-close
move satisfies `> tripwire` and `rolloverSuspect` is always true; `NaN` never
trips (always false). Both are silent wrong answers on a flag that downstream
uses to discount gaps as contract-roll artifacts.
**Fix:**
```ts
export function detectRollover(candles: Candle[], atr: number, asOf: string, contractHint: string): RolloverFlag {
  if (!Number.isFinite(atr) || atr < 0) {
    throw new Error(`detectRollover requires a finite non-negative ATR, got ${atr}`);
  }
  // ... rest unchanged
}
```

### WR-06: Parsed contractHint is discarded; Envelope cannot carry it

**File:** `src/lib/yahoo.ts:231-236,120-127`
**Issue:** `parseChartJson` returns `{ candles, contractHint }` (e.g.
`NQ=F · CME`), but `fetchUpstream` extracts only the symbol half for validation
and drops the hint; `buildEnvelope`/`Envelope` have no hint field. The live
exchange/contract label therefore never reaches any consumer — Phase 2 rollover
display must fabricate it (tests already hand-pass `'NQ H6 -> M6'`). Data parsed,
validated, then lost.
**Fix:**
```ts
export interface Envelope {
  candles: Candle[];
  contractHint: string;
  lastUpdatedISO: string;
  stale: boolean;
  source: string;
}
// in fetchUpstream: const parsed = parseChartJson(json); ... return buildEnvelope(parsed.candles, parsed.contractHint, now);
```

### WR-07: Cache, stale-serve, and singleflight share mutable candle arrays

**File:** `src/lib/yahoo.ts:280-307`
**Issue:** Fresh hits (`{ ...cached.payload, source: 'cache' }`), stale recovery
(`{ ...warm.payload, stale: true }`), and joined singleflight callers all share
the same `candles` array reference (shallow spread only). Any downstream consumer
that sorts, splices, or annotates candles in place poisons the module-level cache
for all later requests and all joined callers. `Response.json` serializes
immediately today, so the current route is safe — but the invariant is one
in-place `.sort()` away from cross-request corruption.
**Fix:**
```ts
return { ...cached.payload, candles: cached.payload.candles.map((c) => ({ ...c })), source: 'cache' };
// or Object.freeze the cached array and document that consumers must not mutate
```

### WR-08: Retry budget can exceed the route's 15s maxDuration

**File:** `src/lib/yahoo.ts:136-138` and `app/api/yahoo/route.ts:4`
**Issue:** Worst case is 4 attempts x 8s abort timeouts plus ~3.5s of
500/1000/2000ms backoff ≈ 35s, against `maxDuration = 15` on the route. Two
consecutive upstream timeouts already exhaust the budget; Vercel kills the
invocation (504, no stale-serve, no 502 mapping) before the library's
carefully-tested 4-attempt sequence finishes. The unit tests (with `noSleep` and
instant mocks) never exercise wall-clock budget.
**Fix:** Either lower `FETCH_TIMEOUT_MS` toward ~4s so 4 attempts plus backoff
fit in 15s, reduce to initial+2 retries, or raise `maxDuration` to 30s with a
comment showing the arithmetic.

### WR-09: Unbounded-age stale served as cacheable 200

**File:** `src/lib/yahoo.ts:290-303` and `app/api/yahoo/route.ts:8-13`
**Issue:** Any warm entry, however old, is served as `{ stale: true }` on
upstream failure — there is no max-stale age. For a trading terminal whose core
value is *correct live positioning*, a days-old range presented with a 200 plus
`Cache-Control: public, s-maxage=60, stale-while-revalidate=30` (the route does
not distinguish stale from live when setting cache headers, so CDNs cache the
stale body as fresh) risks decisions on ancient structure. The `stale: true`
marker is honest but only helps if every consumer gates on it.
**Fix:** Cap staleness (e.g. refuse to serve entries older than 15–30 min and
fall through to the 502 path), and emit `Cache-Control: no-store` (or
`s-maxage=0`) when `envelope.stale` is true.

### WR-10: Error path sets body retryAfter but no Retry-After header

**File:** `app/api/yahoo/route.ts:14-20`
**Issue:** The 502 response carries `{ error, retryAfter: 60 }` in the JSON body
only. Caches, fetch wrappers, and backoff middleware honor the `Retry-After`
HTTP header, not a body field — the signal the route intends is invisible to
all of them.
**Fix:**
```ts
return Response.json({ error: message, retryAfter: 60 }, {
  status: 502,
  headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
});
```

### WR-11: Retry routing by message-prefix matching; throw caught by own catch

**File:** `src/lib/yahoo.ts:221-269`
**Issue:** Retry-vs-throw decisions are made with `String(err.message).startsWith
('upstream status 4')` / `startsWith('upstream status 5')` string checks, and
the `throw new UpstreamError(...)` on the non-failover 4xx path (line 228) is
caught by the same `try`'s `catch` block, which must then re-derive that it
should rethrow. Any future message rewording silently changes retry behavior
(e.g. a message starting with "upstream status 4…" that is actually retryable
would be thrown, or vice versa). The tests pin current behavior, but the
mechanism is fragile.
**Fix:** Carry a structured discriminator instead of parsing text, e.g.
```ts
class UpstreamError extends Error {
  readonly retryable: boolean;
  readonly status?: number;
  constructor(message: string, opts: { retryable?: boolean; status?: number } = {}) { super(message); /* ... */ }
}
```
and branch on `err.retryable` / `err.status` in the catch block.

### WR-12: Symbol re-validated via display-string round-trip

**File:** `src/lib/yahoo.ts:232-236`
**Issue:** `fetchUpstream` recovers the symbol with
`parsed.contractHint.split(' · ')[0] ?? SYMBOL` — parsing a *display string* it
just constructed — then feeds it to `isValidPayload`. If `exchangeName` ever
contains `·` the split still happens to work ([0] is the symbol), but the
indirection is needlessly brittle; `parseChartJson` already validated the symbol
and could return it directly.
**Fix:** Return the validated symbol from `parseChartJson` (e.g.
`{ candles, contractHint, symbol }`) and use it without string surgery.

## Info

### IN-01: Unused import is the known lint warning in levels.test.ts

**File:** `src/lib/ict/levels.test.ts:3`
**Issue:** `checkReanchor` is imported but never used in this file (the re-anchor
table lives in `range.test.ts`). This is the single pre-existing lint warning
cited in the 01-03 summary. Harmless but should be deleted so `npm run lint`
is clean.
**Fix:** Change line 3 to `import { ANCHOR_WINDOW, computeRange } from
'@/src/lib/ict/range';`.

### IN-02: Retry-After sleeps are exact, not jittered

**File:** `src/lib/yahoo.ts:213-218`
**Issue:** The 429/5xx path sleeps `retryMs ?? jitteredDelay(...)` — when the
server sends `Retry-After`, the delay is the exact capped value (2000ms,
10000ms) with no jitter. The test titles claim a "500ms jitter band" but the
asserted ranges ([1500,2500], [7500,12500]) trivially contain the deterministic
value, so the tests pass without proving jitter. Concurrent serverless instances
throttled at once will retry in lockstep (thundering herd).
**Fix:** Apply jitter around the honored value, e.g. `retryMs * (0.8 +
Math.random() * 0.4)`, and tighten the test bands to prove it.

### IN-03: Tracer never asserts the 6-month window query params

**File:** `src/lib/tracer.test.ts:46-56`
**Issue:** The mocked `fetchFn` ignores its URL argument, so nothing verifies
`period1`/`period2`/`interval=1d`/`events=history` (the "182-day window" claim in
the summary is proven only by code inspection, not by test). A regression
shortening the window (which would starve the 34-bar regime path) would go green.
**Fix:** Capture `urls[0]` in the tracer test and assert
`interval=1d`, `events=history`, and `period2 - period1 === 182 * 86400`.

### IN-04: Test-only cache reset is exported unguarded from the prod module

**File:** `src/lib/yahoo.ts:148-152`
**Issue:** `__resetYahooCacheForTests` is a live export any importer can call to
wipe the proxy cache (perf/correctness DoS primitive, however mild). Convention
(`__` prefix + docstring) mitigates, but nothing enforces test-only use.
**Fix:** Guard with `if (process.env.NODE_ENV === 'test')` or move cache
construction behind a factory injectable by tests.

### IN-05: Invalid Date input to time utils throws uncaught, untested

**File:** `src/lib/time.ts:6-12`
**Issue:** `toBakuYMD(new Date(NaN))` throws `RangeError` from `formatInTimeZone`;
`bakuOffsetMinutes` likewise. No test pins the contract (throw vs. sentinel),
so a future caller passing an unchecked date gets behavior by accident. Current
callers only pass finite timestamps, so this is latent.
**Fix:** Decide and pin: either document "throws on invalid input" with a test,
or return a sentinel. Recommended: keep throwing, add
`expect(() => toBakuYMD(new Date(NaN))).toThrow()`.

### IN-06: Payload validation has no OHLC sanity (high >= low, etc.)

**File:** `src/lib/yahoo.ts:173-185`
**Issue:** `isValidPayload` checks finiteness, count >= 5, and date ordering —
but not `high >= low`, `high >= close >= low`-style coherence. A corrupt row
with `high < low` would produce a negative-width range and inverted positions
downstream. Yahoo will not send this in practice; it is defense-in-depth.
**Fix:** Add `if (c.high < c.low || c.high < Math.max(c.open, c.close) ||
c.low > Math.min(c.open, c.close)) return false;`.

### IN-07: Non-429 4xx with warm cache serves stale instead of failing loudly

**File:** `src/lib/yahoo.ts:249-256,295-299`
**Issue:** The "4xx fails over once then throws" test runs on an empty cache, so
it throws as designed. With a warm cache, the same permanent 404 is converted
to a stale-serve by the `fetchNQDaily` catch block — masking a configuration
error (e.g. delisted symbol) behind indefinitely recycled data. Arguably
correct for resilience; worth a conscious decision plus a test pinning whichever
behavior is intended.
**Fix:** Either test-and-document "4xx also serves stale when warm", or bypass
stale-serve for non-retryable 4xx (rethrow before the warm-cache fallback).

---

_Reviewed: 2026-09-05T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
