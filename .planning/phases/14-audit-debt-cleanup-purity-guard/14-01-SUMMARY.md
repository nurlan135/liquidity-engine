---
phase: 14-audit-debt-cleanup-purity-guard
plan: 01
subsystem: chart-zones
tags: [debt-cleanup, zoneBands, dealing-range, zero-behavior-change]
requires: [DEBT-01]
provides: [narrowed-zoneBands-input]
affects: [14-02, 14-03]
tech-stack:
  added: []
  patterns: [Pick-narrowed-input, minimal-test-literals]
key-files:
  created: []
  modified: [src/lib/zone-bands.ts, components/charts/nq-chart.tsx, src/lib/zone-bands.test.ts]
key-decisions: []
patterns-established: []
requirements-completed:
  - DEBT-01
coverage:
  - id: narrowed-zoneBands-signature
    description: zoneBands accepts minimal high/low/eq input and computes identical premium/discount halves
    requirement: DEBT-01
    verification:
      - kind: automated
        ref: npx vitest run src/lib/zone-bands.test.ts (6/6 green)
        status: pass
    human_judgment: false
  - id: trimmed-nq-chart-getter
    description: nq-chart zone getter passes exactly high/low/eq and dimming still flows via opacityScale
    requirement: DEBT-01
    verification:
      - kind: automated
        ref: npx vitest run src/lib/zone-bands.test.ts -t opacity (3/3 hit, green)
        status: pass
    human_judgment: false
  - id: full-suite-green
    description: full test suite stays green with zero behavior change
    requirement: DEBT-01
    verification:
      - kind: automated
        ref: npx vitest run --pool=forks --maxWorkers=2 (298/298 green)
        status: pass
      - kind: automated
        ref: npx tsc --noEmit (clean, exit 0)
        status: pass
    human_judgment: false
actuals:
  tokens: 875
  tasks: 3
  commits: 3
plan_head_before: 4d891fe809e3ba7fa8d56feb3e870f4a56ca2a70
duration: ~5 min
completed: 2026-09-09
status: complete
---

# Phase 14 Plan 01: zoneBands Dead-Arg Cleanup Summary

Narrowed `zoneBands` from full `DealingRange` to `Pick<DealingRange, 'high' | 'low' | 'eq'>`, deleted the dead `window`/`asOf`/`thinHistory` keys at the nq-chart call site, and shrunk six test literals to three keys — geometry, validation, and dimming byte-identical.

## Performance

- **Duration:** ~5 min
- **Tasks:** 3 completed
- **Commits:** 3 (measured via `git rev-list --count 4d891fe..HEAD`)
- **Files:** 3 modified

## Accomplishments

- `zoneBands` signature narrowed to the minimal input; runtime body untouched, validation error strings byte-identical.
- nq-chart zone getter passes exactly `high`/`low`/`eq`; `opacityScale` dimming line untouched; second `opacityScale` effect block untouched.
- All six test literals shrunk to three keys with identical values; assertions and opacity describe block verbatim.
- Full suite 298/298 green; `tsc --noEmit` clean; diff shows only the signature line, three deleted call-site keys, and shrunk literals.

## Task Commits

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Narrow zoneBands signature to minimal high/low/eq input | c806784 | src/lib/zone-bands.ts |
| 2 | Trim the nq-chart zone getter call to three keys | 62986aa | components/charts/nq-chart.tsx |
| 3 | Shrink zone-bands.test.ts literals to minimal objects | 3b3af16 | src/lib/zone-bands.test.ts |

Plan metadata commit: ac6239f (`docs(14-01): complete zoneBands dead-arg cleanup plan`)

## Files Created/Modified

- Modified: `src/lib/zone-bands.ts` — parameter `DealingRange` → `Pick<DealingRange, 'high' | 'low' | 'eq'>` (1 line).
- Modified: `components/charts/nq-chart.tsx` — deleted `window: 0`, `asOf: ''`, `thinHistory` keys from getter literal (3 lines removed).
- Modified: `src/lib/zone-bands.test.ts` — six literals reduced to `{ high, low, eq }` (6 lines changed).

## Decisions Made

None — plan executed exactly as written; D-01 implemented, D-02 honored (DealingRange.thinHistory untouched).

## Deviations from Plan

None - plan executed exactly as written.

Note: the first `npm test` invocation (default pool) reported 146/173 with 12 `vitest-pool worker fork` errors — a Windows resource-spawn flake, not a test failure. Re-run with `--pool=forks --maxWorkers=2` passed 298/298, matching the phase baseline.

## Issues Encountered

- `npm test` default-pool worker-fork flake on Windows (12 fork errors, no test failures). Resolved by re-running with `--pool=forks --maxWorkers=2` → 298/298. Not a code issue; no fix attempted beyond the constrained re-run.

## User Setup Required

None.

## Next Phase Readiness

- DEBT-01 satisfied. 14-02 (thin-tier unexport) and 14-03 (purity guard + Asia note) are unblocked; no shared-file conflicts (this plan touched only the three zoneBands files).
- `DealingRange.thinHistory` remains in `range.ts`/`types.ts` per D-02 — 14-02 must not remove it.

## Self-Check: PASSED

- Key files exist: `src/lib/zone-bands.ts`, `components/charts/nq-chart.tsx`, `src/lib/zone-bands.test.ts` — all FOUND.
- Commits exist: `c806784`, `62986aa`, `3b3af16` — all in `git log`.
- Acceptance criteria re-verified: signature names exactly high/low/eq; getter literal carries exactly high/low/eq; six test calls three-key; full suite 298/298 green; tsc clean.
