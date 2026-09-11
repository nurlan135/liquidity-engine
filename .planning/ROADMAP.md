# Roadmap: Liquidity Engine — Institutional Execution Terminal for NQ

## Milestones

- ✅ **v1.0 Live Terminal** — Phases 1–3 + 03.1, 03.2 (shipped 2026-09-06)
- ✅ **v2.0 Modul 3 (Liquidity Sequencing & SMT)** — Phases 6–9 (shipped 2026-09-08)
- ✅ **v2.1 Cleanup & Polish** — Phases 10–13 (shipped 2026-09-09)
- 🔄 **v3.0 Execution (Modul 4)** — Phases 14–18 (in planning)

## Phases

### v3.0 Execution (Modul 4) — ACTIVE

- [x] **Phase 14: Audit Debt Cleanup + Purity Guard** - Dead code removed, purity grep guard green (completed 2026-09-10)
- [x] **Phase 15: WHY NOW Trigger Engine** - Three-gate FIRE/ARMED/QUIET verdict with firing log (completed 2026-09-11, verified PASS)
- [x] **Phase 16: Fatal-Flaw Invalidation** - Flaw-supersedes-fire on a shared snapshot, HARD/SOFT split (completed 2026-09-11)
- [ ] **Phase 17: Paper Ticket + §§4–6 Live UI + Chart Pins** - Deterministic ticket, live report blocks, PAPER chrome
- [ ] **Phase 18: Verification + Calibration Harness** - Replay monotonicity, reason parity, stale drill, fire-rate band

## Phase Details

### v3.0 Execution (Modul 4)

### Phase 14: Audit Debt Cleanup + Purity Guard

**Goal**: New execution code inherits a clean `ict/` surface — no dead args, no orphaned exports, purity enforced by a guard
**Depends on**: Nothing (first phase; mechanical cleanup, zero behavior change)
**Requirements**: DEBT-01, DEBT-02, DEBT-03
**Success Criteria** (what must be TRUE):

  1. Terminal renders identically after the dead `thinHistory` arg is removed (dimming still flows via opacityScale)
  2. Thin-tier API has no orphaned public surface — `thinTier` export and `ThinBannerEntry` type are unexported or documented, and no external import breaks
  3. A purity guard (test or lint) fails on `Date.now` or store imports inside `src/lib/ict` and passes green on existing code

**Plans**: 3 plans
Plans:

- [x] 14-01-PLAN.md — Narrow zoneBands signature, trim nq-chart call, shrink test literals (DEBT-01)
- [x] 14-02-PLAN.md — Unexport thinTier/ThinBannerEntry, migrate test pins to resolveThinTier (DEBT-02)
- [x] 14-03-PLAN.md — Co-located ict purity guard plus Asia fallback doc note (DEBT-03)

**Plans**: 3/3 plans complete

### Phase 15: WHY NOW Trigger Engine

**Goal**: Users get an honest "why now" verdict — FIRE only when killzone timing, confirmed purge, and displacement all agree
**Depends on**: Phase 14 (purity guard must be green before new `ict/` modules land)
**Requirements**: TRIG-01, TRIG-02, TRIG-03, TRIG-04
**Success Criteria** (what must be TRUE):

  1. User sees a FIRE_LONG / FIRE_SHORT / WAIT_FOR_MANIPULATION verdict from the three-gate engine (killzone timing + confirmed purge + displacement) with a verbatim Azerbaijani reason
  2. User sees an ARMED intermediate state when some (not all) gates pass, with per-session cooldown/dedup preventing repeat-fire spam
  3. User can inspect a firing log (capped ~50 entries, calibration-JSON export) recording each evaluation that reached ARMED or better
  4. All thresholds ship as exported `TRIGGER_*` constants pinned by boundary tests with `CALIBRATION-PROVISIONAL` comments; pre-agreed acceptance band is 1–4 fires/week

**Plans**: 3/3 plans complete
**Wave 1**

- [x] 15-01-PLAN.md — Tracer: pure evaluateTrigger core plus minimal selectTrigger and firing log (TRIG-01, TRIG-04)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 15-02-PLAN.md — ARMED matrix plus cooldown plus FVG downgrade plus boundary throws (TRIG-01, TRIG-02)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 15-03-PLAN.md — Verbatim prose plus log serializer plus store tests plus calibration pins (TRIG-02, TRIG-03, TRIG-04)

### Phase 16: Fatal-Flaw Invalidation

**Goal**: Users never act on a setup that a fatal flaw already killed — invalidation supersedes fire on the same snapshot
**Depends on**: Phase 15 (flaw-wins ordering needs the real trigger snapshot, not a parallel-diverged shape)
**Requirements**: FLAW-01, FLAW-02, FLAW-03
**Success Criteria** (what must be TRUE):

  1. User sees an invalidated/not verdict from `checkFatalFlaw` evaluated on the same snapshot as the trigger — flaw deterministically supersedes fire, never flickers
  2. User sees HARD flaws (rollover/stale — kill the setup) distinguished from SOFT flaws (downgrade FIRING to ARMED with a stated unblock condition)
  3. User reads a falsifiable fatal-flaw sentence plus a challenge question from a fixed bank in live report §6

**Plans**: 3 plans
Plans:
**Wave 1**

- [x] 16-01-PLAN.md — Tracer: pure checkFatalFlaw core plus disjunction tests plus selectFatalFlaw (FLAW-01, FLAW-02)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 16-02-PLAN.md — Sentence table plus challenge bank prose lock plus store selector cases (FLAW-01, FLAW-03)

