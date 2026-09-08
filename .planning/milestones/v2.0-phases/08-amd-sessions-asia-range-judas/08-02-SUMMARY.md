---
phase: 08-amd-sessions-asia-range-judas
plan: 02
subsystem: ict
tags: [judas-swing, killzone, sessions, ny-wall-clock, vitest, budget]

# Dependency graph
requires:
  - phase: 08-amd-sessions-asia-range-judas
    provides: [asiaRange AsiaRange high/low/height, NY_TZ wall-clock discipline, closedOnlyIntraday boundary]
provides:
  - Three-gate London Judas detector on 15M NQ plus AsiaRange with candidate/confirmed/preRun vocabulary
  - Seeded 60-session offline budget run printing the BUDGET confirmed= line under the 25 percent cap
affects: [08-03 amd classifier, phase-09 composition]

# Actuals (#2632)
actuals:
  tokens: 19500
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: [first-sweep-wins chronological scan, strict-inequality killzone edges, sweep-plus-next-3 confirmation window, Asia-height displacement denominator, self-registering ESM alias hook for plain-node scripts]

key-files:
  created: [src/lib/ict/judas.ts, src/lib/ict/judas.test.ts, scripts/judas-budget.ts, scripts/resolve-alias.mjs]
  modified: []

key-decisions:
  - "NY_TZ imported from aggregate module, never redefined (D-07)"
  - "First chronological sweep wins; HIGH checked before LOW within a candle"
  - "preRun and candidate mutually exclusive; confirmed implies candidate"
  - "Budget script self-registers the @-alias hook so bare node executes it"

patterns-established:
  - "Killzone membership: per-candle NY wall-clock minutes with strict 120<m<300 inequality"
  - "Gate-3 reversal: in-window close back through the swept extreme with distance >= dispMult * Asia height"
  - "Plain-node script execution: register() the ESM alias hook before dynamic @/ imports"

requirements-completed: [ICT-13]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Three-gate London Judas detector confirming only on the in-killzone sweep plus close-based reversal with Asia-height displacement conjunction"
    requirement: "ICT-13"
    verification:
      - kind: unit
        ref: "src/lib/ict/judas.test.ts (10 tests incl. HIGH/LOW conjunction, pierce-without-reversal, 01:47 preRun, 05:00 edge, fifth-candle bound, forming exclusion, empty, determinism, DISP_MULT pin)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Seeded 60-session budget run printing confirmed share at or under the 25 percent ceiling"
    requirement: "ICT-13"
    verification:
      - kind: other
        ref: "node scripts/judas-budget.ts -> BUDGET confirmed=10/60 (16.7%), exit 0, identical on rerun"
        status: pass
    human_judgment: false

# Metrics
duration: ~50min
completed: 2026-09-07
status: complete
---

# Phase 08 Plan 02: London Judas Detector Summary

**Three-gate London Judas detector (ICT-13) with candidate/confirmed/preRun vocabulary plus a seeded 60-session budget run at 16.7 percent confirmed — full suite 239/239 green**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-09-07T13:30:00Z
- **Completed:** 2026-09-07T14:20:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- New pure module src/lib/ict/judas.ts: judasSwing on 15M rows plus AsiaRange — strict killzone membership, Asia-extreme sweep, close-based reversal with Asia-height displacement inside sweep-plus-next-3, preRun flags, candidate persistence
- New vitest suite src/lib/ict/judas.test.ts: 10 tests passing, purity grep clean
- New dev-script scripts/judas-budget.ts plus scripts/resolve-alias.mjs: seeded mulberry32 60-session offline run, bare `node scripts/judas-budget.ts` prints BUDGET confirmed=10/60 (16.7%), exit 0, deterministic rerun
- Full repo suite green: 27 files, 239 tests, zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Judas three-gate detector with candidate and preRun states** - `6e0b1db` (feat)
2. **Task 2: 60-day Judas budget dev-script with seeded synthesis** - `9f0c538` (feat)

**Plan metadata:** committed below (docs: complete plan)

