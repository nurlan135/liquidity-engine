# Phase 6: Dual-Symbol Proxy + Data Contracts - Research

**Researched:** 2026-09-06
**Domain:** Next.js App Router proxy parameterization + dual-symbol market-data contracts (Yahoo Finance NQ=F/ES=F daily + intraday)
**Confidence:** HIGH for proxy/store/freshness surgery (read from repo); MEDIUM for Yahoo intraday caps (web-sourced, low-confidence item flagged for live probe)

## Summary

Phase 6 parameterizes the proven v1.0 single-symbol NQ daily proxy (`src/lib/yahoo.ts` + `app/api/yahoo/route.ts`) into a dual-symbol (NQ=F, ES=F) daily + intraday (1d / 1h / 15m) pipe with per-symbol stale envelopes, staggered client polling, an intraday epoch contract, and a timestamp inner-join with coverage diagnostics. No SMT math, no AMD sessions, no report §3, no chart overlays — pipe only.

The existing machinery is directly reusable: query1→query2 failover, jittered backoff with `Retry-After` honor, module-level `payloadCache` (60s TTL + 30-min serve-stale) and `inFlight` singleflight in `src/lib/yahoo.ts`, stale-aware `Cache-Control` + 502 shape in the route, `deriveStatus` LIVE/STALE/CLOSED vocabulary in `src/lib/freshness.ts`, and `Candle.forming` + `closedOnly()` in `src/lib/ict/types.ts`. The phase is a disciplined parameterization of that pattern behind a strict symbol/interval allowlist, with a bare-`GET /api/yahoo` byte-identical NQ-daily default.

**Primary recommendation:** Parameterize `fetchNQDaily` into `fetchSymbol(symbol, interval, range, now)` behind `NQ=F`/`ES=F` + `1d`/`1h`/`15m` allowlists with composite `symbol:interval:range` cache keys, add an intraday epoch-seconds candle contract alongside (never replacing) the D1 `YYYY-MM-DD` contract, implement timestamp inner-join + coverage as pure `src/lib/ict` functions, and split the Zustand `refresh()` into two staggered per-leg refreshers (NQ :00 / ES :30 + jitter) with per-leg envelopes — with the Yahoo intraday lookback/density question resolved by a planner-scheduled live probe, not by assumption.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Stagger lives in client-side loops — two independent refresh timers in the store/hook layer (NQ at :00, ES at :30, jitter ±5–10s). The server route stays a dumb per-leg fetch; one leg's failure never blocks the other.
- **D-02:** Uniform 60s cadence for all legs (daily + 1H + 15M). Intraday payloads stay cheap via bounded history windows, so one cadence keeps the polling code simple.
- **D-03:** Keep polling always — hidden tabs and closed market do not pause timers. Serve-stale + the existing CLOSED status-strip semantics already handle closed-market honesty; no resume-edge bugs.
- **D-04:** Per-leg `lastUpdated` age is visible in the status strip (`NQ 12s · ES 48s` style). Phase 6 lays the data groundwork that Phase 7 SMT badges and Phase 9 §3 will consume.
- **D-05:** Bare `GET /api/yahoo` (no params) returns byte-identical NQ daily shape. New `?symbol=` / `?interval=` params are purely additive — existing store, tests, and Vercel drill keep working with zero changes.
- **D-06:** Never substitute NQ data for a failed ES leg. ES upstream failure serves ES last-good as stale or 502s — cross-symbol substitution would silently corrupt every downstream SMT comparison.
- **D-07:** The D1 NQ dealing-range anchor path stays fully independent of ES/join code. The timestamp join works on its own intersected working copy; ES coverage gaps never shorten NQ's `ANCHOR_WINDOW` recompute.
- **D-08:** Strict symbol allowlist (`NQ=F`, `ES=F` only). Unknown `?symbol=` values get 400 and are never forwarded to Yahoo (blocks SSRF-adjacent abuse and cache poisoning).
- **D-09:** Uniform 60s TTL for every symbol×interval combo — same as v1.0 proven. Daily data revalidates cheaply; one rule to verify.
- **D-10:** Same 30-minute serve-stale ceiling (`MAX_STALE_MS`) for all legs including intraday. The honest STALE flag communicates intraday staleness; uniform rule, uniform verify.
- **D-11:** Shared module-level Map with composite `symbol:interval(:range)` keys (extends the existing `payloadCache`). Least churn; one leg's eviction logic can't silently diverge. — **Reversibility:** costly — splitting to per-leg caches later touches every fetch/cache/singleflight call site
- **D-12:** Same CDN `Cache-Control` headers on all combos (`public, s-maxage=60, stale-while-revalidate=30`, `no-store` when stale). One verify path on the live URL.
- **D-13:** Join-coverage diagnostics (`{ nq, es, joined, dropped }`) ride in the envelope for selectors/support, plus a small debug line (`NQ 120 / ES 118 / joined 117`) during development. Collapsible/hidden in production UI, always present in data.
- **D-14:** The join warns, never refuses — it always returns intersected rows plus coverage counts. Refuse/NO-SIGNAL policy (e.g. coverage < 95%) belongs to Phase 7 selectors, not the data layer.
- **D-15:** Forming-candle exclusion at both layers — parser flags `forming: true` (as today), join drops forming rows before intersecting. SMT can never see a self-updating candle even if one layer regresses.
- **D-16:** Intraday contract uses UTC epoch seconds; D1 stays on business-day strings. Session labels are applied in Baku at render; the two contracts are never unified. — **Reversibility:** costly — the epoch-vs-string shape flows into the parser, join, chart mapper, and every intraday test fixture

### Claude's Discretion

