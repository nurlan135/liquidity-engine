# Phase 11: Chart Rendering Polish - Pattern Map

**Mapped:** 2026-09-08
**Files analyzed:** 2 (both modified, no new files)
**Analogs found:** 2 / 2 (both targets are their own analogs — polish phase)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `components/charts/nq-chart.tsx` (modify) | component (canvas chart host) | request-response (mount once, push data via effects) | itself — mount effect ~133, data/overlay effect ~314, render block ~463 | exact (self) |
| `components/charts/zone-primitive.ts` (modify or no-change) | provider (series primitive) | event-driven (repaint on requestUpdate) | itself — `attachZoneFill`, `updateBands`, `detach` | exact (self) |

## Pattern Assignments

### `components/charts/nq-chart.tsx` — where each planned change goes

**1. Chart options insertion point (nq-chart.tsx:144-146).** Planner: `autoSize` + `lockVisibleTimeRangeOnResize` go inside this existing `createChart` call. Copy surrounding option shape exactly:

```typescript
const chart = createChart(el, {
  layout: { background: { color: 'transparent' }, textColor: '#71717A' },
});
```

Becomes (per RESEARCH.md Pattern 1+2) — add `autoSize: true` and `timeScale: { lockVisibleTimeRangeOnResize: true }` to this literal, nothing else:

```typescript
const chart = createChart(el, {
  autoSize: true,
  layout: { background: { color: 'transparent' }, textColor: '#71717A' },
  timeScale: { lockVisibleTimeRangeOnResize: true },
});
```

**2. Mount-effect cleanup / teardown (nq-chart.tsx:286-310).** Any observer/listener teardown goes here, BEFORE `chart.remove()`. With pure-`autoSize` no new teardown is needed (`chart.remove()` at line 298 owns the internal observer). If executor adds a manual fallback observer, disconnect it before line 298 and guard with the existing `disposed` flag (line 134/287):

```typescript
return () => {
  disposed = true;
  void (async () => {
    const { detachZoneFill } = await import('@/components/charts/zone-primitive');
    // ... detach primitive ...
  })();
  chartRef.current?.remove();   // <-- fallback observer.disconnect() goes BEFORE this line
  chartRef.current = null;
  // ... null all refs ...
};
```

**3. Repaint nudge pattern (nq-chart.tsx:446-449).** The existing zone-refresh block IS the resize repaint nudge — reuse verbatim, do not invent a new hook. With `autoSize` there is no resize callback of our own:

```typescript
// Recompute zone geometry on range change; stale desaturates fills.
if (zoneRef.current !== null) {
  zoneRef.current.opacityScale = status === 'stale' ? 0.5 : 1;
  zoneRef.current.updateBands();
}
```

**Dynamic-import pattern (nq-chart.tsx:138-139) — planner must replicate.** Module top stays DOM-free; all chart/primitive code loads lazily inside effects. No top-level `window`/`ResizeObserver` access:

```typescript
const { createChart, CandlestickSeries, LineStyle } = await import('lightweight-charts');
const { attachZoneFill } = await import('@/components/charts/zone-primitive');
```

Also used in data effect (line 322) and cleanup (line 289):
```typescript
const { LineStyle, createSeriesMarkers } = await import('lightweight-charts');
const { detachZoneFill } = await import('@/components/charts/zone-primitive');
```

**Try/catch overlay-fallback pattern (nq-chart.tsx:183-203, 208-219, 223-259, 423-443) — resize failures must degrade the same way.** Every overlay block catches and nulls its ref so candles never block. Representative (Asia pair):

```typescript
try {
  const asiaInputs = asiaLineInputs(props.asiaHigh, props.asiaLow);
  // ... createPriceLine ...
} catch {
  asiaHighLineRef.current = null;
  asiaLowLineRef.current = null;
}
```

Markers variant (line 441-443):
```typescript
} catch {
  // Marker failures never block candles or price lines.
}
```

Zone getter variant (lines 266-280): getter wraps `zoneBands()` in try/catch returning `null`.

**Explicit disposal pattern (nq-chart.tsx:286-310) — planner must replicate.** Detach primitive via dynamic import, then `chart.remove()`, then null EVERY ref (`chartRef`, `seriesRef`, all line refs, `markersPluginRef`, `zoneRef`). See excerpt in item 2 above.

---

