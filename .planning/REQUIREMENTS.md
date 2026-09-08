# Requirements: Liquidity Engine — v2.1 Cleanup & Polish

**Defined:** 2026-09-08
**Core Value:** Correct D1 Premium/Discount positioning on live NQ data — if the dealing-range math is wrong, nothing else matters.

## v1 Requirements

Requirements for v2.1 milestone. Each maps to roadmap phases.

### Type Safety

- [ ] **TYPE-01**: tsc passes with zero errors — pre-existing LayoutProps error in `app/layout.tsx` (from 3a3a1cb) is fixed without changing runtime behavior

### Chart Rendering

- [ ] **CHRT-01**: Chart renders crisply on high-DPI (Retina) displays — no blur from devicePixelRatio mismatch
- [ ] **CHRT-02**: Chart redraws cleanly on window/container resize — no stretched, clipped, or frozen canvas

### Deployment Hygiene

- [ ] **DEPL-01**: Stale Vercel token removed — no unused/exposed token remains in env or config
- [ ] **DEPL-02**: Deployment Protection leftovers resolved — protection state is intentional and documented
- [ ] **DEPL-03**: drill-preview branch remnants removed — no dead branches, flags, or references to the drill preview

### History Display

- [ ] **HIST-01**: Thin history renders honestly — indicator or fallback shown when history is too thin for full chart, no silent empty/misleading display

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Execution

- **EXEC-01**: WHY NOW trigger fires on live session conditions (Modul 4)
- **EXEC-02**: Order ticket composer renders from trigger state
- **EXEC-03**: Fatal-flaw guard blocks invalid execution setups

### Report

- **RPRT-01**: Pain Threshold map (§1 BSL/SSL projection) renders from dealing-range state

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| v3.0 Execution logic (Modul 4) | Live observation period (2–4 weeks) still running; scope with facts, not assumptions |
| Pain Threshold §1 map | Gap closure candidate for v3.0 scoping, not cleanup |
| New ICT math | Cleanup milestone — no new methodology |
| LLM integration | Determinism is a core principle; rule-based only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TYPE-01 | TBD | Pending |
| CHRT-01 | TBD | Pending |
| CHRT-02 | TBD | Pending |
| DEPL-01 | TBD | Pending |
| DEPL-02 | TBD | Pending |
| DEPL-03 | TBD | Pending |
| HIST-01 | TBD | Pending |

**Coverage:**
- v1 requirements: 7 total
- Mapped to phases: 0
- Unmapped: 7 ⚠️

---
*Requirements defined: 2026-09-08*
*Last updated: 2026-09-08 after initial definition*
