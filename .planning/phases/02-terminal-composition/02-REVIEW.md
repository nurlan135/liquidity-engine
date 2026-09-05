---
phase: 02-terminal-composition
reviewed: 2026-09-05T00:00:00Z
depth: standard
files_reviewed: 29
files_reviewed_list:
  - app/globals.css
  - app/page.tsx
  - components/charts/nq-chart.tsx
  - components/charts/zone-primitive.ts
  - components/dashboard/calendar-panel.tsx
  - components/dashboard/report.tsx
  - components/dashboard/sentiment-panel.tsx
  - components/dashboard/status-strip.tsx
  - components/dashboard/terminal-shell.tsx
  - components/ui/button.tsx
  - components/ui/card.tsx
  - components/ui/toast.tsx
  - lib/utils.ts
  - src/lib/blocked-side.ts
  - src/lib/calendar.test.ts
  - src/lib/chart-mapper.test.ts
  - src/lib/chart-mapper.ts
  - src/lib/countdown.ts
  - src/lib/fixture-guard.ts
  - src/lib/fixtures.test.ts
  - src/lib/freshness.ts
  - src/lib/report.test.ts
  - src/lib/report.ts
  - src/lib/sentiment.ts
  - src/lib/status-strip.test.ts
  - src/lib/store.test.ts
  - src/lib/store.ts
  - src/lib/zone-bands.test.ts
  - src/lib/zone-bands.ts
findings:
  critical: 1
  warning: 8
  info: 6
  total: 15
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-09-05T00:00:00Z
**Depth:** standard
**Files Reviewed:** 29
**Status:** issues_found

## Summary

Reviewed the terminal-composition surface (chart, shell, panels, store, and supporting pure libs) at standard depth. The pure domain libs (`freshness`, `countdown`, `blocked-side`, `fixture-guard`, `report`, `chart-mapper`, `zone-bands`) are well-guarded and well-tested. The defects concentrate at the React wiring layer: one critical bug makes poll-failure error toasts permanently invisible, the zone-fill stale dimming is silently dead code due to a by-value capture, the canvas primitive ignores bitmap pixel-ratio scaling, and the chart never resizes with its container. Several smaller robustness issues (unguarded throwing mapper in an effect, frozen clock in a memo, unrounded floats in UI copy) round out the list.

## Critical Issues

### CR-01: Error toasts are never rendered — page wires Viewport without a toast list

**File:** `app/page.tsx:4-12`
**Issue:** `Home` mounts `<ToastProvider>` + `<ToastViewport/>` directly, but nothing ever renders the toast list. The component that maps the toast manager to visible `<Toast>` nodes (`ToastList`, inside the `Toaster` component in `components/ui/toast.tsx:200-215`) is never mounted — and `ToastList` is not even exported, so no other file can mount it. `TerminalShell` calls `toast.add(...)` on the module-level singleton on every poll failure (`components/dashboard/terminal-shell.tsx:74`), and those toasts go nowhere visible. The locked Azerbaijani poll-failure copy therefore never reaches the user; only the inline `chart-error` line (which sits inside the chart card) hints at failure. A second latent wiring risk: `ToastProvider` is used without `toastManager={toast}`, so even a list added under this provider may subscribe to a different manager instance than the singleton `toast.add()` writes to.
**Fix:**
```tsx
import { TerminalShell } from '@/components/dashboard/terminal-shell';
import { Toaster } from '@/components/ui/toast';

export default function Home() {
  return (
    <div data-slot="terminal-page" className="dark flex min-h-screen flex-col bg-background text-foreground">
      <Toaster>
        <TerminalShell />
      </Toaster>
    </div>
  );
}
```
(`Toaster` already wires `toastManager={toast}`, `ToastPortal`, `ToastViewport`, and `ToastList` together.)

## Warnings

### WR-01: Stale zone-fill dimming is dead — opacity captured by value at attach time

**File:** `components/charts/zone-primitive.ts:75-85,103-109`
**Issue:** `ZoneFillView`/`ZoneFillRenderer` take `opacityScale: number` in their constructors and store it in a `private readonly` field. `attached()` creates the views once with the then-current value. Later mutations of `primitive.opacityScale` (`components/charts/nq-chart.tsx:114,174`) have zero effect on what is painted — the renderer keeps drawing with the attach-time value. The comment claiming "0.5 over the 8% tokens yields the 4% stale desaturation" describes behavior that cannot happen. The STALE badge still shows, so state is communicated, but the fill dimming feature is silently non-functional.
**Fix:** Read opacity live through a getter instead of copying the value:
```ts
class ZoneFillRenderer implements IPrimitivePaneRenderer {
  constructor(
    private readonly series: SeriesLike,
    private readonly getBands: ZoneBandsGetter,
    private readonly getOpacity: () => number,
  ) {}
  draw(target: CanvasRenderingTarget2D): void {
    // ...
    const opacityScale = this.getOpacity();
    // ...
  }
}
// attached(): new ZoneFillView(param.series, this.getBands, () => this.opacityScale)
```

