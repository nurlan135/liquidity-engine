---
phase: "20"
slug: "1-live-chart-overlay"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-26"
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Wiring-only phase: no `src/lib/ict` math changes; selectPools contract verified in Phase 19 (458/458 green).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^5.0.0 |
| **Config file** | `vitest.config.ts` — `include: ['src/**/*.test.ts', 'app/**/*.test.ts']`, node environment, `testTimeout: 15000` |
| **Quick run command** | `npm test -- src/lib/store.test.ts` |
| **Full suite command** | `npm test` (458-test baseline must stay green per D-17) |
| **Estimated runtime** | ~30 seconds (quick) / ~120 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- src/lib/store.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | S1-01 | — | §1 rank-1 sentence renders side + zone bounds + ATR distance + swept status + verbatim reason + inline hedge | unit | `npm test -- <report-test>` | ❌ W0 | ⬜ pending |
| 20-01-02 | 01 | 1 | CHRT-01 | — | One BSL pair renders via remove-then-create with `BSL-1-top/bottom` titles, Dashed, lineWidth 1 | unit | `npm test -- <chart-test>` | ❌ W0 | ⬜ pending |
| 20-02-01 | 02 | 2 | CHRT-01 | — | Nearest-2-per-side cap: max 8 ACTIVE lines; swept ghosts ride outside the cap | unit | `npm test -- <chart-test>` | ❌ W0 | ⬜ pending |
| 20-02-02 | 02 | 2 | CHRT-02 | — | Rank-1 full brightness, rank-2 50% alpha; ticket lines created after pools (z-order); swept = MUTED_GRAY ghosts | unit | `npm test -- <chart-test>` | ❌ W0 | ⬜ pending |
| 20-02-03 | 02 | 2 | CHRT-03 | — | Stale/thin → MUTED_GRAY 0.5 dim; null selector clears all pool lines; STAND_ASIDE clears ghosts | unit | `npm test -- <chart-test>` | ❌ W0 | ⬜ pending |
| 20-03-01 | 03 | 3 | S1-02 | — | Distinct no-pools / stale-verbatim / thin-dimmed+note / null-empty copy; never confident prose over degraded | unit | `npm test -- <report-test>` | ❌ W0 | ⬜ pending |
| 20-03-02 | 03 | 3 | S1-03 | — | Proyeksiya hedge inline in rank-1 sentence (no footer); banned reuse absent (pool-gated FIRE, exact stop-price, heatmap, LLM narrative) | unit | `npm test -- <report-test>` | ❌ W0 | ⬜ pending |
| 20-00-01 | — | — | D-20 gate | — | No `src/lib/ict` changes; purity.test.ts green with no new exclusions | unit (guard) | `npm test -- src/lib/ict/purity.test.ts` | ✅ exists | ⬜ pending |
| 20-00-02 | — | — | D-17 gate | — | selectPools contract unchanged; POOL-06 matrix green | unit (regression) | `npm test -- src/lib/store.test.ts` | ✅ exists | ⬜ pending |
| 20-00-03 | — | — | D-17 gate | — | Full 458-test suite green at phase exit | full suite | `npm test` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*`<report-test>` / `<chart-test>`: exact test file paths assigned by the planner (tracer-first: report + chart tests land in Plan 01).*

---

## Wave 0 Requirements

- [ ] Report branch tests — §1 rank-1 sentence + empty/stale/thin copy pins (planner assigns file)
- [ ] Chart prop-mapping tests — pair titles + cap + z-order + dim/clear pins (planner assigns file)
- [ ] selectPools regression stays green — `src/lib/store.test.ts` pools-matrix untouched by wiring

*No framework install; no new test infra — existing vitest covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Longest rank-1 sentence + hedge wraps without truncation or horizontal scroll | S1-01 | Canvas/DOM wrap untestable in node-env (UI-SPEC backstop) | Render §1 with longest rank-1 fixture; agent screenshot; confirm wrap in panel flow |
| Canvas glance: pool pairs read as dashed BSL/SSL pairs, rank-1 pops, ghosts dimmed, ticket on top | CHRT-01/02 | Canvas pixels untestable in node-env (UI-SPEC backstop) | Render chart with 2-per-side fixture; agent screenshot; confirm pair style + z-order |

*Held-out human backstops per UI-SPEC; same mechanism as prior phases (agent screenshots, Phase 19 UAT backstop precedent).*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
