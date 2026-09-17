---
phase: 20-1-live-chart-overlay
plan: '05'
subsystem: ui
tags: [chart-overlay, pools, verdict-gate, vitest, nextjs]

# Dependency graph
requires:
  - phase: 19-pools-math
    provides: evaluatePools rank-ordered selector return with ACTIVE/SWEPT lifecycle
  - phase: 20-1-live-chart-overlay (20-01..20-04)
    provides: live §1 branch, nearest-2-per-side shell fan-out, rank-1 reason clause, seeded-leg harness idioms
provides:
  - Verdict-gated pool and ghost creation in both chart effects (STAND_ASIDE creates zero lines)
  - shouldCreatePoolLines predicate with exact-match pins for all verdict inputs
  - Shell stub-prop proof: STAND_ASIDE verdict with pools present while the gate suppresses lines
affects: [Phase 21 parity harness]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 28000
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: [single verdict predicate shared by mount/update effects plus sentinel slot, ES-stale STAND_ASIDE harness with intraday stubs]

key-files:
  created: []
  modified: [components/charts/nq-chart.tsx, src/lib/chart-mapper.ts, src/lib/chart-mapper.test.ts, src/terminal-shell.test.ts]

key-decisions:
  - "Task 1 landed in a prior session (583f4ac) — this session completed Task 2, so the plan closes across two commits"
  - "ES-stale (not null-trigger) drives the STAND_ASIDE harness: null trigger refuses selectTicket to null, while es.stale degrades it to STAND_ASIDE through HARD STALE_LEG without nulling pools"
  - "Harness-local gateSwingCandles/gateSwingEnvelope twins of the 20-03 multi-swing fixture instead of reusing cross-describe helpers"

patterns-established:
  - "Verdict gate proof: NQ healthy plus ES stale plus steady intraday stubs yields wire verdict STAND_ASIDE with pools present and predicate false"
  - "D1 fetch shape preserves seeded ES-stale truth while intraday URLs stub steady Asia-window rows so mount refresh cannot overwrite mid-test"

requirements-completed: [CHRT-03]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Verdict-gated pool and ghost creation in mount plus update effects with shared predicate"
    requirement: "CHRT-03"
    verification:
      - kind: unit
        ref: "src/lib/chart-mapper.test.ts#pool creation verdict gate pins STAND_ASIDE false plus EXECUTE/null/undefined true"
        status: pass
      - kind: integration
        ref: "src/terminal-shell.test.ts#stand-aside-clears fans STAND_ASIDE with pools present while the gate suppresses lines"
        status: pass
    human_judgment: false

# Metrics
duration: 25min
completed: 2026-09-17
status: complete
---

# Phase 20 Plan 05: Verdict Gate + STAND_ASIDE Proof Summary

**STAND_ASIDE clears pool and ghost lines in both chart effects through one shared predicate, proven by a stub-prop harness test with pools present on the wire**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-17T05:30:00Z (approx)
- **Completed:** 2026-09-17T06:00:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Mount and update effects create zero pool or ghost lines under STAND_ASIDE while all other verdicts render exactly as before (Task 1, prior commit 583f4ac)
- Predicate pinned for all verdict inputs: STAND_ASIDE false; EXECUTE_LONG/EXECUTE_SHORT/null/undefined true
- Shell harness proves the wire contract: ticketVerdict STAND_ASIDE with non-empty poolBslPairs while shouldCreatePoolLines returns false — zero lines after unconditional removal
- Full suite 473/473 green, types clean, lint clean (one pre-existing unused-var warning on an unrelated line)

## Task Commits

Each task was committed atomically:

1. **Task 1: Verdict gate on pool and ghost creation in both chart effects** - `583f4ac` (feat, prior session)
2. **Task 2: Predicate pins plus STAND_ASIDE stub-prop proof and suite proof** - `f538b30` (test)

**Plan metadata:** pending (docs: complete plan — committed after STATE/ROADMAP updates)

## Files Created/Modified
- `src/lib/chart-mapper.ts` - PoolVerdict type plus shouldCreatePoolLines predicate (Task 1)
- `components/charts/nq-chart.tsx` - both effects consume the single predicate; sentinel slot stays honest (Task 1)
- `src/lib/chart-mapper.test.ts` - exact-match verdict pins (Task 1)
- `src/terminal-shell.test.ts` - stand-aside-clears harness: ES-stale STAND_ASIDE with pools present (Task 2)

## Decisions Made
- ES-stale chosen over the null-trigger path per the selector contract: null trigger refuses selectTicket to null (line 1116), while es.stale degrades it to STAND_ASIDE through HARD STALE_LEG — the only path matching the plan's "pools present + verdict STAND_ASIDE" acceptance
- Harness-local fixture twins (gateSwingCandles/gateSwingEnvelope) over cross-describe helper reuse: the 20-03 helpers live inside a sibling describe closure and are not importable
- One incidental whitespace fix on the null-clears test signature line (collapsed double-space) — no behavior change

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Harness fixture helpers not visible across describe closures**
- **Found during:** Task 2 (first test run — multiSwingCandles is not defined)
- **Issue:** 20-03 multi-swing builders live inside a sibling describe closure, unreachable from the new 20-05 describe block
- **Fix:** Added harness-local gateSwingCandles/gateSwingEnvelope twins with the identical deterministic shape
- **Files modified:** src/terminal-shell.test.ts
- **Verification:** suite green on retry of the focused test
- **Committed in:** f538b30

**2. [Rule 1 - Bug] Null-trigger assumption refused selectTicket to null**
- **Found during:** Task 2 (focused run — expected null not to be null at the ticket assertion)
- **Issue:** The plan's suggested null-intraday path yields selectTicket null (refuse-null on empty legs), not STAND_ASIDE — the acceptance needs a non-null STAND_ASIDE ticket beside non-empty pools
- **Fix:** Re-seeded per the ES-stale path the plan lists as the alternative: NQ healthy, ES stale, intraday stubs steady — ticket degrades to STAND_ASIDE via HARD STALE_LEG while pools resolve
- **Files modified:** src/terminal-shell.test.ts
- **Verification:** focused test green, then mapper+shell suites 45/45, full suite 473/473
- **Committed in:** f538b30

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both confined to the task's own test file and required for the plan's verification gates. No scope creep — no trigger/flaw/ticket derivation touched, no ict math added.

## Issues Encountered
- Mount-refresh race discipline: the D1 fetch shape must preserve seeded ES-stale truth for both D1 legs while intraday URLs stub steady rows — otherwise the mount refresh overwrites the seeded STAND_ASIDE mid-test. Resolved with URL-branched fetch stub (interval= URLs steady, symbol=ES stale, NQ healthy).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Gap 2 (truth #12, CHRT-03/SC4) closed: STAND_ASIDE leaves zero pool/ghost lines on canvas with dimming discipline otherwise unchanged
- Both 20-VERIFICATION gaps now closed (20-04 gap 1 S1-01/S1-03, 20-05 gap 2 CHRT-03) — Phase 20 ready for re-verification
- Held-out human backstops from VERIFICATION (long-text wrap glance, canvas glance) remain for end-of-phase verify-work

## Self-Check: PASSED
- `components/charts/nq-chart.tsx`, `src/lib/chart-mapper.ts`, `src/lib/chart-mapper.test.ts`, `src/terminal-shell.test.ts` all exist on disk
- Commits `583f4ac` and `f538b30` exist in `git log`
- Full suite 473/473 green; tsc clean; eslint clean on touched files (one pre-existing warning elsewhere in the shell suite)

---
*Phase: 20-1-live-chart-overlay*
*Completed: 2026-09-17*
