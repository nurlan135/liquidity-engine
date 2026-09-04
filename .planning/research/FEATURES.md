# Feature Landscape — ICT Liquidity Execution Terminal (NQ Futures)

**Domain:** ICT / liquidity-engineering execution terminal for NQ futures
**Researched:** 2026-09-04
**Scope lens:** Phase 1 = Module 2 (D1 Dealing Range Premium/Discount) live only; sentiment/calendar as mocks; report shell sections 1–6 with unavailable markers.
**Overall confidence:** HIGH for Module 2 mechanics (Premium/Discount math is settled, formula-verified via LuxAlgo concept library + ICT canon); MEDIUM for sentiment/calendar integration details (broker-exclusion and threshold conventions confirmed via Myfxbook/FXSSI surfaces, live API shapes unverified — fixtures first).

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| D1 Dealing Range Premium/Discount display | The core value: every price is either expensive or cheap vs equilibrium. `EQ = (Rhigh + Rlow) / 2`, premium = pos > 0.5, discount = pos < 0.5. Without this nothing else matters. | Low | Pure functions in `src/lib/ict`: range anchors in, EQ/zones/position-out. Inject time (no `Date.now` inside). Re-anchor rule required: close beyond either extreme or new leg through major liquidity retires the range. |
| Equilibrium + quadrant/OTE levels | OTE pocket (0.62–0.79 retracement) and 0.25/0.75 quadrants are the shared ICT vocabulary for grading entries inside a zone. Users will look for them. | Low | Derive from `Level(f) = Rlow + f*(Rhigh-Rlow)`. Display-only in Phase 1; entry grading comes later with Module 4. |
| Candlestick chart with zone overlays | Premium/discount must be *seen* on price, not just read as numbers. Shaded premium/discount halves + EQ line is the standard visual. | Med | lightweight-charts via dynamic import (already installed). Overlays: two background bands + EQ line + DOL marker. Must handle range re-anchor redraw cleanly. |
| Daily OHLC data feed with cache + backoff | Live NQ=F daily candles are the terminal's oxygen. 60s cache + 429 exponential backoff is the reliability contract. | Low | Yahoo proxy `app/api/yahoo` already specified. Cache timestamp must be visible in UI (stale-data honesty). |
| Bias readout (BULLISH / BEARISH / COMPRESSION) | Every ICT workflow starts with "what is today's bias." A terminal without a bias line reads as broken. | Low–Med | Phase 1: rule-based bias from D1 position + regime (discount + expansion = bullish lean, etc.). Deterministic rules, no LLM. Rationale string mandatory — never a bare label. |
| DOL target readout | Draw on Liquidity is the destination: the specific pool price is being delivered to (PDH/PDL, BSL/SSL, HTF FVG). "Bias without a target" is the top complaint about ICT tooling. | Med | Phase 1: single Primary DOL as a named level (e.g. "PDH 21,480"). Selection rules codified from position + regime. Multi-target ladder (EQ first, then extreme) is a later refinement. |
| Volatility regime indicator (Expansion / Compression) | Determines whether to expect delivery or chop. Module 2 spec requires it; every dealing-range read is conditioned on regime. | Med | Heuristic from daily range expansion/contraction (e.g. N-day ATR/range percentile). Must degrade honestly on thin history — show "insufficient data," never fake it. |
| Economic calendar integration (high-impact filter) | NFP/CPI/FOMC proximity changes the read to "pre-news liquidity engineering." ICT traders check the calendar before every bias. | Med | Phase 1: JSON fixture shaped like ForexFactory/Myfxbook calendar (event, impact, datetime UTC). UI: high-impact-only filter + countdown + pre-news warning flag on bias/DOL. Real API later. |
| Sentiment exposure table | Retail positioning as contrarian fuel: symbol, long%, short%, True AVG. Myfxbook Community Outlook is the reference UX (long-vs-short %, lots, avg prices). | Med | Phase 1: ForexFactory + Myfxbook-shaped fixtures with True AVG (excl. Insta/FiboGroup per spec; XAUUSD exception noted but out of scope) + 60% threshold flag. Contrarian reading note, not a signal. |
| Institutional report, 6-section shell | The deterministic report IS the product surface: sections 1–6 in fixed order with institutional language (algorithmic target, invalidation, forced delivery — never "maybe"). | Med | Phase 1: section 2 live; sections 1, 3–6 rendered with explicit unavailable markers. Report shape stable from day one so later phases only fill logic. |
| Timezone-aware session/date logic (Asia/Baku) | Dealing-range anchors, daily boundaries, and later killzones all depend on correct day edges. Wrong timezone = wrong levels silently. | Low | date-fns-tz already installed. Centralize "trading day" computation; inject clock for testability. |
| Data freshness + unavailable-state honesty | Stale candles or empty fixtures must announce themselves. Silent staleness destroys trust in a levels product. | Low | Cache age on chart header; "fixture data" badge on sentiment/calendar; unavailable markers on non-Module-2 report sections. Cheap to build, high trust value. |

