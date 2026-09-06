# Architecture Research: v2.0 Modul 3 (Liquidity Sequencing & SMT)

**Domain:** Brownfield extension — dual-symbol intraday ICT analytics on an existing single-symbol daily terminal
**Researched:** 2026-09-06
**Confidence:** HIGH (codebase read directly: store, proxy, chart, report, time, freshness; Yahoo interval semantics + ICT killzone windows verified via web)

## Standard Architecture (existing v1.0 — do not redesign)

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT (Next.js 16 App Router, 'use client' TerminalShell)      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ StatusStrip /│  │ NqChart      │  │ Report (§2 live,      │  │
│  │ Sentiment /  │  │ (lightweight │  │  §3 UNAVAILABLE) +    │  │
│  │ Calendar     │  │  charts v5,  │  │ module-3 / smt-row    │  │
│  │ panels       │  │  ZoneFill    │  │ UNAVAILABLE cards     │  │
│  │              │  │  Primitive)  │  │                       │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘  │
│         │                 │                      │               │
│         └─────────────────┴──────────────────────┘               │
│                           │ subscribe (selectors)                │
├───────────────────────────┴──────────────────────────────────────┤
│  STATE — src/lib/store.ts (Zustand 5, single store)              │
│  candles[] · contractHint · stale · scenario · asOfBaku          │
│  selectRange/selectBias/selectDOL/selectRegime/selectLevels/     │
│  selectRollover → all delegate to src/lib/ict pure functions    │
├──────────────────────────────────────────────────────────────────┤
│  LOGIC — src/lib/ict/* (pure: no I/O, no Date.now, inject time)  │
│  range · bias · dol · regime · rollover · levels · types         │
│  MAPPERS — chart-mapper.ts · zone-bands.ts · freshness.ts ·      │
│  session-line.ts · report.ts (constants) · time.ts (Baku/CME tz) │
├──────────────────────────────────────────────────────────────────┤
│  SERVER — app/api/yahoo/route.ts → src/lib/yahoo.ts              │
│  NQ=F hardcoded · query1→query2 failover · backoff · serve-stale │
│  60s CDN TTL · 15s maxDuration · per-instance Map cache          │
└──────────────────────────────────────────────────────────────────┘
```

Poll loop: `TerminalShell` owns the single 60s visibility-gated interval, calls `refresh()` (client singleflight via `inFlight`), which GETs `/api/yahoo` with `cache: no-store` and lets the server/CDN cache absorb the cost.

### Component Responsibilities

| Component | Responsibility | Modul 3 impact |
|-----------|----------------|----------------|
| `app/api/yahoo/route.ts` | Upstream fetch, cache headers | MODIFY — parameterize by symbol+interval |
| `src/lib/yahoo.ts` | Failover/backoff/stale/cache, NQ-hardcoded | MODIFY — multi-symbol, multi-interval, per-key cache |
| `src/lib/store.ts` | Candles + derived selectors | MODIFY — ES + intraday slices, new selectors |
| `src/lib/ict/*` | Pure domain math | EXTEND — new files, touch nothing existing |
| `src/lib/chart-mapper.ts` | Proxy → chart row mapping | EXTEND — intraday epoch mapping |
| `components/charts/nq-chart.tsx` | Candles + zone/level lines | MODIFY — Asia overlay primitive, second series (ES swing markers optional) |
| `components/charts/zone-primitive.ts` | Zone fill pattern | EXTEND — sibling session-overlay primitive, same pattern |
| `components/dashboard/terminal-shell.tsx` | Poll loop, panel wiring | MODIFY — parallel fetch, un-dim module-3/smt cards |
| `components/dashboard/report.tsx` | §2 live, §3 unavailable | MODIFY — §3 live block, §2 delivery-cycle line dynamic |
| `src/lib/report.ts` | Section-state constants | MODIFY — one flag flip (`index: 3 → live`) |
| `src/lib/time.ts` | Baku/CME tz helpers | EXTEND — add `America/New_York` tz (see Pitfall 1) |

## Recommended Project Structure (new files only)

```
src/lib/ict/
├── range.ts bias.ts dol.ts regime.ts rollover.ts levels.ts types.ts  # UNTOUCHED
├── swings.ts        # NEW — fractal swing detection findSwings(candles, k)
├── smt.ts           # NEW — detectSMT(nqSwings, esSwings) → divergence signal
├── transition.ts    # NEW — classifyTransition(h4, h1, d1Range) → internal/external state
├── sessions.ts      # NEW — Asia Range + Judas Swing detection (NY-anchored, tz-injected)
└── aggregate.ts     # NEW — aggregateTo4H(h1Candles, tz) 60m→4H synthesis
src/lib/
├── yahoo.ts         # MODIFY — SYMBOLS allowlist, interval param, per-key cache
├── store.ts         # MODIFY — esCandles, nqH1, nqM15, esH1 slices + selectors
├── chart-mapper.ts  # EXTEND — mapIntradayToSeries (epoch passthrough)
├── session-overlay.ts # NEW — Asia high/low band builder (zone-bands.ts sibling)
└── time.ts          # EXTEND — NY_TZ constant + session helpers
components/charts/
├── nq-chart.tsx       # MODIFY — props + Asia primitive attach
└── asia-primitive.ts  # NEW — clone of ZoneFillPrimitive geometry, time-window bands
```

### Structure Rationale

- **`ict/` stays append-only.** Existing selectors are proven on live data; Modul 3 adds files, never edits `range.ts`/`bias.ts`/`dol.ts`. A regression in D1 math would silently corrupt §2 — the one thing v1.0 guarantees.
- **One pure function per ICT concept.** `swings` → `smt`, `aggregate` → `transition`, `sessions` → AMD. Each is independently unit-testable with fixture candles, same as the v1.0 `*.test.ts` precedent (133/133 green).
- **Overlay primitives mirror, don't fork.** `asia-primitive.ts` copies the `ZoneFillPrimitive` attach/detach/`updateBands` skeleton; the sanctioned `buildZoneOverlayFallback` LineSeries-pair pattern in `zone-primitive.ts` is the time-boxed fallback if the primitive spikes.

## Architectural Patterns

### Pattern 1: Parameterized proxy, per-(symbol, interval) cache keys

**What:** `GET /api/yahoo?symbol=NQ=F|ES=F&interval=1d|60m|15m` (default `NQ=F,1d` = backward compatible). `yahoo.ts` replaces the single `CACHE_KEY = 'NQ=F:D1'` with `` `${symbol}:${interval}` `` keys in both `payloadCache` and `inFlight` maps; `SYMBOL`/`ENCODED_SYMBOL` constants become an allowlist `{ 'NQ=F': 'NQ%3DF', 'ES=F': 'ES%3DF' }` with symbol-mismatch guard per key.

**When to use:** This is the only sane shape — one route, uniform failover/backoff/stale logic, independent TTLs per slice.

**Trade-offs:** 4 upstream fetches per poll cycle (NQ-D1, ES-D1, NQ-60m, NQ-15m; ES-60m added only if intraday SMT makes the cut — see Data Flow). Yahoo throttle risk is absorbed by the existing per-key serve-stale + `stale-while-revalidate`. Route `maxDuration: 15` still holds because slices fetch in parallel with the existing 4s timeout budget.

**Example:**
```typescript
// yahoo.ts — generalize, keep every resilience behavior identical per key
const SYMBOLS = { 'NQ=F': 'NQ%3DF', 'ES=F': 'ES%3DF' } as const;
type Symbol = keyof typeof SYMBOLS;
type Interval = '1d' | '60m' | '15m';

export async function fetchSlice(
  symbol: Symbol, interval: Interval, now: Date,
  fetchFn = fetch, sleep = realSleep,
): Promise<Envelope> { /* same body as fetchNQDaily, key = `${symbol}:${interval}` */ }

