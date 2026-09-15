# Stack Research

**Domain:** BSL/SSL Pain Threshold map (§1 live report + chart overlay) + execution polish on existing NQ execution terminal — subsequent milestone, brownfield only
**Researched:** 2026-09-15
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `src/lib/ict` pure functions (extended: `pools.ts` new) | no version (own code) | BSL/SSL stop-cluster projection: swing-high/low liquidity pools from closed D1 candles | Purity constraint (no I/O, inject time) is what keeps 420 tests green; pool detection is deterministic candle arithmetic over data the store already holds. Reuse the proven `isSwingHigh`/`isSwingLow` fractal detector + `SWING_K = 2` from `smt.ts` (already pinned by test), then cluster co-located extremes into pool bands with an ATR-tolerance merge — same shape as `fvg.ts` detect+mitigate (scan, then bound to trailing-N). Pools are a clustering of existing swing outputs, not a new detector, so pool prose and ticket/DOL levels can never disagree |
| Zustand derived selectors (`selectPools`, pool-aware ticket/DOL reads) | 5.0.15 (installed, verified in node_modules) | Pool evaluation as derived selectors over the existing NQ D1 leg | v2.0/v3.0 proved the pattern: `selectAMD`/`selectTrigger`/`selectTicket` derive from legs without storing derived state, so pools can never desync from swings. Pool inputs (swing-k, ATR-merge tolerance, trailing-pool cap) live as plain store fields with clamped setters — not derived — so calibration sliders write them and selectors read them in the same render pass |
| `REPORT_SECTIONS` §1 flip + locked-copy §1 block in `report.tsx` | own code (no version) | §1 live Pain Threshold block with verbatim pool reasons | §1 already exists as an `unavailable` shell entry (`src/lib/report.ts` line 20); flipping it to `live` plus a pools sub-block follows the exact §3 precedent (D-01/D-03/D-04 locked copy: detector reasons verbatim, `S3_EMPTY_COPY`-style fallback). Sweeper/pool detail lives in §1 prose, never on canvas (D-07 precedent) |
| lightweight-charts v5 `createPriceLine` pair per pool band | 5.2.1 (installed, verified) | BSL zone top/bottom + SSL zone top/bottom horizontal lines on the existing chart | `nq-chart.tsx` already owns the `createPriceLine`/`removePriceLine` remove-then-create ref cycle driving EQ/DOL/Asia/Q1/Q3/OTE lines; pool bands are two more dashed lines per pool (top/bottom) with `title: 'BSL'`/`'SSL'`, capped to the trailing-N pools so the axis never stripes. `createPriceLine({ price, color, lineWidth, lineStyle, axisLabelVisible, title })` on the existing series handle — confirmed against the official price-line tutorial. No chart-lib change, no new overlay primitive |
| `components/ui/slider.tsx` (new file) from installed `@base-ui/react/slider` | `@base-ui/react` 1.8.0 (installed; `slider/` + `number-field/` dirs verified present; `slider.tsx` wrapper currently absent) | WHY NOW threshold recalibration + pool-tolerance controls for execution polish | Zero new installs: `@base-ui/react` already ships `slider` and `number-field`. Add one wrapper following the existing `button.tsx`/`dialog.tsx` pattern (primitive re-export with `data-slot` + Tailwind classes). v3.0 research already decided this exact file; it still does not exist, so v3.1 is where it lands. Thresholds stay numeric in the store with clamped setters; the slider is a thin view over them |
| Manual `localStorage` helpers (extend existing firing-log JSON export) | no version (own code) | Firing-log analysis persistence + threshold calibration survival across reloads | `firingLogToJson` already exists in `store.ts` (entries + thresholds + exportedAt); firing-log *analysis* (hit-rate per gate, sweep-side split, session split) is pure aggregation over that same array — a 30-line stats helper in own code, rendered as DOM tables via existing `card` primitives. Same reason as v3.0: avoids the zustand `persist` SSR rehydration trap; log/analysis state is client-ephemeral |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | — | — | **No new dependencies.** Every v3.1 capability maps onto an installed package or pure own-code — same headline finding as v2.0 and v3.0. The only new *file* (not package) is `components/ui/slider.tsx` composed from the already-installed `@base-ui/react/slider` |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| vitest | ^5.0.0 (installed) | Pin pool truth-table (isolated swing → no pool; co-located highs within ATR tolerance → one BSL band; tolerance boundary is strict-greater-than with epsilon like `TOL_EPS_BPS`; trailing-cap keeps newest N; forming/non-finite rows drop at the boundary), §1 selector refuse-null envelope, firing-log stats edge cases (empty log → zeros, never NaN) — same pure-function style as `smt.test.ts`/`fvg.test.ts` |
| Existing store test harness | own code (`store.test.ts`) | Add selector tests: pools derive from the NQ D1 leg (never stored), tolerance setter clamps, stale NQ leg → `selectPools` refuses null with owning-leg `lastError` verbatim (same refuse-with-reason envelope as Phase 9 §3 + Phase 15 trigger selectors) |

