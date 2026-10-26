---
phase: 22-pool-lifecycle-decay-pool2-04
plan: '03'
subsystem: pools-sandbox
tags: [pools, decay, calibration-sandbox, preview, zustand, vitest]

requires:
  - phase: 22-01
    provides: DECAY_HALF_LIFE_BARS=10 and DECAY_SCORE_FLOOR=0.25 plus poolAgeBars/poolDecay plus asOf threading plus decayFactor ledger
  - phase: 22-02
    provides: Stored-weight identity, double-run determinism, SWEPT-ghost order, time-order pins with parity/purity/selector gates green
provides:
  - Preview slice decay knobs decayHalfLifeBars and decayFloor with clamped setters, pinned re-seeding on Apply and reset in src/lib/store.ts
  - Two sandbox KnobRows (sandbox-knob-decay-half-life, sandbox-knob-decay-floor) wired to preview setters with pristine comparison in calibration-sandbox.tsx
  - Clamp, NaN-refusal, reset, Apply, and derivation-independence pins in src/lib/store.test.ts
affects: [23-tp2-resolver, calibration-review]

actuals:
  tokens: 1956
  tasks: 3
  commits: 3
  plan_head_before: 0e3b6834b8eca8c428d152c5fa93acca2ac4881
  plan_head_after: ab20dbe2aa0d7afe1c06cd1e369b57b59094b27

tech-stack:
  added: []
  patterns: ["preview-versus-applied idiom extended to decay knobs (setCalibrationDolBoost shape)", "pristine compares preview fields against imported pinned constants, never literals"]

key-files:
  created: []
  modified: [src/lib/store.ts, components/dashboard/calibration-sandbox.tsx, src/lib/store.test.ts]

key-decisions:
  - "Decay preview fields seed from DECAY_HALF_LIFE_BARS/DECAY_SCORE_FLOOR imports — a constant retune flows into the sandbox without literal edits"
  - "Half-life setter rounds fractional input to whole bars (Math.round) matching the kz integer precedent; floor stays a continuous 0-0.9 mult"
  - "Task 1's toEqual seed/Apply/Reset expectations extended as a Rule 1 auto-fix — the new preview fields broke byte-exact assertions by design"

patterns-established:
  - "CalibrationPreview decay fields: decayHalfLifeBars + decayFloor beside dolBoost/behindPenalty, Apply/reset re-seed objects extended in place"
  - "Sandbox decay rows: half-life fmtInt 1-30 step 1, floor fmtMult 0-0.9 step 0.05, after the behind knob, degraded-disabled, preview-dim plus BAXIŞ badge path"

requirements-completed: [POOL2-04]

coverage:
  - id: D1
    description: "Preview slice decay knobs — decayHalfLifeBars and decayFloor with clamped setters plus pinned re-seeding on Apply and reset"
    requirement: "POOL2-04"
    verification:
      - kind: unit
        ref: "src/lib/store.test.ts#calibration-preview seeds from pinned constants, clamps, refuses NaN, and resets with session scope"
        status: pass
    human_judgment: false
  - id: D2
    description: "Two sandbox KnobRows (half-life + floor) with pristine tracking and no new UI primitive"
    requirement: "POOL2-04"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: false
  - id: D3
    description: "Preview clamp, reset, Apply, and derivation-independence pins — scorer output identical before/after preview movement"
    requirement: "POOL2-04"
    verification:
      - kind: unit
        ref: "src/lib/store.test.ts#calibration-apply records the reviewed HOLD verdict and re-pins the preview"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-10-26
status: complete
---

# Phase 22 Plan 03: Decay Sandbox Preview Summary

