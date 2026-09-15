# Requirements: Liquidity Engine v3.1

**Defined:** 2026-09-15
**Core Value:** Correct D1 Premium/Discount positioning on live NQ data — if the dealing-range math is wrong, nothing else matters.

## v1 Requirements

Requirements for v3.1 milestone. Each maps to roadmap phases.

### Pools Math

- [ ] **POOL-01**: User sees BSL/SSL pools detected from D1 swing highs/lows (shared swings.ts, k=2 strict fractal)
- [ ] **POOL-02**: Equal highs/lows get extra weight (EQUAL_TOL_BPS provisional, test-pinned)
- [ ] **POOL-03**: Pools project as zones (side, top, bottom, touches, weight, originDate, status), trailing cap
- [ ] **POOL-04**: Sweep-status lifecycle ACTIVE/SWEPT/CONSUMED (wick-pierce=swept, close-through=consumed, first-sweep-wins)
- [ ] **POOL-05**: Proximity × DOL-side scorer ranks pools (provisional constants exported, boundary-tested)
- [ ] **POOL-06**: selectPools selector with refuse-null envelope + sharedEpoch + never-throws

### §1 Live Report

- [ ] **S1-01**: Report §1 flips from unavailable to live with verbatim Azerbaijani pool reasons
- [ ] **S1-02**: §1 shows honest-empty states (no pools / stale leg / thin history)
- [ ] **S1-03**: §1 prose carries proyeksiya hedge + methodology caveat, toBe-pinned

### Chart Overlay

- [ ] **CHRT-01**: BSL/SSL zones render as price-line pairs on chart (nearest-2-per-side cap)
- [ ] **CHRT-02**: Swept pools dim, rank-1 highlighted, ticket lines stay on top (z-order)
- [ ] **CHRT-03**: Stale/thin dimming applies to pool lines, ghost lines clear on STAND ASIDE

### Execution Polish

- [ ] **POL-01**: WHY NOW thresholds reviewed against firing-log (1–4/week band holds, pools context-only)
- [ ] **POL-02**: Ticket SL sits beyond extreme + ATR buffer, TP partials before extreme
- [ ] **POL-03**: Parity harness proves trigger/flaw/ticket verdicts identical pools on/off
- [ ] **POL-04**: slider.tsx threshold/pool-tolerance controls render from installed primitive

## v2 Requirements

Deferred. Tracked but not in current roadmap.

### Pools P2

- **POOL2-01**: TP2 resolver wired to nearest ACTIVE pool on trade side
- **POOL2-02**: Sentiment multiplier on RetailExposure contract (neutral default)
- **POOL2-03**: 15M intraday swing pools (after D1 ranking stable)
- **POOL2-04**: Pool age/decay + re-accumulation
- **POOL2-05**: Pain-map proximity tag on WHY NOW/ticket prose (read-only suffix)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Pool-gated FIRE trigger | Uncalibrated map must never vote; needs own calibration band + population test |
| Exact stop-price prediction | Projection, not prediction — methodology overreach |
| 5M microstructure pools | Noise floor too high, out of D1-first discipline |
| Real sentiment API | Zero budget, fixtures stay |
| Heatmap rendering | Line pairs suffice; no new chart primitive |
| LLM narrative for §1 | Determinism is a core principle |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| POOL-01 | Phase 19 | Pending |
| POOL-02 | Phase 19 | Pending |
| POOL-03 | Phase 19 | Pending |
| POOL-04 | Phase 19 | Pending |
| POOL-05 | Phase 19 | Pending |
| POOL-06 | Phase 19 | Pending |
| S1-01 | Phase 20 | Pending |
| S1-02 | Phase 20 | Pending |
| S1-03 | Phase 20 | Pending |
| CHRT-01 | Phase 20 | Pending |
| CHRT-02 | Phase 20 | Pending |
| CHRT-03 | Phase 20 | Pending |
| POL-01 | Phase 21 | Pending |
| POL-02 | Phase 21 | Pending |
| POL-03 | Phase 21 | Pending |
| POL-04 | Phase 21 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-09-15*
*Last updated: 2026-09-15 after initial definition*
