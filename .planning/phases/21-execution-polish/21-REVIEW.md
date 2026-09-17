---
phase: 21-execution-polish
reviewed: 2026-09-17T12:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - components/dashboard/calibration-sandbox.tsx
  - components/ui/slider.tsx
  - src/lib/store.ts
  - src/terminal-shell.test.ts
findings:
  critical: 1
  warning: 7
  info: 3
  total: 11
status: issues_found
---

# Phase 21: Code Review Report

**Reviewed:** 2026-09-17T12:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the Phase 21 calibration-sandbox UI slice, the shared `ui/Slider` wrapper, the zustand store calibration preview/review slice (plus adjacent selector patterns), and the terminal-shell behavioral suite at standard depth. One blocking logic error: the sandbox `pristine` flag is OR-ed with the session `applied` flag, so any knob drift after pressing Apply never shows the BAXIŞ preview tag or dimming again. Seven warnings cover scalar-vs-array value forwarding into the Base UI primitive, thumbs rendered without an index, Apply/Reset staying enabled while degraded, missing kzStart/kzEnd cross-validation, non-reactive ticket/review subscriptions, a wall-clock fallback inside a selector, and firing-log leakage across tests. Three info items cover the unused `CALIBRATION_BEHIND_MIN` import with a literal `0`, a mid-file import, and an unstable `selectCalibrationReview` object identity.

## Narrative Findings (AI reviewer)

All findings below are narrative findings from direct code review. No structural (fallow) pre-pass was provided, so no structural section applies.

## Critical Issues

### CR-01: `pristine` OR-ed with `applied` hides all post-Apply preview drift

**File:** `components/dashboard/calibration-sandbox.tsx:129-137`
**Issue:** `pristine` is computed as `review.applied || (preview matches all pinned seeds)`. After the operator presses Apply, `calibrationReviewApplied` stays `true` for the rest of the session, so `pristine` is permanently `true` even when the user subsequently drags a knob far off the pins. The BAXIŞ badge (line 171) and the `opacity-45` dim container (line 179) never reappear, misleading the operator into believing a drifted what-if is still the applied set. The code comment claims pristine "compares against the imported pinned constants", but the `review.applied ||` disjunct defeats exactly that comparison.
**Fix:**
```tsx
const pristine =
  preview.kzStartMin === TRIGGER_KZ_START_MIN &&
  preview.kzEndMin === TRIGGER_KZ_END_MIN &&
  preview.dispMult === TRIGGER_DISP_MULT &&
  preview.equalTolBps === EQUAL_TOL_BPS &&
  preview.mergeAtrMult === MERGE_ATR_MULT &&
  preview.dolBoost === DOL_BOOST &&
  preview.behindPenalty === BEHIND_PENALTY;
```

## Warnings

### WR-01: Scalar `value` forwarded raw to a Base UI primitive that positions thumbs from arrays

**File:** `components/ui/slider.tsx:15-30` (triggered by `components/dashboard/calibration-sandbox.tsx:89`)
**Issue:** The wrapper deliberately accepts a scalar (`value !== undefined ? [value]`) for thumb-count derivation (`_values`), but then forwards the raw scalar straight through (`value={value}`) to `SliderPrimitive.Root`. Every sandbox knob passes a scalar number (`value={preview.kzStartMin}`, etc.). If the primitive expects `number[]` (the Base UI slider contract), all seven knobs feed it a mistyped value: thumb positioning, keyboard stepping, and `onValueChange` payload shape are all suspect, and TypeScript should reject `value={number}` against `Root.Props`. The wrapper normalizes for counting but not for forwarding — the two paths disagree.
**Fix:**
```tsx
const forwardedValue = Array.isArray(value)
  ? value
  : value !== undefined
    ? [value]
    : undefined;
// ...
<SliderPrimitive.Root
  value={forwardedValue}
  defaultValue={
    Array.isArray(defaultValue) ? defaultValue : defaultValue !== undefined ? [defaultValue] : undefined
  }
  // ...
```

