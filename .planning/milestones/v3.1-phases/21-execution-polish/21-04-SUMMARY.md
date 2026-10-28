---
phase: 21-execution-polish
plan: '04'
subsystem: ui
tags: [slider, threshold-control, base-ui, POL-04]
requires: [phase-21-03-fire-rate-strip]
provides: [slider-primitive, threshold-control, POL-04-operator-half]
affects: [verify-work-UAT, phase-21-closeout]
actuals:
  tokens: 2100
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns: [thin-store-consumer, lazy-init-hydration, handler-only-write-through]
key-files:
  created: [components/ui/slider.tsx, components/dashboard/threshold-control.tsx]
  modified: [components/dashboard/terminal-shell.tsx]
key-decisions:
  - "Slider omits cva (no visual variants on a single-thumb control); keeps the button idiom's cn plus data-slot tokens"
  - "Hydration via lazy useState initializer plus mount-only effect so server and first client paint render the code default synchronously"
  - "Write-through persists what the store kept after clamp-on-write, so storage can never disagree with the readout"
requirements-completed: [POL-04]
coverage:
  - id: POL-04-primitive
    description: "Base-UI-backed slider primitive in the button idiom with zero new packages"
    requirement: POL-04
    verification:
      - kind: automated
        ref: "npx tsc --noEmit (exit 0)"
        status: pass
      - kind: automated
        ref: "npm test full suite (505/505)"
        status: pass
    human_judgment: false
  - id: POL-04-control
    description: "Threshold control with persist, reset, and mount beside the ticket panel"
    requirement: POL-04
    verification:
      - kind: automated
        ref: "npx tsc --noEmit (exit 0)"
        status: pass
      - kind: automated
        ref: "npm test full suite (505/505)"
        status: pass
      - kind: manual_procedural
        ref: "Plan task 2 human-check: drag the WHY NOW threshold slider and confirm readout and section 5 band status move together, reload and confirm persistence, click Sifirla and confirm the code default restores, hand-set an out-of-band localStorage value and confirm fallback to default with no throw"
        status: unknown
    human_judgment: true
    rationale: "Slider drag, keyboard interaction, reload persistence, and reset are DOM behaviors; no jsdom in the node-env config. Store clamp/refuse/validate-on-read logic is unit-pinned from plan 03; the presentational binding needs a live browser."
duration: "~10 min (summary-only continuation)"
completed: "2026-10-28"
status: complete
plan_head_before: a05c3648e911b4be883b832d43616f360d472d32
plan_head_after: 15163acc0eba5cd34f32d9fdab2a2f1e5c8c5ffb
---

# Phase 21 Plan 04: Threshold Control Summary

Base-UI slider primitive plus the WHY NOW fire-threshold control with localStorage persistence and ghost reset, mounted beside the ticket panel — live trigger math untouched, full suite green at 505/505.

## Performance

- **Duration:** ~10 min (summary-only continuation; production tasks pre-committed)
- **Tasks:** 2/2 complete (verified on disk, pre-committed as 9c5d01c, 15064ad)
- **Commits:** 2 task commits (wave merge commit 15163ac excluded, per the 21-03 precedent)
- **Files changed:** 3 (180 insertions, 0 deletions across the 2 task commits)

## Accomplishments

- `components/ui/slider.tsx` wraps the on-disk Base-UI Slider parts (Root, Track, Indicator, Thumb, Control) with `cn` merging and namespaced `data-slot` tokens (`slider`, `slider-track`, `slider-range`, `slider-thumb`) in the button-idiom shape; presentational only, no store import, no Radix import anywhere; zero new runtime packages (`@base-ui/react` already in package.json, lockfile diff empty)
- `components/dashboard/threshold-control.tsx` renders the `threshold-control` block mirroring the ticket-panel risk stepper: locked `Atəş Həddi` h4 (11px semibold uppercase), Slider bound value-array to `fireThreshold` with min 1 max 7 step 1, mono tabular-nums `N / həftə` readout, ghost `Sıfırla` button with `Defolta qaytar` title restoring `FIRE_THRESHOLD_DEFAULT`
- Persistence is one display number under `liquidity.fireThreshold.v1`: lazy `useState` initializer calling `readFireThreshold` (validate-on-read, garbage and out-of-band fall back to the code default, try-caught for SSR, never module scope, never during render); write-through in the change handler persists what the store kept after clamp-on-write; reset writes the default back
- Degraded stale/thin ticket state disables slider and reset, mirroring the risk stepper write-lock
- `components/dashboard/terminal-shell.tsx` mounts `<ThresholdControl />` directly after `<TicketPanel />` in the ticket column; no modal, no new primary action
- Operator value never enters `src/lib/ict`: grep for `FIRE_THRESHOLD|fireThreshold|thresholdInputs` under `src/lib/ict` returns zero matches; `evaluateTrigger`, `checkFatalFlaw`, `computeTicket` keep reading code constants

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install slider primitive from shadcn Base-UI flow | 9c5d01c | components/ui/slider.tsx |
| 2 | Threshold control with persist plus reset plus mount | 15064ad | components/dashboard/threshold-control.tsx, components/dashboard/terminal-shell.tsx |

