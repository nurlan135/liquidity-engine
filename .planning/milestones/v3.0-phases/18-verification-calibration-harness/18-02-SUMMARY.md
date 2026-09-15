---
phase: 18-verification-calibration-harness
plan: 02
subsystem: testing
tags: [vitest, parity-harness, contradiction-predicates, smt, amd]

# Dependency graph
requires:
  - phase: 15-why-now-trigger-engine
    provides: evaluateTrigger pure core plus direction-of-sweep-side map
  - phase: 16-fatal-flaw-invalidation
    provides: checkFatalFlaw SOFT SMT_SUPPRESSED downgrade gated on FIRING
provides:
  - Same-snapshot AMD/SMT-vs-trigger reason parity harness with pinned contradiction predicates
  - Suppressed-SMT pair semantics (trigger stays FIRE, flaw carries SOFT with carrier)
  - ARMED-or-better sweep proving zero contradictions across the roster
affects: [18-03 stale drill, v3.0 milestone verification]

actuals:
  tokens: 18000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns: [contradiction-framed predicates over a shared snapshot triple, NY-hours exemption scoped to AMD agreement only]

key-files:
  created: [src/lib/ict/parity.test.ts]
  modified: []

key-decisions:
  - "SMT rules framed as contradiction never requirement — suppressed-SMT fires stay legal at trigger layer"
  - "NY-hours bars exempt from AMD agreement but never from SMT-direction parity"
  - "Test-assertion-only surface: no UI indicator, no new exports, no store imports"

patterns-established:
  - "Parity feeds the identical judas/smt/amd object triple into evaluateTrigger and the contradiction predicates, never re-derived copies"
  - "Inputs echo contract (toBe pins) proves sharing per bar"

requirements-completed: [VERF-02]

coverage:
  - id: D1
    description: "Trigger prose never contradicts AMD/SMT state on the same snapshot"
    requirement: "VERF-02"
    verification:
      - kind: unit
        ref: "src/lib/ict/parity.test.ts#sweeps the full roster over every ARMED-or-better bar"
        status: pass
    human_judgment: false
  - id: D2
    description: "FIRE_SHORT plus BULLISH fails and FIRE_LONG plus BEARISH fails"
    requirement: "VERF-02"
    verification:
      - kind: unit
        ref: "src/lib/ict/parity.test.ts#fails the predicate for FIRE_SHORT paired with unsuppressed BULLISH"
        status: pass
    human_judgment: false
  - id: D3
    description: "Suppressed SMT fires assert SOFT downgrade at flaw layer, never a trigger contradiction"
    requirement: "VERF-02"
    verification:
      - kind: unit
        ref: "src/lib/ict/parity.test.ts#pairs every suppressed-SMT FIRE with a SOFT SMT_SUPPRESSED carrier"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-09-15
status: complete
---

# Phase 18 Plan 02: Parity Harness Summary

**Same-snapshot AMD/SMT-vs-trigger reason parity harness with five contradiction rules, NY-hours AMD exemption, suppressed-SMT pair asserts, and an ARMED-or-better sweep**

## Performance

- **Duration:** 10 min
- **Started:** 2026-09-15T14:40:00Z
- **Completed:** 2026-09-15T14:50:00Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments

- Tracer: FIRE_SHORT/BULLISH contradiction on one shared snapshot with inputs echo contract
- Full roster: FIRE_LONG/BEARISH mirror, ARMED-key-vs-gates total function, AMD-accumulation-vs-purge, NY-hours AMD exemption with SMT parity kept
- Hardening: suppressed-FIRE SOFT pair with carrier, suppressed-ARMED clean standing, 4-bar ARMED-or-better sweep with zero contradictions

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer contradiction** - `a9da06f` (test)
2. **Task 2: Full roster** - `0b37854` (test)
3. **Task 3: Pairs + sweep** - `3930235` (test)

## Files Created/Modified

- `src/lib/ict/parity.test.ts` - fixture builders, contradiction predicates, pair asserts, sweep; 11 tests green

## Decisions Made

- Contradiction framing (not requirement framing) so suppressed-SMT fires stay legal at trigger layer per D-05
- Fixtures tuned to locked semantics, never predicates weakened to pass

## Deviations from Plan

None - plan executed exactly as written (inline after executor subagent stalled; same task boundaries and commits).

## Issues Encountered

- Executor subagent dispatch stalled earlier in the session (plan 18-01 recovery precedent). Executed inline with identical task/commit granularity instead.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- VERF-02 proven: parity harness green, ready for 18-03 stale drill (Wave 2)
- No blockers

---
*Phase: 18-verification-calibration-harness*
*Completed: 2026-09-15*
