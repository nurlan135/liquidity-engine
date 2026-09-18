---
phase: 21-execution-polish
plan: 04
subsystem: ui
tags: [zustand, slider, calibration-sandbox, vitest, jsdom, gap-closure]

# Dependency graph
requires:
  - phase: 21-03
    provides: [working Apply mechanics, sandbox shell-test pinning HOLD applied copy]
provides:
  - Conspicuous BAXIŞ drift badge hoisted outside the dim container
  - In-sandbox TUTULDU HOLD verdict beside the applied copy post-Apply
  - Reactive calibrationReviewApplied flag in zustand state
  - Single-thumb scalar slider knobs
  - Constant-pinned pristine check and isolated shell-test calibration state
affects: [21-UAT gap G-21-3 closure, phase 21 verification]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 3000
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: [reactive zustand flag set in the same set() as dependent slice, value-first thumb derivation, constant-pinned pristine check]

key-files:
  created: []
  modified: [components/dashboard/calibration-sandbox.tsx, components/ui/slider.tsx, src/lib/store.ts, src/terminal-shell.test.ts]

key-decisions:
  - "Pinned constants imported from canonical owners (trigger.ts/pools.ts) into the sandbox instead of re-exporting through the store"
  - "Badge restyled as amber warning chip (border-amber-400/60 bg-amber-400/10 text-amber-300) matching the terminal dark palette"
  - "sandbox-applied keeps its data-slot on a wrapper div so existing copy assertions still target one block"

patterns-established:
  - "Reactive Apply flag: calibrationReviewApplied lives in zustand state and flips in the same set() that re-seeds calibrationPreview"
  - "Hoisted preview badge: drift tag renders as a sibling BEFORE the opacity-45 dim container, never inside it"
  - "Test isolation for session slices: shell beforeEach resets calibrationPreview to pins plus the applied flag to false"

requirements-completed: [POL-04]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Drift dims preview with a conspicuous BAXIŞ badge rendered outside the dim container"
    requirement: "POL-04"
    verification:
      - kind: integration
        ref: "src/terminal-shell.test.ts#sandbox-block (tag has no opacity-45 ancestor)"
        status: pass
    human_judgment: true
    rationale: "Contrast legibility is perceptual — jsdom pins DOM placement, a human must confirm the badge reads conspicuous on the live terminal"
  - id: D2
    description: "Apply records the HOLD verdict copy with TUTULDU visible inside the sandbox and re-seeds knobs to pins"
    requirement: "POL-04"
    verification:
      - kind: integration
        ref: "src/terminal-shell.test.ts#sandbox-block (applied block contains TUTULDU)"
        status: pass
      - kind: unit
        ref: "src/lib/store.test.ts#calibration-apply"
        status: pass
    human_judgment: false
  - id: D3
    description: "Each scalar knob renders exactly one thumb"
    requirement: "POL-04"
    verification:
      - kind: integration
        ref: "src/terminal-shell.test.ts#sandbox-block (one slider-thumb per knob)"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-09-17
status: complete
---

# Phase 21 Plan 04: Sandbox Gap Closure Summary

**Hoisted amber BAXIŞ badge above the dim block, in-sandbox TUTULDU verdict post-Apply, reactive zustand applied flag, single-thumb knobs, constant-pinned pristine check**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-17T16:40:00Z
- **Completed:** 2026-09-17T16:52:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Drift dims the preview block while the BAXIŞ badge renders undimmed as an amber warning chip above it (G-21-3a closed)
- Apply shows the TUTULDU HOLD verdict (`Atəş tempi 1–4/həftə bandında — TUTULDU — konstantlar dəyişməz qalır`) inside the sandbox beside the applied-set copy, and knobs re-seed to pins (G-21-3b closed)
- `calibrationReviewApplied` moved from a module-level `let` into reactive zustand state, flipped in the same `set()` as the preview re-seed — review-only subscribers now re-render, and test resets clear it (latent reactivity/isolation hazard closed)
- Scalar slider knobs render one thumb each (`value`-first derivation; only both-undefined falls back to min-max)
- Pristine check compares against imported `TRIGGER_*`/`EQUAL_TOL_*`/`MERGE_*`/`DOL_*`/`BEHIND_*` constants — a constant retune can no longer silently break it
- Shell-test `beforeEach` resets preview to pins plus the applied flag to false; sandbox test asserts one thumb per knob, hoisted tag, and in-sandbox verdict
- Scoped suites green: `store.test.ts` + `terminal-shell.test.ts` 79/79; `tsc --noEmit` clean; `parity.test.ts` untouched

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix sandbox badge plus verdict plus reactive flag plus thumbs plus pristine** - `76eab37` (fix)
2. **Task 2: Harden shell-test isolation plus thumb tag verdict assertions** - `390bbbd` (test)

## Files Created/Modified

- `components/dashboard/calibration-sandbox.tsx` - Hoisted badge above the dim div, verdict rendered in applied block, pristine pinned to imported constants
- `components/ui/slider.tsx` - Value-first thumb derivation so scalar knobs render a single thumb
- `src/lib/store.ts` - `calibrationReviewApplied` reactive field in zustand state; selector reads `get()`; Apply sets flag with re-seed in one `set()`
- `src/terminal-shell.test.ts` - beforeEach isolation reset plus thumb-count, tag-placement, and verdict assertions

## Decisions Made

- Pinned constants imported from their canonical owners (`src/lib/ict/trigger`, `src/lib/ict/pools`) into the sandbox instead of re-exporting through the store — the store imports them without re-export, so a re-export would have widened its surface.
- Badge restyled as an amber warning chip (`border-amber-400/60 bg-amber-400/10 text-amber-300`, semibold, rounded-full) fitting the terminal dark palette — conspicuous without inventing a new color token.
- `sandbox-applied` keeps its data-slot on a wrapper div so the existing applied-copy assertions still target one block while the verdict renders as a semibold sibling line above the muted copy.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `tsc` rejected importing the pinned constants from `@/src/lib/store` (imported but not re-exported — TS2459 on all seven). Resolved by importing from the canonical constant owners per the deviation note above. No behavior impact; verified with a clean `tsc --noEmit`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Gap G-21-3 truth holds per the automated half: badge placement, verdict text, single thumbs, and test isolation are all pinned by suite assertions.
- Remaining manual step: a live UAT glance confirming the amber badge reads conspicuous during drift and TUTULDU is recognizable post-Apply (21-UAT.md test 3 re-check).
- parity.test.ts untouched; no trigger/flaw/ticket derivation semantics changed — pools-never-vote lock intact.

---
*Phase: 21-execution-polish*
*Completed: 2026-09-17*

## Self-Check: PASSED

- FOUND: components/dashboard/calibration-sandbox.tsx
- FOUND: components/ui/slider.tsx
- FOUND: src/lib/store.ts
- FOUND: src/terminal-shell.test.ts
- FOUND: 76eab37 (Task 1 commit)
- FOUND: 390bbbd (Task 2 commit)
- Scoped suites: 79/79 pass; tsc clean; parity.test.ts unmodified
