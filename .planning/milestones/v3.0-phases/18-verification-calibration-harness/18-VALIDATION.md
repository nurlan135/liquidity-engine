---
phase: "18"
slug: "verification-calibration-harness"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-14"
---

# Phase 18 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.0.0 |
| **Config file** | `vitest.config.ts` (node env, `src/**/*.test.ts` + `app/**/*.test.ts`, 15s timeout) |
| **Quick run command** | `npx vitest run src/lib/ict/replay.test.ts` (per-file; <30s expected — pure fns over ~20×12 rows) |
| **Full suite command** | `npm test` (`vitest run`, whole tree) |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run per-file quick command (`npx vitest run src/lib/ict/<file>.test.ts`)
- **After every plan wave:** Run `npm test` full suite (must stay green incl. existing trigger/invalidation/ticket/store suites)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | Fails When |
|--------|----------|-----------|-------------------|------------|
| VERF-01 | Per-bar combined-state edges legal; ≥1 FIRING + ≥1 INVALIDATED; summary emits fires/week + kill-rate vs band | unit (pure replay) | `npx vitest run src/lib/ict/replay.test.ts` | non-zero exit, or illegal transition edge asserted, or missing FIRING/INVALIDATED |
| VERF-02 | Same-snapshot AMD/SMT vs trigger contradiction predicates hold on all ARMED-or-better bars | unit (pure cross-assert) | `npx vitest run src/lib/ict/parity.test.ts` | non-zero exit, or contradiction predicate fails on any bar |
| VERF-03 | Leg-matrix (4 single + all-stale + thin) yields STAND_ASIDE/degraded with provenance, never EXECUTE | unit (pure flaw→ticket chain) | `npx vitest run src/lib/ict/stale-drill.test.ts` | non-zero exit, or full-strength ticket on stale/thin input |
| Purity (guard) | New harness files introduce no `Date.now`/store imports | unit (existing guard) | `npx vitest run src/lib/ict/purity.test.ts` | non-zero exit, or purity grep matches new file |

---

## Wave 0 Gaps

- [ ] `src/lib/ict/replay.test.ts` — covers VERF-01 (fixture + driver + table + summary)
- [ ] `src/lib/ict/parity.test.ts` — covers VERF-02 (contradiction rules)
- [ ] `src/lib/ict/stale-drill.test.ts` — covers VERF-03 (leg matrix + thin-tier)
- [ ] Shared epoch/fixture helpers — inline per file following existing `nyMinuteEpoch`/`row`/`fixtureFvg` precedent (or one `replay-fixture.ts` helper co-located under `src/lib/ict/` if the planner prefers; must stay pure so the guard holds)
- [ ] Framework install: none — `vitest@5.0.0` present

---

*Source: 18-RESEARCH.md ## Validation Architecture (2026-09-14)*
