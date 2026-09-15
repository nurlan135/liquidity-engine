# Project Research Summary

**Project:** liquidity-engine v3.1 — Pain Threshold (§1 live) + Execution Polish
**Domain:** ICT execution terminal (NQ paper-trading terminal, rule-based, no LLM) — brownfield projection layer
**Researched:** 2026-09-15
**Confidence:** HIGH

## Executive Summary

This is a brownfield milestone on a live NQ execution terminal (v3.0 shipped: trigger, HARD/SOFT flaw, paper ticket, FVG/Judas/SMT live). v3.1 adds a **BSL/SSL Pain Threshold map**: stop-cluster projection from D1 swing highs/lows, ranked by proximity × weight × DOL-side, with sweep-state lifecycle, rendered as a live §1 report block plus dashed chart overlay lines. Experts build this as a deterministic pure-function projection — swing clustering with ATR-tolerance merge, trailing-cap inventory, verbatim Azerbaijani prose — not as ML clustering, not as a new chart engine, not as trigger logic.

The recommended approach is unanimous across all four research files: **one new pure module** (`src/lib/ict/liquidity-pools.ts` / `pools.ts`) that imports the proven `isSwingHigh`/`isSwingLow` + `SWING_K=2` fractal from `smt.ts`, consumes Judas read-only for swept-state, derives through a `selectPools` Zustand selector with the house refuse-null envelope, fans out to `report.tsx` §1 (verbatim, `proyeksiya`-hedged) and `nq-chart.tsx` price lines (capped, dimmed). **Zero new dependencies** — every capability maps onto installed packages (zustand 5.0.15, lightweight-charts 5.2.1, @base-ui/react 1.8.0 slider primitive) or own code. Build order is math → overlay → polish, each step independently verifiable without re-opening prior green tests.

The key risks are wick-noise false pools (every chop extreme becomes "liquidity"), swept-pool double-counting (raided zones advertised as fresh pain), and integration misfire (pools leaking into trigger gates / flaw keys / ticket derivation and invalidating the 420-test calibration). All three are mitigated by the same contract: shared swing truth, ACTIVE/SWEPT/CONSUMED lifecycle with first-sweep-wins, pools as read-only context that never votes — enforced by boundary tests, parity harness (verdicts identical pools on/off), and the purity + verbatim guards from day one.

## Key Findings

### Recommended Stack

No new packages. v3.1 is pure own-code plus installed primitives — the same headline finding as v2.0 and v3.0, for the third consecutive milestone. The only new *file* (not package) is `components/ui/slider.tsx` composed from the already-installed `@base-ui/react/slider` for threshold/pool-tolerance calibration.

**Core technologies:**
- `src/lib/ict` pure functions (new `pools.ts` / `liquidity-pools.ts`): BSL/SSL stop-cluster projection from closed D1 candles — reuse `isSwingHigh`/`isSwingLow` + `SWING_K=2`, ATR-tolerance merge, trailing-N cap; purity (no I/O, injected time) keeps 420 tests green
- Zustand derived selectors (`selectPools`, pool-aware ticket/DOL reads, v5.0.15): pools derive from the NQ D1 leg, never stored — cannot desync; tolerance/threshold fields are plain state with clamped setters feeding calibration sliders
- `REPORT_SECTIONS` §1 flip + locked-copy §1 block in `report.tsx`: `unavailable` → `live` with verbatim pool reasons, following the §3 locked-copy precedent; sweeper detail in prose, never on canvas
- lightweight-charts v5 `createPriceLine` pairs (v5.2.1): BSL/SSL zone top/bottom dashed lines on the existing series handle, capped to trailing-N per side — no chart-lib change, no new overlay primitive
- `components/ui/slider.tsx` (new, from installed `@base-ui/react` 1.8.0 slider): WHY NOW threshold recalibration + pool-tolerance controls; thin view over numeric store state
- Manual `localStorage` helpers (extend `firingLogToJson`): firing-log analysis persistence + calibration survival; pure stats helper + DOM tables, avoiding the zustand `persist` SSR trap

