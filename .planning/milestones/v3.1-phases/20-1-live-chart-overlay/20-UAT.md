---
status: complete
phase: 20-1-live-chart-overlay
source: 20-01-SUMMARY.md, 20-02-SUMMARY.md, 20-03-SUMMARY.md
started: 2026-10-27T12:13:25Z
updated: 2026-10-27T13:22:20.138Z
---

## Current Test

[testing complete]

## Tests

### 1. Honest-state skeleton and null-empty copy in §1
expected: Cold load shows skeleton pulse rows in §1; null selector shows "Məlumat yoxdur" copy, no stale pool data
result: pass

### 2. Chart dim and clear paths (stale/thin/null/STAND_ASIDE)
expected: Stale/thin pools fall back to uniform MUTED_GRAY (#71717A); null selector clears ALL pool lines; STAND_ASIDE clears ghost lines; ticket entry/SL/TP stays on top of pools
result: pass

### 3. Distinct §1 honest-state copy matrix (no-pools / stale / thin / null-empty)
expected: No-pools shows "Aktiv hovuz yoxdur — D1 k=2 fraktal təsdiqlənmədi."; stale prints verbatim NQ-leg lastError; thin shows dimmed (opacity-45) pools plus "İncə tarixçə — proyeksiya zəif etimadla göstərilir."; null-empty shows "Məlumat yoxdur" — four visibly distinct states
result: pass

### 4. Longest rank-1 sentence wraps without truncation
expected: The longest rank-1 Pain Threshold sentence plus inline hedge wraps inside the §1 panel flow — no truncation, no horizontal scroll (held-out UI-SPEC backstop)
result: pass

### 5. Canvas glance — pool pairs read as dashed BSL/SSL pairs with rank pop
expected: Chart shows dashed BSL (green #00ff88) / SSL (magenta #ff00ff) top-bottom pairs; rank-1 full brightness pops vs rank-2 50% alpha; swept ghosts dimmed gray; ticket EXECUTE legs on top, pools above zones (held-out UI-SPEC backstop)
result: pass

### 6. Live §1 rank-1 Pain Threshold sentence with side, zone bounds, ATR distance, swept status, and inline hedge
expected: Live §1 rank-1 Pain Threshold sentence with side, zone bounds, ATR distance, swept status, and inline hedge
result: pass
source: automated
coverage_id: D1

### 7. Thin single-BSL price-line pair on the NQ chart with BSL-1-top/bottom titles, dashed style, ticket-on-top order
expected: Thin single-BSL price-line pair on the NQ chart with BSL-1-top/bottom titles, dashed style, ticket-on-top order
result: pass
source: automated
coverage_id: D2

### 8. Nearest-2-per-side ACTIVE cap with max 8 lines, ghosts riding outside the cap
expected: Nearest-2-per-side ACTIVE cap with max 8 lines, ghosts riding outside the cap
result: pass
source: automated
coverage_id: D3

### 9. Rank-1 full brightness versus rank-2 50% alpha literals, ghost MUTED_GRAY, ticket lines on top
expected: Rank-1 full brightness versus rank-2 50% alpha literals, ghost MUTED_GRAY, ticket lines on top
result: pass
source: automated
coverage_id: D4

### 10. Proyeksiya hedge inline in the rank-1 sentence with no footer, banned reuse absent
expected: Proyeksiya hedge inline in the rank-1 sentence with no footer, banned reuse absent
result: pass
source: automated
coverage_id: D5

### 11. Live §1 contract holds 6 sections with §1 live and title locked
expected: Live §1 contract holds 6 sections with §1 live and title locked
result: pass
source: automated
coverage_id: D6

## Summary

total: 11
passed: 11
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
