# Architecture Patterns: ICT Liquidity Execution Terminal

**Domain:** Next.js trading-dashboard (NQ futures, ICT dealing-range terminal)
**Researched:** 2026-09-04
**Overall confidence:** HIGH for framework patterns (Context7 official docs), MEDIUM for Yahoo-proxy specifics (upstream rate-limits unverified, Firecrawl throttled)

## Recommended Architecture

Single Next.js 16 App Router app. Thin server proxy layer, fat pure-math core, single client terminal island. No backend, no DB, no auth in Phase 1.

```
                          ┌─────────────────────────────────┐
                          │  Yahoo Finance (upstream)        │
                          │  query1.finance.yahoo.com/v8    │
                          └───────────────┬─────────────────┘
                                          │ HTTPS, server-only
              ┌───────────────────────────▼───────────────────────────┐
              │  Route Handlers (server, Node runtime)                 │
              │  app/api/yahoo/route.ts   60s TTL + 429 backoff        │
              │  app/api/sentiment/route.ts  fixture-backed contract   │
              │  app/api/calendar/route.ts   fixture-backed contract   │
              └───────┬───────────────────────────┬───────────────────┘
                      │ JSON (Cache-Control:      │ JSON fixtures
                      │ s-maxage=60, SWR)         │ (replaceable later)
      ┌───────────────▼────────────┐  ┌───────────▼────────────┐
      │  RSC shell                  │  │  Client terminal island │
      │  app/page.tsx + layout.tsx  │  │  'use client'           │
      │  static header/panels frame │  │  polling + Zustand      │
      └───────────────┬────────────┘  └───────────┬────────────┘
                      │ props/initial data        │ selectors
      ┌───────────────▼───────────────────────────▼────────────┐
      │  Zustand store (client only)                            │
      │  src/store/useTerminalStore.ts                          │
      └───────────────┬─────────────────────────────────────────┘
                      │ raw state in, derived data via selectors
      ┌───────────────▼─────────────────────────────────────────┐
      │  Pure core (no I/O, no Date.now, importable anywhere)    │
      │  src/lib/ict/*  +  src/lib/time.ts  +  src/fixtures/*    │
      └─────────────────────────────────────────────────────────┘
                      │
      ┌───────────────▼─────────────────────────────────────────┐
      │  Chart island (dynamic, ssr:false, canvas)               │
      │  components/chart/CandleChart.tsx (lightweight-charts v5)│
      └─────────────────────────────────────────────────────────┘
```

**Opinionated rule: all ICT math lives in `src/lib/ict` and never touches `fetch`, `Date.now()`, `Intl`, or Zustand.** Everything else is a replaceable adapter around that core. This is what makes the dealing-range logic testable and monorepo-extractable later.

### Component Boundaries

