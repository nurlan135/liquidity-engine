---
phase: 02-terminal-composition
plan: 02
subsystem: ui
tags: [freshness, lightweight-charts, zone-fill-primitive, status-strip, baku-timezone, zustand]

# Dependency graph
requires:
  - phase: 01-data-foundation-ict-core
    provides: [baku-time-util, ict-dealing-range-math, yahoo-envelope]
  - phase: 02-01-terminal-tracer
    provides: [dashboard-store, chart-mapper, terminal-shell, nq-chart-tracer]
provides:
  - [freshness-derivation, status-strip, zone-bands-helper, zone-fill-primitive, nq-chart-overlays]
affects: [02-03-report, 02-04-fixtures, terminal-integration]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 6900
  tasks: 3
  commits: 6

# Tech tracking
tech-stack:
  added: []
  patterns: [pure-derivation-with-injected-clock, series-primitive-zone-fill, status-from-envelope-truth]

key-files:
  created:
    - src/lib/freshness.ts
    - src/lib/status-strip.test.ts
    - components/dashboard/status-strip.tsx
    - src/lib/zone-bands.ts
    - src/lib/zone-bands.test.ts
    - components/charts/zone-primitive.ts
  modified:
    - components/charts/nq-chart.tsx
    - components/dashboard/terminal-shell.tsx
    - app/globals.css

key-decisions:
  - "CLOSED derives from Baku Saturday/Sunday only; weekday CME holidays show LIVE-with-aging-data guarded by the server stale flag"
  - "ZoneFillPrimitive paints via useBitmapCoordinateSpace with priceToCoordinate recomputed every draw; opacityScale 0.5 yields the 4% stale desaturation over the 8% tokens"
  - "fancy-canvas CanvasRenderingTarget2D imported type-only; zero runtime/install impact"

patterns-established:
  - "Freshness derivation: deriveStatus(envelope, now) with injected clock; components pass now at the boundary, tests use fixed instants"
  - "Series primitive attach-once plus updateBands-on-change with a getter reading latest props; detach on unmount"

requirements-completed: [DATA-03, UI-02]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "StatusStrip shows LIVE with seconds-ago age on fresh envelopes and STALE with minute age on stale envelopes, never silent"
    requirement: "DATA-03"
    verification:
      - kind: unit
        ref: "src/lib/status-strip.test.ts#deriveStatus returns LIVE with ageSec near 12 on a fresh weekday envelope"
        status: pass
      - kind: unit
        ref: "src/lib/status-strip.test.ts#deriveStatus returns STALE regardless of age when the envelope stale flag is true"
        status: pass
    human_judgment: false
  - id: D2
    description: "Baku Saturday and Sunday render the CLOSED strip state with last closed candles intact and no synthesized bars"
    requirement: "DATA-03"
    verification:
      - kind: unit
        ref: "src/lib/status-strip.test.ts#deriveStatus returns CLOSED on a Baku Saturday even when the envelope is fresh"
        status: pass
    human_judgment: false
  - id: D3
    description: "Chart shades the premium half magenta and the discount half green with a dashed cyan EQ line and a solid cyan DOL marker"
    requirement: "UI-02"
    verification:
      - kind: unit
        ref: "src/lib/zone-bands.test.ts#zoneBands splits a 100/0/50 range into premium 50-100 and discount 0-50 halves"
        status: pass
      - kind: unit
        ref: "npm run test -- chart-mapper (3 passed)"
        status: pass
    human_judgment: true
    rationale: "Canvas shading itself is manual per the validation strategy — unit tests prove geometry inputs, a human confirms the painted zones plus EQ/DOL lines in dev"
  - id: D4
    description: "Stale chart desaturates zone fills and shows a STALE badge while closed chart shows a MARKET CLOSED ribbon"
    requirement: "UI-02"
    verification:
      - kind: other
        ref: "grep stale-badge/closed-ribbon markup in components/charts/nq-chart.tsx"
        status: pass
    human_judgment: true
    rationale: "Overlay visibility and desaturation strength are visual judgments — automation confirms markup presence, a human confirms the rendered look in dev"
  - id: D5
    description: "Forming candles render only with the Formalasan sam chip and thin history renders without stretching"
    requirement: "UI-02"
    verification:
      - kind: other
        ref: "grep forming-chip markup in components/charts/nq-chart.tsx"
        status: pass
    human_judgment: true
    rationale: "Chip placement on the latest row is a visual judgment requiring a dev render"

