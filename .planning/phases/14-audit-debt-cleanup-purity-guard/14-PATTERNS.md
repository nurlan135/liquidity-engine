# Phase 14: Audit Debt Cleanup + Purity Guard - Pattern Map

**Mapped:** 2026-09-09
**Files analyzed:** 6 (3 modified sources, 2 modified tests, 1 new test, 1 doc note site)
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/zone-bands.ts` (narrow signature) | utility | transform | `src/lib/zone-bands.ts` itself (self-analog) | exact |
| `components/charts/nq-chart.tsx` L292-299 (dead-arg call) | component | request-response | `components/charts/nq-chart.tsx` itself (self-analog) | exact |
| `src/lib/thin-tier.ts` (unexport 2 symbols) | utility | transform | `src/lib/thin-tier.ts` itself (self-analog) | exact |
| `src/lib/zone-bands.test.ts` (minimal objects) | test | transform | `src/lib/zone-bands.test.ts` itself (self-analog) | exact |
| `src/lib/thin-tier.test.ts` (migrate to resolveThinTier) | test | transform | `src/lib/thin-tier.test.ts` itself (self-analog) | exact |
| `src/lib/ict/purity.test.ts` (NEW grep guard) | test | file-I/O | `vitest.config.ts` + `src/lib/ict/asia.test.ts` (conventions) | role-match |
| Asia note (doc comment at fallback site) | config (doc-only) | request-response | `src/lib/store.ts` L713-718 + `src/lib/ict/asia.ts` L6-11 (header comments) | exact |

## Pattern Assignments

### `src/lib/zone-bands.ts` (utility, transform)

**Analog:** `src/lib/zone-bands.ts` (self — narrow in place)

**Current signature + body** (lines 1, 16-32):
```typescript
import type { DealingRange } from '@/src/lib/ict/types';
// ...
export function zoneBands(range: DealingRange): ZoneBands {
  if (!isFiniteNumber(range.high) || !isFiniteNumber(range.low) || !isFiniteNumber(range.eq)) {
    throw new Error('zoneBands requires finite high, low, and eq');
  }
  if (range.high < range.low) {
    throw new Error('zoneBands requires high >= low');
  }
  if (range.eq < range.low || range.eq > range.high) {
    throw new Error('zoneBands requires eq inside the high/low span');
  }
  return {
    premiumTop: range.high,
    premiumBottom: range.eq,
    discountTop: range.eq,
    discountBottom: range.low,
  };
}
```

**Copy pattern:** Replace the `DealingRange` import with a minimal structural input. Body reads only `range.high` / `range.low` / `range.eq` (lines 17, 26-30) — `window`, `asOf`, `thinHistory` are never touched, so narrowing to `Pick<DealingRange, 'high' | 'low' | 'eq'>` (or a local `{ high: number; low: number; eq: number }`) is zero-behavior-change. Validation logic and error strings stay verbatim.
**Do NOT touch:** `src/lib/ict/range.ts` / `src/lib/ict/types.ts` — `DealingRange.thinHistory` stays (D-02, read-only this phase).

---

### `components/charts/nq-chart.tsx` L292-299 (component, request-response)

**Analog:** `components/charts/nq-chart.tsx` (self — trim the call)

**Call site** (lines 289-305):
```typescript
() => {
  const latest = propsRef.current;
  try {
    return zoneBands({
      high: latest.rangeHigh,
      low: latest.rangeLow,
      eq: latest.eq,
      window: 0,                                   // DELETE (dead filler)
      asOf: '',                                    // DELETE (dead filler)
      thinHistory: latest.thinTier === 'range-thin', // DELETE (unread key)
    });
  } catch {
    return null;
  }
},
);
zoneRef.current.opacityScale = props.status === 'stale' || dimmed ? 0.5 : 1;
```

**Copy pattern:** Delete the three dead keys (L296-298); keep the `try/catch → null` wrapper and the L305 `opacityScale` dimming line untouched — that line is the DEBT-01 "dimming still flows" proof. The L486 second `opacityScale` assignment is a separate effect block, out of scope.

---

### `src/lib/thin-tier.ts` (utility, transform)

**Analog:** `src/lib/thin-tier.ts` (self — drop `export` keyword x2)

**Symbols to unexport** (lines 8, 40):
```typescript
export function thinTier(closedCount: number): ThinTier {   // line 8 → drop `export`
export type ThinBannerEntry = 'thin' | 'rollover';          // line 40 → drop `export`
```

**Copy pattern:** `thinTier` stays as the module-internal helper called by `resolveThinTier` (line 34: `return { tier: thinTier(closedCount), closedCount };`). `ThinBannerEntry` stays as the internal return-type annotation of `thinBannerOrder` (line 42). Public surface after cleanup: `ThinTier`, `thinTierCopy`, `resolveThinTier`, `thinBannerOrder` only. Named-only exports convention preserved.
**Precondition (D-03):** grep must show zero external importers of `thinTier` / `ThinBannerEntry` before unexporting. Confirmed importer surface today: `components/dashboard/terminal-shell.tsx` L17 imports only `resolveThinTier, thinBannerOrder, thinTierCopy`; the test file is the only other importer of `thinTier` (migrated in the same phase).

---

### `src/lib/zone-bands.test.ts` (test, transform)

**Analog:** `src/lib/zone-bands.test.ts` (self — shrink literals)

**Current literals** (lines 7, 16, 19, 22, 28, 31):
```typescript
const bands = zoneBands({ high: 100, low: 0, eq: 50, window: 20, asOf: '2026-09-04', thinHistory: false });
```

**Copy pattern:** Replace every 6-key literal with `{ high: 100, low: 0, eq: 50 }` (and NaN/Infinity/out-of-span variants likewise). Assertions stay verbatim. Co-located `<module>.test.ts` convention; `vitest` `describe/it/expect` imports (line 1) unchanged.

---

### `src/lib/thin-tier.test.ts` (test, transform)

**Analog:** `src/lib/thin-tier.test.ts` (self — migrate entry point)

**Boundary pins to migrate** (lines 30-42):
```typescript
it('pins the boundary tiers: 19 thin, 20 degraded, 33 degraded, 34 full', () => {
  expect(thinTier(19)).toBe('range-thin');
  expect(thinTier(20)).toBe('regime-degraded');
  expect(thinTier(33)).toBe('regime-degraded');
  expect(thinTier(34)).toBe('full');
});

it('range-thin holds exactly when closed count is below ANCHOR_WINDOW (same predicate as computeRange thinHistory)', () => {
  for (const n of [1, 5, 19, 20, 25, 33, 34, 40]) {
    const range = computeRange(flatSeries(n), '2026-03-01');
    expect(thinTier(n) === 'range-thin').toBe(range.thinHistory);
  }
});
```

**Copy pattern:** Reuse the file's own helpers — `flatSeries(n)` (lines 16-23) builds n closed candles, `anyRange()` (lines 25-27) supplies a non-null range — and assert via the public entry:
```typescript
expect(resolveThinTier(flatSeries(19), anyRange())).toEqual({ tier: 'range-thin', closedCount: 19 });
```
Keep the exact-boundary set (19/20/33/34) and the `thinTier(n) === 'range-thin'` ⇔ `range.thinHistory` predicate-equivalence loop, rewritten through `resolveThinTier(...).tier`. Drop `thinTier` from the line 5-10 import block. Never-throw / null-input tests (lines 60-63) already use `resolveThinTier` — the established style to copy.

---

### `src/lib/ict/purity.test.ts` NEW (test, file-I/O)

**Analog:** `vitest.config.ts` (test-runner convention) + `src/lib/ict/asia.test.ts` (naming/style)

**Runner constraint** (`vitest.config.ts` lines 6-8):
```typescript
test: {
  environment: 'node',
  include: ['src/**/*.test.ts', 'app/**/*.test.ts'],
```

**Copy pattern:** Co-locate as `src/lib/ict/purity.test.ts` so the `include` glob picks it up with zero config change. `environment: 'node'` means Node builtins are available — but no `node:fs` source-read precedent exists in `src/**` (only `scripts/resolve-alias.mjs` uses `node:fs`), so prefer `import.meta.glob('./*.ts', { query: '?raw', import: 'default' })` (Vite-native raw import, no fs dependency) with an `fs` fallback only if the glob proves unworkable. Follow `asia.test.ts` `describe/it/expect` style.
**Minimal assertion set (D-06):** fail on `Date.now(` and store imports (`from 'zustand'`, `from '@/src/lib/store'`, `@/store`-style paths) in every `src/lib/ict/*.ts` source (excluding `*.test.ts` self-scans). Do NOT assert `new Date(`, `performance.now(`, `fetch(` — future trigger code needs injected-time patterns and these would false-positive. Verified green baseline today: zero `Date.now`/`new Date` in `src/lib/ict` (note: `asia.ts` L78 legitimately uses `new Date(Date.UTC(...))` for calendar validation — this is exactly why `new Date(` is excluded from the pattern set).

---

### Asia note, doc-only (D-07)

**Analog:** `src/lib/store.ts` L713-718 (fallback rationale comment) + `src/lib/ict/asia.ts` L6-11 (module header)

**Fallback site comment** (`src/lib/store.ts` lines 713-718):
```typescript
// Candidate session dates, newest first: the latest candle's NY date,
// then the distinct earlier NY dates in the data (bounded walk — at
// most 8 back so a sparse leg cannot scan unbounded history). The
// newest date's Asia window is often still empty in the morning (the
// 20:00 open is hours away), so fall back to the most recent completed
// session instead of returning null.
```

**Copy pattern:** Extend the comment at this fallback site (or add a short note adjacent) explaining the Asia fallback — 20:00–23:45 killzone + last-completed-session fallback (edbc70a) — and why it increases overlay frequency by design. No logic change, no new code. Follow the existing terse `//`-comment voice, not JSDoc.

---

## Shared Patterns

### Named-only exports (shared modules)
**Source:** `src/lib/thin-tier.ts` lines 6, 14, 21, 26, 42
**Apply to:** `src/lib/thin-tier.ts`, `src/lib/zone-bands.ts`, `src/lib/ict/purity.test.ts` (no default exports)
```typescript
export type ThinTier = 'range-thin' | 'regime-degraded' | 'full';
export function thinTierCopy(...) ...
export function resolveThinTier(...) ...
export function thinBannerOrder(...) ...
```

### Pure-module discipline (`src/lib/ict` + `src/lib`)
**Source:** `src/lib/ict/asia.ts` lines 6-11 (header contract comment)
**Apply to:** `zoneBands` narrowing, `thin-tier` unexport, purity guard
```typescript
// ICT-12 (D-01/D-02/D-03/D-04): Asia Range from 1H NQ closed candles on the
// 20:00-23:45 NY wall-clock killzone window ...
// ... Pure: caller-supplied rows plus a sessionDate string only — no clock
// reads, no store imports, no ES input, no comparison parameters.
```
All touched modules stay pure: no clock reads, no store imports, caller-injected inputs only. The purity test enforces this mechanically.

### Never-throw public entries
**Source:** `src/lib/thin-tier.ts` lines 30-37 (`resolveThinTier` try/catch → null)
**Apply to:** test migration (assert `resolveThinTier` null-behavior, not throws)
```typescript
try {
  if (range === null || range === undefined) return null;
  if (!Array.isArray(candles)) return null;
  const closedCount = closedOnly(candles).length;
  return { tier: thinTier(closedCount), closedCount };
} catch {
  return null;
}
```

### Co-located tests, 298/298 green
**Source:** `vitest.config.ts` include glob + existing `*.test.ts` siblings
**Apply to:** all test edits + new `src/lib/ict/purity.test.ts`
```typescript
import { describe, expect, it } from 'vitest';
```

## No Analog Found

None — every file reuses its own current shape (mechanical cleanup) or established test conventions. No RESEARCH.md patterns needed.

## Metadata

**Analog search scope:** `src/lib/`, `src/lib/ict/`, `components/charts/nq-chart.tsx`, `components/dashboard/terminal-shell.tsx`, `vitest.config.ts`
**Files scanned:** 10 (zone-bands + test, thin-tier + test, nq-chart call site, terminal-shell imports, asia.ts, types.ts, store.ts fallback, vitest config)
**Git-tracked gate:** all analog paths verified via `git ls-files` (non-empty = tracked)
**Pattern extraction date:** 2026-09-09