| Component | Path | Responsibility | Communicates With |
|-----------|------|----------------|-------------------|
| Yahoo proxy route | `app/api/yahoo/route.ts` | Upstream fetch, 60s in-memory TTL, 429 exponential backoff, response shaping to `Candle[]` | Yahoo upstream (out); client fetcher (in). Nothing else imports it |
| Sentiment/calendar routes | `app/api/sentiment/route.ts`, `app/api/calendar/route.ts` | Serve fixture JSON behind the same contract real APIs will use later | Fixtures (read); client fetcher (serve) |
| RSC page shell | `app/page.tsx` | Static 3-panel frame, header, unavailable-state markers; embeds client island | Layout, TerminalShell |
| Terminal island | `components/terminal/TerminalShell.tsx` (`'use client'`) | Polling loop, store hydration, panel composition, Baku clock | Store, fetcher, 3 panels |
| Liquidity panel (left) | `components/terminal/LiquidityPanel.tsx` | BSL/SSL, dealing-range badge, sentiment rows; pure render from store selectors | Store only |
| Chart panel (center) | `components/terminal/ChartPanel.tsx` | Owns dynamic chart import, zone overlay props, execution-protocol strip | Store + CandleChart |
| Ticket panel (right) | `components/terminal/TicketPanel.tsx` | Decision, entry/SL/TP, R/R, confidence, fatal-flaw | Store only |
| Report shell | `components/terminal/ReportShell.tsx` | 6-section institutional report; sections 1,3–6 render unavailable markers in Phase 1 | Store (Module 2 section live) |
| Candle chart | `components/chart/CandleChart.tsx` | lightweight-charts lifecycle only: create, setData, price lines, destroy | Receives `candles + levels` props; emits nothing (no store import) |
| Chart loader | `components/chart/CandleChart.dynamic.ts` or inline `dynamic()` | `ssr:false` boundary + loading skeleton | Next dynamic boundary |
| Zustand store | `src/store/useTerminalStore.ts` | Raw client state: symbol, timeframe, candles, status, sentiment, dealing-range inputs | Fetcher (writes), panels/chart (reads via selectors) |
| ICT pure core | `src/lib/ict/*` | Dealing-range math, sentiment True AVG, DOL/bias, confidence inputs | Called by selectors and report builder; imports types + fixtures types only |
| Time helper | `src/lib/time.ts` | `Asia/Baku` formatting via date-fns-tz; session/kill-zone checks take injected `nowMs` | Called by components and ict callers, never inside ict core |
| Fixtures | `src/fixtures/sentiment.json`, `calendar.json` | ForexFactory + Myfxbook mocks; broker-exclusion flags | Imported by sentiment route and unit tests |
| Fetcher | `src/lib/fetcher.ts` | Single `fetchYahooCandles()` + `fetchSentiment()` with `cache:'no-store'` (server TTL owns caching) | Routes (calls), store hydration (feeds) |

### Data Flow

One direction, no cycles:

1. **Upstream → proxy:** Route handler `GET /api/yahoo?symbol=NQ=F&range=6mo&interval=1d` checks module-level `Map<string,{data,expiresAt}>`. Cache hit (<60s) → return immediately with `X-Cache: HIT`. Miss → `fetch` Yahoo with `cache:'no-store'`, 3 retries on 429/5xx with backoff (600ms → 1200ms → 2400ms + jitter), then shape to `Candle[] {time, open, high, low, close}` and store with `expiresAt = now + 60_000`. Exhausted → `429 + {error, retryAfter}` so the client shows stale-data state instead of crashing.
2. **Proxy → client:** `TerminalShell` polls with `setInterval(60_000)` + `visibilitychange` guard (no poll when tab hidden). Fetch uses `cache:'no-store'` so the browser never double-caches; the 60s TTL lives in exactly one place (the route). Response sets `store.setCandles()` / `store.setStatus()`.
3. **Store → derived math:** Nothing stores computed Premium/Discount. Selectors call pure functions at render: `selectDealingRange = (s) => computeDealingRange(s.candles)` and `selectReportModule2 = (s) => buildModule2Report(...)`. Raw candles in, derived levels out, every render deterministic.
4. **Derived → chart:** `ChartPanel` maps `dealingRange {rangeHigh, rangeLow, equilibrium, premiumBoundary, discountBoundary}` to `createPriceLine` overlays + shaded premium/discount zones (two histogram/area helper series or lightweight-charts v5 primitives). Chart never fetches and never imports the store — props in, canvas out.
5. **Fixtures → sentiment:** `/api/sentiment` returns fixture rows; `computeTrueAverage(rows)` (pure, in `src/lib/ict/sentiment.ts`) drops Insta/FiboGroup unless symbol is XAUUSD, computes BUY/SELL, sets `crowdedSide` flag at >60%. Same function runs in unit tests against the same fixture file.

Polling, cache TTL, and backoff constants live in one place each: `POLL_MS` in the island, `CACHE_TTL_MS` in the route, `BACKOFF_MS[]` in the route. Duplicating any of them across client and server is the fastest way to get stampeding Yahoo 429s.

