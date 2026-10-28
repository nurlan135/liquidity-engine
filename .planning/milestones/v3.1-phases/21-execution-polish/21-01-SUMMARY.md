---
phase: 21-execution-polish
plan: '01'
subsystem: ticket-geometry
tags: [paper-ticket, atr-buffer, sl-tp, tracer, POL-02]
requires: [phase-20-selectTicket, computeATR-regime, OQ2-extremum-rule]
provides: [buffered-resolveSL, buffered-resolveTP, atr-threaded-selectTicket, POL-02-pins]
affects: [21-03-fire-rate-strip, 21-04-threshold-slider]
tech-stack:
  added: []
  patterns: [additive-buffer, zero-buffer-degrade, fixture-with-overrides]
key-files:
  created: []
  modified: [src/lib/ticket.ts, src/lib/store.ts, src/lib/ticket.test.ts]
key-decisions:
  - "Buffer constant TICKET_BUFFER_ATR_MULT=0.25 exported for testability, mirrors DOL_BOOST precedent"
  - "Zero-buffer degrade on null/NaN/negative/non-finite atr keeps old fixtures byte-exact"
  - "TP legs re-check the entry-side guard AFTER pull-in, so pulled-through-TP1 yields the unchanged TP refuse reason"
requirements-completed: [POL-02]
actuals:
  tokens: 12000
  tasks: 2
  commits: 2
coverage:
  - id: POL-02-buffer
    description: "SL beyond extreme +0.25xATR, TP legs pulled inside, R/R-edge honesty"
    requirement: POL-02
    verification:
      - kind: automated
        ref: "npm test -- src/lib/ticket.test.ts (16/16)"
        status: pass
      - kind: automated
        ref: "npm test full suite (485/485)"
        status: pass
      - kind: automated
        ref: "npx tsc --noEmit (exit 0)"
        status: pass
    human_judgment: false
duration: "~6 min"
completed: "2026-10-27"
status: complete
plan_head_before: 6f4cb3f65019a02aa30fbcc616db7e5e25e3d39b
plan_head_after: 3828c056a4cd51f2b88485b9547ebb59f36781f
---

# Phase 21 Plan 01: Buffered Ticket End to End Summary

Buffered SL/TP geometry (0.25xATR outward shift + TP pull-inside) threaded from D1 candles through the store, with 5 new boundary/R-R-edge pins and the full suite green at 485/485.

## Performance

- **Duration:** ~6 min (20:37–20:43 UTC)
- **Tasks:** 2/2 complete
- **Commits:** 2 (measured via `git rev-list --count`)
- **Files changed:** 3 (141 insertions, 18 deletions)

## Accomplishments

- `TicketInput` gains optional `atr` (number | null | undefined); `TICKET_BUFFER_ATR_MULT = 0.25` exported
- `resolveSL` shifts the locked extremum outward by direction (LONG minus, SHORT plus), re-applying side-of-entry null guards
- `resolveTP` pulls each resolving leg one buffer step toward entry, legs failing the entry-side check after pull-in resolve null — no magnetization to the extreme line
- `selectTicket` imports `computeATR` beside `computeRegime`, computes the series over `nq.candles`, passes the last value (null on empty) into `computeTicket`
- No reason string changed, `TICKET_RR_MIN` stays 3, `RISK_PCT` band untouched, no `src/lib/ict` file modified
- 5 new test pins: LONG buffered EXECUTE, SHORT mirror, R/R-flip STAND ASIDE (2.8), TP1-pull refusal, zero/NaN/negative/missing atr degrade-to-zero matrix

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Buffered ticket end to end from D1 ATR to ticket numbers (tracer) | d576f24 | src/lib/ticket.ts, src/lib/store.ts |
| 2 | Buffered boundary pins plus R/R honesty plus suite proof | 3828c05 | src/lib/ticket.test.ts |

## Files Created / Modified

- `src/lib/ticket.ts` — modified (atr input, buffer helper, buffered resolvers, threading)
- `src/lib/store.ts` — modified (computeATR import + atr threading in selectTicket)
- `src/lib/ticket.test.ts` — modified (POL-02 pin matrix)

## Decisions Made

- Buffer constant exported (`TICKET_BUFFER_ATR_MULT`) for testability, mirroring the DOL_BOOST constant precedent
- Non-finite/empty ATR degrades to zero buffer (not null ticket), per the plan's assumption log
- Post-pull-in entry-side re-check produces the unchanged TP refuse reason rather than a new string

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrong SL expectation in my own new LONG buffered pin**
- **Found during:** Task 2
- **Issue:** Expected SL 20060 for atr=50; correct formula gives min(20090, 20085) − 12.5 = 20072.5 (I subtracted 25 instead of 12.5)
- **Fix:** Corrected the `toBe` pin to 20072.5 and clarified the comment; R/R (4), TPs, and size pins already matched
- **Files modified:** src/lib/ticket.test.ts
- **Verification:** `npm test -- src/lib/ticket.test.ts` 16/16 green
- **Commit:** 3828c05

## Issues Encountered

None beyond the self-caught arithmetic slip above. No auth gates, no architectural questions.

## Threat Flags

None — buffer math lives in brokerage `ticket.ts` (not `ict/`), no new endpoints, no prediction claims, TP never magnetized to the extreme line per the must_haves prohibition.

## Known Stubs

None — all buffered paths resolve through the existing verdict branch; no empty values or placeholder copy introduced.

## User Setup Required

None.

## Next Phase Readiness

POL-02 complete. `selectTicket` now carries live ATR into every ticket, so plan 21-03 (fire-rate strip) can read buffered numbers through the unchanged ticket branch, and plan 21-04 (threshold slider) inherits the R/R floor untouched.

## Self-Check: PASSED
