# Phase 22: Pool Lifecycle + Decay (POOL2-04) - Pattern Map

**Mapped:** 2026-10-26
**Files analyzed:** 4 (all modifications, zero new files)
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/ict/pools.ts` | pure domain module (constants + helpers + scorer) | request-response (injected `Candle[]` + `asOf` string → deterministic output) | self (`src/lib/ict/pools.ts` lines 15-35, 210-245, 327-397) | exact |
| `src/lib/ict/pools.test.ts` | test (unit boundary pins) | batch (fixture builders → assertions) | self (`src/lib/ict/pools.test.ts` lines 23-40, 414-469) | exact |
| `src/lib/store.ts` | store (Zustand preview slice + selector) | request-response (state read → envelope or null) | self (`src/lib/store.ts` lines 69-99, 943-973, 1179-1275) | exact |
| `components/dashboard/calibration-sandbox.tsx` | component (sandbox panel) | request-response (preview state → knobs → Apply/Reset) | self (`components/dashboard/calibration-sandbox.tsx` lines 59-136, 213-257) | exact |

## Pattern Assignments

### `src/lib/ict/pools.ts` (pure domain module, request-response)

**Analog:** self — `src/lib/ict/pools.ts`

**Imports pattern** (lines 6-9):
```typescript
import type { Candle } from '@/src/lib/ict/types';
import { closedOnly } from '@/src/lib/ict/types';
import { computeATR } from '@/src/lib/ict/regime';
import { isSwingHigh, isSwingLow, SWING_K, SWING_LOOKBACK } from '@/src/lib/ict/swings';
```
New decay code adds zero imports — pure arithmetic over the already-in-scope `closed` window. No `date-fns`, no store imports (purity guard).

**Constant pattern** (lines 24-35) — copy verbatim for the two new constants:
```typescript
/** Scorer boost when the pool side matches the DOL direction (D-07). */
// CALIBRATION-PROVISIONAL: seeded 2026-09-16, unobserved live. Phase 21 reviews against firing log.
export const DOL_BOOST = 2.0;
```
New:
```typescript
/** Scorer half-life in D1 bars (Phase 22 D-02). */
// CALIBRATION-PROVISIONAL: seeded 2026-10-26, unobserved live. Firing-log band review (1-4/week), never tuned to pass tests.
export const DECAY_HALF_LIFE_BARS = 10;
/** Score floor for ancient ACTIVE pools (Phase 22 D-03). */
export const DECAY_SCORE_FLOOR = 0.25;
```

**Age-count idiom** (lines 84-86 + 220-222) — the locked D1-bar counting pattern:
```typescript
function originIndexOrNeg1(closed: Candle[], originDate: string): number {
  return closed.findIndex((c) => c.date === originDate);
}
// ...
for (let j = origin + 1; j < closed.length; j++) {
  const c = closed[j];
  if (c.date > asOf) continue;
```
New `poolAgeBars(pool, closed, asOf)` reuses the same string-compare guard: `closed.filter((c) => c.date > pool.originDate && c.date <= asOf).length`, with `-1 → age 0, decay 1.0` neutral on unknown origins. Never `parseISO`/day-diff (weekends would age pools).

**Core scorer pattern** (lines 367-386) — one multiplier + one ledger field:
```typescript
const scored = active.map((pool) => {
  const mid = poolMid(pool);
  const distAtr = Math.abs(mid - lastClose) / atr;
  const dolBoost = pool.side === boosted ? DOL_BOOST : 1.0;
  const behind =
    (pool.side === 'BSL' && mid < lastClose) || (pool.side === 'SSL' && mid > lastClose);
  const behindPenalty = behind ? BEHIND_PENALTY : 1.0;
  const score = (pool.weight * dolBoost * behindPenalty) / (1 + distAtr);
```
New: add `const ageBars = ...; const decayFactor = Math.max(1 / (1 + ageBars / DECAY_HALF_LIFE_BARS), DECAY_SCORE_FLOOR);` and extend the formula to `weight * dolBoost * behindPenalty * decayFactor / (1 + distAtr)`, plus `decayFactor` in the `PoolScore` entry beside `dolBoost`/`behindPenalty`. `PoolScore` shape lives at lines 56-64; `zeroScores` at lines 334-342 must gain `decayFactor: 1.0` so the refuse-to-rank ledger stays finite.

**Signature threading:** `scoreAndRank(pools, closed, bias)` (line 327-331) has no `asOf` today; the only in-module caller is `evaluatePools` line 437 (`scoreAndRank(kept, window, bias).pools`), and tests call it at `pools.test.ts:431,444,460` with `(pools, candles, bias)`. Planner MUST thread `asOf: string` through `scoreAndRank` + the `evaluatePools` tail call + the three test call sites (additive param, parity-safe — no trigger/flaw/ticket/selector signature changes).

**Error handling pattern** (lines 343-361): refuse-to-rank returns originDate-ordered pools + zero scores + `rankSkipped: true` on empty input / empty ATR / non-finite ATR / non-finite lastClose — never NaN. Decay helper must be 1.0-neutral on that path.

---

### `src/lib/ict/pools.test.ts` (test, batch)

**Analog:** self — `src/lib/ict/pools.test.ts`

**Builder idiom** (lines 23-40):
```typescript
function leg(n: number, highs: number[], lows: number[], startDay = 5): Candle[] {
  if (highs.length !== n || lows.length !== n) {
    throw new Error(`leg requires ${n} highs and lows, got ${highs.length}/${lows.length}`);
  }
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const day = String(startDay + i).padStart(2, '0');
    const mid = (highs[i] + lows[i]) / 2;
    out.push({ date: `2026-01-${day}`, open: mid, high: highs[i], low: lows[i], close: mid });
  }
  return out;
}
const AS_OF = '2026-01-31';
```

**Scorer-pin idiom** (lines 428-448) — copy for the new `describe('pool decay')` block:
```typescript
it('DOL-side score doubles versus the identical off-side pool', () => {
  expect(DOL_BOOST).toBe(2.0);
  const candles = leg(16, ...);
  const bullish: RankedPools = scoreAndRank(evaluatePools(candles, AS_OF), candles, 'BULLISH');
  expect(bullish.rankSkipped).toBe(false);
  ...
});
```
New block (~10 boundary tests per RESEARCH §Validation): decay(0)=1, decay(10)=0.5, floor holds at age 60+, fresh-outscores-aged-self, ancient ACTIVE never scores 0, weight/touches byte-identical pre/post, double-run `JSON.stringify` determinism, ghost originDate order unchanged. FORBIDDEN: Rank-1-flip assertions (Pitfall 6 tune-bait) — assert score-ordering properties only.

---

### `src/lib/store.ts` (store, request-response)

**Analog:** self — `src/lib/store.ts`

**Knob-bounds pattern** (lines 76-84):
```typescript
export const CALIBRATION_MERGE_MIN = 0.05;
export const CALIBRATION_MERGE_MAX = 1.0;
export const CALIBRATION_MERGE_STEP = 0.05;
```
New (RESEARCH A2 proposal): `CALIBRATION_DECAY_HALF_LIFE_MIN/MAX = 1/30` step 1 (int), `CALIBRATION_DECAY_FLOOR_MIN/MAX/STEP = 0/0.9/0.05`.

**Preview-slice pattern** (lines 90-99): add `decayHalfLifeBars: number; decayFloor: number;` to `CalibrationPreview`; seed both from the new pinned constants in the initial state (lines 604-611 idiom: `mergeAtrMult: MERGE_ATR_MULT, dolBoost: DOL_BOOST, ...`).

**Setter pattern** (lines 1206-1220) — one clamped setter per knob, NaN-refused, preview-only:
```typescript
setCalibrationMergeAtrMult: (mult) => {
  if (typeof mult !== 'number' || !Number.isFinite(mult)) return;
  const clamped = Math.min(CALIBRATION_MERGE_MAX, Math.max(CALIBRATION_MERGE_MIN, mult));
  set({ calibrationPreview: { ...get().calibrationPreview, mergeAtrMult: clamped } });
},
```
New: `setCalibrationDecayHalfLifeBars` (round to int) + `setCalibrationDecayFloor` following the same shape. No derivation reads preview.

**Apply/Reset pattern** (lines 1235-1275): extend `applyCalibrationPreview` and `resetCalibrationPreview` re-seed objects with the two new pinned-constant fields. Never rewrite constants.

**Selector pattern** (lines 953-973): `selectPools` is untouched — decay needs no `es.stale` read, no `rankSkipped` handling change. `evaluatePools(nq.candles, asOfBaku)` call at line 965 keeps working (evaluatePools signature unchanged; it threads asOf internally).

---

### `components/dashboard/calibration-sandbox.tsx` (component, request-response)

**Analog:** self — `components/dashboard/calibration-sandbox.tsx`

**Pristine pattern** (lines 129-136) — compares against imported pinned constants, never literals:
```typescript
const pristine =
  preview.kzStartMin === TRIGGER_KZ_START_MIN &&
  ...
  preview.dolBoost === DOL_BOOST &&
  preview.behindPenalty === BEHIND_PENALTY;
```
New: append `preview.decayHalfLifeBars === DECAY_HALF_LIFE_BARS && preview.decayFloor === DECAY_SCORE_FLOOR`, and import the two constants beside the existing pools import (lines 30-35).

**KnobRow pattern** (lines 236-257) — copy under the pool-tolerance section:
```typescript
<KnobRow
  label="DOL gücləndirmə"
  slot="sandbox-knob-dol-boost"
  display={fmtMult(preview.dolBoost)}
  min={CALIBRATION_DOL_BOOST_MIN}
  max={CALIBRATION_DOL_BOOST_MAX}
  step={CALIBRATION_DOL_BOOST_STEP}
  value={preview.dolBoost}
  disabled={degraded}
  onChange={(next) => setDolBoost(next)}
/>
```
New: two KnobRows (`sandbox-knob-decay-half-life` with `fmtInt`, `sandbox-knob-decay-floor` with `fmtMult`), wired to the new selectors/setters following lines 105-114 subscription idiom (`const preview = useDashboard((s) => s.calibrationPreview);` + one `useDashboard` line per setter). No new UI primitive — installed `Slider` wrapper via `KnobRow` only.

---

## Shared Patterns

### Purity guard
**Source:** `src/lib/ict/purity.test.ts` (self-scans new `ict/*.ts` code for clocks/store imports)
**Apply to:** `pools.ts` decay helpers
```
No `Date.now()`, no `new Date()`, no store imports in `src/lib/ict/` — `asOf` is an injected string, age is string-compare over the closed window.
```

### Refuse-to-rank envelope
**Source:** `src/lib/ict/pools.ts` lines 343-361; `src/lib/store.ts` lines 953-973
**Apply to:** scorer + selector (both unchanged in shape)
```
Empty/degenerate input → originDate-ordered pools + finite zero scores + `rankSkipped: true` (scorer) or `null` (selector try/catch). Decay returns 1.0-neutral there.
```

### CALIBRATION-PROVISIONAL discipline
**Source:** `src/lib/ict/pools.ts` lines 15-35; `src/lib/ict/pools.test.ts` lines 51-61 (constant pins)
**Apply to:** both new constants
```
Seed with comment `// CALIBRATION-PROVISIONAL: seeded 2026-10-26, unobserved live.`, pin values in the existing locked-constants test, calibrate only against the firing-log band review — never tune to pass tests.
```

### Parity harness (exit gate)
**Source:** `src/lib/ict/pools-parity.test.ts` lines 20-43 (driver-fixture-only toggle, exact triple match)
**Apply to:** phase gate — file untouched, re-run green
```
pools-on vs pools-off `trigger/flaw/ticket` triple must match exactly; decay is scorer-plane only so parity holds by construction.
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | None — all four touch points extend existing self-analogs in place; no new files. Untouched-but-rerun files (`swings.ts`, `regime.ts`, `pools-parity.test.ts`, `purity.test.ts`) need no mapping. |

## Metadata

**Analog search scope:** `src/lib/ict/`, `src/lib/store.ts`, `components/dashboard/`
**Files scanned:** 6 (`pools.ts`, `pools.test.ts`, `pools-parity.test.ts`, `store.ts`, `calibration-sandbox.tsx`, plus grep over `src/lib` for `scoreAndRank` call sites)
**Pattern extraction date:** 2026-10-26
**Tracked-source gate:** all analog paths verified via `git ls-files` (6/6 tracked, zero mirror paths).
