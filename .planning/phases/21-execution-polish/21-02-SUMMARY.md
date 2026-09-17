---
phase: 21-execution-polish
plan: 02
subsystem: execution-calibration
tags: [firing-log, parity-harness, calibration, buffered-ticket, vitest, chart-lines]

# Dependency graph
requires:
  - phase: 21-execution-polish
    provides: Tracer buffered ticket plus band verdict plus one-bar parity skeleton (21-01)
provides:
  - Full 20-session pools on/off parity replay with exact triple match every bar
  - Calibration helper pins (FIRE-only, NY-week Mondays, overflow inclusion, empty-log null, 1 and 4 edges)
  - FiringLogPanel calibration proof table plus thin/stale/empty states plus rate line
  - Ticket-panel verbatim buffer note plus mapper ticketLineInputs guard plus chart guard threading
affects: [21-03-slider-sandbox, ticket-buffered-lines, calibration-review]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 31250
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: [per-arm rebuilt snapshot parity driver, guarded ticket-line threading]

key-files:
  created: [src/lib/ict/calibration.test.ts]
  modified: [src/lib/ict/pools-parity.test.ts, components/dashboard/firing-log-panel.tsx, components/dashboard/ticket-panel.tsx, components/charts/nq-chart.tsx, src/lib/chart-mapper.ts, src/lib/chart-mapper.test.ts, src/terminal-shell.test.ts]

key-decisions:
  - "Bulk parity replays the STOP-side buffered build on all 84 bars; the TP-side build is pinned per-leg by the dedicated row plus mapper pins, not per-bar in the loop"
  - "Proof table rows are identical by construction from the same firingLog array; the live exact-match proof is the harness, not a second computation in render"
  - "Chart legs thread through the ticketLineInputs guard in both effects; a guard throw renders no lines and never blocks the chart"

patterns-established:
  - "Per-arm rebuilt snapshot parity driver: cloneParityBar rebuilds identical field values per arm, never shared references, so pools can only enter through driver selection"
  - "Guarded ticket-line threading: ticketLineInputs validates buffered legs before createPriceLine in both the mount and refresh effects"

requirements-completed: [POL-01, POL-02, POL-03]

# Coverage metadata (#1602) — one entry per shipped deliverable.
coverage:
  - id: D1
    description: "Full 20-session pools on/off parity replay with exact triple match on all 84 bars"
    requirement: "POL-03"
    verification:
      - kind: unit
        ref: "src/lib/ict/pools-parity.test.ts#full 20-session transition-table replay"
        status: pass
    human_judgment: false
  - id: D2
    description: "Calibration helper pins: FIRE-only, NY-week Mondays, overflow inclusion, empty-log null, IN-BAND edges"
    requirement: "POL-01"
    verification:
      - kind: unit
        ref: "src/lib/ict/calibration.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "FiringLogPanel proof table plus thin/stale/empty states plus rate line from the same firingLog array"
    requirement: "POL-01"
    verification:
      - kind: unit
        ref: "src/terminal-shell.test.ts#proof-table-plus-buffer-note"
        status: pass
    human_judgment: true
    rationale: "Slot presence is test-pinned but visual placement beside entries plus dimming tone needs a human glance"
  - id: D4
    description: "Ticket-panel verbatim buffer note beside ticket-reason plus mapper guard plus chart threading"
    requirement: "POL-02"
    verification:
      - kind: unit
        ref: "src/lib/chart-mapper.test.ts#buffered ticket line inputs"
        status: pass
    human_judgment: true
    rationale: "Line movement off the extreme plus prose note placement needs a human glance on the live chart"

# Metrics
duration: 60min
completed: 2026-09-17
status: complete
---

# Phase 21 Plan 02: Full Parity Replay plus Calibration Proof Table Summary

**Full 20-session pools-toggled parity proof with exact triple match on all 84 bars, calibration helper edge pins, inline proof table plus thin/stale/empty states, and buffered ticket visibility in prose plus chart lines.**

## Performance

