# Project Research Summary

**Project:** Liquidity Engine v3.0 Execution (Modul 4)
**Domain:** Deterministic ICT execution layer (WHY NOW trigger + fatal-flaw invalidation + paper order ticket) on a live NQ terminal
**Researched:** 2026-09-09
**Confidence:** HIGH

## Executive Summary

Liquidity Engine v3.0 adds an execution layer to an already-live deterministic ICT observation terminal (Next.js 16, Zustand 5, lightweight-charts v5, pure `src/lib/ict`). The terminal already computes everything execution needs — Judas sweeps, SMT divergence, AMD phase, dealing-range/OTE levels, FVG inventory, DOL targets. v3.0 therefore invents no new data pipeline: WHY NOW is a pure three-gate fusion (killzone timing + liquidity purge + displacement urgency) over existing detector outputs, fatal-flaw is a disjunction of invalidation predicates over the same snapshot, and the paper ticket is deterministic arithmetic (OTE x FVG entry, structural SL, TP1/TP2/TP3 ladder, R/R >= 1:3 gate).

The recommended approach is brownfield-only with zero new dependencies: two new pure modules in `src/lib/ict` (`trigger.ts`, `invalidation.ts`), one selector-level module beside `confluence.ts` (`ticket.ts`), three derived Zustand selectors sharing one `asOf` epoch, three thin render panels replacing the `UNAVAILABLE` cards, and marker/price-line reuse in `nq-chart.tsx`. Thresholds ship as named, exported, test-pinned constants with `CALIBRATION-PROVISIONAL` comments — the headline known risk is that WHY NOW thresholds are uncalibrated (live observation was deferred in v2.0), so the milestone must ship the firing-log hook in the same phase as the trigger and a pre-agreed acceptance band (1-4 fires/week), not tuned constants.

The key risks are rate-not-boolean correctness (spam vs. permanent QUIET), trigger/invalidation flicker from split snapshots, paper-taken-for-real confusion, and purity debt (Phase 1 dead `thinHistory` arg + orphaned export must be cleaned first). Mitigations are structural: conjunctive gating with an ARMED tier, one shared evaluation snapshot with flaw-supersedes-fire ordering and HARD/SOFT classification, vocabulary quarantine with persistent PAPER chrome, and a no-clock/no-store grep guard on new `ict/` files.

## Key Findings

### Recommended Stack

No new dependencies. The installed stack (Next 16.3.4, React 19, Zustand 5.0.15, lightweight-charts 5.2.1, `@base-ui/react` 1.8.0 with slider + number-field present, vitest) already covers every v3.0 capability. The only new file-not-package is `components/ui/slider.tsx` composed from the installed Base UI slider for threshold calibration.

**Core technologies:**
- `src/lib/ict` pure functions (`trigger.ts`, `invalidation.ts`) — WHY NOW fusion + flaw disjunction over detector outputs, injected `asOf` — because purity is what made 298 v1/v2 tests green
- Zustand derived selectors (`selectTrigger`, `selectFatalFlaw`, `selectTicket`) — derivation, never stored state, so trigger can never desync from detectors
- Store-field thresholds + Base UI slider wrapper — calibratable sensitivity with zero new installs
- Existing `dialog`/`card`/`button`/`toast` primitives — paper ticket modal + WHY NOW fire toast with zero new plumbing
- lightweight-charts v5 `createSeriesMarkers` + `createPriceLine` — trigger/flaw pins + entry/SL/TP lines on existing handles
- Manual `localStorage` helpers — ticket/threshold persistence without the zustand `persist` SSR rehydration trap

### Expected Features

Spec authority is `reference/institutional_rules.md` Modul 4 + report §§4-6. Direction: 15M-close-gated execution (no 5M leg — Yahoo allowlist + zero budget); NY-session sweep handling and the 15M-vs-5M scope call must be settled in the first build phase.

**Must have (table stakes):**
- WHY NOW three-gate engine (killzone timing + purge + displacement) → FIRE_LONG / FIRE_SHORT / WAIT_FOR_MANIPULATION with verbatim reasons
- Killzone timing gate (TIME>PRICE: London + NY AM/PM windows, `nyMinutesOf` discipline)
- Liquidity-purge gate (confirmed Judas sweep; candidate-only holds the gate)
- Displacement/urgency gate returning the entry-FVG handle the ticket consumes
- Hard invalidation level + structural rationale (SL input, deterministic rule table)
- Paper order ticket derivation (OTE x FVG entry, SL, TP1/TP2/TP3, R/R ≥ 1:3 gate, EXECUTE / STAND ASIDE verdict)
- Fatal-flaw sentence + challenge question (falsifiable §6)
- STAND ASIDE as first-class output with failing-gate reason on every path
- Calibratable threshold constants (killzones, displacement multiple, confidence weights, R/R floor) shipped provisional

