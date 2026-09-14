---
phase: 17-paper-ticket-4-6-live-ui-chart-pins
plan: '01'
subsystem: execution
tags: [paper-ticket, broker-math, risk-sizing, zustand, vitest, tdd]
requires:
  - phase: 15-why-now-trigger-engine
    provides: TriggerOutput plus entryFvg handle plus sharedEpoch plus firing-log idiom
  - phase: 16-fatal-flaw-invalidation
    provides: FatalFlawOutput plus flaw-supersedes-fire precedence plus REASON_BY_KEY
provides:
  - computeTicket fixed-order paper derivation (direction to entry to SL to TP ladder to TP1 R-R gate to EXECUTE or STAND ASIDE)
  - Risk-divided-by-distance sizing in NQ contracts with refusal table and 0.1–5 riskPct band
  - ticketInputs slice plus selectTicket plus paperLog with flaw precedence and degraded provenance
affects: [17-02-panels, 17-03-report-sections, 17-04-chart-pins, 18-verification-calibration]
actuals:
  tokens: 22000
  tasks: 3
  commits: 4
tech-stack:
  added: []
  patterns: [fixed-order early-stop derivation, one-const-per-gate-fail verbatim reasons, refuse-null selector envelope, degraded-with-provenance]
key-files:
  created: [src/lib/ticket.ts, src/lib/ticket.test.ts]
  modified: [src/lib/store.ts, src/lib/store.test.ts]
key-decisions:
  - "Committed per-task to main: branching_strategy none, entire history on main, no phase branches in this project"
  - "Tracer ships a deliberately minimal slice (all-or-nothing TP, generic RR reason, naive sizing) so Task 2 RED has genuinely-failing targets"
  - "Live HARD flaw seam is stale-es (outside trigger-critical legs): trigger still FIRES while flaw votes HARD STALE_LEG"
  - "Ticket coherence test pre-consumes the session FIRE (D-12 trap): pair asserts identical ARMED-after-fire STAND ASIDEs with pinned epoch"
requirements-completed: [TICK-01, TICK-02]
coverage:
  - id: D1
    description: "computeTicket fixed-order EXECUTE_LONG derivation with flaw precedence and boundary throws"
    requirement: "TICK-01"
    verification:
      - kind: unit
        ref: "src/lib/ticket.test.ts#tracer EXECUTE_LONG happy path"
        status: pass
    human_judgment: false
  - id: D2
    description: "R-R TP1 3.0/2.99 boundary plus sizing refusal table plus constant pins"
    requirement: "TICK-02"
    verification:
      - kind: unit
        ref: "src/lib/ticket.test.ts#R-R TP1 gate plus sizing plus refusal table"
        status: pass
    human_judgment: false
  - id: D3
    description: "ticketInputs clamp plus selectTicket flaw-precedence plus refuse-null plus degraded plus coherence"
    requirement: "TICK-01"
    verification:
      - kind: unit
        ref: "src/lib/store.test.ts#ticket-risk-clamp plus ticket-flaw-precedence plus ticket-coherence"
        status: pass
    human_judgment: false
duration: 36min
completed: 2026-09-14
status: complete
plan_head_before: 19279394cc09df521acb06b7fc51e5eb9f603695
---

# Phase 17 Plan 01: Paper Ticket Tracer Summary

**Pure fixed-order paper-ticket derivation (direction → OTE×FVG entry → OQ-2 SL → structure-first TP → TP1 R/R ≥ 1:3 → verdict) plus risk÷distance NQ sizing and store wiring, proven end-to-end before any UI renders it**

## Performance

