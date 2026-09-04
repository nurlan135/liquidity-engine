# Project Research Summary

**Project:** liquidity-engine — ICT Liquidity Execution Terminal (NQ futures)
**Domain:** Trading dashboard / execution terminal (Next.js, single-symbol NQ=F daily)
**Researched:** 2026-09-04
**Confidence:** HIGH (framework/charting), MEDIUM (Yahoo upstream, futures rollover)

## Executive Summary

This is an institutional-style ICT execution terminal for NQ futures: a read-only daily (D1) dashboard that computes a Dealing Range (Premium/Discount vs Equilibrium), derives a rule-based bias plus a single Draw-on-Liquidity target, and presents everything in a deterministic 6-section institutional report. Experts build this shape as a thin server proxy over market data, a fat pure-math core with zero I/O, and a single client terminal island with a canvas candlestick chart.

The recommended approach: keep the existing Next.js 16 + React 19 + TypeScript scaffold, add no new dependencies (Zustand, lightweight-charts v5, date-fns + date-fns-tz already installed), and build Phase 1 as Module 2 (D1 dealing range) live with sentiment/calendar as typed fixtures behind future-proof API contracts. All ICT math lives in `src/lib/ict` as pure functions with injected time — never fetching, never calling `Date.now()` — so every output is reproducible, unit-testable, and monorepo-extractable. The chart is a `ssr:false` dynamic island using the v5 `addSeries(CandlestickSeries)` API, with price-lines for Equilibrium and bounded primitives for premium/discount zones.

Key risks are all upstream/platform-shaped, not feature-shaped: Yahoo's unofficial v8 endpoint 429-bans scripted clients (mitigate with server-only proxy, browser User-Agent, query1→query2 failover, backoff, 60s TTL, stale-serve); NQ=F quarterly rollover gaps corrupt range anchors (mitigate with raw OHLC never adjclose, rollover-suspect flag, synthetic-gap test); a triple timezone collision between Yahoo UTC, chart UTC, and Asia/Baku display (mitigate with business-day date strings end-to-end, one TZ util module, March+November DST tests); and Vercel Hobby limits of daily-only cron plus per-instance cache (mitigate with client-side 60s polling as the refresh mechanism, CDN s-maxage+SWR headers, visible staleness badges).

## Key Findings

### Recommended Stack

No new dependencies for Phase 1. Next.js App Router Route Handlers proxy Yahoo (`query1` primary, `query2` fallback) with native fetch, a hand-rolled 60s module-level Map cache with stale-on-429 fallback, and explicit `force-dynamic`. lightweight-charts v5 renders candles plus `createPriceLine` levels and series-primitive zone fills. Zustand holds only raw state (symbol, candles, status) while selectors derive all ICT output; date-fns + date-fns-tz v3 handle Asia/Baku logic with epoch-ms canonical in state and formatting at the display edge. Full detail in STACK.md.

**Core technologies:**
- Next.js 16.3.4 App Router + React 19 — Route Handler proxy keeps unofficial Yahoo endpoint server-side with caching; chart loads via `next/dynamic ssr:false` in a Client Component.
- lightweight-charts ^5.2.1 — canvas candlesticks; v5 breaking change `chart.addSeries(CandlestickSeries, opts)` plus native `createPriceLine` for EQ/high/low; zone fills via `ISeriesPrimitive`.
- Zustand ^5.0.15 — single `create<T>()` store with `useShallow` selectors; async polling stays in component/route layer, math in selectors.
- date-fns ^4.4.0 + date-fns-tz ^3.2.0 — matched pair; `formatInTimeZone(date, 'Asia/Baku', ...)`; canonical epoch-ms, business-day strings for D1.
- Pure TypeScript `src/lib/ict/` (no library) — Premium/Discount/EQ, DOL, bias; no I/O, injected `now`, fully unit-testable.

### Expected Features