// fetchNQDaily becomes a thin wrapper → zero breakage for existing callers/tests
export const fetchNQDaily = (now: Date, f = fetch, s = realSleep) =>
  fetchSlice('NQ=F', '1d', now, f, s);
```

### Pattern 2: Synthesize 4H from 60m — never ask Yahoo for 4H

**What:** Yahoo's interval vocabulary is `[1m,2m,5m,15m,30m,60m,90m,1h,1d,…]` — there is **no 4H interval** (verified HIGH). `aggregateTo4H(h1, tz)` groups 60m candles into 00/04/08/12/16/20 NY-anchored blocks (open=first open, high/low=extremes, close=last close). 1H = `60m` verbatim.

**When to use:** Always for H4; the grouping boundary must be NY-local (ICT session semantics), so the function takes a `timeZone` param and uses `date-fns-tz` — no `Date.now`, Baku/NY now injected like `computeRange(candles, asOf)`.

**Trade-offs:** Partial current block (only 2 of 4 hours elapsed) is a *forming* 4H candle — mark `forming: true` and exclude via the existing `closedOnly()` helper. Lookback cost: 4H × 20-block window needs ~80 × 60m rows ≈ 2 weeks; request `period1 = now − 30d` for 60m (Yahoo caps minute-interval ranges; 30d is safely inside the documented limit, MEDIUM confidence — verify in build with a live probe test).

### Pattern 3: Dual-envelope store with partial degrade (NQ required, ES optional)

**What:** Store holds independent slices — `candles` (NQ-D1, existing), `esCandles`, `nqH1`, `nqM15` (+ `esH1` only if intraday SMT is built) — each with its own `stale`/`lastUpdatedISO`. `refresh()` fires all slice fetches via `Promise.allSettled`: NQ-D1 failure keeps the v1.0 error path; ES/intraday failure sets only its slice stale and forces the dependent selectors (`selectSMT`, `selectAMD`) to `null` → existing UNAVAILABLE/empty copy renders. SMT/AMD must **never** take down §2 or the chart.

**When to use:** Every dual-symbol fetch. Failure domains stay decoupled.

**Trade-offs:** More store fields, but each slice reuses the proven `isValidEnvelope` guard parameterized by symbol. Intraday envelopes need a second guard (epoch timestamps, not Baku YMD strings) — see Anti-Pattern 2.

**Example:**
```typescript
// store.ts — new selectors delegate, same as v1.0 precedent
selectSMT: () => {
  const { candles, esCandles } = get();
  if (candles.length === 0 || esCandles.length === 0) return null;
  return detectSMT(findSwings(closedOnly(candles)), findSwings(closedOnly(esCandles)));
},
selectTransition: () => {
  const range = get().selectRange();
  const { nqH1 } = get();
  if (range === null || nqH1.length === 0) return null;
  return classifyTransition(range, aggregateTo4H(closedOnly(nqH1), NY_TZ), nqH1);
},
```

### Pattern 4: NY-anchored session detection, Baku-rendered display

**What:** `sessions.ts` defines killzones in **NY local** (`America/New_York`): Asia 19:00–00:00, London 02:00–05:00, NY 07:00–09:00/08:30–11:00 indices (verified MEDIUM — sources agree within 1h on Asia open; pin 19:00–00:00 NY and note the 20:00 variant in code comment). All window math via `formatInTimeZone(ts, NY_TZ, …)`. Asia Range = high/low of 15m rows inside the window; Judas Swing = wick beyond Asia high/low followed by close back inside during the subsequent London/NY window. Baku display (`Asia 04:00–09:00 Bakı` in winter) is derived at render, never stored.

**When to use:** All AMD logic. DST correctness falls out of `date-fns-tz` because NY observance is in the tz database — this is exactly why the v1.0 March/November Baku-DST tests exist; add NY-DST session fixtures the same way.

## Data Flow

### Request Flow (modified poll)

```
TerminalShell 60s visibility-gated tick (UNCHANGED cadence — zero budget)
    ↓ refresh()
