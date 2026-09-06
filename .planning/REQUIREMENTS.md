# Requirements: Liquidity Engine — Institutional Execution Terminal for NQ

**Defined:** 2026-09-04
**Core Value:** Correct D1 Premium/Discount positioning on live NQ data — if the dealing-range math is wrong, nothing else matters.

## v1 Requirements

Requirements for milestone v1.0 Live Terminal. Each maps to roadmap phases.

### Data Feed

- [x] **DATA-01**: User receives NQ=F daily candles via `GET /api/yahoo` proxy with server-side 60s TTL cache
- [x] **DATA-02**: Proxy survives upstream failure with query1→query2 failover, exponential backoff honoring Retry-After, and serve-stale fallback
- [x] **DATA-03**: User sees data freshness (cache age, stale badge) on the chart header — never silent staleness

### ICT Math Core

- [x] **ICT-01**: User sees D1 Dealing Range with Premium/Discount zones and Equilibrium (`EQ = (Rhigh + Rlow) / 2`, position >/< 0.5) computed as pure functions in `src/lib/ict`
- [x] **ICT-02**: User sees Equilibrium + quadrant/OTE levels (0.25/0.75 quadrants, 0.62–0.79 OTE pocket) derived from range anchors
- [x] **ICT-03**: Range re-anchors correctly — close beyond either extreme or new leg through major liquidity retires the range
- [x] **ICT-04**: User sees bias readout (BULLISH / BEARISH / COMPRESSION) with mandatory rationale string, derived from D1 position + regime
- [x] **ICT-05**: User sees a single named Primary DOL target (e.g. PDH/PDL level) selected by codified position + regime rules
- [x] **ICT-06**: User sees volatility regime badge (Expansion / Compression) from daily range heuristic, degrading honestly on thin history
- [x] **ICT-07**: Rollover-corrupted ranges are flagged — raw OHLC never adjclose, `rolloverSuspect` flag on N×ATR close-to-close jumps, contract hint + proximity warning

### Terminal UI

- [x] **UI-01**: User sees full 3-panel dark terminal shell per `reference/design.html` (#0A0A0F / #14141E / #00D9FF), Module 2 live, other modules marked unavailable
- [x] **UI-02**: User sees candlestick chart (lightweight-charts v5, dynamic `ssr:false`) with shaded premium/discount zones + EQ price-line + DOL marker
- [x] **UI-03**: User sees institutional report shell (sections 1–6), section 2 live, sections 1/3–6 with explicit unavailable markers
- [x] **UI-04**: Blocked side shown struck-through (longs only in discount, shorts only in premium) — teaches discipline, never hidden

### Sentiment & Calendar (Fixtures)

- [x] **MOCK-01**: User sees sentiment exposure table (symbol, long%, short%, True AVG excl. Insta/FiboGroup) with 60% crowded flag, from Myfxbook/ForexFactory-shaped fixtures
- [x] **MOCK-02**: User sees economic calendar with high-impact-only filter + countdown + pre-news warning flag on bias/DOL, from shaped fixtures
- [x] **MOCK-03**: User sees pre-news liquidity-engineering interpretation (trap vs genuine delivery) fusing calendar + regime + position

### State & Time

- [x] **STATE-01**: Dashboard state (symbol, candles, dealing-range state, confidence) held in a single Zustand store with memoized selectors; math never touches the store
- [x] **STATE-02**: All session/date logic runs on Asia/Baku timezone via a single time util module with injected clock; March + November DST covered by tests

### Deployment

- [x] **DEPLOY-01**: Terminal is deployed on Vercel Hobby with CDN cache headers verified, cold-start + stale-serve drill passed, live-URL checklist green (cache age, DST dates, rollover banner path)

## v2 Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Modules 3–4 (Structure & Execution)

- **STRUCT-01**: SMT divergence panel (NQ vs correlated index)
- **STRUCT-02**: Engineered-liquidity path visualization (equal highs/lows, inducement)
- **STRUCT-03**: Displacement / FVG quality grading (Defended vs Weak/Breakaway)
- **EXEC-01**: WHY NOW 3-gate execution trigger (killzone + purge + delivery)
- **EXEC-02**: Micro-structure invalidation level automation
- **EXEC-03**: Pain-threshold mapping (retail stops → chart zones)

### Real Integrations

- **INT-01**: Real sentiment API integration replacing fixtures
- **INT-02**: Real calendar API integration replacing fixtures
- **INT-03**: Intraday LTF execution logic (15M/5M entries, MSS, IOFED)

### Product Surface

- **PROD-01**: Multi-symbol support beyond NQ
- **PROD-02**: Backtesting engine
- **PROD-03**: Alerts / push / mobile surface

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| LLM-generated analysis or narratives | Non-deterministic output violates determinism core principle; hallucinates levels, costs money on zero budget |
| Footprint / DOM / volume-profile order-flow | ICT reads liquidity from candles, not exchange delta; no zero-budget futures order-flow source |
| Auth, accounts, saved workspaces | No user-specific value in v1.0; backend/session scope creep on free tier |
| Broker / auto-trading execution | Liability + API-key handling; terminal is read-only analysis, execution stays with the user |
| Counter-zone signal generation | Methodology forbids chasing the extended side; would teach mistrust of the premium/discount display |
| Over-precision levels / fake confidence % | Wrong-exact is worse than right-approximate; LOW/MED/HIGH bands with stated reason only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 2 | Complete |
| ICT-01 | Phase 1 | Complete |
| ICT-02 | Phase 1 | Complete |
| ICT-03 | Phase 1 | Complete |
| ICT-04 | Phase 1 | Complete |
| ICT-05 | Phase 1 | Complete |
| ICT-06 | Phase 1 | Complete |
| ICT-07 | Phase 1 | Complete |
| UI-01 | Phase 2 | Complete |
| UI-02 | Phase 2 | Complete |
| UI-03 | Phase 2 | Complete |
| UI-04 | Phase 2 | Complete |
| MOCK-01 | Phase 2 | Complete |
| MOCK-02 | Phase 2 | Complete |
| MOCK-03 | Phase 2 | Complete |
| STATE-01 | Phase 2 | Complete |
| STATE-02 | Phase 1 | Complete |
| DEPLOY-01 | Phase 3 | Complete |

**Coverage:**

- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---
*Requirements defined: 2026-09-04*
*Last updated: 2026-09-04 after milestone v1.0 roadmapping*