# Metrics
duration: ~55min
completed: 2026-09-05
status: complete
---

# Phase 02 Plan 02: Freshness Truth plus Chart Overlays Summary

**Baku-aware deriveStatus/formatStripAge with a ticking StatusStrip, plus zoneBands geometry feeding a ZoneFillPrimitive on NqChart with honest STALE/CLOSED overlays**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-09-05T18:30:00Z
- **Completed:** 2026-09-05T19:25:00Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Freshness derivation (`deriveStatus`/`formatStripAge`) tested on fixed Baku instants: LIVE/STALE/CLOSED with 120s age threshold and finite-timestamp guard
- StatusStrip component reading stale + lastUpdatedISO through a shallow-compared store selector, ticking every 10s, rendering Azerbaijani strip copy with the LIVE accent dot
- Zone bands helper with finite + eq-in-span guards, plus ZoneFillPrimitive (ISeriesPrimitive pattern, per-draw priceToCoordinate geometry, updateBands trigger, attach/detach helpers, overlay fallback builder)
- NqChart extended with range + status + forming props, zone primitive attached once, EQ dashed / DOL solid price-lines, STALE badge, MARKET CLOSED ribbon, Formalaşan şam chip, empty-state copy, stale/closed tokens under `.dark`

## Task Commits

Each task was committed atomically:

1. **Task 1: Freshness derivation plus StatusStrip** - `962b3f3` (test), `141ebc5` (feat), `b8abf2d` (feat)
2. **Task 2: Zone bands helper plus fill primitive** - `fb41101` (test), `8b86094` (feat)
3. **Task 3: NqChart zone plus stale and closed overlays** - `7e9c96c` (feat)

_Note: TDD tasks carry separate test → feat commits per the RED/GREEN cycle_

## Files Created/Modified

- `src/lib/freshness.ts` - StatusState union, deriveStatus (CLOSED-first Baku weekend check, then stale flag / 120s age, else LIVE), formatStripAge Azerbaijani copy
- `src/lib/status-strip.test.ts` - 8 tests on fixed Friday/Saturday Baku instants, clock never touched inside assertions
- `components/dashboard/status-strip.tsx` - Named StatusStrip export, client pragma, shallow store selector, 10s tick, status-strip slot, mono numerals, cn + theme tokens
- `src/lib/zone-bands.ts` - ZoneBands interface, zoneBands guarding finite inputs and eq-in-span, premium eq→high / discount low→eq
- `src/lib/zone-bands.test.ts` - 3 tests: 100/0/50 halves plus both throw paths
- `components/charts/zone-primitive.ts` - ZoneFillPrimitive class, attachZoneFill/detachZoneFill, buildZoneOverlayFallback sanctioned fallback
- `components/charts/nq-chart.tsx` - New props rangeHigh/rangeLow/eq/dolPrice/dolName/status/forming; primitive attach-once + updateBands; STALE badge, MARKET CLOSED ribbon, forming chip, empty copy
- `components/dashboard/terminal-shell.tsx` - Imports StatusStrip (removes duplicated inline strip), derives chartStatus from envelope truth via deriveStatus, passes new chart props
- `app/globals.css` - Stale desaturation (4%) + stale badge + closed ribbon tokens under `.dark`; import header and tracer tokens preserved

## Decisions Made

- CLOSED derives from Baku Saturday/Sunday only per RESEARCH A6; a weekday CME holiday shows LIVE-with-aging-data guarded by the server stale flag (plan assumption A-d3-1, adopted as designed).
- EQ/DOL price-line values pass through at full float precision; axis labels show library default formatting (plan assumption A-ui2-2).
- A last close exactly on EQ renders the position line as Ekvilibrium via the existing computePosition path; no premium/discount edge claimed (plan assumption A-ui2-1).
- fancy-canvas `CanvasRenderingTarget2D` imported type-only for the primitive renderer (the same import lightweight-charts itself uses); type-only so zero runtime/install impact, T-02-SC unaffected.
- Primitive paints through `useBitmapCoordinateSpace` with `priceToCoordinate` recomputed on every draw; `opacityScale` 0.5 over the 8% tokens yields the 4% stale look without touching geometry.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Generated missing Next route types so tsc exits 0**
- **Found during:** Task 1 (Freshness derivation plus StatusStrip)
- **Issue:** `npx tsc --noEmit` failed with `app/layout.tsx(20,50): error TS2304: Cannot find name 'LayoutProps'` — a pre-existing error on the base commit (untouched file), caused by the fresh worktree having no `.next` generated types. Blocked the task verify gate.
- **Fix:** Ran `npx next typegen` (generates gitignored `.next` types, modifies no source). No unrelated source files touched — scope boundary respected.
- **Files modified:** none (generated artifacts only, gitignored)
- **Verification:** `npx tsc --noEmit` exits 0 afterwards
- **Committed in:** n/a (no source change; documented here)

