---
phase: 21-execution-polish
plan: '02'
subsystem: parity-harness
tags: [vitest, pools-parity, color-sync, D-04, D-05, D-11, D-16, POL-03]
requires: [phase-20-selectPools, phase-20-pool-overlay, phase-19-evaluatePools]
provides: [pools-parity-harness, d16-color-sync-pin]
affects: [21-03, 21-04, verify-work]
tech-stack:
  added: []
  patterns: [input-independence-parity, case-normalized-token-pin]
key-files:
  created: [src/lib/pools-parity.test.ts]
  modified: [src/lib/pool-overlay.test.ts]
key-decisions: []
requirements-completed: [POL-03]
coverage:
  - id: pools-on-off-verdict-equality
    description: Trigger, flaw and ticket outputs toEqual with pools exercised versus null across FIRE_LONG, FIRE_SHORT and ARMED triples with a non-vacuous on-mode
    requirement: POL-03
    verification:
      - kind: automated
        ref: npm test -- src/lib/pools-parity.test.ts
        status: pass
    human_judgment: false
  - id: d16-color-sync-pin
    description: Overlay rank-1 literals equal globals.css dark tokens case-insensitively, rank-2 rgba same hue at half alpha, muted gray literal pinned
    requirement: POL-03
    verification:
      - kind: automated
        ref: npm test -- src/lib/pool-overlay.test.ts
        status: pass
    human_judgment: false
  - id: full-suite-green
    description: Full suite plus tsc clean at plan exit
    requirement: POL-03
    verification:
      - kind: automated
        ref: npm test (487 passed) + npx tsc --noEmit (clean)
        status: pass
    human_judgment: false
actuals:
  tokens: 339
  tasks: 2
  commits: 2
duration: 12m
completed: 2026-10-28
status: complete
plan_head_before: 6f4cb3f65019a02aa30fbcc616db7e5e25e3d39b
plan_head_after: 15f8a0bb49a09e1aa89bb5a04fca7ea287a6a61
---

# Phase 21 Plan 02: Parity Proof Summary

Vitest harness proving trigger, flaw and ticket verdicts are identical pools-on versus pools-off with a non-vacuous on-mode, plus the D-16 overlay-literal versus CSS-token color-sync pin — test-only, zero production change, full suite 487 green with tsc clean.

## Performance

- Duration: ~12 minutes from plan read to SUMMARY commit
- Commits: 2 (one per task, atomic)
- Files: 1 created (311 lines), 1 modified (+28 lines)

## Accomplishments

- New `src/lib/pools-parity.test.ts`: FIRE_LONG, FIRE_SHORT and ARMED_MISSING_PURGE triples each run through evaluateTrigger, checkFatalFlaw and computeTicket twice (on-mode then off-mode) with `toEqual` on all three full outputs
- Extended `src/lib/pool-overlay.test.ts` with the D-16 color-sync pin describe block (4 tests)
- Prior phase gate commands green verbatim; full suite 487/487 green; `tsc --noEmit` clean

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Pools-on versus pools-off verdict-equality harness | d646ef0 | src/lib/pools-parity.test.ts (created) |
| 2 | D-16 color-sync pin plus suite proof | 15f8a0b | src/lib/pool-overlay.test.ts (modified) |

## Files Created/Modified

- Created: `src/lib/pools-parity.test.ts` — pools-on versus pools-off verdict-equality harness (D-04, D-05, D-11)
- Modified: `src/lib/pool-overlay.test.ts` — D-16 color-sync pin block (case-normalized rank-1 pins, rank-2 rgba pins, muted gray literal pin)

## Decisions Made

None — plan executed exactly as written; no architectural choices arose.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The on-mode `evaluatePools` over the BSL_HIGHS/SSL_LOWS D1 leg returned a non-empty selection on the first run, so no fallback to the hand-built `LiquidityPool` path was needed.

## User Setup Required

None.

## Next Phase Readiness

POL-03 dev proof is in place: the D-17 pools-never-vote lock now has an automated equality harness as evidence. Plans 21-03 and 21-04 can proceed independently — neither touches the harness files.

## Self-Check: PASSED

- FOUND: src/lib/pools-parity.test.ts
- FOUND: src/lib/pool-overlay.test.ts
- FOUND: d646ef0 (ancestor of HEAD)
- FOUND: 15f8a0b (HEAD)
- Full suite 487/487 green, tsc clean at plan exit