## Patterns to Follow

### Pattern 1: Route proxy with module-level TTL + backoff (not fetch-cache)

**What:** Keep Yahoo caching in a module-scoped `Map`, not in Next's `fetch` cache or `revalidate`. Yahoo 429s need retry semantics Next's cache does not provide.

**When:** Every upstream-proxied GET in this project.

**Example:**

```typescript
// app/api/yahoo/route.ts
export const dynamic = 'force-dynamic'; // never prerender; query params make it dynamic anyway
export const runtime = 'nodejs'; // module-level Map persists per warm instance

const TTL_MS = 60_000;
const cache = new Map<string, { data: Candle[]; expiresAt: number }>();

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol') ?? 'NQ=F';
  const key = `d1:${symbol}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return Response.json({ symbol, candles: hit.data, cached: true },
      { headers: { 'X-Cache': 'HIT', 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' } });
  }
  const candles = await fetchYahooWithBackoff(symbol); // throws on exhausted 429
  cache.set(key, { data: candles, expiresAt: Date.now() + TTL_MS });
  return Response.json({ symbol, candles, cached: false },
    { headers: { 'X-Cache': 'MISS', 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' } });
}

async function fetchYahooWithBackoff(symbol: string, attempt = 0): Promise<Candle[]> {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=6mo&interval=1d`,
    { cache: 'no-store', headers: { 'User-Agent': 'Mozilla/5.0' } }
  );
  if (res.status === 429 && attempt < 3) {
    await sleep(600 * 2 ** attempt + Math.random() * 250);
    return fetchYahooWithBackoff(symbol, attempt + 1);
  }
  if (!res.ok) throw new UpstreamError(res.status);
  return shapeYahooResponse(await res.json());
}
```

Note on `force-dynamic`: reading `request.nextUrl` already forces dynamic rendering; the explicit export documents intent (this route must never be statically optimized) per Next docs. Do not use `force-static` here — that is for cacheable GETs without request data, the opposite of this proxy.

### Pattern 2: Dynamic chart island with hard client boundary

**What:** `CandleChart` is a plain `'use client'` component imported via `next/dynamic` with `ssr:false` and a skeleton fallback. The parent `ChartPanel` stays SSR-safe and only passes serializable props.

**When:** Always for lightweight-charts (it touches `window`, canvas, ResizeObserver at construction).

**Example:**

```typescript
// components/terminal/ChartPanel.tsx
'use client';
import dynamic from 'next/dynamic';
const CandleChart = dynamic(() => import('@/components/chart/CandleChart'), {
  ssr: false,
  loading: () => <div className="chart-skeleton">Loading chart…</div>,
});
// <CandleChart candles={candles} levels={dealingRange} />
```

```typescript
// components/chart/CandleChart.tsx  (v5 API — addSeries, not addCandlestickSeries)
'use client';
import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, LineStyle } from 'lightweight-charts';

export default function CandleChart({ candles, levels }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const chart = createChart(ref.current!, { layout: { background: { color: '#0E0E12' } } });
    const series = chart.addSeries(CandlestickSeries, { upColor: '#00FF88', downColor: '#FF00FF' });
    series.setData(candles);
    const lines = [levels.rangeHigh, levels.equilibrium, levels.rangeLow].map((price) =>
      series.createPriceLine({ price, color: '#00D9FF', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '' })
    );
    const ro = new ResizeObserver(([e]) => chart.applyOptions({ width: e.contentRect.width }));
    ro.observe(ref.current!);
    return () => { ro.disconnect(); chart.remove(); }; // non-negotiable cleanup
  }, [candles, levels]);
  return <div ref={ref} className="h-[400px] w-full" />;
}
```

v5 breaking change to respect: `chart.addCandlestickSeries()` is gone; it is `chart.addSeries(CandlestickSeries, opts)`. Any v4 tutorial code must be migrated.

### Pattern 3: Zustand single store, thin state + selector-derived math

**What:** One `create<TerminalState>()` store holding only raw inputs. All ICT outputs are selectors, not stored fields. Components subscribe to single slices so the 60s candle refresh does not re-render all three panels.

**When:** All dashboard state. No Context, no Redux, no per-panel stores (project constraint).

**Example:**

```typescript
// src/store/useTerminalStore.ts
import { create } from 'zustand';

interface TerminalState {
  symbol: string; timeframe: 'D1';
  candles: Candle[]; status: 'live' | 'stale' | 'error'; lastUpdatedMs: number | null;
  sentiment: SentimentRow[] | null;
  setCandles: (c: Candle[]) => void;
  setStatus: (s: TerminalState['status']) => void;
}

export const useTerminalStore = create<TerminalState>()((set) => ({
  symbol: 'NQ=F', timeframe: 'D1',
  candles: [], status: 'live', lastUpdatedMs: null, sentiment: null,
  setCandles: (candles) => set({ candles, lastUpdatedMs: Date.now(), status: 'live' }),
  setStatus: (status) => set({ status }),
}));

// selectors (colocated in src/store/selectors.ts):
export const selectCandles = (s: TerminalState) => s.candles;
export const selectDealingRange = (s: TerminalState) =>
  s.candles.length ? computeDealingRange(s.candles) : null; // pure call, not stored
```

Usage discipline: `useTerminalStore(selectCandles)` per component — never `useTerminalStore()` bare (that subscribes to everything). Zustand v5 + React 19 needs no middleware for this shape; skip `subscribeWithSelector`/persist until a proven need.

### Pattern 4: Pure ICT core with injected time

**What:** `src/lib/ict/` exports deterministic functions. Current time, timezone, and locale formatting are parameters, never internals.

**When:** Every line of dealing-range, sentiment, and report logic.

**Layout:**

```
src/lib/ict/
  types.ts          Candle, DealingRange, Bias, SentimentRow, DOL
  dealing-range.ts  computeDealingRange(candles): swingHigh/Low, equilibrium, premium/discount %, position
  sentiment.ts      computeTrueAverage(rows, { excludeBrokers }): TrueAvg + crowdedSide flag
  report.ts         buildModule2Section(dealingRange, sentiment, nowMs): report section 2 content
  index.ts          barrel re-exports only
src/lib/time.ts     formatBaku(ms), isKillZone(nowMs, zone), sessionOfDay(nowMs)  (date-fns-tz, Asia/Baku)
src/fixtures/
  sentiment.json    { source, brokers: [{name, buyPct, sellPct}] }
  calendar.json     [{ event, impact, startsAt }]
```

```typescript
// dealing-range.ts — sketch of the purity contract
export function computeDealingRange(candles: Candle[]): DealingRange {
  const highs = candles.map((c) => c.high), lows = candles.map((c) => c.low);
  const rangeHigh = Math.max(...highs), rangeLow = Math.min(...lows);
  const equilibrium = (rangeHigh + rangeLow) / 2;
  const last = candles[candles.length - 1].close;
  const positionPct = ((last - rangeLow) / (rangeHigh - rangeLow)) * 100;
  return { rangeHigh, rangeLow, equilibrium, positionPct,
    zone: positionPct >= 50 ? 'premium' : 'discount',
    bias: positionPct >= 50 ? 'bearish' : 'bullish' }; // premium→expect draw to discount, per ICT
}
```

Kill-zone/session logic takes `nowMs: number` from the caller (`Date.now()` at the island, fixed epoch in tests). A function that calls `Date.now()` or `new Date()` internally is rejected in review — it is untestable by construction.

### Pattern 5: Fixture-backed routes with forward-compatible contracts

**What:** `/api/sentiment` and `/api/calendar` return the exact JSON shape the future real APIs will return, read today from `src/fixtures/*.json`. Client code never knows fixtures exist.

**When:** Phase 1 mocks; later phases swap the route internals to real fetches without touching any component.

**Example:** route reads `src/fixtures/sentiment.json` and returns `{ asOf, rows }`; client `fetchSentiment()` parses the same Zod/type as the future live payload. Fixture files are versioned test vectors — unit tests import them directly to assert `computeTrueAverage` (e.g., 72/28 BUY-heavy → crowded-long flag).

### Pattern 6: 3-panel terminal composition (matches reference/design.html)

**What:** Fixed dark grid `280px 1fr 320px` (`#0A0A0F` bg, `#14141E` panels, `#00D9FF` accent). RSC page renders the frame; client island fills it.

```
app/page.tsx (RSC)
└─ TerminalShell ('use client': polling + store hydration)
   ├─ <header> LIQUIDITY ENGINE // NQ=F | Baku clock | NY session | confidence
   ├─ grid
   │  ├─ LiquidityPanel  (BSL/SSL, dealing-range badge, sentiment True AVG)
   │  ├─ ChartPanel → CandleChart (dynamic) + ExecutionProtocolStrip (kill zone, WHY NOW, OTE)
   │  └─ TicketPanel (decision, entry/SL/TP1-3, R/R, confidence, fatal flaw)
   └─ ReportShell (sections 1–6; non-Module-2 marked UNAVAILABLE)
```

**When:** This exact composition is the Phase 1 UI target. Later phases fill unavailable sections without rearranging the grid.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Caching in two places (fetch-cache + manual TTL)
**What:** Setting `cache:'force-cache'` or `next.revalidate` on the Yahoo upstream fetch while also keeping a manual TTL.
**Why bad:** Two TTLs drift; stale data blamed on the wrong layer; 429 retries bypass the framework cache and stampede anyway.
**Instead:** Upstream fetch is always `cache:'no-store'`; the route's `Map` + `Cache-Control: s-maxage=60` is the single TTL owner.

### Anti-Pattern 2: Chart component that fetches or reads the store
**What:** `CandleChart` calling `fetch()` or `useTerminalStore()` internally.
**Why bad:** Couples canvas lifecycle to network timing; double-subscribes; makes the chart untestable and un-reusable for later timeframes.
**Instead:** Props in (`candles`, `levels`), canvas out. Data orchestration belongs to `ChartPanel`/`TerminalShell`.

### Anti-Pattern 3: Missing chart cleanup
**What:** `useEffect` creating a chart without `chart.remove()` + `ResizeObserver.disconnect()` in the return.
**Why bad:** Every poll/remount leaks a canvas + observer; tab slows to a crawl within minutes on a 60s refresh loop.
**Instead:** The cleanup return shown in Pattern 2 is mandatory, not stylistic.

### Anti-Pattern 4: Storing derived ICT outputs in Zustand
**What:** `setDealingRange()`, `setBias()` actions called after each fetch.
**Why bad:** Raw and derived state desync (update one, forget the other); premium/discount bugs hide in action ordering instead of in one pure function.
**Instead:** Store raw candles; derive via selectors calling `src/lib/ict` at render.

### Anti-Pattern 5: Time calls inside pure modules
**What:** `Date.now()`, `new Date()`, `Intl.DateTimeFormat` with implicit local zone inside `src/lib/ict`.
**Why bad:** Baku vs Vercel-UTC vs trader-local differences become unreproducible; tests become time-bombs.
**Instead:** Inject `nowMs`; format in `src/lib/time.ts` with explicit `Asia/Baku`.

### Anti-Pattern 6: v4 lightweight-charts API copy-paste
**What:** `chart.addCandlestickSeries(...)`, `chart.addLineSeries(...)` from old tutorials.
**Why bad:** Removed in v5 — runtime TypeError on first render.
**Instead:** `chart.addSeries(CandlestickSeries, opts)` / `chart.addSeries(LineSeries, opts)`.

## Scalability Considerations

| Concern | Phase 1 (1 user, D1, Vercel free) | 10 users / intraday later | 1K+ users |
|---------|-----------------------------------|---------------------------|-------------|
| Yahoo rate limits | In-memory 60s TTL + backoff suffices; one warm instance | Move TTL to Vercel KV/Upstash; stagger polls per session | Dedicated market-data provider (paid); Yahoo proxy retired |
| Polling fan-out | 60s client interval, hidden-tab guard | Consider SWR dedup + `stale-while-revalidate` header tuning | WebSocket/SSE push; routes become pub/sub edge |
| Chart perf | D1 ~150 candles, trivial | Intraday 5M = thousands of points; downsample + `setData` diffing | Virtualized series, worker-side aggregation |
| Store growth | Single flat store fine | Split into slices (`createCandlesSlice`, `createReportSlice`) via Zustand slices pattern | Persist + subscribeWithSelector for cross-tab sync |
| Fixtures | Static JSON imports | Route-level `export const revalidate = 300` for calendar | Real sentiment/calendar adapters behind same route contracts |

## Suggested Build Order (dependencies between components)

Build in this order — each step is independently verifiable and later steps assume earlier contracts:

1. **`src/lib/ict` pure core + unit tests** — types, dealing-range, sentiment True AVG. No UI, no network. This is the core value; if the math is wrong nothing else matters. Verifiable with fixtures alone.
2. **Fixtures + sentiment/calendar route contracts** — `src/fixtures/*.json`, `computeTrueAverage` green, routes serving the future-stable shape. Unblocks panels without Yahoo.
3. **Yahoo proxy route** — TTL + backoff + `Candle[]` shaping, verified with curl (HIT/MISS headers, 429 path). Unblocks all live data.
4. **Zustand store + fetcher + selectors** — raw state, polling-ready actions, derived dealing-range selector. Verifiable with mocked fetch.
5. **CandleChart island (dynamic boundary)** — static candles → rendered chart with price lines + cleanup. Verifiable in isolation via Storybook-style test page.
6. **3-panel shell + panels** — TerminalShell, Liquidity/Chart/Ticket panels against live store. Matches `reference/design.html` grid and tokens.
7. **`app/page.tsx` composition + Baku clock** — RSC frame, header session logic, report shell with unavailable markers. Final visual pass.
8. **Deploy + verify** — Vercel free tier; assert cache headers, backoff behavior under throttling, and Baku-time correctness in production (UTC-default server vs Asia/Baku display).

Skipping ahead (e.g., panels before the pure core) produces UI wired to placeholder math that later gets ripped out — the most expensive rework in this codebase shape.

## Sources

- Next.js docs via Context7 `/vercel/next.js` — Route Handler `dynamic = 'force-static'` vs dynamic-request behavior, `cache:'force-cache'` + `revalidateTag` semantics, `next/dynamic` with `ssr:false` client-component lazy loading, `use cache: remote` streaming patterns. Confidence: HIGH.
- Zustand docs via Context7 `/pmndrs/zustand` — slices composition pattern, `subscribeWithSelector` API, selector-based consumption and derived-state-via-selectors guidance. Confidence: HIGH.
- lightweight-charts docs via Context7 `/tradingview/lightweight-charts` — v4→v5 `addSeries` migration, `createPriceLine` API, React component tutorial structure. Confidence: HIGH.
- Scaffold reads (package.json: next 16.3.4, react 19, lightweight-charts ^5.2.1, zustand ^5.0.15, date-fns-tz installed; app/ has only placeholder page; no `src/` yet; `lib/utils.ts` re-exports `cn`). Confidence: HIGH.
- Domain inputs (`reference/design.html` 3-panel grid + tokens; `reference/institutional_rules.md` Module 2 + report sections). Confidence: HIGH.
- Web/secondary search for Yahoo-proxy backoff patterns and trading-dashboard structures — Firecrawl throttled (429), WebSearch returned no usable results. Proxy retry constants are engineering judgment, not verified upstream. Confidence: MEDIUM — flag for phase-level verification against live Yahoo behavior.