**Gap closure** *(independent — wave 1, touches only invalidation.ts header plus invalidation.test.ts title plus store.test.ts)*

- [x] 16-03-PLAN.md — SMT SOFT proven live plus opposite-sweep impossibility documented (FLAW-02)

### Phase 17: Paper Ticket + §§4–6 Live UI + Chart Pins

**Goal**: Users see the full execution picture — deterministic paper ticket, live §§4–6, chart pins — that can never be mistaken for real brokerage
**Depends on**: Phase 16 (SL is an input to R/R and R/R gates EXECUTE — the derivation chain has exactly one honest order)
**Requirements**: TICK-01, TICK-02, TICK-03, TICK-04
**Success Criteria** (what must be TRUE):

  1. User sees a paper ticket derived in fixed order — WHY NOW direction → OTE×FVG entry → invalidation SL → TP1/TP2/TP3 ladder → R/R ≥ 1:3 gate → EXECUTE / STAND ASIDE verdict
  2. User can set risk % and size inputs; ticket computes size as risk ÷ stop-distance and refuses with reason on degenerate inputs (zero stop distance, missing levels)
  3. User never mistakes paper for real — PAPER/SIMULATED vocabulary everywhere, persistent non-dismissible PAPER banner, banned-word test green (no Filled/Position/Submit Order/placeOrder identifiers)
  4. User sees live report §§4–6 blocks with verbatim reasons, three dashboard panels replacing the UNAVAILABLE cards, and chart trigger pin + entry/SL/TP lines

**Plans**: 4 plans
**UI hint**: yes
Plans:
- [ ] 17-01-PLAN.md — Tracer: pure computeTicket plus ticketInputs plus selectTicket (TICK-01, TICK-02)
- [ ] 17-02-PLAN.md — Banned-word quarantine plus REPORT_SECTIONS 4-6 live flip (TICK-03, TICK-04)
- [ ] 17-03-PLAN.md — Three thin panels plus §§4-6 blocks plus PAPER banner plus shell wiring (TICK-04, TICK-03)
- [ ] 17-04-PLAN.md — Chart T pin plus entry/SL/TP lines with STAND ASIDE clearing (TICK-04)

### Phase 18: Verification + Calibration Harness

**Goal**: Users can trust the execution layer's rates and cross-cutting honesty — fire band, kill rate, reason parity, stale degradation all proven on integrated pieces
**Depends on**: Phase 17 (rate correctness and parity are population properties visible only once all pieces are integrated)
**Requirements**: VERF-01, VERF-02, VERF-03
**Success Criteria** (what must be TRUE):

  1. Bar-by-bar replay test proves monotonic trigger/flaw transitions (no flicker) on a 20-session population fixture with ≥1 FIRING and ≥1 INVALIDATED
  2. User sees §3-vs-trigger reason parity — trigger prose never contradicts AMD/SMT state on the same snapshot
  3. Stale-serve drill with ticket open proves graceful degradation — numbers degrade visibly with provenance, never a full-strength ticket on stale/thin inputs

**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 14. Audit Debt Cleanup + Purity Guard | 0/0 | Not started | - |
| 15. WHY NOW Trigger Engine | 0/0 | Not started | - |
| 16. Fatal-Flaw Invalidation | 0/0 | Not started | - |
| 17. Paper Ticket + §§4–6 Live UI + Chart Pins | 0/0 | Not started | - |
| 18. Verification + Calibration Harness | 0/0 | Not started | - |

<details>
<summary>✅ v1.0 Live Terminal (Phases 1–3 + 03.1, 03.2) — SHIPPED 2026-09-06</summary>

- [x] Phase 1: Data Foundation & ICT Core (3/3 plans) — completed 2026-09-06 (retroactive gate 10/10 via 03.2)
- [x] Phase 2: Terminal Composition (4/4 plans) — completed 2026-09-05
- [x] Phase 3: Production Deploy & Verification (4/4 plans) — completed 2026-09-06
- [x] Phase 03.1: Close gap ICT-07 banner (1/1, INSERTED) — completed 2026-09-06
- [x] Phase 03.2: Close gap Phase 1 gate + ICT-01/02 + W1/W2/F2 (4/4, INSERTED) — completed 2026-09-06

Full detail: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v2.0 Modul 3 (Phases 6–9) — SHIPPED 2026-09-08</summary>

- [x] Phase 6: Dual-Symbol Proxy + Data Contracts (5/5 plans) — completed 2026-09-07
- [x] Phase 7: SMT + 4H/1H Sequencing Math (3/3 plans) — completed 2026-09-07
- [x] Phase 8: AMD Sessions (Asia Range + Judas) (3/3 plans) — completed 2026-09-07
- [x] Phase 9: Composition (§3 Live + Overlays + Verify) (3/3 plans) — completed 2026-09-08 (visual glance re-verify PASS, human-confirmed)

Full detail: `.planning/milestones/v2.0-ROADMAP.md`

</details>

<details>
<summary>✅ v2.1 Cleanup & Polish (Phases 10–13) — SHIPPED 2026-09-09</summary>

- [x] Phase 10: Type Safety Fix (1/1 plans) — completed 2026-09-08
- [x] Phase 11: Chart Rendering Polish (1/1 plans) — completed 2026-09-08
- [x] Phase 12: Deployment Hygiene (3/3 plans) — completed 2026-09-09
- [x] Phase 13: Thin History Honesty (2/2 plans) — completed 2026-09-09

Full detail: `.planning/milestones/v2.1-ROADMAP.md`

</details>
