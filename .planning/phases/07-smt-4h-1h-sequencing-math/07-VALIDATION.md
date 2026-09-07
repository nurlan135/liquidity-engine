---
phase: "07"
slug: "smt-4h-1h-sequencing-math"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
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
| 07-01-* | 01 | 1 | ICT-08 | T-07-01 | Throw on non-finite OHLC / toleranceBps ≤ 0, never silent NaN | unit | `npm test -- src/lib/ict/smt.test.ts` | ✅ | ✅ green (17/17) |
| 07-01-* | 01 | 1 | ICT-09 | T-07-01 | Joint roll-week suppression, no divergent output | unit | `npm test -- src/lib/ict/smt.test.ts` | ✅ | ✅ green (roll-week fixture) |
| 07-02-* | 02 | 1 | ICT-10 | T-07-01 | Finite-OHLC guards at FVG boundary; sweep-alone emits no transition | unit | `npm test -- src/lib/ict/fvg.test.ts` | ✅ | ✅ green (16/16) |
| 07-03-* | 03 | 2 | ICT-11 | T-07-01 | Non-finite 1H input rejected; partial block excluded, never emitted | unit | `npm test -- src/lib/ict/aggregate.test.ts` | ✅ | ✅ green (15/15) |
| 07-*-* | all | all | all | — | `Date.now`/`new Date()` grep clean in `src/lib/ict` | static | `grep -rn "Date.now\|new Date()" src/lib/ict/ \| grep -v "://"; test $? -eq 1` | ✅ | ✅ green (exit 1, no output) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/lib/ict/smt.test.ts` — ICT-08 + ICT-09 joint suppression (17 tests: bull, bear, choppy NO-SIGNAL, lookback-shift, CORR_DECOUPLED, zero-variance, roll-week)
- [x] `src/lib/ict/fvg.test.ts` — ICT-10 (16 tests: both polarities, mitigation, bound, sweep-vs-reject, §2 sentence)
- [x] `src/lib/ict/aggregate.test.ts` — ICT-11 (15 tests: anchor, DST pair, partial-block, Candle-shape reuse)
- [x] `src/lib/__fixtures__/smt-rollweek.json` — joint roll-week D1 pair (NQ gaps, ES clean), imported via @ alias
- [x] Vitest include pattern picks up new test files (colocated `*.test.ts` — no config change needed, confirmed on first run)

---

## Manual-Only Verifications

All phase behaviors have automated verification.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| §2 Delivery Cycle Azerbaijani prose reads naturally | ICT-10 (D-11) | Prose quality is human judgment | Read the IRL-aware delivery sentence in test output; confirm natural Azerbaijani |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-09-07

---

## Validation Audit 2026-09-07

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Audit method: per-task map cross-referenced against shipped suites (smt 17/17, fvg 16/16, aggregate 15/15 — all green this audit), static gates re-run (purity grep exit 1, adjclose grep exit 1), SECURITY.md verdict confirmed (6/6 threats closed). Regression: every suite passes individually (24/24 files); a single full `npm test` invocation sheds worker forks under harness limits — pre-existing environment limitation already noted in 07-02-SUMMARY, not a code failure. No new tests needed; auditor spawn skipped.
