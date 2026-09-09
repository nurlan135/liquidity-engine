---
phase: 13-thin-history-honesty
plan: 02
subsystem: ui
tags: [thin-history, canvas-dimming, zone-primitive, lightweight-charts, vitest]
requires:
  - phase: 13-thin-history-honesty
    plan: 01
    provides: thinTier prop plumbing, propsRef sync, data-thin-tier container attribute
provides:
  - Live opacity read from the primitive field on every zone draw
  - Single-branch thin dimming of zones plus level lines with marker and Asia paths untouched
affects: [verify-work D-08 human glance, 13-VALIDATION manual-only rows]
tech-stack:
  added: []
  patterns: [scale-getter callback for canvas primitive live reads, single dimmed boolean driving zone opacity plus level-line color, tier-derivation try/catch with full-strength fallback]
key-files:
  created: []
  modified: [components/charts/zone-primitive.ts, components/charts/nq-chart.tsx, src/lib/zone-bands.test.ts]
key-decisions:
  - "Opacity flows as a () => number getter from primitive through view into renderer, never as a stored number"
  - "One dimmed boolean per effect scope; zone uses stale-or-dimmed 0.5, level lines use dimmed-ternary MUTED_GRAY"
  - "Zone-refresh block re-derives the tier in its own try/catch because it sits outside the async recolor closure"
patterns-established:
  - "Canvas primitive live-read: pass a getter closure over the mutable field, read at draw time"
  - "Thin-derivation degrade-silent: try/catch around the tier check, false on failure, full-strength chart"
requirements-completed: [HIST-01]
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
  plan_head_before: 10ea3eb156432c0e5e7dfc7bc12b1444133d8f8d
coverage:
  - id: D1
    description: "Zone draw reads the live primitive opacityScale on every call; post-attach mutation to 0.5 yields alpha 0.5, default draws full strength, restore to 1 needs no re-attach"
    requirement: "HIST-01"
    verification:
      - kind: unit
        ref: "npm test -- --run src/lib/zone-bands.test.ts (6 tests: 3 pre-existing bands geometry plus 3 new live-read)"
        status: pass
      - kind: unit
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: false
  - id: D2
    description: "Zones mute to half strength on both thin tiers through one identical muted treatment; stale plus thin never compound"
    requirement: "HIST-01"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit"
        status: pass
      - kind: unit
        ref: "npm test (30 files, 296 tests)"
        status: pass
      - kind: unit
        ref: "npm run build (Compiled successfully, static pages generated)"
        status: pass
    human_judgment: true
    rationale: "Canvas pixel dimming cannot be asserted in the node vitest env; the D-08 human glance at 5/25/40 closed candles stays open for verify-work"
  - id: D3
    description: "EQ, DOL, Q1, Q3, OTE-B, OTE-S lines mute to MUTED_GRAY on both thin tiers with widths, styles, and titles unchanged; Asia, Judas, SMT, candles, wicks hold full strength on every tier"
    requirement: "HIST-01"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit"
        status: pass
      - kind: unit
        ref: "npm test (30 files, 296 tests)"
        status: pass
      - kind: unit
        ref: "npm run build (Compiled successfully, static pages generated)"
        status: pass
    human_judgment: true
    rationale: "Line-color selection is typechecked and follows the stale-tone precedent, but confirming muted titles beside full-strength marks needs the running chart (D-08)"
  - id: D4
    description: "Full tier renders byte-identical to today; no viewport, time-scale, or scroll calls added"
    requirement: "HIST-01"
    verification:
      - kind: unit
        ref: "grep fitContent|setVisibleLogicalRange|setVisibleRange|scrollToPosition in nq-chart.tsx returns zero matches"
        status: pass
    human_judgment: true
    rationale: "Byte-identity of the full tier is a visual claim; the 40-candle glance in the D-08 protocol covers it"
  - id: D5
    description: "Dimmed zones read as provisional while Judas and SMT markers hold full strength on held-out visual verification"
    requirement: "HIST-01"
    verification: []
    human_judgment: true
    rationale: "Backstop truth per plan — held-out visual verification, no explicit evidence at authoring time; headless executor, glance marked pending below"
duration: 60min
completed: 2026-09-09
status: complete
---

# Phase 13 Plan 02: Canvas Half Summary

**Live zone opacity plus uniform provisional dimming on thin tiers, with markers, Asia, and candles at full strength**

## Performance

- **Duration:** 60 min
- **Started:** 2026-09-09T12:55:00Z
- **Completed:** 2026-09-09T13:55:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `components/charts/zone-primitive.ts`: numeric snapshot threading replaced with a `ZoneOpacityScaleGetter` (`() => number`) from `ZoneFillPrimitive` constructor path through `ZoneFillView` into `ZoneFillRenderer`; `draw` reads the live scale each call; `attached` constructs the view with a closure over `this.opacityScale`. Constructor default stays 1, `updateBands`/`requestUpdate` unchanged, `AUTOSCALE` null-return and `buildZoneOverlayFallback` byte-identical and untouched.
- `src/lib/zone-bands.test.ts`: three live-read assertions beside the existing zone geometry coverage — default draw applies no `globalAlpha` override, post-attach mutation to 0.5 captures alpha 0.5, restore to 1 draws full strength without re-attach. Stub bitmap scope drives `ZoneFillRenderer.draw` with no DOM and no chart-library access at module top.
- `components/charts/nq-chart.tsx`: one `dimmed` boolean (`thinTier !== 'full'`, try/catch-guarded with full-strength fallback) in both the mount effect and the update effect; zone opacity `stale || dimmed ? 0.5 : 1` in both scopes so stale plus thin never compound; EQ/DOL/Q1/Q3/OTE-B/OTE-S creation sites select `MUTED_GRAY #71717A` when dimmed with widths, styles, and titles byte-identical. Asia branches still select only the `overlayStale` tone, marker builder still takes only `overlayStale`, candle/wick options untouched, zero viewport/time-scale/scroll calls.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix the zone-primitive opacity snapshot so the field reads live** - `242f93b` (fix)
2. **Task 2: Dim zones plus level lines on thin tiers with one muted branch** - `c915f46` (feat)