## Differentiators

Features that set the product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| WHY NOW engine (3-gate execution trigger) | Converts bias into an execution decision: killzone timing + liquidity purge complete + forced delivery. Most ICT tools show levels; almost none gate the *timing*. This is Module 4 and the terminal's endgame. | High | Deferred to Module 4 phase. Phase 1 implication: report section 4 shell must reserve the 3-gate structure so logic drops in later. |
| SMT divergence panel | Cross-market confirmation (NQ vs correlated index) is the strongest institutional accumulation/distribution signal in the methodology — and mandatory per spec. No retail terminal does this well. | High | Module 3. Requires second data feed + swing-comparison logic. Phase 1: reserve panel slot showing unavailable. |
| Engineered liquidity path visualization | Shows *future* liquidity being built (equal highs/lows, inducement trendlines), not just historical levels. Turns the chart from a map into a forecast. | High | Module 3. Needs swing-detection + equal-level clustering. Hardest chart feature; keep out of Phase 1 entirely. |
| Displacement / FVG quality grading (Defended vs Weak/Breakaway) | Distinguishes tradeable imbalance from liquidity-target gaps. This judgment call is what separates institutional reads from retail FVG-plotting indicators. | High | Module 4. Rule-based grading heuristics need real-data validation before trust. |
| Pain-threshold mapping (retail stops → chart zones) | Translates "65% short" into "stops clustered above BSL 21,500" drawn on the chart. Nobody connects the sentiment table to price levels visually. | Med–High | Builds on sentiment table + dealing range. Natural Phase 2 bridge between Module 1 mocks and live logic. |
| Micro-structure invalidation level | "Which swing break cancels this bias, no discussion" — auto-computed per bias. Gives every call a falsifiable line. Cheap to compute once swings exist, high perceived rigor. | Med | Depends on swing detection. Can ship as manual/heuristic first (last D1 swing), automate later. |
| Pre-news liquidity-engineering flag | Not just "NFP in 2 days" but the *interpretation*: current movement classified as pre-news trap vs genuine delivery. Directly from spec Module 2.3. | Med | Calendar + regime + range-position fusion. Genuinely Phase-1-able and a strong early differentiator — include if cheap once fixtures exist. |
| Deterministic rule-based engine (no LLM) | Every output reproducible from inputs + injected time; pure functions testable and monorepo-extractable. Anti-hallucination IS the brand in a space full of AI-signal scams. | Med | Architectural, not a UI feature. Enforce via `src/lib/ict` purity constraint from day one — retrofitting purity later is a rewrite. |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| LLM-generated analysis or narratives | Non-deterministic output violates the core principle (TIME>PRICE logic is codifiable); hallucinates levels, destroys trust, costs money on zero budget | Rule-based templates with computed values interpolated; fixed institutional phrasing |
| Intraday LTF execution logic in Phase 1 (15M/5M entries, MSS, IOFED) | Foundation-first: LTF entries without a validated D1 range produce confident garbage; scope explosion | D1 only; report sections 3–4 show unavailable with the gate structure reserved |
| Footprint / DOM / volume-profile order-flow tools | ICT-in-ICT-sense reads liquidity from candles (which pools taken, which zones hold), not exchange delta; futures order-flow data has no zero-budget source | Price-based liquidity reads: sweeps of PDH/PDL, BSL/SSL markers, displacement candles |
| Multi-symbol screener / watchlist | Single-terminal MVP for NQ; screener multiplies data-feed, cache, and UI cost with zero Phase-1 validation payoff | One symbol, done correctly; symbol slot in Zustand store reserved for later |
| Auth, accounts, saved workspaces | No user-specific value in Phase 1; adds backend, sessions, and Vercel-scope creep on a free-tier static-first app | Stateless terminal; localStorage only if persistence ever needed |
| Broker / auto-trading execution integration | Liability + API-key handling + order-state machine; turns an analysis terminal into a regulated execution surface | Read-only terminal; bias + DOL + invalidation as the handoff to the user's own execution |
| Backtesting engine in Phase 1 | Needs historical depth, fill assumptions, and regime-aware evaluation — a product unto itself; premature before live levels are validated | Validate live: deployed + cache/backoff/timezone verified; log bias-vs-outcome manually first |
| Real sentiment/calendar API integrations in Phase 1 | Zero budget, no keys, rate-limited free tiers; live integration work before the range math is trusted is wasted | Fixture JSON shaped like the real APIs (ForexFactory/Myfxbook) so swap-in is mechanical later |
| Alerts / push / mobile app | Notification infrastructure + mobile surface with no validated signal worth waking anyone for yet | Deployed web terminal; revisit only when WHY NOW engine is live and validated |
| Counter-zone signal generation (longs in premium / shorts in discount) | Methodology forbids chasing the extended side; generating such signals teaches users to mistrust the premium/discount display itself | Hard filter: entries only discount-for-longs / premium-for-shorts; show the blocked side as struck-through, not hidden (teaches discipline) |
| Over-precision levels (5-decimal targets, fake confidence %) | Implies measurement accuracy the D1 method doesn't have; a wrong-exact level is worse than a right-approximate zone | Round levels to tick-sensible precision; confidence as LOW/MED/HIGH bands with stated reason, never 87.3% |