**Should have (competitive):**
- Confidence score (Timing 40 / sweep 35 / SMT 25 fixed weights + breakdown) — P2, needs live fires to calibrate
- TP ladder auto-resolved from live FVG/Asia/DOL outputs
- OTE x FVG entry-zone confluence refinement
- Pre-news execution lock (fixture-fed calendar contract in v3.0, real feed later)
- Paper-trade journal + outcome resolution (local-only, fuels calibration loop)

**Defer (v2+ / v4+):**
- 5M microstructure leg — only if 15M proves too coarse after calibration
- Pain Threshold map feeding TP2 — already v3.1 scope
- Real broker execution — anti-feature for v3.0 (capital risk, keys, scope blowup); paper labeled "Kağız — no broker"
- LLM narration, push alerts, multi-symbol tickets, martingale controls — all explicitly rejected

### Architecture Approach

Copy the proven v2.0 §3 pipeline exactly: pure detector → pure fuser → store selector with refuse-null envelope → verbatim prose render. v3.0 adds no layers, no routes, no poll legs — only new pure modules + selectors + panels inside existing ones. Ticket math lives in `src/lib/ticket.ts` outside `ict/` (brokerage math, not ICT methodology — same precedent as `confluence.ts`), keeping a future `ict/` extraction clean.

**Major components:**
1. `src/lib/ict/trigger.ts` — `evaluateTrigger({ judas, amd, smt, regime, asOf })` + exported `TRIGGER_*` constants
2. `src/lib/ict/invalidation.ts` — `checkFatalFlaw(input)` disjunction with HARD/SOFT classes, flaw-wins ordering
3. `src/lib/ticket.ts` — `computeTicket()` entry/SL/TP/R-multiple/size derivation, null unless trigger fired
4. Store selectors + shared `asOf` helper — `selectTrigger`/`selectFatalFlaw`/`selectTicket` with try/catch-never-throw, stale-refuse envelopes
5. `ExecutionProtocol` / `TicketPanel` / `FatalFlaw` components — thin math-free renders replacing the three `UNAVAILABLE` cards; §4/§5/§6 flip live in `report.ts`/`report.tsx`
6. `NqChart` props-only extension — trigger pin + ticket lines via existing marker/price-line handles; bar-date mapping at caller

### Critical Pitfalls

1. **Uncalibrated thresholds (zero live observation)** — ship named/exported/test-pinned constants with `CALIBRATION-PROVISIONAL` comments + firing log in the SAME phase; pre-agree 1–4 fires/week band; boundary tests (just-below → WAIT, just-above → FIRE)
2. **False-signal spam / wallpaper badge** — conjunctive gating (all three gates), closed-candle-only inputs, per-session cooldown/dedup, FIRING/ARMED/QUIET tiers; choppy-sideways fixture must yield QUIET
3. **Invalidation racing the signal (flicker)** — single `evaluateSetup({ detectors, invalidation, asOf })` snapshot, flaw evaluated after trigger on identical inputs and supersedes deterministically, closed-candle hysteresis, bar-by-bar replay test with monotonic transitions
4. **Paper ticket mistaken for real execution** — vocabulary quarantine (PAPER/SIMULATED, ban Filled/Position/Submit Order), persistent non-dismissible PAPER banner, `PaperFill`/`SimulatedTicket` air-gap types with zero `broker`/`placeOrder` identifiers, print slippage assumptions
5. **Purity violations + logic fork** — new `ict/` files take detector outputs + `asOf` only (no `Date.now`, no store imports), grep guard in CI; trigger consumes `JudasOutput`/`SmtOutput`/`AmdOutput` types, never re-implements swings; Phase 1 debt cleanup runs first
6. **Permanent QUIET (over-broad flaws) + false-precision ticket** — HARD (rollover/stale, kills) vs SOFT (downgrade to ARMED with unblock condition) split + kill-rate budget (~50% of ARMED max) + 20-session population test (≥1 FIRING and ≥1 INVALIDATED); ticket refuses or degrades visibly on stale/thin inputs with provenance line

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Audit Debt Cleanup + Purity Guard
**Rationale:** Cheapest phase; removes broken-window patterns before new code copies them, and installs the guard all later phases inherit.
**Delivers:** Dead `thinHistory` arg removed, orphaned thin-tier export/type removed, no-clock/no-store grep guard (test or lint) green, existing `store.test.ts` green as mechanical-edit gate.
**Addresses:** v2.1 audit debt items from PROJECT.md.
**Avoids:** Purity violations (Pitfall 5), detector-fork review debt.