### WR-02: Zone fills ignore bitmap pixel-ratio scaling — mispainted on HiDPI

**File:** `components/charts/zone-primitive.ts:59-71`
**Issue:** Inside `useBitmapCoordinateSpace`, the code uses `priceToCoordinate()` results (CSS-pixel space) directly as bitmap-space `fillRect` coordinates and uses `scope.mediaSize.width` as the rect width without multiplying by `scope.horizontalPixelRatio` / `scope.verticalPixelRatio`. Per the lightweight-charts series-primitive contract, bitmap-space drawing must scale CSS-pixel coordinates by the scope pixel ratios. On `devicePixelRatio === 1` this looks correct; on HiDPI/retina displays the premium/discount fills will be mispositioned and half-height.
**Fix:**
```ts
target.useBitmapCoordinateSpace((scope) => {
  const width = scope.mediaSize.width * scope.horizontalPixelRatio;
  const y1 = premiumTop * scope.verticalPixelRatio;
  const y2 = premiumBottom * scope.verticalPixelRatio;
  // ... same for discount band, then fillRect(0, y1, width, y2 - y1)
});
```

### WR-03: Chart cleanup nulls refs before the async detach reads them — detach never runs

**File:** `components/charts/nq-chart.tsx:118-135`
**Issue:** The mount-effect cleanup schedules an async IIFE that reads `seriesRef.current` and `zoneRef.current`, but synchronously sets both to `null` (and calls `chartRef.current?.remove()`) before the awaited import resolves. The detach path therefore always sees `null` and is skipped, and `remove()` runs while the primitive is still attached. In practice `remove()` disposes everything so the leak is bounded to unmount, but the `detachZoneFill` path is dead code and the ordering (destroy chart first, detach after) is backwards.
**Fix:** Capture synchronously, detach before remove:
```ts
return () => {
  disposed = true;
  const series = seriesRef.current as { detachPrimitive: (p: ZoneFillPrimitive) => void } | null;
  const zone = zoneRef.current;
  const chart = chartRef.current;
  zoneRef.current = null;
  seriesRef.current = null;
  chartRef.current = null;
  if (series !== null && zone !== null) {
    import('@/components/charts/zone-primitive').then(({ detachZoneFill }) => {
      try { detachZoneFill(series, zone); } finally { chart?.remove(); }
    });
  } else {
    chart?.remove();
  }
  eqLineRef.current = null;
  dolLineRef.current = null;
};
```

### WR-04: Chart never resizes — no ResizeObserver after mount

**File:** `components/charts/nq-chart.tsx:47-136`
**Issue:** `createChart(el, {...})` sizes the chart once from the container at mount. No `ResizeObserver` calls `chart.applyOptions({ width, height })` afterwards, so the canvas keeps its mount size while the responsive grid (`terminal-shell.tsx:89`) reflows around it — on window resize or breakpoint changes the chart overflows or leaves dead space.
**Fix:** Observe the container and apply size:
```ts
const ro = new ResizeObserver((entries) => {
  const rect = entries[0]?.contentRect;
  if (rect && chartRef.current) chartRef.current.applyOptions({ width: rect.width, height: rect.height });
});
ro.observe(el);
// ... and ro.disconnect() in cleanup
```

### WR-05: Unrounded floats rendered into user-facing sentiment copy

**File:** `src/lib/sentiment.ts:46-58`, `components/dashboard/sentiment-panel.tsx:79,87`
**Issue:** `buy` is an unrounded repeating float (e.g. `62.333333333333336`) and `sell = 100 - buy` inherits the artifact. Both are interpolated verbatim into the footer (`BUY ${avg.buy}% / SELL ...`), the crowded flag (`... ${avg.buy}%`), and the `rationale` string rendered by the report path. Users see long decimal tails.
**Fix:** Round once at the source:
```ts
const round1 = (v: number) => Math.round(v * 10) / 10;
const buy = round1(sum / kept.length);
const sell = round1(100 - buy);
```

### WR-06: Report pre-news badge reads the clock inside useMemo — value freezes