- **Duration:** 36 min
- **Started:** 2026-09-14T05:53:22Z
- **Completed:** 2026-09-14T06:29:13Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- computeTicket in src/lib/ticket.ts: fixed-order early-stop skeleton consuming TriggerOutput plus FatalFlawOutput without re-deriving gates, STAND ASIDE with verbatim reason on every gate fail
- R/R gate on TP1 only (OQ-3) with TOL_EPS tolerance: 3.0 passes, 2.99 STAND ASIDE naming the ratio `R/R 1:X — EXECUTE bloklandı`
- Sizing as floor(equity × riskPct / 100 / (stop × 20)) with STOP_EPS floor, riskPct 0.1–5 boundary throw, zero-stop and unsizeable refusals with null sizeContracts
- ticketInputs slice (riskPct default 1, clamped setters refusing NaN/negative/oversize/zero) plus session-ephemeral paperLog capped at 50
- selectTicket with exactly one sharedEpoch, refuse-null on stale/empty nq+nq1h+nq15m, flaw precedence, degraded stale/thin leg envelope, never throws into render
- Full suite 386/386 green across 34 files, tsc clean — no regressions in trigger or flaw tests

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end EXECUTE_LONG paper ticket** - `faeeac3` (feat)
2. **Task 2 RED: R-R gate plus sizing plus refusal table** - `6c817fc` (test)
3. **Task 2 GREEN: R-R gate plus sizing plus refusal table** - `0f39e46` (feat)
4. **Task 3: ticketInputs slice plus selectTicket plus degraded envelope** - `7804819` (feat)

**Plan metadata:** pending final docs commit (this SUMMARY plus STATE/ROADMAP/REQUIREMENTS)

_Note: Task 2 followed RED-GREEN (test → feat); no REFACTOR commit — GREEN implementation was already minimal._

## TDD Gate Compliance

Task 2 (`tdd="true"`) followed the RED-GREEN-REFACTOR cycle per the canonical reference:

- **RED** (`6c817fc`, type `test`): 8 new tests added; the 4 target tests failed on planned-behavior assertions (RR reason format, zero-stop refusal, riskPct throw, partial-TP tolerance) while the 3 tracer tests stayed green — genuine RED, not a fixture crash.
- **GREEN** (`0f39e46`, type `feat`): minimal implementation (TP1-only gate check, interpolated RR reason, STOP_EPS floor, riskPct band guard, TP2/TP3 null-tolerance); all 11 ticket tests green.
- **REFACTOR:** skipped — no cleanup warranted; committed code matches the planned shape with no duplication.
- Gate commits present in order: `test(17-01)` → `feat(17-01)`. No violation.

## Files Created/Modified

- `src/lib/ticket.ts` - Pure brokerage math: TICKET_RR_MIN=3, PAPER_EQUITY_USD=25000, NQ_POINT_VALUE=20, TicketOutput/TicketInput, computeTicket fixed-order derivation, assertValid got-string boundary guards
- `src/lib/ticket.test.ts` - Tracer EXECUTE_LONG test plus R-R boundary (3.0/2.99), refusal table, QUIET/ARMED verbatim, constant pins
- `src/lib/store.ts` - ticketInputs slice plus setRiskPct plus paperLog/appendPaperLog plus selectTicket plus TicketOutput/PaperLogEntry re-exports
- `src/lib/store.test.ts` - Risk clamp, paperLog cap, flaw-precedence (live HARD STALE_LEG), refuse-null with lastError, degraded envelope, coherence with pinned epoch

## Decisions Made

- Per-task commits go to `main`: project config has `branching_strategy: "none"` and the entire history lives on main — no phase/agent branches exist in this project. The executor pre-commit HEAD assertion was evaluated against this project norm.
- Tracer ships a deliberately minimal slice so the TDD RED phase has genuinely-failing targets rather than pre-passed assertions.
- Live HARD flaw seam for the precedence test is a stale `es` leg: outside the trigger-critical set, so the trigger still FIRES while the flaw votes HARD STALE_LEG — no synthetic trigger construction needed.
- Coherence test pre-consumes the session FIRE via one `selectTrigger()` call (D-12 ordering trap documented in-test): the pair then asserts byte-identical ARMED-after-fire STAND ASIDEs sharing the pinned epoch.
- OQ-1..OQ-4 locks from plan time honored verbatim: $25k equity + $20/pt ASSUMED constants shown for panel teaching, OQ-2 min/max SL table, TP1-only gate, asOf carried for Phase 18 replay.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed duplicated reason constants from overlapping edits**
- **Found during:** Task 2 GREEN (ticket.ts edit overlap)
- **Issue:** Two sequential edits left `REASON_STOP` declared twice plus a dead `REASON_RR` superseded by the interpolated R/R-fail reason
- **Fix:** Removed the duplicate line and the dead constant; fail reason is solely the interpolated `R/R 1:X` form
- **Files modified:** src/lib/ticket.ts
- **Verification:** `npx vitest run src/lib/ticket.test.ts` 11/11 green, `npx tsc --noEmit` clean
- **Committed in:** 0f39e46 (Task 2 GREEN commit)

