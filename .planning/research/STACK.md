# Stack Research: v2.0 Modul 3 (Liquidity Sequencing, SMT, AMD)

**Domain:** ICT liquidity-sequencing extension on existing NQ terminal (second symbol, intraday structure, session logic)
**Researched:** 2026-09-06
**Confidence:** MEDIUM

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js App Router route handler (extended) | 16.3.4 (installed, no change) | Serve ES=F + 1h intraday through the existing Yahoo proxy pattern | Zero new infra: the v1.0 `fetchNQDaily` already owns failover, backoff, singleflight, 60s TTL, serve-stale. Generalizing it to `(symbol, interval)` reuses every proven resilience behavior instead of building a second fetcher that can drift |
| `src/lib/yahoo.ts` generalized fetcher | no version (own code) | One parameterized fetcher for NQ=F / ES=F × 1d / 1h | Yahoo v8 chart path is identical for futures symbols — only the symbol segment and `interval` param change. A single `fetchCandles(symbol, interval, now)` with allowlisted inputs keeps the symbol-mismatch guard, ordering guard, and validation contract in one place |
| `src/lib/ict` pure functions (extended) | no version (own code) | 4H/1H internal/external transitions, SMT divergence, Asia Range / Judas Swing detectors | Purity constraint (no I/O, inject time) is what made v1.0 testable; all Modul 3 math is deterministic candle arithmetic, so no library is needed — new modules (`sessions.ts`, `smt.ts`, `internal.ts`, `amd.ts`) follow the existing `range.ts`/`bias.ts` shape |
| date-fns-tz | ^3.2.0 (installed, no change) | Baku-aware Asia/London/NY session bucketing | `formatInTimeZone(ts, 'America/New_York', 'HH:mm')` buckets any candle into a killzone with DST-correct offsets via Intl; `getTimezoneOffset(tz, date)` gives the per-date offset so March/November DST shifts need no manual tables. The v1.0 March+Novermber DST proof transfers directly |
| lightweight-charts v5 primitives | ^5.2.1 (installed, no change) | Asia Range background bands + Judas/SMT pins on the chart | v5's `series.attachPrimitive()` session-highlighting pattern (official plugin-examples: `timeToCoordinate` pane view + canvas `fillRect`, `zOrder: 'bottom'`) shades session bands with no new dependency; `createSeriesMarkers()` pins Judas swings and SMT signals. Copy the ~60-line primitive inline — do not depend on a third-party drawing plugin |
| Zustand slices pattern | ^5.0.15 (installed, no change) | NQ slice + ES slice + derived SMT/AMD selectors in one store | Official slices pattern: one `StateCreator` per symbol domain, spread into a single `create()` store. SMT divergence and §3 report data stay **derived selectors** over both candle arrays (like `selectBias` today), never stored state — so the two symbols cannot desync |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | — | — | **No new dependencies.** Every Modul 3 capability maps onto an installed package or pure own-code. This is the headline finding: the v1.0 stack already covers the milestone |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| vitest | ^5.0.0 (installed) | Pin session-boundary DST cases (March + November Sundays), SMT fixture pairs, 4H aggregation from 1h rows — same pure-function test style as `range.test.ts` |
| Existing Yahoo proxy test harness | own code (`yahoo.test.ts`) | Extend with ES=F symbol-mismatch, `interval=1h` path building, and per-key (`SYMBOL:INTERVAL`) cache isolation cases |

## Installation