### Phase 2: WHY NOW Trigger Engine (Pure Math + Firing Log)
**Rationale:** Core v3.0 promise; everything downstream (flaw ordering, ticket SL/R/R, §4 copy) consumes its output shape. Settles the 15M-gating + NY-sweep scope decision first.
**Delivers:** `trigger.ts` (three gates, `TRIGGER_*` provisional constants, boundary validation), `trigger.test.ts` (gate table + threshold pins + choppy-QUIET fixture), `selectTrigger` with shared `asOf` helper, firing log (capped ~50, calibration-JSON export), ARMED tier + cooldown/dedup.
**Addresses:** WHY NOW engine, killzone/purge/displacement gates, calibratable-threshold convention.
**Avoids:** Uncalibrated-threshold drift, spam/wallpaper, logic fork (signature review: detector-output types only).
**Uses:** Pure `ict/` fusion, `nyMinutesOf` wall-clock discipline, `yüksək inam` conviction tier as default fire gate.

### Phase 3: Fatal-Flaw Invalidation (Shared Evaluation)
**Rationale:** Must be built against the real trigger snapshot, not in parallel-divergence — flaw-wins ordering and HARD/SOFT split only make sense on shared inputs.
**Delivers:** `invalidation.ts` (`checkFatalFlaw`, HARD/SOFT classes, specific reasons + unblock conditions), single evaluation contract (one `asOf`, one snapshot, flaw supersedes), `selectFatalFlaw`, race + freshness-split + determinism tests, population test fixture.
**Addresses:** Hard invalidation level + rationale, fatal-flaw sentence + challenge question (§6).
**Avoids:** Trigger/invalidation flicker, permanent-QUIET terminal.
**Implements:** `evaluateSetup` ordering rule, hysteresis on closed candles.

### Phase 4: Paper Ticket + §§4–6 Live UI + Chart Pins
**Rationale:** Ticket derivation order is WHY NOW → invalidation → targets → R/R → verdict → confidence; UI can only be honest once that chain is pinned. Vocabulary/banner discipline belongs with the UI that users screenshot.
**Delivers:** `ticket.ts` (OTE×FVG entry, SL from invalidation, TP ladder resolvers, R/R gate, size = risk ÷ stop-distance with refuse-on-degenerate), `selectTicket` (null unless FIRING + all inputs live), `ExecutionProtocol`/`TicketPanel`/`FatalFlaw` panels, §§4–6 live blocks with verbatim reasons, ticket CTA enabled only in FIRING, persistent PAPER banner + banned-word test, chart trigger pin + entry/SL/TP lines, freshness-degraded ticket mode with provenance.
**Addresses:** Paper ticket derivation, report §§4–6 surface, ticket UI panel.
**Avoids:** Paper-as-real confusion, false precision on stale/thin inputs, component-level math.
**Uses:** Existing dialog/card/button/toast/slider primitives, `createSeriesMarkers`/`createPriceLine` handles, manual localStorage helpers.

### Phase 5: Verification + Calibration Harness
**Rationale:** Rate correctness (fire band, kill rate) and cross-cutting parity can only be checked with all pieces integrated; no new intervals/poll changes without load proof.
**Delivers:** Bar-by-bar replay monotonicity test, §3-vs-trigger reason-parity test, stale-serve drill with ticket open (numbers degrade), screenshot 3-second "paper" test, marker-reuse + single-selector review, ≥60s poll cadence held, calibration band + kill-rate review against firing log, P2 scoping call (confidence score, journal, pre-news lock).
**Avoids:** Cross-cutting integration gotchas (report parity, overlay mapping, store shape, poll cadence), performance traps (unbounded evaluation/log, marker rebuild).

### Phase Ordering Rationale