### WR-02: Thumbs rendered without an `index`, so the two-thumb fallback collides

**File:** `components/ui/slider.tsx:44-50`
**Issue:** Thumbs are rendered in a loop with only `key={index}` and no thumb-to-value binding prop. The both-undefined fallback yields `_values = [min, max]` (two thumbs), but both thumbs are identical and neither declares which value index it controls, so they collapse onto the same behavior. Even in the single-thumb case the binding is implicit rather than declared, making the wrapper fragile against Base UI versions that require the index.
**Fix:**
```tsx
{Array.from({ length: _values.length }, (_, index) => (
  <SliderPrimitive.Thumb key={index} index={index} ... />
))}
```
(Verify the exact prop name — `index` vs `valueIndex` — against the installed `@base-ui/react/slider` typings; the point is each thumb must declare its position.)

### WR-03: Apply / Reset stay enabled while knobs are honestly disabled as degraded

**File:** `components/dashboard/calibration-sandbox.tsx:271-283`
**Issue:** When `degraded` (stale or thin ticket leg) is true, all seven `KnobRow` sliders receive `disabled={degraded}`, but the `Tətbiq et` Apply and `Yenilə` Reset buttons have no `disabled` prop. The operator can record a "reviewed HOLD verdict" on top of stale/thin data the panel itself refuses to let them preview — the degrade-honestly contract is applied to knobs but not to the commit path.
**Fix:**
```tsx
<Button size="sm" onClick={() => applyCalibrationPreview()} data-slot="sandbox-apply" disabled={degraded}>
  Tətbiq et
</Button>
<Button size="sm" variant="outline" onClick={() => resetCalibrationPreviewToPinned()} data-slot="sandbox-reset" disabled={degraded}>
  Yenilə
</Button>
```

### WR-04: No `kzStart <= kzEnd` cross-validation — setters and UI accept inverted ranges

**File:** `src/lib/store.ts:1183-1192` (surfaced by `components/dashboard/calibration-sandbox.tsx:181-202`)
**Issue:** `setCalibrationKzStartMin` and `setCalibrationKzEndMin` clamp independently to `[0, 600]` with no relation check, and the sandbox wires them to independent sliders. Nothing stops `kzStartMin = 500, kzEndMin = 100`. The preview then holds a nonsensical killzone window with no error, and Apply happily records the HOLD verdict over it.
**Fix:**
```ts
setCalibrationKzStartMin: (minutes) => {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) return;
  const clamped = Math.min(CALIBRATION_KZ_MAX, Math.max(CALIBRATION_KZ_MIN, Math.round(minutes)));
  const { calibrationPreview } = get();
  set({ calibrationPreview: { ...calibrationPreview, kzStartMin: Math.min(clamped, calibrationPreview.kzEndMin) } });
},
// (mirror for kzEndMin with Math.max(clamped, preview.kzStartMin))
```
Alternatively surface an inline range error in the sandbox and disable Apply while inverted.

### WR-05: Ticket and review read through non-reactive function-identity subscriptions

**File:** `components/dashboard/calibration-sandbox.tsx:117-123,138`
**Issue:** `useDashboard((s) => s.selectTicket)` and `useDashboard((s) => s.selectCalibrationReview)` subscribe to stable function references, not to the underlying data. Zustand therefore never re-renders the sandbox when the ticket flips to stale/thin (no subscription to `es.stale`, `coverage`, or range thinness — only `nq.stale`/`nq.lastError` are subscribed) or when `calibrationReviewApplied` flips (Apply only re-renders by coincidence because the preview object is also replaced). The degraded-disable path can go stale on screen.
**Fix:**
```tsx
const ticket = useDashboard((s) => s.selectTicket());
const review = useDashboard((s) => s.selectCalibrationReview());
// or subscribe to the primitives directly:
const degradedEs = useDashboard((s) => s.es.stale);
const applied = useDashboard((s) => s.calibrationReviewApplied);
```
Note this composes with the `selectCalibrationReview` fresh-object concern (IN-03): subscribing to the call result directly needs a memoized/equality-wrapped selector.

