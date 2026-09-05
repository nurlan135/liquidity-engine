---
status: testing
phase: 02-terminal-composition
source: [02-VERIFICATION.md]
started: 2026-09-05T19:55:00Z
updated: 2026-09-05T19:55:00Z
---

## Current Test

number: 1
name: Canvas zone-shading render
expected: |
  Run `npm run dev`, open the terminal page. Confirm the chart shows
  premium-half magenta fill at 8%, discount-half green fill at 8%,
  a dashed EQ price-line and a solid DOL marker on live candles.
awaiting: user response

## Tests

### 1. Canvas zone-shading render
expected: premium magenta 8% / discount green 8% fills plus dashed EQ and solid DOL lines on live candles
result: [pending]

### 2. Responsive layout
expected: below 1024px the grid collapses to a single left-to-center-to-right stack with 12px gaps and no horizontal overflow
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
