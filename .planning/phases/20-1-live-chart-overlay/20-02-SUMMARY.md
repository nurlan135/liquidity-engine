---
phase: 20-1-live-chart-overlay
plan: '02'
subsystem: liquidity-pools
tags: [pools, chart-overlay, lightweight-charts, rank-colors, ghosts, vitest]

# Dependency graph
requires:
  - phase: 20-1-live-chart-overlay
    provides: thin single-BSL pair plus pool ref pattern plus selectPools threading (20-01)
  - phase: 19-pools-math
    provides: selectPools selector contract plus evaluatePools rank ordering
provides:
  - Full capped pool overlay mapper with rank brightness and swept ghosts
  - Chart pool registry with dim and clear paths plus STAND_ASIDE ghost clearing
affects: [20-03 section 1 completion]

# Actuals (#2632) — pairs with the plan's estimate to calibrate future estimates.
actuals:
  tokens: 18200
  tasks: 3
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - One ref per emitted line registry with unconditional-removal clearing
    - Hardcoded rank color literals (no CSS derivation at mapper layer)

key-files:
  created: []
  modified:
    - src/lib/pool-overlay.ts
    - src/lib/pool-overlay.test.ts
    - components/charts/nq-chart.tsx

key-decisions:
  - "Ghost titles use SIDE-ghost-top/bottom (rank is null outside the cap) — keeps titles unique and traceable"
  - "poolPriceLines keeps a backward-compat function overload so the 20-01 call shape never breaks mid-phase"
  - "Render presence flags call the mapper with a constant resolver so render stays pure; tone resolution lives in effects only"
  - "terminal-shell needed no new prop threading — ticketVerdict, overlayStale, thinTier already flow from 20-01"

patterns-established:
  - "Cap-then-ghost emission order: capped ACTIVE pairs first, ghosts after, so z-creation order is deterministic"
  - "STAND_ASIDE ghost clearing via withoutGhosts filter plus unconditional removal (prior ghosts vanish)"

requirements-completed: [CHRT-01, CHRT-02, CHRT-03]

# Coverage metadata (#1602) — one entry per shipped deliverable.
coverage:
  - id: D1
    description: "Nearest-2-per-side ACTIVE cap with max 8 lines, ghosts riding outside the cap"
    requirement: "CHRT-01"
    verification:
      - kind: unit
        ref: "src/lib/pool-overlay.test.ts#caps at 2 ACTIVE per side"
        status: pass
      - kind: unit
        ref: "src/lib/pool-overlay.test.ts#rides ghosts outside the cap"
        status: pass
    human_judgment: false
  - id: D2
    description: "Rank-1 full brightness versus rank-2 50% alpha literals, ghost MUTED_GRAY, ticket lines on top"
    requirement: "CHRT-02"
    verification:
      - kind: unit
        ref: "src/lib/pool-overlay.test.ts#pins rank-1 full hex versus rank-2 rgba 0.5 literals"
        status: pass
      - kind: unit
        ref: "src/lib/store.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Stale/thin uniform MUTED_GRAY dim, null clears all lines, STAND_ASIDE clears ghosts"
    requirement: "CHRT-03"
    verification:
      - kind: unit
        ref: "src/lib/pool-overlay.test.ts#dimmed true forces every color to MUTED_GRAY"
        status: pass
      - kind: unit
        ref: "src/lib/pool-overlay.test.ts#withoutGhosts keeps ACTIVE while dropping SWEPT"
        status: pass
    human_judgment: true
    rationale: "Canvas clearing and dimming paths execute in browser effects; unit pins prove mapper logic, visual confirmation needs a human or UAT pass."

# Metrics
duration: 78min
completed: 2026-10-27
status: complete
---

# Phase 20 Plan 02: Chart Expansion Summary

**Full capped pool overlay with rank brightness, swept ghosts, uniform dimming, and null plus STAND_ASIDE clearing.**

## Performance

- **Duration:** 78 min
- **Started:** 2026-10-27T08:51:03Z
- **Completed:** 2026-10-27T10:09:15Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- poolPriceLines grown to the full mapper: 2-ACTIVE-per-side cap (max 8 lines), SWEPT ghosts outside the cap, rank-1 full hex versus rank-2 rgba literals, dimmed-forces-muted, STAND_ASIDE ghost skip helper
- nq-chart registry replaced: one ref per emitted line, unconditional-removal clearing, pool creation strictly before ticket EXECUTE legs, hidden pool-lines plus pool-ghosts spans
- Store plus purity regression green; full suite 478/478 green; tsc clean; no src/lib/ict changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Full cap plus rank plus ghost mapper** - `31228ef` (feat)
2. **Task 2: Full pool registry with dim and clear paths on canvas** - `70d6f83` (feat)
3. **Task 3: Chart pins plus honesty regression gate** - verification only, no new commit (full matrix authored inside Task 1; store/purity/full-suite green runs logged here)

