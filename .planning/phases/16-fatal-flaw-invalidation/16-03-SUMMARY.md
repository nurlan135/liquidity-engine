---
phase: 16-fatal-flaw-invalidation
plan: '03'
subsystem: invalidation
tags: [fatal-flaw, SMT, SOFT, selector, vitest]

# Dependency graph
requires:
  - phase: 16-fatal-flaw-invalidation plan 02
    provides: flaw-stale plus flaw-coherence selector cases and invalidation prose tables the new tests extend
provides:
  - SMT SOFT downgrade proven live through selectFatalFlaw with carried FIRE_LONG reason and 0.70 unblock
  - Selector-level impossibility proof that OPPOSITE_SWEEP never surfaces live; Phase 17 must treat live SOFT as SMT-only
  - Corrected opposite-sweep test title (LOW sweep) plus synthetic-only comments plus header note; zero verdict-logic change
affects: [phase-17-section-6-render, phase-18-replay]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 700
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: [first-derivation live assertion, sweep-implied direction pin]

key-files:
  created: []
  modified: [src/lib/store.test.ts, src/lib/ict/invalidation.test.ts, src/lib/ict/invalidation.ts]

key-decisions:
  - "Review option (c): document opposite-sweep impossibility with selector tests rather than widening D-05 input shape or deleting the D-02-locked union member"
  - "Tracer feedback gate auto-continued: interactive run, end-of-phase mode, automated-only verify passing"

patterns-established:
  - "Live SOFT pin: first derivation after seed without pre-calling selectTrigger, asserting downgrade plus reasonKey plus carried reason"
  - "Impossibility pin: assert trigger direction equals the sweep-implied direction on identical state"

requirements-completed: [FLAW-01, FLAW-02]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "SMT-suppressed FIRING downgrades to SOFT ARMED live through selectFatalFlaw with carried FIRE_LONG reason and 0.70 unblock"
    requirement: "FLAW-01"
    verification:
      - kind: unit
        ref: "src/lib/store.test.ts#flaw-soft-live-smt"
        status: pass
    human_judgment: false
  - id: D2
    description: "Live trigger direction always equals the sweep-implied direction, so OPPOSITE_SWEEP never surfaces through selectFatalFlaw"
    requirement: "FLAW-02"
    verification:
      - kind: unit
        ref: "src/lib/store.test.ts#flaw-opposite-impossible-live"
        status: pass
    human_judgment: false
  - id: D3
    description: "Opposite-sweep synthetic tests titled correctly (LOW sweep) with synthetic-only comments and header note; pure-layer precedence still pinned"
    requirement: "FLAW-02"
    verification:
      - kind: unit
        ref: "src/lib/ict/invalidation.test.ts#taxonomy disjunction table"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-09-11
status: complete
---

# Phase 16 Plan 03: SOFT taxonomy honesty gap closure Summary

**SMT SOFT downgrade proven live through selectFatalFlaw with carried FIRE_LONG reason; opposite-sweep documented as synthetic-only with selector impossibility proof and corrected test title**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-11T13:45:00Z
- **Completed:** 2026-09-11T13:57:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- flaw-soft-live-smt test green: seeded London LOW-sweep state yields selectFatalFlaw with downgraded true, SOFT, SMT_SUPPRESSED, carried FIRE_LONG, and 0.70 unblock on the first derivation
- flaw-opposite-impossible-live test green: trigger direction equals the sweep-implied direction on identical state; first derivation is SMT_SUPPRESSED and later ARMED derivations never yield OPPOSITE_SWEEP
- Corrected line-136 test title to name LOW sweep (matching its SHORT-direction plus LOW-sweepSide fixture); companion LONG plus HIGH title verified correct
- Source header note documents the OPPOSITE_SWEEP branch as synthetic-only unreachable via selectFatalFlaw; zero verdict-logic diff (+4/-0 comment-only in invalidation.ts)

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer SMT SOFT downgrade live** - `c09628d` (test)
2. **Task 2: Opposite-sweep impossibility plus title plus header** - `0880a1f` (test)

## Files Created/Modified

- `src/lib/store.test.ts` - flaw-soft-live-smt (first-derivation live SOFT pin) plus flaw-opposite-impossible-live (direction-equals-implied pin)
- `src/lib/ict/invalidation.test.ts` - corrected LOW-sweep title plus synthetic-envelope comments above both opposite-sweep tests
- `src/lib/ict/invalidation.ts` - extended file-top comment with the SYNTHETIC-ONLY NOTE; all verdict logic, reason strings, unblock strings, sentence table, and challenge bank byte-identical

## Decisions Made

- Followed review option (c) per plan: selector-level impossibility proof instead of widening the D-05 input shape or deleting the D-02-locked OPPOSITE_SWEEP member
- Tracer feedback gate auto-continued (interactive run, end-of-phase mode, automated-only verify all green) — logged per gate protocol

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 17 section 6 can render live SOFT as SMT-only with the carried FIRE_LONG resume key and 0.70 unblock; it must never offer an opposite-sweep downgrade path on live state
- Purity guard (2/2) and tsc --noEmit clean; full-suite run gates verify-work re-run per plan verification
- Ready for 16-04 (if any) or phase verification

---
*Phase: 16-fatal-flaw-invalidation*
*Completed: 2026-09-11*

## Self-Check: PASSED
- FOUND: src/lib/store.test.ts (flaw-soft-live-smt, flaw-opposite-impossible-live)
- FOUND: src/lib/ict/invalidation.test.ts (LOW-sweep title)
- FOUND: src/lib/ict/invalidation.ts (SYNTHETIC-ONLY NOTE)
- FOUND: c09628d, 0880a1f
