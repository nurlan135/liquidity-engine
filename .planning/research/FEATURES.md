# Feature Research: v2.0 Modul 3 — Liquidity Sequencing & SMT (NQ vs ES, full AMD)

**Domain:** ICT liquidity-engineering terminal, Module 3 (4H/1H sequencing + cross-market SMT + session AMD)
**Researched:** 2026-09-06
**Confidence:** HIGH (ICT methodology is stable, well-documented consensus; spec in `reference/institutional_rules.md` Modul 3 is prescriptive)

## Scope Note

Brownfield milestone. Already built (v1.0, do NOT re-research): NQ=F daily candles via Yahoo proxy, D1 dealing range (Premium/Discount/EQ, quadrant/OTE, bias/DOL/regime/rollover), candlestick chart with zone overlays, 3-panel terminal, rule-based report shell (§2 live, §3–§6 unavailable markers), sentiment/calendar fixtures, Baku timezone handling. This file covers ONLY what Modul 3 newly needs: SMT divergence (NQ vs ES), internal/external liquidity transitions (4H/1H), and full session AMD (Asia Range + London/NY Judas Swing), plus the report §3 activation they feed.

## Feature Landscape

### Table Stakes (Modul 3 Is Incomplete Without These)

Features the spec (`institutional_rules.md` Modul 3 + report §3) effectively mandates. Missing any one = §3 cannot go live honestly.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| ES=F second-symbol fetch via existing Yahoo proxy | SMT is defined as NQ-vs-ES swing comparison; no ES data = no SMT, and spec marks SMT "MƏCBURİ" (mandatory) | LOW | Same `app/api/yahoo` route, parameterized symbol; same 60s CDN TTL + serve-stale + failover. Zero new infra. Watch Vercel Hobby response-size doubling (two symbol payloads). |
| Intraday candle fetch (1H minimum, 15M preferred) | Everything in Modul 3 except SMT-comparison-on-D1 lives on 4H/1H/15M: FVG detection, Asia Range slicing, Judas Swing timing. Current proxy serves D1 only — this is the single biggest new data dependency | MEDIUM | Yahoo `interval=60m`/`15m` on same proxy. 60m range limits (~2y) are fine; 15m (~60d) is enough for session logic. Cache 60s unchanged. Pure-function constraint means session slicing takes injected timestamps, never `Date.now`. |
| Swing-point detection (fractal/pivot, NQ + ES) | Common input to SMT comparison AND to ERL marking (dealing-range extremes) AND to Judas sweep measurement. One shared primitive, three consumers | LOW | Classic N-bar fractal (N=2 or 3) on closed candles only; reuse `closedOnly()` convention. Must handle thin-history degrade honestly (same `thinHistory` pattern as D1 range). |
| SMT divergence comparator (bullish / bearish / none) | The mandatory signal: positively-correlated NQ/ES making matching vs non-matching swing extremes. Report §3 has a dedicated "SMT Divergence Status" line | MEDIUM | Rule: at comparable swing points on the same timeframe, one asset takes its prior extreme while the other fails to = divergence. Bearish = NQ higher-high vs ES lower-high; bullish = mirror. Output must include the swing references (which high/low on each chart) so §3 prose is auditable, not a bare boolean. |
| FVG detection on 4H/1H (internal liquidity map) | IRL is defined as the FVGs inside the dealing range; without an FVG inventory there is no "Internal" side of the transition state machine | MEDIUM | 3-candle gap rule (low[3] > high[1] bullish, inverse bearish), track filled/unfilled/partial state across new candles. Unfilled FVGs inside D1 range = IRL targets. Keep it gap-only at first (see anti-features: no OB/breaker/inversion-fair-value soup in v2.0). |
| ERL/IRL transition state (External↔Internal) | Report §2 already promises a "Delivery Cycle: Internal-to-External / External-to-Internal" line and §3 needs the "Engineered Liquidity Path"; this is the state machine that produces it | MEDIUM | States: `ERL_TO_IRL` (external raid done, rotation back into range toward open FVG) and `IRL_TO_ERL` (internal filled, expansion toward opposite extreme). Transition trigger = sweep-then-reject of the relevant pool, confirmed by lower-timeframe structure shift — never the sweep alone (breakout-vs-raid ambiguity is the classic false signal). Depends on: D1 range (ERL extremes) + FVG map (IRL) + sweep detector. |
| Asia Range computation (Baku-aware session window) | AMD phase 1 of 3; London/NY Judas is measured *against* the Asian high/low. No Asia Range = no Judas, no AMD | MEDIUM | Window ~20:00–00:00 EST / 02:00–05:00 Baku-ish depending on DST; existing `date-fns-tz` + March/November DST-proven logic extends directly. Output: high, low, midpoint, width, session date. Narrow-range and wide-range days both valid — width feeds the "Salami Day" caution (mid-range hover into London = stand aside). |
| Judas Swing detector (London open; NY open) | The manipulation leg of AMD and a named §3 line ("London/NY Judas Swing [Baş verib / Gözlənilir]"). Session-open false move → reversal is the highest-value timing event Modul 3 owns | MEDIUM | Rule skeleton: within killzone window (London ~02:00–05:00 ET, NY open window), sweep of one Asia extreme by a threshold, failure to sustain (no displacement continuation), reversal back through the Asia extreme / session open. Must reference midnight-NY open price as anchor. London first, NY second (see MVP). |
| AMD phase classifier (Accumulation / Manipulation / Distribution) | §3 "Session AMD Timing" needs the phase, and the chart needs to know what to annotate; it is the synthesis of Asia Range + Judas state + expansion check | LOW | Deterministic function of the two detectors above + a displacement check for Distribution. Three states + `PENDING` (pre-Asia) and `INCONCLUSIVE` (decoupled/chop) — honest degrade, never forced classification. |
| Asia Range chart overlay | v2.0 target list explicitly names "chart-da Asia Range overlay"; the terminal's core value is *seeing* levels on live data | LOW | lightweight-charts box/line primitives for Asia high/low, Judas sweep marker, session-open line. Same dynamic-import pattern as existing zone overlays. HiDPI/resize debt (known v1.0 residual) applies — keep overlay code isolated so polish passes touch one module. |
| Report §3 live (rule-based, no LLM) | Milestone goal literally ends with "hesabat §3 canlı". Three prescribed lines: Engineered Liquidity Path, SMT Divergence Status, Session AMD Timing | LOW | Deterministic prose templates over the three detector outputs, same unavailable-marker convention for anything not yet computed. Project constraint (no LLM) holds — TIME>PRICE logic is codifiable and §2 already proves the pattern. |

