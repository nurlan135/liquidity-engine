# Pitfalls Research

**Domain:** Liquidity-pool-driven execution links (TP2 resolver, pool lifecycle/decay, second-timeframe pools, sentiment multiplier, buffered-ticket live wiring) on the ICT execution terminal
**Researched:** 2026-10-26
**Confidence:** HIGH — grounded in `src/lib/ict/pools.ts`, `src/lib/ict/pools-parity.test.ts` (84-bar exact-match harness), `src/lib/ticket.ts`, `src/lib/store.ts` `selectTicket`, `src/lib/sentiment.ts`, `src/lib/ict/swings.ts`

## Critical Pitfalls

### Pitfall 1: Pools silently vote on trigger/flaw verdicts

**What goes wrong:**
The TP2 resolver or proximity helper takes a pools argument inside `evaluateTrigger` or `checkFatalFlaw` (or a shared options object both consume). Trigger verdicts shift pools-on vs pools-off on a handful of bars — FIRE becomes ARMED or vice versa — while the ticket still looks plausible, so nobody notices until the parity harness fails or live firing rate drifts out of the 1–4/week band.

**Why it happens:**
Once pools exist in the store, the shortest path is to thread them through every selector. A `pools?: LiquidityPool[] | null` optional param or a widened `TriggerInput` feels harmless, and TypeScript stays green. The v3.1 lock — trigger/flaw/ticket triple identical pools-on vs pools-off over the 20-session replay — is invisible at the call site.

**How to avoid:**
- Keep `TriggerInput` and the flaw input shapes pools-free. Pools enter ONLY the ticket plane as `TicketBufferInput { atr, poolExtreme }` in `C:/Users/HP/Projects/liquidity-engine/src/lib/ticket.ts`.
- The TP2 resolver signature is `(pools, direction, entry) → poolExtreme | null`, called inside `selectTicket` in `C:/Users/HP/Projects/liquidity-engine/src/lib/store.ts` AFTER flaw judgement, never before.
- Keep `C:/Users/HP/Projects/liquidity-engine/src/lib/ict/pools-parity.test.ts` byte-stable as the regression anchor; any new pool-touching path gets a pools-on vs pools-off exact-triple test (verdict + reasonKey + gates + flaw class + full buffered SL/TP ladder, zero tolerance).

**Warning signs:**
- A diff touching `src/lib/ict/trigger.ts` or `src/lib/ict/invalidation.ts` imports anything from `pools.ts`.
- `evaluateTrigger`/`checkFatalFlaw` gain a new optional parameter.
- Firing-log band review shows 1–4/week holding but parity test needs updated expectations.

**Phase to address:**
Pool-lifecycle purity phase FIRST (POOL2-04 before any resolver). Re-prove parity at every later phase; W12 live wiring re-runs the full 84-bar harness, not a subset.

---

### Pitfall 2: Magnet-to-the-line TP2 (target = pool price exactly)

**What goes wrong:**
TP2 is set to the pool extreme itself. Paper tickets look fine; live fills never happen because price sweeps and rejects at the cluster edge. Backtest R multiples inflate while real fills slip.

**Why it happens:**
`resolveTP` already resolves structure levels; swapping in `pool.top`/`pool.bottom` as the level is a one-line change. The buffer idiom (book BEFORE the extreme) lives only in comments and the harness fixture (`TP2/TP3 20260 − 0.10×40 = 20256`).

**How to avoid:**
- TP-side extreme always resolves via `beforeExtreme`: `target = extreme ∓ TICKET_TP_PULLBACK_ATR_MULT × ATR`, then `min/max` against the structure level — the extreme is never a target. Pinned in `C:/Users/HP/Projects/liquidity-engine/src/lib/ticket.ts` (`TICKET_TP_PULLBACK_ATR_MULT = 0.1`).
- Boundary test: TP-side extreme fixture asserts `tp.tp2 === 20256`, never `20260`; stop-side extreme fixture asserts TPs stay on structure.
- Chart lines come from the buffered ticket output via `ticketLineInputs` — never recompute TP2 from pools in the mapper.

