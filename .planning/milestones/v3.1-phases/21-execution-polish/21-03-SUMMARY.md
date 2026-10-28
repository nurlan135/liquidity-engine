---
phase: 21-execution-polish
plan: '03'
subsystem: ui
tags: [fire-rate, threshold-inputs, report-strip, POL-01, POL-04]
requires: [phase-21-01-buffered-ticket]
provides: [fire-rate-helper, threshold-slice, section-5-strip, POL-01-pins, POL-04-pins]
affects: [21-04-threshold-control]
actuals:
  tokens: 68000
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns: [guard-first-pure-helper, clamp-on-write-refuse-on-garbage, validate-on-read]
key-files:
  created: [src/lib/fire-rate.ts, src/lib/fire-rate.test.ts]
  modified: [src/lib/store.ts, src/lib/store.test.ts, components/dashboard/report.tsx]
key-decisions:
  - "Band constants (1/7/default 4) live in fire-rate.ts as the single source the store slice imports"
  - "Inclusive 7-day lower bound; count equal to threshold resolves in-band, threshold+1 resolves above"
  - "Strip delegates counting and copy to the pure helper over the live firingLog array — no caching layer"
  - "readFireThreshold validates at the component boundary, never reads storage at module scope"
requirements-completed: [POL-01, POL-04]
coverage:
  - id: POL-01-helper
    description: "Pure 7d fire-rate helper with band constants, status resolution, and locked copy literals"
    requirement: POL-01
    verification:
      - kind: automated
        ref: "npm test -- src/lib/fire-rate.test.ts (part of 63/63 across the 3 pinned files)"
        status: pass
      - kind: automated
        ref: "npx tsc --noEmit (exit 0)"
        status: pass
    human_judgment: false
  - id: POL-01-slice
    description: "thresholdInputs slice with clamp, refuse, reset, and validate-on-read pins"
    requirement: POL-01
    verification:
      - kind: automated
        ref: "npm test -- src/lib/store.test.ts (part of 63/63 across the 3 pinned files)"
        status: pass
      - kind: automated
        ref: "npx tsc --noEmit (exit 0)"
        status: pass
    human_judgment: false
  - id: POL-04-strip
    description: "Section 5 fire-rate strip with D-15 rhythm and D-17 live region"
    requirement: POL-04
    verification:
      - kind: automated
        ref: "npm test full suite (505/505)"
        status: pass
      - kind: automated
        ref: "npx tsc --noEmit (exit 0)"
        status: pass
      - kind: human-check
        ref: "Plan task 3 human-check: open live report section 5 with empty/in-band/out-of-band logs, confirm strip copy and polite announcements"
        status: pending
    human_judgment: true
duration: "~10 min (summary-only continuation)"
completed: "2026-10-28"
status: complete
plan_head_before: 593f3184a45b163e5d2e51b5e39ae41bd94b5269
plan_head_after: c322b318aa34f80eea56bf3b8a846a93ef3c3e9
---

# Phase 21 Plan 03: Fire-Rate Strip Summary

Pure 7-day fire-rate helper with locked Azerbaijani band copy, an operator threshold store slice with clamp/refuse/validate-on-read, and the section 5 fire-rate strip with D-15 rhythm and D-17 live-region polish — full suite green at 505/505.

## Performance

- **Duration:** ~10 min (summary-only continuation; production tasks pre-committed)
- **Tasks:** 3/3 complete (verified on disk, pre-committed as 9c5a311, ccbff0c, c322b31)
- **Commits:** 3 task commits (measured via `git rev-list --count 593f318..HEAD` minus the wave merge commit)
- **Files changed:** 5 (306 insertions, 18 deletions across the 3 task commits)

## Accomplishments