```bash
# No installs required — all capabilities are covered by installed packages:
# next 16.3.4, zustand ^5.0.15, lightweight-charts ^5.2.1,
# date-fns ^4.4.0, date-fns-tz ^3.2.0
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Generalize `src/lib/yahoo.ts` with `(symbol, interval)` params | Separate `/api/es` route + separate fetcher module | Never for this milestone — a second fetcher duplicates failover/backoff/stale logic and the two copies will drift. If a third venue (e.g. XAUUSD per spec exception) arrives, revisit |
| `?symbol=&interval=` query params on existing `/api/yahoo` | New route per symbol/interval | Only if Vercel cache-hit rates suffer from query-string variance — unlikely with `force-dynamic` + 60s `s-maxage` already in place |
| Aggregate 4H candles from 1h rows in `src/lib/ict` | Fetch `interval=4h` from Yahoo | Yahoo does not offer a 4h interval; 4H structure **must** be folded from 1h rows (6 rows per 4H block on the ET clock). This is pure grouping code, not a stack decision |
| Inline session-highlighting primitive (~60 lines, copied from official plugin-examples) | `lightweight-charts-drawing` / `line-tools-core` third-party plugin | Only if interactive drawing (drag/resize) is later required — Modul 3 needs static bands + markers, and third-party drawing deps add API-surface risk on a Hobby budget |
| ET (`America/New_York`) as session-definition clock | Chicago (`America/Chicago`, existing `CME_TZ`) as session clock | Keep canonical ICT killzones in ET (Asia 20:00–00:00, London 02:00–05:00, NY 07:00–10:00 ET) and convert display to Baku; use Chicago only for the existing header clock. Mixing definition clocks is the classic off-by-one source |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| React Query / SWR / any server-state lib | Second caching layer fights the proven 60s CDN TTL + module singleflight; adds bundle + invalidation semantics for zero gain | Existing `refresh()` + per-key cache entries |
| luxon / moment / dayjs for sessions | date-fns-tz already proven DST-correct here (March + November cases green); a second date lib doubles DST-edge risk | `formatInTimeZone` + `getTimezoneOffset` (installed) |
| `yfinance` (Python) or any scraper service | No Python runtime on Vercel Hobby; paid scrapers violate zero budget; direct v8 chart fetch already works | Extended `/api/yahoo` route |
| TradingView widget / charting lib swap | v5 dynamic-import chart with overlays is shipped and green; migration cost with no Modul 3 payoff | lightweight-charts v5 primitives |
| LLM calls for SMT/AMD signals | Determinism is a project constraint; swing comparison and session bucketing are codifiable rules | Pure `src/lib/ict` functions + rule-based §3 |
| WebSocket / streaming intraday feed | Vercel Hobby has no cheap socket story; 60s-poll 1h candles are sufficient for session-range structure | Poll the generalized proxy at the existing cadence |
| Third-party drawing-tools plugin for lightweight-charts | Unneeded API surface for static bands/markers; version skew risk against pinned v5.2.1 | Inline primitive copied from official plugin-examples |

## Stack Patterns by Variant

**If Yahoo 1h row count for ES=F comes back sparse (futures overnight gaps, holiday sessions):**
- Bucket sessions defensively: Asia Range = max/min of rows present in the window, require minimum 3 rows, else mark session `thinHistory`-style unavailable — same honest-degrade contract as D1
- Because futures trade near-24h, Yahoo 1h rows include overnight action; gaps are real market closures, not fetch bugs

**If 4 upstream combos (2 symbols × 2 intervals) strain the 15s `maxDuration`:**
- Fetch combos with `Promise.all` server-side (or two parallel client `refresh` calls into the per-key singleflight), keep 4s per-fetch timeout; worst case stays under budget the same way v1.0's 4-attempt budget did
- Because each combo has its own cache key + TTL, steady-state cost is one upstream fetch per combo per minute

**If NQ and ES timestamps misalign on 1h rows:**
- Align SMT swing comparison on daily closes (date-string keys, already Baku-normalized) and use 1h only for per-symbol internal structure — never compare cross-symbol intraday bar-to-bar
- Because cross-symbol bar alignment is the top false-signal source in SMT implementations

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| lightweight-charts ^5.2.1 | `attachPrimitive` + `createSeriesMarkers` plugin API | Both APIs are v5-native; the session-highlighting example targets the v5 plugin-examples tree — no version bump needed |
| date-fns-tz ^3.2.0 | date-fns ^4.4.0, `America/New_York` + `Asia/Baku` IANA zones | Already jointly proven in `time.ts` / `session-line.ts`; adding a third zone uses the same Intl path |
| zustand ^5.0.15 | React 19.2.8, slices `StateCreator` generics | Slices pattern is documented for v5; no middleware types change unless `persist`/`devtools` is added (it should not be) |
| Next 16.3.4 route handler | `force-dynamic` + `maxDuration = 15` + searchParams allowlist | Query-param extension needs no config change; validate `symbol`/`interval` against an allowlist and 502 otherwise (same `UpstreamError` shape) |

## Integration Points with Existing Code

| Existing piece | Modul 3 touchpoint | Change shape |
|----------------|--------------------|--------------|
| `src/lib/yahoo.ts` (`SYMBOL`, `ENCODED_SYMBOL`, `CACHE_KEY`, `fetchNQDaily`) | ES=F + `interval=1h` | Parameterize to `fetchCandles(symbol, interval, now)`; symbol allowlist `{NQ=F, ES=F}`, interval allowlist `{1d, 1h}`; cache key `${symbol}:${interval}`; keep mismatch/ordering guards per response |
| `app/api/yahoo/route.ts` | `?symbol=&interval=` | Parse + allowlist-validate searchParams, default to `NQ=F`/`1d` (backward compatible); per-combo `Cache-Control` identical to today |
| `src/lib/ict/*` (+ `types.ts` `Candle`) | `sessions.ts`, `smt.ts`, `internal.ts`, `amd.ts` | New pure modules reusing `Candle`/`closedOnly`; 4H folder groups 1h rows; SMT compares aligned daily swings; sessions bucket on ET clock with injected timestamps |
| `src/lib/store.ts` (`useDashboard`) | ES candles + SMT/§3 selectors | Add `esCandles` + `esMeta` via slice or parallel fields; `selectSMT`, `selectAMD`, `selectSection3` as derived selectors calling new ict modules |
| `src/lib/time.ts` + `session-line.ts` | Session clocks | Add `AMERICA_NEW_YORK` export alongside `BAKU_TZ`/`CME_TZ`; header line untouched |
| Chart component (lightweight-charts v5, dynamic import) | Asia Range bands + markers | Attach inline session-highlight primitive + `createSeriesMarkers` for Judas/SMT pins; existing zone overlays untouched |

## Sources

- `/marnusw/date-fns-tz` (Context7) — `formatInTimeZone`, `getTimezoneOffset`, DST transition behavior — MEDIUM confidence
- `/tradingview/lightweight-charts` (Context7) — series markers, session-highlighting `attachPrimitive` plugin example — MEDIUM confidence
- `/pmndrs/zustand` (Context7) — slices pattern, cross-slice updates, derived selectors — MEDIUM confidence
- Web (firecrawl search, verified) — Yahoo v8 `interval=60m/1h` support; intraday lookback ~60d, 1m ~7d/request; same path works for futures symbols — LOW/MEDIUM confidence, **spike-verify ES=F 1h row density in the first implementation phase**

---
*Stack research for: v2.0 Modul 3 (Liquidity Sequencing & SMT, NQ vs ES, full AMD)*
*Researched: 2026-09-06*