## Installation

```bash
# No installs required — all capabilities are covered by installed packages:
# next 16.3.4, react 19.2.8, zustand 5.0.15, lightweight-charts 5.2.1,
# date-fns ^4.4.0, date-fns-tz ^3.2.0, @base-ui/react 1.8.0
# (slider + number-field primitives verified present in node_modules/@base-ui/react)
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Pools as clustering over `smt.ts` swing outputs (`matchSwings`-style reuse of `isSwingHigh`/`isSwingLow` + `SWING_K`) | New independent swing detector re-reading candles with its own k | Never for v3.1 — two swing detectors with different k will disagree on which highs are "real", and §1 pool prose would contradict Judas/SMT pins on the same bar. One fractal definition shared by import, not by copy-paste |
| Pool merge tolerance expressed in ATR multiples (via existing `computeATR`) | Fixed-point or percentage tolerance | Only if ATR is unavailable (thin history → `computeATR` empty → fall back to refuse-null, never to a magic constant). ATR-multiple keeps the merge width regime-aware (expansion vs compression), matching how `judas.ts` already scales displacement by range height |
| Pool overlay as `createPriceLine` top/bottom pairs | Extending `ZoneFillPrimitive` with BSL/SSL fills | Only if pools graduate from lines to shaded zones after live observation proves the bands are stable. The primitive is premium/discount-specific (two fills, one getter); pool bands are N bands with a cap, which maps naturally onto price-line refs today. Revisit after one observation cycle, not before |
| Firing-log analysis as pure stats helpers + DOM tables | `recharts` / `d3` / chart-lib histogram for log analytics | Never under zero-budget scope — a log table (gate × hit-rate, side split, session split) answers the calibration question with zero new deps and zero canvas surface. A histogram buys pixels, not decisions |
| `toast.add()` if a pool-sweep alert is wanted | Browser Notification API / push service | Only if background alerts become a requirement — same verdict as v3.0, out of zero-budget scope |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Any clustering/ML library (`ml-kmeans`, `density-clustering`, etc.) | Pool formation must be deterministic, pinned by tests, and explainable verbatim in §1 ("3 swing high 0.5×ATR içində → BSL bandı"). A library clusterer adds a dependency plus nondeterminism/labeling the roadmap cannot audit | Own-code tolerance-banding over sorted swing extremes (sort → greedy merge within tolerance → cap to trailing-N), same WR-07 sort-then-slice precedent as `applyMitigation` |
| `recharts`, `d3`, `visx`, any chart/analytics library | Firing-log analysis is a table, not a visualization milestone; a second chart engine fights the lightweight-charts canvas the terminal already owns | Pure stats helper + existing `card`/`button` DOM rendering |
| `react-hook-form`, `zod`, any form/validation lib | Calibration controls are sliders + clamped numeric fields, not a schema-validated form — same verdict as v3.0 | Controlled inputs + pure clamp helpers, `slider.tsx` wrapper |
| zustand `persist` middleware for thresholds/log | Buys SSR rehydration complexity for client-ephemeral state — same verdict as v3.0 | Guarded manual `localStorage` helpers + existing `firingLogToJson` export |
| New charting library or drawing plugin | v5 price lines already drive every horizontal overlay; pool bands are new lines, not a new rendering capability | Existing `nq-chart.tsx` price-line refs |
| WebSocket / streaming feed for "live" pools | Pools evolve on closed-candle structure (D1 leg already polls at 60s), not tick data | Existing staggered poll; `selectPools` re-derives on each store update for free |
| LLM calls for §1 narration | Determinism is a project constraint; Pain Threshold prose is a verbatim-reason render of which pools exist and their size/state | Pure `pools.ts` returning `{ pools[], reasons[] }` rendered verbatim, same locked-copy contract as §3 |

## Stack Patterns by Variant

**If pool bands multiply on live data (every swing becomes its own pool):**
- Tighten via the calibratable merge tolerance (default toward ~0.5×ATR, require ≥2 swings per pool) rather than adding minimum-strength machinery
- Because the calibration goal exists precisely for this; code the gate as a threshold, not as fixed logic

**If BSL/SSL lines stripe the chart (too many horizontal lines):**
- Cap the overlay to the trailing-2 unmitigated pools per side and collapse each band to a single mid-line when the band width is below axis-legibility — same D-03 OTE-pocket-mid precedent as `levelLineInputs`
- Because 2 BSL + 2 SSL lines plus the existing EQ/DOL/Asia/Q1/Q3/OTE set is the legibility ceiling the 03.2 research already flagged

**If a pool band and the ticket entry/SL/TP lines collide on the same price:**
- Ticket lines win visual priority; pool lines render thinner/dimmer at colliding prices (tone rule, not removal — same `overlayStale` muted-gray precedent)
- Because hiding a pool that the ticket depends on would break the §1→§5 story the milestone exists to tell

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@base-ui/react` 1.8.0 `slider` / `number-field` | Existing `components/ui/*` wrapper pattern (`button.tsx`, `dialog.tsx` import from `@base-ui/react/*`) | New `slider.tsx` follows the identical re-export + `data-slot` + Tailwind recipe; no version bump, no new package |
| zustand 5.0.15 + React 19.2.8 | New `selectPools` + pool-tolerance fields on `useDashboard` | Same `create<DashboardState>()` store; stable selector-function subscription (per 03.2 lesson — no `useShallow` over fresh-object selectors) |
| lightweight-charts 5.2.1 | Pool band price lines on existing series handle | Price-line refs already exist in `nq-chart.tsx`; additive only, existing overlays untouched |
| Next 16.3.4 App Router | §1 block + slider are client components (`'use client'`, like `report.tsx`) | No route changes; no API changes — Yahoo proxy legs are untouched by v3.1 |