Promise.allSettled([
  GET /api/yahoo?symbol=NQ=F&interval=1d   (existing pipe, REQUIRED),
  GET /api/yahoo?symbol=ES=F&interval=1d   (NEW, optional-degrade),
  GET /api/yahoo?symbol=NQ=F&interval=60m  (NEW, optional-degrade),
  GET /api/yahoo?symbol=NQ=F&interval=15m  (NEW, optional-degrade),
]) — server per-key cache (60s) + CDN absorb repeat cost
    ↓ per-slice isValidEnvelope guard
Zustand slices → pure selectors → chart / panels / report §3
```

- **Daily SMT first, intraday SMT as stretch.** Daily NQ-vs-ES swing comparison ships on the two D1 slices (2 extra upstream calls: ES-D1 only). Intraday SMT needs ES-60m too; defer unless §3 needs it — the spec's SMT clause does not fix a timeframe, daily divergence is a legitimate accumulation/distribution read.
- **15m Judas detection lags by design.** 60s poll on 15m candles means a Judas print is seen up to one bar late; the UI must say `Gözlənilir` (pending), never imply tick precision. No WebSocket, no shorter poll — Hobby + Yahoo throttle forbid it.
- **Chart data flow unchanged for D1** (date-string BusinessDay passthrough). Intraday rows carry **epoch seconds** (`UTCTimestamp`) straight from Yahoo `timestamp[]` — no Baku conversion on the time axis (conversion would bucket-shift bars across the NY-midnight boundary). Asia overlay bands are *prices* (high/low), so Baku never enters geometry.

### State Management

```
refresh() writes raw slices only (candles, esCandles, nqH1, nqM15)
    ↓ subscribe
stable selector-function subscription + derive-during-render
    ↓ (the selectLevels precedent — see Anti-Pattern 3)
