# Phase 1: Data Foundation & ICT Core - Research

**Researched:** 2026-09-04
**Domain:** Yahoo Finance proxy resilience + pure-function ICT dealing-range math + Baku time core (Next.js 16.3.4 + React 19 + TS strict)
**Confidence:** HIGH (stack, patterns, time lib) / MEDIUM (Yahoo upstream behavior — architecture is designed to survive it regardless)

## Summary

Phase 1 builds trusted numbers with no UI: a server-only `GET /api/yahoo` proxy for `NQ=F` daily candles (browser UA, query1→query2 failover, jittered backoff honoring `Retry-After`, 60s module-level Map cache, singleflight dedupe, serve-stale envelope) plus a pure-function ICT math core in `src/lib/ict` (range, EQ/quadrants/OTE, bias+rationale, Primary DOL, ATR regime, rollover flag) and a single `Asia/Baku` time util with injected clock — all proven by a green Vitest suite including March/November DST tests.

The Yahoo v8 chart endpoint is unofficial and undocumented (no official API since 2017 [CITED: https://scrapfly.io/blog/posts/guide-to-yahoo-finance-api]), so every upstream-facing decision assumes hostility: fixed request shape, validate-then-cache, never cache errors, 502-with-`retryAfter` on cold-start outage. All numeric parameters left open by CONTEXT.md are pinned below as researcher recommendations (`[ASSUMED]` = planner-adjustable judgment calls, not upstream facts).

**Primary recommendation:** Ship proxy + pure math + time util + Vitest suite as the phase; pin N=20 anchor window, ATR(14) vs 20-bar average regime, 3×ATR rollover tripwire; English rationale strings; hand-rolled upstream shape-guard (no new deps beyond `vitest`).

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Proxy serves fixed `NQ=F` daily only — no symbol/range parameters. Matches DATA-01 exactly; multi-symbol (PROD-01) is a v2 concern.
- **D-02:** Response envelope is `{candles, lastUpdatedISO, stale, source}` where `source: 'live'|'cache'|'stale'`. Cache only validated payloads (symbol matches, timestamps ascending, complete OHLC); never cache errors.
- **D-03:** Yahoo down + empty cache on first load → HTTP 502 structured error `{error, retryAfter}`. Never synthesize or fake candles; Phase 2 renders an honest error/closed state.
- **D-04:** Include today's still-forming daily candle, flagged `forming: true` on the last row. ICT anchor math uses closed candles only; the flag lets the chart show live feel without corrupting the range.
- **D-05:** Range extremes = highest high / lowest low over an explicit N-candle window (researcher picks N, e.g. 20D). Window + asOf passed explicitly into the range function; it never fetches or trims data itself.
- **D-06:** Only a D1 **close** beyond either extreme retires the range and re-anchors. Wick piercings are liquidity raids, not breaks — no re-anchor on wick touch.
- **D-07:** Rollover-suspect gap (close-to-close jump exceeding N×ATR, multiplier at researcher discretion) sets `rolloverSuspect: true` with `contractHint` + proximity warning, but computation continues off current anchors until a real close-break confirms. No silent absorption, no freeze — flag-and-continue.
- **D-08:** Futures use raw OHLC, never `adjclose`. Gaps stay visible (never interpolated/filled). Range function takes explicit candle window + asOf date.
- **D-09:** Equilibrium buffer band: position 0.48–0.52 reads COMPRESSION / equilibrium-fair. Outside the band, position > 0.5 = premium side, < 0.5 = discount side. Buffer prevents bias flicker when price hugs EQ.
- **D-10:** Bias derives from D1 position + regime with a mandatory rationale string on every output. BULLISH when price sits in discount, BEARISH in premium, COMPRESSION inside the buffer or on thin history (degrade honestly).
- **D-11:** Primary DOL = opposite extreme: bullish bias → range high / PDH side; bearish bias → range low / PDL side. Single named level, codified position + regime rules.
- **D-12:** Volatility regime via ATR: current ATR vs its own N-period average — elevated = Expansion, contracted = Compression. Degrades honestly on thin history (insufficient bars → COMPRESSION with rationale). Exact periods at researcher discretion.
- **D-13:** Levels derived from anchors: EQ = (Rhigh + Rlow) / 2, quadrant lines at 0.25 / 0.75, OTE pocket 0.62–0.79 of the range.
- **D-14:** Test runner is **vitest** (new devDependency). No runner installed today; vitest fits Next/TS pure-function suites.
- **D-15:** One concept per file in `src/lib/ict`: `range.ts`, `levels.ts` (EQ/quadrants/OTE), `bias.ts`, `dol.ts`, `regime.ts`, `rollover.ts`, plus `types.ts`. Each independently testable. Migrate from root `lib/` to `src/lib/ict` now; update `@/*` alias accordingly.
- **D-16:** Strict purity: `src/lib/ict` functions do no I/O, no `Date.now()`, no `Intl`, no store imports. Time injected (`asOfBakuDate`), formatting at the display edge. Testable and monorepo-extractable.
- **D-17:** Single time util module (`src/lib/time.ts` or equivalent) for all Asia/Baku session/date logic with injected clock; March + November DST unit tests required. D1 candles travel as `YYYY-MM-DD` business-day strings proxy → store → chart. Code identifiers in English; Azerbaijani spec terms live in comments/docs only.

### Claude's Discretion

Numeric parameters left to researcher/planner: N-candle anchor window length, ATR periods for regime, rollover N×ATR multiplier, `Retry-After`/backoff schedule details, rationale-string language (English vs Azerbaijani). User selected "I'm ready for context" — these are researcher-discretion items, not open questions.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope. (Phase 2 owns: chart, terminal shell, report shell, fixture routes, Zustand store, weekend-closed state, DATA-03 freshness badges. Phase 3 owns: Vercel deploy, CDN header verification, cold-start/stale-serve drill, live-URL checklist.)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | NQ=F daily via `GET /api/yahoo`, 60s TTL envelope `{candles, lastUpdatedISO, stale, source}` | Q1: request shape, headers, cache + serve-stale pattern, `force-dynamic` route conventions |
| DATA-02 | query1→query2 failover, backoff honoring Retry-After, serve-stale; never cache errors | Q1: failover order, backoff schedule, singleflight, error classification |
| ICT-01 | D1 Dealing Range + Premium/Discount + EQ, position >/< 0.5, pure functions | Q2: range.ts/levels.ts formulas, N=20, divide-by-zero guard |
| ICT-02 | EQ + 0.25/0.75 quadrants + 0.62–0.79 OTE from anchors | Q2: levels.ts absolute-price definitions incl. bull/bear OTE pockets |
| ICT-03 | Re-anchor on close beyond either extreme; wick piercings ignored | Q2: re-anchor rule table, close-only semantics |
| ICT-04 | Bias (BULLISH/BEARISH/COMPRESSION) + mandatory rationale from position + regime | Q2: bias rule table incl. 0.48–0.52 buffer + thin-history degrade |
| ICT-05 | Single named Primary DOL from codified position + regime rules | Q2: DOL rule table (opposite extreme + compression fallback) |
| ICT-06 | Expansion/Compression regime from daily-range heuristic, honest degrade | Q2: ATR(14) vs 20-bar average, threshold, thin-history rule |
| ICT-07 | Raw OHLC never adjclose, `rolloverSuspect` on N×ATR jumps, hint + warning | Q2: rollover.ts tripwire (3×ATR), contractHint, flag-and-continue |
| STATE-02 | Asia/Baku time util, injected clock, March + November DST tests | Q3: date-fns-tz API, time.ts shape, DST test strategy |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Yahoo fetch + failover + backoff | API / Backend (Route Handler) | — | Unofficial endpoint must never be touched from the browser (Pitfall 1); UA + failover are server secrets of behavior |
| 60s cache + serve-stale + CDN headers | API / Backend | CDN / Static (edge `s-maxage`+SWR absorbs fan-out) | Per-instance Map is best-effort L1 only; edge is the real fan-out shield |
| ICT math (range/levels/bias/DOL/regime/rollover) | Shared pure lib (`src/lib/ict`) | — | Zero I/O, runs identically server- or client-side; Phase 2 consumes via selectors |
| Baku date logic + `lastUpdated` stamping | Shared pure lib (`src/lib/time.ts`) | API / Backend (stamps envelope) | One TZ rule imported by both proxy and math; injected clock keeps it pure |
| Candle validation + null-row filtering | API / Backend | — | Validate at the trust boundary (proxy), so downstream math can assume clean arrays |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.3.4 (installed) | Route Handler proxy, `force-dynamic` | Existing scaffold; Route Handlers are the blessed server-fetch surface [VERIFIED: node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md:29-39] |
| `react` / `react-dom` | 19.2.8 (installed) | N/A in Phase 1 (no UI) | — |
| `date-fns` + `date-fns-tz` | 4.4.0 + 3.2.0 (installed) [VERIFIED: npm registry + local node_modules] | Baku TZ logic via `formatInTimeZone` / `fromZonedTime` | Already-installed matched pair; `formatInTimeZone(date, 'Asia/Baku', fmt)` verified working locally [VERIFIED: local node_modules — `format, formatInTimeZone, fromZonedTime, toZonedTime, getTimezoneOffset, toDate` exported; Baku format probe returned `2026-03-08 11:00` for `2026-03-08T07:00:00Z`] |
| `vitest` | 5.0.0 (registry latest on 2026-09-04) [VERIFIED: npm registry] | Unit runner for pure-function suite | D-14 locked; Vite-native, TS-first, `*.test.ts` include patterns documented [CITED: https://github.com/vitest-dev/vitest/blob/main/docs/config/include.md] |
| TypeScript | ^5 strict (installed) | Types for envelope, candles, ICT outputs | Existing strict config |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | — | — | Phase 1 adds zero runtime deps: `zustand`, `lightweight-charts` stay unwired until Phase 2; upstream validation is a hand-rolled shape-guard (schema is fixed and tiny — see Don't Hand-Roll) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| hand-rolled Map cache | `next/cache` / fetch-cache | Route Handlers are not cached by default [VERIFIED: node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md:49-51]; explicit Map + `force-dynamic` keeps TTL/stale semantics fully controllable per-instance |
| hand-rolled shape-guard | `zod` | zod is not installed and SUMMARY mandates no new Phase 1 deps; Yahoo chart schema surface used here is ~10 fields — a typed guard + tests is cheaper than a new dep |
| `range=` param | `period1`/`period2` unix params | `range=6mo` is server-relative and non-deterministic; explicit timestamps are testable and bound the window exactly [CITED: https://scrapfly.io/blog/posts/guide-to-yahoo-finance-api — "Swap `range=1y` for `period1` and `period2` UNIX timestamps when you need an exact window"] |
| `vite-tsconfig-paths` | hand `resolve.alias` in vitest.config | One-line alias avoids a second new dep; tsconfig `@/* → ./*` already covers `src/*` so no tsconfig change is strictly needed |

**Installation:**
```bash
npm install -D vitest
```

**Version verification:** `npm view vitest version` → `5.0.0` on 2026-09-04 [VERIFIED: npm registry]. `date-fns-tz` installed at 3.2.0 = registry latest [VERIFIED: npm registry].

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `vitest` | npm | ~5 yrs (since 2021) [ASSUMED] | ~10M+/wk [ASSUMED] | github.com/vitest-dev/vitest [ASSUMED] | OK | Approved — official test runner, documented via Context7 with High reputation; planner may install without checkpoint |

**Packages removed due to SLOP verdict:** none.
**Packages flagged as suspicious (SUS):** none.
No `postinstall` risk applies (`npm view vitest scripts.postinstall` → none expected; installer to confirm at plan time).

## Architecture Patterns

### System Architecture Diagram

```text
                    ┌────────────── Yahoo v8 chart ──────────────┐
                    │  query1 ──429/5xx──► query2 (failover)     │
                    │  browser UA + Accept + Referer headers     │
                    └───────────────────┬────────────────────────┘
                                        │ raw JSON
                                        ▼
┌──────────────────────────────────────────────────────────────┐
│  GET /api/yahoo  (Route Handler, force-dynamic, maxDuration) │
│  1. singleflight: join in-flight fetch for key NQ=F:D1       │
│  2. fetch w/ backoff (500ms→1s→2s + jitter, honor Retry-After│
│  3. shape-guard + null-row filter + ascending check          │
│  4a. valid → store 60s Map cache → {live|cache} envelope     │
│  4b. invalid/down + cache → stale envelope (stale:true)      │
│  4c. invalid/down, no cache → 502 {error, retryAfter}, no-store│
└───────────────────────────────┬──────────────────────────────┘
                                │ {candles[{date,OHLC,forming}], lastUpdatedISO, stale, source}
                                ▼
┌──────────────────────────────────────────────────────────────┐
│  Pure core (no I/O): src/lib/time.ts ──asOfBakuDate──►       │
│  src/lib/ict/{range,levels,bias,dol,regime,rollover}.ts      │
│  closed candles only (forming excluded) → range/EQ/bias/DOL  │
└──────────────────────────────────────────────────────────────┘
```

Entry point: `GET /api/yahoo` (only Yahoo caller). Processing: fetch → validate → cache → envelope. Pure math consumes the envelope's closed candles + explicit asOf date. No cycles, no store in Phase 1.

### Recommended Project Structure

```text
app/
└── api/
    └── yahoo/
        └── route.ts              # sole Yahoo caller (server-only)
src/
└── lib/
    ├── time.ts                   # BAKU_TZ, toBakuYMD, getAsOfBakuDate(now?)
    ├── yahoo.ts                  # fetch/parse/validate (imported by route; unit-testable, fetch injectable)
    └── ict/
        ├── types.ts              # Candle, DealingRange, BiasOutput, DOLTarget, RegimeOutput, RolloverFlag
        ├── range.ts              # anchor window + re-anchor check
        ├── levels.ts             # EQ / quadrants / OTE pockets
        ├── bias.ts               # position + regime → bias + rationale
        ├── dol.ts                # single named Primary DOL
        ├── regime.ts             # ATR(14) vs 20-bar average
        ├── rollover.ts           # 3×ATR tripwire + contractHint
        └── *.test.ts             # co-located suites (STRUCTURE.md convention)
vitest.config.ts                  # node env, @ alias, src+app includes
```

(D-15: migrate domain logic root `lib/` → `src/lib/ict` now; existing `lib/utils.ts` `cn` re-export stays untouched. tsconfig `@/* → ./*` already resolves `@/src/...` — no alias change strictly required; vitest needs the matching `resolve.alias`.)

### Pattern 1: Route Handler proxy with force-dynamic + module cache
**What:** `export const dynamic = 'force-dynamic'` opts out of static caching so the handler runs per request [VERIFIED: node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md:49-67]; a module-level `Map` provides the 60s L1 cache; `Cache-Control: public, s-maxage=60, stale-while-revalidate=30` lets the edge absorb fan-out.
**When to use:** This exact proxy. Success responses carry CDN headers; 502s carry `Cache-Control: no-store`.
**Example:**
```ts
// Source: Next.js Route Handler docs (node_modules/next/dist/docs/.../15-route-handlers.md)
export const dynamic = 'force-dynamic';
export const maxDuration = 15;
export async function GET() { return Response.json({ candles, lastUpdatedISO, stale, source }); }
```

### Pattern 2: Singleflight dedupe
**What:** Module-level `Map<string, Promise<Payload>>` keyed `NQ=F:D1`; concurrent misses join the same promise, `.finally()` deletes the key. Guarantees ≤1 upstream call per miss storm (Pitfall 6).
**When to use:** Any shared upstream fetch in a serverless handler.

### Pattern 3: Pure ICT functions with injected time
**What:** Every `src/lib/ict` function signature takes `(candles: ClosedCandle[], asOfBakuDate: string, params)` and returns data + rationale; no `Date.now()`, no `Intl`, no fetch. `src/lib/time.ts` is the only module touching timezones.
**When to use:** All Phase 1 math (D-16).

### Anti-Patterns to Avoid
- **Fetching Yahoo from client code:** every visitor becomes an uncached upstream hit from the shared egress pool → collective 429 (Pitfall 1). Proxy-only, always.
- **Caching error payloads or serving errors as live:** envelope `stale`/`source` must be honest; 502s are `no-store` (Pitfall 6).
- **Wick-touch re-anchor / adjclose math:** wicks are raids not breaks (D-06); `adjclose` on futures is noise (D-08, Pitfall 2).
- **Fixed `+4h` offsets or `Date.now()` inside math:** use IANA names + injected clock or DST transitions silently shift bias by a day (Pitfall 3).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test runner / assertions / mocks | Custom harness | `vitest` | Watch mode, TS transform, ESM, mocks (`vi.fn`/`vi.useFakeTimers` for clock injection tests) out of the box |
| Timezone math (offsets, DST) | Manual `+4h` arithmetic | `date-fns-tz` `formatInTimeZone`/`fromZonedTime` with IANA names | US DST shifts the Baku↔Chicago offset twice yearly; Intl-backed lib handles it; hand offsets rot |
| Exponential backoff + Retry-After | Tight retry loop | ~15-line helper: delays 500/1000/2000ms ±25% jitter, parse `Retry-After` (seconds or HTTP-date, cap 10s), retry 429/5xx/network only | Trivially small and fully testable with fake timers; no lib needed for a fixed 3-retry schedule |
| ATR / Wilder smoothing | Ad-hoc volatility formula | Standard Wilder ATR(14) implemented in `regime.ts` (~10 lines) | Canonical definition; hand-rolled variants diverge silently from TradingView/Yahoo values |

**Key insight:** Hand-roll only what is tiny, fixed-shape, and fully covered by tests (cache Map, backoff, shape-guard, ATR). Never hand-roll timezones, test infra, or chart math — those fail at DST boundaries and scale edges, not in dev.

## Q1 — Yahoo v8 Chart Endpoint: Findings & Recommendations

### Request shape (recommendation)
`GET https://query1.finance.yahoo.com/v8/finance/chart/NQ=F?period1={unix}&period2={unix}&interval=1d&events=history` [CITED: https://scrapfly.io/blog/posts/guide-to-yahoo-finance-api for host/path/params; `events=history` + `includePrePost=false` tagged [ASSUMED] — standard yfinance params, confirm against live response in implementation].
- `NQ=F` URL-encoded as `NQ%3DF` (`%3D` for `=`) [ASSUMED — verify live; harmless either way].
- 6-month D1 window: `period1 = now − 182 days`, `period2 = now` (unix seconds, computed server-side from injected `now` so tests are deterministic) [ASSUMED — window length per ROADMAP success criterion "bounded 6mo D1 window"].
- Failover: `query1` primary → `query2` fallback on 429/5xx/network error; alternate hosts across backoff retries (attempt n uses host n%2) [CITED: PITFALLS.md Pitfall 1; query1/query2 host pair CITED: scrapfly guide + Observable notes].

### Required headers (recommendation)
```ts
{
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://finance.yahoo.com/',
}
```
[CITED: PITFALLS.md Pitfall 1 — browser UA + Accept/Referer mandatory; default fetch/undici UA gets throttled]. No API key, no cookie/crumb flow: crumb issues belong to the v7 quote/download endpoints, not the v8 chart endpoint [ASSUMED — if v8 ever returns 401 "Invalid Cookie", treat as retryable-on-fallback-host once, then stale-serve; do NOT build a cookie-jar].

### Response JSON shape
```text
chart.result[0].timestamp[]                       // unix seconds, ascending
chart.result[0].indicators.quote[0]               // { open[], high[], low[], close[], volume[] } — parallel arrays, may contain null
chart.result[0].indicators.adjclose[0].adjclose[] // IGNORED for futures (D-08)
chart.result[0].meta                              // { symbol, exchangeTimezoneName, shortName, ... } → contractHint source
chart.error                                       // { code, description } — e.g. code "Too Many Requests" while HTTP is 200
```
[CITED: https://scrapfly.io/blog/posts/guide-to-yahoo-finance-api (`result[0].timestamp`, `indicators.quote[0].close` access pattern); error-code-in-200 behavior CITED: PITFALLS.md Pitfall 1 detection notes].

### Null-OHLC detection (recommendation)
Zip by index `timestamp[i] ↔ quote[i]`; **drop** any row where `open/high/low/close` is not all finite numbers — except the **last** row, which is kept with `forming: true` if it has at least a finite `close` (intraday partial), else dropped. Then re-validate strictly ascending `date` strings. Unit test with a fixture containing mid-array null runs [CITED: PITFALLS.md Pitfall 7]. `YYYY-MM-DD` derived per candle via `formatInTimeZone(ts*1000, 'Asia/Baku', 'yyyy-MM-dd')` — business-day strings end-to-end (Pitfall 3).

### Failure modes & Retry-After semantics
| Signal | Meaning | Action |
|--------|---------|--------|
| HTTP 429 (+ optional `Retry-After: <seconds>`) | Throttled | Backoff; honor header (seconds or HTTP-date, cap wait 10s); fail over host [ASSUMED cap — planner-adjustable] |
| HTTP 200 + `chart.error.code = "Too Many Requests"` | Soft throttle | Same as 429 [CITED: PITFALLS.md] |
| HTTP 5xx / network error / timeout (8s fetch `AbortSignal.timeout`) | Upstream down | Backoff + failover [ASSUMED timeout value] |
| HTTP 4xx other than 429 (400/401/403/404) | Client/shape problem | **Do NOT retry**; fail over once then stale/502 [CITED: PITFALLS.md Pitfall 1] |
| `result` empty / null, `timestamp` missing, meta.symbol mismatch | Schema drift | Validation failure → serve stale or 502, never cache [CITED: PITFALLS.md Pitfall 6] |

### Backoff schedule (recommendation) [ASSUMED — D-discretion item]
Attempts: initial + 3 retries. Delays: 500ms → 1000ms → 2000ms, each ±25% jitter. Honor `Retry-After` when present (cap 10s). Total upstream budget < ~8s; `maxDuration = 15` on the route. Retryable: 429 / 5xx / network / soft-throttle-in-200. Never retry other 4xx.

### Cache + serve-stale pattern (recommendation)
- Module-level `Map<string, { payload, fetchedAt }>` keyed `NQ=F:D1`, TTL 60s [CITED: CONTEXT D-02 + PITFALLS Pitfall 6].
- Hit & fresh → `source:'live'`-or-`'cache'` (recommend: `'live'` iff this request fetched upstream, `'cache'` iff served from Map within TTL), `stale:false`.
- Miss/expired + upstream OK → fetch, validate, store, serve `live`.
- Upstream fail + cache present (any age) → serve cache with `stale:true, source:'stale'`, `lastUpdatedISO` unchanged.
- Upstream fail + no cache → `502 { error, retryAfter: 60 }`, `Cache-Control: no-store` (D-03).
- Validation gate before store: symbol matches `/NQ/i`, timestamps strictly ascending, ≥5 complete candles [ASSUMED minimum — planner-adjustable], no null runs. Errors never stored.

## Q2 — ICT Math Core: Concrete Parameters & Rule Tables

All parameters below are researcher recommendations tagged [ASSUMED] (D-discretion items). Formulas tagged per D-09…D-13.

### Pinned numeric parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `ANCHOR_WINDOW` (N) | **20** closed candles | Matches CONTEXT's own example (D-05 "e.g. 20D"); ~1 trading month; responsive enough to re-anchor quarterly rolls without flickering weekly |
| `ATR_PERIOD` | **14** (Wilder smoothing) | Canonical ATR definition; matches what Yahoo/TradingView display so the 3× tripwire is comparable |
| `REGIME_AVG_WINDOW` | **20** bars of ATR(14) | Compare current ATR(14) vs SMA(ATR(14), 20); needs ≥34 closed candles for full confidence |
| `ROLLOVER_ATR_MULT` | **3** | Close-to-close jump > 3×ATR(14) with no intraday expansion is the standard abnormal-gap tripwire; synthetic-gap test asserts it fires |
| `EQ_BUFFER` | **0.48–0.52** | Locked by D-09 |
| `MIN_CANDLES_FULL` | **34** (= 14 + 20) | Below this, regime degrades; below 20, range itself is thin-flagged |
| Rationale language | **English** | Code output stays English per D-17 (Azerbaijani spec terms in comments/docs only); planner may add an `az` rationale map later without changing logic |

### Shared types sketch (`types.ts`)

```ts
interface Candle { date: string; open: number; high: number; low: number; close: number; forming?: boolean }
interface DealingRange { high: number; low: number; eq: number; window: number; asOf: string; thinHistory: boolean }
```

### range.ts — anchor + re-anchor (D-05, D-06, ICT-01, ICT-03)
- Inputs: `closed: Candle[]` (forming already excluded by caller), `asOfBakuDate: string`, `window = 20`.
- Extremes: `high = max(high)`, `low = min(low)` over last `window` closed candles. `thinHistory = closed.length < window` (compute over available, flag it).
- Re-anchor check: given previous range + new closed candle, if `close > prev.high` **or** `close < prev.low` → retire + re-anchor over window ending at that candle. Wick pierce (`high`/`low` beyond extreme but close inside) → no action. Guard `high === low` → position 0.5, thin-flag (divide-by-zero guard).

### levels.ts — EQ / quadrants / OTE (D-13, ICT-02)
- `eq = (high + low) / 2`; `q1 = low + 0.25·range`, `q3 = low + 0.75·range`; `position = (close − low) / (high − low)`.
- OTE pockets as **absolute prices**: bull (long-entry, in discount) `oteBull = { lo: high − 0.79·range, hi: high − 0.62·range }` = 62–79% pullback of the up-leg; bear mirror `oteBear = { lo: low + 0.62·range, hi: low + 0.79·range }`. Export both; `bias.ts`/`dol.ts` select which is actionable.

### bias.ts — rule table (D-09, D-10, ICT-04)

| Condition (evaluated top-down) | Bias | Rationale must contain |
|-------------------------------|------|------------------------|
| `closed.length < ANCHOR_WINDOW` (thin) | COMPRESSION | "insufficient history (n<N); degrading honestly" |
| `0.48 ≤ position ≤ 0.52` | COMPRESSION | "equilibrium-fair; longs and shorts blocked" |
| `position < 0.48` | BULLISH | "discount (pos=x); longs only in discount; regime=…" |
| `position > 0.52` | BEARISH | "premium (pos=x); shorts only in premium; regime=…" |

Regime is an input (from `regime.ts`), always named in the rationale; `rationale: string` is a required field — fail typecheck without it.

### dol.ts — rule table (D-11, ICT-05)

| Bias | Primary DOL | Name |
|------|-------------|------|
| BULLISH | `range.high` | `"Range High / PDH"` |
| BEARISH | `range.low` | `"Range Low / PDL"` |
| COMPRESSION | nearer extreme by \|price − extreme\| | `"Range High / PDH"` or `"Range Low / PDL"` + rationale "equilibrium — nearest liquidity; await expansion" |

Single `{ name, price }` output; PDH/PDL naming is aspirational until session-high logic exists (note in docs so Phase 2 doesn't over-claim).

### regime.ts — rule table (D-12, ICT-06)

| Condition | Regime | Rationale |
|-----------|--------|-----------|
| `closed.length < 34` | Compression | "insufficient bars for ATR(14)/20avg; honest degrade" |
| `atr(14) > sma(atr(14), 20)` | Expansion | "current ATR x > 20-bar avg y" |
| otherwise | Compression | "current ATR x ≤ 20-bar avg y" |

Binary output (no neutral band — keeps the badge honest and testable; planner may add hysteresis later).

### rollover.ts — tripwire (D-07, ICT-07)
- `gap = |close[i] − close[i−1]|`; if `gap > 3 × atr14` → `rolloverSuspect: true`, `contractHint` from Yahoo `meta` (e.g. `"NQ=F · CME · <exchangeTimezoneName>"`), plus proximity warning when `asOf` is within ±10 calendar days of a quarterly third Friday (Mar/Jun/Sep/Dec) [ASSUMED calendar convention — front-month roll ≈ 8 days before third Friday; confirm against 2026 CME calendar at implementation].
- Flag-and-continue: computation proceeds off current anchors; no freeze, no silent absorption (D-07).
- Never read `adjclose` anywhere — import-guard by simply not parsing it.

### Forming-candle exclusion (D-04)
Envelope carries the forming row for the chart; **every** `src/lib/ict` entry point filters `forming` rows first (single shared `closedOnly()` helper in `types.ts`). Position, ATR, regime, anchors all use the last *closed* close. Test: fixture with forming row asserting identical outputs with/without it.

## Q3 — Vitest Setup & DST Strategy

### Install + config (recommendation)
```bash
npm install -D vitest
```
```ts
// vitest.config.ts — Source pattern: vitest include docs [CITED: https://github.com/vitest-dev/vitest/blob/main/docs/config/include.md]
import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  test: { environment: 'node', include: ['src/**/*.test.ts', 'app/**/*.test.ts'] },
});
```
Scripts: `"test": "vitest run"`, `"test:watch": "vitest"`. Co-located `<module>.test.ts` per STRUCTURE.md convention. `environment: 'node'` (no DOM in Phase 1). Fake timers (`vi.useFakeTimers` + `setSystemTime`) for clock-injection tests.

### Time util shape (`src/lib/time.ts`)
```ts
export const BAKU_TZ = 'Asia/Baku';
export const CME_TZ = 'America/Chicago';
export function toBakuYMD(d: Date | number, now?: never): string // formatInTimeZone(d, BAKU_TZ, 'yyyy-MM-dd')
export function getAsOfBakuDate(now: Date = new Date()): string  // injected clock: tests pass explicit now
export function bakuOffsetMinutes(at: Date): number              // getTimezoneOffset(BAKU_TZ, at) — stable +240, asserted not assumed
```
Only `formatInTimeZone` + `getTimezoneOffset` from `date-fns-tz` (two-function surface; avoids Pitfall 9's package-mixing trap — never import `@date-fns/tz`, never hand offsets).

### DST test strategy (STATE-02)
Baku has no DST (UTC+4 fixed since 2016 [ASSUMED — asserted in-test via `getTimezoneOffset`, not trusted blindly]); US DST moves the CME side, so the Baku↔Chicago spread shifts 8h↔9h twice yearly. 2026 US transitions: spring forward **2026-03-08**, fall back **2026-11-01** (second Sunday March / first Sunday November rule [ASSUMED — tests compute offsets via Intl/date-fns-tz rather than hardcoding, so they self-verify]).
Required tests:
1. **March:** instant `2026-03-08T06:59Z` vs `2026-03-08T07:01Z` → Chicago offset flips −06:00→−05:00; Baku stays +04:00; `toBakuYMD` returns `2026-03-08` for both (10:59/11:01 Baku).
2. **November:** instant around `2026-11-01T06:00Z` → Chicago flips −05:00→−06:00; Baku stable; business-date assertions hold.
3. **Midnight-boundary:** UTC `2026-06-15T19:59Z` → Baku `23:59 (06-15)` vs `2026-06-15T20:01Z` → Baku `00:01 (06-16)` — proves string-bucketing, not timestamp, decides the D1 date.
4. **Proxy stamping:** `lastUpdatedISO` is instant-ISO; display formatting happens at the edge via `toBakuYMD`.

## Q4 — Pitfall Mitigations (PITFALLS.md items 1,2,3,6,7,8,9,10)

| # | Pitfall | Baked-in mitigation + proving test |
|---|---------|-------------------------------------|
| 1 | Yahoo 429/IP ban | Server-only proxy; browser UA set; q1→q2 alternating failover; 500ms→1s→2s jittered backoff honoring Retry-After; singleflight; 60s TTL; never retry non-429 4xx. **Test:** mock 429×2 then 200 → assert 3 upstream calls, backoff delays, `source:'live'` |
| 2 | Rollover gap corrupts range | Raw OHLC only; 3×ATR tripwire → `rolloverSuspect` + hint + proximity warning; flag-and-continue; gap never interpolated. **Test:** synthetic 250pt gap candle → flag fires, anchors unchanged until close-break |
| 3 | TZ triple-shift | Business-day strings end-to-end; single `src/lib/time.ts`; injected clock; IANA names both sides. **Tests:** March + November DST + midnight-boundary (Q3) |
| 6 | Stale-as-live | Validate-then-cache; envelope `{candles,lastUpdatedISO,stale,source}`; errors `no-store`; stale-serve on failure. **Test:** kill upstream (mock 500 always) with warm cache → `stale:true, source:'stale'`, payload identical; empty cache → 502 `{error,retryAfter}` |
| 7 | Null/misaligned OHLC | Index-zip, drop incomplete rows (last-row forming exception), re-validate ascending. **Test:** fixture with mid-array null runs → exact expected candle count + dates |
| 8 | Derived state in store | No store in Phase 1; ICT has zero store imports (enforce by code review + `grep` for `zustand` under `src/lib` in CI-less check step); selectors-derive-later documented for Phase 2 |
| 9 | tz-package confusion | Exactly one TZ import surface (`formatInTimeZone`, `getTimezoneOffset` from `date-fns-tz`); wrapped in `toBakuYMD`/`formatBaku`; winter+summer dates in tests |
| 10 | Fixture drift | Out of Phase 1 scope (fixtures are Phase 2) — but Phase 1 must export the `Candle` type from `src/lib/ict/types.ts` as the canonical contract future fixtures conform to; note in PLAN |

## Common Pitfalls (planner-facing)

### Pitfall A: Thundering herd at cache expiry
**What goes wrong:** 50 concurrent requests miss at :60s → 50 Yahoo calls → instant 429. **Avoid:** singleflight (Pattern 2) + jitter belongs to Phase 2 polling, but the proxy must already dedupe. **Warning signs:** 429s correlating with cache-TTL boundaries in logs.

### Pitfall B: Soft-throttle misread as success
**What goes wrong:** HTTP 200 with `chart.error` is parsed as candles → empty array cached as valid. **Avoid:** check `chart.error` before `chart.result`; treat as 429-class. **Warning signs:** `candles: []` with `stale:false`.

### Pitfall C: Forming candle leaking into anchors
**What goes wrong:** Intraday high becomes range high → bias computed off an unclosed extreme. **Avoid:** `closedOnly()` at every ict entry; test with/without forming row.

### Pitfall D: US-DST week off-by-one
**What goes wrong:** Everything passes until March/November, then bias flips a day early. **Avoid:** Q3 DST tests are gate tests, not nice-to-haves — they run in CI-equivalent (`npm test`) before merge.

## Code Examples

### Upstream fetch with failover + backoff (sketch — full impl in task)
```ts
// src/lib/yahoo.ts — fetch injectable for tests
const HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36', 'Accept': 'application/json', 'Accept-Language': 'en-US,en;q=0.9', 'Referer': 'https://finance.yahoo.com/' };
export async function fetchNQDaily(now: Date, fetchFn = fetch, sleep = realSleep) {
  const p1 = Math.floor(now.getTime() / 1000) - 182 * 86400, p2 = Math.floor(now.getTime() / 1000);
  // attempts alternate hosts; delays 500→1000→2000ms ±25% jitter; honor Retry-After (cap 10s); retry 429/5xx/network + chart.error throttle only
}
```

### Shape-guard + null-row filter (sketch)
```ts
export function parseChartJson(json: unknown): { candles: Candle[]; contractHint: string } {
  const r = json?.chart?.result?.[0]; if (json?.chart?.error || !r?.timestamp) throw new UpstreamError('soft-throttle-or-drift');
  const q = r.indicators?.quote?.[0]; if (!q) throw new UpstreamError('missing-quote');
  // zip by index, drop rows with non-finite O/H/L/C (last row → forming:true if close finite), map ts → toBakuYMD, assert ascending + symbol match
}
```

### Bias core (sketch)
```ts
export function computeBias(p: { position: number; regime: 'expansion' | 'compression'; nClosed: number }): BiasOutput {
  if (p.nClosed < ANCHOR_WINDOW) return { bias: 'COMPRESSION', rationale: `insufficient history (${p.nClosed}<${ANCHOR_WINDOW}); degrading honestly`, position: p.position };
  if (p.position >= 0.48 && p.position <= 0.52) return { bias: 'COMPRESSION', rationale: `equilibrium-fair at ${p.position.toFixed(2)}; regime=${p.regime}`, ... };
  const bull = p.position < 0.48;
  return { bias: bull ? 'BULLISH' : 'BEARISH', rationale: `${bull ? 'discount' : 'premium'} at ${p.position.toFixed(2)}; ${bull ? 'longs only in discount' : 'shorts only in premium'}; regime=${p.regime}`, ... };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `chart.addCandlestickSeries()` | `chart.addSeries(CandlestickSeries, opts)` | lightweight-charts v5 | Phase 2 concern, noted so fixtures/tests don't bake v4 API |
| `range=` relative windows | `period1`/`period2` absolute unix | yfinance/chart-endpoint practice | Deterministic, testable windows |
| `date-fns-tz` `zonedTimeToUtc`/`utcToZonedTime` | `fromZonedTime`/`toZonedTime` + `formatInTimeZone` | date-fns-tz v3 renames | Use only the v3 names verified in local install [VERIFIED: local node_modules] |

**Deprecated/outdated:** Yahoo official API (retired 2017 — there is no keyed alternative) [CITED: scrapfly guide]; sub-daily Vercel Cron on Hobby (daily-only — irrelevant to Phase 1, no cron planned).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | N=20 anchor window suits NQ D1 | Q2 params | Range too twitchy/slow → bias flicker or stale zones; trivially tunable (one constant + tests) |
| A2 | ATR(14) vs 20-bar SMA regime rule | Q2 regime | Mislabels chop as expansion; binary rule is intentionally crude — refine in v2 with hysteresis |
| A3 | 3×ATR rollover tripwire | Q2 rollover | False positives on genuine displacement days; mitigated by flag-and-continue (never blocks computation) |
| A4 | `events=history`, `includePrePost=false`, `NQ%3DF` encoding, 8s fetch timeout, ≥5-candle minimum, Retry-After 10s cap | Q1 | Minor request-shape mismatches surface immediately as validation failures in dev — loud, not silent |
| A5 | Quarterly third-Friday ±10d roll-proximity convention | Q2 rollover | Warning fires late/early around real roll week; cosmetic only (flag, not logic) |
| A6 | 2026 US DST dates (Mar 8 / Nov 1); Baku fixed +4 | Q3 | Tests self-verify via Intl offsets — a wrong date fails loudly, never silently |
| A7 | vitest age/downloads/repo metadata | Legitimacy audit | Negligible — vitest identity is High-reputation Context7-verified; registry version confirmed |
| A8 | 'live' vs 'cache' source semantics | Q1 cache | Cosmetic envelope wording; planner locks exact semantics |

## Open Questions (RESOLVED — each carries a stated fallback, none blocks the phase goal)

1. **Exact Yahoo `meta` fields for `contractHint` (RESOLVED — defensive pick)** — what we know: `meta` carries symbol/exchange/timezone [CITED: scrapfly guide]; unclear: whether front-month expiry is exposed. Recommendation: implement `contractHint` defensively (`meta.symbol + meta.exchangeName ?? fallback`), log a sample response in dev, adjust field picks without changing the type.
2. **Vercel per-instance Map behavior under Hobby (RESOLVED — L1-only)** — Phase 3's problem; Phase 1 treats the Map as best-effort L1 with CDN headers as the real shield. No action now.
3. **PDH/PDL vs range-high/low naming (RESOLVED — doc-note)** — D-11 says "range high / PDH side"; true prior-day-high needs session logic. Recommendation: name output `"Range High / PDH"` with a doc note that PDH-equality holds only when the extreme is yesterday's high; revisit in v2.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node + npm | install/test/build | ✓ (npm registry reachable; `npm view` succeeded) | node 20 typings present [VERIFIED: package.json] | — |
| Yahoo v8 endpoint | live candles | external (runtime) | n/a | serve-stale → 502 honesty chain (no fallback data source in Phase 1 by design) |
| Vercel | deploy | n/a Phase 1 | — | localhost + `vitest run` prove correctness; deploy is Phase 3 |

No databases, services, CLIs, or env vars required. Missing-with-no-fallback: none (Yahoo outage is handled, not blocking).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.0.0 (new devDependency) |
| Config file | `vitest.config.ts` (new — node env, `@` alias, `src/**/*.test.ts` + `app/**/*.test.ts`) |
| Quick run command | `npx vitest run` (also `npm test` once scripted) |
| Full suite command | `npx vitest run` (single suite; Phase 1 has no e2e/browser tier) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | Envelope shape + 60s TTL serve | unit (route logic via `src/lib/yahoo` + cache module, fetch mocked) | `npx vitest run src/lib/yahoo.test.ts` | ❌ Wave 0 |
| DATA-02 | Failover q1→q2, backoff honors Retry-After, stale-serve, 502-no-cache | unit (mock fetch sequences) | `npx vitest run src/lib/yahoo.test.ts -t "resilience"` | ❌ Wave 0 |
| ICT-01/02/03 | Range/EQ/quadrants/OTE math + close-only re-anchor; wick ignored | unit (synthetic candles) | `npx vitest run src/lib/ict/` | ❌ Wave 0 |
| ICT-04/05/06 | Bias table + rationale presence; DOL naming; regime + thin degrade | unit | `npx vitest run src/lib/ict/bias.test.ts src/lib/ict/dol.test.ts src/lib/ict/regime.test.ts` | ❌ Wave 0 |
| ICT-07 | 3×ATR gap → `rolloverSuspect`; raw OHLC (adjclose absent from parser) | unit (synthetic gap) | `npx vitest run src/lib/ict/rollover.test.ts` | ❌ Wave 0 |
| STATE-02 | Baku bucketing; Mar + Nov DST; midnight boundary; injected clock | unit (explicit `now` args + fake timers) | `npx vitest run src/lib/time.test.ts` | ❌ Wave 0 |
| DATA-01 edge | Null-row fixture → exact candle set | unit (JSON fixture) | `npx vitest run src/lib/yahoo.test.ts -t "null"` | ❌ Wave 0 (fixture: `src/lib/__fixtures__/yahoo-null.json`) |
| D-04 | Forming row excluded from all ict outputs | unit | `npx vitest run src/lib/ict/range.test.ts -t "forming"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run <touched-module>` (targeted, <5s)
- **Per wave merge:** `npx vitest run` (full suite, <30s — pure functions only, no network: all fetch mocked)
- **Phase gate:** Full suite green + `npx tsc --noEmit` + `npm run lint` before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` + `npm install -D vitest` + `test`/`test:watch` scripts in package.json
- [ ] `src/lib/yahoo.ts` (+ `src/lib/__fixtures__/yahoo-null.json`, synthetic gap builder in-test)
- [ ] `src/lib/time.ts` + `src/lib/time.test.ts` (March/November/midnight cases)
- [ ] `src/lib/ict/{types,range,levels,bias,dol,regime,rollover}.ts` + co-located `*.test.ts`
- [ ] `app/api/yahoo/route.ts` (thin: calls `src/lib/yahoo` + cache module; logic tested at lib level, route asserts envelope passthrough)

Fixture strategy: synthetic candle builders (`mkCandles(n, startPrice, drift)`) for math; one realistic Yahoo JSON fixture with a mid-array null run for the parser; one 250pt-gap fixture for rollover; DST instants as literal ISO strings. No network in tests — `fetch` and `setTimeout` injected; `vi.useFakeTimers` for backoff assertions.

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Public read-only terminal; no users/sessions (out of scope per REQUIREMENTS) |
| V3 Session Management | no | Stateless proxy; no cookies issued |
| V4 Access Control | no | Single fixed-symbol public endpoint; no user input reaches fetch (D-01 kills SSRF: URL is a constant, no params parsed) |
| V5 Input Validation | **yes** | Upstream JSON is untrusted input: shape-guard validates symbol/ascending/complete-OHLC before cache; envelope types enforced at TS strict |
| V6 Cryptography | no | No secrets, no tokens; plain HTTPS GET; never hand-roll |

Threat patterns: upstream schema drift (mitigation: loud validation failure + stale/502, never silent absorb); egress-IP throttling (mitigation: Q1 backoff/failover/singleflight); cache poisoning via error payloads (mitigation: validate-before-store, `no-store` on 502).

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` — Route Handler convention, `force-dynamic`, non-cached-by-default
- Context7 `/vitest-dev/vitest` docs — `include` glob patterns, project config shape
- `reference/institutional_rules.md` — normative Module 2 + report section 2 rules
- Local `node_modules/date-fns-tz` (3.2.0) — verified exports + live Baku-format probe
- npm registry — `vitest@5.0.0`, `date-fns-tz@3.2.0` version confirmation (2026-09-04)

### Secondary (MEDIUM confidence)
- https://scrapfly.io/blog/posts/guide-to-yahoo-finance-api (updated 2026-08-10) — v8 chart path, query1/query2, `result[0].timestamp` + `indicators.quote[0]` shape, `period1/period2` swap, UA requirement, unofficial-API status
- `.planning/research/SUMMARY.md` + `PITFALLS.md` — proxy/rollover/TZ/Vercel mitigations (project-curated, multi-source)

### Tertiary (LOW confidence → all in Assumptions Log)
- Numeric parameters (N=20, ATR 14/20, 3×, backoff timings) — researcher judgment, planner-adjustable
- Roll-proximity calendar convention; DST rule dates; `events=history`/`NQ%3DF`/timeout/min-candles specifics

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — installed versions verified against registry + local probes; one new dep (vitest) High-reputation documented
- Architecture: HIGH — Route Handler + pure-lib + singleflight are documented patterns; Yahoo specifics MEDIUM but isolated behind validation
- Pitfalls: HIGH — all 8 applicable PITFALLS items have concrete mitigation + proving test

**Research date:** 2026-09-04
**Valid until:** ~30 days (stable domain; re-check `vitest` latest + Yahoo shape only if implementation slips past Oct 2026)
