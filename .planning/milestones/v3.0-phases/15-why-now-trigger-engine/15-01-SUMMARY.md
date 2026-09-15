---
phase: 15-why-now-trigger-engine
plan: '01'
subsystem: ict-trigger
tags: [trigger, three-gate-fusion, killzone, judas, fvg, zustand, vitest]

# Dependency graph
requires:
  - phase: 14-audit-debt-cleanup-purity-guard
    provides: [ict purity grep guard, Asia fallback sessionDate]
provides:
  - evaluateTrigger pure three-gate fusion with pinned TRIGGER_* constants
  - Co-located trigger.test.ts with happy-path, constant-pin, QUIET, NY-never-fires coverage
  - selectTrigger derived selector with sharedEpoch plus capped firing log
affects: [15-02 ARMED matrix, 15-03 prose lock and serializer, 16-flaw-snapshot, 17-ticket, 18-replay]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 7291
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [three-gate independent counting, cooldown-as-injected-boolean, shared store epoch helper]

key-files:
  created:
    - src/lib/ict/trigger.ts
    - src/lib/ict/trigger.test.ts
  modified:
    - src/lib/store.ts

key-decisions:
  - "Reason constants use the Plan 03 locked D-09 sentences verbatim from day one so later plans only pin, never rewrite"
  - "FiringLogEntry lives in trigger.ts and is imported by the store, keeping the log shape next to the verdict that fills it"
  - "No firingLogToJson serializer in this plan — D-08 export lands in 15-03 per the plan split"
  - "Already-fired ARMED appends flow to the log in this plan; the downgrade-repeat skip lands in 15-03 hardening"

patterns-established:
  - "Trigger gate independence: timing is a clock check, purge is confirmed-plus-side, displacement is threshold-plus-FVG — never three reads of one detector chain"
  - "sharedEpoch(get): module-scope epoch helper reused by selectAMD and selectTrigger for single time truth"

requirements-completed: [TRIG-01, TRIG-04]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "FIRE_LONG on LOW 3-of-3 and FIRE_SHORT on HIGH 3-of-3 with verbatim Azerbaijani reasons through pure evaluateTrigger"
    requirement: "TRIG-01"
    verification:
      - kind: unit
        ref: "src/lib/ict/trigger.test.ts#trigger: TRIG-01 happy paths"
        status: pass
    human_judgment: false
  - id: D2
    description: "Choppy-sideways fixture yields WAIT_FOR_MANIPULATION and NY-hours sweep never fires"
    requirement: "TRIG-01"
    verification:
      - kind: unit
        ref: "src/lib/ict/trigger.test.ts#trigger: choppy-sideways spam guard stays QUIET"
        status: pass
      - kind: unit
        ref: "src/lib/ict/trigger.test.ts#trigger: D-01/D-02 NY sweep never fires"
        status: pass
    human_judgment: false
  - id: D3
    description: "TRIGGER_KZ_START_MIN 120, TRIGGER_KZ_END_MIN 300, TRIGGER_DISP_MULT 0.5, TRIGGER_LOG_CAP 50 pinned with CALIBRATION-PROVISIONAL comments"
    requirement: "TRIG-04"
    verification:
      - kind: unit
        ref: "src/lib/ict/trigger.test.ts#trigger: calibrated constants pinned"
        status: pass
    human_judgment: false
  - id: D4
    description: "selectTrigger end-to-end path from live detectors to FIRE verdict plus firing-log append with shared epoch"
    requirement: "TRIG-01"
    verification:
      - kind: integration
        ref: "scratch store selector test (FIRE_LONG plus one log entry plus stale refusal, file removed after verification)"
        status: pass
    human_judgment: false

# Metrics
duration: 28min
completed: 2026-09-10
status: complete
---

# Phase 15 Plan 01: Tracer Trigger Slice Summary

**Pure three-gate evaluateTrigger plus co-located gate tests plus selectTrigger with capped firing log, proven end to end on first commit**

## Performance

- **Duration:** 28 min
- **Started:** 2026-09-10T12:28:02Z
- **Completed:** 2026-09-10T12:56:11Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- `evaluateTrigger` fuses detector outputs into FIRE_LONG / FIRE_SHORT / ARMED / WAIT_FOR_MANIPULATION with independent timing, purge, and displacement gates
- All four TRIGGER_* constants ship with CALIBRATION-PROVISIONAL comments and boundary-test pins
- Co-located trigger.test.ts covers happy paths, constant pins, choppy QUIET, NY-never-fires, and suppressed-SMT passthrough (8 tests green)
- `selectTrigger` derives one end-to-end verdict from live detectors via a shared epoch and appends ARMED-or-better to a capped firing log
- Full suite stays green: 32 files, 308 tests (300 baseline + 8 new), tsc clean, purity guard green

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer pure evaluateTrigger core** - `693145a` (feat)
2. **Task 2: Wave 0 trigger tests** - `c639df0` (feat)
3. **Task 3: Minimal selectTrigger plus sharedEpoch plus firing log** - `cc4d3cd` (feat)

**Plan metadata:** pending orchestrator commit (STATE.md/ROADMAP.md owned by orchestrator)

## Files Created/Modified

- `src/lib/ict/trigger.ts` - Pure three-gate fusion: TRIGGER_* constants, TriggerInput/Output/FiringLogEntry types, evaluateTrigger, nyMinutesOf/nyDateOf helpers, D-09 verbatim reasons
- `src/lib/ict/trigger.test.ts` - Fixture builders plus happy paths plus constant pins plus choppy QUIET plus NY-never-fires plus suppressed-SMT case
- `src/lib/store.ts` - sharedEpoch helper, selectTrigger selector, firingLog plus firingLogOverflow state, appendFiringLog action

## Decisions Made

- Reason constants use the Plan 03 locked D-09 sentences verbatim from day one (byte-verified against 15-RESEARCH.md with a codepoint comparison script), so 15-02/15-03 only pin, never rewrite.
- FiringLogEntry is defined in trigger.ts and imported by the store, keeping the log shape next to the verdict that fills it (plan task 3 explicitly requires the import direction).
- No `firingLogToJson` serializer in this plan — D-08 export lands in 15-03 per the plan split; no Blob/anchor code anywhere.
- Already-fired ARMED appends flow to the log in this plan; the downgrade-repeat skip is 15-03's hardening call, keeping each plan's diff reviewable.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- PowerShell `head`/`Select-String` quoting fights with inline Python one-liners: worked around with script files under the temp dir (check-reasons.py) and Get-Content idioms. No impact on deliverables.
- An Edit no-op briefly joined two lines at the store `create()` call site: caught on immediate re-read, repaired with the sharedEpoch insertion, verified by tsc clean. No commit contained the malformed state.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 15-02 (ARMED matrix, cooldown, FVG downgrade, boundary throws) which builds on the D-01/D-02/D-07/D-10 tracer base.
- Tracer feedback gate: end-to-end verified — live London confirmed LOW sweep yields FIRE_LONG with 3/3 gates plus BULLISH entry FVG through selectTrigger, one D-07 log entry appended, stale legs refuse null without throw. Expanding.
- Verdict prose uses the locked D-09 sentences, so 15-03's prose task is pin-and-verify, not draft-and-review.

---
*Phase: 15-why-now-trigger-engine*
*Completed: 2026-09-10*
