# Requirements: Liquidity Engine — v2.0 Modul 3

**Defined:** 2026-09-06
**Core Value:** Correct D1 Premium/Discount positioning on live NQ data — if the dealing-range math is wrong, nothing else matters.

## v2 Requirements (v2.0 Modul 3)

Requirements for milestone v2.0 Modul 3 (Liquidity Sequencing & SMT). Each maps to roadmap phases.

### Data Feed (dual-symbol + intraday)

- [x] **DATA-04**: User receives ES=F daily candles via parameterized `GET /api/yahoo?symbol=&interval=` proxy with per-combo cache keys, allowlists, singleflight (NQ pipe untouched)
- [x] **DATA-05**: User receives NQ + ES intraday candles (1H and 15M) with intraday epoch contract — forming candle excluded, pre-join incomplete rows dropped, coverage diagnostics surfaced
- [x] **DATA-06**: Dual-symbol polling is staggered (NQ :00 / ES :30 + jitter) with per-symbol stale envelopes — SMT refuses when either leg is stale, never merged `stale` boolean
- [x] **DATA-07**: NQ/ES candles are timestamp inner-joined before any cross-symbol comparison — no index-zipped alignment, misaligned rows never compared

### ICT Math Core (Modul 3)

- [ ] **ICT-08**: User sees SMT divergence status (NQ vs ES, time-anchored matched swing pairs, bps tolerance) — BULLISH / BEARISH / NO-SIGNAL with swing references in output, correlation-regime gate suppresses when pair decouples
- [ ] **ICT-09**: Rollover-week fake SMT is suppressed — cross-symbol signals blocked when either leg is rollover-suspect (v1.0 tripwire reused on both symbols)
- [ ] **ICT-10**: User sees FVG map + ERL/IRL transition state (FVG-only IRL) — transitions fire only on sweep-then-reject, never on sweep alone; §2 Delivery Cycle upgraded
- [ ] **ICT-11**: 4H structure is synthesized from 1H NY-anchored blocks in pure `aggregate.ts` (Yahoo has no 4H interval) — injected time, `closedOnly` discipline
- [ ] **ICT-12**: User sees Asia Range (IANA `America/New_York` wall-clock, 19:00–00:00 NY, Baku display at edge) — March + November + maintenance-break DST tests green
- [ ] **ICT-13**: User sees London Judas Swing with three-gate conjunction (in-killzone AND swept-Asia-extreme AND reversal-with-displacement) — candidates hollow vs confirmed solid, ≤25% confirmed sessions over 60 days
- [ ] **ICT-14**: User sees AMD phase classifier (accumulation / manipulation / distribution) fusing range + Judas + SMT state — NY shown as Gözlənilir until its detector lands
- [ ] **ICT-15**: SMT+Judas confluence boosts confidence score — highest-conviction setup when both confirm, rule-based, no fake precision

### Terminal UI (§3 live + overlays)

- [ ] **UI-05**: User sees live report §3 (Engineered Liquidity Path, SMT Divergence Status, Session AMD Timing) — every degraded state renders its reason, missing detector families keep unavailable markers (partial-honest)
- [ ] **UI-06**: User sees Asia Range overlay on chart (lightweight-charts v5 primitive, null-autoscale) + Judas/SMT pins via series markers — ES stays off-chart initially

### Deployment

- [ ] **DEPLOY-02**: v2.0 deployed on Vercel Hobby with per-leg verify — ES cold-start drill, intraday payload under `maxDuration`, §3 render check on live URL

## Future Requirements (v2.x / v3+)

Deferred. Tracked but not in current roadmap.

### Modul 3 follow-ons

- **STRUCT-02**: Engineered-liquidity path visualization (equal highs/lows, inducement pools)
- **STRUCT-03**: Displacement / FVG quality grading (Defended vs Weak/Breakaway)
- NY-open Judas detector (after London confirms on live data)
- AMD history + NY-afternoon distinction
- Full IRL taxonomy (OB/breaker/BPR)

### Modules 4 (Execution)

- **EXEC-01**: WHY NOW 3-gate execution trigger (killzone + purge + delivery)
- **EXEC-02**: Micro-structure invalidation level automation
- **EXEC-03**: Pain-threshold mapping (retail stops → chart zones)
- **STRUCT-01** (done in v2.0 as ICT-08 — promote to validated after ship)

### Real Integrations

- **INT-01**: Real sentiment API integration replacing fixtures
- **INT-02**: Real calendar API integration replacing fixtures

### Product Surface

- **PROD-01**: Multi-symbol support beyond NQ/ES (charted symbols)
- **PROD-02**: Backtesting engine
- **PROD-03**: Alerts / push / mobile surface

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| LLM-generated analysis or narratives | Non-deterministic output violates determinism core principle; hallucinates levels, costs money on zero budget |
| NY Judas detector in v2.0 | London skeleton first; NY tuned after London confirms on live data — NY stays Gözlənilir |
| Intraday SMT in v2.0 | Daily SMT first; intraday SMT only after daily comparator proves honest on live URL |
| Full IRL taxonomy (OB/breaker/BPR) | FVG-only IRL keeps v2.0 survivable; rest is Modul 4 scope |
| Footprint / DOM / volume-profile order-flow | ICT reads liquidity from candles, not exchange delta; no zero-budget futures order-flow source |
| Auth, accounts, saved workspaces | No user-specific value; backend/session scope creep on free tier |
| Broker / auto-trading execution | Liability + API-key handling; terminal is read-only analysis |
| Counter-zone signal generation | Methodology forbids chasing the extended side |
| Over-precision levels / fake confidence % | Wrong-exact is worse than right-approximate; bands with stated reason only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-04 | Phase 6 | Complete |
| DATA-05 | Phase 6 | Complete |
| DATA-06 | Phase 6 | Complete |
| DATA-07 | Phase 6 | Complete |
| ICT-08 | Phase 7 | Pending |
| ICT-09 | Phase 7 | Pending |
| ICT-10 | Phase 7 | Pending |
| ICT-11 | Phase 7 | Pending |
| ICT-12 | Phase 8 | Pending |
| ICT-13 | Phase 8 | Pending |
| ICT-14 | Phase 8 | Pending |
| ICT-15 | Phase 9 | Pending |
| UI-05 | Phase 9 | Pending |
| UI-06 | Phase 9 | Pending |
| DEPLOY-02 | Phase 9 | Pending |

**Coverage:**

- v2.0 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-09-06*
*Last updated: 2026-09-06 after roadmap creation (Phases 6–9)*