Phase 1 is Module 2 (D1 Dealing Range) live; sentiment/calendar are mocks; report sections 1,3–6 render unavailable markers. Table stakes are the range display itself (EQ midpoint, position >/\< 0.5, re-anchor rule), OTE/quadrant levels, zone-overlaid candles, cached Yahoo feed with visible age, bias with mandatory rationale string, single named Primary DOL, expansion/compression regime badge, high-impact calendar filter with pre-news flag, True-AVG sentiment table with 60% crowded flag, the 6-section report shell, Baku timezone core, and staleness honesty everywhere. Full detail in FEATURES.md.

**Must have (table stakes):**
- D1 Dealing Range Premium/Discount + Equilibrium/quadrants/OTE — the product's correctness core.
- Candlestick chart with shaded premium/discount + EQ line + freshness label.
- Bias readout (BULLISH/BEARISH/COMPRESSION) with rationale + Primary DOL named level + regime badge.
- 6-section report shell (section 2 live, rest unavailable) + sentiment/calendar fixtures (True AVG excl. Insta/FiboGroup, 60% flag, high-impact filter).
- Asia/Baku timezone core + Zustand wiring.

**Should have (competitive):**
- Pre-news liquidity-engineering interpretation flag — Phase-1-able fusion of calendar + regime + position, strong early differentiator.
- Struck-through blocked-side display (longs only in discount, shorts only in premium) — cheap, teaches methodology.
- Deterministic rule-based engine posture (no LLM) — anti-hallucination as brand.

**Defer (v2+):**
- WHY NOW 3-gate trigger, SMT divergence, engineered-liquidity path viz, FVG quality grading (Module 3/4 program — reserve slots, build zero logic).
- Pain-threshold mapping, automated invalidation level, backtester, screener, auth, broker execution, alerts/mobile, real sentiment/calendar APIs.

### Architecture Approach

Single Next.js 16 app: thin server proxy layer, fat pure-math core, one client terminal island. No backend, no DB, no auth. Data flows one direction with no cycles: Yahoo → proxy (60s TTL + backoff) → TerminalShell polling (60s + visibility guard + jitter) → Zustand raw state → selector-derived ICT math → chart props (props in, canvas out). Fixture routes for sentiment/calendar sit behind the same contracts real APIs will use. Opinionated rule: `src/lib/ict` never touches fetch, `Date.now()`, Intl, or Zustand. Full detail in ARCHITECTURE.md.

**Major components:**
1. Proxy routes (`app/api/yahoo|sentiment|calendar/route.ts`) — upstream fetch, TTL, backoff, validation, fixture contracts.
2. Terminal island (`TerminalShell` + Liquidity/Chart/Ticket panels + ReportShell) — polling, hydration, composition; chart owns lifecycle only, never the store.
3. Pure core (`src/lib/ict/*`, `src/lib/time.ts`, `src/fixtures/*`) + Zustand raw-state store — derived math via memoized selectors, Baku utils with injected time.

### Critical Pitfalls

Full catalogue of 6 critical + 5 moderate + 3 minor in PITFALLS.md. Top 5:

