---
phase: 17-paper-ticket-4-6-live-ui-chart-pins
plan: 05
subsystem: execution
tags: [zustand, trigger, fatal-flaw, ticket, selector-purity, firing-log]
requires:
  - phase: 15-why-now-trigger-engine
    provides: [evaluateTrigger derivation plus firing log plus sharedEpoch single-time-truth]
  - phase: 16-fatal-flaw-invalidation
    provides: [checkFatalFlaw flaw-after-trigger same-snapshot contract]
provides:
  - selectTriggerPure pure render-path derivation with zero firing-log writes
  - commitTriggerLog explicit once-per-poll logging commit point in the poll tick
  - Single-snapshot selectFatalFlaw plus selectTicket judged on the identical trigger object
  - Snapshot-equality regression tests pinning back-to-back agreement plus ticket flaw-snapshot equality
affects: [18-verification-calibration, live-panels, report-sections-4-6, chart-pins]
actuals:
  tokens: 6200
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns: [pure-derivation-plus-explicit-commit-point, single-snapshot-flaw-after-trigger, snapshot-equality-regression]
key-files:
  created: []
  modified: [src/lib/store.ts, src/lib/store.test.ts]
key-decisions:
  - "commitTriggerLog reads sharedEpoch (not out.asOf) because TriggerOutput carries no epoch envelope — single time truth stays in sharedEpoch"
  - "selectTicket evaluates checkFatalFlaw inline on the identical trigger object instead of calling selectFatalFlaw, so one derivation serves flaw plus ticket with zero re-derivation"
  - "Poll-tick commit lives on the nq15m refresh chain (mount plus interval) because nq15m is the last trigger-critical leg — commit fires only after legs just refreshed"
patterns-established:
  - "Pure derivation plus explicit commit point: render-path selectors read selectTriggerPure; only commitTriggerLog appends to firingLog"
requirements-completed: [TICK-01, TICK-04]
coverage:
  - id: D1
    description: "Pure render-path selectors plus one explicit log commit point plus single-snapshot flaw and ticket chain"
    requirement: "TICK-01"
    verification:
      - kind: unit
        ref: "src/lib/store.test.ts#trigger-snapshot-agreement"
        status: pass
      - kind: unit
        ref: "src/lib/store.test.ts#ticket-flaw-snapshot"
        status: pass
      - kind: unit
        ref: "command: npx vitest run src/lib/store.test.ts (45/45 green)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Same-frame panel determinism: back-to-back trigger calls agree and every render-path derivation shares one snapshot"
    requirement: "TICK-04"
    verification:
      - kind: unit
        ref: "src/lib/store.test.ts#flaw-coherence"
        status: pass
      - kind: unit
        ref: "src/lib/store.test.ts#ticket-coherence"
        status: pass
      - kind: unit
        ref: "command: npm test sequential (35 files, 391 tests green)"
        status: pass
    human_judgment: false
duration: 25min
completed: 2026-09-14
status: complete
---

# Phase 17 Plan 05: CR-03 Selector-Purity Gap Closure Summary

**Pure trigger derivation plus one explicit poll-tick commit point restores the flaw-after-trigger same-snapshot contract; flaw is judged on the FIRE the ticket prices, never the ARMED_ALREADY_FIRED echo.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-14T14:20:00Z
- **Completed:** 2026-09-14T14:45:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- selectTriggerPure pure derivation: verbatim pre-fix derivation minus the state write, zero set calls, render-safe
- selectTrigger thin pure delegate to selectTriggerPure; commitTriggerLog single logging commit point invoked once per poll tick on the nq15m refresh chain
- selectFatalFlaw derives from selectTriggerPure exactly once per call; selectTicket evaluates checkFatalFlaw inline on that identical trigger object
- Snapshot-equality regression net: trigger-snapshot-agreement plus ticket-flaw-snapshot cases; masking pre-consume blocks rewritten to fixed-contract assertions
- Full suite green sequential (35 files, 391 tests); ticket.ts untouched with no store imports

## Task Commits

Each task was committed atomically:

1. **Task 1: Pure trigger derivation plus single-snapshot flaw and ticket** - `c5911ae` (feat)
2. **Task 2: Snapshot-equality regression plus masking-assertion update** - `45a7bd7` (test)

_Plan metadata: SUMMARY commit handled by orchestrator (STATE/ROADMAP owned by orchestrator per dispatch instructions)_

## Files Created/Modified

- `src/lib/store.ts` - selectTriggerPure plus commitTriggerLog plus single-snapshot selectFatalFlaw/selectTicket plus poll-tick commit wiring
- `src/lib/store.test.ts` - Fixed-contract assertions plus two snapshot-equality regression cases

## Decisions Made

