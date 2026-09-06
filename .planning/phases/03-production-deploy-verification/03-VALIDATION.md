---
phase: "03"
slug: "production-deploy-verification"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-06"
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^5.0.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test` + `npm run lint` + `npm run build` (pre-deploy gate) |
| **Estimated runtime** | ~30 seconds (unit suites) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run` for touched areas
- **After every plan wave:** Run full `npm test` + `npm run lint`
- **Before `/gsd-verify-work`:** Full suite green + `npm run build` green + live checklist green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | DEPLOY-01 | — | Unit logic still green (ICT, DST, freshness, rollover) | unit | `npm test` | ✅ | ⬜ pending |
| 03-0X-0X | 0X | X | DEPLOY-01 | — | `Cache-Control: s-maxage=60 + SWR=30` on fresh 200; `no-store` on stale/502 | live script | `bash scripts/verify-deploy.sh $BASE_URL` | ❌ W0 | ⬜ pending |
| 03-0X-0X | 0X | X | DEPLOY-01 | — | Forced upstream failure → `stale:true` envelope + STALE strip, no silent 200-fresh | live drill | check script vs preview URL with flag set, then unset | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/verify-deploy.sh` (or planner-chosen equivalent) — covers DEPLOY-01 header/envelope/cache-age checks
- [ ] Temporary drill flag in `src/lib/yahoo.ts` + preview env var wiring — covers DEPLOY-01 stale-serve drill (removed before prod gate)
- [ ] None — existing test infrastructure covers all unit logic (DST, rollover, freshness, ICT math)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Baku-date + rollover-banner rendering spot-checks | DEPLOY-01 | September has no live DST transition or rollover event to trigger (D-10) | Open live URL, confirm dates/banner read sensibly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
