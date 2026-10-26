# Project Research Summary

**Project:** Liquidity Engine — Institutional Execution Terminal for NQ (v3.2 Pools P2)
**Domain:** ICT liquidity-engineering execution terminal (BSL/SSL pain-map → execution links, pure-selector + Zustand architecture)
**Researched:** 2026-10-26
**Confidence:** HIGH

## Executive Summary

This is a live institutional-grade NQ futures execution terminal that reads charts through ICT liquidity methodology, not retail patterns. v3.1 shipped the BSL/SSL pain map as read-only context (ranked pool inventory, §1 Pain Threshold block, chart overlays, parity proof that pools never vote). v3.2 Pools P2 closes the loop the terminal already promises: the §5 ticket prints "TP2: External BSL/SSL" from an Asia-extreme stand-in, buffers are harness-proven but never reach live `selectTicket`, and the pool map neither ages nor sees intraday structure.

The recommended approach is pure-function + selector-derivation work with zero new dependencies: lock pool-lifecycle/decay semantics first, then consume rank through price-only inputs into non-gate ticket legs (TP2 price, buffer insets), keep all prose additions as display-only suffixes, add the 15M second inventory last on an isolated path, and wire the live buffer only after every consumer is stable — re-proving the pools-never-vote parity harness at every step. The main risk is coupling: any pool input that reaches `evaluateTrigger`, `checkFatalFlaw`, or the TP1-only R/R gate silently converts a projection into a veto, breaks the 84-bar exact-match proof, and drifts the 1–4/week firing band. Mitigation is mechanical, not cultural: refuse pools params on vote-path signatures, extend the parity triple-match per feature, and keep decay on the scorer plane with stored weight immutable.

## Key Findings

**Stack:** Zero new dependencies — all six P2 features are pure-function + Zustand-selector work on the installed stack.
**Architecture:** Pure core + refuse-null selector + math-free render; pool prices cross into execution only as price inputs to non-gate legs, proven per feature by extending `pools-parity.test.ts`.
**Critical pitfall:** Pools silently voting on trigger/flaw verdicts — never add a `pools` param to `evaluateTrigger`/`checkFatalFlaw`.

### Recommended Stack

Zero new dependencies. All six P2 features are pure-function + Zustand-selector work on the installed stack (Next.js 16.3.4, React 19, Zustand 5.0.15, lightweight-charts 5.2.1, date-fns-tz, vitest). Every integration point already exists: the `TicketBufferInput` contract in `ticket.ts`, the ACTIVE/SWEPT/CONSUMED lifecycle in `pools.ts`, the `nq15m` leg in `store.ts`, `trueAvg` in `sentiment.ts`, and the `describePool` display-only precedent in `report.ts`. Upstream currency was browser-verified 2026-10-26 (installed == latest except one minor/patch delta each on next/zustand — no upgrades in P2 scope).

**Core technologies:**
- Next.js 16 App Router + React 19: app shell, `/api/yahoo` proxy, report panels — no routing/data change needed
- Zustand 5: every P2 feature lands as selector derivation or selector input; no new store slice needed
- lightweight-charts 5.2.1: 15M pools reuse the existing price-line-pair path, no new overlay primitive
- TypeScript strict + co-located `ict/` purity guard: enforcement mechanism for all new pool math (inject time, no clock, no store imports)
- vitest: every feature extends an existing suite (`pools.test.ts`, `pools-parity.test.ts`, ticket buffer matrix) — no new runner

### Expected Features

All six backlog items ship (dependencies, not priority — FEATURES.md). Table stakes: TP2-from-pools resolver (POOL2-01, closes the printed §5 promise), buffered live wiring (W12, harness-proven → live correctness), read-only proximity tag (POOL2-05, urgency context at near-zero risk), sentiment multiplier with neutral default (POOL2-02, completes Modul 1.2 §1 structure honestly under fixtures), age/decay + re-accumulation (POOL2-04, map stays alive), 15M intraday pools last (POOL2-03, explicit milestone sequencing after D1 stable). Differentiators: DOL-side-aware trade-side TP2 selection, parity discipline as a trust story, sandbox-knob extension, falsifiable §6 sentences naming the TP2 pool. Hard anti-features: magnet-to-the-line TP/SL, R/R-shopping across pools, pool-gated FIRE, auto-alerts on touch, 5M pools, live sentiment feed, heatmaps, LLM narrative.