## Feature Dependencies

```
Yahoo proxy (NQ=F D1 candles, 60s cache, backoff)
  → Dealing Range math (anchors, EQ, premium/discount, position)
      → Chart zone overlays (bands, EQ line, OTE/quadrant levels)
      → Bias readout (position + regime fusion)
      → Volatility regime (range expansion/compression heuristic)
            → Primary DOL selection (position + regime → named HTF magnet)
            → Pre-news engineering flag (regime + calendar proximity)
      → Report section 2 (Macro Dealing Range — the only live section in Phase 1)

Calendar fixture (ForexFactory/Myfxbook-shaped, high-impact filter)
  → Pre-news flag + countdown display
  → Report sections 2–3 unavailable→live transition (later phases)

Sentiment fixtures (True AVG excl. Insta/FiboGroup, 60% threshold)
  → Exposure table + contrarian note
  → Pain-threshold mapping (Phase 2; needs chart zones above)
  → Report section 1 (later phase)

Timezone core (Asia/Baku trading-day computation)
  → Range anchors, daily boundaries, freshness labels, all future session logic

Report shell (sections 1–6, unavailable markers)
  → No logic dependencies; must exist first so later phases fill rather than reshape

Swing detection (NOT Phase 1)
  → Invalidation level → Engineered-liquidity viz → FVG grading → WHY NOW gates
  (this subtree is the Module 3/4 program; keep its panel slots reserved but empty)
```

Critical path for Phase 1: proxy → range math → overlays + bias + DOL → report shell. Sentiment/calendar fixtures parallelize cleanly (no dependency on range math to build, only to fuse later).

## MVP Recommendation (Phase 1)

Prioritize:
1. Dealing-range math as pure functions + equilibrium/quadrant/OTE levels (the product's correctness core)
2. Candlestick chart with premium/discount overlays + data-freshness label
3. Bias readout with rationale string + Primary DOL named level
4. Volatility regime badge + pre-news flag if cheap once fixtures exist
5. Full 6-section report shell, section 2 live, rest marked unavailable
6. Sentiment + calendar fixtures with True AVG, 60% flag, high-impact filter (mocks that look like the future APIs)
7. Timezone core + Zustand store wiring (symbol, timeframe, range state, confidence)

Defer: WHY NOW gates, SMT panel, engineered-liquidity viz, FVG grading, invalidation automation, pain-threshold mapping — reserve their slots, build zero logic.

Stretch (include only if ahead): pre-news liquidity-engineering interpretation flag; struck-through blocked-side display (cheap, teaches methodology).

## Sources

- LuxAlgo SMC/ICT concept library — Premium & Discount (formula: EQ midpoint, pos_t position, quadrant/OTE refinements, re-anchor rules): https://www.luxalgo.com/library/concept/premium-and-discount/ (HIGH — curated methodology reference)
- LuxAlgo — Institutional Order Flow (bias-layer framing, DOL as destination, flow-vs-signal distinction): https://www.luxalgo.com/library/concept/institutional-order-flow/ (HIGH)
- ICT IOFED guide, innercircletrader.net (daily-bias-first trade flow, TP at next DOL/PD array): https://innercircletrader.net/tutorials/ict-institutional-order-flow-entry-drill/ (MEDIUM — community guide to ICT canon)
- Aron Groups ICT Daily Bias guide (bias construction steps, session structure, liquidity-level marking workflow): https://arongroups.co/technical-analyze/ict-daily-bias-complete-trading-guide/ (MEDIUM)
- Myfxbook Community Outlook (sentiment table schema: long/short %, lots, avg prices per symbol): https://www.myfxbook.com/community/outlook (HIGH — first-party reference UX)
- FXSSI sentiment tool (60% contrarian threshold convention): https://fxssi.com/tools/current-ratio (MEDIUM — vendor convention corroborating spec's 60% rule)
- Myfxbook economic calendar + ForexFactory calendar (calendar UX reference, high-impact filtering): https://www.myfxbook.com/forex-economic-calendar, https://www.forexfactory.com/calendar (MEDIUM — surfaces confirmed, API shapes unverified)
- Project domain spec `reference/institutional_rules.md` (4 modules, 6-section report, TIME>PRICE, True-AVG broker exclusion, 60% threshold — normative for this build) (HIGH — primary requirement source)
- `r/Daytrading` ICT retrospective + `r/FuturesTrading` DOL thread (practitioner friction: internal/external range confusion, futures-liquidity-without-volume question — supports no-footprint anti-feature stance) (LOW — anecdotal, directionally useful)
