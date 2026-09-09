---
phase: "13"
slug: "thin-history-honesty"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-09"
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5, `environment: 'node'` |
| **Config file** | `vitest.config.ts` (repo root) |
| **Quick run command** | `npm test -- --run src/lib/thin-tier.test.ts` |
| **Full suite command** | `npm test` (`vitest run`) |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green + D-08 human glance (honest look + clean console)
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | HIST-01 | — | N/A (no auth/sessions; banner counts are derived integers, no innerHTML) | unit | `npm test -- --run src/lib/thin-tier.test.ts` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | HIST-01 | — | N/A | unit | `npm test -- --run src/lib/thin-tier.test.ts` | ❌ W0 | ⬜ pending |
| 13-01-03 | 01 | 2 | HIST-01 | — | N/A | unit + manual glance | `npx tsc --noEmit` + `npm run dev` glance | ✅ shell/chart exist | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/thin-tier.ts` — pure `thinTier()` + tier copy map (covers HIST-01 tier/copy unit surface)
- [ ] `src/lib/thin-tier.test.ts` — boundary pins (19/20/33/34), forming-exclusion, copy-per-tier, banner-order predicate
- [ ] Framework install: none (`vitest` present)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Zones dim (0.5) + levels muted on thin tiers; Judas/SMT/Asia full strength | HIST-01 | Canvas + ResizeObserver unavailable in node vitest env | `npm run dev` → seed 5/25/40-candle histories, confirm dim + full-strength markers, clean console |
| Banner looks honest per tier (copy, stacking, persistence) | HIST-01 | Human visual judgment (D-08, Phase 11 D-05/D-06 pattern) | Same dev session: confirm banner copy per tier, thin-first stacking with rollover, no banner at 0/full |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