**2. [Rule 1 - Bug] Fixed zero-stop fixture that produced a valid 7.5pt stop**
- **Found during:** Task 2 GREEN (test failure analysis)
- **Issue:** RED fixture pinned asia-low to the gap bottom expecting a zero stop, but entry resolves at the overlap midpoint — stop was a valid 7.5pt, so the test failed for the wrong reason
- **Fix:** Hairline entry-FVG (top exceeds bottom by 1e-9, inside the finite-gap guards) with Asia low above the gap — SL clamps to the gap bottom and the stop falls genuinely below the epsilon floor
- **Files modified:** src/lib/ticket.test.ts
- **Verification:** Zero-stop test fails RED on the planned assertion, passes GREEN with REASON_STOP
- **Committed in:** 0f39e46 (Task 2 GREEN commit)

**3. [Rule 3 - Blocking] Reworked flaw-precedence and coherence tests around the live-session FIRE consumption**
- **Found during:** Task 3 (two store-test failures)
- **Issue:** Rollover is data-driven (no contractHint seam — first attempt returned RR-gated STAND ASIDE, not a flaw kill); and the first selectTicket consumes the session FIRE so back-to-back tickets disagree (D-12 ordering trap the plan warned about)
- **Fix:** Flaw-precedence drives HARD STALE_LEG via a stale es leg on a live FIRE poll; coherence pre-consumes the FIRE so the pair asserts identical ARMED-after-fire outputs with the pinned epoch
- **Files modified:** src/lib/store.test.ts
- **Verification:** `npx vitest run src/lib/store.test.ts` 43/43 green
- **Committed in:** 7804819 (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correctness and honest test seams. No scope creep — no new files, no API changes, no behavior beyond the plan.

## Issues Encountered

- PowerShell quoting: `head`/`date -u` are unavailable — used `Select-Object -First/Last` and `Get-Date -Format o` instead. No impact on deliverables.
- `gsd-tools.cjs` shim absent at the two probed paths; `gsd_run` resolves via PATH (`gsd_run.ps1`). Plan-ledger and timestamps recorded via direct git/node commands instead.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 17-02 (panels + PAPER banner): selectTicket plus ticketInputs plus paperLog are the exact seams ExecutionProtocol/TicketPanel/FatalFlaw subscribe to.
- Ready for 17-03 (§§4–6 live): ticket reason strings are verbatim and toBe-pinned; §5 reads entry/SL/TP/rr/sizeContracts verbatim.
- Ready for 17-04 (chart pins): ticket carries asOf for fireBarDate mapping; EXECUTE-only line rendering reads entry/sl/tp directly.
- Phase 18 replay: every output carries asOf from the single sharedEpoch; paperLog entries carry verdict/direction/levels/size for bar-by-bar reconstruction.

---
*Phase: 17-paper-ticket-4-6-live-ui-chart-pins*
*Completed: 2026-09-14*

## Self-Check: PASSED

- `src/lib/ticket.ts` FOUND, `src/lib/ticket.test.ts` FOUND (plus store.ts/store.test.ts modifications committed)
- Commits `faeeac3`, `6c817fc`, `0f39e46`, `7804819` all present in `git log`
- Full suite 386/386 green, tsc clean, per-task vitest runs green
