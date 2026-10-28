---
phase: 21-execution-polish
reviewed: 2026-10-28T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/lib/ticket.ts
  - src/lib/store.ts
  - src/lib/ticket.test.ts
  - src/lib/pools-parity.test.ts
  - src/lib/pool-overlay.test.ts
  - src/lib/fire-rate.ts
  - src/lib/fire-rate.test.ts
  - src/lib/store.test.ts
  - components/dashboard/report.tsx
  - components/ui/slider.tsx
  - components/dashboard/threshold-control.tsx
  - components/dashboard/terminal-shell.tsx
findings:
  critical: 0
  warning: 8
  info: 4
  total: 12
status: issues_found
---

# Phase 21: Code Review Report

**Reviewed:** 2026-10-28T00:00:00Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Reviewed the Phase 21 execution-polish scope at standard depth: buffered ticket SL/TP with 0.25xATR, fire-rate review surface with threshold store slice, threshold slider control, fire-rate strip in the report, terminal-shell mount, plus the pools-parity harness and surrounding tests. No hardcoded secrets, no injection sinks, no `eval`/`innerHTML`, and the stated purity constraints hold in the reviewed files: the operator threshold never enters any `src/lib/ict` evaluation path (it only feeds `countFireRate` display copy), and no scorer constant is retuned (`TICKET_RR_MIN` still 3, `PAPER_EQUITY_USD` 25000, `NQ_POINT_VALUE` 20, fire band 1/7/4). No BLOCKER-level defect was proven. Eight warnings are incorrect-behavior or reactivity bugs that should be fixed, plus four info-level quality notes. The parity harness is tautological and gives false confidence about pools independence.

## Warnings

### WR-01: `countFireRate` accepts any finite threshold, diverging from the 1-7 integer band

**File:** `src/lib/fire-rate.ts:46`
**Issue:** `const band = Number.isFinite(threshold) ? threshold : FIRE_THRESHOLD_DEFAULT` passes through 0, negatives, fractions, and huge values. `count <= band` then mislabels: e.g. threshold 0 forces everything above, threshold 1e9 forces everything in. The store validator (`readFireThreshold`) rejects non-integers and out-of-band values back to 4, so the pure helper and the store disagree on what a threshold means. A direct caller with a tampered value gets a silently wrong band label.
**Fix:**
```ts
const band =
  Number.isInteger(threshold) && threshold >= FIRE_THRESHOLD_MIN && threshold <= FIRE_THRESHOLD_MAX
    ? threshold
    : FIRE_THRESHOLD_DEFAULT;
```

### WR-02: `countFireRate` throws on null entries instead of degrading to empty

**File:** `src/lib/fire-rate.ts:45`
**Issue:** Only `nowEpochSec` finiteness is guarded. If `entries` is `null`/`undefined`, `entries.length` throws. If any row is `null`, `entry.asOf` throws inside the loop. The module header promises guard-first shape ("non-finite inputs degrade, never a throw"), and the report calls this during render — a corrupt log row would crash the section instead of showing the honest-empty copy.
**Fix:**
```ts
if (!Array.isArray(entries)) return { ...EMPTY_RESULT };
for (const entry of entries) {
  if (entry === null || typeof entry !== 'object') continue;
  if (!Number.isFinite((entry as FiringLogEntry).asOf)) continue;
  // ...
}
```

### WR-03: `fireRateCopy` has no default branch and returns `undefined` on corrupt status

**File:** `src/lib/fire-rate.ts:64-75`
**Issue:** The `switch (status)` covers the four known literals with no `default`. A runtime-tampered `status` falls off the end and returns `undefined`, which the report interpolates into the strip. The helper is the locked-literal contract and should never return non-string.
**Fix:**
```ts
default:
  return 'WHY NOW: 0 fires / 7d — hələ məlumat yoxdur';
```

### WR-04: R/R-fail reason rounds 2.99 to `1:3.0` while blocked

**File:** `src/lib/ticket.ts:395-396`
**Issue:** `rr.toFixed(1)` displays the blocked ratio at one decimal. The pinned test proves the confusion: an actual R of 2.99 renders as `R/R 1:3.0 — EXECUTE bloklandı.`, i.e. it prints the passing number while refusing. Operators cannot distinguish a near-miss from a pass.
**Fix:**
```ts
return standAside(`R/R 1:${rr.toFixed(2)} — EXECUTE bloklandı.`, epoch, degraded);
```
Update the two pinned literals in `src/lib/ticket.test.ts` accordingly (`1:2.99`, `1:2.85`).

### WR-05: Fire-rate strip uses `Date.now()` in render instead of envelope time

**File:** `components/dashboard/report.tsx:348`
**Issue:** `countFireRate(firingLog, Math.floor(Date.now() / 1000), fireThreshold)` reads the wall clock during render. Every render can yield a different window, the server paint and the client hydration paint can disagree across a window boundary, and the strip diverges from the store's single-time-truth (`sharedEpoch` from `nq1h.lastUpdatedISO`). Display-only does not excuse render impurity.
**Fix:** Derive `now` from data, e.g. parse `nq1h.lastUpdatedISO` (or reuse the selectTicket epoch) and fall back to the previous count on null:
```tsx
const nq1hISO = useDashboard((s) => s.nq1h.lastUpdatedISO);
const nowEpoch = nq1hISO !== null && Number.isFinite(new Date(nq1hISO).getTime())
  ? Math.floor(new Date(nq1hISO).getTime() / 1000)
  : null;
const rate = nowEpoch === null ? null : countFireRate(firingLog, nowEpoch, fireThreshold);
```