**File:** `components/dashboard/report.tsx:47-52`
**Issue:** `new Date()` is called inside `useMemo` keyed only on `[scenario]`. The resolved event times (and hence the `isPreNews` verdict driving `PRE_NEWS_BADGE` vs the regime badge) go stale until the scenario changes, while `CalendarPanel` re-ticks every 30s. The two panels can disagree about pre-news state indefinitely.
**Fix:** Share a ticking clock (e.g. lift the 30s `now` state up or read `now` from a small `useNow(30_000)` hook) and depend on it:
```ts
const [now, setNow] = useState(() => new Date());
useEffect(() => { const id = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(id); }, []);
const preNews = useMemo(() => { /* ... resolveScenario(snapshot, now) ... */ }, [scenario, now]);
```

### WR-07: Chart update effect can throw on empty candles — unguarded throwing mapper

**File:** `components/charts/nq-chart.tsx:139-144`, `src/lib/chart-mapper.ts:22-25`
**Issue:** `mapCandlesToSeries` throws on an empty array, and the update effect calls it unconditionally once the series exists. Today the shell unmounts `NqChart` when `candles` empties, so the path is unreachable — but any future prop flow that clears candles while mounted turns a render into a thrown error inside an effect. The empty-state overlay below (`nq-chart.tsx:215`) suggests empty input is an expected state, yet the effect above it cannot tolerate it.
**Fix:**
```ts
if (series === null || candles.length === 0) return;
```

### WR-08: Envelope guard accepts unparseable `lastUpdatedISO` — throw pushed downstream

**File:** `src/lib/store.ts:40-58`, `src/lib/freshness.ts:24-30`
**Issue:** `isValidEnvelope` requires `lastUpdatedISO` to be a string but never checks it parses to a finite timestamp, while `deriveStatus` throws on unparseable input. A malformed envelope is stored as valid and every consumer must defensively try/catch (both current call sites do, but any new selector will throw at render time).
**Fix:** Validate at the boundary in `isValidEnvelope`:
```ts
if (typeof env.lastUpdatedISO !== 'string' || !Number.isFinite(new Date(env.lastUpdatedISO).getTime())) return false;
```

## Info

### IN-01: Self-referential CSS custom properties on the chart container are no-ops

**File:** `components/charts/nq-chart.tsx:187-193`
**Issue:** The style sets `'--terminal-up': 'var(--terminal-up)'` (and same for down) — assigning a variable to itself on the same element, which resolves from the inherited value and changes nothing. The canvas colors are read from `documentElement` at mount anyway. Harmless but misleading.
**Fix:** Remove the two self-referential entries; keep only `backgroundColor`.

### IN-02: `propsRef.current` is written during render

**File:** `components/charts/nq-chart.tsx:42-43`
**Issue:** Assigning a ref during render is impure under concurrent rendering (a torn or abandoned render can leave a stale/current mismatch). The established pattern is assignment inside an effect.
**Fix:** Move `propsRef.current = {...}` into a `useEffect` (or `useLayoutEffect`) with the props as dependencies.

### IN-03: Dead exports — `buildZoneOverlayFallback` and `Toaster` are never imported

**File:** `components/charts/zone-primitive.ts:158-166`, `components/ui/toast.tsx:200-215`
**Issue:** `buildZoneOverlayFallback` (the sanctioned D-11 fallback) has no call site — if the primitive path overruns, nothing falls back. `Toaster` (the correctly wired provider) is bypassed by `app/page.tsx` in favor of manual wiring (see CR-01).
**Fix:** Either wire the fallback into `NqChart`'s error path or document it as intentionally reserved; fix CR-01 by using `Toaster`.

### IN-04: Calendar list keys use event names — collision if names repeat

**File:** `components/dashboard/calendar-panel.tsx:67`
**Issue:** `key={item.event}` collides if two events ever share a name, causing React to reuse DOM nodes across rows. Fixture data has unique names today.
**Fix:** `key={`${item.event}-${item.startsAt}`}`.

### IN-05: Dealing-range buffer thresholds are magic numbers in the report

**File:** `components/dashboard/report.tsx:28-32`
**Issue:** `0.48` / `0.52` duplicate domain knowledge inline; if the ICT position semantics change, this drifts silently from `computePosition`.
**Fix:** Export named constants (e.g. `POSITION_BUFFER = 0.02`) from the ICT range module and import them here.

### IN-06: `selectBias` mixes forming-inclusive regime with closed-only range

**File:** `src/lib/store.ts:152-161`
**Issue:** `selectRange`/`computePosition` operate on closed candles only, but `selectBias` feeds `computeRegime(candles)` the full array including the forming candle. Verify this asymmetry is intentional (regime reacts to live price while range stays closed-only) and, if so, leave a one-line comment stating it; otherwise filter with `closedOnly` for consistency.
**Fix:** Comment or `computeRegime(closedOnly(candles))` per intended semantics.

---

_Reviewed: 2026-09-05T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