**Warning signs:**
- Any `tp2 === poolExtreme` or `tp2 === pool.top` assertion.
- TP2 line sits exactly on a swept-ghost line in screenshots.
- R multiples jump without an SL change.

**Phase to address:**
TP2 resolver phase (POOL2-01), with the pullback constant marked CALIBRATION-PROVISIONAL and reviewed against the firing log, not tuned to make RR pass.

---

### Pitfall 3: R/R gate migrates from TP1 to TP2

**What goes wrong:**
Because TP2 is now "the pool target," the gate is rewritten to use TP2 distance (or best-of TP1..TP3). Two failure modes: buffered SL widens the stop so TP1 no longer covers 3R and EXECUTE rate collapses; or TP2 is far away so junk setups pass on a distant magnet while the nearest exit is underwater.

**Why it happens:**
The OQ-3 lock (R/R on TP1 only) is a behavioral convention, not a type constraint. A well-meaning "gate on the pool target" refactor passes lint and most tests.

**How to avoid:**
- Keep the gate in `computeTicket` exactly as-is: `rr = |tp1 − entry| / stopDist`, `rr + TOL_EPS >= TICKET_RR_MIN` (see `TICKET_RR_MIN = 3` in `C:/Users/HP/Projects/liquidity-engine/src/lib/ticket.ts`). TP2/TP3 stay nullable legs that omit as null — never synthesized fillers.
- Pin with the two existing rows: stop-side buffered build asserts `rr === 5` (EXECUTE), TP-side build asserts `rr === 9` with TP1 unchanged at 20210.
- Verbatim R/R-fail reason (`R/R 1:X — EXECUTE bloklandı.`) stays the sole sanctioned interpolation; do not name TP2 in it.

**Warning signs:**
- `resolveTP` or `computeTicket` diff mentions `tp2` near the `TICKET_RR_MIN` compare.
- EXECUTE/STAND_ASIDE counts shift on the same 84-bar replay without a trigger change.
- `rMultiples.tp2` used in any gating conditional.

**Phase to address:**
TP2 resolver phase (POOL2-01). W12 wiring must re-assert RR counts unchanged live vs harness.

---

### Pitfall 4: Swept-vs-ACTIVE confusion in the resolver

**What goes wrong:**
Resolver picks the nearest pool by distance regardless of `status`, or treats SWEPT as "stronger magnet." Result: TP2 behind a swept wick (already-tapped liquidity), or a CONSUMED pool that left the map, or a behind-price pool (BSL below last close on a LONG) as the upside target.

**Why it happens:**
`LiquidityPool.status` is a plain string union; distance sorting is easier than eligibility filtering. The D-06 rule (only ACTIVE pools rank; SWEPT rides along unscored for dimming) lives in `scoreAndRank` in `C:/Users/HP/Projects/liquidity-engine/src/lib/ict/pools.ts` — easy to bypass with a fresh `sort by |mid − entry|` in the resolver.

**How to avoid:**
- Resolver eligibility, in order: `status === 'ACTIVE'` only → side matches trade direction (LONG → BSL above entry; SHORT → SSL below entry) → extreme strictly beyond entry in trade direction → nearest by ATR-normalized distance.
- Reuse `scoreAndRank` ordering or the same `poolMid`/`distAtr` idiom; do not invent a second ranking.
- Lifecycle (`applyLifecycle`: wick pierce → SWEPT, close through → CONSUMED and removed, `==` touch is NOT a sweep) stays untouched — the resolver reads status, never recomputes it.

**Warning signs:**
- Resolver file has no `status === 'ACTIVE'` filter.
- TP2 resolves on a STAND_ASIDE or swept-ghost bar in screenshots.
- `CONSUMED` appears anywhere outside `pools.ts` lifecycle/merge code.

**Phase to address:**
Pool-lifecycle purity phase (POOL2-04): lock eligibility predicate + status transition table before the resolver consumes it.

