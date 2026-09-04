# Technology Stack: ICT Liquidity Execution Terminal (NQ)

**Project:** liquidity-engine — institutional execution terminal for NQ futures
**Researched:** 2026-09-04
**Scope:** Stack dimension only (Yahoo proxy, charting, state, timezone, ICT math placement)

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js App Router | 16.3.4 (pinned, already scaffolded) | Full-stack framework, Route Handlers for Yahoo proxy | Already installed; Route Handlers give a server-side proxy that hides fetch origin, adds caching, and keeps Yahoo's unofficial endpoint off the client. Verify breaking-change notes in `node_modules/next/dist/docs/` before writing route code — v16 conventions may differ from training data. |
| React | 19.2.8 | UI runtime | Pinned by Next 16 scaffold. Note: `next/dynamic` with `ssr: false` must be used inside a Client Component for the chart (verified in current Next docs, HIGH confidence). |
| TypeScript | ^5 (strict) | Type safety for ICT math + API contracts | Strict mode is non-negotiable for dealing-range math — price-level errors must be compile-time, not runtime. |

### Data: Yahoo Finance Proxy

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js Route Handler (`app/api/yahoo/route.ts`) + native `fetch` | No extra dependency | NQ=F daily candles via `https://query1.finance.yahoo.com/v8/finance/chart/NQ=F?interval=1d` | The v8 chart endpoint needs no auth token/crumb (unlike v7 download) but **requires a browser-like `User-Agent` header** — default Node/Next fetch UA gets 429'd aggressively. Native fetch keeps the serverless bundle lean on Vercel free tier. |
| Module-level in-memory cache (Map + timestamp, 60s TTL) with stale-on-429 fallback | Hand-rolled (~30 lines) | 60s cache + 429 resilience | Vercel free-tier serverless has no shared KV; a module-level Map is per-instance but sufficient for a single-user terminal. On 429, serve stale cache instead of erroring — a trading terminal showing last-known-good candles beats a blank screen. Honor `Retry-After` when present; otherwise exponential backoff (1s → 2s → 4s, max 3 retries). |
| `export const dynamic = 'force-dynamic'` on the route | Next.js route config | Prevent static optimization of the proxy | Route Handlers are not cached by default, but being explicit guards against build-time prerender freezing a quote snapshot into the deploy (verified pattern in current Next docs, HIGH confidence). |

**Rate-limit facts (MEDIUM confidence — unofficial API, limits undocumented, verified via community consensus not official docs):**
- ~2,000 req/hr per IP before 429s begin; a 60s poll cadence (~60 req/hr) is far under the limit — 429s in practice come from missing `User-Agent`, not volume.
- `query1` vs `query2` subdomains: use `query1` primary, fall back to `query2` on 5xx/429 (community-standard resilience trick).
- Response shape: `chart.result[0]` → `timestamp[]` + `indicators.quote[0]` (`open/high/low/close/volume`) + `meta` (exchangeTimezoneName, regularMarketPrice). Validate with `meta.exchangeTimezoneName === 'America/New_York'`-ish guard; fail loudly if Yahoo changes schema.