None — user decided every question directly (no "You decide" selections).

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-04 | ES=F daily candles via parameterized `GET /api/yahoo?symbol=&interval=` proxy with per-combo cache keys, allowlists, singleflight (NQ pipe untouched) | Allowlist + param parsing pattern, composite cache-key design, per-leg singleflight, byte-identical default path |
| DATA-05 | NQ + ES intraday candles (1H and 15M) with intraday epoch contract — forming candle excluded, pre-join incomplete rows dropped, coverage diagnostics surfaced | Epoch-seconds contract (D1 strings untouched), bounded range matrix, parser forming-flag + join-side drop, coverage object |
| DATA-06 | Dual-symbol polling staggered (NQ :00 / ES :30 + jitter) with per-symbol stale envelopes — SMT refuses when either leg is stale, never merged `stale` boolean | Two-timer store design, per-leg `lastUpdatedISO`/`stale`/`source`, `deriveStatus` per-leg extension, status-strip `NQ 12s · ES 48s` pattern |
| DATA-07 | NQ/ES candles timestamp inner-joined before any cross-symbol comparison — no index-zipped alignment | Pure `innerJoinOnTimestamp` + `coverage` helper in `src/lib/ict`, misaligned-fixture test pattern, ANCHOR_WINDOW independence rule |

## Project Constraints (from CLAUDE.md / AGENTS.md)

Per `./CLAUDE.md` → `@AGENTS.md` (Next.js breaking-changes block). Directives extracted for planner compliance:

- **Next.js docs first:** "Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices." This research read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` (route-handler `request: NextRequest` + `request.nextUrl` + `RouteContext` conventions) [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md:62-72]. Planner must require implementers to re-check that guide for `searchParams` / `force-dynamic` / `maxDuration` usage rather than relying on training memory.
- **Do not commit the agent-rules block:** The `<!-- BEGIN:nextjs-agent-rules -->` block is re-added by `next dev` (verify at `node_modules/next/dist/server/lib/generate-agent-files.js`); removing it from a diff only re-creates the change — commit it with work to keep the tree clean.
- **PROJECT.md constraints (still binding):** Zero budget (Vercel Hobby only, no paid APIs); Zustand only for dashboard state (no Redux/Context); Yahoo proxy responses cached 60s; `src/lib/ict` functions must be pure (no I/O, no `Date.now` inside — inject time); rule-based deterministic output only, no LLM calls; stack is Next.js 16 App Router + TypeScript strict + Tailwind v4 + lightweight-charts (dynamic import) + date-fns-tz; shadcn restricted to button, dropdown-menu, dialog, toast, calendar, card [VERIFIED: .planning/PROJECT.md:55-61].

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Parameterized Yahoo fetch + allowlist + per-combo cache/singleflight | API / Backend (route + `src/lib/yahoo.ts`) | — | Secrets-free but upstream-facing; rate-limit, failover, and cache policy belong server-side where CDN headers apply |
| Per-leg envelope shape + coverage diagnostics | API / Backend | Frontend Server (SSR) | Envelope is the cross-tier contract; server produces, client guards with `isValidEnvelope`-style checks |
| Staggered polling timers (NQ :00 / ES :30 + jitter) | Browser / Client (Zustand store + hook layer) | — | D-01 locks stagger client-side; server route stays a dumb per-leg fetch |
| Timestamp inner-join + forming exclusion | API / Backend (pure `src/lib/ict` helper, no I/O) | Browser / Client (selector consumption) | Pure join is tier-agnostic; lives in `src/lib/ict` under the purity constraint, consumed by selectors |
| Per-leg freshness display (`NQ 12s · ES 48s`) | Browser / Client (status strip) | — | Display-only derivation from per-leg `lastUpdatedISO` via `deriveStatus`/`formatStripAge` |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next (App Router) | 16.3.4 [VERIFIED: package.json:22 — `"next": "16.3.4"`] | Route handler `app/api/yahoo/route.ts` with `force-dynamic`, `maxDuration`, `searchParams` | Already the project framework; route-handler conventions verified in vendored docs, not training memory |
| zustand | ^5.0.15 [VERIFIED: package.json:27 — `"zustand": "^5.0.15"`] | Dual-leg store state + staggered refresh timers | PROJECT.md mandates Zustand-only; v1.0 `refresh()` + `inFlight` singleflight pattern is the thing being split |
| date-fns-tz | ^3.2.0 [VERIFIED: package.json:18 — `"date-fns-tz": "^3.2.0"`] | `toBakuYMD`, `formatInTimeZone`, Baku display | Existing TZ utils already handle Baku; intraday epoch→display routes through the same module |
| typescript | ^5 [VERIFIED: package.json:40 — `"typescript": "^5"`] | Strict envelope / candle / coverage types | Strict mode already assumed by guards (`isValidCandle`, `isValidEnvelope`) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^5.0.0 [VERIFIED: package.json:42 — `"vitest": "^5.0.0"`] | Unit + contract tests (parser, join, freshness, store) | All phase verification; config `include: ['src/**/*.test.ts', 'app/**/*.test.ts']`, `testTimeout: 15000` [VERIFIED: vitest.config.ts:4-13] |
| lightweight-charts | ^5.2.1 [VERIFIED: package.json:19] | Not directly touched this phase | Intraday epoch-seconds shape must be chart-compatible (UTC epoch) even though overlays land in Phase 9 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Shared Map with composite keys (D-11) | Per-leg Maps or per-route handlers (`/api/yahoo/nq`, `/api/yahoo/es`) | Per-leg isolation is cleaner long-term but touches every fetch/cache/singleflight call site; D-11 locks shared-Map for least churn |
| Two client timers (D-01) | Single `/api/quotes?symbols=NQ,ES` aggregating route | Single route re-couples the legs (`Promise.all` poisoning) and contradicts D-01; reject |
| UTC epoch seconds intraday (D-16) | Unified ISO-string contract for D1 + intraday | Unification breaks the D1 business-day contract and every D1 fixture; D-16 forbids it |

**Installation:**

```bash
npm install
```

No new packages. All phase work uses the existing dependency set above.

**Version verification:** No new packages to verify. Versions above were read from `package.json` this session (see VERIFIED tags). No `npm view` needed because nothing is added.

## Package Legitimacy Audit

No external packages are installed in this phase. All work extends `src/lib/yahoo.ts`, `app/api/yahoo/route.ts`, `src/lib/store.ts`, `src/lib/freshness.ts`, and new pure helpers under `src/lib/ict/` using the existing stack.

**Packages removed due to SLOP verdict:** none
**Packages flagged as suspicious (SUS):** none

## Architecture Patterns

### System Architecture Diagram

```
Browser timers (Zustand, :00/:30 + jitter)
  │  GET /api/yahoo?symbol=NQ=F&interval=1d   │  GET /api/yahoo?symbol=ES=F&interval=1h
  ▼                                           ▼