---

### Pitfall 5: Stale/thin legs laundered through the pool path

**What goes wrong:**
NQ-stale bars produce a pool-ranked TP2 anyway (pools derived from a stale window), or ES-stale wrongly nulls D1 pools, or thin-history windows rank with full confidence and no `degraded` flag. Provenance (`stale`/`thin`/`leg`) disagrees between ticket, pools panel, and §1 prose.

**Why it happens:**
`selectPools` in `C:/Users/HP/Projects/liquidity-engine/src/lib/store.ts` has a deliberately asymmetric guard: NQ-stale → null (pools are D1-NQ geometry), ES-stale → keep pools. Copy-pasting the `selectTicket` guard (which nulls on any leg stale) into the pool path — or vice versa — breaks one side. Thin tier (`resolveThinTier`) dims with 0.5 opacity rather than refusing; a resolver that ignores `degraded` prints full-strength TP2 on thin data.

**How to avoid:**
- Preserve the asymmetry: TP2 resolver requires fresh NQ D1 closed window + finite ATR; ES-stale flows into `TicketDegraded { stale: true, leg: 'es' }` on the ticket, never into pool nulling.
- Zero/empty ATR refuses to rank (`rankSkipped: true`, originDate order, scores 0 — never NaN) per `scoreAndRank`; the resolver maps rank-skipped → `poolExtreme: null` → unbuffered structure levels.
- Carry the same `degraded` envelope through ticket → chart lines → proximity tag so dimming agrees everywhere.

**Warning signs:**
- `selectPools` diff adds an `es.stale` read, or `selectTicket` diff drops the `nq1h/nq15m.stale → null` early return.
- Pool panel renders while the ticket is STAND_ASIDE-STALE, or vice versa.
- `rankSkipped` handled in only one of the two consumers.

**Phase to address:**
Pool-lifecycle purity phase (POOL2-04) pins the stale/thin matrix; every later phase re-runs the stale-leg drill matrix.

---

### Pitfall 6: Age/decay mutates weight history or re-promotes swept pools

**What goes wrong:**
Decay is implemented as `pool.weight *= decay(age)` on the stored inventory, or re-accumulation resets `status: SWEPT → ACTIVE` when touches grow. Weight history becomes order-dependent, replay determinism breaks (same bars, different weights depending on evaluation order), and swept-then-rejected memory re-arms as fresh pain.

**Why it happens:**
Weight (`poolWeight = touches + equalityBonus`) looks like the natural decay carrier, and "re-accumulation" reads like "make it ACTIVE again." The D-04 invariant — lifecycle never edits weight; reduced presence flows through scorer eligibility, never weight — is comment-level, not type-level.

**How to avoid:**
- Decay is a scorer-plane multiplier applied in `scoreAndRank` (or a pure `applyDecay(scores, ages, asOf)` beside it): `score = weight × dolBoost × behindPenalty × decayFactor / (1 + distAtr)`. Stored `weight`/`touches` never change after seeding.
- Re-accumulation adds touches/weight to a SWEPT pool's record but status stays SWEPT — it rides along unscored for dimming, never re-enters Rank-1. Only a newly seeded cluster (new originDate) can be ACTIVE.
- Time is the injected `asOf` date string (pools) / epoch (ticket) — never `Date.now()`. `originDate` stays the earliest seed date; decay age = `asOf − originDate` in sessions.
- All decay constants marked CALIBRATION-PROVISIONAL with seeded date, reviewed against the firing-log band (1–4/week) — never tuned to force a Rank-1 flip in tests.

**Warning signs:**
- Any assignment to `.weight` or `.touches` outside `seedPools`/`mergePools`.
- Any `status = 'ACTIVE'` assignment outside seeding.
- `Date.now()` or `new Date()` in `src/lib/ict/`.
- A decay test that asserts a specific Rank-1 flip rather than score-ordering properties.

**Phase to address:**
Pool-lifecycle purity phase FIRST (POOL2-04). This is the phase-ordering linchpin: decay semantics must be locked before TP2 consumes rank.