**2. [Rule 3 - Blocking] Fixed primitive renderer canvas access for fancy-canvas wrapper type**
- **Found during:** Task 2 (Zone bands helper plus fill primitive)
- **Issue:** First draft called `target.canvas`/`fillRect` directly on `CanvasRenderingTarget2D`, which is a wrapper class (not the raw context) — tsc errors TS2339 on 8 lines.
- **Fix:** Rewrote draw body to the official `target.useBitmapCoordinateSpace(scope => ...)` pattern with `scope.context` (raw `CanvasRenderingContext2D`) and `scope.mediaSize.width` for full-width fills.
- **Files modified:** components/charts/zone-primitive.ts
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** 8b86094 (part of task commit)

**3. [Rule 1 - Bug] Added missing `CanvasRenderingTarget2D` type import**
- **Found during:** Task 2 (Zone bands helper plus fill primitive)
- **Issue:** `CanvasRenderingTarget2D` is not a DOM global — tsc error TS2552 on the renderer signature.
- **Fix:** Added `import type { CanvasRenderingTarget2D } from 'fancy-canvas'` (type-only, erased at runtime).
- **Files modified:** components/charts/zone-primitive.ts
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** 8b86094 (part of task commit)

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug)
**Impact on plan:** All auto-fixes necessary for typecheck/verification. No scope creep. Zero new installs (lockfile-pinned `npm install --legacy-peer-deps` only to populate the fresh worktree's node_modules; T-02-SC upheld).

## Issues Encountered

- Full-suite `npm run test` showed a 5s worker-startup timeout on `src/lib/store.test.ts` twice (the same transient 02-01 recorded); the store suite passes 5/5 in isolation and the full suite went 15 files / 92 tests green on re-run. No logic hang, no code change needed.
- Vitest prints a Vite `configLoader: 'native'` ESM warning banner for vitest.config.ts on every run; harmless, tests execute and report normally.

## TDD Gate Compliance

- RED gate: `test(02-02)` commits 962b3f3 (status-strip) and fb41101 (zone-bands) precede their GREEN commits; both RED runs failed as required (missing-module import errors).
- GREEN gate: `feat(02-02)` commits 141ebc5 and 8b86094 follow RED; suites green (8/8, 3/3).
- No REFACTOR commits needed — implementations landed minimal.

## Verification

- `npx vitest run src/lib/status-strip.test.ts`: 8 passed
- `npx vitest run src/lib/zone-bands.test.ts`: 3 passed
- `npm run test -- chart-mapper`: 3 passed
- `npm run test` (full): 15 files, 92 tests, all green
- `npx tsc --noEmit`: clean (exit 0)
- Acceptance greps: zoneBands + zone-primitive imports, stale-badge, MARKET CLOSED, Formalaşan chip present in nq-chart.tsx; `--terminal-accent` under `.dark`; no `addCandlestickSeries` text in zone-primitive.ts
- Canvas shading itself stays manual per the validation strategy (dev render)

## Known Stubs

None. Grep over new/modified files finds no TODO/FIXME/placeholder text; empty states render the documented Məlumat yoxdur copy with Yenilə CTA.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- StatusStrip spans all panels from the shell; the 02-03 integration plan wires remaining panels to the same envelope truth.
- ZoneFillPrimitive is live on the tracer chart with the `buildZoneOverlayFallback` builder documented in-module if the primitive ever needs replacing.
- Canvas shading + overlays need the manual dev render confirmation per the validation strategy before verify-work signs off UI-02 visuals.

## Self-Check: PASSED

- All 6 created and 3 modified key files exist on disk.
- All 6 task commits exist in git log (962b3f3, 141ebc5, b8abf2d, fb41101, 8b86094, 7e9c96c).

---
*Phase: 02-terminal-composition*
*Completed: 2026-09-05*