## Files Created/Modified

- `components/charts/zone-primitive.ts` - scale-getter threading with draw-time live read and live closure at attach
- `src/lib/zone-bands.test.ts` - alpha-mutation coverage (default full, 0.5 after mutation, restore to 1)
- `components/charts/nq-chart.tsx` - single dimmed boolean per effect driving zone opacity plus six level-line colors

## Decisions Made

- The live-read shape is a `() => number` getter rather than a primitive reference: narrower surface, no renderer-to-primitive coupling, matches the existing `ZoneBandsGetter` convention already threaded through the same constructors.
- The zone-refresh block re-derives `dimmed` in its own `refreshDimmed` try/catch instead of reusing the async closure's variable: the refresh runs synchronously outside the recolor closure, so sharing the binding would be scope confusion.
- The tier check is `thinTier !== undefined && thinTier !== 'full'` rather than bare `!== 'full'`: defensive against an explicitly undefined prop at runtime even though the destructured default is `'full'`.

## Deviations from Plan

None - plan executed exactly as written. Two environment notes (not code deviations):

1. **Worktree base predated the Plan 01 merge.** The worktree spawned at `232f2e7` while Plan 01 merged as `10ea3eb` on main. Rebasing the worktree onto main before starting was required setup, not a plan change; no conflicts, Plan 01 files (`src/lib/thin-tier.ts`, banner block, `thinTier` prop) present before Task 1.
2. **Worktree `node_modules` was absent, so `npm run build` initially failed** with `Could not find the Next.js package (next/package.json)` — an environment gap, not a code regression. Typecheck and tests passed throughout via the main checkout's binaries; after `npm ci` completed in the worktree, `npm run build` passed locally (`Compiled successfully`, static pages generated). No package installs beyond the lockfile (`npm ci`, zero new dependencies; T-13-SC holds).

## Issues Encountered

- `tsc` flagged `Object is possibly 'null'` on `paneViews()[0].renderer()` in the new tests: the v5 `renderer()` return is nullable, so the three draw call sites use the non-null assertion (`!`). Resolved inline, part of the Task 1 commit. Typecheck green after.
- `git stash` / `git stash pop` was used once mid-task to isolate a baseline build diagnosis; the pop restored Task 2 edits intact (verified via `grep dimmed` count before committing). No work lost. Noting here because the workflow discourages stash in worktree context — used once for read-only diagnosis, not for moving WIP.

## Threat Flags

None. Opacity scale flows from the primitive's own numeric field into `globalAlpha` around the two zone fills only — no string-to-style interpolation, `buildZoneOverlayFallback` untouched (T-13-03 mitigated). Dim branches change only color and opacity values inside existing `createPriceLine` and zone-refresh calls with no new loops, listeners, or observers (T-13-04 accepted). No package installs beyond the lockfile (T-13-SC accepted).

## Human Glance (D-08) — PENDING, honestly reported

The dev-glance visual protocol at 5/25/40 closed candles was **not performed**: this executor is headless with no browser, and `npm run dev` was never started. Per the plan instruction to report honestly, the glance is marked **pending** and carries to verify-work:

- At 5 closed candles: Tier-1 banner over muted zone fills, EQ/DOL/Q1/Q3/OTE-B/OTE-S titles in muted gray, candles plus Asia-H/Asia-L plus J/J?/S marks full strength, clean console.
- At 25: identical dimming under the Tier-2 banner.
- At 40: no banner, full strength byte-identical to today; MARKET CLOSED ribbon coexistence; zero console errors across all three seeds.

## Known Stubs

None. No placeholder text, TODO markers, or unwired data sources introduced; all dimming branches read the live `thinTier` prop.

## Next Phase Readiness

- Canvas half complete: typecheck, full suite (30 files / 296 tests), and production build all green.
- The D-08 human glance (honest look plus clean console at 5/25/40 candles, narrow-width banner wrap) stays open for verify-work — the only unverified acceptance item.
- No follow-up code work anticipated; verify-work can proceed directly to the visual protocol.

## Self-Check: PASSED

- All 3 plan files exist on disk (`components/charts/zone-primitive.ts`, `components/charts/nq-chart.tsx`, `src/lib/zone-bands.test.ts`).
- Both task commits present in history (`242f93b`, `c915f46`) on top of the Plan 01 merge base (`10ea3eb`).
- Canvas diff scoped to the plan: `git diff --name-only` over the plan range lists exactly `zone-primitive.ts`, `nq-chart.tsx`, plus the adjacent `zone-bands.test.ts` coverage file.
- No unexpected file deletions; Asia/marker/candle/viewport paths verified untouched by grep; STATE.md and ROADMAP.md untouched.