Route handler (dumb per-leg fetch, allowlist 400, force-dynamic, maxDuration=15)
  │                                           │
  ▼                                           ▼
fetchSymbol(symbol, interval, range) ── composite cache key symbol:interval:range
  │  per-key singleflight  │  query1→query2 failover  │  validate-then-cache  │  60s TTL / 30-min serve-stale
  ▼                                           ▼
Per-leg envelopes { symbol, candles, contractHint, lastUpdatedISO, stale, source }
  │                                           │
  └───────────────┬───────────────────────────┘
                  ▼
        Timestamp inner-join (pure src/lib/ict)
        drop incomplete rows → drop forming → intersect keys → sort
                  │
                  ▼
   { joined, coverage: { nq, es, joined, dropped } }
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
D1 NQ anchor path      Phase 7+ selectors (SMT refuse when
(independent,           either leg stale; coverage warn)
UNCHANGED copy)        + status strip (NQ 12s · ES 48s)
```

A reader traces the primary use case (ES daily via parameterized proxy, NQ untouched) from timer → route param → cache key → per-leg envelope → store, and the secondary use case (intraday join) from two envelopes → pure join → joined rows + coverage.

### Recommended Project Structure

```
src/
├── lib/
│   ├── yahoo.ts         # fetchSymbol parameterization (surgery site)
│   ├── freshness.ts     # per-leg deriveStatus extension (additive)
│   ├── store.ts         # split refresh() → per-leg refreshers + timers
│   ├── time.ts          # Baku utils (reuse; intraday display routes here)
│   └── ict/
│       ├── types.ts     # Candle (+forming), IntradayCandle (epoch), closedOnly
│       ├── join.ts      # NEW: innerJoinOnTimestamp + coverage (pure, injected time)
│       └── range.ts     # UNTOUCHED D1 anchor path (D-07)
app/
└── api/yahoo/
    └── route.ts         # ?symbol=&interval=&range= parsing, allowlists, headers
src/lib/__fixtures__/   # NEW: es-daily, intraday, misaligned-join fixtures
```

### Pattern 1: Parameterized route with byte-identical default

**What:** `GET /api/yahoo` with no params delegates to the exact current NQ-daily path; `?symbol=` / `?interval=` / `?range=` select new legs. Unknown symbol → 400, never forwarded.
**When to use:** Always for this phase — D-05 and D-08 are locked.
**Example:**

```typescript
// Source: vendored Next.js docs node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md:62-72
// + existing app/api/yahoo/route.ts:6-21
import type { NextRequest } from 'next/server';

const SYMBOLS = ['NQ=F', 'ES=F'] as const;       // D-08 strict allowlist [ASSUMED naming — planner confirms constant location]
const INTERVALS = ['1d', '1h', '15m'] as const;  // Phase 6 intraday scope: 1H + 15M only per CONTEXT Specific Ideas

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;   // [CITED: node_modules/next/dist/docs/.../route.md — request.nextUrl pattern]
  const symbol = params.get('symbol') ?? 'NQ=F';
  const interval = params.get('interval') ?? '1d';
  if (!(SYMBOLS as readonly string[]).includes(symbol)) {
    return Response.json({ error: `unsupported symbol: ${symbol}` }, { status: 400 });
  }
  if (!(INTERVALS as readonly string[]).includes(interval)) {
    return Response.json({ error: `unsupported interval: ${interval}` }, { status: 400 });
  }
  // ... delegate to fetchSymbol(symbol, interval, range) with existing
  // force-dynamic + maxDuration = 15 + stale-aware Cache-Control preserved
}
```

### Pattern 2: Composite cache key + per-key singleflight

**What:** Extend the existing module-level `payloadCache` / `inFlight` Maps from the single `CACHE_KEY` to `symbol:interval:range` keys. All other machinery (TTL, serve-stale, failover, backoff) is reused untouched.
**When to use:** Every new symbol×interval leg — D-09/D-10/D-11 locked.
**Example:**

```typescript
// Source: existing src/lib/yahoo.ts:140-155 (surgery site, quoted verbatim below)
const CACHE_KEY = `${SYMBOL}:D1`;
const CACHE_TTL_MS = 60_000;
const MAX_STALE_MS = 30 * 60_000;
// [VERIFIED: src/lib/yahoo.ts:140-147] — quote: "const CACHE_KEY = `${SYMBOL}:D1`;",
// "const CACHE_TTL_MS = 60_000;", "const FETCH_TIMEOUT_MS = 4_000;",
// "const MAX_STALE_MS = 30 * 60_000;"

// Target shape (planner refines):
const cacheKey = (symbol: string, interval: string, range: string) =>
  `${symbol}:${interval}:${range}`;   // e.g. "ES=F:1h:3mo", "NQ=F:1d:182d"