NqChart props · module-3/smt-row cards · Report §3
```

New selectors (`selectSMT`, `selectTransition`, `selectAMD`, `selectAsiaRange`) return fresh nested objects → components must use the **stable selector-function pattern** (`const sel = useDashboard(s => s.selectSMT); const smt = sel();`), exactly as `selectLevels` does today.

### Key Data Flows

1. **SMT divergence:** NQ-D1 + ES-D1 → `findSwings(k=2)` each → `detectSMT` compares the two most recent swing highs/lows (higher-high vs lower-high = bearish divergence, etc.) → `smt-row` card + §3 `SMT Divergence Status` line. Date-alignment guard: inner-join on `date`; both are CME so holidays align, but the join makes it assumption-free.
2. **Internal/external transition:** NQ-D1 range (existing `selectRange`) + NQ-60m → `aggregateTo4H` → `classifyTransition`: price inside D1 range interacting with HTF structure = Internal; break + displacement into new 4H swing = External. Output feeds §2 `Delivery Cycle` (replaces hardcoded `Çatdırılma dövrü: D1`) and §3 `Engineered Liquidity Path`.
3. **Session AMD:** NQ-15m → Asia high/low → Judas check in London/NY windows → `selectAMD { asiaHigh, asiaLow, swept, judasSide }` → Asia overlay primitive (price band) + §3 `Session AMD Timing` line (`Təmizlənib/Təmizlənməyib`, `Baş verib/Gözlənilir`).

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (Hobby, 1 operator) | 4 parallel slice fetches per 60s tick; per-instance Map cache + CDN 60s. No change needed. |
| +N viewers | Same as v1.0: proxy cache absorbs it; Yahoo sees ~4 req/min/instance regardless of viewers. |
| Intraday history growth | 60m/30d ≈ 500 rows, 15m/14d ≈ 1300 rows — trivial for Zustand + lightweight-charts. Cap `period1` windows, never `period1=0`. |

### Scaling Priorities

1. **First bottleneck:** Yahoo 429s on 4-slice fan-out. Mitigation already designed: per-key serve-stale (30-min `MAX_STALE_MS`), jittered backoff, `allSettled` partial degrade. If throttled in prod, drop NQ-15m cadence to 120s (separate interval in `TerminalShell`) before touching anything else.
2. **Second bottleneck:** Route `maxDuration` 15s under parallel 4s-timeout retries. Slices fetch concurrently; worst case ≈ single-slice worst case. No action unless Vercel logs show 504s.

## Anti-Patterns

### Anti-Pattern 1: Reusing `CME_TZ` (America/Chicago) for killzones

**What people do:** `time.ts` exports `CME_TZ = 'America/Chicago'` and the header labels it "NY". Reuse it for session windows.
**Why it's wrong:** Chicago is CT (UTC−6/−5), New York is ET (UTC−5/−4) — every killzone lands 1h off, and Judas detection silently checks the wrong bars.
**Do this instead:** Add `NY_TZ = 'America/New_York'`; `sessions.ts` imports only `NY_TZ`. Leave `CME_TZ` for the header clock.

### Anti-Pattern 2: Baku-YMD strings for intraday bars

**What people do:** Reuse `toBakuYMD(ts)` in the intraday parser so all candles share the `Candle` shape.
**Why it's wrong:** 96 × 15m bars/day collapse onto one date string → ascending-date guard throws, chart shows one bar. Time-of-day is the entire content of intraday data.
**Do this instead:** New `IntradayCandle { t: number /* epoch sec */, open, high, low, close, forming? }` with epoch passthrough; separate `isValidIntradayEnvelope` (ascending `t`, finite OHLC). Daily `Candle` untouched.

### Anti-Pattern 3: `useShallow` on the new nested selectors

**What people do:** `useDashboard(useShallow(s => s.selectSMT()))` following the range/dol precedent.
**Why it's wrong:** `selectSMT`/`selectAMD` return fresh nested objects per call — the exact `selectLevels` infinite-loop failure documented in PROJECT.md decisions [03.2].
**Do this instead:** Stable selector-function subscription + derive during render (`const sel = useDashboard(s => s.selectSMT); const smt = sel();`).

### Anti-Pattern 4: One combined NQ+ES envelope

**What people do:** Single `/api/yahoo?symbols=NQ,ES` returning both series to "save a round trip."
**Why it's wrong:** Couples failure domains — an ES throttle takes down the NQ chart path; doubles payload; breaks the per-key stale contract (NQ fresh + ES stale can't be expressed in one `stale` flag).
**Do this instead:** One slice per request, `allSettled`, per-slice `stale` flags (Pattern 3).

### Anti-Pattern 5: SMT/AMD math inside components or the store

**What people do:** Swing comparison inline in `report.tsx` or inside `refresh()`.
**Why it's wrong:** Violates the `src/lib/ict` purity constraint (testability + monorepo extraction), untestable without a DOM, duplicates across cards.
**Do this instead:** Pure `swings.ts`/`smt.ts`/`sessions.ts` + thin selectors, mirroring `computeRange`/`computeBias` exactly.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Yahoo chart API (new intervals) | Same `HOSTS` failover path, `interval=60m/15m` + explicit `period1` windows (30d/14d) | 60m-range caps are the shakiest assumption (MEDIUM) — probe live in build; `90m` is NOT a substitute |
| lightweight-charts v5 | Epoch `UTCTimestamp` rows for intraday; new `AsiaRangePrimitive` (clone of `ZoneFillPrimitive`); ES stays off-chart (markers optional stretch) | Primitives already proven; autoscale `null` precedent holds |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| proxy ↔ store | 4 parallel GETs, `allSettled`, per-slice guards | NQ-D1 keeps v1.0 error/toast path; ES/intraday degrade silently to stale |
| store ↔ ict | New selectors → new pure fns, time injected | `closedOnly()` reuse for forming-bar exclusion; `asOfBaku`/`NY_TZ` injected, never `Date.now()` |
| store ↔ chart | New optional props (`asiaHigh/Low`, `smtMarkers?`) — existing props untouched | `[03.1]` precedent: smallest blast radius, conditional blocks only |
| store ↔ report | `REPORT_SECTIONS[3] → live`; §3 block reads `selectSMT/selectAMD/selectTransition` | §2 delivery-cycle line becomes dynamic from `selectTransition`; everything else byte-identical |
| TerminalShell ↔ panels | Un-dim `module-3` + `smt-row` cards (remove `pointer-events-none opacity-45` + UNAVAILABLE chip), wire live copy | Same dimming-pattern removal for each card; no layout change |

## Suggested Build Order (dependency-respecting)

1. **ES-D1 vertical slice** — `yahoo.ts` parameterization + route query params + `esCandles` slice + `selectSMT` (daily). Proves the entire dual-symbol pipe; §3 gets its first live line. No intraday, no chart change.
2. **`swings.ts` + `smt.ts` pure core** — fractal swings, divergence classification, date-join alignment; fixture tests incl. crafted divergence/non-divergence pairs. (Parallelizable with 1.)
3. **Intraday fetch** — NQ-60m + NQ-15m slices, `IntradayCandle` + guard, live probe test for range caps. Store-only; no consumers yet.
4. **`aggregate.ts` + `transition.ts`** — 4H synthesis (NY-anchored, forming-block handling) + internal/external classifier; §2 delivery-cycle line goes dynamic.
5. **`sessions.ts` + NY tz** — Asia Range + Judas detection, NY-DST fixture tests (March + November, mirroring the Baku-DST precedent).
6. **Chart overlays** — `asia-primitive.ts` + `NqChart` props + `mapIntradayToSeries`; Asia band on D1 chart (prices are timeframe-agnostic). Time-box the primitive; fallback is the sanctioned LineSeries pair.
7. **Report §3 + panel go-live** — flip `REPORT_SECTIONS`, §3 block, un-dim module-3/smt-row cards, Azerbaijani copy lock. Deploy + verify (cache, NY-timezone, §3 render).

## Sources

- Codebase (HIGH): `src/lib/store.ts`, `src/lib/yahoo.ts`, `app/api/yahoo/route.ts`, `src/lib/ict/{types,range}.ts`, `src/lib/time.ts`, `src/lib/{freshness,session-line,report,chart-mapper}.ts`, `components/{charts/nq-chart,charts/zone-primitive,dashboard/terminal-shell,dashboard/report}.tsx`, `reference/institutional_rules.md` (Modul 3 spec, §3 format), `.planning/PROJECT.md` (v2.0 scope, [03.x] precedents)
- Web (MEDIUM, cross-checked where load-bearing): Yahoo v8 `interval=[1m…1d]` vocabulary + minute-range limits (StackOverflow, Observable, Scrapfly 2026 guide); ICT killzone windows Asia 19/20:00–00:00 / London 02:00–05:00 / NY 07:00–09:00 (indices 08:30–11:00) NY-local (innercircletrader.net, tradingrage.com)
- Open verification items for build phase: Yahoo 60m/15m max lookback probe; Asia-open 19:00 vs 20:00 NY pin (documented variant, either is defensible — pick one, comment the other)

---
*Architecture research for: v2.0 Modul 3 (Liquidity Sequencing & SMT, NQ vs ES, full AMD)*
*Researched: 2026-09-06*
