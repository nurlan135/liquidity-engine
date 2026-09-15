---
phase: 16-fatal-flaw-invalidation
plan: '01'
subsystem: ict-methodology
tags: [invalidation, fatal-flaw, HARD-SOFT, zustand-selector, vitest, purity]

# Dependency graph
requires:
  - phase: 15-why-now-trigger-engine
    provides: TriggerOutput shape plus evaluateTrigger plus selectTrigger block plus sharedEpoch single time truth
provides:
  - Pure checkFatalFlaw flaw-after-trigger supersession (HARD kill vs SOFT downgrade) with serializable output
  - Co-located disjunction plus determinism plus boundary test table
  - selectFatalFlaw derived selector sharing the trigger epoch
affects: [16-02 prose tables, phase-17-ticket-suppression, phase-17-section-6-block, phase-18-population-replay]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 14000
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [first-match-wins disjunction with order-as-precedence, SOFT-gated-on-FIRING with carriedArmedReason, selector flaw-after-trigger by function order on one sharedEpoch call]

key-files:
  created: [src/lib/ict/invalidation.ts, src/lib/ict/invalidation.test.ts]
  modified: [src/lib/store.ts]

key-decisions:
  - "SOFT flaws gate on FIRING verdicts only and carry trigger.reasonKey as carriedArmedReason; HARD flaws kill from any state"
  - "selectFatalFlaw returns null on trigger-null (degraded) in this tracer; HARD-on-null sub-case deferred per plan"
  - "Tracer prose is minimal (one reason plus one unblock template per key, neutral sentence fallback, standing caution); full D-08/D-09/D-10 tables land in 16-02"

patterns-established:
  - "Flaw-after-trigger by call order on one shared epoch — supersession is function order, never timestamp racing"
  - "Boundary got-string throws on malformed envelopes; null envelopes degrade honestly, never throw"

requirements-completed: [FLAW-01, FLAW-02]

coverage:
  - id: D1
    description: "Pure checkFatalFlaw disjunction (HARD rollover, HARD stale, SOFT SMT, SOFT opposite-sweep, clean) with serializable output"
    requirement: "FLAW-02"
    verification:
      - kind: unit
        ref: "src/lib/ict/invalidation.test.ts#taxonomy disjunction table"
        status: pass
    human_judgment: false
  - id: D2
    description: "Same-snapshot determinism (100-run byte-identical) plus race fixture carrying trigger and flaw reasons"
    requirement: "FLAW-01"
    verification:
      - kind: unit
        ref: "src/lib/ict/invalidation.test.ts#determinism"
        status: pass
    human_judgment: false
  - id: D3
    description: "Boundary discipline (got-string throws on malformed input, honest degrade on null envelopes)"
    requirement: "FLAW-01"
    verification:
      - kind: unit
        ref: "src/lib/ict/invalidation.test.ts#boundary throws"
        status: pass
    human_judgment: false
  - id: D4
    description: "selectFatalFlaw derived selector sharing the trigger epoch with never-throw envelope"
    requirement: "FLAW-01"
    verification:
      - kind: unit
        ref: "src/lib/store.test.ts (33 passed)"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-09-11
status: complete
---

# Phase 16 Plan 01: Tracer Fatal-Flaw Invalidation Summary

**Pure checkFatalFlaw disjunction (HARD rollover/stale kill vs SOFT SMT/opposite-sweep downgrade) on the exact trigger snapshot, co-located taxonomy plus determinism tests, and a selectFatalFlaw selector sharing one epoch**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-11T11:35:00Z
- **Completed:** 2026-09-11T11:47:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- New pure `src/lib/ict/invalidation.ts`: `FlawClass`, `FlawReasonKey`, `FatalFlawInput`, `FatalFlawOutput` (10 fields), `checkFatalFlaw` first-match-wins disjunction per D-01/D-02 with D-12 SOFT-on-FIRING gating and D-15 `carriedArmedReason`
- New co-located `src/lib/ict/invalidation.test.ts`: 15 tests covering taxonomy table, 100-run determinism, race fixture, generic-label ban, and boundary throws
- Extended `src/lib/store.ts` with `selectFatalFlaw`: one `sharedEpoch(get)` call, trigger derived first, null on trigger-null/stale/throw, identical smt/judas envelopes plus boundary rollover derivation degrading to null
- Verification green: invalidation suite 15/15, taxonomy subset 10 passed, purity guard 2/2, store suite 33/33, `tsc --noEmit` clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer pure checkFatalFlaw core** - `940ca2e` (feat)
2. **Task 2: Wave 0 flaw tests** - `4367ff8` (test)
3. **Task 3: Minimal selectFatalFlaw plus shared epoch** - `0fb11c8` (feat)

## Files Created/Modified

- `src/lib/ict/invalidation.ts` - Pure flaw module: types, verbatim Azerbaijani reasons, unblock templates, boundary validators, disjunction body
- `src/lib/ict/invalidation.test.ts` - Fixture builders (Partial-override trigger/smt/judas/rollover/stale, DST-aware epoch) plus taxonomy/determinism/boundary describe blocks
- `src/lib/store.ts` - `selectFatalFlaw` interface entry plus selector implementation plus `checkFatalFlaw`/`FatalFlawOutput` imports with store-side type re-export

## Decisions Made

- SOFT branches consult the trigger verdict and return clean (verdict standing) on ARMED/WAIT rather than a separate "noted" shape — the clean output preserves `trigger.reason` so the render layer keeps showing the ARMED missing-gate reason
- Rollover derivation reuses the existing `selectRollover()` selector call inside inner try/catch (degrades to null) rather than a new inline `detectRollover` derivation — satisfies the plan's "selectRollover-style rollover derivation at the boundary" with less new code
- No `FLAW_*` constants in the tracer: the SMT unblock names the fixed "0.70" string (CORR_MIN reuse), so no new thresholds needed calibration pins

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Initial tracer commit accidentally staged both `invalidation.ts` and the test file together; reset `--soft` and split into per-task commits (`940ca2e` module only, `4367ff8` tests) to honor atomic per-task commit discipline
- PowerShell environment lacks `head`/`tail` pipe utilities; ran vitest/tsc commands without output pipes instead

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Tracer path proven end to end: trigger snapshot through `checkFatalFlaw` to `selectFatalFlaw` on one shared epoch
- 16-02 owns the full D-08/D-09/D-10 work: 4-cell direction-times-sweepSide sentence table, 3-entry challenge bank, verbatim `toBe` prose pins
- Phase 17 can consume `FatalFlawOutput` (class plus reason plus unblock plus carriedArmedReason plus asOf) for ticket suppression and the §6 block; Phase 18 can replay via carried `asOf`

## Self-Check: PASSED

- `src/lib/ict/invalidation.ts` FOUND, `src/lib/ict/invalidation.test.ts` FOUND, `src/lib/store.ts` contains `selectFatalFlaw`
- Commits `940ca2e`, `4367ff8`, `0fb11c8` all present in `git log`

---
*Phase: 16-fatal-flaw-invalidation*
*Completed: 2026-09-11*