---

### Pitfall 7: 15M pools fork or pollute the D1 k=2 contract

**What goes wrong:**
POOL2-03 reuses `evaluatePools`/`detectPools` directly on 15M candles, or duplicates the swing detector with a different `k`, or merges 15M pools into the D1 `selectPools` inventory. D1 Rank-1 flips on intraday noise; SMT cross-market pairing (which shares `SWING_K = 2` via `C:/Users/HP/Projects/liquidity-engine/src/lib/ict/swings.ts`) silently changes behavior.

**Why it happens:**
The shared contract (`SWING_K = 2`, `SWING_LOOKBACK = 60`, strict-fractal predicates) is importable and convenient. A 15M feed "just works" through the D1 pipeline — 60 trailing 15M bars instead of 60 daily bars — and tests stay green because fixtures are small.

**How to avoid:**
- D1 ranking path stays byte-stable: `windowCandles` = trailing-60 CLOSED D1, `POOL_MAP_BOUND = 20`, `MERGE_ATR_MULT = 0.25`, `EQUAL_TOL_BPS = 25`. No parameter threading into it.
- 15M pools live on a separate path (`evaluateIntradayPools` or equivalent) with its own lookback/bound/ATR unit, own cap, and NO write path into D1 `selectPools` or `scoreAndRank` D1 order.
- `swings.ts` stays the single owner of `isSwingHigh/isSwingLow/SWING_K`; 15M uses the same predicates (same `k = 2` unless a dedicated decision record says otherwise) but a different window — shared predicate, separate pipeline.
- Ship order: D1 ranking stable + firing-log band holds BEFORE 15M merges anywhere near the ticket.

**Warning signs:**
- `detectPools`/`evaluatePools` gain a `timeframe` or `k` parameter.
- `SWING_K`/`SWING_LOOKBACK` imported anywhere besides `smt.ts`/`pools.ts` (+ the new intraday module).
- D1 pool snapshot tests change when the 15M plan lands.

**Phase to address:**
POOL2-03 LAST among pool features (after D1 ranking + decay + resolver are stable). Gate: D1 Rank-1 snapshot tests unchanged by the 15M diff.

---

### Pitfall 8: Sentiment multiplier drifts from neutral and starts voting

**What goes wrong:**
POOL2-02's multiplier on the `RetailExposure` contract stops being neutral-default-1.0: it scales position size unconditionally, shifts SL/TP, or gates FIRE ("crowded LONG blocks LONG"). The 60% crowded flag prose gets reworded, Insta/FiboGroup exclusions get dropped, and a fixture-only signal starts moving real tickets.

**Why it happens:**
A multiplier is the easiest "smart" hook: `size *= sentimentMultiplier`. The current `trueAvg` in `C:/Users/HP/Projects/liquidity-engine/src/lib/sentiment.ts` is fixture-backed (zero budget, no live API) with a pinned True AVG + exclusion rule — treating its output as a live positioning feed overstates it.

**How to avoid:**
- Contract: `sentimentMultiplier(side, trueAvg) → 1.0` neutral default; any non-1.0 value is advisory (sizing note / proximity-tag suffix context), never a trigger gate, flaw input, SL/TP shift, or RR-gate input.
- Keep `CROWDED_THRESHOLD = 60`, `EXCLUDED_SUBSTRINGS = ['insta','fibogroup']`, and the verbatim Azerbaijani rationale strings (`Həqiqi Ortalama (Insta/FiboGroup xaric)…`) test-pinned with `toBe` — see `C:/Users/HP/Projects/liquidity-engine/src/lib/sentiment.ts` and `src/lib/fixtures.test.ts`.
- If the multiplier ever sizes: clamp band (e.g. 0.5–1.0, reduce-only, whole-contract floor refuses rather than rounds up), applied AFTER the EXECUTE verdict, logged in the reason suffix — never inside `resolveSL/resolveTP`.