- commitTriggerLog reads `sharedEpoch(get)` for the append epoch instead of a trigger-carried field, because TriggerOutput has no `asOf` envelope (tsc caught the first draft). Single time truth stays in sharedEpoch; the derived output plus its epoch each flow exactly once into appendFiringLog.
- selectTicket evaluates `checkFatalFlaw` inline on the identical trigger object rather than calling `selectFatalFlaw`, guaranteeing one derivation serves flaw plus ticket with zero re-derivation on the same epoch.
- The poll-tick commit rides the nq15m refresh chain (both the mount timeout and the 60s interval, via `.finally()` so failures still commit the derived verdict honestly) because nq15m is the last trigger-critical leg to refresh.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] commitTriggerLog epoch source did not exist on TriggerOutput**
- **Found during:** Task 1 (Pure trigger derivation plus single-snapshot flaw and ticket)
- **Issue:** First draft read `out.asOf` for the append epoch, but `TriggerOutput` carries no epoch envelope — `npx tsc --noEmit` failed with TS2339 on two lines. The plan said "its epoch" without naming the source.
- **Fix:** Read `sharedEpoch(get)` inside `commitTriggerLog` and pass that epoch to `appendFiringLog` exactly once. Derivation still invoked exactly once; epoch flows from the single time truth.
- **Files modified:** src/lib/store.ts
- **Verification:** `npx tsc --noEmit` clean; `npx vitest run src/lib/store.test.ts` 43/43 green at that point
- **Committed in:** c5911ae (Task 1 commit)

**2. [Rule 1 - Bug] trigger-coherence assertion referenced a non-existent TriggerOutput.asOf field**
- **Found during:** Task 2 (Snapshot-equality regression plus masking-assertion update)
- **Issue:** The new fixed-contract assertion in flaw-coherence expected `trigger.asOf` to equal the shared epoch, but TriggerOutput has no `asOf` — test failed with `expected undefined to be 1770624000`.
- **Fix:** Replaced the epoch assertion with a comment documenting that TriggerOutput carries the snapshot via gate inputs plus entryFvg, not an epoch envelope; the epoch pin stays asserted on flaw and ticket `asOf`.
- **Files modified:** src/lib/store.test.ts
- **Verification:** `npx vitest run src/lib/store.test.ts` 45/45 green
- **Committed in:** 45a7bd7 (Task 2 commit)

**3. [Rule 2 - Missing Critical] Pre-existing trigger-fire and trigger-serializer tests assumed render logs**
- **Found during:** Task 1 verification (store suite red before Task 2 started)
- **Issue:** Two pre-existing tests asserted `selectTrigger()` appends to firingLog (length 1 after one read). Under the fixed contract render never logs, so both failed with length 0. Leaving them red would block the plan's own verify gate.
- **Fix:** Updated trigger-fire to assert log length 0 after pure reads, then one commitTriggerLog appends exactly one FIRE entry; updated trigger-serializer to commit via commitTriggerLog before exporting. Both keep their original intent (log shape, dedup, cooldown) through the new commit point.
- **Files modified:** src/lib/store.test.ts
- **Verification:** `npx vitest run src/lib/store.test.ts` green before Task 2 edits began
- **Committed in:** Task 1 working tree (carried into the Task 2 commit 45a7bd7 scope-wise; the Task 1 commit c5911ae holds the store.ts half)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 missing-critical test update)
**Impact on plan:** All three required for the fixed contract to hold end to end. No scope creep — no panel, report, chart, or ticket.ts changes.

## Issues Encountered

- `npm test` (default parallel workers) OOM-crashed on this Windows box: vitest worker forks died with exit 134 (`JavaScript heap out of memory`), 29/33 files passing before workers collapsed. Re-ran sequentially (`--pool=forks --maxWorkers=1 --no-file-parallelism`): 35 files, 391 tests, all green. Environment limitation, not a code regression — the store suite in isolation passes under default settings too (45/45).
- Two stray comment-only edits during Task 1 (a mis-placed "Roll sentiment" note near refreshNQ1H) were immediately reverted in the same working session; final diff contains only plan-scoped changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CR-03 closed: render-path selectors are pure, the firing log has one explicit poll-tick commit point, and flaw is judged on the identical FIRE object the ticket prices.
- Phase 18 can replay the chain bar-by-bar against a deterministic derivation; the snapshot-equality regression net (trigger-snapshot-agreement, ticket-flaw-snapshot, flaw-coherence, ticket-coherence) pins the contract.
- Human glance items from 17-VERIFICATION.md (EXECUTE/STAND ASIDE visuals, banner persistence, degraded dimming) remain for end-of-phase UAT per `human_verify_mode: end-of-phase`; nothing in this plan changes rendered output, only its determinism.

---
*Phase: 17-paper-ticket-4-6-live-ui-chart-pins*
*Completed: 2026-09-14*

## Self-Check: PASSED

- `src/lib/store.ts` selectTriggerPure plus commitTriggerLog present: FOUND
- `src/lib/store.test.ts` trigger-snapshot-agreement plus ticket-flaw-snapshot cases present: FOUND
- Task commits c5911ae plus 45a7bd7 exist in `git log --oneline --all`: FOUND
- `npx vitest run src/lib/store.test.ts` 45/45 green; sequential `npm test` 35 files / 391 tests green; ticket.ts has no store imports: VERIFIED