```

### Pattern 3: Dual contract — D1 strings stay, intraday is UTC epoch

**What:** D1 candles keep `{ date: 'YYYY-MM-DD' }` via `toBakuYMD(ts * 1000)`; intraday candles use `{ time: epochSecondsUTC, ... }` with `forming` flagging preserved. Never unify (D-16).
**When to use:** Parser branching on interval — D-05 locked.
**Example:**

```typescript
// Source: existing src/lib/yahoo.ts:83-100 (forming convention, quoted verbatim):
// "candles.push({" / "date: toBakuYMD(ts * 1000)," / "forming: true," — last-row partial
// [VERIFIED: src/lib/yahoo.ts:83-100]
// Intraday branch keeps the same last-row-forming rule but emits epoch:
// { time: ts, open, high, low, close, forming?: boolean }  [ASSUMED field name — planner locks `time` vs `epochSec`]
```

### Pattern 4: Pure timestamp inner-join with coverage

**What:** `Map<time, candle>` per leg → intersect → sort ascending → return `{ joined, coverage: { nq, es, joined, dropped } }`. Drops incomplete rows pre-join and `forming` rows at both layers (D-15). Pure function, injected time only.
**When to use:** Before ANY cross-symbol comparison — DATA-07.
**Example:**

```typescript
// Source: PITFALLS.md Pitfall 3 "How to avoid" + D-13/D-14 (design pattern, not copied code)
function innerJoinOnTimestamp(nq: TStamped[], es: TStamped[]) {
  const esByTime = new Map(es.map((c) => [c.time, c]));
  const joined = [];
  let dropped = 0;
  for (const n of nq) {
    const e = esByTime.get(n.time);
    if (e) joined.push({ time: n.time, nq: n, es: e });
    else dropped++;
  }
  const coverage = { nq: nq.length, es: es.length, joined: joined.length, dropped };
  return { joined, coverage };  // join warns (coverage), never refuses — D-14
}
```

### Pattern 5: Staggered per-leg refresh with independent singleflight

**What:** Two timers in the store/hook layer (NQ at :00, ES at :30, jitter ±5–10s), each ≥60s cadence, always-on (D-02/D-03). Per-leg `inFlight` flags so one leg's failure never blocks the other (D-01/D-06).
**When to use:** Store surgery — `refresh()` splits into `refreshNQ()` / `refreshES()`.
**Example:**

```typescript
// Source: existing src/lib/store.ts:99-101 (client singleflight, quoted verbatim):
// "refresh: async () => {" / "if (get().inFlight) return;" / "set({ inFlight: true });"
// [VERIFIED: src/lib/store.ts:99-102]
// Target: inFlightNQ / inFlightES booleans + setInterval offsets with
// jitteredDelay-equivalent ±5–10s; on failure preserve last-known candles and mark
// THAT leg stale (existing catch-path precedent, src/lib/store.ts:122-131).
```

### Anti-Patterns to Avoid

- **`Promise.all([fetchNQ, fetchES])` coupling:** one leg's 429 blanks both; violates D-01/D-06. Fetch legs independently.
- **Merged `stale` boolean:** a single `stale` for both symbols hides mixed freshness and enables SMT-on-stale. Per-leg envelopes always (PITFALLS Pitfall 2, Technical Debt row 4).
- **Index-zipped comparison (`nq[i]` vs `es[i]`):** permanent phantom-divergence generator. Time-anchored join only (PITFALLS Pitfall 1/3, Technical Debt row 2).
- **Reusing the D1 string pipeline for intraday:** truncation, forming flicker, 50–200× payload. Separate epoch contract from day one (PITFALLS Pitfall 6, Technical Debt row 1).
- **Trimming NQ history to ES coverage:** mutates the validated D1 anchor. Join works on its own intersected working copy (D-07).
- **`Date.now()` / `new Date()` inside `src/lib/ict`:** breaks purity + snapshot determinism. Inject time (PITFALLS Pitfall 8).
- **Fixed-offset session math in this phase:** out of scope entirely (sessions are Phase 8), but the epoch contract must preserve raw UTC so Phase 8 can resolve via IANA `America/New_York`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Upstream rate-limit survival | Custom retry loop with fixed sleeps | Existing `fetchUpstream` machinery: query1→query2 alternation, `BASE_DELAYS_MS = [500, 1000, 2000]`, `jitteredDelay`, `retryAfterMs` with `MAX_RETRY_AFTER_MS` cap [VERIFIED: src/lib/yahoo.ts:143-145,167-180] | Honor-`Retry-After` + jitter + failover edge cases already proven; reimplementation reintroduces thundering-herd bugs |
| Timezone display | Manual `+4`/`+5` offset math | `date-fns-tz` `formatInTimeZone` via `src/lib/time.ts` (`BAKU_TZ = 'Asia/Baku'`, `toBakuYMD`) [VERIFIED: src/lib/time.ts:3-8] | DST transitions (March/November proven in v1.0) break hand-rolled offsets silently for months |
| Envelope validation | Ad-hoc truthiness checks | Extend `isValidEnvelope` / `isValidCandle` guards (`src/lib/store.ts:41-60`, `src/lib/yahoo.ts:182-194`) per leg + coverage object | Ascending-date + finite-OHLC + minimum-row invariants already encode the shape contract; per-leg reuse keeps client/server symmetric |
| Freshness vocabulary | New status enum | Extend `deriveStatus` (`LIVE`/`STALE`/`CLOSED`) + `STALE_AFTER_SEC = 120` + `formatStripAge` per leg [VERIFIED: src/lib/freshness.ts:5-8,53-61] | Azerbaijani status-strip copy (`STALE · … — son keş göstərilir`) and CLOSED-weekend semantics already proven; new vocabulary fragments honesty UX |
| Candle filtering | New forming/incomplete logic | Reuse `closedOnly()` (`src/lib/ict/types.ts:47-49`, quote: `"return candles.filter((c) => !c.forming);"`) + `parseChartJson` null-row filtering (`src/lib/yahoo.ts:71-101`) | Last-row-forming convention + null-drop already tested against the `yahoo-null.json` fixture (8 surviving candles) [VERIFIED: src/lib/yahoo.test.ts:47-78] |

**Key insight:** Every hard problem in this phase (throttle survival, timezone honesty, shape validation, staleness communication) was already solved once for one symbol. The phase wins by parameterizing those solutions, not by inventing parallel ones.

## Common Pitfalls

### Pitfall 1: Dual-symbol 429 storm (doubled load, halved headroom)

**What goes wrong:** Adding ES=F to the same 60s loop doubles upstream calls; Yahoo's unofficial IP-based limits bite first in production (shared Vercel egress IP). Lockstep refetch at :00 synchronizes the thundering herd. [CITED: .planning/research/PITFALLS.md Pitfall 2]
**Why it happens:** Single cache key / single envelope / `Promise.all` coupling; halving the interval to "keep up" with two symbols.
**How to avoid:** Per-combo cache keys, independent singleflight per key, stagger NQ :00 / ES :30 + jitter ±5–10s, keep each leg ≥60s (D-01/D-02/D-11). Bound intraday windows so payloads stay cheap.
**Warning signs:** Both legs go stale simultaneously every expiry boundary; NQ/ES `lastUpdatedISO` identical to the second; 429s reappear after months clean.

### Pitfall 2: Timestamp misalignment corrupts every comparison

**What goes wrong:** NQ/ES arrays differ in length, null runs, truncation, or maintenance-break gaps; index-zipped code compares Tuesday's NQ high with Wednesday's ES high. Plausible-looking, completely wrong. [CITED: .planning/research/PITFALLS.md Pitfall 3]
**Why it happens:** Dropping rows per symbol independently without a subsequent join; assuming equal lengths.
**How to avoid:** Inner-join on timestamp FIRST (Map-intersect-sort), drop incomplete rows pre-join, exclude forming at both layers (D-15), carry `{ nq, es, joined, dropped }` coverage (D-13). Join warns, never refuses (D-14).
**Warning signs:** `zip by index` anywhere near cross-symbol code; joined coverage <95% silently accepted; signal changes when fetch order flips.

### Pitfall 3: Intraday treated like D1

**What goes wrong:** Timestamps-as-date-strings, full-history `range=max` on a 60s loop, forming candle entering detectors, weekend/break gaps interpolated. Truncated series + flickering signals + Hobby bandwidth burn. [CITED: .planning/research/PITFALLS.md Pitfall 6]
**Why it happens:** Reusing the D1 pipeline for intraday because it exists.
**How to avoid:** Separate epoch-seconds contract (D-16); bounded windows per interval (see Interval/Range Matrix); `closedOnly` discipline in join + detectors; never interpolate gaps; `range=max` forbidden on any loop.
**Warning signs:** Intraday fetch with `range=max`; detector output changes between polls with no new closed candle; payload size grows with poll count.

### Pitfall 4: Single merged `stale` flag hides mixed freshness

**What goes wrong:** Envelope reports `stale: false` while the ES leg is 20 minutes old; downstream SMT presents mixed-freshness output as live truth. [CITED: .planning/research/PITFALLS.md Pitfall 8 + Technical Debt row 4]
**Why it happens:** Extending the v1.0 single-symbol envelope without splitting freshness per leg.
**How to avoid:** Per-leg `{ lastUpdatedISO, stale, source }` always; `deriveStatus` applied per leg; SMT-refusal reasons extend the existing reason-string vocabulary (Phase 7 consumes; Phase 6 only lays groundwork + status-strip ages per D-04).
**Warning signs:** Store shape with one `stale` for two candle arrays; §3/debug with no per-leg age.

### Pitfall 5: Unvalidated `?symbol=` passthrough (SSRF-adjacent + cache poisoning)

**What goes wrong:** Arbitrary ticker forwarded to Yahoo; attacker-chosen cache keys poison the shared Map and burn egress-IP quota. [CITED: .planning/research/PITFALLS.md Security Mistakes row 1]
**Why it happens:** Trusting query input as a URL path segment.
**How to avoid:** Strict allowlist (`NQ=F`, `ES=F` only) → 400, never forwarded (D-08); cache key built from the allowlisted value only; same for `interval` (`1d`, `1h`, `15m`).
**Warning signs:** Template-literal URL built directly from `params.get('symbol')` with no allowlist check above it.

### Pitfall 6: NQ anchor path contamination

**What goes wrong:** ES gaps or join intersection shorten NQ's `ANCHOR_WINDOW` recompute; validated D1 Premium/Discount (the core value) shifts because the second symbol exists. [CITED: .planning/phase CONTEXT D-07 + PITFALLS Integration Gotchas row 6]
**Why it happens:** Sharing one working copy between the D1 anchor selectors and the join.
**How to avoid:** D1 selectors keep reading the raw NQ candle array exactly as today (`computeRange(candles, asOfBaku, ANCHOR_WINDOW)` with `ANCHOR_WINDOW = 20` [VERIFIED: src/lib/ict/range.ts:4]); the join produces its own intersected copy that only Phase 7+ selectors consume.
**Warning signs:** `selectRange` or `computeRange` call sites gaining join/coverage parameters; NQ tests changing expected values after ES fixtures are added.

## Code Examples

Verified patterns from repo sources (quotes verbatim where [VERIFIED]):

### Per-leg envelope + stale-aware headers (extend, don't reinvent)

```typescript
// Source: app/api/yahoo/route.ts:6-21 [VERIFIED] — quote: "export const dynamic = 'force-dynamic';",
// "export const maxDuration = 15;", "'Cache-Control': envelope.stale ? 'no-store' : 'public, s-maxage=60, stale-while-revalidate=30',"
// Per-leg version keeps force-dynamic + maxDuration = 15, applies the same header rule per envelope,
// and keeps the 502 shape: Response.json({ error: message, retryAfter: 60 },
//   { status: 502, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' } })
```

### Validate-then-cache per leg (never cache errors)

```typescript
// Source: src/lib/yahoo.ts:256-258, 301-308 [VERIFIED] — quote: "if (!isValidPayload(candles, symbol)) {",
// "throw new UpstreamError('upstream payload failed validation', { retryable: false });"
// and "const nonRetryable4xx = err instanceof UpstreamError && err.retryable === false && ..."
// Rule: each leg validates independently (ascending timestamps, finite OHLC, symbol match,
// minimum rows); on failure serve that leg's last-good with stale: true within MAX_STALE_MS,
// else 502. One leg's validation failure never touches the other leg's cache entry.
```

### Client guard extension point

```typescript
// Source: src/lib/store.ts:41-60 [VERIFIED] — quote: "function isValidEnvelope(env: EnvelopeJson)",
// "if (!Array.isArray(env.candles) || env.candles.length < 1) return false;",
// "if (dates[i] <= dates[i - 1]) return false;"
// Extension: per-leg guard (same checks per envelope) + coverage object guard
// ({ nq, es, joined, dropped } all finite non-negative ints, joined <= min(nq, es)).
```

### Per-leg status-strip ages (D-04 format)

```typescript
// Source: src/lib/freshness.ts:48-61 [VERIFIED] — quote: "function ageCopy(ageSec: number): string {",
// "if (ageSec < 60) return `${ageSec} san əvvəl`;", "return `LIVE · ${ageCopy(ageSec)}`;"
// Extension: deriveStatus(envelopeNQ, now) + deriveStatus(envelopeES, now) independently,
// render `NQ 12s · ES 48s`-style paired ages (exact Azerbaijani copy follows existing
// formatStripAge vocabulary; planner pins the literal).
```

## Interval / Range Matrix (bounded windows)

| Interval | Yahoo `interval` | Recommended `range` | Why this bound | Confidence |
|----------|------------------|---------------------|----------------|------------|
| Daily | `1d` | `period1/period2` 182d window (existing: `period2 - 182 * 86400`) [VERIFIED: src/lib/yahoo.ts:211-213] | Proven v1.0; NQ pipe byte-identical | HIGH |
| 1H | `1h` | `3mo` | Inside Yahoo intraday caps with margin; keeps payload cheap at 60s cadence | [ASSUMED] — planner schedules live probe to confirm ES=F 1H density over 3mo |
| 15M | `15m` | `1mo` | Inside the ~60d 15m cap with margin; bounded per Pitfall 6 | [ASSUMED] — same live probe confirms row counts |

 pathology: `range=max` on any looped fetch is forbidden (Pitfall 3). Daily keeps the existing `period1/period2` scheme; intraday uses Yahoo `range=` style. Exact query-string construction (`range=3mo&interval=1h`) follows the existing path-builder precedent [VERIFIED: src/lib/yahoo.ts:213].

> **Low-confidence item (from CONTEXT):** ES=F 1H density / Yahoo lookback caps for intraday windows. Do NOT resolve by assumption. The planner must include a first-task live probe (dev-script or ad-hoc route hit, never a unit test hitting Yahoo): fetch `ES=F` at `1h`/`3mo` and `15m`/`1mo`, record returned row counts + truncation flags, and pin the final `range` values from observed density. No network probing was run in this research session.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single `CACHE_KEY = NQ=F:D1`, one envelope, one `stale` | Composite `symbol:interval:range` keys + per-leg envelopes | This phase (D-09/D-11) | Mixed freshness becomes expressible; SMT-refusal groundwork |
| Single `refresh()` + one `inFlight` | `refreshNQ()` / `refreshES()` + per-leg in-flight + :00/:30 stagger | This phase (D-01) | One leg's 429 never blocks the other |
| D1-only `date: YYYY-MM-DD` contract | Dual contract: D1 strings stay, intraday UTC epoch seconds (D-16) | This phase (D-05/D-16) | Intraday becomes session-bucketable without breaking D1 fixtures |
| Index-aligned cross-symbol reads | Timestamp inner-join + coverage (DATA-07) | This phase | Misaligned rows never compared |

**Deprecated/outdated:**
- Bare-string symbol interpolation into Yahoo URLs without allowlist: forbidden by D-08 (400, never forwarded).
- `range=max` looped polling: forbidden (Pitfall 3).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Yahoo serves `ES=F` at `1h`/`3mo` and `15m`/`1mo` with sufficient density (row counts comparable to NQ=F) | Interval/Range Matrix | Wrong windows → truncated intraday series or oversized payloads; mitigated by mandatory live-probe first task |
| A2 | Exact Yahoo intraday lookback caps (1m≈7d, 5m/15m≈60d) as quoted in PITFALLS Pitfall 6 | Interval/Range Matrix | Caps may be tighter/looser per symbol; same probe resolves |
| A3 | Intraday candle field name (`time` epoch seconds) and coverage object field names (`{ nq, es, joined, dropped }`) | Architecture Patterns | Name mismatch across parser/join/store/tests; planner locks names before implementation tasks |
| A4 | `?range=` passthrough design (vs server-derived range per interval) | Pattern 1 | Allowlist surface larger than needed; planner may lock server-derived ranges (interval→range map) to shrink it |
| A5 | Yahoo numeric rate limits (~360/hr doc claim, IP-keyed soft-ban behavior cited in PITFALLS Sources) | Pitfall 1 | Exact numbers are unofficial and variable; design does not depend on them (stagger + singleflight + serve-stale hold regardless) |
| A6 | Per-leg status-strip literal (`NQ 12s · ES 48s`) and coverage debug literal (`NQ 120 / ES 118 / joined 117`) | Patterns / CONTEXT Specific Ideas | Copy bikeshedding; planner pins literals with Azerbaijani-copy check |

## Open Questions (RESOLVED — all 3 closed by plan tasks, see per-question pointers)

1. **Live Yahoo intraday density for ES=F (RESOLVED — 06-01 Task 1)**
   - What we know: D1 path proven for NQ=F; PITFALLS cites community/unofficial caps (MEDIUM confidence).
   - What's unclear: Actual returned row counts for `ES=F` at `1h`+`3mo` / `15m`+`1mo`, and whether Yahoo truncates ES earlier than NQ.
   - Recommendation: Planner's first task is a live probe (manual dev-script, results pasted into the plan/verification log); pin `range` values from observed data. No unit test may hit Yahoo.
   - Resolution: 06-01 Task 1 runs the live probe, pastes ES=F 1h/3mo and 15m/1mo row counts into the SUMMARY, and pins RANGE_FOR_INTERVAL from observed data; fixtures stay hand-built.

2. **Intraday envelope field naming (RESOLVED — 06-01 Task 2)**
   - What we know: D-16 locks epoch-seconds vs date-strings; `Candle` has `forming?` + `closedOnly()` precedent.
   - What's unclear: Whether intraday reuses `Candle` with an added `time` field, or introduces `IntradayCandle` as a separate type.
   - Recommendation: Planner decides; constraint is D-16 non-unification + `closedOnly`-compatible `forming` semantics either way.
   - Resolution: 06-01 Task 2 introduces the separate `IntradayCandle` type with numeric epoch time plus `closedOnlyIntraday`, leaving `Candle` and `closedOnly` untouched.

3. **Coverage surfacing in production (RESOLVED — 06-04 Task 1)**
   - What we know: D-13 requires coverage always in data, collapsible/hidden in production UI.
   - What's unclear: Exact carrier (envelope field vs separate debug endpoint) and whether the store holds coverage per poll.
   - Recommendation: Planner picks the smallest-carrier option (envelope-attached coverage object); Phase 9 decides the visible debug line.
   - Resolution: 06-04 Task 1 holds the coverage object in store state, computed via the Plan 03 join over a projected working copy of the legs, warn-never-refuse per D-14.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js 16 build/test | ✓ | v24.11.1 [VERIFIED: `node --version` this session] | — |
| npm | Install / scripts | ✓ | 11.6.2 [VERIFIED: `npm --version` this session] | — |
| vitest | `npm test` | ✓ | ^5.0.0 (package.json; binary present at `node_modules/.bin/vitest`) | — |
| Yahoo Finance upstream (query1/query2) | All legs at runtime | Reachable at runtime only (not probed this session) | — | Per-leg serve-stale (30-min ceiling) + 502 shape; never cross-substitute (D-06) |
| Vercel Hobby | Deploy verify (DEPLOY-02 is Phase 9) | Not needed this phase | — | Local `next dev` + `vitest` for all Phase 6 verification except the live-URL drill |

**Missing dependencies with no fallback:** none for Phase 6 implementation.
**Missing dependencies with fallback:** Yahoo upstream outages → per-leg stale-serve/502 (D-06/D-10).

## Validation Architecture

| Property | Value |
|----------|-------|
| Framework | vitest ^5.0.0 |
| Config file | `vitest.config.ts` (`include: ['src/**/*.test.ts', 'app/**/*.test.ts']`, `testTimeout: 15000`) [VERIFIED: vitest.config.ts:4-13] |
| Quick run command | `npx vitest run src/lib/yahoo.test.ts src/lib/store.test.ts` |
| Full suite command | `npm test` (must stay 133/133 green baseline + new tests) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-04 | Bare `GET /api/yahoo` byte-identical NQ daily; `?symbol=ES=F` returns ES daily; unknown symbol → 400 never forwarded; per-combo cache keys; per-key singleflight | unit (route param + fetchSymbol with mocked fetchFn, no live Yahoo) | `npx vitest run src/lib/yahoo.test.ts` (+ new `src/lib/yahoo-params.test.ts` or extended cases) | ❌ Wave 0 (extend `src/lib/yahoo.test.ts` — exists, 10+ resilience cases [VERIFIED]) |
| DATA-05 | Intraday parser emits epoch contract; last-row forming flagged; incomplete pre-join rows dropped; forming excluded at join even if parser regresses | unit (fixture-driven: synthetic 1h/15m JSON with null runs + forming last row) | `npx vitest run src/lib/ict/join.test.ts src/lib/yahoo.test.ts` | ❌ Wave 0 (new fixtures + `src/lib/ict/join.test.ts`) |
| DATA-06 | Staggered timers (NQ :00 / ES :30 + jitter) fire independently; one leg's failure marks only that leg stale; no merged `stale`; per-leg ages render | unit (store with stubbed fetch, fake timers) + integration (two-leg refresh sequence) | `npx vitest run src/lib/store.test.ts` (extended per-leg cases) | ❌ Wave 0 (extend `src/lib/store.test.ts` — exists, singleflight + envelope cases [VERIFIED]) |
| DATA-07 | Inner-join on timestamp only; misaligned fixture (ES missing 3 middle candles, NQ 2 null rows) joins correctly with exact `dropped` count; D1 NQ anchor tests unchanged | unit (misaligned fixture, clean-vs-joined no-shift assertion) | `npx vitest run src/lib/ict/join.test.ts src/lib/ict/range.test.ts` | ❌ Wave 0 (new `join.test.ts`; `range.test.ts` exists — must stay green untouched) |

Cross-cutting gates (every plan): `npm test` full green; `npx tsc --noEmit` no-new-errors (pre-existing `app/layout.tsx` LayoutProps error from 3a3a1cb is noted residual, not to be fixed or worsened — STATE.md Blocker); `grep -rn "Date.now\|new Date()" src/lib/ict` clean for new join code (purity); `isValidEnvelope`-style guard rejects malformed per-leg payloads; live-probe results pasted (not a test).

### Sampling Rate

- **Per task commit:** `npx vitest run <touched-file>.test.ts` (targeted file plus `join.test.ts` when contracts change)
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green + byte-identical NQ default verified + misaligned-join + forming-exclusion + per-leg-stale tests green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/lib/ict/join.test.ts` — covers DATA-07 + DATA-05 join side (misaligned fixture, forming-drop, coverage counts, warn-never-refuse)
- [ ] `src/lib/__fixtures__/es-daily.json` + `intraday-1h.json` + `join-misaligned.json` — cover DATA-04/DATA-05/DATA-07 (synthetic Yahoo payloads; live-probe density informs sizes, fixtures stay hand-built)
- [ ] `src/lib/yahoo.test.ts` extensions — cover DATA-04 (allowlist 400s, per-combo keys, per-key singleflight, NQ default byte-identical)
- [ ] `src/lib/store.test.ts` extensions — cover DATA-06 (dual timers, independent failure, per-leg ages)
- [ ] Live-probe task (manual, not a test file) — covers A1/A2: hit real Yahoo for ES=F 1h/15m density, paste row counts, pin ranges