**Warning signs:**
- `sentiment` or `trueAvg` imported in `trigger.ts`, `invalidation.ts`, or `resolveSL/resolveTP`.
- Crowded-side string interpolated into a verdict reason.
- `sizeContracts` changes on the 84-bar replay without a riskPct change.

**Phase to address:**
Read-only phase with POOL2-05 (after lifecycle + resolver). Prove: sentiment-on vs sentiment-off ticket verdicts identical; only advisory prose/size-note differs.

---

### Pitfall 9: W12 live wiring splits the harness-proven build (double derivation + epoch skew)

**What goes wrong:**
`selectTicket` wires `buffer: { atr, poolExtreme }` from a DIFFERENT epoch or a re-derived trigger than the flaw judged: SL uses one ATR, TP uses another pool extreme, or the flaw judged trigger-A while the ticket prices trigger-B. Harness proved `SL 20075 / TPs 20210/20256/20256` on one snapshot; live prints something adjacent and parity silently rots.

**Why it happens:**
The live selector derives six things (trigger, smt, judas, rollover, stale, levels/range/dol/asia) plus now ATR + pool extreme. Each is a separate `get().selectX()` call; adding two more derivations invites calling `selectTriggerPure` twice or computing ATR on unclosed/current bars while pools used closed-only. The `buffer` trust-boundary validator (`assertValidBuffer` in `ticket.ts`) only checks finiteness, not provenance.

**How to avoid:**
- Single-snapshot order in `selectTicket` (`C:/Users/HP/Projects/liquidity-engine/src/lib/store.ts` ~line 1311): one `selectTriggerPure()` → `checkFatalFlaw` on that IDENTICAL object → `computeTicket` on the identical trigger + flaw, with `buffer` derived from the SAME `epoch` (one `sharedEpoch` call) and the SAME closed-only NQ window `evaluatePools` used.
- Side-guard rule (already in `resolveSL`/`resolveTP`): one extreme cannot guard both sides — stop-side extreme buffers SL only, TP-side extreme buffers TPs only, wrong-side degrades that leg to structure. Wire exactly one `poolExtreme` chosen by the TP2 resolver for the LIVE direction; do not pass stop and TP extremes separately.
- Null-degrade, never filler: `buffer: null` (or null atr/extreme) → unbuffered structure levels; NaN/non-finite → throw at the boundary with got-string error, and `chart-mapper.ts` `ticketLineInputs` keeps the `tp2/tp3 nullable, tp1 finite` contract.
- Re-proof: extend `pools-parity.test.ts` with a live-path row — run `selectTicket` shape (same epoch, same buffer) against the harness `computeTicket` shape and assert field-identical SL/TP/RR.

**Warning signs:**
- Two `selectTriggerPure()` calls or two `sharedEpoch` calls in one `selectTicket`.
- `poolExtreme` computed from a different candle array than `selectPools`.
- `buffer` constructed in the component layer instead of the selector.
- Chart SL/TP lines disagree with the ticket panel on the same bar.

**Phase to address:**
W12 LAST, after all pool features. Exit proof is parity re-proof on live wiring — not just unit tests on the buffer math (already proven in Phase 21).

---

### Pitfall 10: Proximity tag becomes a vote (prose coupling)

**What goes wrong:**
POOL2-05's pain-map tag ("BSL 40 pkt yaxın" style suffix on WHY NOW/ticket prose) is concatenated INTO the verbatim `reason` fields that tests pin with `toBe` and the firing-log calibration export consumes. Reasons stop matching, the banned-word quarantine trips, or — worse — downstream code parses the tag to alter verdicts.

**Why it happens:**
The reasons are plain strings; appending context to them is the path of least resistance. The Azerbaijani sentences are test-pinned precisely because institutional prose must not drift — any interpolation breaks the pin.

