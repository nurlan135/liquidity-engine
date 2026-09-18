---
phase: 20-1-live-chart-overlay
plan: '03'
subsystem: ui
tags: [selectPools, chart-overlay, price-lines, lightweight-charts, nearest-2-per-side, swept-ghosts]

# Dependency graph
requires:
  - phase: 19-pools-math
    provides: selectPools refuse-null envelope + rank-ordered LiquidityPool array (458 tests green)
  - phase: 20-1-live-chart-overlay/01
    provides: tracer shell fan-out of rank-1 BSL top/bottom + single BSL chart pair with remove-then-create cycle
  - phase: 20-1-live-chart-overlay/02
    provides: section 1 honest-empty state matrix (report-only, no shell/chart changes)
provides:
  - Nearest-2-per-side ACTIVE pool derivation (first two ACTIVE BSL + first two ACTIVE SSL in selector return order) plus separate swept ghost arrays
  - Full pool price-line pairs with rank brightness, ghost dimming, z-order, stale/thin dimming, and null/STAND_ASIDE clearing
  - poolLineInputs finite guard in chart-mapper with throw-naming tests
affects: [21-calibration, 20-verify]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 15500
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: [nearest-2-per-side cap counting ranked ACTIVE only with ghosts outside the cap, rank-1 full brightness plus rank-2 same-hue-halved, unconditional-removal clearing shared by null-selector and STAND_ASIDE]

key-files:
  created: []
  modified: [components/dashboard/terminal-shell.tsx, components/charts/nq-chart.tsx, src/lib/chart-mapper.ts, src/lib/chart-mapper.test.ts, src/terminal-shell.test.ts]

key-decisions:
  - "Cap counts ranked ACTIVE pools only; swept ghosts ride outside the cap in separate arrays — never counted toward nearest-2"
  - "Equal-distance ties at the cut line resolve by selector return order (deterministic, stable; flagged for Phase 21 review)"
  - "poolLineInputs helper lives in chart-mapper beside asiaLineInputs (pure, unit-tested) instead of inside the client component"
  - "Null selector fans out to all-null pool props; derivation runs during render from the single selectPools return with zero recomputed status"

patterns-established:
  - "Pool prop fan-out: single selectPools() return derived during render into poolBslPairs/poolSslPairs/poolBslGhosts/poolSslGhosts plus degraded flags, fanned through optional nullable NqChart props"
  - "Full pool overlay: dashed width-1 SIDE-rank-leg pairs, BSL up tone / SSL down tone, rank-1 full / rank-2 halved, ghosts MUTED_GRAY, created after Asia before ticket"

requirements-completed: [CHRT-01, CHRT-02, CHRT-03]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Shell fans nearest-2-per-side ACTIVE arrays plus separate swept ghost arrays with degraded flags; null selection fans all-null with no surviving pools"
    requirement: "CHRT-01"
    verification:
      - kind: integration
        ref: "src/terminal-shell.test.ts#nearest-2-per-side + null-clears"
        status: pass
    human_judgment: false
  - id: D2
    description: "Chart renders max eight ACTIVE pool lines with rank-1 full / rank-2 halved brightness, dimmed swept ghosts, ticket-on-top z-order, uniform stale/thin dimming, and zero lines on null/STAND_ASIDE"
    requirement: "CHRT-02"
    verification:
      - kind: unit
        ref: "src/lib/chart-mapper.test.ts#pool line inputs"
        status: pass
    human_judgment: false
  - id: D3
    description: "Rank brightness split, ghost tone, and pool-above-zones / ticket-on-top layering read correctly on the live canvas"
    requirement: "CHRT-03"
    verification: []
    human_judgment: true
    rationale: "Canvas color/alpha layering (rank-2 50% alpha, ghost gray, paint order) cannot be proven by unit tests — needs a human glance at the running terminal"

# Metrics
duration: 40min
completed: 2026-09-16
status: complete
---

# Phase 20 Plan 03: Full Chart Overlay Summary

**Nearest-2-per-side BSL/SSL pool pairs with rank brightness, swept ghosts, ticket-on-top z-order, and uniform stale/thin dimming plus ghost clearing**

## Performance