### Differentiators (Competitive Advantage)

Not mandated by the spec, but each multiplies the table-stakes features' trustworthiness. Pick at most two for v2.0; defer the rest.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Correlation-regime gate for SMT (stand-down when decoupled) | Kills the #1 SMT false-signal source: taking divergence reads when NQ/ES are not currently tracking. "No read" beats a wrong read in an execution terminal | LOW | Rolling correlation (or co-movement hit-rate) over recent swings; below threshold → SMT status `DECOUPLED`, §3 says so plainly. Cheap, high trust value. Recommended as the v2.0 differentiator. |
| SMT + Judas confluence boost in confidence score | When divergence direction and Judas reversal direction agree at a D1 Premium/Discount extreme, that is the terminal's highest-conviction setup; scoring it explicitly is the "WHY NOW?" engine's core | LOW | Additive confidence term only; never a standalone trigger. Feeds §5 ticket later, §3 prose now. |
| Equal-highs/lows + inducement pool marking | Detects the *engineered* liquidity the spec asks about ("Hansı likvidlik retail-i tələyə salmaq üçün yaradılıb?") — trendline/equal-extreme pools that precede sweeps | MEDIUM | Needs swing inventory + tolerance clustering. Defer unless ERL/IRL lands early; it enhances the transition machine. |
| Multi-session AMD history (last 5–10 days with hit/miss) | Turns AMD from a today-only label into a calibrated tool: how often this week's Judas followed through. Directly supports the Salami-Day caution | MEDIUM | Intraday history depth + a small journal store (Zustand or static JSON first). v2.x material. |
| NY-afternoon reversal model (second Judas / reversal distinction) | NY open Judas ≠ NY afternoon reversal; conflating them mislabels half the session's manipulation events | MEDIUM | Requires holding the London-vs-NY template distinction in the classifier. Defer to a later slice — London + NY-open first. |
| Displacement/FVG-entry confirmation linkage (Modul 4 bridge) | Converts §3 reads into §4-readable triggers (MSS/displacement after Judas, FVG reaction quality) | HIGH | This is Modul 4's job bleeding forward; expose the detector outputs cleanly so Modul 4 consumes them, but do not build execution triggers in v2.0. |