### Charting

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| lightweight-charts | ^5.2.1 (installed) | Candlestick chart + zone overlays | SOTA for canvas-rendered financial charts; tiny bundle, no D3 overhead. **v5 breaking change verified (HIGH):** series are created via `chart.addSeries(CandlestickSeries, opts)` — NOT `chart.addCandlestickSeries()` (v4 API, removed). Import `CandlestickSeries` as a value import. |
| `series.createPriceLine()` | Built into lightweight-charts v5 | Equilibrium / high / low horizontal levels | Native API, zero custom code: `{ price, color, lineWidth, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title }`. Use for Equilibrium (cyan #00D9FF), Range High/Low. Verified in v5 docs (HIGH). |
| Series primitives (`series.attachPrimitive()`) or overlay Histogram series | Built into lightweight-charts v5 | Premium/Discount shaded zones | Price lines are lines, not fills. For shaded Premium (above equilibrium) / Discount (below) zones, attach a lightweight custom primitive (rectangle between two prices across visible time range) — the v5 plugin API (`ISeriesPrimitive`) is the sanctioned path. Simpler alternative if primitives prove fiddly: a second overlay series is overkill — prefer the primitive; flag for phase-level spike. (MEDIUM — API verified, implementation effort unspiked.) |
| `next/dynamic` with `{ ssr: false }` inside a `'use client'` wrapper | Next.js built-in | Client-only chart loading | lightweight-charts touches `window`/canvas at construction — SSR-prerendering it crashes the build. Verified current pattern (HIGH). Show a skeleton panel as `loading` fallback to keep the 3-panel shell stable. |

### State + Time

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zustand | ^5.0.15 (installed) | Dashboard state: symbol, timeframe, dealing-range result, confidence | Zero-boilerplate, works cleanly with React 19, no Provider tree. Use `create<State>()((set) => ...)` typed pattern + `useShallow` for multi-field selectors to avoid re-rendering the whole terminal on every tick (both verified in current Zustand docs, HIGH). Single store file (`src/store/useTerminalStore.ts`); async Yahoo polling lives in the component/route layer, not in the store — store holds data + `setCandles`/`setRange` actions only. |
| date-fns + date-fns-tz | ^4.4.0 + ^3.2.0 (installed, matched pair) | Asia/Baku session/date logic + display formatting | date-fns-tz v3 is the correct companion for date-fns v4 (`formatInTimeZone(date, 'Asia/Baku', ...)`). Correct because: immutable, tree-shakeable, no 200KB moment-timezone payload on a free-tier deploy. Yahoo timestamps are seconds-since-epoch UTC — convert at the display edge; keep epoch ms as canonical in state and ICT math. |
| Pure TypeScript functions in `src/lib/ict/` (no library) | — | Dealing Range math: Premium/Discount/Equilibrium, DOL target, bias | ICT math is arithmetic on high/low/close arrays — any dependency here is accidental complexity and a testability liability. Constraint stands: no I/O, no `Date.now()` inside (inject `now` as an argument) so every function is unit-testable and monorepo-extractable. |

### Styling / UI (locked by PROJECT.md, not re-researched)

Tailwind v4 + shadcn restricted to button, dropdown-menu, dialog, toast, calendar, card. Dark terminal palette #0A0A0F / #14141E / #00D9FF per `reference/design.html`.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Yahoo client | Native fetch in Route Handler | `yahoo-finance2` npm package | Heavy dependency on an unofficial API that breaks on Yahoo schema changes anyway; adds cold-start weight on serverless; hand-rolled fetch + Zod-lite validation is ~50 lines and fully owned. |
| Yahoo client | Native fetch | Direct client-side fetch to Yahoo | CORS-blocked by Yahoo; leaks no key but exposes the app to client IP rate limits and removes the caching layer. Proxy is mandatory. |
| Cache | In-memory Map, 60s TTL | Vercel KV / Upstash Redis | Paid or free-tier-limited; single-user terminal doesn't need shared cache. Revisit only if multi-instance staleness is observed. |
| Cache | In-memory Map | `fetch` with `next: { revalidate: 60 }` alone | Next fetch-cache doesn't give stale-on-429 fallback control; combine is fine, but the Map is the source of truth for fallback semantics. |
| Charting | lightweight-charts v5 | Recharts / Chart.js / D3 | Recharts/Chart.js have no first-class candlestick + financial scale semantics; D3 is a months-long build for what lightweight-charts gives in an afternoon. |
| Charting zones | Series primitive + price lines | `lightweight-charts-drawing` community plugin | 68 drawing tools for an interactive-drawing use case Phase 1 doesn't have; zones are programmatic, not user-drawn. Don't pay for interactivity you won't wire up. |
| State | Zustand | Redux Toolkit / Jotai / Context | Redux is ceremony for one store; Context re-renders the tree on every candle tick; Jotai is fine but Zustand is already installed and the team constraint locks it. |
| Polling | `setInterval` + `fetch` in client component (60s) | SWR / React Query | One endpoint, one cadence, manual `staleTime` needs — SWR/RQ add a dependency for cache semantics the server already owns. Revisit if endpoints multiply (sentiment/calendar live APIs in later phases). |
| Timezone | date-fns + date-fns-tz | moment-timezone / Luxon / raw Intl | moment is legacy + huge; Luxon is excellent but an extra idiom when date-fns is installed; raw Intl is fine for one-offs but `formatInTimeZone` reads cleaner across the codebase. |
| ICT math | Hand-rolled pure functions | Any TA indicator library (tulind, technicalindicators) | Retail indicator libraries compute RSI/MACD, not ICT dealing ranges; the math is project-specific by definition. |

## Installation

```bash
# Already installed — no new dependencies for Phase 1.
# If the lockfile drifts, restore exactly:
npm install zustand@^5.0.15 lightweight-charts@^5.2.1 date-fns@^4.4.0 date-fns-tz@^3.2.0
```

No `npm install` of yahoo-finance2, swr, @tanstack/react-query, moment-timezone, or drawing plugins.

## Confidence Levels

| Recommendation | Confidence | Basis |
|----------------|------------|-------|
| lightweight-charts v5 `addSeries(CandlestickSeries)` + `createPriceLine` | HIGH | Current official docs via Context7, breaking change explicitly documented |
| `next/dynamic ssr:false` in Client Component | HIGH | Current Next.js docs via Context7 |
| Route Handler `force-dynamic` + native fetch proxy | HIGH | Current Next.js docs via Context7 |
| Zustand `create<T>()` + `useShallow` pattern | HIGH | Current Zustand docs via Context7 |
| date-fns v4 + date-fns-tz v3 pairing | MEDIUM | Installed versions are the documented matched pair; `formatInTimeZone` signature not re-verified this pass — confirm against installed package types during Phase 1 |
| Yahoo v8 endpoint shape, UA requirement, query1/query2 fallback | MEDIUM | Community consensus; unofficial API with no contract — schema validation + loud failure required in code |
| Yahoo rate-limit numbers (~2000/hr) | LOW | Undocumented, anecdotal; design (60s cache, backoff, stale fallback) is robust regardless of exact limit |
| Zone-fill via series primitive effort | MEDIUM | API path verified in v5 docs; implementation complexity unspiked — allow a time-boxed spike in the chart phase |

## Sources

- lightweight-charts v5 migration + series/price-line/primitive docs (Context7, `/tradingview/lightweight-charts`, HIGH)
- Next.js Route Handlers caching + `next/dynamic` lazy-loading docs (Context7, `/vercel/next.js`, HIGH)
- Zustand TypeScript + `useShallow` guides (Context7, `/pmndrs/zustand`, HIGH)
- date-fns-tz TZDate/timezone docs (Context7, `/date-fns/tz`, MEDIUM — v4-native successor API noted)
- Yahoo Finance v8 chart API conventions (web consensus; direct verification rate-limited during research — MEDIUM/LOW as marked above)