## Integration Points with Existing Code

| Existing piece | v3.1 touchpoint | Change shape |
|---------------|-----------------|--------------|
| `src/lib/ict/smt.ts` (`isSwingHigh`/`isSwingLow`, `SWING_K`) | `src/lib/ict/pools.ts` (new) | Import the fractal detector, do not redefine it: `detectPoolSwings(nqD1)` reuses k=2, then `clusterPools(swings, atrTol)` merges co-located extremes into `{ side: 'BSL' \| 'SSL', top, bottom, swingCount, originDates[] }` + `describePools()` Azerbaijani verbatim reasons |
| `src/lib/ict/regime.ts` (`computeATR`) | Pool merge tolerance | Tolerance = `POOLS_ATR_MULT × ATR`; empty ATR series (thin history) → refuse-null, never a magic constant |
| `src/lib/ict/dol.ts` (`computePrimaryDOL`) | Pool-aware DOL read | DOL target prefers the nearest unmitigated pool on the bias side when one exists, else existing range-high/low logic — additive branch, existing behavior is the fallback |
| `src/lib/ict/ticket.ts` (`computeTicket`) | Execution polish: pool-aware SL sanity | SL placement checks distance to the opposing pool (stop inside own-side pool → warn verbatim); pure additive check, refuse-with-reason envelope unchanged |
| `src/lib/report.ts` (`REPORT_SECTIONS` index 1) | §1 live flip | `state: 'unavailable'` → `'live'` + `selectPools` prose block in `report.tsx` beside the §3 precedent; pool reasons verbatim, empty-pool fallback copy |
| `src/lib/store.ts` (`useDashboard`) | `selectPools`, pool-tolerance fields + setters | Derived selector with the Phase 9/15 refuse-null envelope (stale/empty NQ D1 leg → null, reason in owning-leg `lastError`); tolerance as plain state with clamped setter feeding the calibration slider |
| `src/lib/chart-mapper.ts` | `poolLineInputs()` helper | Same pass-through + finite-guard + throw-naming pattern as `asiaLineInputs`/`levelLineInputs`; `nq-chart.tsx` wraps in try-catch so a throw renders no pool lines and never blocks the chart |
| `components/charts/nq-chart.tsx` | Pool band price lines | New optional props (`pools` truth) reusing the remove-then-create `createPriceLine` ref cycle; capped to trailing-N per side |
| `components/ui/slider.tsx` (new file) | Threshold + pool-tolerance + risk-amount calibration | Compose installed `@base-ui/react/slider`; ticket UX polish reuses existing `dialog`/`card`/`button` |
| `firingLogToJson` + firing log | Firing-log analysis | Pure stats helper over the existing log array (gate hit-rate, side/session splits, pool-presence split) rendered in existing panels; export rides the existing calibration-JSON path |

## Sources

- Codebase (HIGH confidence) — `package.json` deps; `node_modules` verified: zustand 5.0.15, lightweight-charts 5.2.1, `@base-ui/react` 1.8.0 with `slider/` + `number-field/` present and `components/ui/slider.tsx` absent; `src/lib/ict/smt.ts` fractal detector + `SWING_K`; `src/lib/ict/fvg.ts` detect+mitigate+cap precedent; `src/lib/chart-mapper.ts` pass-through helper pattern; `components/charts/nq-chart.tsx` price-line refs + `buildOverlayMarkers` ordering; `src/lib/report.ts` §1 shell entry; `src/lib/store.ts` firing-log + `firingLogToJson`
- Official lightweight-charts price-line tutorial (MEDIUM confidence) — `series.createPriceLine({ price, color, lineWidth, lineStyle, axisLabelVisible, title })` on `ISeriesApi`
- `.planning/research/STACK.md` v3.0 (HIGH confidence for "no new deps" precedent) — same headline finding transfers for the third consecutive milestone
- PROJECT.md v3.1 scope (HIGH) — BSL/SSL map + §1 live + execution polish, zero budget, no LLM, paper-only

---
*Stack research for: v3.1 Pain Threshold (§1) + Execution Polish — BSL/SSL stop-cluster projection + chart overlay + §1 live report*
*Researched: 2026-09-15*
