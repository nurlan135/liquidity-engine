# Feature Research: BSL/SSL Pain Threshold Map (§1)

**Domain:** ICT buy-side/sell-side liquidity (stop-cluster projection) map + §1 live report block for an NQ execution terminal
**Researched:** 2026-09-15
**Confidence:** HIGH (structure anchored in project domain authority `reference/institutional_rules.md` Modul 1.2 + §1/§2/§5 lines; mechanics verified against `src/lib/ict` sources — smt/judas/fvg/asia/dol/levels/bias/trigger/invalidation/report)

## Feature Landscape

### Table Stakes (Users Expect These)

A Pain Threshold section that cannot name *which* stop pool, *where* on the chart, *whether it is already swept*, and *how close price is* is not a §1 — it is the old UNAVAILABLE card with new paint. Missing any row below = v3.1 goal unmet.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| D1 swing-point pool detection (fractal highs/lows → BSL/SSL levels) | ICT definition of liquidity: stops rest beyond swing highs (BSL) and swing lows (SSL). No swings = no map. Spec §1 line demands "[Qrafikdəki spesifik BSL/SSL] zonası" — a named price, not prose. | LOW | **Reuse, do not rebuild.** Import `isSwingHigh` / `isSwingLow` + `SWING_K = 2` from `smt.ts` (strict fractal, equality = no swing, already pinned by `smt.test.ts`). Run over D1 closed rows (`closedOnly`, trailing `SWING_LOOKBACK = 60` precedent) inside the dealing-range anchor context (`ANCHOR_WINDOW = 20`). Opinionated: extract the two predicates into a shared `swings.ts` in the same phase so `smt.ts` and the new `liquidity.ts` share one owner — importing swing logic *from* SMT couples a cross-market module to a single-market map. Pure function `detectPools(candles)` → `LiquidityPool[]`. |
| Equal-high / equal-low weighting (obvious-stop boost) | Equal highs/lows are where retail puts stops at the same tick — the densest, most engineered pools. An ICT map that weights a lone wick equal to triple equal-highs misreads the methodology. | LOW | New `EQUAL_TOL_BPS` constant (25 bps default, mirrors `SMT_TOL_BPS = 25` idiom). Cluster same-side swings whose relative gap ≤ tolerance into one pool; pool `weight = swingCount` with an equality bonus (`weight += EQUAL_BONUS`, e.g. +1 per equal touch). Boundary-equality semantics copied from `fvg.ts` (touch ≠ gap) and `judas.ts` `TOL_EPS` float discipline. Test-pin: two highs 3 bps apart cluster, two highs 200 bps apart do not. |
| Pool projection as zones, not single lines | Stops cluster over a *band* (several swing extremes + equal touches), and the §1 sentence says "zona". Single-line pools flicker on every new wick and cannot render honestly on the chart. | MEDIUM | `LiquidityPool = { side: 'BSL' \| 'SSL', top, bottom, touches: number, equalCount: number, weight: number, originDate, status }`. Zone = [min extreme, max extreme] of the cluster. Cap inventory (trailing-N bound, `FVG_MAP_BOUND = 20` precedent — recommend `POOL_MAP_BOUND = 20`). Sort by originDate, slice trailing, same WR-07 discipline as `applyMitigation`. |
| Sweep-status tracking per pool (ACTIVE / SWEPT / CONSUMED) | A map that still glows a pool price already raided is worse than no map — it invites chasing consumed liquidity. Spec Modul 3/4 language (süpürmə vs tələ) and the existing `JudasOutput` candidate/confirmed split plus `FvgGap` close-through mitigation already teach the three states. | MEDIUM | **Share sweep semantics, do not invent new ones.** `ACTIVE` (unswept) → `SWEPT` (wick pierced the zone edge, same strict `>` / `<` pierce rule as `judasSwing` gate 2) → `CONSUMED` (close-through beyond the zone + displacement, same close-through rule as `applyMitigation` / `detectTransition` sweep-then-reject). Swept-but-rejected pools (wick pierce, close back inside) stay SWEPT with reduced weight — they remain magnetic for a retest. Single chronological evaluation over closed candles only; first pierce wins, deterministic. Consumed pools dim (thin-tier 0.5 dimming precedent) and drop out of TP2 candidacy. |
| Proximity + DOL-side scoring (which pool hurts first) | Five ACTIVE pools are noise without ranking. Proximity (distance from last close) × weight × DOL-side alignment is the standard ICT ranking: the nearest unswept pool on the DOL side is the pain threshold. | LOW | Pure `scorePools(pools, lastClose, atr, dol)` → ranked list. `distAtr = \|poolMid − lastClose\| / atr` (`computeATR` from `regime.ts` already exists). `score = weight × dolBoost / (1 + distAtr)`, `dolBoost = 2.0` when pool side matches `DOLTarget` direction (BSL when DOL = range high, SSL when DOL = range low), else `1.0`. Pools behind price (BSL below lastClose, SSL above) get `behindPenalty = 0.25`. All multipliers exported + test-pinned (`CALIBRATION-PROVISIONAL` convention from `trigger.ts`). No new data leg. |
| §1 live report block with verbatim reasons | The milestone goal is literally "§1 canlanır — verbatim səbəblərlə". Spec §1 fixes the sentence shape: retail side → stop zone → Smart Money intent (süpürmə / tələyə salma). | LOW | Pure `describePainThreshold(ranked, bias, dol)` → deterministic Azerbaijani sentence(s), one base sentence + at most one tag (house pattern: `amdPhase` reasons, `REASON_BY_KEY` in `trigger.ts`, `describeDeliveryTransition`). Null-pools and all-consumed states each get an honest sentence ("Aktiv BSL/SSL hovuzu yoxdur — …"), never an empty block. Flip `REPORT_SECTIONS[0]` to `live` only when this renderer ships with its tests. |
| Chart overlay for pools (zones + swept state + nearest-pool highlight) | A map with no chart projection is a table, not a map. Users expect to *see* BSL above and SSL below with swept pools visibly dead. | MEDIUM | Props-only extension of `nq-chart.tsx` via existing `createPriceLine` / marker handles (v3.0 trigger-pin precedent): one price line per ACTIVE pool edge (zone band), dimmed lines for SWEPT, hidden for CONSUMED; nearest-pool (rank #1) gets the accent tag. No new chart library, no canvas fork. Bar-date mapping at the caller (same rule as trigger pins). |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Stop-density score with equal-touch bonus | Generic TradingView liquidity scripts plot every swing high/low as equal lines. A density score (touch count + equality bonus + recency) surfaces *the* pain threshold instead of twenty lines. Rare in retail ICT packs, cheap here because swing + tolerance machinery already exists. | LOW | `weight = touches + EQUAL_BONUS × equalCount`, recency tiebreak by `originDate`. Render weight as line width/opacity tier (2–3 tiers max, not a continuous heatmap — see anti-features). Feeds the §1 "böyük ehtimalla [zona]" wording honestly: the top-ranked pool is the named zone. |
| Multi-source pool seeding (D1 swings + Asia extremes + PDH/PDL equivalents) | D1-only pools miss the intraday obvious stops (Asia high/low are the most-swept levels on the terminal — Judas proves it). Seeding pools from Asia extremes + dealing-range high/low + D1 swings gives full-spectrum coverage with zero new detectors. | MEDIUM | Seed list: D1 swing clusters (primary) + `AsiaRange.high/low` as pre-weighted pools (weight 2, tagged `source: 'asia'`) + `DealingRange.high/low` as HTF magnets (tagged `source: 'range'`). Dedupe seeds falling inside an existing zone (merge, do not double-count). Depends on `asia.ts` + `range.ts` outputs already in the store. 15M intraday swing pools are P2 (see MVP). |
| TP2 resolver wired to the live pool map | Spec §5 already promises `TP2 (Main Objective): [External BSL/SSL]` — v3.0 shipped TP2 from Asia extremes as a stand-in. Wiring TP2 to the ranked ACTIVE pool on the trade side closes a promise the ticket already makes. | MEDIUM | `resolveTP2(direction, rankedPools)` → nearest ACTIVE pool mid on the trade side (LONG → BSL above, SHORT → SSL below), null + honest fallback when none exists (keep current Asia-extreme fallback, never stretch a zone to pass R/R). Must run *after* pool ranking, *before* the R/R gate — same derivation order as invalidation → targets → R/R. Small, high-trust change; needs ticket + parity test updates. |
| Sentiment-side pain multiplier (fixture-honest) | Spec Modul 1.2 ties pain to retail positioning (60%+ one side → stops on the other side). Even fixture-fed, a named multiplier keeps the §1 sentence structurally complete and makes the real-feed swap a one-line change later. | LOW | `painSide = retailMajoritySide === 'BUY' ? 'SSL' : 'BSL'` (stops of the crowd); pools on the pain side get `sentimentBoost = 1.5`, else `1.0`. While sentiment is fixtures: default multiplier `1.0` neutral + provenance tag "Ssenari sentiment" (existing fixture-honesty pattern). Never let fixtures flip rankings silently — boost applies only when fixture flag `genuine: true`. |
| Pool age + re-accumulation (pools rebuild after the sweep) | Swept pools refill — new swings form beyond the old raid and the zone becomes dangerous again. Static maps go stale within days; age/decay + re-seeding keeps §1 alive across the 2–4 week observation window. | MEDIUM | `ageBars = asOfDate − originDate` in D1 bars; `decay = 1 / (1 + ageBars / DECAY_HALF_LIFE)` (exported, e.g. half-life 10 bars, provisional). Re-accumulation falls out naturally: new swings detected past a CONSUMED zone seed a fresh ACTIVE pool (dedupe by non-overlap). P2 — ship static-status map first, add decay once firing-log data shows staleness. |
| Pain-map confidence tag on the WHY NOW ticket (read-only) | WHY NOW already prints an SMT agree-tag; a "BSL yaxındır / uzaqdır" proximity tag on §§4–5 gives the trader urgency context without touching gate logic. High perceived value, near-zero risk because it never votes. | LOW | Read-only suffix in trigger/ticket prose (same `smtSuffix` pattern): append `" BSL yaxındır."` when rank-1 pool is on the trade side within `NEAR_ATR_MULT` (e.g. 1.0 ATR). Never a gate, never blocks FIRE — parity tests pin the tag separately from verdicts. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Exact stop-price prediction ("stops at 24,318.50") | Feels precise and premium. | False precision — stops are a distribution over a zone, and Yahoo D1 granularity cannot resolve tick-level clusters. A wrong exact number destroys trust in every other derived number (ticket entry/SL/TPs). | Zones with top/bottom + touch count; §1 names the zone bounds, never a single tick. |
| Auto-FIRE / alert when price touches a pool | "Ping me at liquidity" feels pro. | Violates the trigger contract: pool touch without killzone timing + purge + displacement is inducement-chasing (spec rule #1 TIME>PRICE, v3.0 spam pitfall). Touch ≠ sweep, sweep ≠ entry. | Pool touch renders proximity emphasis on the chart only; FIRE still requires the three-gate `evaluateTrigger` path untouched. |
| 5M/1M microstructure pools | Spec §§4–6 are written for 5M/1M; finer pools sound more accurate. | Terminal ingests D1 + 1H/15M only (Yahoo allowlist + zero-budget polling). A 5M leg doubles poll surface for unproven value — the exact P3 call v3.0 deferred. | D1 pools first (P1), 15M intraday pools P2, 5M only if 15M proves too coarse after calibration. |
| Real retail-sentiment API integration | Modul 1.2 reads like it needs live positioning. | Zero budget, no API keys (PROJECT.md out-of-scope: fixtures only). A half-wired "live" badge on scraped data is dishonest and breaks determinism. | Keep fixture shape + `genuine` flag + neutral-multiplier default; define the input contract (`RetailExposure { buyPct, sellPct, genuine }`) so the feed swap is mechanical later. |
| Continuous heatmap / volume-profile rendering | Looks institutional and impressive. | Canvas heat gradients fork the `nq-chart.tsx` overlay discipline (price-line/marker handles only), cost HiDPI/resize regressions (v2.1 polish was hard-won), and imply density data we do not have. | 2–3 tier line opacity/width by weight + dimming for SWEPT (existing 0.5-dimming idiom). Discrete, testable, resize-safe. |
| LLM-generated pain narrative | "AI explains where stops are" sounds premium. | Breaks determinism (PROJECT.md: rule-based only); non-reproducible §1 cannot be backtested, replayed, or parity-checked against the ticket. | Deterministic sentence selection (one base + suffix tags), verbatim + unit-pinned like every other report block. |
| Letting the pain map gate or veto WHY NOW FIRE | "Don't fire into the wrong pool" sounds safe. | Couples a new uncalibrated module into the calibrated trigger path → flicker, permanent-ARMED, and invalidation-race regressions (v3.0 pitfalls 2/3/6). Direction of dependence must be trigger → pools, never pools → trigger. | Pools are read-only context for §1 prose + TP2 + proximity tag. Any future gating needs its own calibration band + population test — explicitly P3, not v3.1. |

## Feature Dependencies

```
§1 Pain Threshold block (live)
    ├──requires──> Pool detector (D1 swings → clusters → zones)
    │                  ├──requires──> isSwingHigh/isSwingLow + SWING_K (SHARED with smt.ts → extract to swings.ts)
    │                  ├──requires──> EQUAL_TOL_BPS clusterer (new const, SMT_TOL_BPS idiom)
    │                  └──requires──> closedOnly D1 rows + SWING_LOOKBACK window (existing types.ts)
    ├──requires──> Sweep-status tracker (ACTIVE/SWEPT/CONSUMED)
    │                  ├──requires──> Judas pierce idiom (strict >/< Asia-extreme rule, first-sweep-wins)
    │                  └──requires──> FVG mitigation idiom (close-through fill, sweep-then-reject)
    ├──requires──> Proximity/DOL scorer
    │                  ├──requires──> computeATR (existing regime.ts) + lastClose
    │                  ├──requires──> DOLTarget + bias (existing dol.ts / bias.ts)
    │                  └──requires──> AsiaRange + DealingRange seeds (existing asia.ts / range.ts)
    ├──requires──> §1 prose renderer (describePainThreshold, verbatim AZ sentences)
    └──requires──> Pool chart overlay (price-line/marker handles in nq-chart.tsx)

TP2-from-pools resolver ──enhances──> paper ticket (reads ranked pools, null-safe fallback to Asia extreme)
Proximity tag ──enhances──> WHY NOW / ticket prose (read-only suffix, never a gate)
Sentiment multiplier ──enhances──> scorer (neutral 1.0 default while fixtures feed)

Pain map ──conflicts──> trigger gating (pools must NEVER vote in evaluateTrigger; one-way read-only dependence)
5M pools ──conflicts──> zero-budget poll surface (deferred P3)
```

### Dependency Notes

- **Pool detector shares swing code with SMT:** `isSwingHigh` / `isSwingLow` + `SWING_K` are proven (strict fractal, boundary-pinned). Extract to `src/lib/ict/swings.ts` with zero behavior change first, then both `smt.ts` and `liquidity.ts` import from it — the same mechanical-cleanup-first pattern as v3.0 Phase 1. Never copy-paste the predicates.
- **Sweep tracker shares Judas + FVG idioms:** wick-pierce = sweep (judas gate 2 strict inequality), close-through = consumed (FVG `applyMitigation`), pierce-plus-close-back = sweep-then-reject (`detectTransition`). One shared vocabulary across three modules; review must check the new tracker consumes the idioms, not re-derives them.
- **Scorer reads DOL/bias/ATR, never writes:** `computePrimaryDOL` direction decides the boosted side; `computeBias` position decides premium/discount context for the §1 sentence; `computeATR` supplies the distance denominator. All are selector-level reads — no signature changes to existing modules.
- **Ticket/trigger consume pools one-way:** TP2 resolver + proximity tag read `rankedPools`; neither `evaluateTrigger` gates nor `checkFatalFlaw` inputs change shape. This ordering is what keeps v3.0's 420 tests green while §1 goes live.
- **Asia + range seeds are free coverage:** `AsiaRange` extremes and `DealingRange` high/low already flow through the store — seeding pools from them is a mapping function, not a detector. NY-session unavailability honesty (`REASON_NY_UNAVAILABLE` precedent) applies: pools seeded from unavailable sessions tag provenance instead of guessing.
- **Sentiment input is a contract, not a feed:** define `RetailExposure` fixture shape now (buyPct/sellPct/genuine flag, 60%-majority rule from Modul 1.2); multiplier defaults neutral until a real source exists. Zero-budget constraint holds.

## MVP Definition

### Launch With (v3.1)

Minimum viable Pain Threshold — map, rank, sweep-state, §1 live, overlay. All paper, all deterministic, all pure.

- [ ] Shared swing extraction (`swings.ts`, zero behavior change, `smt.test.ts` green as gate) — why essential: every pool depends on it, and forked swing logic is the #1 future-bug source
- [ ] `liquidity.ts` pool detector (D1 swing clusters + `EQUAL_TOL_BPS` + zone projection + `POOL_MAP_BOUND`) — why essential: the map itself
- [ ] Sweep-status tracker (ACTIVE/SWEPT/CONSUMED over closed candles, Judas/FVG idioms) — why essential: without it the map advertises dead pools
- [ ] Proximity/DOL scorer (ATR distance + DOL boost + behind-penalty, exported provisional constants) — why essential: ranking is what makes §1 name *the* zone
- [ ] `describePainThreshold` + `REPORT_SECTIONS[0]` flipped live — why essential: the visible milestone promise (§1 canlanır)
- [ ] Pool chart overlay (ACTIVE bands + SWEPT dim + rank-1 highlight via existing handles) — why essential: a map must project onto price
- [ ] Asia + range seed pools (weight-tagged, deduped) — why essential: intraday obvious stops the D1 scan misses, zero new detectors

### Add After Validation (v3.1.x)

- [ ] TP2-from-pools resolver wired into the ticket — trigger: ranked pools stable on live replay + parity tests updated (ticket currently falls back to Asia extremes honestly)
- [ ] Sentiment multiplier activated on the `RetailExposure` contract — trigger: fixture `genuine` path proven; still neutral-default until a real feed decision
- [ ] 15M intraday swing pools merged into the inventory — trigger: D1 pools prove ranking-stable; 15M uses the same `swings.ts` predicates on `IntradayCandle` highs/lows
- [ ] Pool age/decay + re-accumulation pools — trigger: firing-log / observation notes show staleness (old CONSUMED zones cluttering or fresh raids unranked)
- [ ] Proximity tag on WHY NOW/ticket prose ("BSL yaxındır") — trigger: scorer constants survive first calibration review

### Future Consideration (v4+)

- [ ] 5M microstructure pools — why defer: needs a new Yahoo poll leg (free-tier risk); only if 15M proves too coarse after calibration
- [ ] Real retail-sentiment feed replacing fixtures — why defer: budget + determinism posture; contract-first keeps the swap mechanical
- [ ] Pool-gated trigger logic (if ever) — why defer: requires its own calibration band + population test + flicker analysis; explicitly not v3.1
- [ ] Cross-symbol pools (ES confirmation leg pools) — why defer: ES is the SMT confirmation leg, not the traded instrument (v3.0 multi-symbol anti-feature transfers)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| D1 swing-pool detector (shared swings.ts) | HIGH | LOW | P1 |
| Equal-high/low weighting + zone projection | HIGH | LOW | P1 |
| Sweep-status tracker (ACTIVE/SWEPT/CONSUMED) | HIGH | MEDIUM | P1 |
| Proximity/DOL scorer | HIGH | LOW | P1 |
| §1 prose renderer + section flip live | HIGH | LOW | P1 |
| Pool chart overlay (existing handles) | HIGH | MEDIUM | P1 |
| Asia + range seed pools | HIGH | LOW | P1 |
| TP2-from-pools resolver | MEDIUM | MEDIUM | P2 |
| Sentiment multiplier (fixture-honest) | MEDIUM | LOW | P2 |
| 15M intraday pools | MEDIUM | MEDIUM | P2 |
| Age/decay + re-accumulation | MEDIUM | MEDIUM | P2 |
| Proximity tag on trigger/ticket prose | LOW | LOW | P2 |
| 5M pools | LOW (until proven needed) | MEDIUM | P3 |
| Real sentiment feed | LOW (paper terminal) | HIGH | P3 — anti-feature for v3.1 |
| Pool-gated trigger | LOW (risk > value now) | HIGH | P3 — explicitly rejected for v3.1 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Generic ICT liquidity scripts (TradingView BSL/SSL, LuxAlgo-style packs) | Retail signal-bot channels | Our Approach |
|---------|--------------------------------------------------------------------------|----------------------------|--------------|
| Swing-pool detection | Plots every fractal high/low as equal lines; no clustering, no zones | No map — "liquidity above" hand-waving | Shared proven fractal predicates + tolerance clustering into weighted zones, capped inventory |
| Equal-high/low emphasis | Sometimes marked, never scored | Ignored | First-class weight bonus with exported tolerance constant, test-pinned |
| Sweep-status | Rarely tracked; raided lines stay plotted | Never published; losers deleted | ACTIVE/SWEPT/CONSUMED lifecycle reusing Judas pierce + FVG close-through idioms; consumed pools dim out |
| Proximity ranking | Trader eyeballs distance | None | ATR-normalized score × DOL-side boost × behind-penalty; rank-1 pool is the named §1 zone |
| §1 pain narrative | None — indicators plot, trader narrates | Opaque "stops above" call | Deterministic §1 sentence (retail side → zone → Smart Money intent) rendered verbatim, honest-empty states |
| Ticket integration | None — trader places TPs by hand | Entry/SL/TP text with no provenance | TP2 resolves from the live ranked pool with honest fallback; proximity tag is read-only context |

## Sources

- `reference/institutional_rules.md` — Modul 1.2 (retail 60%+ majority → Pain Threshold stop zones → Smart Money süpürmə/tələ engineering) + §1 report line (Həqiqi Ortalama / Pain Threshold / Alqoritmik Hədəf) + §2 DOL (BSL/SSL as HTF magnets) + §5 TP2 (External BSL/SSL) — HIGH, project domain authority
- `src/lib/ict/smt.ts` — `isSwingHigh`/`isSwingLow` strict fractal + `SWING_K`/`SMT_TOL_BPS`/`SWING_LOOKBACK` + time-anchored `matchSwings` (swing reuse source) — HIGH, verified source
- `src/lib/ict/judas.ts` — strict wick-pierce sweep + killzone discipline + `DISP_MULT`/`CONFIRM_WINDOW`/`TOL_EPS` + candidate/confirmed/preRun lifecycle (sweep-status idiom source) — HIGH, verified source
- `src/lib/ict/fvg.ts` — `FvgGap` inventory + close-through `applyMitigation` + sweep-then-reject `detectTransition` + `FVG_MAP_BOUND` cap (pool lifecycle + inventory-cap precedent) — HIGH, verified source
- `src/lib/ict/asia.ts` + `range.ts` + `levels.ts` + `bias.ts` + `dol.ts` + `regime.ts` — Asia extremes, dealing-range anchor, OTE pockets, bias buffer, DOL targets, ATR (seed + scoring inputs) — HIGH, verified sources
- `src/lib/ict/trigger.ts` + `invalidation.ts` — three-gate fusion, read-only SMT tag pattern, HARD/SOFT flaw split, `CALIBRATION-PROVISIONAL` convention, BSL/SSL falsification sentences (consumer + convention precedent) — HIGH, verified source
- `src/lib/report.ts` — `REPORT_SECTIONS[0]` unavailable, the exact surface v3.1 flips live — HIGH, verified source
- ICT education literature (equal-high/low stop raids, BSL/SSL draw, sweep-then-displacement) — MEDIUM, semantics only, never threshold authority; all ranking constants ship provisional pending live observation

---
*Feature research for: BSL/SSL Pain Threshold map (§1)*
*Researched: 2026-09-15*