*(Existing `src/lib/yahoo.test.ts`, `src/lib/store.test.ts`, `src/lib/ict/range.test.ts`, `src/lib/time.test.ts` already cover the v1.0 baseline and must stay green.)*

## Security Domain

Security enforcement is enabled (`workflow.security_enforcement: true`, `security_asvs_level: 1` [VERIFIED: .planning/config.json:46-48]).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth surface in this phase (read-only public proxy) |
| V3 Session Management | No | No sessions |
| V4 Access Control | Partial | Symbol/interval allowlists are the access control on upstream fetch |
| V5 Input Validation | Yes | Strict allowlists (`NQ=F`/`ES=F`, `1d`/`1h`/`15m`) → 400; `isValidPayload` per leg; `isValidEnvelope` per leg client-side; cache key from allowlisted values only |
| V6 Cryptography | No | No crypto; no secrets |

### Known Threat Patterns for Next.js proxy + Yahoo upstream

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unvalidated `?symbol=` forwarded to Yahoo (cache poisoning, egress-IP burn) | Tampering / DoS | Allowlist + 400, never forward unknowns (D-08); key cache from allowlisted value |
| Error payload cached as data (poisoned leg served as live) | Tampering | Validate-then-cache per leg; never cache errors; serve last-good with `stale: true` or 502 (existing `yahoo.ts:301-308` precedent) |
| One leg's failure poisoning the other (coupled fetch) | Denial of Service | Independent per-leg fetch + singleflight + stagger; D-06 no-substitution rule |
| `Retry-After` / timeout abuse stalling the route | Denial of Service | Keep `FETCH_TIMEOUT_MS = 4_000`, `MAX_RETRY_AFTER_MS` cap, `maxDuration = 15` budget (WR-08: 4 attempts × 4s + ~3.5s backoff) [VERIFIED: src/lib/yahoo.ts:142-147] |

