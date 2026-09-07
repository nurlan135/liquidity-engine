---
phase: "07"
slug: "smt-4h-1h-sequencing-math"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-07"
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `07-RESEARCH.md` § Validation Architecture (Nyquist enabled, research enabled).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.0.0 (`npm test` → `vitest run`) |
| **Config file** | `vitest.config.ts` at root (Wave 0 confirms include pattern picks up new files) |
| **Quick run command** | `npm test -- src/lib/ict/<touched>.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- src/lib/ict/<touched>.test.ts`
- **After every plan wave:** Run `npm test` (full suite — existing range/bias/dol/regime/rollover/join tests are the no-regression gate)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-* | 01 | 1 | ICT-08 | T-07-01 | Throw on non-finite OHLC / toleranceBps ≤ 0, never silent NaN | unit | `npm test -- src/lib/ict/smt.test.ts` | ❌ W0 | ⬜ pending |
| 07-01-* | 01 | 1 | ICT-09 | T-07-01 | Joint roll-week suppression, no divergent output | unit | `npm test -- src/lib/ict/smt.test.ts` | ❌ W0 | ⬜ pending |
| 07-02-* | 02 | 1 | ICT-10 | T-07-01 | Finite-OHLC guards at FVG boundary; sweep-alone emits no transition | unit | `npm test -- src/lib/ict/fvg.test.ts` | ❌ W0 | ⬜ pending |
| 07-03-* | 03 | 2 | ICT-11 | T-07-01 | Non-finite 1H input rejected; partial block excluded, never emitted | unit | `npm test -- src/lib/ict/aggregate.test.ts` | ❌ W0 | ⬜ pending |
| 07-*-* | all | all | all | — | `Date.now`/`new Date()` grep clean in `src/lib/ict` | static | `grep -rn "Date.now\|new Date()" src/lib/ict/ \| grep -v "://"; test $? -eq 1` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/ict/smt.test.ts` — stubs for ICT-08 + ICT-09 joint suppression (bull, bear, choppy NO-SIGNAL, lookback-shift, CORR_DECOUPLED, zero-variance, roll-week)
- [ ] `src/lib/ict/fvg.test.ts` — stubs for ICT-10 (both polarities, mitigation, bound, sweep-vs-reject, §2 sentence)
- [ ] `src/lib/ict/aggregate.test.ts` — stubs for ICT-11 (anchor, DST pair, partial-block, Candle-shape reuse)
- [ ] `src/lib/__fixtures__/smt-*.json` — matched-pair fixtures (bull/bear/choppy/roll-week) alongside existing `join-misaligned.json` pattern
- [ ] Confirm vitest include pattern picks up new test files (existing `*.test.ts` colocated — no config change expected, verify on first run)

---

## Manual-Only Verifications

All phase behaviors have automated verification.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| §2 Delivery Cycle Azerbaijani prose reads naturally | ICT-10 (D-11) | Prose quality is human judgment | Read the IRL-aware delivery sentence in test output; confirm natural Azerbaijani |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
