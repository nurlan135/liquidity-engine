---
status: complete
phase: 20-1-live-chart-overlay
source: [20-01-SUMMARY.md, 20-02-SUMMARY.md, 20-03-SUMMARY.md, 20-04-SUMMARY.md, 20-05-SUMMARY.md]
started: 2026-09-18T09:30:00Z
updated: 2026-09-18T09:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Rank-1 sentence typography and hedge wording
expected: Report §1 shows rank-1 sentence with mono numerals, inline hedge, SWEPT muted tone per UI-SPEC
result: pass
reason: "Agent screenshot 2026-09-18 (phase20-s1.png): §1 AĞRI HƏDDİ shows rank-1 sentence with zone bounds + ATR 1.10 + inline proyeksiya hedge, no broken typography; SWEPT tone covered by shell integration pins (20-04), no SWEPT pool on live wire to glance"
coverage_id: 20-01-D4

### 2. Verbatim Azerbaijani reason wrap
expected: Longest rank-1 sentence plus hedge pair wraps inside panel flow without truncation or horizontal scroll
result: pass
reason: "Agent screenshot 2026-09-18: sentence wraps across 3 lines inside panel flow, no truncation, no horizontal scroll"
coverage_id: 20-02-D4

### 3. Canvas rank brightness, ghost tone, layering
expected: Chart shows rank-1 full brightness / rank-2 halved, swept ghosts muted gray, pools above zones with ticket lines on top
result: pass
reason: "Agent screenshot 2026-09-18 (phase20-uat.png): BSL-1/BSL-2 green pair + SSL-1/SSL-2 pink pair render above OTE/EQ/Range lines with distinct labels; no ticket lines on wire (ticket null, lines correctly present per null=true gate); ghost/z-order logic covered by unit + stub-prop pins (20-03/20-05), no ghosts on live wire to glance"
coverage_id: 20-03-D3

### 4. Report section index 1 live with rank-1 sentence
expected: Report section index 1 renders as a live section with a rank-1 pain-threshold sentence instead of an UNAVAILABLE badge
result: pass
source: automated
coverage_id: 20-01-D1

### 5. Chart renders single BSL pool pair
expected: Chart renders one BSL pool price-line pair from live selector output without blocking candles
result: pass
source: automated
coverage_id: 20-01-D2

### 6. Loading skeleton state
expected: Loading state shows skeleton rows and renders no pool prose or lines before the envelope resolves
result: pass
source: automated
coverage_id: 20-01-D3

### 7. No-pools distinct empty line
expected: Section 1 with zero ACTIVE pools renders the distinct no-pools line, never confident prose over the gap
result: pass
source: automated
coverage_id: 20-02-D1

### 8. Rank-1 live sentence full fields
expected: Section 1 rank-1 live sentence names side, zone bounds, ATR distance, swept status, and the verbatim reason with the inline hedge
result: pass
source: automated
coverage_id: 20-02-D2

### 9. Thin history dimmed pools
expected: Section 1 on thin history keeps pools visible dimmed at opacity-45 with the thin note, never hidden
result: pass
source: automated
coverage_id: 20-02-D3

### 10. Nearest-2-per-side shell fan-out
expected: Shell fans nearest-2-per-side ACTIVE arrays plus separate swept ghost arrays with degraded flags; null selection fans all-null
result: pass
source: automated
coverage_id: 20-03-D1

### 11. Full chart overlay eight lines max
expected: Chart renders max eight ACTIVE pool lines with rank brightness, dimmed ghosts, ticket-on-top z-order, stale/thin dimming, zero lines on null/STAND_ASIDE
result: pass
source: automated
coverage_id: 20-03-D2

### 12. Rank-1 any-status sentence with reason clause
expected: Rank-1 any-status sentence with reason clause and reachable SWEPT tone in section 1
result: pass
source: automated
coverage_id: 20-04-D1

### 13. Proyeksiya hedge exact pin
expected: Proyeksiya hedge pinned by exact-match test alongside the reason clause
result: pass
source: automated
coverage_id: 20-04-D2

### 14. Verdict-gated pool creation
expected: Verdict-gated pool and ghost creation in mount plus update effects with shared predicate
result: pass
source: automated
coverage_id: 20-05-D1

## Summary

total: 14
passed: 14
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