**How to avoid:**
- Tag is a SEPARATE field / separate render suffix (e.g. `proximityTag: string | null` beside `reason`, or a `§1`-line addendum), never interpolated into `trigger.reason`, `flaw.reason`/`sentence`, or `ticket.reason`. Verbatim constants (`REASON_*` in `ticket.ts`, `REASON_BY_KEY` in invalidation, trigger reasonKeys) stay byte-identical.
- Tag derives from ranked pools + entry/close distances only — read-only, no input back into any derivation. No parsing of tag text anywhere.
- Banned-word quarantine list stays green: tag vocabulary pre-cleared (no "guarantee/əmin/mütləq" class words in either language).

**Warning signs:**
- A `toBe` verbatim-reason test updated in the same diff as the tag.
- Template literal touching `REASON_` constants.
- Any `includes/proximity` read inside derivation code (vs render code).

**Phase to address:**
Read-only phase with POOL2-02 (after resolver). Verify: all verbatim-reason tests green WITHOUT modification; tag covered by its own suffix-only tests.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Reuse D1 `evaluatePools` for 15M by passing intraday candles | 15M pools "work" in one line | D1 ranking polluted; lookback/bound/ATR semantics fork silently | Never — separate intraday path only |
| Decay as stored-weight mutation | Simple `weight *= f(age)` | Order-dependent replay; parity unprovable | Never — scorer-plane multiplier only |
| SWEPT → ACTIVE re-promotion on re-accumulation | Fewer "dead" pools | Swept memory re-arms as fresh pain; ghost logic collapses | Never — new seeds only |
| `poolExtreme` from unclosed/current bar | Fresher-looking TP2 | Epoch skew vs closed-only pools; harness/live divergence | Never — same closed window + same epoch |
| Sentiment multiplier inside `computeTicket` gating | "Smarter" tickets fast | Fixture signal votes on real verdicts; RR gate corrupted | Never as a gate; advisory-only after verdict |
| Proximity text interpolated into `reason` | One fewer prop to thread | Verbatim pins break; quarantine + calibration export rot | Never — separate suffix field |
| New optional `pools` param on trigger/flaw | Easy data access | Pools vote; parity harness fails late and confusingly | Never |
| Retune CALIBRATION-PROVISIONAL constants to make new tests pass | Green fast | Destroys the firing-log review basis (1–4/week band) | Never without firing-log evidence + decision record |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Yahoo dual-symbol proxy (NQ/ES + 1H/15M legs) | Pool/TP2 derivation reads raw candles instead of the closed-only + timestamp inner-join output | Resolver consumes the same post-join closed windows `selectPools` uses; per-leg stale envelopes preserved end-to-end (stale-drill matrix) |
| Store selectors (`selectTicket`, `selectPools`) | Calling `selectTriggerPure` twice; deriving buffer ATR on a different epoch | One `sharedEpoch`, one trigger object, flaw on the identical object, buffer from the same window — mirror `runReplayBar` order in `pools-parity.test.ts` |
| Chart mapper (`chart-mapper.ts`) | Recomputing TP2 from pools for lines; filling null TP2/TP3 with synthetic levels | Pass buffered ticket legs through unchanged; `tp2/tp3` nullable, `tp1` finite-or-throw; swept ghosts dim, never ETİKET |
| Calibration sandbox (7th slider + Apply-record) | Wiring pool decay/buffer multiples to sandbox sliders as live constants | Buffer/pullback/decay multiples stay pinned constants with boundary tests; sandbox previews through the same Apply path as documentation of intent only (per `store.ts` D-13 comment) |
| Firing-log calibration export | Counting ARMED/WAIT or overflow as non-fires; changing verdict strings | FIRE-only counting + conservative overflow-as-fire + verbatim `CALIBRATION_HOLD_COPY`/`BREAK_COPY` in `src/lib/ict/calibration.ts`; pools context-only in the export |
| Report §§1/4–6 prose | Pool distance numbers interpolated into verbatim sentences | Distances live in the proximity-tag suffix field and §1 Pain Threshold block (rank-1 sentence + honest empties); §§4–6 reasons byte-identical |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Per-render full pool re-evaluation | Terminal lags on each tick; selector recomputes 60-bar seed+merge+rank per render | Memoize `selectPools`/resolver on closed-window identity + `asOf`; derivation stays render-pure with explicit commit point (existing store pattern) | Live polling with 1H/15M legs + 15M pools added |
| 15M pool inventory unbounded | Hundreds of intraday clusters; merge O(n²) per bar | Separate intraday cap (own bound, not `POOL_MAP_BOUND = 20` reuse without analysis); greedy-chronological merge preserved | Intraday volatile weeks |
| Parity harness runtime creep | 84-bar × full triple × new pool legs slows CI | Keep harness builders shared (no duplicate fixture worlds); assert-exact-parity stays the single comparator | Adding 15M × sentiment × decay cross-product arms — add arms by sampling, not full cross-product |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Calibration JSON export gains pool internals (full inventory dump) | Leaks model-tuning surface; downstream parsers couple to internal shape | Export band verdict + counts only (`CalibrationSummary`); inventory stays store-local |
| Proximity tag injects unescaped pool data into report DOM | Verbatim-prose trust boundary weakens; future HTML injection surface | Tag is a plain-text suffix field; no `dangerouslySetInnerHTML` path; banned-word quarantine covers tag vocabulary |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| TP2 line at full strength on thin/stale data | False precision; trader trusts a degraded target | Uniform 0.5 dimming + persistent banner + `degraded.leg` naming (Phase 13/20 discipline); tag shows `rankSkipped`/degraded state honestly |
| Swept ghosts vs ACTIVE lines indistinguishable | Trader chases tapped liquidity | Rank brightness for nearest-2-per-side ACTIVE; swept ghosts dimmed, never Rank-1 (Phase 20 verdict-gated lines) |
| Sentiment multiplier shown as verdict confidence | Fixture signal mistaken for live edge | Neutral-default display; crowded flag as context prose (`trueAvg` rationale), never a confidence badge |
| Verbatim Azerbaijani reasons reworded for pool context | Institutional prose trust erodes; UAT pins fail | Reasons frozen; pool context ONLY in §1 Pain Threshold block + proximity suffix |