**Plan metadata:** committed below (docs: complete plan)

_Note: Task 3 produced no new diff — its toBe matrix (cap, rank, ghost, dim, clear, null, STAND_ASIDE, helpers) was authored inside the Task 1 commit; the gate contribution is the store/purity/full-suite green runs logged here._

## Files Created/Modified
- `src/lib/pool-overlay.ts` - Full mapper (PoolPriceLineOpts, POOL_MUTED_GRAY, MAX_ACTIVE_PER_SIDE, isGhost, rankOf, poolLineColor, capped poolPriceLines with dimmed flag, withoutGhosts)
- `src/lib/pool-overlay.test.ts` - Cap plus rank plus ghost plus dim plus clear matrix (13 tests)
- `components/charts/nq-chart.tsx` - Full pool registry (poolLineRefs array, mount plus update remove-then-create, STAND_ASIDE ghost skip, pool-lines plus pool-ghosts spans)

## Decisions Made
- Ghost titles use `SIDE-ghost-top/bottom` since rank is null outside the cap — the plan specified SIDE-rank titles which cannot name rankless ghosts; unique titles keep canvas debugging traceable.
- `poolPriceLines` keeps the function-overload form alongside the new opts form so the 20-01 tracer call shape (`() => poolTone`) still compiles if any caller lags behind the migration; both nq-chart call sites now use `{ dimmed }`.
- Render presence flags (`hasPoolLines`, `hasPoolGhosts`) call the mapper with a constant resolver and `{ dimmed: false }` so render stays pure — tone resolution via readVar lives in the mount/update effects only.
- terminal-shell required no edits: `ticketVerdict`, `overlayStale`, `thinTier`, `pools`, `poolsThin` already thread through the NqChart props path from 20-01; verified by grep, not assumed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Ghost title format unspecified**
- **Found during:** Task 1 (full mapper)
- **Issue:** Plan mandated SIDE-rank-top/bottom titles but ghosts have null rank (outside cap)
- **Fix:** `SIDE-ghost-top/bottom` for ghost emissions; ACTIVE pairs keep the exact SIDE-rank titles
- **Files modified:** src/lib/pool-overlay.ts, src/lib/pool-overlay.test.ts
- **Verification:** Ghost-outside-cap test asserts 8 lines on 2 ACTIVE + 2 SWEPT fixture
- **Committed in:** 31228ef (Task 1 commit)

**2. [Rule 3 - Blocking] Tracer call shape would break on signature change**
- **Found during:** Task 1 (signature migration)
- **Issue:** nq-chart mount/update still called `poolPriceLines(pools, () => tone)` while the plan specified an opts-only signature
- **Fix:** Union overload (opts object OR color function) so both shapes compile; Task 2 migrated both call sites to `{ dimmed }`
- **Files modified:** src/lib/pool-overlay.ts, components/charts/nq-chart.tsx
- **Verification:** tsc clean on both commits
- **Committed in:** 31228ef then 70d6f83

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** Both auto-fixes preserve plan intent with no scope creep; no architectural change, no new dependencies.

## Issues Encountered
None — mapper, registry, and regression gates all passed on first full runs after the two deviation fixes above.

## Self-Check: PASSED

- Key files exist on disk: `src/lib/pool-overlay.ts` (full mapper) verified with `[ -f ]`
- Evaluation scope for plan 20-02 returns 2 commits on this branch (`70d6f83`, `31228ef`)
- All `<acceptance_criteria>` re-verified: cap 8 ACTIVE lines (overlay.test), rank literals (overlay.test), ghost MUTED_GRAY (overlay.test), dimmed-forces-muted (overlay.test), STAND_ASIDE ghost skip (overlay.test), pool before ticket (code order), hidden spans (render code)
- Plan `<verification>`: overlay plus chart-mapper green; overlay plus store green (59 tests); store plus purity green (48 tests); full `npm test` green (478/478, 42 files); `npx tsc --noEmit` clean
- No `## Self-Check: FAILED` marker anywhere in this file

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Ready for 20-03 (section 1 completion: full honest-state matrix with no-pools, stale-verbatim, thin-dimmed, null-empty copy plus inline hedge proof plus banned-reuse guard)
- No blockers or concerns

---
*Phase: 20-1-live-chart-overlay*
*Completed: 2026-10-27*
