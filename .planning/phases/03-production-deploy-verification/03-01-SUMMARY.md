---
phase: 03-production-deploy-verification
plan: 01
subsystem: infra
tags: [vercel, deploy-verification, curl, serve-stale, drill, nextjs]

# Dependency graph
requires:
  - phase: 02-terminal-composition
    provides: live proxy envelope plus status-strip states the script and drill assert
provides:
  - scripts/verify-deploy.sh re-runnable live-URL checklist (WARMUP, HEADERS, ENVELOPE, PAGE)
  - Temporary DRILL_FORCE_STALE server-only kill-switch proven in isolation
  - Local production proof: all five checks PASS against next start on :3100
affects: [03-02-branch-rename, 03-03-vercel-preview-drill, 03-04-prod-gate]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 9500
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [zero-dependency curl+node check script, server-only env kill-switch with finally-restore isolation]

key-files:
  created: [scripts/verify-deploy.sh, src/lib/yahoo-drill.test.ts]
  modified: [src/lib/yahoo.ts, components/charts/nq-chart.tsx, components/charts/zone-primitive.ts, src/lib/ict/levels.test.ts]

key-decisions:
  - "Drill flag placed before the CACHE_KEY lookup reading the warm entry directly, so warm+flag serves stale and cold+flag throws without fabricating candles"
  - "Pre-existing lint errors and missing worktree node_modules fixed inline as Rule 1/Rule 3 blockers to reach the plan's green gates"

patterns-established:
  - "Verify scripts use curl plus node one-liners only, exit 2 on bad usage, exit 1 on first FAIL"
  - "Temporary flags are server-only reads with neutral messages and finally-block test isolation"

requirements-completed: [DEPLOY-01]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Re-runnable live-URL checklist script with WARMUP, HEADERS, ENVELOPE, ENVELOPE-AGE, PAGE checks"
    requirement: "DEPLOY-01"
    verification:
      - kind: other
        ref: "bash scripts/verify-deploy.sh http://localhost:3100 (five PASS lines, exit 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Temporary DRILL_FORCE_STALE kill-switch forcing the serve-stale outcome in isolation"
    requirement: "DEPLOY-01"
    verification:
      - kind: unit
        ref: "src/lib/yahoo-drill.test.ts (warm-stale, cold-throw, flag-unset cases)"
        status: pass
    human_judgment: false

# Metrics
duration: 32min
completed: 2026-09-06
status: complete
---

# Phase 03 Plan 01: Deploy-Verification Tracer Summary

**Zero-dependency live-URL checklist plus temporary serve-stale kill-switch, both proven — script passes five checks against a local production build, drill flag proven under unit test.**

## Performance

- **Duration:** 32 min
- **Started:** 2026-09-06T07:15:00Z
- **Completed:** 2026-09-06T07:47:08Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Pre-deploy gates green on a clean tree: lint exits 0, 106/106 tests pass across 19 files, production build succeeds
- scripts/verify-deploy.sh (executable, curl+node only) implements WARMUP, HEADERS, ENVELOPE, PAGE in order with fail-closed BAD-ENVELOPE and ENVELOPE-AGE paths
- Script passes end-to-end against local production build: five PASS lines, live Yahoo data (126 candles, age 5s, source cache)
- Temporary DRILL_FORCE_STALE server-only read in fetchNQDaily: warm+flag serves stale candles, cold+flag throws retryable, unset restores the normal path

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer: gates plus verify script plus local production proof** - `61cb36f` (feat)
2. **Task 2: Temporary drill kill-switch plus isolated unit proof** - `41de201` (feat)

**Supporting commit:** `f954329` (fix: clear lint gate blockers for deploy verification)

**Plan metadata:** pending orchestrator commit (docs: complete plan)

## Files Created/Modified

- `scripts/verify-deploy.sh` - Re-runnable live-URL checklist: BASE_URL arg, trailing-slash strip, usage exit 2, five ordered checks with PASS/SKIP/FAIL lines
- `src/lib/yahoo-drill.test.ts` - Temporary drill proof: warm-stale, cold-throw, flag-unset cases with finally-block env restore (deleted in plan 03-04)
- `src/lib/yahoo.ts` - Temporary DRILL_FORCE_STALE read before CACHE_KEY lookup (deleted in plan 03-04)
- `components/charts/nq-chart.tsx` - propsRef sync moved into useEffect (lint gate blocker fix)
- `components/charts/zone-primitive.ts` - Dropped unused autoscaleInfo params and Logical import (lint gate blocker fix)
- `src/lib/ict/levels.test.ts` - Dropped unused checkReanchor import (lint gate blocker fix)