See `STACK.md` for versions, alternatives rejected (k-means, recharts/d3, react-hook-form/zod, persist, WebSocket, LLM narration), and variant handling (pool multiplication, line striping, ticket-line collision).

### Expected Features

A §1 that cannot name *which* pool, *where*, *whether swept*, and *how close* is not a §1. Minimum viable Pain Threshold is map → rank → sweep-state → §1 live → overlay, all paper, all deterministic, all pure.

**Must have (table stakes):**
- D1 swing-point pool detection (fractal highs/lows → BSL/SSL levels, shared `swings.ts`, `closedOnly`, 60-bar window) — the map itself
- Equal-high/low weighting (`EQUAL_TOL_BPS` ~25 bps, equality bonus) — the densest engineered pools, test-pinned
- Pool projection as zones (`{ side, top, bottom, touches, weight, originDate, status }`, `POOL_MAP_BOUND = 20`) — not single flickering lines
- Sweep-status tracker (ACTIVE / SWEPT / CONSUMED, Judas pierce + FVG close-through idioms, first-pierce-wins) — without it the map advertises dead pools
- Proximity + DOL-side scorer (`weight × dolBoost / (1 + distAtr)`, behind-penalty, exported provisional constants) — ranking names *the* zone
- §1 live report block with verbatim Azerbaijani reasons (base sentence + tag, honest-empty states, flip `REPORT_SECTIONS[0]` live) — the visible milestone promise
- Chart overlay (ACTIVE bands + SWEPT dim + rank-1 highlight via existing price-line handles) — a map must project onto price
- Asia + dealing-range seed pools (pre-weighted, deduped) — intraday obvious stops the D1 scan misses, zero new detectors

**Should have (competitive / P2 after validation):**
- TP2 resolver wired to live ranked pool (nearest ACTIVE on trade side, honest Asia-extreme fallback) — closes a §5 promise
- Sentiment multiplier on `RetailExposure` contract (neutral 1.0 default, `genuine` flag) — keeps §1 structurally complete, fixture-honest
- 15M intraday swing pools (same `swings.ts` predicates) — only after D1 ranking proves stable
- Pool age/decay + re-accumulation — only when firing-log shows staleness
- Pain-map proximity tag on WHY NOW/ticket prose (read-only suffix, never a gate)

**Defer (v2+ / P3 / explicitly rejected for v3.1):**
- Exact stop-price prediction, auto-FIRE on pool touch, 5M microstructure pools, real sentiment API, heatmap rendering, LLM narrative, pool-gated trigger — see `FEATURES.md` anti-features; pools are read-only context, never a vote

### Architecture Approach

The terminal is a four-layer pipeline (poll legs → `ict/` pure → Zustand selectors → math-free render). The BSL/SSL map slots in as a **new projection layer inside `ict/`** — reads the NQ D1 leg, emits ranked inventory, fans out through the exact selector → report → chart seams §3 and §§4–6 already proved. One new module (BSL+SSL same scan, opposite polarity), no new leg, no new poll timer, no new chart primitive. See `ARCHITECTURE.md` for the system diagram and seven house patterns (imported swing predicates, trailing-cap, swept-resolved-outside, read-only trigger tag, refuse-null + sharedEpoch, §1 branch shape, Asia-pair lines).