- **Duration:** 40 min
- **Started:** 2026-09-16T15:59:24+04:00
- **Completed:** 2026-09-16T16:38:50+04:00
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Shell derives the full pool prop set during render from the single selectPools return: first two ACTIVE BSL + first two ACTIVE SSL in selector return order, swept pools separately as ghosts outside the cap, null selection fanning all-null
- Chart renders capped pairs as dashed width-1 lines titled SIDE-rank-leg (BSL-1-top … SSL-2-bottom), BSL in up-terminal tone, SSL in down-terminal tone, rank-1 full brightness, rank-2 same hue halved
- Swept ghosts render dimmed muted gray and stay visible for retest context; stale/thin legs mute under the uniform discipline reusing the existing tone computation
- Pool lines create after Asia and before ticket entry/SL/TP so ticket stays on top and pools sit above zones; unconditional removal plus null-every-ref on unmount leaves zero lines on null selector and STAND_ASIDE
- Full suite green: 40 files, 464 tests (458 baseline + 4 poolLineInputs guards + 2 shell fan-out tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Shell pool derivation — nearest-2-per-side split plus degraded flags** - `5403ef2` (feat)
2. **Task 2: Chart pool pairs — rank brightness, ghosts, z-order, dimming, clearing** - `cde42b6` (feat)

## Files Created/Modified

- `components/dashboard/terminal-shell.tsx` - Nearest-2-per-side ACTIVE split + swept ghost split + degraded flags + four new chart props (tracer scalar pair kept)
- `components/charts/nq-chart.tsx` - Full pool overlay: array props, eight fixed ACTIVE refs + ghost handle arrays, mount/update creation blocks, unconditional removal, cleanup, pool-lines slot
- `src/lib/chart-mapper.ts` - poolLineInputs finite guard (asiaLineInputs mirror, throw names poolLineInputs)
- `src/lib/chart-mapper.test.ts` - Four poolLineInputs guard tests beside the Asia assertions
- `src/terminal-shell.test.ts` - nearest-2-per-side capture test + null-clears test with deterministic pre-seed fixture

## Decisions Made

- Cap counts ranked ACTIVE pools only (first two ACTIVE per side in selector return order); swept ghosts ride outside the cap in their own arrays and never count toward nearest-2 (D-16).
- Equal-distance ties at the cut line resolve by selector return order — deterministic and stable per the plan assumption, flagged for Phase 21 review.
- poolLineInputs lives in chart-mapper (pure, unit-tested beside asiaLineInputs) rather than inside the client component — cleaner dependency direction, same throw-naming contract.
- Backwards-compat: the tracer scalar rank-1 BSL pair props stay, and when the shell fans only scalars (no arrays) the chart mounts them as the BSL-1 pair; the shell now always fans arrays too.
- Ghost handle arrays clear by reassignment (`= []`) after unconditional removePriceLine per handle — same clearing semantics as the fixed refs, null-safe on unmount.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Chart suite has no price-line unit harness (canvas covered by shell stub props per plan), so chart behavior asserts through the shell stub props plus the pure poolLineInputs guard — per the plan's own acceptance wording.
- Test fixture iteration: the first multi-swing fixture seeded SSL swing lows that got consumed/merged unexpectedly, and the null-clears re-render needed a subscribed-state flip (inFlight) because nq.stale provokes no shell re-render by itself. Resolved with a strict k=2 swing-high fixture (five ACTIVE BSL proving the cap) and a forced re-render in the null-clears path. Both fixes are test-only; implementation untouched.
- Mount/update pool-creation blocks duplicate the rank/ghost loop inline (suite twin) rather than sharing a helper — deliberate: both run inside async closures with different line-handle types, and a shared helper would need the lightweight-charts types at module scope (DOM-free rule).

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: none | — | No new surface beyond the plan's threat register: T-20-06 mitigated via at-most-eight ACTIVE plus ghost legs each finite-guarded with per-leg try/catch (a throw nulls only that leg, chart never blocks); T-20-07 mitigated via unconditional removal before creation plus null-every-ref on unmount; T-20-08 accepted per plan (pure render derivation, statuses verbatim); no package installs (T-20-SC gate not triggered) |

## Known Stubs

None — no hardcoded empty values, placeholder text, or unwired components. Ghost arrays fan empty (not absent) when the selector carries no SWEPT pools; the pool-lines slot renders only when at least one pair, ghost, or scalar prop is present.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full overlay wiring complete end-to-end (shell derivation → canvas lines); CHRT-01 through CHRT-03 implementation done pending the visual backstop glance
- Open tie flagged in the plan assumptions (equal-distance rank tie at the nearest-2 cut line) stays deferred to Phase 21 calibration — untouched
- Visual backstop: rank brightness split + ghost tone + z-order layering needs one human glance at the running terminal (coverage D3)
- report.tsx untouched per plan prohibition — no prose changes in this plan

---
*Phase: 20-1-live-chart-overlay*
*Completed: 2026-09-16*

## Self-Check: PASSED

- All 5 modified files exist on disk (terminal-shell.tsx, nq-chart.tsx, chart-mapper.ts, chart-mapper.test.ts, terminal-shell.test.ts)
- Both task commits exist (`5403ef2`, `cde42b6`); full suite 464/464 green
- Shared orchestrator artifacts untouched by this agent (STATE.md, ROADMAP.md not staged or committed — STATE.md shows only pre-existing orchestrator-side modification)
- report.tsx untouched (git diff names no report file)
