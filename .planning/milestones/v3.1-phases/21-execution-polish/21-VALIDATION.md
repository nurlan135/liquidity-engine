---
phase: "21"
slug: "execution-polish"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-27"
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.0.0 |
| **Config file** | `vitest.config.ts` (env node, include `src/**/*.test.ts`, 15s timeout) |
| **Quick run command** | `npm test -- <files>` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~90 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- <touched-area-files>`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green (v3.0 420/420 + Phase 19/20 additions)
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 21-W0-01 | W0 | 0 | POL-03 | — | trigger/flaw/ticket identical pools on/off | unit | `npm test -- src/lib/pools-parity.test.ts` | ❌ W0 | ⬜ pending |
| 21-W0-02 | W0 | 0 | POL-01 | — | 7d fire count + band status correct incl. empty log | unit | `npm test -- src/lib/fire-rate.test.ts` | ❌ W0 | ⬜ pending |
| 21-W0-03 | W0 | 0 | POL-04 | T-21-SC | threshold clamp/persist-shape/reset; tampered localStorage falls back to default | unit (store) | store-slice test in node env | ❌ W0 | ⬜ pending |
| 21-W0-04 | 01 | 1 | POL-02 | — | SL buffered beyond extreme; TP inside; R/R-edge honestly STANDS ASIDE | unit | `npm test -- src/lib/ticket.test.ts` | ✅ (extend) | ⬜ pending |
| 21-W0-05 | 02 | 1 | D-16 | — | overlay literals == CSS tokens (case-normalized) | unit | extend `src/lib/pool-overlay.test.ts` | ✅ (extend) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/pools-parity.test.ts` — POL-03 harness (fixtures copied from `src/lib/ict/parity.test.ts:18-95`; placed OUTSIDE `src/lib/ict/` per purity guard)
- [ ] Fire-rate helper + test (`src/lib/fire-rate.*` or co-located) — POL-01 counting/banding incl. empty-log honest copy
- [ ] Threshold store slice + test (clamp/persist-shape/reset) — POL-04 logic, node-env testable; DOM drag is manual UAT
- [ ] Framework install: none — vitest present; no jsdom needed if slider stays presentational-over-store

Prior gate commands (reuse verbatim): `npm test -- src/lib/pool-prose.test.ts src/lib/report.test.ts`; `npm test -- src/lib/pool-overlay.test.ts src/lib/chart-mapper.test.ts`; `npm test -- src/lib/pool-overlay.test.ts src/lib/store.test.ts`; full `npm test`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Threshold slider drag + persist across reload + reset restores default | POL-04 | DOM interaction, no jsdom in node-env config; store logic is unit-tested, drag is presentational | Open terminal, drag WHY NOW threshold slider, reload page, confirm value persists; click reset, confirm code default restores |
| Fire-rate strip copy renders correct Azerbaijani band/out-of-band states | POL-01 | Visual copy check in live report §5 | Open report §5 with firingLog empty / in-band / out-of-band fixtures, confirm strip copy per D-09 + Phase 20 D-05 precedent |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