**Major components:**
1. `src/lib/ict/liquidity-pools.ts` (NEW) — NQ swing inventory → BSL/SSL ranking + swept-vs-resting + verbatim reason; pure, injected candles + `asOf`, trailing cap
2. `store.ts selectPools` (NEW selector) — refuse-null on stale/empty NQ leg, `sharedEpoch`, try/catch-never-throw, composes `selectJudas`/`selectSMT` read-only
3. `report.tsx` §1 block (MODIFIED) — prints `selectPools` prose verbatim + `lastError` chain + skeleton/`Məlumat yoxdur` states, new `s1-*` slots
4. `nq-chart.tsx` + `chart-mapper.ts` (MODIFIED) — `poolLineInputs` guard + optional `pools` props, remove-then-create cycle, stale-desaturate, 4-line render cap (nearest-2-per-side)
5. `terminal-shell.tsx` (MODIFIED, wiring only) — stable-function subscription → derive during render → fan out to Report + NqChart
6. Feeders unchanged: `smt.ts` (swing donor), `judas.ts` (sweep truth), `fvg.ts` (inventory idiom), `range/levels/dol/bias/asia/regime` (anchors + scoring inputs); `trigger/ticket/invalidation` are read-only neighbors — explicitly non-integrated in v3.1

### Critical Pitfalls

Full catalog of 8 critical pitfalls in `PITFALLS.md`; top risks for roadmap planning:

1. **Wick-noise false pools** — naive pivot (k=1) yields 15–30 "pools" per 60 bars, §1 wall-of-pain, line soup. Avoid: reuse SMT `k=2` strict-inequality contract verbatim, ATR-merge adjacent pools, trailing cap, `closedOnly` + finite-guard. Fix in math, never hide with CSS.
2. **Swept-pool double-counting** — raided liquidity stays `active`; §1 warns about collected pain, ticket targets dead magnets, Judas+FVG+§1 triple-count one raid. Avoid: `active|swept|consumed` lifecycle (wick-pierce = swept, close-through = consumed, first-sweep-wins), single active-map source of truth.
3. **Integration misfire (trigger/flaw/ticket)** — 4th gate collapses FIRE rate, swept-BSL wired HARD downgrades best setups, SL at pool edge donates to stop-hunts. Avoid: pools read-only (agree-suffix max), no new flaw key (4-key table closed), SL beyond extreme + ATR buffer, same-`asOf` snapshot; parity harness asserts verdicts unchanged pools on/off.
4. **Timeframe mixing** — D1 pools + 15M sweeps + 1H displacement blended without labels; §1 contradicts §3. Avoid: D1-only pool module (`Candle[]` only, never `IntradayCandle`), timeframe token per §1 sentence, §1-vs-§3 parity test (§3 wins for execution).
5. **Overlay clutter + stale/thin ghosts + purity/verbatim regression** — 7th chart layer breaks byte-identical chrome; confident §1 over stale banner self-contradicts; clock/store imports trip `purity.test.ts`. Avoid: global budget ≤3/side, shared tokens, documented z-order; guarded snapshot (empty→null, stale→degraded, thin→0.5 dim); injected `asOf`, `toBe`-pinned fixed sentences, `proyeksiya` hedge + banned-word quarantine.

## Implications for Roadmap

Based on research, suggested phase structure (matches the pitfall-to-phase mapping all four files converge on):

### Phase 1: Pools Math (pure detection + lifecycle + guarded selector)
**Rationale:** Every downstream consumer (report, chart, calibration) reads the same ranked active-map; detector + lifecycle + selector contract must be pinned before any pixel ships. Forked swing logic is the #1 future-bug source.
**Delivers:** `src/lib/ict/liquidity-pools.ts` (+ tests: swing inventory → BSL/SSL split → proximity rank → trailing cap → verbatim reasons; boundary: empty, single-bar, equality-not-a-swing, unsorted, non-finite; lifecycle: sweep→swept, close-through→gone, no re-promotion) + shared `swings.ts` extraction (zero behavior change, `smt.test.ts` green as gate) + `selectPools` (refuse-null matrix, sharedEpoch, never-throws) + non-vote contract + same-`asOf` rule + `purity.test.ts` green from first commit.
**Addresses:** D1 detector, equal-weight clusterer, zone projection, sweep tracker, scorer, ATR tolerance + `POOL_MAP_BOUND`, stale/thin/rollover guards.
**Avoids:** Pitfalls 1 (wick-noise), 2 (double-count), 3 (timeframe wall), 6 (stale ghosts), 7-contract half, 8-purity half.

