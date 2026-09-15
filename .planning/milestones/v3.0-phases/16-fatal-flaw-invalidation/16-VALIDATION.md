---
phase: "16"
slug: "fatal-flaw-invalidation"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-11"
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^5.0.0 |
| **Config file** | repo vitest config (existing) |
| **Quick run command** | `npx vitest run src/lib/ict/invalidation.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/ict/invalidation.test.ts`
- **After every plan wave:** Run `npx vitest run src/lib/ict/`
- **Before `/gsd-verify-work`:** Full suite must be green + `tsc --noEmit` clean
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | FLAW-01 | — | Same snapshot byte-identical output, flaw supersedes fire | unit | `npx vitest run src/lib/ict/invalidation.test.ts -t "determinism"` | ❌ W0 | ⬜ pending |
| 16-01-02 | 01 | 1 | FLAW-02 | T-16-01 | HARD kill vs SOFT downgrade + unblock, generic-Invalidated banned | unit | `npx vitest run src/lib/ict/invalidation.test.ts -t "taxonomy"` | ❌ W0 | ⬜ pending |
| 16-02-01 | 02 | 2 | FLAW-03 | — | Verbatim sentence + challenge bank toBe-pinned | unit | `npx vitest run src/lib/ict/invalidation.test.ts -t "prose"` | ❌ W0 | ⬜ pending |
| 16-02-02 | 02 | 2 | FLAW-01 | T-16-02 | Selector shares trigger asOf, no re-fetch | unit | `npx vitest run src/lib/store.test.ts` | ✅ exists | ⬜ pending |
| 16-02-03 | 02 | 2 | (guard) | — | No clock/store in ict, CALIBRATION-PROVISIONAL pins | unit | `npx vitest run src/lib/ict/purity.test.ts` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/ict/invalidation.test.ts` — stubs for FLAW-01/02/03 (disjunction table, determinism, prose pins)
- [ ] `src/lib/ict/invalidation.ts` — the module under test (TDD: tests first per repo convention)
- [ ] `src/lib/store.test.ts` — flaw-stale / flaw-coherence cases on trigger-block idiom

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
