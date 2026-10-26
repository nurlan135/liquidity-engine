---
phase: "22"
slug: "pool-lifecycle-decay-pool2-04"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-26"
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: 22-RESEARCH.md ## Validation Architecture (2026-10-26).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.0.0 |
| **Config file** | `vitest.config.ts` (node env, `src/**/*.test.ts`, 15s timeout) |
| **Quick run command** | `npx vitest run src/lib/ict/pools.test.ts` |
| **Full suite command** | `npm test` (`vitest run`) |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/ict/pools.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | POOL2-04 | — | decay math boundary pins (fresh=1, half-life=0.5, floor, monotonicity) | unit | `npx vitest run src/lib/ict/pools.test.ts` | ❌ W0 | ⬜ pending |
| 22-01-02 | 01 | 1 | POOL2-04 | — | weight/touches immutability + double-run determinism + ghost order | unit | `npx vitest run src/lib/ict/pools.test.ts` | ❌ W0 | ⬜ pending |
| 22-02-01 | 02 | 2 | POOL2-04 | — | parity triple exact match pools-on/off | integration | `npx vitest run src/lib/ict/pools-parity.test.ts` | ✅ | ⬜ pending |
| 22-02-02 | 02 | 2 | POOL2-04 | T-22-01 | purity guard (no clocks/store imports) | unit | `npx vitest run src/lib/ict/purity.test.ts` | ✅ | ⬜ pending |
| 22-02-03 | 02 | 2 | POOL2-04 | — | selectPools stale/thin matrix unchanged | unit | `npx vitest run src/lib/store.test.ts` | ✅ | ⬜ pending |
| 22-03-01 | 03 | 3 | POOL2-04 | — | sandbox sliders preview-only, pristine-vs-pinned | manual/component | existing sandbox tests if any; else manual preview→Apply→reset walk | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/ict/pools.test.ts` — new `describe('pool decay')` block (~10 boundary tests: fresh=1, half-life=0.5, floor holds at age 60+, fresh-outscores-aged-self, weight/touches byte-identical pre/post, double-run JSON determinism, ghost originDate order unchanged)
- [ ] Sandbox: 2 preview fields + setters + knob bounds + pristine lines (store + panel)

*Framework install: none — vitest 5.0.0 present, no new test files.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sandbox decay sliders preview → Apply → reset walk | POOL2-04 (D-16) | No sandbox test file confirmed yet (planner verifies) | Set half-life/floor knobs, confirm preview diff vs pinned, Apply, confirm rank unchanged derivation reads pinned, reset to pristine |

*If sandbox test file exists, move this row to automated.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