1. **Yahoo 429/IP ban (missing UA, no failover, fan-out)** — server-only proxy, browser UA + Accept/Referer headers, query1→query2 failover, backoff with jitter honoring Retry-After, 60s TTL, singleflight dedupe, serve-stale on failure, never cache errors.
2. **NQ=F rollover gap corrupts range** — raw OHLC never adjclose, `contractHint` + roll-proximity warning, `rolloverSuspect` flag on N×ATR close-to-close jumps, keep gap visible, explicit window + asOf in range function.
3. **Timezone triple-shift (Yahoo UTC × chart UTC × Baku)** — D1 as `YYYY-MM-DD` strings proxy→store→chart (no TZ adjustment needed per lightweight-charts docs), single `Asia/Baku` rule via date-fns-tz, IANA `America/Chicago` for CME DST, injected `asOfBakuDate`, Baku-stamped `lastUpdated`.
4. **lightweight-charts v5 API + SSR + autoscale traps** — dynamic `ssr:false` island, `addSeries` not `addLineSeries`, `chart.remove()` cleanup, price-lines/bounded primitives with null autoscale, sorted-deduped business-day `setData`, ResizeObserver sizing.
5. **Vercel Hobby limits (daily-only cron, per-instance cache, hard caps)** — no sub-daily cron (client polling IS refresh), CDN `s-maxage=60, SWR=30` so edge absorbs fan-out, correctness state never in function memory, `maxDuration` + size caps, visible cache-age badge.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Proxy + ICT core + fixtures (backend-first, no UI chart yet)
**Rationale:** Everything depends on validated candles and correct math; pitfalls 1–3 and 6–9 must be closed before any pixel renders or the chart will display confidently-wrong levels.
**Delivers:** `GET /api/yahoo` with UA/failover/backoff/TTL/stale-serve envelope (`{candles, lastUpdatedISO, stale, source}`), null-row validation, poll jitter + singleflight; `src/lib/ict` pure functions (range, EQ, quadrants/OTE, position, regime, DOL, bias+rationale, True AVG, 60% flag) with injected time; rollover-suspect flag + synthetic-gap test; March/November DST tests; fixture routes + shared contracts behind future API shapes; unit suite green.
**Addresses:** Daily OHLC feed, dealing-range math, EQ/quadrants/OTE, bias+DOL rules, regime heuristic, True AVG + threshold, calendar filter shapes, timezone core.
**Avoids:** Pitfalls 1, 2, 3, 6, 7, 8, 9, 10.

### Phase 2: Terminal shell + chart + report shell (UI composition)
**Rationale:** Once data and math are trusted, composition is mechanical: RSC frame, client island, three panels, dynamic chart, report shell with unavailable markers. Chart overlays added one at a time with autoscale checks.
**Delivers:** RSC 3-panel frame + `TerminalShell` (polling, hydration, Baku clock); Liquidity/Chart/Ticket panels reading selectors; `CandleChart` island (candle-only first, then EQ price-line, then zone primitives with null autoscale); `ReportShell` sections 1–6 with section 2 live; freshness/stale/fixture badges; weekend-closed state (never synthesize candles).
**Uses:** lightweight-charts v5 `addSeries` + `createPriceLine` + primitives; `next/dynamic ssr:false`; Zustand selectors; shadcn-allowed components only.
**Implements:** RSC shell, terminal island, chart island, store wiring, report shell.
**Avoids:** Pitfalls 4, 8, 11, 13.

### Phase 3: Deploy + verify on Vercel Hobby (prove it live)
**Rationale:** Per-instance cache, cold starts, and egress-IP reputation only manifest in production; localhost success proves nothing about 429 resilience or staleness honesty.
**Delivers:** Hobby deploy with no sub-daily cron, CDN cache headers verified, cold-start + stale-serve drill (kill upstream, confirm stale badge), bounded 6mo D1 window, usage-dashboard sanity, live-URL checklist (cache age, DST dates, rollover banner path).
**Avoids:** Pitfalls 5, 12.

### Phase Ordering Rationale

- Proxy and pure math come first because every downstream output (zones, bias, DOL, report) is a deterministic function of validated candles plus an explicit asOf date; building UI first risks cementing wrong levels.
- Fixtures parallelize with math (no dependency to build, only to fuse) but share Phase 1 so contracts are locked before panels consume them — preventing fixture drift.
- Chart overlays sequence candle-only → price-lines → zone fills so autoscale regressions are caught per-overlay, and weekend gaps are never filled.
- Deploy verification is its own phase because Hobby's daily-cron limit, per-region cache skew, and shared-egress 429s cannot be tested locally.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (proxy resilience):** Yahoo is unofficial and unverified live (research rate-limited during this pass) — plan a `/gsd-plan-phase --research-phase` for exact UA/header set, `Retry-After` semantics, and schema-validation rules against the installed fetch runtime.
- **Phase 2 (zone-fill primitive):** v5 `ISeriesPrimitive` path is doc-verified but implementation effort unspiked — time-box a spike; fallback is bounded box overlays with null autoscale.
- **Phase 3 (Hobby verification):** cron/cache/egress behavior needs live-URL confirmation — research current Hobby cron + `maxDuration` + cache semantics at plan time.

