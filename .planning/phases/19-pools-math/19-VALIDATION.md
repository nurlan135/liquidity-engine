---
phase: "19"
slug: "pools-math"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-16"
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^5.0.0 |
| **Config file** | `vitest.config.ts` — `include: ['src/**/*.test.ts', 'app/**/*.test.ts']`, node environment, `testTimeout: 15000` |
| **Quick run command** | `npm test -- src/lib/ict/pools.test.ts src/lib/ict/smt.test.ts src/lib/ict/purity.test.ts` |
| **Full suite command** | `npm test` (420-test baseline must stay green per D-24) |
| **Estimated runtime** | ~30 seconds (quick) / ~120 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- src/lib/ict/pools.test.ts src/lib/ict/smt.test.ts src/lib/ict/purity.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 19-01-01 | TBD | TBD | POOL-01 | — | Boundary validation at pure-function entry: closedOnly forming-row drop, finite-OHLC drop, chronological-sort copies | unit | `npm test -- src/lib/ict/pools.test.ts` | ❌ W0 | ⬜ pending |
| 19-01-02 | TBD | TBD | POOL-02 | — | Equality clustering on finite prices only; swept pools keep bonus (retest magnetism) | unit | `npm test -- src/lib/ict/pools.test.ts` | ❌ W0 | ⬜ pending |
| 19-01-03 | TBD | TBD | POOL-03 | — | Zone = min-max span; POOL_MAP_BOUND=20 newest-N by originDate; exact shape literals | unit | `npm test -- src/lib/ict/pools.test.ts` | ❌ W0 | ⬜ pending |
| 19-01-04 | TBD | TBD | POOL-04 | — | Wick-pierce → SWEPT; close-through → CONSUMED; first-sweep-wins; no re-promotion; touch ≠ sweep | unit | `npm test -- src/lib/ict/pools.test.ts` | ❌ W0 | ⬜ pending |
| 19-01-05 | TBD | TBD | POOL-05 | T-19-01 | Finite-guards at every numeric boundary; explicit zero/empty-ATR branch (never divide by zero); constants exported CALIBRATION-PROVISIONAL | unit | `npm test -- src/lib/ict/pools.test.ts` | ❌ W0 | ⬜ pending |
| 19-02-01 | TBD | TBD | POOL-06 | T-19-02 | Selector degrade: bad/empty/stale NQ leg → null (never silent []); never throws on garbage; single sharedEpoch; ES-stale does not null pools | unit (store) | `npm test -- src/lib/store.test.ts` | ❌ W0 (extend existing) | ⬜ pending |
| 19-00-01 | TBD | TBD | D-12 gate | — | Shared-swings extraction keeps smt.test.ts green (zero behavior change) | unit (regression) | `npm test -- src/lib/ict/smt.test.ts` | ✅ exists | ⬜ pending |
| 19-00-02 | TBD | TBD | D-23 gate | — | purity.test.ts green with new files, no exclusions added | unit (guard) | `npm test -- src/lib/ict/purity.test.ts` | ✅ exists | ⬜ pending |
| 19-00-03 | TBD | TBD | D-24 gate | — | Full 420-test suite green at phase exit | full suite | `npm test` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/ict/pools.ts` (+ `swings.ts` extraction) — implementation; tests cannot precede the module contract
- [ ] `src/lib/ict/pools.test.ts` — covers POOL-01–05 (boundary + equality + merge + lifecycle + scorer + cap matrix)
- [ ] `src/lib/ict/swings.test.ts` (optional) — re-homed predicate pins if extraction chosen
- [ ] `src/lib/store.test.ts` extension — covers POOL-06 refuse-null matrix + never-throws + ES-stale independence

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
