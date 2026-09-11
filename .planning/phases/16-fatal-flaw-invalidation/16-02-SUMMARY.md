---
phase: 16-fatal-flaw-invalidation
plan: '02'
subsystem: ict-methodology
tags: [invalidation, fatal-flaw, verbatim-prose, challenge-bank, zustand-selector, vitest, purity]

# Dependency graph
requires:
  - phase: 15-why-now-trigger-engine
    provides: TriggerOutput shape plus evaluateTrigger plus selectTrigger block plus sharedEpoch single time truth
  - phase: 16-fatal-flaw-invalidation
    provides: Tracer checkFatalFlaw disjunction plus selectFatalFlaw selector (16-01)
provides:
  - Full D-08 falsifiable sentence table (SENTENCE_BY_KEY 4-cell direction-cross-sweepSide lookup)
  - Full D-09 challenge bank (3-entry CHALLENGE_BY_KEY with code-order dominant-trap selection)
  - Verbatim Azerbaijani toBe pins on all reasons plus sentences plus challenges
  - flaw-stale refuse-null plus flaw-coherence epoch-sharing selector cases
affects: [phase-17-ticket-suppression, phase-17-section-6-block, phase-18-population-replay]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 9000
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [verbatim prose tables as exported records test-pinned with toBe, dominant-trap selection as code-ordering fact, store selector cases mirroring trigger-block idiom]

key-files:
  created: []
  modified: [src/lib/ict/invalidation.ts, src/lib/ict/invalidation.test.ts, src/lib/store.test.ts]

key-decisions:
  - "NONE clean reason locked to the fixed string instead of the trigger.reason passthrough; clean outputs carry the standing-caution challenge plus sentence table context"
  - "Exported REASON_BY_KEY plus UNBLOCK_BY_KEY plus SENTENCE_BY_KEY plus CHALLENGE_BY_KEY records so tests pin module truth alongside behavior outputs"
  - "Flaw-coherence test consumes the session FIRE first so back-to-back derivations read the same post-fire trigger on one poll"

patterns-established:
  - "Selection priority as code order (SMT, then opposite-sweep, else standing caution) makes challenge choice a code-ordering fact"
  - "Fixture sweepSide must be explicit for live-cell sentence pins — the default null-side fixture hits the neutral fallback"

requirements-completed: [FLAW-01, FLAW-03]

coverage:
  - id: D1
    description: "Full sentence table plus challenge bank as verbatim Azerbaijani with deterministic selection on every output"
    requirement: "FLAW-03"
    verification:
      - kind: unit
        ref: "src/lib/ict/invalidation.test.ts#prose verbatim pins plus bank discipline (6 passed)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Verbatim prose pins plus bank-size plus generic-label ban assertions"
    requirement: "FLAW-03"
    verification:
      - kind: unit
        ref: "src/lib/ict/invalidation.test.ts#prose verbatim pins plus bank discipline (6 passed)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Selector-level flaw behavior: stale-leg refuse-null plus epoch coherence plus never-throw plus trigger-null-never-SOFT"
    requirement: "FLAW-01"
    verification:
      - kind: unit
        ref: "src/lib/store.test.ts#flaw-stale plus flaw-coherence (2 passed)"
        status: pass
    human_judgment: false

# Metrics
duration: 25min
completed: 2026-09-11
status: complete
---

# Phase 16 Plan 02: Fatal-Flaw Prose Tables Plus Selector Coherence Summary

**Falsifiable direction-cross-sweepSide sentence table plus 3-entry Azerbaijani challenge bank with toBe pins, and flaw-stale plus flaw-coherence store selector cases on one shared epoch**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-11T11:55:00Z
- **Completed:** 2026-09-11T12:20:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Full D-08/D-09/D-10 prose contract in `src/lib/ict/invalidation.ts`: five-entry `REASON_BY_KEY`, five-entry `UNBLOCK_BY_KEY`, 4-cell `SENTENCE_BY_KEY` (LONG-LOW / SHORT-HIGH live cells, off-diagonal plus null-side neutral fallback), 3-entry `CHALLENGE_BY_KEY` with code-order dominant-trap selection, sentence plus challenge attached to every output including clean
- Prose `describe` block in `src/lib/ict/invalidation.test.ts`: `toBe` pins on all five reasons, all sentence cells, all three challenges; bank-size-3, repeat-call determinism, null-side fallback, generic-label ban with unblock parity, fixed-0.70 threshold with no live-reading interpolation — 21/21 tests green
- `flaw-stale` plus `flaw-coherence` cases in `src/lib/store.test.ts` mirroring the trigger-block idiom: live verdict then stale-nq15m refuse-null without throwing, back-to-back byte-identical outputs sharing the pinned seed epoch with carried context plus §6 strings — full suite 367/367 green, `tsc --noEmit` clean, purity guard 2/2