### WR-06: Report reads leg `lastError` via `getState()` during render, breaking reactivity

**File:** `components/dashboard/report.tsx:117`
**Issue:** `const poolsNqLastError = useDashboard.getState().nq.lastError;` (and the same idiom at lines 213-215, 285, 312, 370 for `nq`/`nq1h`/`es`/`nq15m` errors) snapshots state without subscribing. The error copy only refreshes when some other subscribed slice happens to re-render. A leg can go stale/clear without the displayed verbatim reason updating.
**Fix:**
```tsx
const poolsNqLastError = useDashboard((s) => s.nq.lastError);
const nqLegError = useDashboard((s) => s.nq.lastError);
// ... same for nq1h/es/nq15m legs used in sections 3/4/5/6
```

### WR-07: ThresholdControl degraded write-lock never updates live

**File:** `components/dashboard/threshold-control.tsx:53-59`
**Issue:** `const selectTicket = useDashboard((s) => s.selectTicket); const ticket = selectTicket();` subscribes to the stable selector-function identity, which never changes. The component re-renders only when `fireThreshold` changes, so `degraded` is stale: the slider stays enabled after data goes thin/stale (or stays locked after recovery). The terminal-shell comment admits this pattern only works because other subscriptions force re-renders — this component has none.
**Fix:**
```tsx
const ticketDegraded = useDashboard((s) => {
  const t = s.selectTicket();
  return t === null ? null : t.degraded.stale || t.degraded.thin;
});
const degraded = ticketDegraded === true;
```
or subscribe to the legs that feed the envelope (`nq.stale`, `nq.candles`, `selectTicket` result via `useShallow`).

### WR-08: Containing-bar fallback pins T/Judas markers to the wrong bar

**File:** `components/dashboard/terminal-shell.tsx:114-123`
**Issue:** `fireBarDate = best ?? candles[candles.length - 1].date` (same shape for `judasBarDate` at 125-135). When `ticket.asOf` precedes every D1 bar (clock skew, short history), `best` is `null` and the code pins the T marker to the latest bar instead of clearing it. A marker on the wrong bar misleads more than no marker.
**Fix:**
```ts
fireBarDate = best; // null clears the T pin via the empty-marker-set path
// same for judasBarDate
```

## Info

### IN-01: Slider thumb count mishandles a numeric `value`

**File:** `components/ui/slider.tsx:12-16`
**Issue:** `_values` only unwraps arrays. A numeric `value` (allowed by the loosened prop type) falls through to `[min, max]`, rendering two thumbs while Root receives a single number. Currently harmless (all callers pass arrays) but one prop-type-legal call breaks the control.
**Fix:**
```ts
const _values = Array.isArray(value)
  ? value
  : typeof value === 'number'
    ? [value]
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max];
```

### IN-02: Setter floors fractions while validate-on-read rejects them

**File:** `src/lib/store.ts:491-497` and `src/lib/store.ts:1101-1105`
**Issue:** `setFireThreshold(2.5)` floors to 2; `readFireThreshold(2.5)` falls back to 4. `setFireThreshold(0.5)` clamps to 1; `readFireThreshold(0.5)` falls back to 4. The two band validators disagree, so the same numeric input normalizes differently depending on whether it crosses the setter or the persistence boundary. Harmless today (slider step is 1, persistence writes the kept integer), but the policy should be stated once.
**Fix:** Make `readFireThreshold` apply the same clamp-then-floor (or make the setter reject fractions). Add the `0.5 → 1` and `2.5 → 2` pins to the `threshold-validate-on-read` test to lock the chosen policy.

### IN-03: Pools-parity harness compares a verdict set against itself

**File:** `src/lib/pools-parity.test.ts:271-311`
**Issue:** Each test calls `exercisePoolsOnMode()` (which discards its pools result), then `runVerdicts(triple)` twice with identical inputs and asserts `toEqual`. `const poolsOff: LiquidityPool[] | null = null` is a dead variable asserted null but never threaded anywhere. Pools never appear in any verdict input by construction, so the on/off comparison is a tautology: it cannot fail even if a future change threads pools into trigger/flaw/ticket.
**Fix:** Either thread the pools value into the verdict inputs under test (and show the outputs are invariant), or rename the suite to state it pins determinism only. As written it gives false confidence about D-11 input-independence.

### IN-04: `resolveSL` side-of-entry refusal is unreachable and untested

**File:** `src/lib/ticket.ts:273-285`
**Issue:** `entry` is the OTE∩FVG midpoint, so `entry >= FvgGap.bottom >= extreme` by construction (pre-buffer); post-buffer `sl = extreme ∓ buffer` is strictly on the right side. The `REASON_SL` null branch only fires on degenerate hairlines already covered by the `STOP_EPS` floor, and no test pins `REASON_SL`. Dead-ish branch with a dedicated reason string.
**Fix:** Add a test that reaches `REASON_SL` (if reachable) or collapse the branch into the stop-distance refusal with a comment explaining why.

---

_Reviewed: 2026-10-28T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