## Decisions Made

- Drill flag reads the warm cache entry directly at the top of fetchNQDaily instead of throwing into the task closure: a bare pre-lookup throw could never reach the warm-cache stale branch inside the closure (it precedes it), so direct consultation preserves the plan's warm-stale/cold-throw behavior contract and MAX_STALE_MS semantics.
- Lint gate blockers (1 error + 3 warnings in Phase 2 files) and missing worktree node_modules (installed with the project's sanctioned --legacy-peer-deps flag) fixed inline as deviation Rules 1/3 rather than stalling the tracer.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed react-hooks/refs render-phase error plus three unused-var warnings blocking the lint gate**
- **Found during:** Task 1 (pre-deploy gate, before writing anything)
- **Issue:** `npm run lint` failed with 1 error (propsRef.current assigned during render in nq-chart.tsx) and 3 warnings (unused _start/_end in zone-primitive.ts, unused checkReanchor import in levels.test.ts); plan requires zero warnings
- **Fix:** Moved propsRef sync into a no-deps useEffect; reduced autoscaleInfo to a zero-param implementation and removed the Logical import; removed the unused import
- **Files modified:** components/charts/nq-chart.tsx, components/charts/zone-primitive.ts, src/lib/ict/levels.test.ts
- **Verification:** `npm run lint` exits 0 with no output
- **Committed in:** f954329 (supporting commit before tracer work)

**2. [Rule 3 - Blocking] Installed missing worktree dependencies with sanctioned flag**
- **Found during:** Task 1 (test gate; `npx vitest` fell back to a remote fetch and failed on ESM config load)
- **Issue:** Worktree had no node_modules; plain `npm install` fails on the known types-only @types/node peer conflict
- **Fix:** `npm install --legacy-peer-deps` per STATE.md project history (lockfile-pinned deps only, no new packages)
- **Files modified:** none tracked (node_modules is gitignored)
- **Verification:** `npm test` 106/106 pass across 19 files
- **Committed in:** n/a (no tracked file changes)

**3. [Rule 1 - Bug] Drill flag placement corrected to satisfy the warm-stale behavior contract**
- **Found during:** Task 2 (behavior review before writing tests)
- **Issue:** Throwing retryable UpstreamError before the cache lookup can never reach the warm-cache stale branch inside the task closure — warm+flag would serve `cache` source with stale false instead of the specified `stale` source with stale true, and cold+flag would throw before any staleness semantics apply
- **Fix:** Flag block consults the warm entry directly with identical MAX_STALE_MS semantics (serve stale copy) and throws retryable UpstreamError only on cold cache
- **Files modified:** src/lib/yahoo.ts
- **Verification:** `npm run test -- drill` 3/3 pass, including preserved-candles and no-fetch assertions
- **Committed in:** 41de201 (part of task commit)

---

**Total deviations:** 3 auto-fixed (2 correctness bugs, 1 blocking)
**Impact on plan:** All auto-fixes necessary for gates and behavior contracts. No scope creep; no architectural changes.

## Issues Encountered

- Lingering `next start` server on :3100 survived pkill patterns; killed by PID via taskkill after resolving the listener with netstat. Port confirmed free (000) before committing.
- `git update-index --chmod=+x` on the untracked script failed with "missing --add option"; retried with `--add --chmod=+x` — committed as mode 100755.

## Threat Flags

None - no new security surface beyond the plan's threat register. Drill flag is server-only (negated NEXT_PUBLIC_ grep passes), message neutral, deletion scheduled in plan 03-04.

## Known Stubs

None - no stubs introduced. Script asserts strictly against live shape; drill test uses the established mock pattern.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Verify script is trusted for preview (plan 03-03) and prod-gate (plan 03-04) runs; CDN SKIP branch will exercise for real on Vercel headers.
- DRILL_FORCE_STALE is the exact variable name plan 03-03 sets in the Vercel dashboard; flag plus test file are both removed in plan 03-04 per D-07.
- Blockers: none. Branch rename (plan 03-02) can proceed — gates are green.

## Self-Check: PASSED

All created files found on disk; commits f954329, 61cb36f, 41de201, bc75428 verified in history; no unintended deletions; no untracked leftovers.

---
*Phase: 03-production-deploy-verification*
*Completed: 2026-09-06*