## "Looks Done But Isn't" Checklist

- [ ] **TP2 resolver:** Often missing side-guard (extreme strictly beyond entry) + ACTIVE-only filter — verify swept/behind-price fixtures resolve to `null`/structure, not the nearest pool.
- [ ] **R/R gate:** Often missing TP1-only pin after buffering — verify both buffered rows (`rr === 5` stop-side, `rr === 9` TP-side with TP1 20210 unchanged).
- [ ] **Decay:** Often missing scorer-plane proof — verify stored `weight`/`touches` byte-identical pre/post decay and replay determinism (double-run `JSON.stringify` equality, pools-parity precedent).
- [ ] **15M pools:** Often missing D1 isolation proof — verify D1 Rank-1 snapshot tests unchanged by the 15M diff.
- [ ] **Sentiment:** Often missing neutrality proof — verify sentiment-on vs sentiment-off verdicts identical on the replay population.
- [ ] **Proximity tag:** Often missing verbatim-integrity proof — verify zero `toBe` reason tests modified; tag has its own suffix-only tests.
- [ ] **W12 live wiring:** Often missing live-vs-harness identity — verify `selectTicket` + live buffer ≡ harness `computeTicket` + shared buffer field-for-field (SL/TP/RR/reason), plus stale-leg matrix still green.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Pools voting (parity red) | MEDIUM | `git bisect` the trigger/flaw signature diff; remove pools params; restore `pools-parity.test.ts` anchor; re-run 84-bar harness to green before any new work |
| Magnet TP2 / RR-gate drift | LOW | Restore `beforeExtreme` + TP1-only gate; re-pin the two buffered rows (20075/20210/20256); re-check EXECUTE counts on replay |
| Swept-TP2 live | LOW | Add ACTIVE + side + beyond-entry eligibility; add swept/behind-price fixtures resolving to null |
| Weight-mutation decay | HIGH | Rebuild weight as pure `poolWeight(touches)`; move decay to scorer multiplier; double-run determinism check; re-baseline Rank-1 snapshots |
| D1/15M pool merge | HIGH | Split intraday path; restore D1 snapshots from before the 15M diff; re-gate D1 Rank-1 tests |
| Sentiment voting | MEDIUM | Remove sentiment imports from trigger/flaw/SL/TP; restore neutral-default; move multiplier to post-verdict advisory |
| W12 epoch skew | MEDIUM | Collapse to one `sharedEpoch` + one trigger object; move buffer derivation inside `selectTicket` after flaw; add live-vs-harness identity test |
| Prose coupling (tag in reason) | LOW | Extract tag to suffix field; revert `REASON_*` constants; re-run verbatim + quarantine tests |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Lifecycle/decay purity, swept-vs-ACTIVE, stale/thin matrix (P1 part, P4, P5, P6) | Phase 1 — pool-lifecycle purity (POOL2-04) | Eligibility predicate tests; weight-immutability + double-run determinism; stale-leg matrix green; parity still exact |
| Magnet TP2 + R/R TP1-only gate (P2, P3) | Phase 2 — TP2 resolver (POOL2-01) | Buffered rows 20075/rr5 + 20256/rr9 pinned; TP2-nullable (no fillers); EXECUTE counts unchanged on replay |
| Sentiment neutrality + proximity suffix-only (P8, P10) | Phase 3 — read-only context (POOL2-02 + POOL2-05) | Sentiment on/off verdict identity; zero verbatim `toBe` modifications; tag suffix-only tests + quarantine green |
| 15M pools isolation (P7) | Phase 4 — second timeframe (POOL2-03), after D1 stable | D1 Rank-1 snapshots unchanged; intraday path has own lookback/bound/cap; no `selectPools` D1 write path |
| Live buffer wiring + epoch/provenance identity (P9) | Phase 5 — W12 live wiring LAST | Live `selectTicket` ≡ harness `computeTicket` field-for-field; full 84-bar parity re-proof + stale matrix + chart-line agreement |