**Must have (table stakes):**
- TP2 = nearest ACTIVE pool on trade side with buffered pullback, honest null fallback — closes the §5 promise
- W12 buffered ticket live wiring — magnet-to-the-line is the known-bad behavior the buffer exists to kill
- Proximity tag (read-only suffix) — urgency context that cannot flip verdicts by construction
- Sentiment multiplier (neutral 1.0 default, `genuine` flag) — structural completeness without fixture dishonesty
- Age/decay (scorer multiplier only) + re-accumulation via fresh-seed — §1 stops naming archaeology
- 15M pools (shared `swings.ts` predicates, source-tagged, jointly ranked) — intraday obvious stops, sequenced last

**Should have (competitive):**
- Calibration-sandbox knobs for decay half-life / `NEAR_ATR_MULT` / sentiment boost — operator what-if surface
- TP2-pool naming in §6 falsification sentences — closes §1 → §5 → §6 narrative loop

**Defer (v2+ / v4+):**
- 5M microstructure pools — only if 15M proves too coarse after calibration
- Real retail-sentiment feed — budget + determinism posture; contract-first keeps the swap mechanical
- Pool-gated trigger logic — explicitly rejected for P2; needs its own calibration band + population test

### Architecture Approach

Pure core + refuse-null selector + math-free render, governed by the pools-never-vote projection-context discipline: pool prices cross into execution only as price inputs to non-gate ticket legs (TP2 price, buffer insets), while gate legs (TP1, R/R, flaw precedence) never read pools — proven mechanically per feature by extending `pools-parity.test.ts`. New derivations resolve in `store.ts` selectors from already-derived outputs; components keep deriving during render and new prose stays in string formatters beside `describePool`.

**Major components:**
1. `src/lib/ict/pools.ts` — D1 inventory + POOL2-04 resolver/decay lifecycle home (MODIFY); `swings.ts` shared k=2 contract stays read-only
2. `src/lib/ticket.ts` + `src/lib/store.ts` selectors — buffer/TP2 pool-price consumption and all new derivations (MODIFY); trigger/invalidation stay pools-free (READ-ONLY)
3. `src/lib/report.ts` + `chart-mapper.ts` + dashboard components — display-only suffixes and prop fan-out, verbatim pass-through (MODIFY-additive / REUSE)
4. `pools-parity.test.ts` (+ `parity.test.ts` untouched anchor) — per-feature triple-match extension proving verdict stability

### Critical Pitfalls

Top risks from PITFALLS.md (10 documented; 5 drive phasing):

1. **Pools silently vote on trigger/flaw verdicts** — never add a `pools` param to `evaluateTrigger`/`checkFatalFlaw`; TP2 resolver is called in `selectTicket` AFTER flaw judgement; keep the parity test byte-stable as anchor.
2. **Magnet-to-the-line TP2** — TP-side extreme always resolves via `beforeExtreme` (0.10×ATR pullback); boundary test pins `tp2 === 20256`, never `20260`.
3. **R/R gate migrates from TP1 to TP2** — gate stays `|tp1 − entry| / stopDist ≥ 3`; TP2/TP3 stay nullable legs; pin `rr === 5` / `rr === 9` buffered rows.
4. **Age/decay mutates weight or re-promotes swept pools** — decay is a scorer-plane multiplier; stored `weight`/`touches` never change; SWEPT never re-enters rank; time is injected `asOf`, never `Date.now()`.
5. **W12 epoch skew (double derivation)** — one `sharedEpoch`, one trigger object, flaw on the identical object, buffer from the same closed-only window; live-vs-harness field-identity test at exit.

## Implications for Roadmap

Suggested 5-phase structure. This deliberately follows the PITFALLS.md pitfall-to-phase mapping (lifecycle first, W12 last), NOT the FEATURES.md "W12 first" sketch — rationale: TP2 pool legs need buffering from day one, but that is satisfied by implementing buffered-leg math inside the resolver phase with unit pins; the live selector connection (the epoch-skew risk) waits until every consumer is stable. One moving part per phase, parity re-proved at every gate.

### Phase 1: Pool-lifecycle purity + decay (POOL2-04)

**Rationale:** Decay semantics and eligibility must be locked before any consumer reads rank — this is the phase-ordering linchpin (PITFALLS P1/P4/P5/P6).
**Delivers:** ACTIVE-only eligibility predicate + status transition table locked; scorer-plane decay multiplier with CALIBRATION-PROVISIONAL half-life; weight-immutability + double-run determinism; stale/thin matrix pinned (NQ-stale → null, ES-stale → ticket-degraded, rankSkipped → unbuffered).
**Addresses:** POOL2-04 age/decay + re-accumulation; unblocks every later consumer.
**Avoids:** Weight-mutation decay, SWEPT re-promotion, swept/behind-price TP2, stale-leg laundering.

