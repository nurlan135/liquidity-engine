# Feature Research: Pools P2 Execution Links (TP2, Proximity, Age/Decay, Sentiment, 15M, Buffered Wiring)

**Domain:** ICT buy-side/sell-side liquidity pool execution links (TP2-from-pool resolver, read-only proximity annotation, pool age/decay + re-accumulation, sentiment multiplier, multi-timeframe D1+15M pool inventory, buffered ticket live wiring) for an NQ execution terminal
**Researched:** 2026-10-26
**Confidence:** HIGH on codebase mechanics (verified against `src/lib/ict/pools.ts`, `src/lib/ticket.ts`, `src/lib/store.ts`, `src/lib/ict/trigger.ts`, `src/lib/ict/pools-parity.test.ts`); MEDIUM on external tooling norms (web search returned no usable sources — expectations below are anchored in ICT methodology per `reference/institutional_rules.md` Modul 1.2 + §§1/2/5 and standard ICT-tooling behavior, all ranking constants ship `CALIBRATION-PROVISIONAL` by house convention)

## Feature Landscape

### Table Stakes (Users Expect These)

A Pools P2 that ships none of the rows below leaves the §5 ticket promise ("TP2: External BSL/SSL") resolved by a stand-in, prose with no urgency context, a map that never ages, and harness-proven buffers that never reach live. Missing any row = milestone goal unmet.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| TP2 = nearest ACTIVE pool on trade side (POOL2-01) | Spec §5 already promises `TP2 (Main Objective): [External BSL/SSL]` — v3.0 shipped TP2 from Asia extremes as an honest stand-in. A paper ticket whose main objective ignores the live ranked pool map is an unkept promise the terminal itself makes. Standard ICT-tooling behavior: final target = opposing liquidity pool, stops rest beyond swing extremes so targets book *before* them. | MEDIUM | New pure `resolveTP2(direction, rankedPools, entry)` → mid of nearest ACTIVE pool on the trade side (LONG → BSL strictly above entry, SHORT → SSL strictly below). Runs inside `resolveTP` between structure-level resolution and the R/R gate: TP2 leg resolves from pool, TP1/TP3 keep current structure-first sources. Null + honest fallback (current Asia-extreme leg) when no ACTIVE pool exists on the trade side — never stretch a zone or pick a farther pool to pass R/R. Ticket + parity test updates required (R/R gate stays TP1-only). |
| Buffered ticket live wiring (W12) | Phase 21 proved buffered SL/TP in harness + unit matrix but left live `selectTicket` unbuffered (`W12 WARNING`). Magnet-to-the-line stops/targets are the known-bad behavior the buffer exists to kill: SL 0.25×ATR beyond the extreme, TP 0.10×ATR before it. Users expect the live ticket to price what the harness proved. | LOW | `selectTicket` builds `TicketBufferInput { atr, poolExtreme }` from the ranked pools (nearest ACTIVE extreme on the correct side of entry — SL-side extreme for the stop, TP-side extreme for targets; wrong-side extreme degrades that leg to unbuffered per the existing `resolveSL`/`resolveTP` guards) and passes it into `computeTicket`. Null degrades to unbuffered structure levels — never a throw. `computeTicket` signature already accepts `buffer`; no ict/ change, no gate-order change. |
| Read-only proximity tag on WHY NOW/ticket prose (POOL2-05) | WHY NOW already prints an SMT agree-tag; traders expect the same urgency context for liquidity ("is the pool near or far?"). Standard annotation behavior in ICT tooling: distance-to-draw readouts that inform urgency but never trigger entries. | LOW | Append-only suffix composed display-only from ranked-pool fields (same `smtSuffix` pattern in `trigger.ts`: unsuppressed/agreeing SMT yields text, else empty string, never blocks FIRE). E.g. rank-1 pool on the trade side within `NEAR_ATR_MULT` (1.0 ATR provisional) → `" BSL yaxındır."`; far/off-side → alternate or empty string. Parity tests pin the tag separately from the (trigger, flaw, ticket) triple — pools never vote. `describePool` in `src/lib/report.ts` is the precedent for display-only pool prose. |
| Sentiment multiplier on RetailExposure contract, neutral default (POOL2-02) | Spec Modul 1.2 ties pain to retail positioning (60%+ one side → stops cluster on the other side). The §1 sentence is structurally incomplete without the positioning side, and every ICT pain-map tool weights the crowd side. Fixture-fed today, so the multiplier must default neutral. | LOW | Define `RetailExposure { buyPct, sellPct, genuine }` input contract (60%-majority rule from Modul 1.2; `trueAvg` in `src/lib/sentiment.ts` already computes crowd side + `CROWDED_THRESHOLD = 60`). `painSide = majority BUY ? SSL : BSL`; pools on the pain side get `sentimentBoost = 1.5`, else `1.0` — wired into `scoreAndRank` as one more multiplier beside `dolBoost`/`behindPenalty`, exported + test-pinned. While sentiment is fixtures: `genuine: false` forces `1.0` neutral + "Ssenari sentiment" provenance; boost applies only when `genuine: true`. Never flips rankings silently under fixtures. |
| Pool age/decay + re-accumulation (POOL2-04) | Swept pools refill — new swings form beyond the old raid and the zone becomes dangerous again. Static maps go stale within days; standard tooling behavior is time- or touch-decay on old levels plus re-seeding of fresh extremes. Without this §1 slowly names archaeology. | MEDIUM | `ageBars = asOfDate − originDate` in D1 bars; `decay = 1 / (1 + ageBars / DECAY_HALF_LIFE)` (half-life ~10 bars, provisional) applied as a **score multiplier only** — lifecycle never edits weight per pools.ts D-04, decay rides the scorer beside `behindPenalty`. Re-accumulation falls out of `detectPools` naturally: new swings past a CONSUMED zone seed a fresh ACTIVE pool (non-overlap dedupe). Ship behind the scorer with exported constants; calibrate half-life against the firing log (Phase 21 review discipline). |
| 15M intraday swing pools merged into inventory (POOL2-03) | D1-only pools miss the intraday obvious stops (Asia high/low, session extremes are the most-swept levels on this terminal — Judas proves it on the 15M leg). Standard multi-timeframe liquidity tools maintain HTF + intraday inventories side by side. Explicitly sequenced after D1 ranking proves stable. | MEDIUM | Run the **shared** `isSwingHigh`/`isSwingLow` + `SWING_K` predicates from `src/lib/ict/swings.ts` over `closedOnlyIntraday(nq15m.candles)` highs/lows (never D1 `Candle` rows — pools.ts D-10 contract; the two candle shapes stay un-unified per types.ts D-16). Tag `source: '15m'`, merge/dedupe with the D1 inventory by non-overlap, rank jointly. Depends on the already-polled `nq15m` leg in `store.ts`; stale-15M refuses per the existing selector guard idiom. Smaller lookback than `SWING_LOOKBACK = 60` — intraday window constant provisional. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| DOL-side-aware TP2 selection (not naive nearest) | Generic liquidity scripts target the nearest line in either direction. Selecting the nearest ACTIVE pool **on the trade side** (DOL-aligned) keeps TP2 consistent with the bias/DOL read the rest of the terminal already makes — the edge is coherence, not cleverness. | LOW (inside POOL2-01) | Trade side derives from ticket direction (FIRE verdict), DOL side from existing `DOLTarget`; when they disagree the trade side wins for TP2 (the ticket prices the trade taken, not the map's favorite pool) with the disagreement visible in §1 prose. |
| Pools-never-vote parity discipline as a trust story | No retail ICT pack proves its context layer cannot move entries. The 20-session parity harness (trigger/flaw/ticket triple identical pools-on vs pools-off) already exists — every P2 feature extends it rather than reasoning about coupling from scratch. | LOW | Each P2 plan adds its feature to both parity arms (buffer build shared, tag compared separately, scorer multipliers in both arms) and the triple still matches exactly. `pools-parity.test.ts` + `parity.test.ts` stay byte-identical anchors; new files extend, never edit. |
| Calibration sandbox extended to pool knobs | Phase 21 shipped a 7-slider sandbox (WHY NOW thresholds + pool tolerances) with preview-vs-applied discipline. Adding decay half-life / `NEAR_ATR_MULT` / sentiment boost as preview knobs gives the operator the same safe what-if surface for P2 constants. | LOW | Same Apply-record / Yenilə-reset path; derivation keeps reading pinned module constants until Apply commits. No new UI primitive — one slider row per knob inside the existing sandbox panel. |
| Falsifiable §6 sentences naming the pool raid | `invalidation.ts` already ships BSL/SSL falsification sentences (`SENTENCE_LONG_LOW` / `SENTENCE_SHORT_HIGH`). Naming the *TP2 pool* in the confirm/deny path ("BSL reydi bu ssenarini təsdiqləyir") closes the loop between §1 pain, §5 target, and §6 invalidation in the trader's language. | LOW | Read-only sentence selection, no gate change. Extends the existing 4-cell lookup, display-only. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Magnet-to-the-line TP2/SL (target exactly at the pool extreme) | Feels maximally precise — book exactly where the stops are. | Guarantees the worst fill: stops cluster *at* the extreme, so a target exactly on it competes with the raid instead of front-running it. This is the exact behavior the Phase 21 buffer (0.25×ATR beyond / 0.10×ATR before) was built to reject. | Buffered offsets stay mandatory on pool-derived legs; the extreme itself is never a target or a stop (already pinned in `resolveSL`/`resolveTP` docs). |
| Stretching TP2 to pass the R/R gate (picking a farther pool so 1:3 holds) | Fewer STAND ASIDE tickets, feels more productive. | Fabricates expectancy: the gate exists to refuse bad geometry, and TP2-shopping turns a risk control into a fitting exercise. R/R is gated on TP1 only by OQ-3 lock. | Honest STAND ASIDE with the computed ratio in the reason (sole sanctioned interpolation); TP2 resolves independently of the gate outcome. |
| Letting pools gate or veto WHY NOW FIRE | "Don't fire into the wrong pool" sounds safe. | Couples a newly-touched module into the calibrated trigger path → flicker, permanent-ARMED, invalidation races (v3.0 pitfalls 2/3/6). Dependence must stay trigger → pools, never pools → trigger. | Pools are read-only context for §1 prose + TP2 + proximity tag. Any future gating needs its own calibration band + population test — explicitly P3, not P2. |
| Auto-FIRE / alert when price touches a pool | "Ping me at liquidity" feels pro. | Pool touch without killzone timing + purge + displacement is inducement-chasing (spec rule #1 TIME>PRICE, v3.0 spam pitfall). Touch ≠ sweep, sweep ≠ entry. | Pool touch renders proximity emphasis on the chart only; FIRE still requires the three-gate `evaluateTrigger` path untouched. |
| 5M microstructure pools | Finer pools sound more accurate for §§4–6. | Terminal ingests D1 + 1H/15M only; a 5M leg doubles poll surface for unproven value — the exact call v3.0 deferred, still valid under zero-budget polling. | D1 pools proven (v3.1), 15M pools P2; 5M only if 15M proves too coarse after calibration. |
| Real retail-sentiment feed | Modul 1.2 reads like it needs live positioning. | Zero budget, no API keys (PROJECT.md out-of-scope: fixtures only). A half-wired "live" badge on scraped data is dishonest and breaks determinism. | `RetailExposure` contract-first + `genuine` flag + neutral-multiplier default; feed swap stays mechanical. |
| Continuous heatmap / volume-profile rendering | Looks institutional and impressive. | Forks the `nq-chart.tsx` price-line/marker overlay discipline, risks HiDPI/resize regressions (v2.1 polish was hard-won), implies density data Yahoo D1 cannot supply. | 2–3 tier line opacity/width by weight + 0.5 dimming for SWEPT (existing idiom). Discrete, testable, resize-safe. |
| LLM-generated pain narrative | "AI explains where stops are" sounds premium. | Breaks determinism (rule-based only); non-reproducible §1 cannot be backtested, replayed, or parity-checked. | Deterministic sentence selection (one base + suffix tags), verbatim + unit-pinned like every other report block. |

## Feature Dependencies

```
TP2-from-pools resolver (POOL2-01)
    └──requires──> Ranked pool inventory (evaluatePools + scoreAndRank, ACTIVE-only rank eligibility)
    │                  └──requires──> shared swings.ts predicates + EQUAL_TOL_BPS clusterer (shipped v3.1)
    ├──requires──> Paper-ticket fixed derivation order (direction → entry → SL → TP ladder → R/R on TP1)
    │                  └──requires──> checkFatalFlaw precedence (flaw → STAND ASIDE before TP resolution)
    └──requires──> Buffered offsets (W12 TicketBufferInput contract — poolExtreme + ATR)

Proximity tag (POOL2-05) ──enhances──> WHY NOW reason + §§4–5 prose (read-only suffix, smtSuffix pattern)
    └──requires──> scoreAndRank rank-1 + distAtr in ATR units

Sentiment multiplier (POOL2-02) ──enhances──> scoreAndRank (third multiplier beside dolBoost/behindPenalty)
    └──requires──> RetailExposure contract { buyPct, sellPct, genuine } + trueAvg crowd side (60% rule)

Pool age/decay (POOL2-04) ──enhances──> scoreAndRank (decay multiplier, weight untouched per D-04)
    └──requires──> originDate + injected asOf (purity: no clock reads)

15M pools (POOL2-03) ──enhances──> pool inventory (second seeding source, joint ranking)
    ├──requires──> nq15m intraday leg (already polled, closedOnlyIntraday, stale-refuses)
    ├──requires──> shared swings.ts predicates (D1 Candle and IntradayCandle shapes stay separate)
    └──requires──> D1 ranking stable first (explicit milestone sequencing)

W12 buffered live wiring ──enhances──> selectTicket (builds TicketBufferInput from ranked pools)
    └──requires──> selectPools inside selectTicket's single-snapshot chain (same epoch, no second slice)

Pool inventory + ALL P2 features ──conflicts──> trigger gating (pools never vote in evaluateTrigger/checkFatalFlaw)
```

### Dependency Notes

- **TP2 resolver reads ranked pools, never re-ranks:** `evaluatePools` → `scoreAndRank` is the single rank owner; `resolveTP2` filters ACTIVE + trade-side + entry-side and picks nearest mid. No scorer duplication, no second ATR read.
- **W12 is the mechanical prerequisite for pool-derived TP2/SL honesty:** the `TicketBufferInput { atr, poolExtreme }` contract already exists in `src/lib/ticket.ts` with per-leg wrong-side degradation; `selectTicket` just never builds it. Wire W12 first so POOL2-01's pool legs inherit buffering instead of bolting it on afterward.
- **Proximity tag is fully independent:** needs only rank-1 + `distAtr` from the existing `PoolScore` ledger — no ticket, scorer, or inventory change. Shippable in any order; natural pair with POOL2-01 prose review.
- **Sentiment and decay are scorer-only changes:** both add one multiplier to `scoreAndRank`'s `score = weight × dolBoost × behindPenalty × sentimentBoost × decay / (1 + distAtr)` with exported provisional constants. Neither touches detector, lifecycle, ticket, or trigger — parity harness covers both arms identically.
- **15M pools go last by explicit milestone order:** new seeding source + merge/dedupe + joint ranking is the largest inventory change; D1 ranking must be calibration-stable first or two moving parts confound the firing-log review.
- **One-way dependence is theP2 invariant:** trigger → pools → ticket-prose/T P2. `e:\valuateTrigger` and `checkFatalFlaw` take no pools input anywhere (parity harness pins this); every P2 plan extends the pools-on/pools-off triple-match proof.

## MVP Definition

### Launch With (Pools P2)

Execution-linked pools with pools-never-vote discipline intact. Suggested execution order inside the milestone (dependencies, not priority — all six ship):

- [ ] W12 buffered ticket live wiring — why first: harness-proven, smallest blast radius (`selectTicket` builds the existing `TicketBufferInput`), and POOL2-01's pool legs need buffering on day one
- [ ] POOL2-01 TP2 resolver — why essential: closes the §5 "TP2: External BSL/SSL" promise the ticket already makes; runs between TP resolution and the TP1-only R/R gate with honest null fallback
- [ ] POOL2-05 proximity tag — why essential: urgency context on WHY NOW/ticket prose at near-zero risk (read-only suffix, `smtSuffix` precedent); independent, pairable with POOL2-01 review
- [ ] POOL2-02 sentiment multiplier — why essential: completes the Modul 1.2 §1 structure (crowd side → pain side) while fixtures stay honest via neutral-default + `genuine` flag
- [ ] POOL2-04 age/decay + re-accumulation — why essential: keeps §1 alive across the observation window; scorer-multiplier only, half-life calibrated against the firing log
- [ ] POOL2-03 15M intraday pools — why last: explicit milestone sequencing (after D1 ranking stable); shared `swings.ts` predicates on `closedOnlyIntraday(nq15m)`, source-tagged, deduped, jointly ranked

### Add After Validation (v3.2.x)

- [ ] Calibration-sandbox knobs for decay half-life / `NEAR_ATR_MULT` / sentiment boost — trigger: P2 constants survive first firing-log calibration review
- [ ] TP2-pool naming in §6 falsification sentences — trigger: TP2 resolver stable on live replay
- [ ] Asia + range seed pools re-weighted against 15M inventory — trigger: 15M pools show overlap/duplication patterns worth folding into seed weights (v3.1 seeded Asia/range as pre-weighted pools; 15M may subsume some)

### Future Consideration (v4+)

- [ ] 5M microstructure pools — why defer: new Yahoo poll leg on free-tier budget; only if 15M proves too coarse after calibration
- [ ] Real retail-sentiment feed replacing fixtures — why defer: budget + determinism posture; contract-first keeps the swap mechanical
- [ ] Pool-gated trigger logic (if ever) — why defer: requires its own calibration band + population test + flicker analysis; explicitly rejected for P2
- [ ] Cross-symbol pools (ES confirmation-leg pools) — why defer: ES is the SMT confirmation leg, not the traded instrument

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| TP2-from-pools resolver (POOL2-01) | HIGH (closes printed §5 promise) | MEDIUM | P1 |
| Buffered ticket live wiring (W12) | HIGH (harness-proven → live correctness) | LOW | P1 |
| Proximity tag on prose (POOL2-05) | MEDIUM (urgency context, zero risk) | LOW | P1 |
| Sentiment multiplier, neutral default (POOL2-02) | MEDIUM (structural completeness, honest fixtures) | LOW | P1 |
| Age/decay + re-accumulation (POOL2-04) | MEDIUM (map stays alive across weeks) | MEDIUM | P1 |
| 15M intraday pools (POOL2-03) | MEDIUM (intraday obvious stops) | MEDIUM | P1 (sequenced last) |
| Sandbox knobs for P2 constants | LOW (operator tuning) | LOW | P2 |
| TP2-pool naming in §6 sentences | LOW (narrative closure) | LOW | P2 |
| Magnet-to-the-line TP/SL | NONE (actively harmful) | — | ANTI |
| R/R-shopping across pools | NONE (fabricates expectancy) | — | ANTI |
| Pool-gated FIRE | LOW (risk > value now) | HIGH | P3 — explicitly rejected for P2 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Generic ICT liquidity scripts (TradingView BSL/SSL, LuxAlgo-style packs) | Retail signal-bot channels | Our Approach |
|---------|--------------------------------------------------------------------------|----------------------------|--------------|
| TP-from-liquidity | Nearest line in either direction, often exactly on the level (magnet-to-the-line) | Entry/SL/TP text with no provenance | Nearest ACTIVE pool on trade side, buffered before the extreme, honest null fallback, R/R gated on TP1 only |
| Proximity context | Trader eyeballs distance to plotted lines | "Liquidity above" hand-waving | ATR-normalized read-only tag on WHY NOW/ticket prose, never a gate, parity-pinned |
| Pool aging | Rarely tracked; raided lines stay plotted indefinitely | Never published; losers deleted | Age-in-bars decay as scorer multiplier (weight untouched), re-accumulation via fresh-swing seeding, half-life calibrated on the firing log |
| Sentiment weighting | Sometimes plotted, never scored | Ignored or cherry-picked screenshots | `RetailExposure` contract with 60%-majority rule, neutral 1.0 default under fixtures, provenance-tagged |
| Multi-timeframe pools | Single-timeframe lines; MTF packs duplicate detectors per TF | None | Shared `swings.ts` predicates across D1 + 15M shapes, source-tagged single inventory, joint ranking, D1-stable-first sequencing |
| Buffer discipline | None — stops/targets on the line | None | SL 0.25×ATR beyond / TP 0.10×ATR before, harness-proven then live-wired, wrong-side degradation per leg |

## Sources

- `C:/Users/HP/Projects/liquidity-engine/src/lib/ict/pools.ts` — detector (equality clustering, ATR-merge/cap), lifecycle (ACTIVE/SWEPT/CONSUMED), `scoreAndRank` (weight × DOL_BOOST × BEHIND_PENALTY / (1+distAtr)), rank-eligibility + refuse-to-rank rules — HIGH, verified source
- `C:/Users/HP/Projects/liquidity-engine/src/lib/ticket.ts` — fixed derivation order, `TicketBufferInput` contract, `TICKET_SL_BUFFER_ATR_MULT`/`TICKET_TP_PULLBACK_ATR_MULT`, R/R-on-TP1 gate, verbatim gate-fail reasons — HIGH, verified source
- `C:/Users/HP/Projects/liquidity-engine/src/lib/store.ts` — `selectPools` (NQ-D1-only, ES-stale-immune, thin-degraded envelope), `selectTicket` single-snapshot chain (trigger → flaw → ticket, no buffer built = W12 gap), `nq15m` poll leg + `closedOnlyIntraday` — HIGH, verified source
- `C:/Users/HP/Projects/liquidity-engine/src/lib/ict/trigger.ts` — `smtSuffix` read-only agree-tag precedent (appended, never gates FIRE) — HIGH, verified source
- `C:/Users/HP/Projects/liquidity-engine/src/lib/ict/pools-parity.test.ts` — pools-on/pools-off triple-match harness (buffered build shared, pools toggle in driver fixtures only) — HIGH, verified source
- `C:/Users/HP/Projects/liquidity-engine/src/lib/report.ts` — `describePool` display-only pool prose precedent — HIGH, verified source
- `C:/Users/HP/Projects/liquidity-engine/src/lib/sentiment.ts` — `trueAvg` crowd-side + `CROWDED_THRESHOLD = 60` (RetailExposure input side) — HIGH, verified source
- `C:/Users/HP/Projects/liquidity-engine/src/lib/ict/swings.ts` + `src/lib/ict/types.ts` — shared k=2 fractal predicates; D1 `Candle` vs `IntradayCandle` contracts never unified — HIGH, verified source
- `reference/institutional_rules.md` — Modul 1.2 (retail 60%+ → Pain Threshold stop zones → süpürmə/tələ) + §1/§2-DOL/§5-TP2 lines — HIGH, project domain authority
- `C:/Users/HP/Projects/liquidity-engine/.planning/research/FEATURES.md` (v3.1, 2026-09-15) — superseded by this P2 edition; its P2-deferred rows (TP2, sentiment, 15M, decay, proximity tag) are the input backlog — HIGH, project history
- ICT education literature (equal-high/low stop raids, BSL/SSL draw-on-liquidity, sweep-then-displacement, HTF→intraday liquidity hierarchy) — MEDIUM, semantics only, never threshold authority; all P2 ranking constants ship provisional pending live observation

---
*Feature research for: Pools P2 execution links (POOL2-01–05 + W12)*
*Researched: 2026-10-26*
