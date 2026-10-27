---
phase: 20-1-live-chart-overlay
plan: '01'
subsystem: liquidity-pools
tags: [pools, chart-overlay, report-section, lightweight-charts, vitest]

# Dependency graph
requires:
  - phase: 19-pools-math
    provides: selectPools selector contract plus evaluatePools rank ordering plus computeATR
provides:
  - Live §1 rank-1 Pain Threshold sentence with inline hedge
  - Thin single-BSL pool pair on the NQ chart with remove-then-create cycle
  - pool-prose and pool-overlay mapper modules with toBe test pins
affects: [20-02 chart expansion, 20-03 section 1 completion]

# Actuals (#2632) — pairs with the plan's estimate to calibrate future estimates.
actuals:
  tokens: 19500
  tasks: 3
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Stable selector-function subscription with derivation during render (selectPools precedent)

key-files:
  created:
    - src/lib/pool-prose.ts
    - src/lib/pool-prose.test.ts
    - src/lib/pool-overlay.ts
    - src/lib/pool-overlay.test.ts
  modified:
    - src/lib/report.ts
    - src/lib/report.test.ts
    - components/dashboard/report.tsx
    - src/lib/pool-overlay.test.ts
    - components/dashboard/terminal-shell.tsx
    - components/charts/nq-chart.tsx

key-decisions:
  - "rankDistAtr derives ATR from the same nq candles via computeATR import (wiring, not new math) — scorer consistency without a selectPools signature change"
  - "Task 3 produced no separate commit: all pins were authored inside Task 1/2 commits, verification runs only"

patterns-established:
  - "Pool prose/overlay mappers live in src/lib (outside ict) consuming selector output read-only"
  - "Chart pool refs follow the Asia remove-then-create cycle with pool refs declared beside ticket refs"

requirements-completed: [S1-01, CHRT-01]

# Coverage metadata (#1602) — one entry per shipped deliverable.
coverage:
  - id: D1
    description: "Live §1 rank-1 Pain Threshold sentence with side, zone bounds, ATR distance, swept status, and inline hedge"
    requirement: "S1-01"
    verification:
      - kind: unit
        ref: "src/lib/pool-prose.test.ts#formats the rank-1 sentence"
        status: pass
      - kind: unit
        ref: "src/lib/report.test.ts#holds exactly 6 entries with indexes 1 through 6 live"
        status: pass
    human_judgment: false
  - id: D2
    description: "Thin single-BSL price-line pair on the NQ chart with BSL-1-top/bottom titles, dashed style, ticket-on-top order"
    requirement: "CHRT-01"
    verification:
      - kind: unit
        ref: "src/lib/pool-overlay.test.ts#maps the first BSL ACTIVE pool to a top/bottom pair"
        status: pass
      - kind: unit
        ref: "src/lib/chart-mapper.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Honest-state skeleton on null envelope and Məlumat yoxdur on null selector in §1"
    requirement: "S1-01"
    verification:
      - kind: unit
        ref: "npm test (470 passed) + npx tsc --noEmit clean"
        status: pass
    human_judgment: true
    rationale: "Skeleton and empty-copy JSX branches render only in the browser; no component rendering in vitest (src-only include). Visual confirmation needs a human or UAT pass."

# Metrics
duration: 50min
completed: 2026-10-27
status: complete
---

# Phase 20 Plan 01: Tracer Slice Summary

**Live §1 rank-1 Pain Threshold sentence plus one BSL price-line pair on the chart, with unit pins green.**

## Performance

- **Duration:** 50 min
- **Started:** 2026-10-27T07:51:09Z
- **Completed:** 2026-10-27T08:40:40Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- REPORT_SECTIONS index 1 flipped to live; §1 renders the rank-1 sentence with inline hedge before the generic unavailable branch
- One BSL ACTIVE pair (BSL-1-top/BSL-1-bottom, dashed width 1, terminal-up full) renders via remove-then-create before ticket EXECUTE legs
- pool-prose and pool-overlay mappers ship with toBe pins; store plus purity regression green; full suite 470/470 green; tsc clean

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end rank-1 Pain Threshold sentence live** - `348f71f` (feat)
2. **Task 2: Thin single-BSL chart pair end to end** - `1ff2ff8` (feat)
3. **Task 3: Tracer pins plus selector regression gate** - verification only, no new commit (all pins authored inside Task 1/2 commits; full suite re-run green at plan exit)

**Plan metadata:** committed below (docs: complete plan)

_Note: Task 3 produced no production or test diff — its pin extensions were already in place from Tasks 1–2; the gate contribution is the store/purity/full-suite green runs logged here._

