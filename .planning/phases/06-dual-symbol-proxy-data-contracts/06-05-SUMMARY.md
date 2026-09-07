---
phase: 06-dual-symbol-proxy-data-contracts
plan: 05
subsystem: api
tags: [yahoo-proxy, intraday, nextjs-route, vitest]

# Dependency graph
requires:
  - phase: 06-dual-symbol-proxy-data-contracts
    provides: fetchIntraday lane with IntradayEnvelope contract plus intraday-1h fixture (plans 06-01..06-04)
provides:
  - Interval dispatch in GET: 1d selects fetchSymbol, 1h/15m selects fetchIntraday after allowlist guards
  - Two route tests pinning the intraday happy path and the honest-502 failure path
affects: [phase-07-intraday-polling, verify-work-uAT]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 921
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: [two-lane interval dispatch after allowlist guards, shared stale-aware Cache-Control ternary across lanes]

key-files:
  created: []
  modified: [app/api/yahoo/route.ts, app/api/yahoo/route.test.ts]

key-decisions:
  - "Branch alongside, not abstraction: 1d lane stays a byte-identical fetchSymbol call, intraday lane calls fetchIntraday with the same three args"
  - "No source change in task 2: failure honesty comes from the pre-existing shared catch, pinned by test only"

patterns-established:
  - "Lane dispatch sits strictly after both allowlist guards so only allowlisted symbol/interval values ever reach a lane"
  - "Intraday route tests assert contract shape (epoch-integer time, no date key) rather than fixture identity"

requirements-completed: [DATA-04, DATA-05, DATA-06, DATA-07]

coverage:
  - id: D1
    description: "Interval dispatch branch in route.ts GET: 1d selects fetchSymbol, 1h/15m selects fetchIntraday"
    requirement: "DATA-05"
    verification:
      - kind: unit
        ref: "app/api/yahoo/route.test.ts#GET with symbol ES=F and interval 1h returns the intraday epoch envelope"
        status: pass
    human_judgment: false
  - id: D2
    description: "1h happy path serves 200 with 30 epoch-integer rows plus ES contractHint and fresh Cache-Control"
    requirement: "DATA-05"
    verification:
      - kind: unit
        ref: "app/api/yahoo/route.test.ts#GET with symbol ES=F and interval 1h returns the intraday epoch envelope"
        status: pass
    human_judgment: false
  - id: D3
    description: "Intraday upstream failure returns honest 502 with retryAfter 60, no-store, body free of candles/date keys"
    requirement: "DATA-06"
    verification:
      - kind: unit
        ref: "app/api/yahoo/route.test.ts#intraday upstream failure returns honest 502 or stale never daily-shaped data"
        status: pass
    human_judgment: false
  - id: D4
    description: "Daily lane preserved byte-identical (bare NQ, ES daily, both 400s, stale ternary all still green)"
    requirement: "DATA-04"
    verification:
      - kind: unit
        ref: "npm test — 22 files, 165 tests, all pass"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-09-07
status: complete
---

# Phase 06 Plan 05: Intraday Lane Dispatch Summary

**Route GET branches 1d to fetchSymbol and 1h/15m to fetchIntraday after the allowlist guards, closing the VERIFICATION.md root cause with two pinning route tests**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-07T09:29:00Z
- **Completed:** 2026-09-07T09:41:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Interval dispatch in `app/api/yahoo/route.ts` GET: `intervalParam === '1d'` calls `fetchSymbol`, otherwise `fetchIntraday`, with identical args and shared stale/header/502 shapes
- New 1h happy-path test: 200, contractHint containing ES=F, 30 candles each with integer `time` and no `date` key, `stale: false`, fresh `Cache-Control`
- New intraday failure test: 500 upstream on empty cache yields 502 with non-empty error string, `retryAfter: 60`, `no-store` plus `Retry-After: 60`, body without `candles` or `date` keys
- Full suite green: 22 files, 165 tests pass; `tsc --noEmit` clean; `range.ts` and `store.ts` show zero diff

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end intraday lane — route dispatch plus 1h happy-path test** - `d368a3d` (feat)
2. **Task 2: Intraday honest-error route test plus full regression gate** - `a5c4608` (test)

## Files Created/Modified
- `app/api/yahoo/route.ts` - Added `fetchIntraday` import and the `intervalParam === '1d'` lane branch after both allowlist guards
- `app/api/yahoo/route.test.ts` - Added intraday-1h fixture import plus the 1h happy-path and honest-502 failure tests

## Decisions Made
- Branch alongside, not abstraction: the daily lane remains a byte-identical `fetchSymbol` call per D-05; the intraday lane calls `fetchIntraday` with the same three arguments so composite cache keys cannot collapse (T-06-06)
- No source change in task 2: failure honesty comes from the pre-existing shared catch mapping every lane error to `error` + `retryAfter: 60` with `no-store`/`Retry-After: 60` (T-06-07), so the task pinned it by test only

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- SC2 serving dimension restored: NQ + ES 1H/15M now flow through the proxy on the epoch lane; the two VERIFICATION.md failed truths are re-runnable to verified
- Phase 7 owns intraday polling per D-01; the route stays a dumb per-leg fetch with no coupling added

## Self-Check: PASSED

- FOUND: app/api/yahoo/route.ts
- FOUND: app/api/yahoo/route.test.ts
- FOUND: d368a3d
- FOUND: a5c4608

---
*Phase: 06-dual-symbol-proxy-data-contracts*
*Completed: 2026-09-07*
