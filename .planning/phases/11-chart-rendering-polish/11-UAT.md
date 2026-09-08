---
status: testing
phase: 11-chart-rendering-polish
source: [11-VERIFICATION.md]
started: 2026-09-08T04:00:00Z
updated: 2026-09-08T04:00:00Z
---

## Current Test

number: 1
name: HiDPI crispness — populated chart at browser zoom 150% or higher
expected: |
  Crisp lines and text, no DPR-mismatch blur (CHRT-01, D-05).
  Candle edges, price-line titles (EQ, DOL, Q1/Q3, OTE-B/S, Asia-H/L),
  axis text, J/S markers are sharp with no blur.
awaiting: user response

## Tests

### 1. HiDPI crispness at zoom 150%+
expected: Crisp lines and text, no DPR-mismatch blur (CHRT-01, D-05). Candle edges, price-line titles (EQ, DOL, Q1/Q3, OTE-B/S, Asia-H/L), axis text, J/S markers sharp.
result: [pending]

### 2. Live drag-resize refill
expected: Canvas refills div[data-slot=nq-chart] every frame with no stretch, clip, or freeze (CHRT-02, D-01/D-02). Drag-resize window live; toggle sidebar/resize panel.
result: [pending]

### 3. View preservation through resize
expected: Pan/zoom first, then resize; visible range preserved, never re-fit (D-03).
result: [pending]

### 4. Overlay persistence through resize
expected: Asia lines, Judas/SMT markers, zone fills persist with no flicker (D-04). Resize with overlays present.
result: [pending]

### 5. Clean console through resize and zoom switch
expected: Zero errors or warnings in DevTools console (D-06).
result: [pending]

### 6. Chrome stability and empty state
expected: STALE badge, forming row, MARKET CLOSED ribbon positions unchanged (D-08); empty-state copy verbatim "Məlumat yoxdur" / "Hələlik şam məlumatı əlçatan deyil" (D-07).
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