### Phase 2: §1 Live + Chart Overlay (report block + price lines + wiring)
**Rationale:** Math is verified in isolation; now project it onto the two surfaces users see. Report and chart read the same selector output — no independent swept-ness computation anywhere.
**Delivers:** `report.ts` §1 flip + `report.tsx` §1 branch (skeleton/empty/leg-error/live, `s1-*` slots, sentiment-crowded fusion, timeframe tokens, `proyeksiya` hedge + methodology caveat, verbatim `toBe` pins, banned-word quarantine) + `chart-mapper.ts poolLineInputs` + `nq-chart.tsx` lines (per-leg independence, ghost-line clearing, stale-dim, nearest-2-per-side cap, ticket-lines-on-top z-order, shared palette) + `terminal-shell.tsx` fan-out; Asia + range seed pools.
**Uses:** `createPriceLine` pairs, refuse-null prose fallback, thin-tier 0.5 dimming, byte-identical overlay test extension + visual-glance UAT with all layers + ticket open.
**Implements:** Architecture patterns 6 (§1 branch) + 7 (chart lines); overlay budget + z-order contract.
**Avoids:** Pitfalls 4 (clutter), 5 (overreach copy), 8-verbatim half; completes 3-timeframe tokens and 6-dimming.

### Phase 3: Execution Polish (calibration review, ticket UX buffers, firing-log analysis)
**Rationale:** Pools are live but display-only; polish proves they didn't corrupt execution and tunes the provisional constants with replay evidence. No math changes without replay data.
**Delivers:** WHY NOW threshold calibration review (firing-log JSON analysis; pools add context rows only per plan) + ticket UX micro-tuning (SL beyond extreme + ATR buffer, TP partials before extreme, derivation order untouched) + firing-log proof (FIRE-toward-consumed-pool = 0, 1–4/week band holds) + parity harness (pools on/off identical verdicts) + stale-matrix drill extended to §1 + §1-vs-§3 parity check + quarantine sweep. P2 candidates gated here: TP2-from-pools (after replay stability + parity updates), sentiment multiplier activation, 15M pools, age/decay, proximity tag — each behind its stated trigger.
**Addresses:** P2 feature queue per `FEATURES.md` triggers; ticket magnet-SL/TP fix.
**Avoids:** Pitfalls 7-proof half, calibration drift, ticket-UX magnet; verifies the full "Looks Done But Isn't" checklist (10 items).

### Phase Ordering Rationale

- **Dependencies dictate math-first:** detector → scorer → selector → report/chart → calibration is a strict chain (`FEATURES.md` dependency tree); Phase 2 copy and Phase 3 parity cannot exist before Phase 1 pins swing truth and lifecycle.
- **Architecture grouping keeps seams clean:** Phase 1 is pure + store (no render), Phase 2 is render + wiring (no math changes), Phase 3 is evidence + tuning (no derivation reorder) — step N+1 never re-opens step N's green tests (v3.0 17-plan discipline).
- **Pitfall prevention aligns with phases:** data-layer pitfalls (1, 2, 3, 6, 8-purity) belong to Phase 1 where tests are cheapest; presentation pitfalls (4, 5, 8-verbatim) belong to Phase 2 where copy/lines are reviewed; corruption pitfalls (7, drift) can only be *proven* absent in Phase 3 replay — the mapping table in `PITFALLS.md` is the phase-exit checklist.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (scorer constants):** ATR-merge multiple (~0.25–0.5×ATR), `EQUAL_TOL_BPS` (25 bps default), `dolBoost` 2.0 / behind-penalty 0.25 / sentiment 1.5 / decay half-life — all ship `CALIBRATION-PROVISIONAL` pending live observation; plan with `/gsd-plan-phase --research-phase` to lock the provisional set + boundary-test matrix.
- **Phase 3 (calibration + TP2):** TP2-from-pools resolver + firing-log acceptance band need replay-tape design (20-session precedent); use research-phase for harness + parity-assertion shape.