- `src/lib/fire-rate.ts` exports `FIRE_THRESHOLD_MIN` 1, `FIRE_THRESHOLD_MAX` 7, `FIRE_THRESHOLD_DEFAULT` 4 as the single band source; `countFireRate` counts only FIRE_LONG/FIRE_SHORT verdicts inside the inclusive 7-day epoch window (empty log yields `empty`, zero-with-history yields `below`, 1..threshold yields `in`, above yields `above`); `fireRateCopy` returns the four UI-SPEC locked literals verbatim; non-finite `nowEpochSec` degrades to the empty result, never throws
- `src/lib/fire-rate.test.ts` pins every literal plus boundary (count == threshold is `in`, threshold+1 is `above`, zero-with-history is `below`, empty-log is `empty`)
- `src/lib/store.ts` gains `thresholdInputs` holding `fireThreshold` defaulting to 4, `setFireThreshold` mirroring the `setRiskPct` clamp-on-write shape (clamps 1..7, refuses NaN/non-finite/zero/negative with state untouched), and exported pure `readFireThreshold` returning the band-clamped integer else 4 for crafted strings, out-of-band numbers, NaN, null, undefined; no trigger/ticket selector reads the slice; no `src/lib/ict` file modified
- `src/lib/store.test.ts` pins default 4, clamp edges 1/7, every refuse shape, reset restoring 4, and the full tampered-value validate-on-read table
- `components/dashboard/report.tsx` renders one sibling `data-slot="fire-rate-strip"` paragraph (Body 12px muted, mono tabular-nums count) inside the s5-paper-ticket div via `fireRateCopy(countFireRate(...))` over the live `firingLog` array with the operator `thresholdInputs.fireThreshold`; both `s1-pain-threshold` divs gain `space-y-1` (D-15); the section 1 live section gains `aria-live="polite"` (D-17); pool-lines/pool-ghosts spans stay `aria-hidden`; no scorer derivation changed

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fire-rate helper plus copy pins | 9c5a311 | src/lib/fire-rate.ts, src/lib/fire-rate.test.ts |
| 2 | Threshold store slice plus validation pins | ccbff0c | src/lib/store.ts, src/lib/store.test.ts |
| 3 | Section 5 strip plus D-15 rhythm plus D-17 live region | c322b31 | components/dashboard/report.tsx |

## Files Created / Modified

- `src/lib/fire-rate.ts` — created (band constants, countFireRate, fireRateCopy)
- `src/lib/fire-rate.test.ts` — created (count/boundary/empty/copy pins)
- `src/lib/store.ts` — modified (thresholdInputs slice, setFireThreshold, readFireThreshold)
- `src/lib/store.test.ts` — modified (clamp/refuse/reset/validate-on-read pins)
- `components/dashboard/report.tsx` — modified (fire-rate strip, D-15 rhythm, D-17 live region)

## Decisions Made

- Band constants live in `fire-rate.ts` as the single source the store slice imports (no duplicated literals)
- Inclusive 7-day lower bound at exactly now minus 7 days; count equal to threshold is in-band, threshold+1 is above-band (per plan assumptions log)
- Strip reads the live store array every render with no caching layer, so empty log always renders the honest-empty copy (T-21-06 mitigation)
- `readFireThreshold` validates at the component boundary, never reads storage at module scope (T-21-05 mitigation)

## Deviations from Plan

None - plan executed exactly as written. This continuation performed summary-only work: verified all three task commits on disk, ran the plan verification (full suite 505/505, tsc exit 0), and wrote this SUMMARY. No production code touched.

## Issues Encountered

None. No auth gates, no architectural questions. The plan's task-3 `human-check` (visual strip copy + polite announcements in a live browser) was not performed in this continuation — recorded as `pending` in the POL-04-strip coverage entry for the verifier.

## Threat Flags

None — T-21-05 (localStorage tampering) mitigated by `readFireThreshold` validate-on-read with pins; T-21-06 (stale-as-current) mitigated by live-array reads with honest-empty copy and pins; T-21-SC satisfied (no new packages, own-code only).

## Known Stubs

None — all strip paths render through the helper over the live array; no empty values, cached counts, or placeholder copy introduced.

## User Setup Required

None.

## Next Phase Readiness

Ready for 21-04 threshold control: the `thresholdInputs.fireThreshold` slice with clamp/refuse/reset is live and the strip already reads it, so the slider UI can bind `setFireThreshold` directly with no store changes.

## Self-Check: PASSED
