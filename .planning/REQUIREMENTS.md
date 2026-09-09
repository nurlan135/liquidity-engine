# Requirements: Liquidity Engine — v3.0 Execution (Modul 4)

**Defined:** 2026-09-09
**Core Value:** Correct D1 Premium/Discount positioning on live NQ data — if the dealing-range math is wrong, nothing else matters.

## v1 Requirements

Requirements for v3.0 milestone. Each maps to roadmap phases. Continues numbering from v2.1 (EXEC-01..03, RPRT-01 were deferred placeholders — now specified).

### Debt Cleanup

- [x] **DEBT-01**: User sees no behavior change after dead `thinHistory` arg is removed from `nq-chart.tsx` zoneBands call (dimming still flows via opacityScale)
- [ ] **DEBT-02**: User benefits from clean thin-tier API — orphaned `thinTier` export and `ThinBannerEntry` type are unexported or documented, no external import breaks
- [ ] **DEBT-03**: New `ict/` files cannot violate purity — grep guard (test or lint) fails on `Date.now` or store imports inside `src/lib/ict`, green on existing code

### WHY NOW Trigger

- [ ] **TRIG-01**: User sees a FIRE_LONG / FIRE_SHORT / WAIT_FOR_MANIPULATION verdict from the three-gate engine (killzone timing + confirmed purge + displacement) with a verbatim Azerbaijani reason
- [ ] **TRIG-02**: User sees an ARMED intermediate state when some (not all) gates pass, with per-session cooldown/dedup preventing repeat-fire spam
- [ ] **TRIG-03**: User can inspect a firing log (capped ~50 entries, calibration-JSON export) recording each evaluation that reached ARMED or better
- [ ] **TRIG-04**: User gets honest calibration — all thresholds ship as exported `TRIGGER_*` constants pinned by tests with `CALIBRATION-PROVISIONAL` comments; pre-agreed acceptance band is 1–4 fires/week

### Fatal Flaw

- [ ] **FLAW-01**: User sees an invalidated/not verdict from `checkFatalFlaw` evaluated on the same snapshot as the trigger — flaw deterministically supersedes fire, never flickers
- [ ] **FLAW-02**: User sees HARD flaws (rollover/stale — kill the setup) distinguished from SOFT flaws (downgrade FIRING to ARMED with a stated unblock condition)
- [ ] **FLAW-03**: User reads a falsifiable fatal-flaw sentence plus a challenge question from a fixed bank in live report §6

### Paper Ticket

- [ ] **TICK-01**: User sees a paper ticket derived in fixed order — WHY NOW direction → OTE×FVG entry → invalidation SL → TP1/TP2/TP3 ladder → R/R ≥ 1:3 gate → EXECUTE / STAND ASIDE verdict
- [ ] **TICK-02**: User can set risk % and size inputs; ticket computes size as risk ÷ stop-distance and refuses with reason on degenerate inputs (zero stop distance, missing levels)
- [ ] **TICK-03**: User never mistakes paper for real — PAPER/SIMULATED vocabulary everywhere, persistent non-dismissible PAPER banner, banned-word test green (no Filled/Position/Submit Order/placeOrder identifiers)
- [ ] **TICK-04**: User sees live report §§4–6 blocks with verbatim reasons, three dashboard panels replacing the UNAVAILABLE cards, and chart trigger pin + entry/SL/TP lines

### Verification & Calibration

- [ ] **VERF-01**: Bar-by-bar replay test proves monotonic trigger/flaw transitions (no flicker) on a 20-session population fixture with ≥1 FIRING and ≥1 INVALIDATED
- [ ] **VERF-02**: User sees §3-vs-trigger reason parity — trigger prose never contradicts AMD/SMT state on the same snapshot
- [ ] **VERF-03**: Stale-serve drill with ticket open proves graceful degradation — numbers degrade visibly with provenance, never show full-strength ticket on stale/thin inputs

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Report

- **RPRT-01**: Pain Threshold map (§1 BSL/SSL projection) renders from dealing-range state — deferred to v3.1, independent of execution chain

### Execution Polish (P2)

- **EXEC-P2-01**: Confidence score (Timing 40 / sweep 35 / SMT 25 fixed weights + breakdown) — needs live fires to calibrate
- **EXEC-P2-02**: Paper-trade journal with outcome resolution (local-only, fuels calibration loop)
- **EXEC-P2-03**: Pre-news execution lock (fixture-fed calendar contract now, real feed later)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| 5M microstructure leg | Yahoo allowlist + zero budget forbid it; 15M-close-gated execution is honest scope (§4 copy must state it) |
| Real broker execution | Capital risk, API keys, scope blowup — anti-feature; paper labeled "Kağız — no broker" |
| LLM narration of signals | Determinism is a core principle; rule-based verbatim reasons only |
| Push alerts / multi-symbol tickets | Notification infra + multi-symbol scope beyond v3.0; poll loop unchanged |
| Martingale / position scaling controls | Risk-model scope creep; fixed risk-% sizing only |
| Pain Threshold feeding TP2 | v3.1 scope; TP ladder resolves from live FVG/Asia/DOL in v3.0 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEBT-01 | Phase 14 | Complete |
| DEBT-02 | Phase 14 | Pending |
| DEBT-03 | Phase 14 | Pending |
| TRIG-01 | Phase 15 | Pending |
| TRIG-02 | Phase 15 | Pending |
| TRIG-03 | Phase 15 | Pending |
| TRIG-04 | Phase 15 | Pending |
| FLAW-01 | Phase 16 | Pending |
| FLAW-02 | Phase 16 | Pending |
| FLAW-03 | Phase 16 | Pending |
| TICK-01 | Phase 17 | Pending |
| TICK-02 | Phase 17 | Pending |
| TICK-03 | Phase 17 | Pending |
| TICK-04 | Phase 17 | Pending |
| VERF-01 | Phase 18 | Pending |
| VERF-02 | Phase 18 | Pending |
| VERF-03 | Phase 18 | Pending |

**Coverage:**

- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---
*Requirements defined: 2026-09-09*
*Last updated: 2026-09-09 after initial definition*