## Files Created / Modified

- `components/ui/slider.tsx` — created (Base-UI-backed presentational slider primitive)
- `components/dashboard/threshold-control.tsx` — created (thin store consumer with persist + reset)
- `components/dashboard/terminal-shell.tsx` — modified (one mount line after TicketPanel)

## Decisions Made

- Slider omits `cva`: a single-thumb control has no visual variants, so a variants wrapper would be dead abstraction; the file keeps the button idiom that matters (`cn` merging, namespaced `data-slot` tokens). See Deviations.
- Hydration via lazy initializer plus mount-only effect (empty-deps, lint-suppressed with rationale comment) so server and first client paint both render the code default synchronously — no hydration mismatch, no skeleton, per must-have truth 7.
- Write-through persists `useDashboard.getState().thresholdInputs.fireThreshold` (post-clamp) rather than the raw event value, so storage can never disagree with the rendered readout.

## Deviations from Plan

**1. [Noted difference — simplification, no Rule applied] Slider has no cva variants**
- **Found during:** Summary verification (acceptance criterion named "cva variants plus cn merging")
- **Issue:** The committed `slider.tsx` uses `cn` plus `data-slot` tokens but no `cva()` call, while the plan's Task 1 acceptance text said "cva variants plus cn merging plus namespaced slot tokens mirroring button.tsx".
- **Assessment:** Intentional simplification by the executor, not a defect. `button.tsx` needs `cva` because it ships `variant`/`size` axes; a single-thumb slider has no visual variants, so `cva` with an empty variant set would be dead code. The substance of the idiom (presentational-only, `cn`, namespaced slots, Base-UI parts, zero new packages) is fully met; `tsc` is clean and the lockfile diff is empty.
- **Action:** None — documented here for the verifier. If strict idiom parity is required, a follow-up can wrap the static classes in a vacuous `cva`; it changes nothing at runtime.

Total deviations: 1 noted difference (0 auto-fixes). No scope creep; no production code touched by this continuation.

## Issues Encountered

None. No auth gates, no architectural questions. The plan's Task 2 `human-check` (drag plus persist plus reset UAT in a live browser) was not performed in this continuation — recorded as `unknown` in the POL-04-control coverage entry for the verifier, matching the 21-VALIDATION manual-UAT row for POL-04.

## Threat Flags

None — T-21-07 (supply chain plus value injection) mitigated: generated slider reviewed against the button idiom, no Radix peer, lockfile diff verified empty, value path clamps on write (plan 03 slice, unit-pinned) and validates on read with default fallback; T-21-SC satisfied (zero new runtime packages — `@base-ui/react` pre-exists in package.json).

## Known Stubs

None — the control renders the code default synchronously on every path (SSR guard, null storage, corrupt value all resolve to `FIRE_THRESHOLD_DEFAULT`); no placeholder copy, no empty readouts, no unwired props.

## User Setup Required

None.

## Next Phase Readiness

POL-04 operator half is complete: the slider primitive is installed for reuse, the threshold control is live with persist and reset, and the section 5 strip from plan 03 already follows the same store value. Remaining for the verifier is the manual drag/persist/reset UAT row in 21-VALIDATION. REQUIREMENTS.md still lists POL-04 as Pending — the shared-ID gate was not evaluated in this continuation (per dispatch instructions, STATE.md/ROADMAP.md/REQUIREMENTS.md untouched).

## Self-Check: PASSED

- `components/ui/slider.tsx`, `components/dashboard/threshold-control.tsx` present on disk; `ThresholdControl` import plus mount present in `terminal-shell.tsx`
- `git merge-base --is-ancestor 9c5d01c HEAD` and `15064ad HEAD`: both present
- `npx tsc --noEmit`: exit 0; `npm test`: 44 files, 505/505 passing