- **Duration:** 60 min
- **Started:** 2026-09-17T13:40:00Z
- **Completed:** 2026-09-17T14:40:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Full 20-session transition-table replay pools-on vs pools-off in `src/lib/ict/pools-parity.test.ts`: 84 bars, 11 FIRE bars, 84 shared-build EXECUTEs, exact triple match (trigger verdict/reasonKey/gates/direction, flaw reasonKey/class/flags/carry, ticket verdict/direction/entry/SL/TP/RR/reason) with zero tolerance — `parity.test.ts` byte-identical, untouched
- New `src/lib/ict/calibration.test.ts` (11 tests): FIRE-only counting, both FIRE directions, NY-week Monday weeks with floor-1, 4-week population calendar, conservative overflow inclusion, null on zero evidence, IN-BAND edges at exactly 1 and exactly 4, verbatim copy pins, got-string envelope guards
- `FiringLogPanel` calibration view: pools on/off proof table from the same `firingLog` array (identical muted rows, divergent destructive rows, divergent counter), rate line (`fires/atəş` per week), thin dimming at `opacity-45` with thin note, verbatim NQ-leg `lastError` stale line, empty heading plus calibration body — verdict still counts the full log including overflow
- Ticket-panel verbatim buffer note (`Stop ekstremdən 0.25×ATR kənarda; TP ekstremdən əvvəl — maqnit-xətt yoxdur`) beside `ticket-reason` on EXECUTE; `ticketLineInputs` guard in `chart-mapper.ts` validating buffered legs; both `nq-chart.tsx` effects thread legs through the guard with EXECUTE-only rendering and unchanged z-order; R/R gate copy and position untouched
- Shell suite pins proof-table slots plus buffer-note slot in one render (plus empty-log body guard); mapper suite pins buffered SL/TP legs plus null-ladder plus guard throws

## Task Commits

Each task was committed atomically:

1. **Task 1: Full 20-session pools toggled parity plus calibration helper pins** - `ff7c22f` (test)
2. **Task 2: Calibration proof table plus buffered ticket visibility** - `31be78e` (feat)

**Plan metadata:** (this SUMMARY commit, see below)

## Files Created/Modified

- `src/lib/ict/calibration.test.ts` - 11 helper pins: FIRE-only, weeks, overflow, empty null, 1/4 edges, copy, guards
- `src/lib/ict/pools-parity.test.ts` - Full 20-session driver (builders, clone/run/assert/pin helpers, 3 population tests) beside the untouched skeleton rows
- `components/dashboard/firing-log-panel.tsx` - Proof table, rate line, thin/stale/empty states from the same log array
- `components/dashboard/ticket-panel.tsx` - Verbatim buffer note beside ticket-reason on EXECUTE
- `src/lib/chart-mapper.ts` - `ticketLineInputs` buffered-leg guard (nullable TP2/TP3, named throws)
- `components/charts/nq-chart.tsx` - Guard threading in both ticket-line effects, EXECUTE-only, z-order unchanged
- `src/lib/chart-mapper.test.ts` - 5 buffered-line pins (moved legs, null ladder, 3 guard throws)
- `src/terminal-shell.test.ts` - 2 shell pins (proof verdict/rows/entries in one render, empty body with no verdict/table)

## Decisions Made

- Bulk parity replays the STOP-side buffered build on all 84 bars; the TP-side build is pinned per-leg by the dedicated skeleton row (TPs 20256, gate unchanged on TP1) plus the mapper buffered-line pins, not per-bar inside the loop. Rationale: per-bar dual-build would double ticket cost and blur which build the exact match covers; one shared build per loop keeps the D-12 zero-tolerance reading unambiguous.
- Proof table rows are identical by construction from the same firingLog array; the live exact-match proof is the harness, not a second computation in render. Rationale: render stays math-free per the panel contract; re-deriving trigger/flaw/ticket in render would duplicate derivation and risk pools leaking into signatures (Pitfall 1).
- Chart legs thread through the ticketLineInputs guard in both mount and refresh effects; a guard throw renders no lines and never blocks the chart. Rationale: mirrors the asia/pool/level guard precedent; buffered values validate at the same boundary as every other line family.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing nyMinutesOf import in the parity driver**
- **Found during:** Task 1 (full-population run)
- **Issue:** New `pinReplayBarShape` helper calls `nyMinutesOf` for the killzone branch but the tracer import only carried `evaluateTrigger`
- **Fix:** Extended the trigger import to `evaluateTrigger, nyMinutesOf`
- **Files modified:** src/lib/ict/pools-parity.test.ts
- **Verification:** pools-parity suite progresses past the import error
- **Committed in:** ff7c22f (part of task commit)

**2. [Rule 1 - Bug] Hand-counted bar/fire tallies wrong on first pass**
- **Found during:** Task 1 (population shape pins)
- **Issue:** Tallies guessed 81 bars / 8 fires / 8 executes; the driver reported 84 bars / 11 fires (the 3 HARD-path 03:15 FIRE replays) and 84 shared-build EXECUTEs (the tracer structure EXECUTEs on every bar shape at riskPct 2)
- **Fix:** Pinned measured tallies 84/11/84 with comments explaining the HARD-replay fires and the every-bar EXECUTE shape
- **Files modified:** src/lib/ict/pools-parity.test.ts
- **Verification:** pools-parity 6/6 green with exact tallies
- **Committed in:** ff7c22f (part of task commit)

