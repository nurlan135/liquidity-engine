---
phase: "17"
slug: "paper-ticket-4-6-live-ui-chart-pins"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-11"
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^5.0.0 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/lib/ticket.test.ts src/lib/report.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/ticket.test.ts src/lib/report.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | TICK-01 | T-17-01 | STAND ASIDE + verbatim reason on gate fail; never null ticket | unit | `npx vitest run src/lib/ticket.test.ts` | ❌ W0 | ⬜ pending |
| 17-01-02 | 01 | 1 | TICK-02 | T-17-02 | risk÷distance sizing; refusal with reason on degenerate inputs | unit | `npx vitest run src/lib/ticket.test.ts` | ❌ W0 | ⬜ pending |
| 17-02-01 | 02 | 2 | TICK-03 | T-17-03 | PAPER/SIMULATED vocabulary; banned-word grep green | unit | `npx vitest run src/lib/ticket-vocabulary.test.ts` | ❌ W0 | ⬜ pending |
| 17-02-02 | 02 | 2 | TICK-04 | — | REPORT_SECTIONS §§4–6 live + §5 PAPER title | unit | `npx vitest run src/lib/report.test.ts` | ✅ update | ⬜ pending |
| 17-03-01 | 03 | 3 | TICK-04 | T-17-04 | Panels render verdict + verbatim reason; banner persistent; chart pin/lines; cleared on STAND ASIDE | manual | UAT visual glance | ❌ UAT | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/ticket.test.ts` — stubs for TICK-01, TICK-02
- [ ] `src/lib/ticket-vocabulary.test.ts` — banned-word grep guard for TICK-03
- [ ] `src/lib/store.test.ts` — extensions for ticketInputs clamps + selectTicket
- [ ] `src/lib/report.test.ts` — literal updates for §§4–6 live
- [ ] Framework install: none — `npm test` runs today

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Panels render verdict + verbatim reason; banner persistent; chart pin/lines | TICK-04 | jsdom absent; .test.tsx not in vitest include | Render terminal, verify EXECUTE shows T pin + entry/SL/TP lines, STAND ASIDE clears them, PAPER banner non-dismissible at terminal top |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