**Decay half-life + floor ride the calibration sandbox as what-if preview knobs with clamped setters, pristine tracking, and Apply/reset re-seeding — derivation keeps reading pinned constants untouched.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-10-26T10:13:45Z
- **Completed:** 2026-10-26T10:21:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Preview slice extended with `decayHalfLifeBars` + `decayFloor`, `CALIBRATION_DECAY_HALF_LIFE` (1–30, step 1) and `CALIBRATION_DECAY_FLOOR` (0–0.9, step 0.05) bounds, clamped setters with integer rounding + non-finite refusal, and Apply/reset re-seeding from pinned constants
- Two `KnobRow` entries (`sandbox-knob-decay-half-life` with Yarım-həyat label, `sandbox-knob-decay-floor` with Skor taban label) wired after the behind knob with pristine lines against imported decay constants, degraded-flag honoring, and zero new UI primitives
- Store tests pin decay clamp/reset/NaN-refusal plus Apply re-seeding to pinned constants and prove `scoreAndRank` output byte-identical before/after preview movement; `tsc --noEmit` clean; store suite 48/48 green

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend preview slice with decay knobs plus setters plus Apply reset** - `f2b1421` (feat)
2. **Task 2: Wire two sandbox KnobRows with pristine comparison and no new primitive** - `e04249e` (feat)
3. **Task 3: Pin preview clamp reset Apply and no-derivation-reads behavior** - `ab20dbe` (test)

## Files Created/Modified

- `src/lib/store.ts` - Decay bound families, two preview fields, two setter signatures + bodies, Apply + reset re-seed lines
- `components/dashboard/calibration-sandbox.tsx` - Decay imports, two setter subscriptions, pristine lines, two KnobRows
- `src/lib/store.test.ts` - Seed/reset/Apply expectations extended, clamp + NaN-refusal + Apply-drift + scoreAndRank-independence pins

## Decisions Made

- Decay preview fields seed from `DECAY_HALF_LIFE_BARS`/`DECAY_SCORE_FLOOR` imports (pristine compares against the imports, never literals), so a firing-log constant retune flows into the sandbox with no panel edit.
- Half-life rounding uses `Math.round` per the kz integer precedent; floor stays continuous like the other mult knobs.
- Section 1 prose and chart lines untouched per D-08/D-13/D-14; derivation reads zero preview state — the Task 3 `scoreAndRank` identity assertion proves it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing toEqual assertions broke on new preview fields**
- **Found during:** Task 1 (preview slice extension)
- **Issue:** The `calibration-preview` seed test, the reset `toEqual`, and the Apply `toEqual` assert byte-exact preview objects; adding `decayHalfLifeBars`/`decayFloor` failed 2 of them by design (46/48 before fix).
- **Fix:** Extended the three `toEqual` objects with the two new fields sourced from the pinned decay-constant imports — no tolerance loosening, no rank assertions.
- **Files modified:** src/lib/store.test.ts
- **Verification:** `npx vitest run src/lib/store.test.ts` 48/48 green.
- **Committed in:** f2b1421 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (test-expectation shape update, zero implementation change beyond the planned slice)
**Impact on plan:** The fix is the plan's own consequence — new preview fields must appear in exact-shape assertions. No scope creep.

## Issues Encountered

None. Typecheck clean on first run after panel wiring; store suite green after the Task 1 expectation fix; no auth gates, no Rule 4 escalations.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 22 complete: decay core (22-01) + lifecycle invariants with gates green (22-02) + sandbox preview (22-03). Ready for Phase 23 TP2 resolver, which reads the locked decayed rank.
- Sandbox sliders are what-if only — Apply records intent and re-pins preview; no constant rewrite path exists, firing-log review stays the calibration route.
- No stubs, no skipped tests, no unrun verifies. Section 1 prose, chart lines, trigger/flaw/ticket derivation untouched.

## Threat Flags

None - no new network endpoints, auth paths, file access, or schema changes. Preview fields are session-scoped memory-only with clamped setters + non-finite refusal (T-22-03 mitigated via pins); T-22-SC not applicable — zero new packages.

## Self-Check: PASSED

---
*Phase: 22-pool-lifecycle-decay-pool2-04*
*Completed: 2026-10-26*
