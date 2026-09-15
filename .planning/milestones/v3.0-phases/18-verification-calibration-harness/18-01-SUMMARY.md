---
phase: 18-verification-calibration-harness
plan: 01
subsystem: testing
tags: [vitest, replay-harness, transition-table, calibration-summary, determinism]

# Dependency graph
requires:
  - phase: 15-why-now-trigger-engine
    provides: evaluateTrigger pure core plus ARMED matrix plus firing log
  - phase: 16-fatal-flaw-invalidation
    provides: checkFatalFlaw pure core plus HARD/SOFT split
provides:
  - Bar-by-bar replay harness proving monotonic trigger/flaw transitions on a 20-session population
  - Pinned transition table with cause asserts (FIRING-exit triple, ARMED-to-QUIET gate-cause)
  - Calibration summary helper emitting firesPerWeek plus killRate plus band verdict
affects: [18-02 parity harness, 18-03 stale drill, v3.0 milestone verification]

actuals:
  tokens: 22000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns: [bar-by-bar replay driver with replay-owned alreadyFired, combined-state lookup with cause asserts, calibration summary with 4-week denominator]

key-files:
  created: [src/lib/ict/replay.test.ts]
  modified: []

key-decisions:
  - "Replay owns session-scoped alreadyFired mirroring appendFiringLog dedup — never the Zustand store"
  - "Transition table asserts the full (trigger, flaw) triple, never the verdict string alone"
  - "Calibration band verdict logs informationally without throwing — OUT-OF-BAND never fails the build"

patterns-established:
  - "Replay driver calls evaluateTrigger then checkFatalFlaw on the identical judas/smt object per bar"
  - "Combined-state function: QUIET=WAIT+clean, ARMED=ARMED+clean, FIRING=FIRE+clean, INVALIDATED=HARD, SOFT-transient=FIRE+downgraded renders ARMED"

requirements-completed: [VERF-01]

coverage:
  - id: D1
    description: "Bar-by-bar replay over the 20-session fixture never takes an illegal combined-state edge"
    requirement: "VERF-01"
    verification:
      - kind: unit
        ref: "src/lib/ict/replay.test.ts#replays 20 consecutive trading sessions green with edge probes"
        status: pass
    human_judgment: false
  - id: D2
    description: "Replay fixture contains at least one FIRING setup and at least one INVALIDATED setup"
    requirement: "VERF-01"
    verification:
      - kind: unit
        ref: "src/lib/ict/replay.test.ts#runs 3 sessions green with legal edges and emits the calibration summary"
        status: pass
    human_judgment: false
  - id: D3
    description: "Replay run emits fires/week plus kill-rate plus INVALIDATED count as structured JSON against the 1-4/week band"
    requirement: "VERF-01"
    verification:
      - kind: unit
        ref: "src/lib/ict/replay.test.ts#calibration summary band verdict"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-09-15
status: complete
---

# Phase 18 Plan 01: Replay Harness Summary

**Bar-by-bar replay harness over a hand-built 20-session fixture with pinned transition table, cause asserts, determinism pin, and calibration summary emission**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-15T09:46:40Z
- **Completed:** 2026-09-15T09:58:00Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments

- Tracer mini-replay: 3 NY sessions QUIET to FIRING to INVALIDATED with transition table and calibration summary JSON
- 20-session population fixture across 4 Mon-Fri weeks with killzone-edge probes (02:01/04:59 fire, 02:00/05:00 ARMED_MISSING_TIMING) and SMT-suppressed FIRING-to-ARMED downgrade edge
- Hardened asserts: FIRING-exit triple, ARMED-to-QUIET gate-cause, double-run determinism, V5 malformed-throw plus null-degrade

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer mini-replay** - `918d9fe` (test)
2. **Task 2: 20-session population** - `112c3a9` (test)
3. **Task 3: Hardened table + determinism + V5** - `482212e` (test)

## Files Created/Modified

- `src/lib/ict/replay.test.ts` - 20-session fixture, replay driver, transition table, calibration summary, 8 tests green

## Decisions Made

- Replay owns session-scoped alreadyFired (one FIRE per NY date, ARMED-or-better only) mirroring appendFiringLog dedup
- OUT-OF-BAND band verdict logs without throwing — the harness reports, never gates

## Deviations from Plan

None - plan executed exactly as written (task 3 work was present in the tree uncommitted after executor interruption; verified and committed without content changes).

## Issues Encountered

- Executor subagent interrupted after task 2 commit with task 3 work uncommitted in the tree. Recovered by verifying the uncommitted content matched task 3 acceptance criteria (8/8 tests green including determinism and boundary cases) and committing it as `482212e`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- VERF-01 proven: replay harness green, ready for 18-02 parity harness (Wave 1 peer) and 18-03 stale drill (Wave 2)
- No blockers

---
*Phase: 18-verification-calibration-harness*
*Completed: 2026-09-15*