## Files Created/Modified
- `src/lib/ict/judas.ts` - KILLZONE_START_MIN=120, KILLZONE_END_MIN=300, DISP_MULT=0.5, CONFIRM_WINDOW=4, TOL_EPS, SweepSide, JudasOutput, judasSwing
- `src/lib/ict/judas.test.ts` - 10-test suite: conjunction mirrors, candidate persistence, 01:47 preRun, fifth-candle bound, 05:00 edge, forming exclusion, empty, determinism, constant pin
- `scripts/judas-budget.ts` - seeded 60-session synthesis driving asiaRange plus judasSwing, BUDGET confirmed= line, exit 1 above 25 percent
- `scripts/resolve-alias.mjs` - ESM resolve hook rewriting @/ specifiers to .ts file URLs for plain-node execution

## Decisions Made
- NY_TZ imported from aggregate module per D-07, never redefined
- First chronological sweep wins with HIGH checked before LOW within a single candle
- preRun and candidate mutually exclusive; confirmed implies candidate; displacement-free sweeps persist as candidates
- Budget archetypes by session index mod 10: 0-6 quiet, 7-8 candidate-only, 9 confirmed; seeded jitter capped at 5 percent of Asia height
- Budget script self-registers the alias hook so the plan's bare `node scripts/judas-budget.ts` verify command executes with no flags

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test fixture strip opens misaligned with killzone edges**
- **Found during:** Task 1 verification
- **Issue:** The 01:47 pre-killzone fixture opened at 01:30 (index 1 landed on 01:45), and the window-bound fixture swept at exactly 02:00 (correctly preRun under strict inequality, so candidate was false)
- **Fix:** Open the pre-killzone strip at 01:32 and the window-bound strip at 02:15; module untouched
- **Files modified:** src/lib/ict/judas.test.ts
- **Commit:** 6e0b1db

**2. [Rule 3 - Blocking] No local node_modules in the worktree; bare node cannot resolve @/ specifiers**
- **Found during:** Task 2 execution
- **Issue:** The worktree node_modules holds only .vite; deps resolve from the parent repo. Bare node also cannot load `@/`-aliased TypeScript sources
- **Fix:** Added scripts/resolve-alias.mjs (dependency-free ESM resolve hook) self-registered by the budget script before its dynamic @/ imports; Node 24 strips types natively so no flags needed
- **Files modified:** scripts/resolve-alias.mjs, scripts/judas-budget.ts
- **Commit:** 9f0c538

**3. [Rule 1 - Bug] Naive session-date arithmetic emitted invalid 2026-06-31**
- **Found during:** Task 2 verification
- **Issue:** BASE_DAY + day offset produced June 31+ for days past June 30, emptying the Asia window
- **Fix:** Derive sessionDate from the 20:00 open instant via formatInTimeZone NY calendar date
- **Files modified:** scripts/judas-budget.ts
- **Commit:** 9f0c538

**Total deviations:** 3 auto-fixed
**Impact on plan:** No scope change. All acceptance gates pass: suite green, budget 16.7 percent under cap, no forbidden imports.

## Issues Encountered
- Full-suite parallel run hit vitest worker OOM (environment memory pressure, 5 forks exit 134 with heap exhaustion while 22 files / 179 tests passed); serial rerun with maxWorkers=2 green at 27 files / 239 tests with zero errors
- Stale first-draft hook file (judas-budget-hooks.mjs) removed before commit; final hook is scripts/resolve-alias.mjs

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Ready for 08-03 (AMD classifier fusing AsiaRange plus JudasOutput plus read-only SMT state)
- 08-02 artifacts verified on disk and committed: judas.ts exports KILLZONE_START_MIN, KILLZONE_END_MIN, DISP_MULT, CONFIRM_WINDOW, SweepSide, JudasOutput, judasSwing; budget prints BUDGET confirmed=10/60 (16.7%)

---
*Phase: 08-amd-sessions-asia-range-judas*
*Completed: 2026-09-07*

## Self-Check: PASSED
