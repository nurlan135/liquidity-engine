---
phase: "15"
slug: "why-now-trigger-engine"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-10"
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.0.0 |
| **Config file** | `vitest.config.ts` (node env, `src/**/*.test.ts`, 15s timeout) |
| **Quick run command** | `npx vitest run src/lib/ict/trigger.test.ts` |
| **Full suite command** | `npm test` (must stay 300/300-green baseline + new tests) |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/ict/trigger.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | TRIG-01 | — | valid inputs return verdict, malformed throw at boundary | unit | `npx vitest run src/lib/ict/trigger.test.ts` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 1 | TRIG-04 | — | TRIGGER_* exported with CALIBRATION-PROVISIONAL | unit | `npx vitest run src/lib/ict/trigger.test.ts` | ❌ W0 | ⬜ pending |
| 15-02-01 | 02 | 1 | TRIG-02 | — | 2/3 gates → ARMED; cooldown dedups same-session FIRE | unit | `npx vitest run src/lib/ict/trigger.test.ts` | ❌ W0 | ⬜ pending |
| 15-02-02 | 02 | 1 | TRIG-03 | — | log append/cap-50/dedup + firingLogToJson shape | unit | `npx vitest run src/lib/store.test.ts` | ❌ W0 | ⬜ pending |
| 15-03-01 | 03 | 2 | TRIG-01 | — | verbatim Azerbaijani prose pins for FIRE/ARMED/WAIT | unit | `npx vitest run src/lib/ict/trigger.test.ts` | ❌ W0 | ⬜ pending |
| 15-03-02 | 03 | 2 | Purity | — | trigger.ts passes no-clock/no-store grep guard | unit | `npx vitest run src/lib/ict/purity.test.ts` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/ict/trigger.test.ts` — stubs for gate table + boundaries + choppy-QUIET + cooldown matrix + prose pins + constant pins (covers TRIG-01/02/04)
- [ ] `src/lib/store.test.ts` additions — `selectTrigger` derivation, firing-log cap/dedup, `firingLogToJson` shape (covers TRIG-02/03)
- [ ] Framework install: none — vitest 5.0.0 present

*Existing infrastructure covers everything else.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
