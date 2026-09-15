---
phase: 15-why-now-trigger-engine
plan: '02'
subsystem: ict-trigger
tags: [trigger, armed-matrix, cooldown, fvg-downgrade, boundary-pins, vitest]

# Dependency graph
requires:
  - phase: 15-why-now-trigger-engine
    provides: [evaluateTrigger pure three-gate fusion, co-located trigger.test.ts tracer, selectTrigger with firing log]
provides:
  - Full gate-table test coverage: 3-of-3 FIRE, each 2-of-3 ARMED with matching key, 0-to-1 WAIT
  - Boundary pins: killzone edges 120/300 exclusive, disp 0.499/0.5/0.501 with TOL_EPS
  - Cooldown plus FVG-downgrade plus SMT-tag plus malformed-throw plus determinism coverage
affects: [15-03 prose lock and serializer, 16-flaw-snapshot, 17-ticket, 18-replay]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 4883
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [gate-table matrix tests, boundary-pin tests, fail-at-boundary throws]

key-files:
  created: []
  modified:
    - src/lib/ict/trigger.test.ts

key-decisions:
  - "No trigger.ts source changes in this plan — the 15-01 tracer logic already satisfies every expansion case, so all three commits are test-only"
  - "Suppressed-SMT opener kept as a bare it-block inside the new agree-tag describe suite rather than a duplicate describe (avoids a redundant describe wrapper)"

patterns-established:
  - "Boundary pins: killzone edges asserted exclusive at exactly 120/300 with just-inside 121/299 controls; displacement asserted at 0.499/0.5/0.501"
  - "Got-string throw assertions (toThrow with the got substring) for every malformed envelope, mirroring amd.test.ts lines 227-243"

requirements-completed: [TRIG-01, TRIG-02]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "ARMED 2-of-3 matrix with matching reasonKeys plus 0-to-1 WAIT plus killzone/displacement boundary pins"
    requirement: "TRIG-01"
    verification:
      - kind: unit
        ref: "src/lib/ict/trigger.test.ts#trigger: D-05 exactly-2-of-3 ARMED matrix"
        status: pass
      - kind: unit
        ref: "src/lib/ict/trigger.test.ts#trigger: D-03 boundary pins"
        status: pass
    human_judgment: false
  - id: D2
    description: "Per-session cooldown downgrade plus entry-FVG downgrade plus most-recent-originDate selection plus SMT agree tag"
    requirement: "TRIG-02"
    verification:
      - kind: unit
        ref: "src/lib/ict/trigger.test.ts#trigger: D-06 cooldown matrix"
        status: pass
      - kind: unit
        ref: "src/lib/ict/trigger.test.ts#trigger: D-04 no-FVG downgrade"
        status: pass
      - kind: unit
        ref: "src/lib/ict/trigger.test.ts#trigger: SMT read-only agree tag"
        status: pass
    human_judgment: false
  - id: D3
    description: "Malformed-input throws with got-string messages plus null-detector honest WAIT plus byte-identical determinism"
    requirement: "TRIG-02"
    verification:
      - kind: unit
        ref: "src/lib/ict/trigger.test.ts#trigger: malformed-input throws at the boundary"
        status: pass
      - kind: unit
        ref: "src/lib/ict/trigger.test.ts#trigger: determinism"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-09-10
status: complete
---

# Phase 15 Plan 02: Expansion Hardening Summary

**Full ARMED counting matrix, per-session cooldown, entry-FVG downgrade with most-recent selection, boundary pins, and malformed-input throws — 31/31 trigger tests green with zero source changes**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-10T17:57:00+04:00
- **Completed:** 2026-09-10T18:09:00+04:00
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments

- Exactly-2-of-3 ARMED matrix with matching reasonKeys (ARMED_MISSING_TIMING at 06:00 NY, ARMED_MISSING_PURGE on unconfirmed judas, ARMED_MISSING_DISPLACEMENT on weak displacement) plus a 1-gate WAIT case, all with verbatim toBe reason pins
- Boundary pins: displacement false at 0.499 / true at 0.5 via TOL_EPS / true at 0.501, killzone timing false at exactly 120/300 with true controls at 121/299
- D-06 cooldown: alreadyFired true downgrades otherwise-3-of-3 to ARMED_ALREADY_FIRED with null entryFvg, false control fires FIRE_LONG
- D-04 downgrade: null, empty, wrong-polarity-only, and mitigated-only FVG inventories all cap at ARMED; most-recent-originDate BULLISH gap selected on FIRE with full ticket handle preserved
- SMT read-only tag: concordant unsuppressed LOW-BULLISH and HIGH-BEARISH append "SMT razılaşır.", discordant and suppressed fire without suffix, ARMED/WAIT entryFvg stays null
- V5 validation: null input, NaN/Infinity/zero/negative/string asOf, candidate-1/string-sweepTime/BOTH-side judas, non-boolean alreadyFired, and non-finite FvgGap bounds all throw with got-string messages; null detectors degrade to honest WAIT; repeat evaluation is byte-identical
- Plan verification green: 31/31 trigger tests, full suite 32 files / 331 tests, `npx tsc --noEmit` clean

## Task Commits

Each task was committed atomically:

1. **Task 1: ARMED counting matrix plus boundary pins per D-05 and D-03** - `1e84789` (feat)
2. **Task 2: Cooldown matrix plus no-FVG downgrade plus suppressed SMT per D-04 and D-06** - `6c1600b` (feat)
3. **Task 3: Fail-at-boundary throws plus determinism per V5 input validation** - `b5ce39e` (feat)

**Plan metadata:** orchestrator-owned (STATE.md/ROADMAP.md writes excluded per execution brief)

## Files Created/Modified

- `src/lib/ict/trigger.test.ts` - +567 lines: D-05 ARMED matrix, 0-to-1 WAIT, D-03 boundary pins, D-06 cooldown, D-04 downgrade + originDate selection, SMT agree tag, malformed throws, determinism (8 baseline tests + 23 new = 31)
- `src/lib/ict/trigger.ts` - untouched: tracer logic already satisfied every expansion assertion, no counting/cooldown/selection fixes needed

## Decisions Made

- No trigger.ts source changes in this plan — every expansion assertion passed against the 15-01 tracer on first run, which proves the tracer's gate independence (timing/purge/displacement), TOL_EPS compare, strict-exclusive killzone, FVG selection, cooldown branch, and boundary asserts were all correct from day one.
- Suppressed-SMT opener kept as a bare it-block inside the new SMT agree-tag describe suite rather than a duplicate describe wrapper (test-shape repair in Task 2, no behavior impact).

## Deviations from Plan

None - plan executed exactly as written. All three "fixing trigger.ts only if a case fails" branches resolved to no-fix: zero source edits.

## Issues Encountered

- Two mechanical test-file brace errors (displaced `describe` opener in Task 1, orphaned `});` in Task 2): both caught by vitest transform errors, repaired with single-line edits, re-verified green before commit. No impact on deliverables.
- PowerShell lacks `head`/`tail`: used `Select-Object -First/-Last` idioms for output slicing. No impact.
- HEAD is on `main`, but project config sets `git.branching_strategy: "none"` and the 15-01 wave committed directly to `main` — per-project convention, committing here is intended, not drift.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 15-03 (prose lock and serializer): gate table, cooldown, FVG handle, and reason wording are all pinned with toBe, so 15-03 pins rather than rewrites.
- D-09 reason wording matched trigger.ts constants byte-for-byte, so no cross-plan wording reconciliation is needed.
- Threat posture unchanged: no new network endpoints, auth paths, file access, or schema changes — T-15-04 mitigation (boundary throws, null-degrade WAIT) is proven by the Task 3 suite; T-15-SC holds (zero new packages).

---
*Phase: 15-why-now-trigger-engine*
*Completed: 2026-09-10*

## Self-Check: PASSED

- Task commits exist: `1e84789`, `6c1600b`, `b5ce39e` (all in `git log f60cad1..HEAD`)
- Trigger suite green at commit time: 31/31; full suite 331/331; tsc clean
- SUMMARY.md on disk at `.planning/phases/15-why-now-trigger-engine/15-02-SUMMARY.md`