- Debt cleanup first because every later phase copies `ict/` conventions — a dead arg today becomes three dead args tomorrow.
- Trigger before invalidation because flaw-wins ordering needs a real trigger snapshot; parallel-diverged builds are the documented cause of flicker.
- Invalidation before ticket because SL is an input to R/R and R/R gates EXECUTE — the derivation chain has exactly one honest order.
- UI last among build phases because honesty chrome (banner, vocabulary, degraded mode, CTA gating) must wrap the final derivation shapes, not placeholders.
- Verification as its own phase because fire-rate, kill-rate, and parity are population properties invisible to per-function unit tests.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** 15M-vs-5M scope decision + NY-session sweep semantics + displacement-multiple calibration approach — domain judgment with sparse authority (no official ICT spec); consider `/gsd-plan-phase --research-phase` for the ICT-semantics half, not the pure-function mechanics.
- **Phase 3:** HARD/SOFT flaw taxonomy and hysteresis design — methodology call, same sparse-authority caveat; keep research tight, decide fast, measure via population test.
- **Phase 5:** Calibration-band methodology (how §3-vs-market notes map to constant changes) — process design, light research.

Phases with standard patterns (skip research-phase):
- **Phase 1:** mechanical dead-code removal + grep guard — fully codebase-determined.
- **Phase 4:** dialog/card/toast/slider composition, price-line/marker reuse, localStorage helpers — all proven installed-pattern work.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against node_modules (zustand 5.0.15, lw-charts 5.2.1, Base UI slider/number-field dirs) + store/chart/toast/report source reads; v2.0 "no new deps" precedent transfers |
| Features | HIGH | Anchored in project domain authority (`institutional_rules.md` Modul 4 + §§4–6) with source-level inventory of every consumed output; only open call is the 15M/5M scope decision, explicitly flagged |
| Architecture | HIGH | Direct read of store, amd/confluence/report/chart/terminal-shell/yahoo-route sources; every new piece maps to a named precedent (selectAMD, S3 verbatim, buildOverlayMarkers, overlayStale) |
| Pitfalls | HIGH/MEDIUM split | HIGH for purity/store/chart/stale mechanics (proven across v1.0–v2.1 in this repo); MEDIUM for trigger/invalidation ICT semantics (education sources, no official spec) and uncalibrated-rate risk (deferred observation) |

**Overall confidence:** HIGH

### Gaps to Address

- **Uncalibrated WHY NOW thresholds (known, accepted):** ship as named `CALIBRATION-PROVISIONAL` constants + firing log + 1–4/week band; resolve during 2–4 weeks of live observation, one constant per cycle, never mid-week on vivid memory.
- **15M-vs-5M execution granularity:** settle in Phase 2 kickoff — recommended 15M-first (no new Yahoo leg, matches `SWING_K` idiom); §4 copy must state 15M-close-gated honestly.
- **NY-session sweep definition for the purge gate:** London path reuses Judas directly; decide whether NY needs its own sweep detector or reuses the same gate before trigger tests are pinned.
- **Confidence weights + journal + pre-news calendar:** deliberately P2 — need stable FIRE events and a calendar input contract first; fixtures keep v3.0 honest meanwhile.

## Sources

### Primary (HIGH confidence)
- Codebase reads: `src/lib/store.ts`, `src/lib/ict/{amd,judas,smt,levels,range,bias,dol,fvg,asia}.ts`, `src/lib/{confluence,report}.ts`, `components/{dashboard/terminal-shell,dashboard/report,charts/nq-chart,ui/toast,dialog,button}.tsx`, `app/page.tsx`, `app/api/yahoo/route.ts`, `package.json` + node_modules version/dir verification
- `reference/institutional_rules.md` Modul 4 + report §§4–6 — three gates, WAIT default, 5M/15M invalidation, ticket schema, R/R ≥ 1:3, fatal-flaw sentence
- PROJECT.md v3.0 scope — Phase 1 debt items, paper-only, calibratable thresholds, purity + Baku-TZ + zero-budget constraints
- v1.0/v2.0/v2.1 shipped lessons — singleflight + per-leg stale, `closedOnly`, joint rollover suppression, thin-tier banner + 0.5 dimming, `useShallow` loop fix, ANCHOR_WINDOW discipline

### Secondary (MEDIUM confidence)
- ICT education literature (LuxAlgo / innercircletrader / Flux Charts) — SMT matched-swings semantics, WHY NOW / displacement / invalidation concepts as encodable semantics, not threshold authority
- Signal-design practice — conjunctive gating + ARMED tier + blocked-signal transparency against alert fatigue
- Trading-systems practice — simulated-fill assumption printing, paper/execution vocabulary separation

### Tertiary (LOW confidence)
- None — no LOW-confidence source drives a roadmap decision; all thresholds are explicitly provisional pending live observation.

---
*Research completed: 2026-09-09*
*Ready for roadmap: yes*
