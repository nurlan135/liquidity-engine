---
phase: 21-execution-polish
plan: 05
subsystem: ui
tags: [zustand, calibration-sandbox, pristine-gate, vitest, jsdom, gap-closure]

# Dependency graph
requires:
  - phase: 21-04
    provides: [constant-pinned pristine check, hoisted BAXIŞ badge, reactive applied flag, isolated shell-test calibration state]
provides:
  - Post-Apply pristine gate pinned to imported constants only (CR-01 closed)
  - Apply-then-drift regression leg pinning badge-outside-dim post-Apply
affects: [phase 21 verification, 21-UAT CR-01 closure]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 600
  tasks: 1
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [pristine gate derives solely from strict equality against imported pinned constants, Apply-then-drift regression leg]

key-files:
  created: []
  modified: [components/dashboard/calibration-sandbox.tsx, src/terminal-shell.test.ts]

key-decisions:
  - "Deleted the session-flag disjunct only; the applied block, store Apply/re-seed logic, badge element, and dim container untouched"
  - "review hook retained for the applied-block render at sandbox bottom — pristine no longer reads it"

patterns-established:
  - "Pristine pins to constants only: any session flag in a preview-vs-applied gate is a Spoofing hazard (T-21-05-01)"

requirements-completed: [POL-04]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Post-Apply knob drift re-shows the BAXIŞ badge outside the dim container beside the TUTULDU applied copy"
    requirement: "POL-04"
    verification:
      - kind: integration
        ref: "src/terminal-shell.test.ts#sandbox-block (Apply-then-drift leg: badge present, no opacity-45 ancestor, dim container exists, applied block keeps TUTULDU)"
        status: pass
    human_judgment: false

# Metrics
duration: 15min
completed: 2026-09-18
status: complete
---

# Phase 21 Plan 05: CR-01 Gap Closure Summary

**Post-Apply pristine gate pinned to imported constants only; Apply-then-drift regression proves the drifted what-if can never masquerade as the reviewed HOLD set**

## Performance

- **Duration:** 15 min
- **Started:** 2026-09-18T10:45:00Z
- **Completed:** 2026-09-18T11:00:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- `pristine` derives solely from strict equality of each preview knob against its imported pinned constant (`TRIGGER_KZ_START_MIN/END_MIN/DISP_MULT`, `EQUAL_TOL_BPS`, `MERGE_ATR_MULT`, `DOL_BOOST`, `BEHIND_PENALTY`) — the `review.applied ||` disjunct is gone (CR-01 closed)
- Post-Apply drift re-shows the amber BAXIŞ chip undimmed above a dimmed preview while the TUTULDU applied copy stays rendered — D-14 preview-vs-applied separation holds pre- and post-Apply
- Apply-then-drift regression leg extends the existing sandbox test: drive Apply, assert the applied copy, drift kzStartMin to 200, assert badge present with no `opacity-45` ancestor, dim container exists, applied block keeps TUTULDU
- Scoped suites green: `store.test.ts` + `terminal-shell.test.ts` 79/79; `tsc --noEmit` clean; `parity.test.ts` untouched

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix post-Apply pristine gate plus Apply-then-drift regression test** - `3bc4448` (fix: pristine gate), `b631f75` (test: regression leg)

**Plan metadata:** docs commit follows (docs: complete plan)

## Files Created/Modified

- `components/dashboard/calibration-sandbox.tsx` - Pristine gate reduced to constant-only comparison; badge, dim container, applied block, store logic untouched
- `src/terminal-shell.test.ts` - Apply-then-drift leg appended to the sandbox-block test

## Decisions Made

- Deleted the session-flag disjunct only, per plan — no store Apply/re-seed change, no badge/dim markup move, no verdict semantics change.
- The `selectCalibrationReview()` hook stays: it feeds the applied-block render (lines 265-270); only the pristine computation stopped reading it.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- A stale `agent-p21-05-gap` worktree from a prior interrupted dispatch sat at the same base with a gap manifest but zero commits — removed via `git worktree remove --force` plus prune before editing; no code lost.
- `.planning/STATE.md` and `21-UAT.md` carry pre-existing uncommitted modifications from an earlier wave — left untouched (not this plan's scope, not committed here).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CR-01 truth holds: "Drift dims preview with a conspicuous BAXIŞ badge (pre- AND post-Apply)" — automated half pinned by the regression leg.
- Phase 21 now has 5/5 plan SUMMARies (01-05); ready for phase verification (`verify_phase_goal`) plus VERIFICATION.md gap re-check.
- No trigger/flaw/ticket derivation change — pools-never-vote lock intact.

---
*Phase: 21-execution-polish*
*Completed: 2026-09-18*

## Self-Check: PASSED

- FOUND: components/dashboard/calibration-sandbox.tsx
- FOUND: src/terminal-shell.test.ts
- FOUND: 3bc4448 (fix commit)
- FOUND: b631f75 (test commit)
- Scoped suites: 79/79 pass; tsc clean; parity.test.ts unmodified
