# Project Research Summary — v2.0 Modul 3 (Liquidity Sequencing & SMT)

**Project:** liquidity-engine v2.0 Modul 3
**Domain:** ICT liquidity-engineering terminal (NQ vs ES SMT + 4H/1H internal/external + session AMD)
**Researched:** 2026-09-06
**Confidence:** HIGH overall (stack/arch/pitfalls grounded in repo reads; ICT semantics corroborated across sources)

## Executive Summary

Modul 3 turns the v1.0 single-symbol daily terminal into a dual-symbol, multi-timeframe ICT execution aid: ES=F second-symbol fetch enables mandatory NQ-vs-ES SMT divergence; intraday (1H first, 15M where cheap) candles unlock the FVG-based internal-liquidity map, the ERL/IRL transition state machine, and the full session AMD chain (Baku-aware Asia Range → London/NY Judas Swing → phase classifier); all three detector families feed a live, rule-based report §3. The headline finding is that no new dependencies are needed — Next.js 16 route handler, `src/lib/yahoo.ts`, `src/lib/ict` pure functions, date-fns-tz, lightweight-charts v5, Zustand 5 slices, and vitest already cover everything.

The recommended approach is strictly ordered: data contracts first (parameterized proxy with per-symbol/per-interval envelopes, timestamp inner-join, intraday contract with forming-candle exclusion), pure math second (time-anchored swing matching + SMT comparator with rollover suppression, 4H synthesis from 1H, FVG/IRL + transition state), session logic third (IANA-resolved Asia/Killzone windows with DST gates, three-gate Judas with displacement proof, false-positive budget), composition last (Asia overlay, §3 honest-degrade prose, Vercel verify). The key risks are phantom SMT from index-zipped swings, dual-symbol 429 storms from lockstep polling, DST-shifted Killzones, and Judas over-firing on bare pierces — each has a concrete gate (matched-pair fixtures + choppy no-signal test, staggered polling + per-symbol stale, March/November/maintenance-break tests, killzone+sweep+displacement conjunction with ≤25% session budget).

## Key Findings

### Recommended Stack

No new dependencies. Generalize the proven v1.0 pieces: parameterize `/api/yahoo` + `src/lib/yahoo.ts` to `fetchCandles(symbol, interval)`, add pure `src/lib/ict` modules (`swings.ts`, `smt.ts`, `transition.ts`, `sessions.ts`, `aggregate.ts`), resolve sessions on the ET clock via date-fns-tz, draw Asia bands with an inline lightweight-charts v5 primitive + `createSeriesMarkers`, and hold ES/intraday slices in Zustand with SMT/AMD as derived selectors. Full detail: `STACK.md`.

**Core technologies:**
- Next.js 16.3.4 route handler (extended) — serve ES=F + 1H/15M through existing proxy pattern (failover, backoff, singleflight, 60s TTL reused)
- `src/lib/yahoo.ts` generalized fetcher — one parameterized fetcher with symbol/interval allowlists and per-key cache isolation
- `src/lib/ict` pure functions (extended) — deterministic candle arithmetic, no library, injected time, fixture-tested
- date-fns-tz ^3.2.0 — DST-correct session bucketing on `America/New_York`, display in `Asia/Baku`
- lightweight-charts ^5.2.1 primitives — Asia bands (`attachPrimitive`) + Judas/SMT pins (`createSeriesMarkers`), no drawing plugin
- Zustand ^5.0.15 slices — per-symbol slices, SMT/AMD/§3 as derived selectors, never stored state

### Expected Features

Report §3's three prescribed lines (Engineered Liquidity Path, SMT Divergence Status, Session AMD Timing) dictate the scope: every table-stakes feature maps 1:1 onto a §3 line, and anything missing keeps its v1.0 unavailable marker. Full detail: `FEATURES.md`.

**Must have (table stakes):**
- ES=F fetch via existing proxy — SMT impossible without it (LOW cost)
- Intraday candles (1H first, 15M if cheap) — blocks FVG, Asia, Judas (MEDIUM, critical path)
- Swing detection shared primitive (NQ+ES, closed candles only) — three consumers (LOW)
- SMT comparator with swing references in output — mandatory per spec (MEDIUM)
- FVG map + ERL/IRL transition state (FVG-only IRL) — §3 line 1 + §2 Delivery Cycle upgrade (MEDIUM)
- Asia Range (Baku-aware) + London Judas + AMD classifier — §3 line 3 core (MEDIUM)
- §3 live rule-based prose + Asia Range chart overlay — milestone definition of done (LOW)
- Correlation-regime gate — the one differentiator; un-gated SMT is a false-signal machine (LOW)