## Sources

- `C:/Users/HP/Projects/liquidity-engine/src/lib/ict/pools.ts` — lifecycle (wick-pierce SWEPT / close-through CONSUMED), `scoreAndRank` D-06 ACTIVE-only eligibility, CALIBRATION-PROVISIONAL constants, rankSkipped refuse-to-rank
- `C:/Users/HP/Projects/liquidity-engine/src/lib/ict/pools-parity.test.ts` — 84-bar pools-on/off exact-triple harness (D-12 zero tolerance, buffered SL/TP inside the match), single-snapshot trigger→flaw→ticket order
- `C:/Users/HP/Projects/liquidity-engine/src/lib/ticket.ts` — fixed derivation order, TP1-only R/R gate, `TicketBufferInput` trust boundary, side-guard degrade, verbatim `REASON_*` pins
- `C:/Users/HP/Projects/liquidity-engine/src/lib/store.ts` — `selectTicket` single-snapshot order (~line 1311), `selectPools` NQ-only stale guard (~line 953), sandbox knobs pinned (D-13)
- `C:/Users/HP/Projects/liquidity-engine/src/lib/ict/swings.ts` — shared `SWING_K = 2` / `SWING_LOOKBACK = 60` contract (SMT + pools)
- `C:/Users/HP/Projects/liquidity-engine/src/lib/sentiment.ts` — True AVG + Insta/FiboGroup exclusion + 60% crowded flag + verbatim rationale
- `C:/Users/HP/Projects/liquidity-engine/src/lib/ict/calibration.ts` — FIRE-only band counting, conservative overflow, verbatim HOLD/BREAK copy
- `.planning/PROJECT.md` — v3.2 Pools P2 targets (POOL2-01–05, W12) and pools-never-vote discipline

---
*Pitfalls research for: liquidity-pool-driven execution links (Pools P2 + W12)*
*Researched: 2026-10-26*
