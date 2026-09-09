---
phase: 13-thin-history-honesty
plan: 01
subsystem: ui
tags: [thin-history, banner, tier, vitest, lightweight-charts, zustand]

# Dependency graph
requires:
  - phase: 11-chart-rendering-polish
    provides: NqChart render chain, rollover-banner pattern, propsRef sync convention
provides:
  - Pure thin-tier truth module (ThinTier, thinTier, thinTierCopy, resolveThinTier, thinBannerOrder)
  - Persistent thin-history banner stacked thin-first over rollover in terminal-shell
  - thinTier prop plumbing into NqChart with data-thin-tier container hook
affects: [13-thin-history-honesty plan 02 (canvas dimming), zone-primitive opacity fix]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 7000
  tasks: 2
  commits: 3
  plan_head_before: 232f2e7bcaefce7b9931ec3f7ce1394ae82d8d88

# Tech tracking
tech-stack:
  added: []
  patterns: [DOM-free pure tier helper importing math constants, render-scope tier derivation with silent degrade, thin-first banner stacking via order predicate]

key-files:
  created: [src/lib/thin-tier.ts, src/lib/thin-tier.test.ts]
  modified: [components/dashboard/terminal-shell.tsx, components/charts/nq-chart.tsx]

key-decisions:
  - "Tier thresholds flow only through ANCHOR_WINDOW and MIN_CANDLES_FULL imports — zero local literals in thin-tier.ts"
  - "Banner order predicate thinBannerOrder owns stacking; dual-banner case wraps in flex flex-col gap-2, single-banner renders bare"

patterns-established:
  - "resolveThinTier null-safe envelope: null range or unexpected input returns null, never throws"
  - "propsRef sync triple (type, sync object, dep array) extended for every new NqChart prop"

requirements-completed: [HIST-01]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Tier truth helper classifies 19/20/33/34 closed candles, excludes forming rows, returns verbatim per-tier copy, orders banners thin-first"
    requirement: "HIST-01"
    verification:
      - kind: unit
        ref: "npm test -- --run src/lib/thin-tier.test.ts (10 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Persistent thin-history banner renders per tier with thin-first stacking; zero banner DOM at 0 candles, skeleton, and full tier"
    requirement: "HIST-01"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: true
    rationale: "Banner presence per candle-count state and stacking order need a human glance in the running terminal (D-08); node vitest cannot render the shell"
  - id: D3
    description: "Live tier reaches the chart prop and data-thin-tier container attribute; dead thinHistory:false literal replaced with the live expression"
    requirement: "HIST-01"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: true
    rationale: "Prop threading is typechecked but end-to-end flag-reaches-chart behavior needs the running chart (D-08 human glance in Plan 02 scope)"
  - id: D4
    description: "Banner copy wraps within card width at narrow widths with no truncation or horizontal overflow"
    requirement: "HIST-01"
    verification: []
    human_judgment: true
    rationale: "Backstop truth per plan — held-out visual verification, no explicit evidence at authoring time"

# Metrics
duration: 25min
completed: 2026-09-09
status: complete
---

# Phase 13 Plan 01: Banner Half Summary

**Tested pure thin-tier truth module plus the persistent thin-history banner plumbed through the shell into the chart prop**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-09T12:40:00Z
- **Completed:** 2026-09-09T13:05:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `src/lib/thin-tier.ts`: DOM-free pure module classifying closed counts into range-thin / regime-degraded / full from imported math constants, verbatim UI-SPEC Azerbaijani copy per tier, null-safe `resolveThinTier`, thin-first `thinBannerOrder`
- `src/lib/thin-tier.test.ts`: 10 boundary/forming-exclusion/copy/order/pinned-constant tests, all green
- `terminal-shell.tsx`: persistent `thin-history-banner` block (role status, rollover-box classes, data-tier, data-closed-count) stacked thin-first over rollover, with 1+ candle + non-null envelope guards and `thinTier` threaded into the NqChart invocation
- `nq-chart.tsx`: optional `thinTier` prop (default full) synced through propsRef + dep array, `data-thin-tier` container attribute, live `thinHistory: latest.thinTier === 'range-thin'` zone expression replacing the dead `false` literal

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end tier truth (tracer, TDD)** - `50cf2bb` (test: RED commit) + `cda9b86` (feat: GREEN implementation)
2. **Task 2: Render the persistent banner and thread the tier into the chart** - `89f641d` (feat)

_Note: TDD task has RED then GREEN commits per plan discipline_

## Files Created/Modified
- `src/lib/thin-tier.ts` - Tier truth, verbatim copy map, null-safe resolve, order predicate
- `src/lib/thin-tier.test.ts` - Boundary pins (19/20/33/34), forming-exclusion, copy-per-tier, order, pinned constants
- `components/dashboard/terminal-shell.tsx` - Thin banner block stacked thin-first; thinTier passed to NqChart
- `components/charts/nq-chart.tsx` - thinTier prop plumbing with live propsRef sync and container tier attribute

## Decisions Made
- Tier thresholds reuse `ANCHOR_WINDOW` and `MIN_CANDLES_FULL` imports exclusively; `thinTierCopy` interpolates the constants so copy denominators can never drift from math (D-11).
- Single-banner cases render the bare block with no wrapper; the `flex flex-col gap-2` wrapper exists only when both banners show (D-02).
- No report.tsx edits, no viewport calls, no dimming branches — dimming belongs to Plan 02 (D-05/D-06/D-10/D-12).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `tsc` flagged the defensive `thinTierValue === 'full' ? 'range-thin' : thinTierValue` ternary as TS2367 (no overlap): the `showThinBanner` guard already narrows the tier to non-full, so the call simplified to `thinTierCopy(thinTierValue, thinClosedCount)`. Resolved inline, part of the Task 2 commit. Typecheck green after.

## Threat Flags

None. Banner copy renders as plain JSX text interpolation with the count as a numeric data attribute — no innerHTML or dangerouslySetInnerHTML added (T-13-01 mitigated). No package installs (T-13-SC accepted).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Banner half complete and typechecked; tier tests green (10/10).
- Plan 02 (canvas dimming) can consume `thinTier` from the chart prop; the zone-primitive opacity-snapshot fix (Pitfall 1) must land before any dimming task.
- D-08 human glance (honest look + clean console + narrow-width wrap check) stays open for verify-work.

---
*Phase: 13-thin-history-honesty*
*Completed: 2026-09-09*