### Anti-Features (Seem Good, Cause Harm)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| SMT as standalone trade trigger | "Divergence printed, take the trade" feels decisive | Consensus across ICT sources: SMT is a confirmation layer, not a trigger; decoupled regimes print false divergences constantly | SMT status feeds confidence + direction bias only; entries wait for structure (Modul 4) |
| Oscillator-style (RSI/MACD) divergence mixed into SMT | Traders know indicator divergence and assume it transfers | SMT is strictly inter-asset swing non-confirmation; mixing indicator logic corrupts the definition and the §3 prose | Keep SMT purely price-structure NQ-vs-ES; no indicator inputs anywhere in `src/lib/ict` |
| Alert on every swing mismatch | More signals feels like more value | Correlated assets desynchronize briefly all the time; alert fatigue destroys trust in the one signal that matters (divergence at a level that matters, in a killzone) | Gate alerts: divergence must coincide with D1 extreme / Asia extreme / killzone window, else log silently |
| Real-time tick-level SMT | "Faster must be better" | Swing comparison needs closed-candle structure; tick noise produces flickering states that violate the purity/testability constraint | Closed candles only (`closedOnly` convention); recompute on candle close |
| Predicting the Judas before the sweep completes | Calling manipulation early feels smart | Judas is defined by sweep-then-fail-then-reverse; labeling a trending push as "probably Judas" fights momentum and breaks the honesty contract | Detector emits `WATCH` (conditions ripe) vs `CONFIRMED` (sweep + rejection + reversal) as separate states |
| Labeling any intraday reversal a "Judas Swing" | Loose language is easy | Judas is a session-open phenomenon tied to a killzone window and the midnight-NY anchor; mid-day reversals are a different object | Enforce window + anchor preconditions in the detector; mid-day events get no AMD label |
| Full IRL taxonomy (OBs, breakers, mitigation, BPR) in v2.0 | "Complete internal map" sounds thorough | Each construct needs its own detection + fill-state rules; scope explosion on the milestone's critical path | FVG-only IRL for v2.0; broader taxonomy is a v2.x enhancement behind the same interface |
| LLM-written §3 narrative | Human-sounding prose feels premium | Violates the no-LLM determinism constraint; non-reproducible prose cannot be tested or trusted in an execution terminal | Rule-based templates over detector outputs (proven by §2) |
| Auto-trade / one-click execution from §3 | Obvious monetizable button | No execution protocol (Modul 4 invalidation, R:R≥1:3, urgency gates) exists yet; a trigger without invalidation is a liability | STAND ASIDE default; §5 ticket stays Modul 4's scope |

## Feature Dependencies