Phases with standard patterns (skip research-phase):
- **Phase 2 (report + overlay):** §3 branch copy, Asia-pair price-line cycle, remove-then-create + stale-dim + byte-identical extension are all exact precedents — standard build, review against checklist only.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified installed versions in node_modules (zustand 5.0.15, lightweight-charts 5.2.1, @base-ui/react 1.8.0 with slider/number-field present); price-line API confirmed vs official tutorial; "no new deps" precedent holds 3 milestones |
| Features | HIGH | Anchored in project domain authority (`institutional_rules.md` Modul 1.2 + §1/§2/§5) and verified `src/lib/ict` sources (smt/judas/fvg/asia/range/dol/trigger/report); ICT literature used for semantics only, thresholds marked provisional |
| Architecture | HIGH | Direct codebase reads (store, report, ticket, chart-mapper, nq-chart, terminal-shell); seams copy proven §3/§§4–6 envelopes; purity guard covers new file for free |
| Pitfalls | HIGH (codebase) / MEDIUM (methodology) | Codebase patterns verified line-level (smt:49-79, judas:134-160, fvg:85-169, invalidation:308-313, purity.test.ts); ICT BSL/SSL interpretation deliberately conservative (projection framing) |

**Overall confidence:** HIGH

### Gaps to Address

- **Provisional ranking constants:** merge-ATR multiple, equal-tolerance bps, DOL boost / behind-penalty / sentiment boost, decay half-life, `NEAR_ATR_MULT` — handle by exporting all multipliers + test-pinning defaults, scheduling Phase 3 calibration review against firing-log/replay; never hard-code silently.
- **Sentiment input while fixtures feed:** define the `RetailExposure { buyPct, sellPct, genuine }` contract in Phase 1, default multiplier neutral 1.0 with "Ssenari sentiment" provenance tag; real-feed swap stays mechanical (P3 anti-feature for now).
- **Intraday (15M) pools and pool-gated trigger:** explicitly deferred — 15M only after D1 ranking-stable, gating only with its own calibration band + population test; plan review must reject any "FIRE only if near BSL" proposal in v3.1.
- **Slider wrapper absence:** `components/ui/slider.tsx` does not yet exist (verified) — Phase 2/3 creates it from the installed primitive following the `button.tsx`/`dialog.tsx` recipe; no install step.

## Sources

### Primary (HIGH confidence)
- Codebase reads — `src/lib/ict/smt.ts` (swing predicates, SWING_K/LOOKBACK/TOL), `judas.ts` (sweep gates, first-wins), `fvg.ts` (inventory cap, mitigation, transition), `range/levels/dol/bias/asia/regime/amd/trigger/invalidation/types` (anchors, scoring inputs, fusion idioms), `store.ts` (selector envelopes, sharedEpoch, poll grid), `ticket.ts` (brokerage boundary, TP ladder), `report.ts`/`chart-mapper.ts`/`thin-tier.ts`, `terminal-shell.tsx`/`report.tsx`/`nq-chart.tsx`, `purity.test.ts`; `package.json` + node_modules version verification
- `reference/institutional_rules.md` — Modul 1.2 (Pain Threshold), §1/§2/§5 lines (BSL/SSL magnets, TP2 external)
- `.planning/PROJECT.md` + v3.0 research precedent (parity harness, stale drill, quarantine, 420/420 discipline)

### Secondary (MEDIUM confidence)
- Official lightweight-charts price-line tutorial — `createPriceLine({ price, color, lineWidth, lineStyle, axisLabelVisible, title })`
- ICT education literature (equal-high/low raids, BSL/SSL draw, sweep-then-displacement) — semantics only, never threshold authority

### Tertiary (LOW confidence)
- None — no finding in this synthesis rests on a single unverified source; all provisional numbers are flagged `CALIBRATION-PROVISIONAL` by convention.

---
*Research completed: 2026-09-15*
*Ready for roadmap: yes*