### Phase 2: TP2 resolver (POOL2-01, with buffered-leg math)

**Rationale:** Closes the printed §5 promise; runs between TP resolution and the TP1-only R/R gate with honest null fallback. Buffer math (`beforeExtreme` pullback) ships here as unit-pinned leg logic even though live selector wiring waits for Phase 5.
**Delivers:** Pure `resolveTP2(direction, rankedPools, entry)` (ACTIVE-only → trade-side → strictly-beyond-entry → nearest by ATR distance); TP2 leg override with pullback; TP1/TP3 + R/R gate byte-identical; swept/behind-price → null/structure fixtures.
**Uses:** Existing `TicketBufferInput` constants, `scoreAndRank` ordering idiom (no second ranking).
**Avoids:** Magnet-to-the-line TP2; R/R-gate migration to TP2.
**Implements:** Resolver beside `resolveTP` (or small `ict/` helper if methodology-owned — decide in planning).

### Phase 3: Read-only context (POOL2-02 + POOL2-05)

**Rationale:** Both are zero-voter-risk suffix work on already-derived outputs; pairable in one phase; natural prose-review companion to Phase 2.
**Delivers:** `describeProximity` suffix formatter (rank-1 + lastClose + regime ATR, throw-safe to empty string); `retailExposureMultiplier` pure function beside `sentiment.ts` with neutral-1.0 default + `genuine` flag; advisory-only consumption (prose suffix / sizing note, never gate/SL/TP input).
**Avoids:** Sentiment voting on verdicts/sizing; proximity text interpolated into verbatim `reason` fields (separate suffix field, zero `toBe` modifications, quarantine green).
**Uses:** `describePool` / `smtSuffix` display-only precedents.

### Phase 4: 15M intraday pools (POOL2-03)

**Rationale:** Explicit milestone sequencing — largest inventory change goes after D1 ranking + decay + resolver are calibration-stable, or two moving parts confound firing-log review.
**Delivers:** Separate `evaluateIntradayPools` path (shared k=2 predicates, own lookback/bound/cap — never reuse `SWING_LOOKBACK`/`POOL_MAP_BOUND` blindly); source-tagged inventory with merge/dedupe; joint ranking; D1 `selectPools` path byte-stable with Rank-1 snapshots unchanged by the diff.
**Avoids:** D1/15M contract unification, D1 ranking pollution, SMT `SWING_K` side effects.
**Implements:** NEW `selectPools15M` (stale → null, never touching `selectPools`); chart reuses `poolLineInputs` with independent 15M props.

### Phase 5: W12 buffered live wiring + full parity re-proof (LAST)

**Rationale:** The integration point with the highest skew risk (six derivations + ATR + extreme on one snapshot) lands last, when all consumers are pinned — exit proof is live-vs-harness identity, not unit tests (already proven in Phase 21).
**Delivers:** `selectTicket` builds `TicketBufferInput` from regime ATR + resolver-chosen trade-side extreme on the SAME epoch/closed window; null-degrades to unbuffered structure; single nearest-ACTIVE resolution shared between buffer and TP2; full 84-bar parity re-proof + stale-leg matrix + chart-line/panel agreement.
**Avoids:** Double `selectTriggerPure`/`sharedEpoch`, split-epoch buffer, component-layer buffer construction.

### Phase Ordering Rationale

- Lifecycle-before-consumers: eligibility, decay plane, and stale/thin matrix are the shared contract every later phase reads — lock them first or each consumer re-litigates them.
- Resolver before prose/15M: TP2 is the only P2 feature that moves money-relevant numbers; its gate isolation (TP1-only R/R, nullable legs) must be proven before advisory layers pile on.
- Read-only pair batches safely: sentiment + proximity touch no detector, lifecycle, ticket-gate, or trigger code, so they share a phase without interaction risk.
- 15M last among inventory work: new seeding source + merge/dedupe is the largest blast radius; D1 must be firing-log-stable first.
- Live wiring absolute last: selector-level epoch/provenance identity can only be proven against stable consumers; premature wiring forces re-proof per later phase.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 1 (decay calibration):** `DECAY_HALF_LIFE` (~10 bars provisional), decay functional form (multiplier vs `distAtr`-style penalty — ARCHITECTURE prefers scorer-side), and re-accumulation rule wording have no live evidence; plan must define the firing-log review loop, not just constants. Also resolve the D-18 shape-lock question (extend `LiquidityPool` with optional age field vs parallel age map).
- **Phase 2 (TP2 home + DOL interplay):** resolver placement (`ticket.ts` vs `ict/` helper) is undecided and affects the purity-guard surface; DOL-vs-pool precedence (min-structure cap on trade side) needs a recorded decision.
- **Phase 4 (15M constants):** intraday lookback/bound/cap and ATR unit are unchosen (26× bar-density difference vs D1); plan must seed provisional values under CALIBRATION-PROVISIONAL and define the D1 Rank-1 snapshot gate explicitly.