```
[Report §3 live]
    └──requires──> [SMT comparator]
    │                  └──requires──> [ES=F fetch]
    │                  └──requires──> [Swing detection (NQ+ES)]
    │                  └──enhanced-by──> [Correlation-regime gate]
    └──requires──> [ERL/IRL transition state]
    │                  └──requires──> [D1 dealing range (EXISTS v1.0)]
    │                  └──requires──> [FVG map 4H/1H]
    │                                       └──requires──> [Intraday candles]
    └──requires──> [AMD phase classifier]
                       └──requires──> [Asia Range]
                       │                  └──requires──> [Intraday candles]
                       │                  └──requires──> [Baku-aware session clock (EXISTS v1.0 pattern)]
                       └──requires──> [Judas detector (London, then NY)]
                                            └──requires──> [Asia Range]
                                            └──requires──> [D1 bias (EXISTS v1.0)]

[Asia Range chart overlay] ──enhances──> [AMD phase classifier]
[Intraday candles] ──conflicts──> [nothing — additive; D1 pipeline untouched]
[SMT comparator] ──conflicts──> [tick-level reads] (closed-candle only)
```

### Dependency Notes

- **§3 requires all three detector families:** SMT status, ERL/IRL state, AMD phase map 1:1 onto the three prescribed §3 lines. Any family missing → its line keeps the v1.0 unavailable marker; §3 ships partial-honest, never partial-faked.
- **Intraday candles are the critical-path dependency:** FVG map, Asia Range, and Judas all block on it. It must land first in the roadmap; everything else fans out in parallel after.
- **D1 core is consumed, not modified:** dealing range (ERL extremes), bias (Judas-against-bias premise), DOL/regime (context). Modul 3 reads v1.0 outputs as inputs — no rework of `range.ts`/`levels.ts`/`bias.ts` expected.
- **Purity constraint propagates:** every new detector must be a pure function of (candles, params, injected time) in `src/lib/ict` with unit tests, same as v1.0. Session logic is the main risk area — inject the clock.
- **London before NY:** the NY Judas reuses the Asia Range + detector skeleton with a different window/anchor; building London first de-risks NY to a parameter set plus NY-specific tests.

## MVP Definition (v2.0 Modul 3 Slice)

### Launch With (v2.0)

Minimum for an honest live §3:

- [ ] ES=F fetch + intraday (1H first, 15M if cheap) candles through the existing proxy — unblocks everything
- [ ] Swing detection + SMT comparator with swing references in output — §3 line 2 live
- [ ] FVG map + ERL/IRL transition state (FVG-only IRL) — §3 line 1 live, §2 Delivery Cycle line upgraded from D1-only heuristic
- [ ] Asia Range + London Judas detector + AMD classifier — §3 line 3 live (NY shown as Gözlənilir until its detector lands)
- [ ] Asia Range chart overlay + §3 rule-based prose — visible proof on terminal + report
- [ ] Correlation-regime gate — the one differentiator, because un-gated SMT is a false-signal machine

### Add After Validation (v2.x)

- [ ] NY-open Judas detector — trigger: London detector confirmed on live data
- [ ] Equal-highs/lows + inducement pools — trigger: ERL/IRL transitions scoring false-breakout pain
- [ ] Multi-session AMD history — trigger: users ask "how often does this work?" (calibration demand)
- [ ] NY-afternoon reversal distinction — trigger: NY-open detector confuses afternoon reversals

### Future Consideration (v3+, Modul 4 bridge)

- [ ] Displacement/MSS confirmation linkage — why defer: Modul 4's execution scope, needs its own research
- [ ] Full IRL taxonomy (OB/breaker/BPR) — why defer: scope explosion, FVG-only suffices for transitions
- [ ] Confidence-score engine feeding §5 ticket — why defer: ticket shape belongs to Modul 4

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| ES=F fetch via existing proxy | HIGH (SMT impossible without it) | LOW | P1 |
| Intraday candles (1H/15M) | HIGH (blocks FVG/Asia/Judas) | MEDIUM | P1 |
| Swing detection (shared primitive) | HIGH (three consumers) | LOW | P1 |
| SMT comparator | HIGH (mandatory per spec) | MEDIUM | P1 |
| FVG map + ERL/IRL state | HIGH (§3 line 1 + §2 upgrade) | MEDIUM | P1 |
| Asia Range (Baku-aware) | HIGH (Judas denominator) | MEDIUM | P1 |
| London Judas + AMD classifier | HIGH (§3 line 3 core) | MEDIUM | P1 |
| §3 live prose + Asia overlay | HIGH (milestone definition of done) | LOW | P1 |
| Correlation-regime gate | HIGH (false-signal killer) | LOW | P1 |
| NY-open Judas | MEDIUM (second session) | MEDIUM | P2 |
| Inducement pools | MEDIUM | MEDIUM | P2 |
| AMD history | MEDIUM | MEDIUM | P3 |
| Modul 4 linkage / full IRL / auto-execution | LOW now (wrong milestone) | HIGH | P3 / never (auto-execution) |