## Files Created/Modified
- `src/lib/pool-prose.ts` - Rank-1 sentence formatter (rank1Of, distAtrOf, rankDistAtr, formatRank1Sentence, hedge/label/copy constants)
- `src/lib/pool-prose.test.ts` - Sentence shape pins (hedge fragment, labels, SWEPT, guards)
- `src/lib/pool-overlay.ts` - Thin single-BSL pair mapper (PoolLineInput, poolPriceLines)
- `src/lib/pool-overlay.test.ts` - Pair title/style/width/guard pins
- `src/lib/report.ts` - REPORT_SECTIONS index 1 flipped unavailable to live
- `src/lib/report.test.ts` - Live-index pins extended 2-6 to 1-6 plus §1 title lock
- `components/dashboard/report.tsx` - Section 1 live branch (skeleton, stale chain, rank-1 sentence, muted SWEPT)
- `components/dashboard/terminal-shell.tsx` - selectPools subscription plus pools/poolsThin derivation into NqChart
- `components/charts/nq-chart.tsx` - pools/poolsThin props, pool ref registry, mount plus update remove-then-create, hidden pool-lines span

## Decisions Made
- ATR for the rank-1 distance derives from the same `nq.candles` via the existing `computeATR` import inside `pool-prose.ts` (wiring reuse, not new ict math) — the plan left the ATR source open and a `selectPools` signature change was forbidden by D-18/D-19, so scorer consistency is kept by sharing the source candles and the ATR function rather than the scorer's internal value. `selectRegime` was rejected as the source (different candle set).
- The `Agri Həddi` label renders as an `h4` mirroring the s3 sub-block idiom per UI-SPEC; the sentence numerals render in `font-mono tabular-nums` spans via a split-map so the whole sentence stays one `p` element.
- The chart `hasPoolLines` presence flag calls `poolPriceLines` with a constant color resolver (no DOM read) so render stays pure; actual tone resolution happens in the mount/update effects via `readVar`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] ATR source unspecified — resolved via computeATR reuse**
- **Found during:** Task 1 (pool-prose creation)
- **Issue:** Plan specified `distAtrOf(pool, lastClose, atr)` but named no ATR supplier; `selectRegime` uses a different candle set than `selectPools`
- **Fix:** `rankDistAtr(pool, candles)` helper importing the existing `computeATR`; `report.tsx` passes `nq.candles` from the store. No `src/lib/ict` changes, no selector signature change
- **Files modified:** src/lib/pool-prose.ts, components/dashboard/report.tsx
- **Verification:** `rankDistAtr derives distance from the given candles via computeATR` passes; full suite green
- **Committed in:** 348f71f (Task 1 commit)

**2. [Rule 2 - Missing Critical] Test candle count below computeATR minimum window**
- **Found during:** Task 1 (test run)
- **Issue:** Initial 3-row fixture returned empty ATR series (needs period 14 + 1 closed candles)
- **Fix:** 16-row generated fixture; empty-input null case retained
- **Files modified:** src/lib/pool-prose.test.ts
- **Verification:** All 7 pool-prose tests pass
- **Committed in:** 348f71f (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 missing critical)
**Impact on plan:** Both auto-fixes fill plan-level gaps without scope creep; no architectural change, no new dependencies.

## Issues Encountered
None — prose, overlay, and regression gates all passed on first full runs after the two deviation fixes above.

## Self-Check: PASSED

- Key files exist on disk: `src/lib/pool-prose.ts`, `src/lib/pool-overlay.ts` verified with `[ -f ]`
- Evaluation scope for plan 20-01 returns 2 commits on this branch (`1ff2ff8`, `348f71f`)
- All `<acceptance_criteria>` re-verified: REPORT_SECTIONS 1-6 live (report.test), rank-1 sentence shape with hedge (pool-prose.test), BSL pair titles/style/width/guards (pool-overlay.test), chart-mapper green
- Plan `<verification>`: prose plus overlay tests green on every commit; store plus purity regression green; full `npm test` green (470/470, 42 files); `npx tsc --noEmit` clean
- No `## Self-Check: FAILED` marker anywhere in this file

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Ready for 20-02 (chart expansion: full capped pool overlay with ghosts and dimming) — thin pair precedent plus ref registry in place
- Ready for 20-03 (section 1 completion: full honest-state matrix) — §1 live branch plus sentence formatter in place
- No blockers or concerns

---
*Phase: 20-1-live-chart-overlay*
*Completed: 2026-10-27*