Phases with standard patterns (skip research-phase):
- **Phase 2 shell/panels/store wiring:** RSC + Zustand selector + `ssr:false` island are HIGH-confidence documented patterns — standard build, no extra research.
- **Sentiment True-AVG + 60% flag logic:** settled arithmetic on fixtures — unit tests suffice.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | lightweight-charts v5, Next dynamic/proxy, Zustand patterns verified in current official docs via Context7; date-fns-tz pairing MEDIUM (signature not re-verified — check installed types). |
| Features | HIGH | Module 2 math formula-verified via LuxAlgo + ICT canon; sentiment/calendar live API shapes MEDIUM (surfaces confirmed, fixtures-first mitigates). |
| Architecture | HIGH | Framework patterns from official docs; Yahoo-proxy specifics MEDIUM (upstream unverified). |
| Pitfalls | HIGH | Proxy/rate-limit, Hobby cron, chart-TZ verified multi-source; NQ=F rollover MEDIUM (general futures mechanics applied to NQ=F). |

**Overall confidence:** HIGH for what to build and how to structure it; MEDIUM for Yahoo upstream behavior — which the architecture (validation + backoff + stale-serve + visible age) is explicitly designed to survive regardless.

### Gaps to Address

- Yahoo v8 exact rate-limit numbers (~2000/hr, LOW, anecdotal): design is robust regardless; validate with backoff + stale-serve test in Phase 1, never by probing limits.
- Yahoo response-schema drift: ship validation with loud failure + stale fallback; fail visibly, never silently.
- `formatInTimeZone` / TZ-helper signatures: confirm against installed `date-fns-tz` package types during Phase 1; wrap in `toBakuDate`/`formatBaku` utils.
- Zone-primitive implementation cost: time-boxed spike in Phase 2; fallback documented.
- `America/Chicago`↔`Asia/Baku` DST-offset behavior: cover with March + November unit tests, not assumptions.

## Sources

### Primary (HIGH confidence)
- lightweight-charts v5 docs via Context7 (`/tradingview/lightweight-charts`) — `addSeries`, price-lines, primitives, UTC/business-day TZ guidance.
- Next.js docs via Context7 (`/vercel/next.js`) — Route Handlers caching, `force-dynamic`, `next/dynamic ssr:false`.
- Zustand docs via Context7 (`/pmndrs/zustand`) — `create<T>()` typed pattern, `useShallow`.
- LuxAlgo Premium & Discount + Institutional Order Flow concept library — EQ/position/quadrant/OTE formulas, DOL framing.
- `reference/institutional_rules.md` — normative 4-module, 6-section, True-AVG/60% spec.
- Vercel cron usage/pricing + Functions limits docs — Hobby daily-cron limit, duration/usage caps.
- Myfxbook Community Outlook — sentiment table reference UX.

### Secondary (MEDIUM confidence)
- date-fns-tz docs — `toZonedTime`/`fromZonedTime`/offset semantics; v4-pairing confirmed, signature to re-verify.
- Scrapfly Yahoo Finance API guide + yfinance/429 community consensus — v8 shape, UA requirement, query1/query2 fallback.
- Sierra Chart / EBC rollover explainers — continuous-futures gap mechanics applied to NQ=F.
- FXSSI 60% threshold, ForexFactory/Myfxbook calendar surfaces, ICT daily-bias guides.

### Tertiary (LOW confidence)
- r/Daytrading + r/FuturesTrading practitioner threads — directional support; anecdotal.
- Yahoo ~2000/hr limit figure — anecdotal; needs no validation given resilient design.

---
*Research completed: 2026-09-04*
*Ready for roadmap: yes*