**3. [Rule 1 - Bug] Calibration fireEntry helper typed verdict as the wide verdict union**
- **Found during:** Task 2 (tsc clean)
- **Issue:** `FiringLogEntry['verdict']` includes ARMED/WAIT but the helper assigns to `reasonKey: TriggerReasonKey`, which excludes bare ARMED — tsc error TS2322
- **Fix:** Narrowed the helper param to `'FIRE_LONG' | 'FIRE_SHORT'`
- **Files modified:** src/lib/ict/calibration.test.ts
- **Verification:** `npx tsc --noEmit` clean
- **Committed in:** 31be78e (part of task commit)

**4. [Rule 1 - Bug] Shell row-order assertion assumed chronological order**
- **Found during:** Task 2 (shell suite run)
- **Issue:** Proof rows render newest-first (entries reversed at render) but the test asserted rows[0] holds 08-04
- **Fix:** Asserted rows[0] 08-05 ARMED then rows[1] 08-04 FIRE with the newest-first comment
- **Files modified:** src/terminal-shell.test.ts
- **Verification:** shell plus mapper 52/52 green
- **Committed in:** 31be78e (part of task commit)

**5. [Rule 1 - Bug] Terminal-shell describe insertion orphaned the W2 block and the coverage test tail**
- **Found during:** Task 2 (tsc clean)
- **Issue:** Two edits left a duplicated `describe` line plus a stranded closing tail — tsc errors TS1128/TS1005
- **Fix:** Rejoined the W2 describe opener and restored the coverage-test closing braces
- **Files modified:** src/terminal-shell.test.ts
- **Verification:** `npx tsc --noEmit` clean, shell suite green
- **Committed in:** 31be78e (part of task commit)

---

**Total deviations:** 5 auto-fixed (5 bugs)
**Impact on plan:** All fixes required for correctness of the proof (tallies, types, test structure); no scope creep, no derivation-order or gate changes.

## Issues Encountered

- Full-suite `npm test` OOMs the default vitest worker pool on this machine (heap exhaustion in forked workers, 39/41 files passed with 483 tests green before workers died); the two unrun files (`parity.test.ts`, `time.test.ts`) pass in isolation (22/22), and every plan-touched suite passes in scoped runs. Scoped verification: parity 6/6, calibration 11/11, shell+mapper 52/52, store 46/46, ticket 21/21, replay 8/8, purity green, tsc clean.
- PowerShell has no `grep`/`head`/`tail` coreutils: used the Grep tool and scoped npm runs instead. No impact on deliverables.

## Threat Flags

None - all threat mitigations implemented as planned: T-21-03 (single buffered build shared by both arms, toggle confined to driver fixtures via cloneParityBar, exact-match bar with zero tolerance, parity.test.ts untouched anchor), T-21-02 (table reads the same firingLog array, FIRE-only conservative counting, null over empty log, divergent rows fail loud in destructive), T-21-04 (verbatim leg errors inline, thin dims at opacity-45 never hides, empty keeps heading plus calibration body), T-21-SC (no installs in this plan).

## Verification

- `npm test -- src/lib/ict/pools-parity.test.ts src/lib/ict/calibration.test.ts`: 2 files, 17 passed
- `npm test -- src/terminal-shell.test.ts src/lib/chart-mapper.test.ts`: 2 files, 52 passed
- `npm test -- src/lib/store.test.ts`: 46 passed; `src/lib/ticket.test.ts`: 21 passed; `src/lib/ict/replay.test.ts`: 8 passed; `src/lib/ict/parity.test.ts` + `src/lib/time.test.ts`: 22 passed
- `npx tsc --noEmit`: clean
- `parity.test.ts` byte-identical: untouched (no edits; plan 21-01 hash `9ecd782e` anchor holds — file not in this plan's commit set)
- Full `npm test`: 483 passed across 39 files before environment OOM in forked workers (machine memory, not test failures); all unrun files verified green in scoped runs

## Next Phase Readiness

- Ready for 21-03 (slider sandbox): buffer multiples stay exported constants with boundary pins, knob ranges can seed from them; the proof table plus verdict line give the review surface the sandbox Apply path writes toward
- Watch item: bulk parity pins the STOP-side build per-bar; if 21-03 retunes the TP pullback multiple, the dedicated TP-side row plus mapper pins re-pin first, then the bulk loop stays green by construction

---
*Phase: 21-execution-polish*
*Completed: 2026-09-17*

## Self-Check: PASSED

- calibration.test.ts exists on disk; pools-parity.test.ts, firing-log-panel.tsx, ticket-panel.tsx, nq-chart.tsx, chart-mapper.ts, chart-mapper.test.ts, terminal-shell.test.ts modified
- ff7c22f plus 31be78e present in `git log --oneline`
- Targeted suites green (17 + 52 + 46 + 21 + 8 + 22), tsc clean, parity.test.ts untouched
