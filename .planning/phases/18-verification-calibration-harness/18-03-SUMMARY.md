---
phase: 18-verification-calibration-harness
plan: 03
subsystem: testing
tags: [vitest, stale-drill, degraded-provenance, thin-tier, flaw-first]

# Dependency graph
requires:
  - phase: 16-fatal-flaw-invalidation
    provides: checkFatalFlaw HARD STALE_LEG plus fixtureStale builders
  - phase: 17-paper-ticket-4-6-live-ui-chart-pins
    provides: computeTicket degraded envelope plus thinTierCopy provenance
  - plan: 18-01
    provides: replay harness precedent for frozen fixtures
  - plan: 18-02
    provides: parity harness precedent for contradiction-framed asserts
provides:
  - Stale-serve leg-matrix drill proving degraded-with-provenance ticket open
  - Thin-tier degraded envelope with clean flaw plus thin provenance
affects: [v3.0 milestone verification]

actuals:
  tokens: 12000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns: [flaw-first routing mirroring selectTicket order, leg-correct degraded envelope asserts]

key-files:
  created: [src/lib/ict/stale-drill.test.ts]
  modified: []

key-decisions:
  - "Flaw-first routing mandatory — pure computeTicket never reads stale flags itself"
  - "Thin is not a flaw input: clean flaw plus thin degraded envelope, never a HARD kill"

patterns-established:
  - "Each stale cell routes checkFatalFlaw into computeTicket with leg-naming degraded envelope"
  - "Zero EXECUTE verdicts on any stale input asserted explicitly per cell"

requirements-completed: [VERF-03]

coverage:
  - id: D1
    description: "Every stale leg individually plus all-stale plus thin-tier yields degraded-with-provenance, never a full-strength ticket"
    requirement: "VERF-03"
    verification:
      - kind: unit
        ref: "src/lib/ict/stale-drill.test.ts#kills each single leg as HARD STALE_LEG with leg-correct provenance"
        status: pass
    human_judgment: false
  - id: D2
    description: "Each stale cell routes through checkFatalFlaw first then computeTicket with leg provenance"
    requirement: "VERF-03"
    verification:
      - kind: unit
        ref: "src/lib/ict/stale-drill.test.ts#routes stale-es through HARD STALE_LEG to STAND_ASIDE with es provenance"
        status: pass
    human_judgment: false
  - id: D3
    description: "Full suite stays green including banned-word quarantine and purity guard with zero new installs"
    requirement: "VERF-03"
    verification:
      - kind: unit
        ref: "npm test — 38 files, 420 tests green"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-09-15
status: complete
---

# Phase 18 Plan 03: Stale Drill Summary

**Stale-serve leg-matrix drill with flaw-first routing, leg-correct degraded provenance, thin-tier cell, and full-suite green**

## Performance

- **Duration:** 5 min
- **Started:** 2026-09-15T14:51:00Z
- **Completed:** 2026-09-15T14:55:00Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments

- Tracer: stale-es through HARD STALE_LEG to STAND_ASIDE with es provenance
- Full leg matrix: four single legs plus all-stale first-match-wins plus V5 malformed-throw and null-degrade pair
- Thin-tier cell: clean flaw plus thin degraded envelope with thinTierCopy provenance; full suite 420/420 green

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer stale leg** - `636fede` (test)
2. **Task 2: Leg matrix + boundary** - `7a863c5` (test)
3. **Task 3: Thin-tier + full gate** - `3df13d7` (test)

## Files Created/Modified

- `src/lib/ict/stale-drill.test.ts` - FIRE-capable frozen snapshot, leg matrix, thin-tier cell; 6 tests green

## Decisions Made

- Flaw-first routing mirrors selectTicket order — no direct-to-ticket stale bypass
- Thin-tier asserts clean flaw (reasonKey NONE) then dimmed-with-provenance ticket

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all three task commits were already in the tree; verified green and closed out with this summary.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- VERF-03 proven: stale drill green, Phase 18 all three harnesses complete (VERF-01/02/03)
- Ready for phase verification and roadmap update

---
*Phase: 18-verification-calibration-harness*
*Completed: 2026-09-15*