## Competitor Feature Analysis

| Feature | Typical ICT indicator (TradingView LuxAlgo-style) | Retail screener / alert bot | Our Approach |
|---------|---------------------------------------------------|-----------------------------|--------------|
| SMT divergence | Overlay lines on paired charts, alerts on any mismatch | N/A (single-asset focus) | Gated comparator: correlation-regime check + killzone/level context + swing references; confirmation-only, never a trigger |
| IRL/ERL | Static box drawing, manual range placement | N/A | State machine over live D1 range + FVG inventory: ERL→IRL / IRL→ERL with sweep-then-reject discipline |
| AMD / Judas | Session boxes, killzone shading | Session-open alert on any push | Asia Range + window-and-anchor-enforced Judas (WATCH vs CONFIRMED) + AMD phase; mid-day moves never labeled Judas |
| Report integration | None (chart-only) | None | §3 prose generated deterministically from the same detector outputs the chart annotates — one source of truth |

## Sources

- ICT SMT divergence definition (NQ/ES 2022 origin, bullish/bearish swing-mismatch rules, confirmation-not-trigger consensus): [innercircletrader.net SMT guide](https://innercircletrader.net/tutorials/ict-smt-divergence-smart-money-technique/), [LuxAlgo SMT concept](https://www.luxalgo.com/library/concept/smart-money-technique-divergence/), [MetroTrade SMT futures](https://www.metrotrade.com/smt-trading-futures/), [TradingView NQ-vs-ES SMT indicator](https://www.tradingview.com/script/QDq5dTaK-SMT-Divergence-NQ-vs-ES/)
- IRL/ERL dealing-range framework (FVG-as-IRL rationale, ERL→IRL→ERL rotation, sweep-vs-breakout discipline): [innercircletrader.net IRL/ERL guide](https://innercircletrader.net/tutorials/ict-internal-external-liquidity/), [LuxAlgo IRL vs ERL](https://www.luxalgo.com/library/concept/internal-vs-external-range-liquidity/)
- AMD / Judas Swing mechanics (Asia 20:00–00:00 ET range, London killzone 02:00–05:00 ET, midnight-NY anchor, NY-open applicability, Salami-Day caution): [FXNX Asian Range + Judas trap](https://fxnx.com/en/blog/ict-asian-range-liquidity-trading-london-judas-swing-trap), [innercircletrader.net Judas guide](https://innercircletrader.net/tutorials/ict-judas-swing-complete-guide/), [LuxAlgo Judas Swing](https://www.luxalgo.com/library/concept/judas-swing/), [ICT Gold session map (AMD timings)](https://completetradersedge.com/ict-trading-gold-xauusd-kill-zones/), [London Judas setup rules](https://tradingstrategyguides.com/the-complete-guide-to-ict-london-judas-swings-in-gbp-usd/)
- Project-specific constraints and existing surface: `reference/institutional_rules.md` (Modul 3 + §3 spec), `.planning/PROJECT.md` (v1.0 built scope, v2.0 targets, purity/Baku/no-LLM constraints), `src/lib/ict/types.ts` (existing pure-function surface)

---
*Feature research for: Liquidity Engine v2.0 Modul 3*
*Researched: 2026-09-06*