## Task Commits

Each task was committed atomically:

1. **Task 1: Sentence table plus challenge bank plus verbatim prose lock per D-08 D-09 D-10 D-13** - `44a9a67` (feat)
2. **Task 2: Verbatim prose pins plus bank-size plus ban assertions per D-04 D-10** - `eb2dd7f` (test)
3. **Task 3: Store flaw-stale plus flaw-coherence selector cases per FLAW-01** - `2041924` (test)

## Files Created/Modified

- `src/lib/ict/invalidation.ts` - REASON_BY_KEY / UNBLOCK_BY_KEY / SENTENCE_BY_KEY / CHALLENGE_BY_KEY records, `sentenceFor` / `challengeFor` selectors, sentence-plus-challenge on every output path, fixed NONE clean reason
- `src/lib/ict/invalidation.test.ts` - `invalidation: prose verbatim pins plus bank discipline` describe block (6 tests); NONE-on-ARMED assertion updated to the locked fixed string
- `src/lib/store.test.ts` - `flaw-stale` (refuse-null without throwing) and `flaw-coherence` (byte-identical back-to-back outputs sharing one pinned epoch) cases

## Decisions Made

- NONE clean reason locked to the fixed `Qüsur yoxdur: trigger hökmü qüvvədədir.` string instead of the tracer's `trigger.reason` passthrough — required by the plan's "NONE reason" lock and its `toBe` pin; the tracer test asserting passthrough was updated in the task-2 commit
- Exported the prose records (`REASON_BY_KEY`, `UNBLOCK_BY_KEY`, `SENTENCE_BY_KEY`, `CHALLENGE_BY_KEY`, `SENTENCE_FALLBACK`) so tests pin module truth alongside behavior outputs
- Flaw-coherence consumes the session FIRE first: `selectTrigger` appends the firing log on its first call, so the flaw derivations below both read the same post-fire trigger — back-to-back on one poll, never torn clocks
- No new `FLAW_*` constants: the SMT unblock reuses the fixed `0.70` string (CORR_MIN reference) as in the tracer, so no calibration pins were needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Prose test initially pinned the LONG-LOW sentence against the default fixture judas (`sweepSide: null`), which correctly hits the neutral fallback — fixed the test to pass an explicit `LOW`-side judas for the live cell. Test bug, not a module bug; sentence routing was already correct.
- PowerShell environment lacks `head`/`tail` pipe utilities; ran vitest/tsc commands without output pipes instead.
- Pre-existing `.planning/STATE.md` modification and untracked `.opencode/` directory were present before execution and belong to the orchestrator — left untouched per the no-STATE/ROADMAP-writes contract.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- §6-ready contract complete: every `FatalFlawOutput` carries verbatim reason plus sentence plus challenge plus unblock plus class, so Phase 17 renders the §6 block verbatim with no string work left
- Determinism proven at both layers (100-run pure plus back-to-back selector byte-equality), so Phase 18 replay inherits byte-identical strings on identical snapshots
- Ready for 16-03 (if any) or phase verification; no blockers

## Self-Check: PASSED

- `src/lib/ict/invalidation.ts` exports REASON_BY_KEY, SENTENCE_BY_KEY, CHALLENGE_BY_KEY — FOUND
- `src/lib/ict/invalidation.test.ts` prose describe block — FOUND, 21/21 green
- `src/lib/store.test.ts` flaw-stale plus flaw-coherence — FOUND, 35/35 green
- Commits `44a9a67`, `eb2dd7f`, `2041924` all present in `git log`
- Full suite 367/367, `tsc --noEmit` clean, purity guard 2/2

---
*Phase: 16-fatal-flaw-invalidation*
*Completed: 2026-09-11*
