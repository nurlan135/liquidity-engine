---
phase: 08-amd-sessions-asia-range-judas
plan: 03
subsystem: ict-math
tags: [amd, judas, smt, asia-range, pure-functions, vitest, date-fns-tz]

# Dependency graph
requires:
  - phase: 08-01
    provides: Asia Range detector (asiaRange) consumed as AMD fusion input
  - phase: 08-02
    provides: London Judas detector (judasSwing) consumed as AMD promotion input
  - phase: 07-smt-4h-1h-sequencing-math
    provides: SmtOutput envelope fused read-only as the AMD regime tag
provides:
  - AMD phase classifier (amdPhase) with time-plus-event promotions and exact Azerbaijani reasons
  - NY unavailable branch preserving the prior phase with the honest marker
  - End-to-end asiaRange-through-judasSwing-to-amdPhase fusion proof
affects: [09-composition, section-3-prose, asia-overlay]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 9600
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: [fixed-gate-order classifier, deterministic reason sentences, read-only envelope tag]

key-files:
  created: [src/lib/ict/amd.ts, src/lib/ict/amd.test.ts]
  modified: []

key-decisions:
  - "Confirmed Judas with unusable sweepTime holds manipulation rather than promoting to distribution"
  - "NY unavailable branch replaces the reason wholesale and runs last, preserving the prior phase"

patterns-established:
  - "Classifier gate order: clock skeleton, Judas promotion, SMT tag, NY branch"
  - "Deterministic reason selection (one base sentence plus at most one SMT suffix) for verbatim section-3 rendering"

requirements-completed: [ICT-14]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "AMD phase classifier with time-plus-event transitions and exact Azerbaijani reasons"
    requirement: "ICT-14"
    verification:
      - kind: unit
        ref: "src/lib/ict/amd.test.ts#amd: accumulation on Asia hours with null Judas"
        status: pass
      - kind: unit
        ref: "src/lib/ict/amd.test.ts#amd: candidate-only manipulation"
        status: pass
      - kind: unit
        ref: "src/lib/ict/amd.test.ts#amd: confirmed manipulation inside the window"
        status: pass
      - kind: unit
        ref: "src/lib/ict/amd.test.ts#amd: distribution past the confirmation window"
        status: pass
    human_judgment: false
  - id: D2
    description: "Read-only SMT regime tag with agreement and suppression appends"
    requirement: "ICT-14"
    verification:
      - kind: unit
        ref: "src/lib/ict/amd.test.ts#amd: SMT agreement tag"
        status: pass
      - kind: unit
        ref: "src/lib/ict/amd.test.ts#amd: SMT suppression tag"
        status: pass
      - kind: unit
        ref: "src/lib/ict/amd.test.ts#amd: SMT read-only"
        status: pass
    human_judgment: false
  - id: D3
    description: "NY unavailable branch plus empty-range degraded branch with exact reasons"
    requirement: "ICT-14"
    verification:
      - kind: unit
        ref: "src/lib/ict/amd.test.ts#amd: NY unavailable branch"
        status: pass
      - kind: unit
        ref: "src/lib/ict/amd.test.ts#amd: empty-range degraded branch"
        status: pass
    human_judgment: false
  - id: D4
    description: "End-to-end asiaRange-through-judasSwing-to-amdPhase fusion proof"
    requirement: "ICT-14"
    verification:
      - kind: integration
        ref: "src/lib/ict/amd.test.ts#amd: end-to-end asiaRange through judasSwing to amdPhase fusion"
        status: pass
    human_judgment: false

# Metrics
duration: 6min
completed: 2026-09-07
status: complete
---

# Phase 08 Plan 03: AMD Phase Classifier Summary

**AMD phase classifier fusing Asia Range plus Judas plus read-only SMT with exact Azerbaijani reasons and an honest NY marker**

## Performance

- **Duration:** 6 min
- **Started:** 2026-09-07T10:19:13Z
- **Completed:** 2026-09-07T10:25:24Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Time-plus-event classifier: accumulation skeleton, Judas promotion to manipulation, distribution only past sweepTime plus 2700
- Read-only SMT regime tag: agreement append on aligned confirmation, suppression pass-through, input never mutated
- NY unavailable branch preserving the prior phase with the exact Gözlənilir reason; empty-range degraded branch
- End-to-end fusion case plus full suite green (249 tests, 28 files) with phase-wide purity clean

## Task Commits

Each task was committed atomically:

1. **Task 1: AMD classifier core with time-plus-event transitions** - `ae29572` (feat)
2. **Task 2: AMD end-to-end fusion plus full-suite green** - `51022bc` (test)

**Plan metadata:** pending (docs: complete plan — committed after this write)

## Files Created/Modified
- `src/lib/ict/amd.ts` - AMD phase classifier (NY_SESSION_START_MIN/END_MIN, AmdPhase, AmdOutput, amdPhase)
- `src/lib/ict/amd.test.ts` - Nine branch/tag/read-only cases plus the end-to-end fusion case

## Decisions Made
- Confirmed Judas with a null or unusable sweepTime holds manipulation rather than promoting to distribution — the window cannot be proven elapsed, so honesty holds the lower phase (edge case beyond the plan text, resolved per D-13 window semantics).
- NY unavailable branch replaces the reason wholesale and runs last in gate order — the prior phase is preserved but never guessed from the clock alone (plan-specified order made explicit in code).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `AmdOutput` ({ phase, reason, inputs }) is ready for Phase 9 selectors and section-3 verbatim prose rendering
- Full suite green at 249 tests; phase-wide purity gate clean (no clock reads in asia/judas/amd modules or tests)

## Self-Check: PASSED

---
*Phase: 08-amd-sessions-asia-range-judas*
*Completed: 2026-09-07*