**Should have (competitive, pick at most one more or defer):**
- SMT + Judas confluence boost in confidence score — highest-conviction setup scoring (LOW)
- Equal-highs/lows + inducement pools — engineered-liquidity marking (MEDIUM, P2)

**Defer (v2.x / v3+):**
- NY-open Judas (P2, after London confirmed on live data), AMD history, NY-afternoon distinction (P2–P3)
- Full IRL taxonomy (OB/breaker/BPR), displacement/MSS linkage, §5 ticket, auto-execution (Modul 4 scope or never)

### Architecture Approach

Brownfield append-only extension: proxy parameterized by `(symbol, interval)` with per-key cache; 4H synthesized from 60m NY-anchored blocks (Yahoo has no 4H interval); store holds independent raw slices with `Promise.allSettled` partial degrade (NQ required, ES/intraday optional); all session math in NY-local with Baku rendering at the edge. Full detail: `ARCHITECTURE.md`.

**Major components:**
1. Parameterized proxy (`app/api/yahoo/route.ts` + `src/lib/yahoo.ts`) — `?symbol=&interval=` with allowlists, per-combo cache/stale/singleflight
2. Pure ICT math (`src/lib/ict/swings.ts`, `smt.ts`, `transition.ts`, `sessions.ts`, `aggregate.ts`) — untouched D1 files, injected time, `closedOnly` discipline
3. Dual-envelope store + derived selectors (`store.ts`) — raw slices only; `selectSMT/selectTransition/selectAMD/selectSection3` derive, stable selector-function subscription
4. Session overlay + §3 composition (`asia-primitive.ts`, `nq-chart.tsx`, `report.tsx`) — price bands with null-autoscale, candidate-vs-confirmed markers, honest-degrade §3 model

### Critical Pitfalls

Top risks when adding a second symbol, intraday sessions, and divergence logic to the live terminal. Full detail: `PITFALLS.md`.

1. **Phantom SMT from index-zipped swings** — compare time-anchored matched pairs with one shared strength param and bps tolerance; gate on bull/bear/no-signal (choppy ±1-bar) fixtures before UI wiring.
2. **Second symbol halves 429 headroom** — per-symbol envelopes (never one merged `stale`), per-key cache, staggered NQ :00 / ES :30 polling with jitter, 20-client 429 drill; SMT refuses when either leg is stale.
3. **NQ/ES timestamp misalignment** — inner-join on timestamp before any comparison, drop incomplete rows pre-join, exclude forming candle, surface coverage diagnostics.
4. **DST moves the Killzone** — resolve all windows via IANA `America/New_York` wall-clock at call time, inject `asOf`, gate on March + November + maintenance-break tests.
5. **Judas flags every wick** — three-gate conjunction (in-killzone AND swept-Asia-extreme AND reversal-with-displacement in ATR/Asia-height multiples); candidates hollow vs confirmed solid; ≤25% confirmed sessions over 60 days.
6. **Honesty/purity contract breakage** — zero `Date.now` in `src/lib/ict`, store holds inputs only, selector-boundary freshness gate, every degraded §3 state renders its reason.

## Implications for Roadmap

Based on research, suggested phase structure (data contracts → math → sessions → composition):

### Phase 1: Dual-symbol proxy + data contracts
**Rationale:** Intraday candles are the critical-path dependency (FVG, Asia, Judas all block on it); dual-symbol load and timestamp join are the highest deployment risks.
**Delivers:** `?symbol=&interval=` proxy, per-symbol envelopes, staggered polling, intraday epoch contract, timestamp join, bounded windows.
**Addresses:** ES=F fetch, intraday candles (FEATURES P1 foundation).
**Avoids:** P2 (429 storm), P3 (misalignment), P6 (intraday-as-D1), P8 (store/purity), security allowlist + validate-then-cache.

### Phase 2: SMT + 4H/1H sequencing math
**Rationale:** Pure functions are independently testable once the data contract is stable; swing matching must be pinned before any badge or §3 prose consumes it.
**Delivers:** `swings.ts` + `smt.ts` (matched pairs, bps tolerance, correlation gate, rollover suppression) + `aggregate.ts` + FVG/IRL + transition state.
**Uses:** `src/lib/ict` purity, vitest fixture density, derived selectors.
**Implements:** SMT Divergence Status + Engineered Liquidity Path detector outputs; §2 Delivery Cycle upgrade.
**Avoids:** P1 (phantom SMT), P7 (roll-week fake SMT), P8 (purity).

