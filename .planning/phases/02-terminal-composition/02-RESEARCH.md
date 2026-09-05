# Phase 02: Terminal Composition - Research

**Researched:** 2026-09-05
**Domain:** Next.js 16 App Router client composition — lightweight-charts v5 candlestick chart, Zustand polling store, fixture-driven panels
**Confidence:** MEDIUM

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Terminal auto-polls `GET /api/yahoo` every 60s (matching the proxy's 60s TTL — faster polling would only re-read cache) plus a manual refresh button.
- **D-02:** Freshness surfaces in a global status strip under the terminal header (`LIVE · 12s ago` / `STALE · 4m` / `MARKET CLOSED`), visible across all three panels — not just a chart-header badge. Covers DATA-03 (cache age, never silent staleness).
- **D-03:** Weekend/closed state is honest: last closed candles stay rendered with the CLOSED strip state; today's still-forming candle (Phase 1 `forming: true` flag) may show but nothing is ever synthesized.
- **D-04:** Rendered terminal reads Azerbaijani (report sections, labels, rationale strings — matching `reference/institutional_rules.md`); code identifiers and comments stay English per Phase 1 D-17. No bilingual duplication.
- **D-05:** Sentiment + calendar fixtures ship as a small rotating set of 2–3 snapshots (crowded-long, crowded-short, balanced), selectable or rotating — so the 60% crowded flag and the pre-news flag visibly respond rather than sitting on one static scenario.
- **D-06:** Fixture shapes mirror Myfxbook/ForexFactory payloads (symbol, long%, short% per broker; True AVG excluding Insta/FiboGroup; high-impact events with countdown timestamps). Trap-vs-genuine interpretation text is per-scenario prose fusing calendar + regime + position (MOCK-03), not computed logic.
- **D-07:** Fixtures served as local JSON (imported or via static route — planner's call); no new API routes required beyond what the chart needs.
- **D-08:** Non-live modules (1/3/4) and report sections (1, 3–6) render dimmed in place with an explicit UNAVAILABLE marker — the full 3-panel terminal shape is visible from day one, per `reference/design.html`.
- **D-09:** Blocked side (UI-04) is struck-through with a terse label (`BLOCKED — premium` / `BLOCKED — discount`); no one-line why — the strike plus label teaches at a glance.
- **D-10:** Dashboard state (symbol, candles, dealing-range state, confidence) lives in a single Zustand store with memoized selectors; `src/lib/ict` pure functions never touch the store — selectors call math, math stays pure (STATE-01).
- **D-11:** Chart component uses lightweight-charts v5 via dynamic import (`ssr:false`); zone shading (premium/discount), EQ price-line, and DOL marker derive from the ICT range output. Zone-fill primitive is unspiked — planner time-boxes a spike with a bounded-box fallback.
- **D-12:** Candles travel proxy → store → chart as `YYYY-MM-DD` business-day strings; all session/date display runs through the Phase 1 Baku time util with injected clock.

### Claude's Discretion
Fixture snapshot contents (exact percentages, event names/offsets), status-strip wording details, UNAVAILABLE marker styling, poll jitter/singleflight details, and component file breakdown (`components/charts/` vs `components/dashboard/`) — researcher/planner discretion within the decisions above.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. (Phase 3 owns: Vercel deploy, CDN header verification, cold-start/stale-serve drill, live-URL checklist. v2 owns: real sentiment/calendar APIs, Modules 1/3/4 live logic.)

## Summary

Phase 2 composes the full dark-terminal shell on top of Phase 1's trusted outputs. All data inputs already exist and were read this session: the Yahoo proxy envelope `{candles, contractHint, lastUpdatedISO, stale, source}` [VERIFIED: src/lib/yahoo.ts:25-31], the ICT pure-function core (`computeRange`, `computePosition`, `computeBias`, `computePrimaryDOL`, `computeRegime`, `computeLevels`, `detectRollover`) [VERIFIED: src/lib/ict/range.ts:6-41, src/lib/ict/bias.ts:9-36, src/lib/ict/dol.ts:6-22, src/lib/ict/regime.ts:42-67, src/lib/ict/levels.ts:23-40], and the Baku time util (`BAKU_TZ`, `toBakuYMD`, `getAsOfBakuDate`) [VERIFIED: src/lib/time.ts:3-12]. No new npm packages are required: `zustand 5.0.15`, `lightweight-charts 5.2.1`, `date-fns 4.4.0`, `date-fns-tz 3.2.0` are installed and version-pinned on the registry [VERIFIED: package.json:13-27 + npm registry].

The three technical risks each have a resolved path. First, lightweight-charts v5 zone shading has no built-in rect primitive; the documented path is a custom `ISeriesPrimitive` attached via `series.attachPrimitive()` following the official session-highlighting plugin pattern [CITED: https://github.com/tradingview/lightweight-charts/blob/master/plugin-examples/src/plugins/session-highlighting/session-highlighting.ts], with the UI-SPEC fallback of bounded box overlays if the spike overruns. EQ and DOL markers need no spike — `series.createPriceLine()` is core API [VERIFIED: node_modules/lightweight-charts/dist/typings.d.ts:2541]. Second, `next/dynamic` with `ssr: false` is only legal inside Client Components per the version-pinned guide, so the chart must be dynamically imported from a `"use client"` shell, never directly from `app/page.tsx` [CITED: node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md]. Third, daily-candle business-day strings (`YYYY-MM-DD`) are a first-class `Time` value in v5, so Phase 1's candle dates flow into `setData` with no conversion [VERIFIED: node_modules/lightweight-charts/dist/typings.d.ts:4975-4987].

**Primary recommendation:** Build a `"use client"` terminal shell in `components/dashboard/` that owns one Zustand store (poll → envelope → status), renders the 3-panel grid per `reference/design.html`, lazy-loads the chart via `next/dynamic ssr:false`, derives every readout through Phase 1 pure functions in memoized selectors, and serves sentiment/calendar from local JSON fixtures — with the zone-fill primitive as the single time-boxed spike.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-03 | Data freshness (cache age, stale badge) visible — never silent staleness | Global status strip pattern; envelope `stale` + `lastUpdatedISO` are the freshness source; toast surface for poll failures |
| UI-01 | Full 3-panel dark terminal shell per `reference/design.html`, Module 2 live, others unavailable | Layout contract in UI-SPEC (280px/1fr/320px grid, `lg:` collapse); Card primitives; UNAVAILABLE dim pattern |
| UI-02 | Candlestick chart (lightweight-charts v5, dynamic `ssr:false`) with premium/discount shading + EQ price-line + DOL marker | v5 `addSeries(CandlestickSeries)`, `createPriceLine`, custom-primitive zone spike with fallback; business-day string times |
| UI-03 | Institutional report shell (sections 1–6), section 2 live, rest unavailable | Section titles from `institutional_rules.md`; section 2 wired to bias/DOL/regime selectors; skeleton/empty/error states |
| UI-04 | Blocked side struck-through (longs only in discount, shorts only in premium) | Derived from bias output: BULLISH → shorts blocked, BEARISH → longs blocked, COMPRESSION → both stand down; locked copy |
| MOCK-01 | Sentiment exposure table with True AVG (excl. Insta/FiboGroup) + 60% crowded flag | Pure `trueAvg` helper (new, tested); fixture shape `{broker, longPct, shortPct}[]`; rotating 2–3 snapshots |
| MOCK-02 | Economic calendar, high-impact-only + countdown + pre-news flag | Fixture events with `startsAt` ISO; countdown formatter with injected clock; pre-news window check |
| MOCK-03 | Pre-news liquidity-engineering interpretation (trap vs genuine) | Per-scenario static prose (never computed); fuses calendar + regime + position at authorship time |
| STATE-01 | Single Zustand store with memoized selectors; math never touches store | `create` + `useShallow` patterns; selectors call `src/lib/ict` pure functions; one store module only |

## Project Constraints (from CLAUDE.md)

- **Version-pinned Next.js docs override training data.** This project is "NOT the Next.js you know" — framework guidance below was checked against `node_modules/next/dist/docs/` (Next 16.3.4 installed) [VERIFIED: package.json:21], specifically the `lazy-loading.md` guide and the `client-side-data-fetching` guide. Planner/executor must re-check those guides before writing framework code.
- **AGENTS.md warning is regenerated by `next dev`.** Never commit it, never "fix" it as drift.
- **Styling contract:** theme tokens in `app/globals.css`, components reference tokens + `data-slot`, never hardcoded hex; `cn` imported from `"cn"`; named exports, no barrels (CONVENTIONS.md / UI-SPEC).
- **Client/server boundary:** `app/` routes are Server Components by default; chart/store components are `"use client"` under `components/`; never convert `app/layout.tsx`.
- **shadcn allowlist:** button, dropdown-menu, dialog, toast, calendar, card only.
- **Purity:** `src/lib/ict` functions stay pure (no I/O, no clock inside); time flows through the Baku util with injected clock.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Yahoo proxy + 60s TTL + stale-serve | Frontend Server (Route Handler) | — | Already built in Phase 1 (`app/api/yahoo/route.ts`); secret-free server fetch, CDN-cacheable headers |
| 60s auto-poll + freshness derivation | Browser / Client | — | `setInterval` in a client shell; server must not push — App Router has no sockets on Hobby |
| Candlestick rendering + zone overlays | Browser / Client | — | Canvas library needs DOM + `ResizeObserver`; must be `ssr:false` |
| ICT math (range/bias/DOL/regime) | Browser / Client (pure lib) | — | Same pure functions run in vitest and in selectors; no server round-trip needed |
| Sentiment/calendar fixtures | Browser / Client (static JSON) | — | No new API routes per D-07; imported JSON or static route |
| Terminal shell + report + panels | Browser / Client | Frontend Server (initial HTML shell) | `app/page.tsx` stays a Server Component composing a client shell; interactivity lives below the boundary |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.3.4 (installed) [VERIFIED: package.json:21 + npm registry] | App Router shell, `/api/yahoo` proxy | Project scaffold; version-pinned docs in `node_modules/next/dist/docs/` |
| react + react-dom | 19.2.8 (installed) [VERIFIED: package.json:22-24 + npm registry] | UI rendering | Peer of Next 16 |
| zustand | 5.0.15 (installed) [VERIFIED: package.json:27 + npm registry] | Single dashboard store, memoized selectors | Zero-boilerplate, `useShallow` prevents selector re-render storms [CITED: https://github.com/pmndrs/zustand/blob/main/docs/learn/guides/auto-generating-selectors.md] |
| lightweight-charts | 5.2.1 (installed) [VERIFIED: package.json:18 + npm registry] | Candlestick chart, price-lines, markers | Match for `reference/design.html`; v5 `addSeries(CandlestickSeries, …)` API [CITED: https://github.com/tradingview/lightweight-charts/blob/master/website/docs/migrations/from-v4-to-v5.md] |
| date-fns + date-fns-tz | 4.4.0 + 3.2.0 (installed) [VERIFIED: package.json:16-17 + npm registry] | Countdown arithmetic, Baku formatting | Already the project's single TZ surface (`formatInTimeZone`, `getTimezoneOffset`); never mix in a second date lib |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^1.41.0 (installed) [VERIFIED: package.json:19] | Status dots, refresh/clock/flag glyphs | Per UI-SPEC inventory; `RefreshCw` on the `Yenilə` button |
| @base-ui/react (via shadcn wrappers) | ^1.8.0 (installed) [VERIFIED: package.json:13] | Button, Card, Dropdown-Menu, Toast primitives | Panel shells, scenario switcher, poll-failure toasts — wrappers in `components/ui/`, never raw primitives in feature code [ASSUMED — follows ARCHITECTURE.md primitive-wrap pattern] |
| vitest | 5.0.0 (installed) [VERIFIED: package.json:38 + npm registry] | Unit tests for store selectors, sentiment math, countdown | `npm run test` script present [VERIFIED: package.json:8]; co-located `*.test.ts` convention from Phase 1 [VERIFIED: Glob src/lib/*.test.ts] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled `setInterval` poll | SWR / TanStack Query | Next's own guide recommends them for shared browser caches [CITED: node_modules/next/dist/docs/01-app/02-guides/client-side-data-fetching/index.md], but they are new deps for a single 60s endpoint the server already dedupes via singleflight — hand poll + in-flight guard is smaller and matches D-01 exactly |
| Custom `ISeriesPrimitive` zone fill | ECharts / Plotly | New dep + new spike; lightweight-charts is already installed and the primitive pattern is documented — stay |
| `next/dynamic ssr:false` chart | `React.lazy` + Suspense | Equivalent, but `next/dynamic` is the version-pinned documented path for client-only components [CITED: node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md] |

**Installation:**
```bash
# No new packages. Phase 2 wires already-installed deps only.
npm ls zustand lightweight-charts date-fns date-fns-tz
```

**Version verification:** `npm view` confirms registry-latest equals installed for all four (`zustand 5.0.15`, `lightweight-charts 5.2.1`, `date-fns 4.4.0`, `date-fns-tz 3.2.0`) — no drift from training data.

## Package Legitimacy Audit

> No new installs in this phase — all deps pre-installed and lockfile-pinned. Audit run as a sanity gate.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| zustand | npm | lineage 5.x since 2024; latest patch 2026-08-13 [CITED: npm registry] | 54M/wk | github.com/pmndrs/zustand | SUS (reason: "too-new" recency heuristic on latest patch) | Approved — pre-installed, official repo, no postinstall script; no new install, no checkpoint needed |
| lightweight-charts | npm | v5 line since 2025-04; 5.2.1 on 2026-08-12 [CITED: npm registry] | 939K/wk | github.com/tradingview/lightweight-charts | SUS (reason: same recency heuristic) | Approved — same rationale |
| date-fns | npm | long-standing | 100M/wk | github.com/date-fns/date-fns | OK | Approved |
| date-fns-tz | npm | long-standing | high [ASSUMED — not separately tallied] | date-fns org | OK | Approved |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** zustand, lightweight-charts — heuristic-only flags on latest-patch recency; both are high-download official-repo packages already in `package.json`/`package-lock.json`. No `postinstall` scripts on either [VERIFIED: npm registry]. Since Phase 2 installs nothing, the planner adds no install checkpoint.

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────────┐
                    │  GET /  →  app/page.tsx (RSC)    │  server: static shell HTML
                    └───────────────┬─────────────────┘
                                    │ renders
                    ┌───────────────▼─────────────────┐
                    │  <TerminalShell/>  "use client" │  components/dashboard/
                    │  ┌───────────────────────────┐  │
                    │  │ global status strip       │◄─┼── derives from store:
                    │  │ LIVE/STALE/CLOSED         │  │   stale flag + lastUpdatedISO age
                    │  └───────────────────────────┘  │
                    │  ┌────────┬─────────┬────────┐  │
                    │  │ LEFT   │ CENTER  │ RIGHT  │  │
                    │  │ liqui- │ chart   │ ticket │  │
                    │  │ dity + │ (dyna-  │ (dim) +│  │
                    │  │ senti- │ mic     │ calen- │  │
                    │  │ ment   │ ssr:    │ dar +  │  │
                    │  │        │ false)  │ interp │  │
                    │  │        │ report  │        │  │
                    │  └────────┴─────────┴────────┘  │
                    └───────────────┬─────────────────┘
                                    │ 60s poll + manual refresh
                    ┌───────────────▼─────────────────┐
                    │  Zustand store (src/lib/store)  │  single store; selectors call
                    │  candles · status · scenario    │  src/lib/ict pure fns (D-10)
                    └───────────────┬─────────────────┘
                        ┌───────────┴───────────┐
                        ▼                       ▼
              GET /api/yahoo (Phase 1)   local fixture JSON
              {candles, lastUpdatedISO,   sentiment + calendar
               stale, source}             snapshots (D-05..D-07)
```

Data-flow order per poll: `fetch(/api/yahoo)` → validate envelope → `set()` candles/status → memoized selectors recompute range → bias → DOL → chart `setData` + price-lines + zone primitive update. Fixtures never touch the poll path.

### Recommended Project Structure
```
src/
├── lib/ict/         # Phase 1 pure math — READ ONLY this phase (selectors call in)
├── lib/time.ts      # Phase 1 Baku util — reuse; ADD countdown formatter beside it
├── lib/sentiment.ts # NEW pure: trueAvg (excl. Insta/FiboGroup), crowded flag
├── lib/store.ts     # NEW single Zustand store (or lib/dashboard-store.ts — planner's call)
├── lib/fixtures/    # NEW sentiment-*.json + calendar-*.json snapshots (2–3 scenarios)
components/
├── dashboard/       # NEW TerminalShell, StatusStrip, panels, Report, SentimentTable, CalendarList
├── charts/          # NEW NqChart (dynamic ssr:false) + zone-fill primitive
└── ui/              # existing primitives only — no domain code here
app/
├── page.tsx         # REPLACE placeholder: server shell composing <TerminalShell/>
└── globals.css      # ADD terminal tokens under .dark (UI-SPEC color contract)
```

### Pattern 1: Single Zustand store with pure-math selectors
**What:** One `create<DashboardState>()` store holds raw server/fixtures state only (candles, envelope meta, UI scenario, in-flight flag). Every derived value (range, position, bias, DOL, regime, True AVG, countdowns) is computed in selectors that call `src/lib/ict` / `src/lib/sentiment` pure functions, memoized with `useShallow` for object results.
**When to use:** All Phase 2 derived state (D-10).
**Example:**
```ts
// Source: https://github.com/pmndrs/zustand (create + useShallow selector patterns)
import { create } from "zustand";
import { useShallow } from "zustand/react";
import { computeRange, computePosition } from "@/src/lib/ict/range";
import { computeBias } from "@/src/lib/ict/bias";

export const useDashboard = create<DashboardState>()((set, get) => ({
  candles: [],
  lastUpdatedISO: null,
  stale: false,
  scenario: "crowded-long",
  refresh: async () => {
    if (get().inFlight) return; // client singleflight — server already dedupes [VERIFIED: src/lib/yahoo.ts:290-293]
    set({ inFlight: true });
    try {
      const res = await fetch("/api/yahoo", { cache: "no-store" });
      const env = await res.json();
      set({ candles: env.candles, lastUpdatedISO: env.lastUpdatedISO, stale: env.stale, inFlight: false });
    } catch {
      set({ inFlight: false }); // toast raised by caller; strip keeps last-known state (never silent — DATA-03)
    }
  },
}));

// Component: memoized derived readout — math stays pure, selector calls math (D-10)
const bias = useDashboard(useShallow((s) => {
  const range = computeRange(s.candles, s.asOf);
  return computeBias(computePosition(range, lastClose), s.regime, closedCount);
}));
```

### Pattern 2: Client-only chart island via next/dynamic
**What:** `app/page.tsx` (Server Component) renders `<TerminalShell/>` (`"use client"`). The shell dynamically imports the chart with `{ ssr: false, loading: skeleton }`. The pinned guide is explicit: `ssr: false` only works for Client Components — move it into a Client Component [CITED: node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md].
**When to use:** The single lightweight-charts mount (D-11).
**Example:**
```tsx
// Source: node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md (ssr:false pattern)
"use client";
import dynamic from "next/dynamic";

const NqChart = dynamic(() => import("@/components/charts/nq-chart"), {
  ssr: false,
  loading: () => <div data-slot="chart-skeleton" className="min-h-[400px] animate-pulse" />,
});
```

### Pattern 3: Chart lifecycle — create once, update data, destroy on unmount
**What:** `useEffect` creates the chart + candlestick series once per container; a second effect pushes `setData` / price-lines / primitive updates when store candles or range change; cleanup calls `chart.remove()`. Series creation uses the v5 API `chart.addSeries(CandlestickSeries, opts)` — the v4 `addCandlestickSeries()` is gone [CITED: https://github.com/tradingview/lightweight-charts/blob/master/website/docs/migrations/from-v4-to-v5.md]. Candle times pass straight through as `YYYY-MM-DD` strings (`Time` accepts business-day strings [VERIFIED: node_modules/lightweight-charts/dist/typings.d.ts:4975-4987] — quote: "Values can be a {@link UTCTimestamp}, a {@link BusinessDay}, or a business day string in ISO format.").
**When to use:** `components/charts/nq-chart.tsx`.
**Example:**
```ts
// Source: https://github.com/tradingview/lightweight-charts (v5 series + price-line API)
import { createChart, CandlestickSeries, LineStyle } from "lightweight-charts";

const chart = createChart(el, { layout: { background: { color: "transparent" }, textColor: "#71717A" } });
const series = chart.addSeries(CandlestickSeries, {
  upColor: "#00FF88", downColor: "#FF00FF",   // tokens in globals.css; literals shown for mapping only
  borderVisible: false, wickUpColor: "#00FF88", wickDownColor: "#FF00FF",
});
series.setData(candles.map((c) => ({ time: c.date, open: c.open, high: c.high, low: c.low, close: c.close })));
const eqLine = series.createPriceLine({ price: range.eq, color: "#00D9FF", lineWidth: 1, lineStyle: LineStyle.Dashed, title: "EQ" }); // [VERIFIED: typings.d.ts:2541 createPriceLine; :73-94 LineStyle enum]
const dolLine = series.createPriceLine({ price: dol.price, color: "#00D9FF", lineWidth: 1, lineStyle: LineStyle.Solid, title: dol.name });
// On range change: series.removePriceLine(eqLine) then re-create. chart.remove() on unmount.
```

### Pattern 4: Zone shading via series primitive (spike) with overlay fallback
**What:** v5 has no built-in horizontal-band primitive. Primary: implement `ISeriesPrimitive` painting two price bands (premium magenta 8%, discount green 8% — UI-SPEC tokens) and `series.attachPrimitive()` / `detachPrimitive()` [CITED: plugin-examples session-highlighting pattern + typings `attachPrimitive`/`detachPrimitive`]. Fallback (if the spike overruns its time-box): overlay `LineSeries` pair tracing range-high/range-low across the visible window with `autoscaleInfoProvider: () => null` so overlays never rescale the price axis, plus the EQ/DOL price-lines which need no fallback.
**When to use:** D-11 spike; planner time-boxes, executor falls back without blocking the phase.

### Anti-Patterns to Avoid
- **Polling faster than 60s or bypassing the envelope:** re-reads the same server cache and burns Hobby quota; poll at 60s, manual refresh calls the same path (D-01).
- **Putting ICT math in components or the store:** `components/ui/` and the store stay math-free; selectors call `src/lib/ict`, never duplicate it (D-10, ARCHITECTURE.md).
- **`ssr:false` dynamic import inside `app/page.tsx`:** illegal in a Server Component — it must live in the `"use client"` shell [CITED: lazy-loading.md note].
- **Synthesizing candles for gaps/weekends:** render last closed candles + CLOSED strip; `forming` candle only with its chip (D-03).
- **Hardcoded hex in components:** all terminal colors (`#0A0A0F/#14141E/#00D9FF`, candle greens/magentas) enter via `app/globals.css` `.dark` tokens (UI-SPEC color contract).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Candle series rendering + axis math | Custom canvas chart | lightweight-charts v5 (installed) | Time-scale, autoscale, HiDPI canvas — months of edge cases |
| Cross-component dashboard state | Context + useReducer sync | Zustand `create` + `useShallow` | Zombie-child/concurrency pitfalls already solved [CITED: zustand docs] |
| Timezone display / Baku dates | Manual `+4h` offsets | Phase 1 `src/lib/time.ts` + date-fns-tz | US DST moves the CME spread twice yearly; hand offsets rot (Phase 1 Pitfall 9) |
| Poll dedupe | Custom request queue | Server singleflight (exists) + one client `inFlight` guard | Two-line guard; a queue is dead machinery for one endpoint |
| Fixture schema validation | zod install for static JSON | Hand-rolled shape-guard + vitest (Phase 1 precedent) | Schema is tiny and fixed; Phase 1 already proved the pattern on Yahoo payloads |
| Zone-band geometry math | Price↔pixel math by hand | `series.priceToCoordinate()` inside the primitive (spike) | Library owns the coordinate space; hand math desyncs on zoom |

**Key insight:** Phase 2's only novel code is composition (store, shell, panels, one primitive). Every hard problem — fetching, caching, math, time — was solved in Phase 1; the planner should frame tasks as "wire X to Y", never "build X".

## Common Pitfalls

### Pitfall 1: v4 series API baked into new code
**What goes wrong:** `chart.addCandlestickSeries()` throws — it does not exist in v5.
**Why it happens:** Training data and old examples use v4; installed version is 5.2.1.
**How to avoid:** Only `chart.addSeries(CandlestickSeries, opts)` [CITED: v4→v5 migration doc]. Grep new chart code for `addCandlestickSeries` in review.
**Warning signs:** TypeScript error on `addCandlestickSeries` at build time.

### Pitfall 2: Chart instance leaked on re-render / StrictMode double-mount
**What goes wrong:** Duplicate canvases, memory growth, stale price-lines stacking on every poll.
**Why it happens:** Creating the chart in render path or without cleanup; re-creating price-lines without removing old ones.
**How to avoid:** Create once in `useEffect` + `chart.remove()` cleanup; keep `IPriceLine` handles in refs, `removePriceLine` before re-create [VERIFIED: typings pattern `series.removePriceLine(line)`].
**Warning signs:** Multiple `<canvas>` under the chart container in devtools; EQ labels duplicating after refresh.

### Pitfall 3: Zone primitive desyncs on pan/zoom
**What goes wrong:** Shading lags or misaligns when the user scrolls the time scale.
**Why it happens:** Primitive caches coordinates instead of recomputing from scale on each frame.
**How to avoid:** Follow the session-highlighting pattern — compute x from the time scale inside the pane renderer each draw; `updateAllViews()` on range change [CITED: plugin-examples session-highlighting].
**Warning signs:** Bands drift from EQ line after horizontal scroll.

### Pitfall 4: Selector re-render storm on every poll
**What goes wrong:** Whole terminal re-renders 60s-poll even when derived values are unchanged.
**Why it happens:** Selectors returning fresh objects without shallow comparison.
**How to avoid:** `useShallow` on all object-returning selectors; split volatile (countdown tick) from stable (candles) subscriptions [CITED: zustand `useShallow` docs].
**Warning signs:** React Profiler shows all panels re-rendering on countdown tick.

### Pitfall 5: Silent staleness (the DATA-03 failure mode)
**What goes wrong:** Poll fails, UI keeps showing old numbers with no signal.
**Why it happens:** Error swallowed; strip derives from local clock instead of envelope truth.
**How to avoid:** Strip derives from `stale` flag (server-authoritative [VERIFIED: src/lib/yahoo.ts:300-307]) + `lastUpdatedISO` age; every poll failure raises a toast via the existing `components/ui/toast.tsx` manager [VERIFIED: components/ui/toast.tsx:10 `createToastManager`]; with-cache failure flips strip to STALE, no-cache failure renders error copy (UI-SPEC E2/E6).
**Warning signs:** Review task: disconnect network in dev, confirm STALE strip + toast appear.

### Pitfall 6: Weekend candle synthesis or empty-chart panic
**What goes wrong:** Saturday poll shows "no data" or, worse, fabricated bars.
**Why it happens:** Yahoo returns no new daily bar on weekends; naive "latest == today" checks fail.
**How to avoid:** CLOSED state = Baku weekday Sat/Sun (via time util, injected clock) → keep last closed candles rendered + CLOSED strip; never invent bars (D-03). `forming` candle renders only with its chip.
**Warning signs:** Tests mocking a Saturday clock must show CLOSED strip with candles intact.

### Pitfall 7: Countdown impurity (Date.now inside render)
**What goes wrong:** Untestable ticking logic; DST bugs in event countdowns.
**Why it happens:** Calling `Date.now()` / `new Date()` inside components or helpers.
**How to avoid:** New `formatCountdown(targetISO, now: Date)` pure helper in `src/lib/` with injected `now` (extends the Phase 1 injected-clock rule); a 1s/30s ticker passes `now` down [ASSUMED ticker cadence — planner's call within D-12].
**Warning signs:** Any `Date.now()` outside the store ticker or tests.

## Code Examples

Verified patterns from official sources:

### Poll loop with visibility respect and manual refresh
```tsx
// Source: zustand async-action pattern (https://github.com/pmndrs/zustand) + D-01
"use client";
useEffect(() => {
  void useDashboard.getState().refresh(); // initial paint
  const id = setInterval(() => {
    if (document.visibilityState === "visible") void useDashboard.getState().refresh();
  }, 60_000); // matches proxy 60s TTL [VERIFIED: src/lib/yahoo.ts:141 CACHE_TTL_MS]
  return () => clearInterval(id);
}, []);
// Manual: <Button onClick={() => refresh()} disabled={inFlight}>Yenilə</Button>
```

### Sentiment True AVG (new pure helper — mirrors Module 1 rule)
```ts
// Source: reference/institutional_rules.md Module 1 (True AVG excl. Insta/FiboGroup, 60% threshold)
export interface BrokerQuote { broker: string; longPct: number; shortPct: number; }
const EXCLUDED = new Set(["insta", "fibogroup"]); // case-insensitive prefix match [ASSUMED exact keys — fixtures define them]

export function trueAvg(rows: BrokerQuote[]): { buy: number; sell: number; crowded: "LONG" | "SHORT" | null } {
  const kept = rows.filter((r) => ![...EXCLUDED].some((x) => r.broker.toLowerCase().includes(x)));
  const buy = kept.reduce((a, r) => a + r.longPct, 0) / kept.length;
  const sell = 100 - buy;
  const crowded = buy >= 60 ? "LONG" : sell >= 60 ? "SHORT" : null; // 60% rule per institutional_rules.md Module 1
  return { buy, sell, crowded };
}
```

### DOL + bias → blocked-side derivation (UI-04)
```ts
// Source: src/lib/ict/bias.ts + src/lib/ict/dol.ts (verified signatures above)
// BULLISH (discount) → longs allowed, shorts BLOCKED — premium; BEARISH → mirror; COMPRESSION → both stand down
const blocked = bias === "BULLISH" ? "SHORT" : bias === "BEARISH" ? "LONG" : "BOTH";
// Renders struck-through magenta with locked copy `BLOCKED — premium` / `BLOCKED — discount` (UI-SPEC D-09)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `chart.addCandlestickSeries()` | `chart.addSeries(CandlestickSeries, opts)` | lightweight-charts v5 (v5.0, 2025) [CITED: migration doc] | All new chart code uses v5 form; v4 snippets fail typecheck |
| `zonedTimeToUtc` / `utcToZonedTime` | `fromZonedTime` / `toZonedTime` + `formatInTimeZone` | date-fns-tz v3 [CITED: Phase 1 research] | Use only v3 names; Phase 1 util already correct |
| Client fetch via ad-hoc useEffect chains | Zustand async action + `useShallow` selectors | zustand v5 current [CITED: zustand docs] | Prescribed store pattern above |
| Bespoke chart overlays via extra series | `ISeriesPrimitive` + `attachPrimitive` plugin API | lightweight-charts v5 plugin system [CITED: plugin-examples] | Zone-fill spike target; overlay-series fallback |

**Deprecated/outdated:**
- v4 chart examples (`addLineSeries`, `addCandlestickSeries`): removed in v5 — reject in review (Pitfall 1).
- Manual UTC+4 arithmetic for Baku: superseded by Phase 1 time util — forbidden in new code.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Fixture broker keys contain "insta"/"fibogroup" (case-insensitive) for True-AVG exclusion | Code Examples (trueAvg) | Exclusion misses → wrong True AVG; trivially fixed when fixtures are authored — planner confirms keys at fixture task |
| A2 | 1s/30s countdown ticker cadence (D-12 silent on tick rate) | Pitfall 7 | Too chatty (re-renders) or too coarse; planner picks cadence, isolates ticker subscription |
| A3 | Base-UI toast manager API used via existing `components/ui/toast.tsx` wrappers (raw primitives not imported in feature code) | Pitfall 5 | Minor import-path fix at implementation; low risk — Toast file read, manager confirmed |
| A4 | date-fns-tz download health (not separately tallied; inferred from date-fns org standing) | Legitimacy Audit | Negligible — already installed, lockfile-pinned, zero new installs |
| A5 | Overlay-LineSeries fallback with `autoscaleInfoProvider: () => null` is sufficient if the primitive spike overruns | Pattern 4 | Fallback weaker visually but UI-SPEC-sanctioned; planner's time-box decides |
| A6 | Baku Saturday/Sunday = NQ daily closed (no separate CME-holiday calendar in v1) | Pitfall 6 | Holiday weekdays show LIVE-with-old-data; acceptable v1 honesty gap — server `stale` flag still guards silence |

## Open Questions

1. **Zone-fill primitive implementation cost**
   - What we know: official session-highlighting plugin pattern exists and maps directly (price bands instead of time bands) [CITED]; typings confirm `attachPrimitive`/`detachPrimitive` surface.
   - What's unclear: exact effort inside this codebase (canvas coordinate handling for price bands).
   - Recommendation: planner time-boxes the spike per D-11/UI-SPEC; executor falls back to overlay lines + price-lines without blocking the phase.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | dev/build/test | ✓ | 24.11.1 [VERIFIED: runtime probe] | — |
| npm | installs (none needed) | ✓ | 11.6.2 [VERIFIED: runtime probe] | — |
| Yahoo v8 endpoint | live candles at runtime | external (runtime) | n/a | Phase 1 serve-stale → 502 honesty chain (by design, no second source) |
| Browser canvas | lightweight-charts | ✓ (client runtime) | — | Chart skeleton if WebGL/canvas unavailable [ASSUMED — standard degraded path] |

**Missing dependencies with no fallback:** none (Yahoo outage is handled, not blocking).
**Missing dependencies with fallback:** none.

No databases, services, CLIs, or env vars required. `gsd_run` present on PATH; no knowledge-graph file (`.planning/graphs/graph.json` absent — skipped graph context).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.0.0 [VERIFIED: package.json:38] |
| Config file | vitest.config.ts (exists; `npm run test` = `vitest run`) [VERIFIED: package.json:8; Glob src/lib/*.test.ts shows co-located convention] |
| Quick run command | `npm run test -- <changed-file>` [ASSUMED flag passthrough — vitest standard] |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-03 | Strip shows STALE on stale envelope; age derives from lastUpdatedISO | unit (selector) | `npm run test -- status-strip` | ❌ Wave 0 |
| UI-01 | Shell renders 3-panel grid + UNAVAILABLE markers | manual-only (visual) | human verify per UI-SPEC layout contract | n/a (visual) |
| UI-02 | Candle→series mapping; EQ/DOL price values equal range output | unit (mapper) + manual (visual shading) | `npm run test -- chart-mapper` | ❌ Wave 0 (mapper); visual manual |
| UI-03 | Section 2 binds bias/DOL/regime; sections 1,3–6 UNAVAILABLE | unit (selector) + manual (visual) | `npm run test -- report` | ❌ Wave 0 |
| UI-04 | Blocked side derives from bias (BULLISH→SHORT blocked…) | unit | `npm run test -- blocked-side` | ❌ Wave 0 |
| MOCK-01 | True AVG excludes Insta/FiboGroup; crowded flag at ≥60% | unit | `npm run test -- sentiment` | ❌ Wave 0 |
| MOCK-02 | Countdown formats Bakuugu; pre-news flag inside window | unit (injected clock) | `npm run test -- calendar` | ❌ Wave 0 |
| MOCK-03 | Interpretation prose present per scenario (static) | unit (fixture shape) | `npm run test -- fixtures` | ❌ Wave 0 |
| STATE-01 | Single store; refresh writes envelope; selectors call pure math | unit (store with mocked fetch) | `npm run test -- store` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- <area>` + `tsc --noEmit` [ASSUMED tsc script name — TS strict per STACK.md; confirm script exists or use `npx tsc --noEmit`]
- **Per wave merge:** `npm run test` (full suite green)
- **Phase gate:** Full suite green + manual visual checklist (UI-SPEC states) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/sentiment.test.ts` — trueAvg + crowded flag (MOCK-01)
- [ ] `src/lib/countdown.test.ts` — formatter + pre-news window, injected clock (MOCK-02)
- [ ] `src/lib/store.test.ts` — refresh writes envelope, singleflight guard, stale propagation (STATE-01, DATA-03)
- [ ] `components/charts/chart-mapper.test.ts` — candle→series mapping, price-line values (UI-02 logic half; rendering stays manual)
- [ ] Fixture JSON files + shape tests (MOCK-01..03)
- [ ] Framework install: none — vitest present

## Security Domain

> `security_enforcement: true`, ASVS L1 (`security_block_on: high`). Phase is read-only display: no auth, no sessions, no user input, no secrets.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | None — no users, no sessions |
| V3 Session Management | no | None — stateless terminal |
| V4 Access Control | no | None — single-tenant read-only |
| V5 Input Validation | yes | Phase 1 Yahoo shape-guard (server) [VERIFIED: src/lib/yahoo.ts:47-123]; same guard pattern for fixture JSON at import |
| V6 Cryptography | no | None — no secrets, no tokens, no PII |

Other L1 categories: V7 logging — no `console.*` in client code (CONVENTIONS.md); V8 data protection — no PII stored; V9 comms — same-origin `/api/yahoo` fetch only; V13 API — no new routes per D-07; V14 config — no env vars. No HIGH findings; nothing to block on.

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed upstream JSON → chart crash | Tampering | Existing shape-guard rejects before store write; error copy + toast, never render raw |
| Fixture JSON tampered in repo | Tampering | Shape-guard at import + shape tests; fixtures are committed source, reviewed like code |
| Poll loop as self-DoS on Hobby quota | Denial of Service | 60s cadence + visibility gate + client singleflight (Pattern 1) |

## Sources

### Primary (HIGH confidence — read this session)
- `src/lib/ict/types.ts:1-50`, `range.ts:1-41`, `bias.ts:1-36`, `dol.ts:1-22`, `regime.ts:1-67`, `levels.ts:23-40`, `rollover.ts:1-55` — ICT core signatures and constants
- `src/lib/yahoo.ts:25-31,47-133,140-147,280-315` — envelope shape, shape-guard, TTL/singleflight/stale-serve
- `src/lib/time.ts:1-17` — Baku util surface
- `app/api/yahoo/route.ts:1-21` — cache headers, 502 path
- `node_modules/lightweight-charts/dist/typings.d.ts:73-94,854-866,2541,2589-2598,3620-3679,4975-4987` — LineStyle, candle style, price-lines, primitives, Time
- `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` — `next/dynamic ssr:false` client-only rule (per AGENTS.md version-pinned requirement)
- `node_modules/next/dist/docs/01-app/02-guides/client-side-data-fetching/index.md` — SWR/TanStack optional; hand-poll justified
- `reference/design.html`, `reference/institutional_rules.md` — layout target, Module 1/2 rules, report shape
- `02-CONTEXT.md` (D-01..D-12), `02-UI-SPEC.md` (layout/color/copy/fixture/state contracts) — normative phase inputs
- `package.json:1-41` — scripts, installed versions; `components/ui/toast.tsx:10` — toast manager

### Secondary (MEDIUM confidence — Context7 docs, seam tier MEDIUM)
- `/tradingview/lightweight-charts` — v5 `addSeries` migration, `createPriceLine`, series-markers, histogram overlay margins, session-highlighting primitive pattern
- `/pmndrs/zustand` — `create` async actions, `useShallow` memoized selectors
- `/vercel/next.js` — `next/dynamic` ssr:false + loading-state patterns
- npm registry `npm view` — installed==latest for zustand, lightweight-charts, date-fns, date-fns-tz; version histories; no postinstall scripts

### Tertiary (LOW confidence)
- WebSearch on lightweight-charts v5 box-overlay examples — no usable result; primitive pattern rests on official plugin-examples instead.

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — versions verified installed + registry-current; APIs verified in local typings; docs via Context7 (seam tier MEDIUM)
- Architecture: MEDIUM — composition of verified Phase 1 outputs and pinned guides; file-breakdown details are planner discretion
- Pitfalls: MEDIUM — grounded in v5 typings + UI-SPEC probe states; countdown cadence and holiday handling carry assumptions (A2, A6)

**Research date:** 2026-09-05
**Valid until:** 2026-10-05 (stable domain; lightweight-charts v5 API surface is the only mover)
