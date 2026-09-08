---
phase: 11-chart-rendering-polish
reviewed: 2026-09-08T00:00:00Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - components/charts/nq-chart.tsx
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-09-08T00:00:00Z
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found

## Summary

Reviewed the 11-line diff since `06087a6` in `components/charts/nq-chart.tsx`
(chart mount path only): `autoSize: true` chart option, `timeScale:
lockVisibleTimeRangeOnResize: true`, and the `autoSizeActive()` fallback gate
with a zero-guarded one-shot `chart.resize()`. Verified all three symbols
against the installed `lightweight-charts@^5.2.1` typings (`autoSize` option,
`autoSizeActive()`, `lockVisibleTimeRangeOnResize`) — API usage is correct.
Zero-guard (`fallbackWidth > 0 && fallbackHeight > 0`) correctly prevents a
`resize(0, 0)` on hidden/zero-size containers. No DPR handling was touched
(the library owns DPR internally), no overlay/chrome/empty-state code was
touched, and the resize path takes no user input and uses no `innerHTML` /
`eval` / deserialization — no security surface. One non-blocking robustness
note below; no blockers.

## Info

### IN-01: No-RO fallback sizes once at mount and never re-tracks

**File:** `components/charts/nq-chart.tsx:151-157`
**Issue:** When `ResizeObserver` is absent (`autoSizeActive()` false), the
fallback calls `chart.resize()` exactly once at mount. Any later container
resize in that environment (window resize, sidebar toggle, orientation change)
is never propagated — the chart stays at its mount size. In practice this path
is near-dead code (every modern browser ships `ResizeObserver`), so this is a
best-effort gap, not a correctness bug.
**Fix:** Accept as-is, or add a best-effort window-resize listener that is only
registered when the fallback fires, and removed in the existing mount-effect
cleanup:
```ts
if (!chart.autoSizeActive()) {
  const fallbackWidth = el.clientWidth;
  const fallbackHeight = el.clientHeight;
  if (fallbackWidth > 0 && fallbackHeight > 0) {
    chart.resize(fallbackWidth, fallbackHeight);
  }
  const onResize = () => {
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w > 0 && h > 0) chart.resize(w, h);
  };
  window.addEventListener('resize', onResize);
  // removeEventListener in the mount-effect cleanup next to chart.remove()
}
```

---

_Checked: v5 typings confirm `autoSize: boolean`, `autoSizeActive(): boolean`, `lockVisibleTimeRangeOnResize: boolean`; diff touches no marker/price-line/zone/JSX paths._
_Reviewed: 2026-09-08T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
