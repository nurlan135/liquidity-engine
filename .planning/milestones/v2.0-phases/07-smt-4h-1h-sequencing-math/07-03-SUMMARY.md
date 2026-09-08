---
phase: 07-smt-4h-1h-sequencing-math
plan: 03
subsystem: ict-math
tags: [aggregate, 4H-synthesis, date-fns-tz, IANA, DST, vitest, ICT-11]

# Dependency graph
requires:
  - phase: 06-dual-symbol-proxy-data-contracts
    provides: IntradayCandle epoch-second contract plus closedOnlyIntraday discipline
provides:
  - NY-anchored 1H to 4H synthesis in pure aggregate.ts emitting Candle blocks
  - 15-test vitest suite pinning anchor, DST pair, partial-block, determinism, reuse, edges
affects: [phase-08-selectors, phase-09-report, session-consumers]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 3489
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: [per-candle IANA wall-clock via formatInTimeZone, civil-date anchor-day arithmetic, complete-blocks-only emission]

key-files:
  created: [src/lib/ict/aggregate.ts, src/lib/ict/aggregate.test.ts]
  modified: []

key-decisions:
  - "Resolve NY wall clock per candle with formatInTimeZone, not ms-plus-getTimezoneOffset arithmetic"
  - "Anchor-day rollback via integer civil-date math, never Date construction"
  - "Reuse fromZonedTime in fixtures so DST wall-clock expectations carry no hand offsets"

patterns-established:
  - "House boundary template: closedOnlyIntraday first, finite-OHLC drop, ascending sort, timestamp dedupe"
  - "IANA wall-clock reads through explicit-instant formatting so output is machine-TZ independent"

requirements-completed: [ICT-11]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "NY-anchored 1H to 4H synthesis emitting Candle blocks (anchor split, DST pairs, partial exclusion, forming exclusion)"
    requirement: "ICT-11"
    verification:
      - kind: unit
        ref: "src/lib/ict/aggregate.test.ts#anchor split / DST pairs / partial-block / forming exclusion"
        status: pass
    human_judgment: false
  - id: D2
    description: "Determinism, computeRange/computeBias reuse, and boundary edges (empty, sub-block, exact-boundary, ordering, non-finite, dedupe, asOf edge)"
    requirement: "ICT-11"
    verification:
      - kind: unit
        ref: "src/lib/ict/aggregate.test.ts#hardening — determinism and Candle reuse / boundary edges"
        status: pass
      - kind: unit
        ref: "npm test (full suite: 23 files, 180 tests)"
        status: pass
    human_judgment: false

# Metrics
duration: 18min
completed: 2026-09-07
status: complete
plan_head_before: ca3e8ead4c19b0921a9f3ee2f21a9a384c81a3ea
---

# Phase 07 Plan 03: NY-Anchored 1H to 4H Synthesis Summary

**Pure aggregate.ts synthesizes complete 4-candle 4H blocks on the 18:00 ET grid with per-candle IANA wall-clock resolution, emitting reused Candle shapes for unchanged range/bias math.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-09-07T06:36:52Z
- **Completed:** 2026-09-07T06:54:58Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `aggregate1Hto4H` buckets closed 1H epoch rows into complete 4-candle blocks on the 18:00 ET grid, keyed anchor-day plus B1-B6, emitting first-open / max-high / min-low / last-close Candle blocks
- DST-stable bucketing pinned both sides of the 2026-03-08 spring-forward and 2026-11-01 fall-back instants with identical same-block assertions
- Trailing partial blocks excluded silently, forming rows never entering blocks, consecutive polls byte-identical
- Emitted blocks feed `computeRange` / `computeBias` unchanged; full suite green (23 files, 180 tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Aggregate core** - `fd7b988` (feat)
2. **Task 2: Aggregate hardening** - `194138c` (test)

## Files Created/Modified

- `src/lib/ict/aggregate.ts` - NY-anchored 1H to 4H synthesis: NY_TZ, DAY_OPEN_NY_HOUR, BLOCK_SIZE, aggregate1Hto4H
- `src/lib/ict/aggregate.test.ts` - 15-test suite: anchor split, DST pairs, partial/forming, determinism, reuse, edges

## Decisions Made

- Resolved NY wall clock per candle with `formatInTimeZone` on the explicit instant rather than ms-plus-`getTimezoneOffset` arithmetic: the offset primitive interprets the Date's machine-local fields and flips up to 5 hours early near transitions (verified: 2026-03-08T02:00:00Z returned -4h while true NY wall clock was still EST), and even disagreed with `formatInTimeZone` on the same instant. Explicit-instant formatting is machine-TZ independent.
- Rolled the anchor day back with integer civil-date arithmetic (Howard Hinnant days_from_civil / civil_from_days) instead of Date construction, keeping day rollback exact across DST-short and DST-long days.
- Built DST fixtures with `fromZonedTime` (DST-aware wall-clock to epoch) so expectations carry no hand-rolled offsets.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Switched wall-clock primitive from getTimezoneOffset arithmetic to formatInTimeZone**
- **Found during:** Task 1 (Aggregate core), while verifying the house primitive against real transition instants
- **Issue:** Plan's research section specified `getTimezoneOffset` arithmetic (`epoch-ms + offset → getUTCHours`). Empirical probes showed the primitive flips up to 5 hours early near DST transitions and disagrees with `formatInTimeZone` on the same instant (e.g. 2026-03-08T02:00:00Z: offset said 22:00 NY, formatter said 21:00 NY). Fixtures built on formatter-derived epochs (correct NY wall hours) could not pass under offset-based bucketing — wrong-block failures, not test bugs.
- **Fix:** Resolve hour and calendar date per candle via `formatInTimeZone(ms, NY_TZ, ...)` on the explicit instant. Same installed `date-fns-tz` 3.2.0 house library, zero new dependencies, prohibition honored (per-candle IANA resolution, no fixed offset).
- **Files modified:** src/lib/ict/aggregate.ts
- **Verification:** All 6 core tests pass including both DST pairs; full suite green.
- **Committed in:** fd7b988 (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Contract, exports, acceptance criteria, and prohibitions unchanged — only the wall-clock primitive changed, toward strictly more correct DST behavior. No scope creep.

## Issues Encountered

- `join.ts` was briefly unreadable due to a transient absolute-path typo (`liquinity-engine`); re-read with the correct path — no impact.
- A test-file edit landed inside the wrong describe block (stray duplication after an insert); fixed by re-anchoring the block boundary before running the suite — no impact on shipped code.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ICT-11 complete: `aggregate1Hto4H(rows, asOf)` is ready for Phase 8 selectors to derive 4H sequencing inputs; blocks are plain Candles so range/bias/regime consumers need no changes.
- Watch item: `formatInTimeZone` per-row formatting is O(rows) with Intl caching — fine for 1H block counts; revisit only if Phase 8 feeds multi-year 1H windows in a hot loop.
- No stubs, no skipped tests, purity grep clean.

## Self-Check: PASSED

- `src/lib/ict/aggregate.ts` FOUND, `src/lib/ict/aggregate.test.ts` FOUND (194 lines, 15 tests)
- Commits `fd7b988` and `194138c` FOUND in log
- `npm test -- src/lib/ict/aggregate.test.ts`: 15 passed; full `npm test`: 23 files, 180 passed
- Purity gate: no `Date.now` / `new Date()` in aggregate.ts

---
*Phase: 07-smt-4h-1h-sequencing-math*
*Completed: 2026-09-07*