## Sources

### Primary (HIGH confidence)

- `src/lib/yahoo.ts` — fetchNQDaily, parseChartJson, failover/backoff/singleflight/cache/validate-then-cache (read fully this session)
- `app/api/yahoo/route.ts` — force-dynamic, maxDuration=15, stale-aware Cache-Control, 502 shape (read fully)
- `src/lib/store.ts` — refresh + inFlight singleflight + isValidEnvelope guard (read fully)
- `src/lib/freshness.ts` — deriveStatus, STALE_AFTER_SEC=120, formatStripAge copy (read fully)
- `src/lib/ict/types.ts` — Candle + forming + closedOnly (read fully)
- `src/lib/ict/range.ts` — ANCHOR_WINDOW=20, computeRange closed-only window (read partially)
- `src/lib/time.ts` — BAKU_TZ, toBakuYMD (read fully)
- `vitest.config.ts`, `package.json`, `.planning/config.json`, `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `06-CONTEXT.md`, `.planning/research/PITFALLS.md` — read this session
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` — route-handler request.nextUrl convention (per AGENTS.md mandate)

### Secondary (MEDIUM confidence)

- `.planning/research/PITFALLS.md` Sources section (LuxAlgo/innercircletrader/yfinance-#2128/CME-hours links) — consulted via the repo file, not re-fetched; Yahoo numeric limits treated as [ASSUMED]

### Tertiary (LOW confidence)

- WebSearch for Yahoo v8 interval/range caps and Next.js searchParams/maxDuration — queries issued, no usable result bodies returned this session; all cap/density claims therefore [ASSUMED] pending the live probe
- Training knowledge of Yahoo `interval=1h&range=3mo` URL shape — [ASSUMED], must be confirmed by the probe

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions read from package.json; no new dependencies
- Architecture: HIGH — surgery sites read line-level; locked decisions D-01..D-16 map 1:1 to patterns
- Pitfalls: HIGH for repo-grounded pitfalls (429, join, stale, allowlist, anchor); LOW for Yahoo intraday density (explicit probe task)
- Validation: HIGH — vitest config + existing test files verified on disk

**Research date:** 2026-09-06
**Valid until:** 2026-10-06 (stable domain; Yahoo caps are the only fast-moving item and are isolated behind the probe task)