### WR-06: `sharedEpoch` falls back to the wall clock inside a selector

**File:** `src/lib/store.ts:572-576`
**Issue:** `sharedEpoch` returns `Math.floor(new Date().getTime() / 1000)` when `nq1h.lastUpdatedISO` is null. The surrounding comments repeatedly state selectors never read clocks ("Never Date.now() inside selectors — this is orchestration, not src/lib/ict math"), yet every trigger/AMD/ticket derivation inherits this nondeterministic fallback on empty intraday legs. Results differ run-to-run on the same store state, hurting test determinism and replayability.
**Fix:**
```ts
function sharedEpoch(get: () => DashboardState): number {
  const iso = get().nq1h.lastUpdatedISO;
  const parsed = iso === null ? NaN : new Date(iso).getTime();
  if (Number.isFinite(parsed)) return Math.floor(parsed / 1000);
  return 0; // or return NaN and let callers refuse-null explicitly
}
```
and make `selectTriggerPure` / `selectAMD` refuse `null` on the sentinel instead of deriving against wall time.

### WR-07: `beforeEach` does not reset `firingLog` / `paperLog`, leaking calibration state across tests

**File:** `src/terminal-shell.test.ts:169-201`
**Issue:** The reset clears candles, legs, flags, and coverage, and explicitly re-seeds the calibration preview plus `calibrationReviewApplied`, but never clears `firingLog`, `firingLogOverflow`, `paperLog`, `paperLogOverflow`, or `ticketInputs`. The Phase 21 suite seeds a two-entry firing log; any later suite that asserts on the log, the proof table, or the calibration verdict inherits that state depending on execution order. Test isolation is partial by construction.
**Fix:**
```ts
useDashboard.setState({ firingLog: [], firingLogOverflow: 0, paperLog: [], paperLogOverflow: 0 });
useDashboard.getState().resetCalibrationPreview();
useDashboard.setState({ calibrationReviewApplied: false });
```

## Info

### IN-01: `CALIBRATION_BEHIND_MIN` imported but unused; behind-penalty knob uses a literal `0`

**File:** `components/dashboard/calibration-sandbox.tsx:7,252`
**Issue:** `CALIBRATION_BEHIND_MIN` is imported (line 7) yet the "Arxa cəza" knob passes `min={0}` (line 252). The file header claims the pristine comparison "never" uses literals so a constant retune cannot silently break it — the same argument applies to bounds. Today `0 === 0.0`, so behavior is identical, but the dead import plus magic number invite a future divergence where the constant moves and the knob does not.
**Fix:** `min={CALIBRATION_BEHIND_MIN}` and drop the literal.

### IN-02: Mid-file import after interfaces and constants

**File:** `src/lib/store.ts:110-111`
**Issue:** `import { deriveConvictionTier, type ConvictionTier } from '@/src/lib/confluence'` and `import { getAsOfBakuDate } from '@/src/lib/time'` sit at lines 110-111, after exported constants and interfaces. Hoisting makes this work, but it breaks the file's own top-import convention and surprises readers scanning the header for dependencies.
**Fix:** Move both lines into the top import block (lines 1-38).

### IN-03: `selectCalibrationReview` returns a fresh object identity on every call

**File:** `src/lib/store.ts:1227-1234`
**Issue:** The selector builds `{ verdict, appliedCopy, applied }` anew per invocation. If any consumer ever subscribes to the call result (`useDashboard((s) => s.selectCalibrationReview())`), the ever-changing identity forces a re-render on every store write, or an infinite loop under shallow-equality subscriptions. The current sandbox dodges this by subscribing to the function (which causes WR-05 instead) — either usage is a trap.
**Fix:** Return a memoized/stable reference, or expose `calibrationReviewApplied` plus pure helpers (`CALIBRATION_REVIEW_HOLD_COPY`, `calibrationAppliedCopy()`) and compose the view object in the component with `useMemo`.

---

_Reviewed: 2026-09-17T12:00:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