Phases with standard patterns (skip research-phase):

- **Phase 3 (proximity + sentiment):** `describePool`/`smtSuffix` suffix precedent + `trueAvg` 60%-rule contract are fully specified; copy the idiom.
- **Phase 5 (W12 wiring):** harness-proven contract + single-snapshot order + side-guard rules are all pinned; execution is connective, verification is the work.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions verified in `node_modules` + live npm registry 2026-10-26; zero-dep verdict follows directly |
| Features | HIGH | Codebase-anchored (pools/ticket/store/trigger/parity/report/sentiment/swings all read); MEDIUM only on external tooling norms (web search returned nothing usable — expectations anchored in Modul 1.2 + shipped idioms instead) |
| Architecture | HIGH | Code-read of all touch files; patterns (never-vote, pure+selector+render, suffix formatter) are proven by shipped code |
| Pitfalls | HIGH | Grounded in `pools.ts` lifecycle/scorer, 84-bar harness, ticket gate contract, selector guard asymmetry |

**Overall confidence:** HIGH

## Gaps to Address

- **Provisional constants lack live evidence:** decay half-life, `NEAR_ATR_MULT` (1.0), sentiment boost (1.5), 15M window/cap — handle via CALIBRATION-PROVISIONAL marking + firing-log band (1–4/week) review in planning/execution, never by tuning to make tests pass.
- **D-18 shape-lock resolution:** whether `LiquidityPool` may grow an optional age field or needs a parallel map — check the lock in Phase 1 planning before choosing.
- **TP2 resolver home:** `ticket.ts` beside `resolveTP` vs `ict/` methodology helper (purity-guard implications) — decide once in Phase 2 planning, document where.
- **Sentiment application plane:** scoring-plane (`selectPools`) vs §1 prose-plane — decide once in Phase 3 planning, keep out of vote paths either way.
- **Sandbox knobs + §6 TP2 naming:** deferred to v3.2.x validation triggers (constants survive calibration review; resolver stable on live replay) — not in P2 execution scope.

## Sources

### Primary (HIGH confidence)

- `src/lib/ict/pools.ts` — detector, lifecycle, `scoreAndRank`, D-04/D-06/D-10/D-18 rules
- `src/lib/ticket.ts` — fixed derivation order, `TicketBufferInput`, TP1-only R/R gate, verbatim reasons
- `src/lib/store.ts` — `selectPools` / `selectTicket` single-snapshot chain, `nq15m` leg, sandbox precedent
- `src/lib/ict/pools-parity.test.ts` — 84-bar pools-on/off exact-triple harness; `parity.test.ts` untouched anchor
- `src/lib/ict/trigger.ts` (`smtSuffix`), `src/lib/report.ts` (`describePool`), `src/lib/sentiment.ts` (`trueAvg` + 60% rule), `src/lib/ict/swings.ts` + `types.ts` (k=2 contract, D1 vs intraday split)
- `reference/institutional_rules.md` Modul 1.2 + §§1/2/5 — domain authority for pain semantics and TP2 promise
- `.planning/PROJECT.md` — milestone goal, targets, constraints (zero budget, Zustand-only, purity, no LLM)

### Secondary (MEDIUM confidence)

- ICT education literature (equal-high/low raids, ERL/IRL roles, sweep-then-displacement, HTF→intraday hierarchy) — semantics only, never threshold authority
- Browser-verified tooling norms 2026-10-26 (ictkillzone.com ERL/IRL + exits-in-front-of-pool; luxalgo.com untouched-vs-spent, proximity heatmaps, cross-TF ranking) — confirms shipped design choices

### Tertiary (LOW confidence)

- None relied upon. External web search returned no usable sources for FEATURES.md expectations; all ranking constants ship CALIBRATION-PROVISIONAL pending live observation by house convention.

---
*Research completed: 2026-10-26*
*Ready for roadmap: yes*