### `components/charts/zone-primitive.ts` — attach / update / detach

**`attachZoneFill` (lines 131-138)** — called once at mount (nq-chart.tsx:262). No change expected:

```typescript
export function attachZoneFill(
  series: { attachPrimitive(primitive: ISeriesPrimitive<Time>): void },
  getBands: ZoneBandsGetter,
): ZoneFillPrimitive {
  const primitive = new ZoneFillPrimitive(getBands);
  series.attachPrimitive(primitive);
  return primitive;
}
```

**`updateBands` (lines 126-128)** — the repaint nudge. Invokes the library-owned `requestUpdate`; geometry recomputes from live `priceToCoordinate` on next draw (lines 46-56):

```typescript
updateBands(): void {
  this.requestUpdate?.();
}
```

**`detach` path (lines 110-115 + 140-145)** — cleanup only, via dynamic import in mount-effect cleanup:

```typescript
detached(): void {
  this.series = null;
  this.chart = null;
  this.requestUpdate = null;
  this.views.length = 0;
}
```

**Do-NOT-fix adjacent defect (RESEARCH.md Pitfall 4):** `attached()` (lines 102-108) snapshots `opacityScale` into the view constructor; later assignments (nq-chart.tsx:282,447) mutate the primitive field the renderer never re-reads. Out of scope — executor must not "fix" as drive-by.

---

## Shared Patterns

### Lazy / DOM-free module top
**Source:** `components/charts/nq-chart.tsx:1-9` (type-only imports), `components/charts/zone-primitive.ts:23-27` (`typeof window === 'undefined'` guard in `readVar`)
**Apply to:** All new code in this phase — no top-level `window`/`ResizeObserver`/`devicePixelRatio` access. `autoSize` needs no top-level code at all.

### No host DPR code
**Source:** RESEARCH.md anti-pattern (verified bundle probes) — library sizes backing stores from `device-pixel-content-box` and reads `window.devicePixelRatio` live. Host DPR scaling double-scales and CAUSES blur.
**Apply to:** Executor must never read or store `devicePixelRatio`.

### No resize data operations
**Source:** RESEARCH.md anti-patterns — never re-create the chart, `setData()`, or `fitContent()` on resize (destroys pan/zoom per D-03, flickers overlays per D-04). Resize is a size notification only.

## Files That Must NOT Be Touched

Out of scope per CONTEXT.md D-07/D-08 — planner must not assign work in these:

| File / Block | Reason |
|--------------|--------|
| `components/charts/nq-chart.tsx:480-484` (`data-slot="stale-badge"`) | Chrome — stays pixel-stable (D-08) |
| `components/charts/nq-chart.tsx:485-491` (`data-slot="closed-ribbon"`, MARKET CLOSED) | Chrome — stays pixel-stable (D-08) |
| `components/charts/nq-chart.tsx:492-499` (`data-slot="forming-row"`, `forming-chip`) | Chrome — stays pixel-stable (D-08) |
| `components/charts/nq-chart.tsx:500-505` (`data-slot="chart-empty"`, "Məlumat yoxdur") | Empty state — Phase 13 HIST-01 work (D-07) |
| `components/dashboard/terminal-shell.tsx:256,283` (`data-slot="chart-empty"`) | Empty-state shells in dashboard chrome — same D-07 boundary |
| Any `src/lib/ict/*`, `src/lib/chart-mapper*`, `src/lib/zone-bands*` | No new ICT math, no data changes (phase boundary) |
| `components/charts/zone-primitive.ts:157-165` (`buildZoneOverlayFallback`) | Pure data-mapping sanction fallback, no size dependence (RESEARCH.md A4) |

## No Analog Found

None — both target files are their own analogs. No new files planned (RESEARCH.md: no new files, no new packages, no new tests; automated gate is `tsc` + `npm test` + `npm run build`).

## Metadata

**Analog search scope:** `components/charts/`, `components/dashboard/` (chrome check); RESEARCH.md already confirmed repo-wide grep finds no `autoSize`/`ResizeObserver`/`resize` outside node_modules.
**Files scanned:** 2 target files (full read) + 1 chrome grep.
**Git-tracked verification:** `git ls-files` confirms `components/charts/nq-chart.tsx`, `components/charts/zone-primitive.ts`, `components/dashboard/terminal-shell.tsx` all tracked.
**Pattern extraction date:** 2026-09-08