### Phase 3: AMD sessions (Asia Range + Judas)
**Rationale:** Session logic depends on intraday contract (Phase 1) but is independent of SMT math (Phase 2); London-first de-risks NY to a parameter set.
**Delivers:** `sessions.ts` (NY-anchored windows, Asia Range, three-gate London Judas, AMD classifier); NY shown as Gözlənilir until its detector lands.
**Addresses:** Asia Range, London Judas + AMD classifier, correlation-gated §3 line 3.
**Avoids:** P4 (DST), P5 (Judas over-fire).

### Phase 4: Composition (§3 live + overlays + verify)
**Rationale:** Presentation only after detectors are gated; autoscale, degraded-state, and deploy checks are cheapest as a final composition pass.
**Delivers:** Asia overlay primitive + markers, rule-based §3 prose with all degraded branches, layer toggles, Baku dual-stamp labels, Vercel per-leg verify.
**Avoids:** Chart autoscale squash, §3 confident-on-stale, cold-start blind spots.

### Phase Ordering Rationale

- Data contracts before math before presentation — nothing downstream starts until per-symbol stale envelopes + join + forming-exclusion are verified on the live URL.
- SMT math and AMD sessions fan out in parallel after Phase 1 (no cross-dependency); composition merges them into §3.
- London-before-NY and daily-SMT-before-intraday-SMT keep each phase shippable partial-honest (unavailable markers, never faked signals).

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Yahoo ES=F 1H row density / intraday lookback caps are LOW/MEDIUM confidence web claims — spike-verify with a live probe test in the first implementation phase.
- **Phase 3:** Judas/AMD ICT semantics are MEDIUM (trading-education sources, no official spec) — pin Asia 19:00–00:00 NY variant + displacement multiples during planning.

Phases with standard patterns (skip research-phase):
- **Phase 2 (SMT core):** matched-pair comparator shape is settled in-repo; standard pure-function work.
- **Phase 4 (composition):** v5 primitive + markers + §3 template pattern already proven by v1.0 §2.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Installed-package mapping verified via Context7; Yahoo intraday caps are web-sourced, need live probe |
| Features | HIGH | ICT methodology stable; spec Modul 3 + §3 prescriptive; consensus across ICT sources |
| Architecture | HIGH | Codebase read directly (store, proxy, chart, report, time, freshness); Yahoo 4H absence verified |
| Pitfalls | HIGH for proxy/session/chart mechanics; MEDIUM for SMT/Judas semantics | Dual-symbol load + DST + overlay behavior grounded; signal semantics from education sources |

**Overall confidence:** HIGH

### Gaps to Address

- ES=F 1H row density / Yahoo intraday lookback caps: validate with live probe in Phase 1; clamp `period1` windows with margin.
- Asia session open variant (19:00 vs 20:00 NY): pin 19:00–00:00 with code comment noting the variant; revisit only if live Asia ranges look systematically off.
- NY-open Judas parameters: London skeleton first; NY window/anchor tuned after London confirms on live data.
- SMT tolerance (bps) + Judas displacement multiples: tune against 60-day false-positive budget during implementation, not now.

## Sources

### Primary (HIGH confidence)
- Repo reads: `app/api/yahoo/route.ts`, `src/lib/yahoo.ts`, `src/lib/ict/types.ts`, `src/lib/store.ts`, `src/lib/time.ts`, v1.0 research PITFALLS P1–P6
- CME session reality: Tastytrade futures hours, CrossTrade CME table, CME Group trading hours

### Secondary (MEDIUM confidence)
- ICT semantics (5+ corroborating education sources): innercircletrader.net (SMT, IRL/ERL, Judas), LuxAlgo (SMT, IRL/ERL, Judas), FXNX Asian Range + Judas, TradingStrategyGuides London Judas, Flux Charts SMT, Medium SMT manipulated-markets
- Library docs via Context7: date-fns-tz, lightweight-charts v5 (markers + session-highlight primitive), Zustand v5 slices

### Tertiary (LOW confidence)
- Yahoo intraday specifics (needs live validation): v8 `interval=60m/1h` support, 15m ~60d / 1m ~7d caps, futures-symbol path parity; exact 429 numeric limits (unofficial, variable)

---
*Research completed: 2026-09-06*
*Ready for roadmap: yes*
