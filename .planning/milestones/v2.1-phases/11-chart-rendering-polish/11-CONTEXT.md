# Phase 11: Chart Rendering Polish - Context

**Gathered:** 2026-09-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 11 makes the existing `NqChart` canvas crisp on high-DPI displays and clean on resize. No new ICT math, no new overlays, no data changes — purely how the populated chart renders. The empty/no-data state, thin-history display, and surrounding chrome (badges, forming row, ribbon) are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Resize trigger scope
- **D-01:** Observe the chart container itself (not just the window) so window resizes, panel changes, and sidebar toggles all redraw.
- **D-02:** Track size live during an active drag — the chart follows the new size in real time rather than redrawing only when the drag settles.

### View preservation
- **D-03:** Resize reframes the current view — the user's pan/zoom (visible time range) is preserved, never reset to a re-fit.
- **D-04:** Asia lines, Judas/SMT markers, and zone fills must persist through the resize exactly as before — no flicker, no dropped overlays. Overlay persistence is verified as part of every resize check.

### HiDPI proof method
- **D-05:** Crispness is proven by human visual check on a high-DPI display (lines and text sharp), consistent with how 03.2 judged canvas legibility.
- **D-06:** Console must be clean during resize and DPI/zoom switch — no warnings or errors. A clean console is part of the proof, not just the visuals.

### Phase 13 boundary
- **D-07:** Phase 11 touches only the populated chart (candles present). The empty "Məlumat yoxdur" state stays as-is — honest-display work belongs to Phase 13 (HIST-01).
- **D-08:** Surrounding chrome stays pixel-stable: STALE badge, forming row, MARKET CLOSED ribbon, and the empty overlay are unaffected. Resize handling affects the canvas area only.

### Claude's Discretion
- Choice of resize mechanism (ResizeObserver vs window listener vs library-native autosize), DPR handling details, debounce/throttle strategy within live tracking, and test structure.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Chart implementation
- `components/charts/nq-chart.tsx` — The chart component: mount effect (line ~133), data/overlay update effect (line ~314), render block with container ref (line ~463). Currently has zero resize handling.
- `components/charts/zone-primitive.ts` — Zone fill primitive attached to the series; must survive resize.

### Requirements and roadmap
- `.planning/REQUIREMENTS.md` — CHRT-01 (HiDPI crispness), CHRT-02 (clean resize redraw).
- `.planning/ROADMAP.md` — Phase 11 goal, success criteria, CHRT-01/CHRT-02 mapping.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `NqChart` mount effect (`components/charts/nq-chart.tsx` ~line 133): chart created once per container via dynamic `lightweight-charts` import — resize handling attaches here, inside the same lifecycle.
- Data/overlay update effect (~line 314): remove-then-create price-line cycle + v5 `createSeriesMarkers` plugin refresh — the pattern overlay persistence must follow through resize.
- `attachZoneFill` (`components/charts/zone-primitive.ts`): zone geometry recomputed from live scale coordinates — must be refreshed after a size change.

### Established Patterns
- Dynamic import keeps the module top DOM-free; resize code must follow the same lazy pattern (no top-level `window`/`ResizeObserver` access).
- Marker/overlay failures never block candles (try/catch with empty-array fallback) — resize failures must degrade the same way.
- Disposal is explicit in the mount-effect cleanup (detach primitive, `chart.remove()`, null all refs) — any observer/listener must be torn down there.

### Integration Points
- Chart container `div[data-slot="nq-chart"]` inside `div[data-slot="chart-block"]` — the observed element and the resized canvas target.
- `data-slot` markers (`asia-lines`, `judas-markers`, `smt-marker`, `stale-badge`, `closed-ribbon`, `forming-row`, `chart-empty`) — existing hooks for asserting overlay/chrome stability through resize.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The user selected recommended options throughout; implementation mechanism is Claude's discretion.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-Chart Rendering Polish*
*Context gathered: 2026-09-08*
