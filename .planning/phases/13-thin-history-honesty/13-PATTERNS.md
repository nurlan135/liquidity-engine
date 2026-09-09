# Phase 13: thin-history-honesty - Pattern Map

**Mapped:** 2026-09-09
**Files analyzed:** 4 (1 new, 3 modified)
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/thin-tier.ts` (NEW) | utility | transform | `src/lib/ict/regime.ts` | role-match |
| `components/dashboard/terminal-shell.tsx` (EDIT) | component | request-response | self (`terminal-shell.tsx` lines 244-290) | exact |
| `components/charts/nq-chart.tsx` (EDIT) | component | event-driven (canvas effects) | self (`nq-chart.tsx` stale precedents) | exact |
| `components/charts/zone-primitive.ts` (EDIT) | utility | event-driven (canvas primitive) | self (`zone-primitive.ts` lines 35-108) | exact |

## Pattern Assignments

### `src/lib/thin-tier.ts` (NEW) (utility, transform)

**Analog:** `src/lib/ict/regime.ts`

**Imports pattern** (regime.ts lines 1-6):
```typescript
import type { Candle, RegimeOutput, RegimeState } from '@/src/lib/ict/types';
import { closedOnly } from '@/src/lib/ict/types';

export const ATR_PERIOD = 14;
export const REGIME_AVG_WINDOW = 20;
export const MIN_CANDLES_FULL = 34;
```

New helper copies this shape: import `ANCHOR_WINDOW` from `@/src/lib/ict/range` (range.ts line 4: `export const ANCHOR_WINDOW = 20;`), import `MIN_CANDLES_FULL` from `@/src/lib/ict/regime` (regime.ts line 6), import `closedOnly` + `Candle` type from `@/src/lib/ict/types` (types.ts lines 47-49). Define zero local threshold literals per D-11.

**Core pattern** — honest-degrade rationale with counts (regime.ts lines 42-51):
```typescript
export function computeRegime(candles: Candle[]): RegimeOutput {
  const closed = closedOnly(candles);
  if (closed.length < MIN_CANDLES_FULL) {
    return {
      regime: 'compression',
      rationale: `Insufficient history (${closed.length} of ${MIN_CANDLES_FULL} closed candles): honest degrade to compression until the ATR window fills.`,
      atr: 0,
      avg: 0,
    };
  }
```

Copy: `thinTier(closedCount: number): ThinTier` with `if (closedCount < ANCHOR_WINDOW) return 'range-thin'; if (closedCount < MIN_CANDLES_FULL) return 'regime-degraded'; return 'full';` — the same `<` boundary form. Boundary pins: exactly 20 → regime-degraded, exactly 33 → regime-degraded, exactly 34 → full. `range-thin ⟺ thinHistory === true` (range.ts line 25: `thinHistory: closed.length < window` — same predicate, no drift).

**Test pattern** — fixture builders + boundary pins:
- `src/lib/ict/regime.test.ts` lines 11-22 (`flatCandle`/`flatSeries` builders), lines 36-44 (thin-degrade test), lines 76-83 (forming-exclusion test), lines 85-89 (pinned-constants test asserting `MIN_CANDLES_FULL === 34`).
- `src/lib/ict/range.test.ts` lines 5-16 (`candle`/`trend` builders), lines 81-87 (forming-excluded test).
Copy: `thin-tier.test.ts` with candle fixtures at 5/19/20/25/33/34/40 closed counts, forming-exclusion case (20-row array with 1 forming = 19 closed = range-thin), pinned-constants test (`ANCHOR_WINDOW === 20`, `MIN_CANDLES_FULL === 34`).

---

### `components/dashboard/terminal-shell.tsx` (EDIT) (component, request-response)

**Analog:** self — `components/dashboard/terminal-shell.tsx` lines 244-290

**Banner pattern to copy verbatim** (lines 245-252):
```tsx
{rollover !== null && (rollover.rolloverSuspect || rollover.proximityWarning !== null) ? (
  <div data-slot="rollover-banner" role="status" className="rounded px-3 py-2 font-mono text-[11px] tracking-widest text-muted-foreground">
    {rollover.rolloverSuspect
      ? `ROLLOVER SUSPECT · ${rollover.contractHint} — range may span a contract roll; levels held on current extremes.`
      : `ROLLOVER WATCH · ${rollover.contractHint}`}
    {rollover.proximityWarning !== null ? <span>{` ${rollover.proximityWarning}`}</span> : null}
  </div>
) : null}
```

New thin block mirrors it byte-identically: `data-slot="thin-history-banner"`, `role="status"`, `className="rounded px-3 py-2 font-mono text-[11px] tracking-widest text-muted-foreground"`, plus `data-tier={tier}` and `data-closed-count={closedCount}` assertion hooks. Condition: `candles.length >= 1 && range !== null && tier !== 'full'` (D-04; null-range guard per store.ts lines 607-611 — null = empty/unknown, not thin). Stack contract: when both banners show, wrap in `flex flex-col gap-2` with thin first, rollover second; single-banner case renders the bare block with no wrapper. Placement: inside `CardContent` above the chart render branch (lines 244-290).

**Selector pattern to copy** (lines 45-47):
```tsx
const range = useDashboard(useShallow((s) => s.selectRange()));
const dol = useDashboard(useShallow((s) => s.selectDOL()));
const rollover = useDashboard(useShallow((s) => s.selectRollover()));
```
Copy: derive tier during render from `range` + `closedOnly(candles).length`. `closedOnly` lives at `src/lib/ict/types.ts` lines 47-49: `export function closedOnly(candles: Candle[]): Candle[] { return candles.filter((c) => !c.forming); }`.

**Render-chain pattern** (lines 253-290): `lastUpdatedISO === null → chart-skeleton`; `candles.length === 0 → chart-empty` ("Məlumat yoxdur" + Yenilə, lines 256-262); `range !== null && dol !== null → NqChart` invocation (lines 263-281); else second `chart-empty` (lines 283-289). Thin branch slots between zero-candle empty and full render — banner renders above `NqChart`, never replacing `chart-empty`.

**NqChart invocation to extend** (lines 264-281): add one prop `thinTier={tier ?? 'full'}` alongside existing `overlayStale={overlayStale}`. Also add `data-thin-tier` attr requirement — planner note: the attr lives on the `div[data-slot="nq-chart"]` inside `nq-chart.tsx`, not in the shell.

**Error pattern** (lines 137-145): coalesced toast per error value; thin-plumbing failures degrade silently — banner missing must never blank the chart (wrap tier derivation so a throw falls back to no-banner + full-strength chart).

---

### `components/charts/nq-chart.tsx` (EDIT) (component, event-driven canvas)

**Analog:** self — stale dimming precedents in `components/charts/nq-chart.tsx`

**Props pattern** (lines 13-34): extend `NqChartProps` with `thinTier?: 'full' | 'range-thin' | 'regime-degraded'` (optional to keep existing callers safe; planner's call per RESEARCH open question 1). Destructure with default in signature (line 106 pattern): `thinTier = 'full'`.

**propsRef sync pattern** (lines 124-129) — MUST extend in all three places (Pitfall 4):
```typescript
const propsRef = useRef({ candles, rangeHigh, rangeLow, eq, dolPrice, dolName, status, forming, levels, asiaHigh, asiaLow, judas, judasBarDate, smt, smtBarDate, overlayStale });
useEffect(() => {
  propsRef.current = { candles, rangeHigh, rangeLow, eq, dolPrice, dolName, status, forming, levels, asiaHigh, asiaLow, judas, judasBarDate, smt, smtBarDate, overlayStale };
});
```
Add `thinTier` to the object literal + dep array at line 461, else the zone getter/effects read stale tier (banner right, canvas wrong).

**Stale-tone precedent for level dimming** (line 196):
```typescript
const asiaColor = props.overlayStale ? MUTED_GRAY : accent;
```
with `MUTED_GRAY = '#71717A'` (line 59). Copy: `const dimmed = thinTier !== 'full'; const levelColor = dimmed ? MUTED_GRAY : accent;` applied to EQ/DOL lines (mount lines 175-188, update lines 356-369) and Q1/Q3/OTE lines (mount lines 236-263, update lines 373-400). Line widths/styles/titles unchanged — color-only diff. Asia lines (lines 193-215, 410-431) and marker code (lines 219-230, 434-454) must NOT be touched (D-06).

**Remove-then-create cycle** (update effect lines 339-352):
```typescript
if (eqLineRef.current !== null) live.removePriceLine(eqLineRef.current);
if (dolLineRef.current !== null) live.removePriceLine(dolLineRef.current);
...
const accent = readVar(VAR_ACCENT, '#00D9FF');
const overlayTone = overlayStale ? MUTED_GRAY : accent;
```
Stay with this cycle for recolor (matches overlayStale precedent, zero new pattern). `IPriceLine.applyOptions` exists as an alternative but is not the house pattern.

**Zone dimming precedent** (line 293 mount, lines 457-460 update):
```typescript
zoneRef.current.opacityScale = props.status === 'stale' ? 0.5 : 1;
// update effect:
if (zoneRef.current !== null) {
  zoneRef.current.opacityScale = status === 'stale' ? 0.5 : 1;
  zoneRef.current.updateBands();
}
```
Becomes `(status === 'stale' || dimmed) ? 0.5 : 1` — single muted treatment, stale + thin never compound (D-10). No-op until the zone-primitive snapshot fix lands — order that task first (Pitfall 1).

**Dead-flag cleanup** (lines 280-287): zone getter hardcodes `thinHistory: false`. Note the actual `zoneBands()` signature is `zoneBands(range: DealingRange)` (src/lib/zone-bands.ts line 16 — takes the whole range object, pure geometry, ignores the flag), so the call at nq-chart lines 280-287 passes an object literal `{ high, low, eq, window: 0, asOf: '', thinHistory: false }`. Pass live state or drop the dead field; never leave a literal `false` beside real thin logic.

**Module-top / cleanup patterns:** `readVar` guards `typeof window === 'undefined'` (lines 41-45) — all thin logic sits inside effects/render, no top-level `window`. Mount-effect cleanup (lines 297-322) disposes chart + nulls refs. Lazy imports via `await import('lightweight-charts')` (line 138) keep the module top DOM-free.

**Container attr** (lines 479-490): add `data-thin-tier={thinTier}` to the `div[data-slot="nq-chart"]`.

---

### `components/charts/zone-primitive.ts` (EDIT) (utility, event-driven canvas)

**Analog:** self — `components/charts/zone-primitive.ts` lines 35-129

**Defect to fix (Pitfall 1, REQUIRED before any dimming task):** `attached()` snapshots opacity into the view (lines 102-108):
```typescript
attached(param: SeriesAttachedParameter<Time>): void {
  this.series = param.series as ISeriesApi<SeriesType>;
  this.chart = param.chart;
  this.requestUpdate = param.requestUpdate;
  this.views.length = 0;
  this.views.push(new ZoneFillView(param.series, this.getBands, this.opacityScale));
}
```
while `ZoneFillRenderer` stores it as constructor `readonly` (lines 35-44) and `updateBands()` only fires `requestUpdate` (lines 126-128) without re-reading the field. Setting `opacityScale = 0.5` after attach is a silent no-op.

**Fix pattern:** make the view/renderer read `primitive.opacityScale` live — pass a scale-getter `() => number` or the primitive reference instead of the number snapshot through `ZoneFillView` (lines 74-84) into `ZoneFillRenderer` (lines 35-44), and read it in `draw()` at line 57 (`const opacityScale = this.opacityScale;` → live read). Keep `opacityScale = 1` default (line 96) and the stale path byte-identical — stale uses the same field, so existing behavior is preserved. Add a unit/render assertion that mutating the field changes draw alpha.

**Untouched:** `buildZoneOverlayFallback` (lines 157-165, sanctioned executor fallback) is out of scope.

---

## Shared Patterns

### Tier derivation (D-11 single source of truth)
**Source:** `src/lib/ict/range.ts:4` (`ANCHOR_WINDOW = 20`) + `src/lib/ict/regime.ts:6` (`MIN_CANDLES_FULL = 34`) + `src/lib/ict/types.ts:47-49` (`closedOnly`)
**Apply to:** `src/lib/thin-tier.ts`, shell derivation
```typescript
import { ANCHOR_WINDOW } from '@/src/lib/ict/range';
import { MIN_CANDLES_FULL } from '@/src/lib/ict/regime';
import { closedOnly } from '@/src/lib/ict/types';
```
Never `closed < 20` / `closed < 34` literals in UI code. Never `candles.length` as the tier count — always `closedOnly(candles).length`.

### Banner chrome (D-01/D-02)
**Source:** `components/dashboard/terminal-shell.tsx:245-252`
**Apply to:** thin-history banner block
`rounded px-3 py-2 font-mono text-[11px] tracking-widest text-muted-foreground` + `role="status"`. Stack wrapper `flex flex-col gap-2` only when both banners show, thin first. Verbatim copy per tier from UI-SPEC: range-thin `Nazik tarixçə · {N} / 20 şam — ekstremumlar etibarsızdır, zonalar və səviyyələr ilkin göstərilir.` / regime-degraded `Sıxılma · {N} / 34 şam — tarixçə tam deyil, zonalar və səviyyələr ilkin göstərilir.`

### Canvas dimming (D-05/D-06/D-10)
**Source:** `components/charts/nq-chart.tsx:196` (tone swap) + `:293,:457-460` (opacityScale 0.5) + `:59` (`MUTED_GRAY = '#71717A'`)
**Apply to:** zone fills + EQ/DOL/Q1/Q3/OTE lines only
One boolean `dimmed = tier !== 'full'`; `opacityScale = (stale || dimmed) ? 0.5 : 1`; `levelColor = dimmed ? MUTED_GRAY : accent`. Asia/Judas/SMT/markers/candles untouched.

### Degrade-silent (interaction rule 5)
**Source:** `components/charts/nq-chart.tsx:219-230, 434-454` (marker try/catch), `terminal-shell.tsx:96-104` (chartStatus try/catch falls back to `'stale'`)
```typescript
} catch {
  markersPluginRef.current = null;
}
```
**Apply to:** all new thin plumbing — banner missing must never blank the chart; thin failure renders full-strength chart with no banner.

### Test fixtures (D-08)
**Source:** `src/lib/ict/regime.test.ts:11-22,76-89` + `src/lib/ict/range.test.ts:5-16,81-87`
**Apply to:** `src/lib/thin-tier.test.ts`
vitest 5, node env, `src/**/*.test.ts` include. Fixture counts: 5, 19, 20, 25, 33, 34, 40 closed. Run: `npm test -- --run src/lib/thin-tier.test.ts`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | — | — | All 4 files have in-repo analogs (3 are self-analogs). Canvas dimming assertions are manual-only (human glance per D-08) — node vitest env cannot drive lightweight-charts canvas; planner should note this rather than invent a DOM test harness. |

## Metadata

**Analog search scope:** `components/dashboard/`, `components/charts/`, `src/lib/ict/`, `src/lib/` (store, zone-bands, chart-mapper)
**Files scanned:** 10 (6 source + 2 test + CONTEXT/RESEARCH/UI-SPEC inputs)
**Pattern extraction date:** 2026-09-09
**Tracked-source gate:** all analog paths verified via `git ls-files` (non-empty = tracked)
**Most recent pattern source:** `nq-chart.tsx` / `terminal-shell.tsx` touched by Phase 11 commit `3b199de` — current patterns, not legacy
